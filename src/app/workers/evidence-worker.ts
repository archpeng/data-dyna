import {
  boundedLocalExecutorReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";
import type { OpportunityGap } from "../../benchmarks/opportunity-gaps.ts";
import {
  assembleInterventionTrajectory,
  buildEvidenceRecord,
  reviewActionEffect,
  reviewGuardrailResult,
  type EvidenceRecord,
  type ActionEffect,
  type GuardrailResult,
  type InterventionTrajectory,
} from "../../evidence/evidence-store.ts";
import type { MetricSnapshot } from "../../snapshots/independent-cafe-snapshots.ts";
import { runClaimedWorkerJob, type BoundedWorkerRunResult } from "./bounded-worker-runner.ts";
import type { WorkerJobRepository, WorkerOutputSummary, WorkerWatermark } from "./durable-worker-job-repository.ts";
import type { WorkerFailurePolicyInput } from "./worker-failure-policy.ts";
import type { WorkerObservabilityInput } from "./worker-observability.ts";

export const evidenceWorkerContract = defineWorkerContract({
  kind: "evidence",
  modulePath: "src/app/workers/evidence-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "bounded_local_executor",
  purpose: "Boundary for a bounded script/runner that rebuilds evidence after merchant adoption and before/after metric inputs already exist.",
  inputBoundary: "An app adapter supplies accepted experiment plans, merchant review lifecycle evidence, before/after metric snapshots, action effects, and guardrail results.",
  outputBoundary: "The executor writes deterministic evidence outputs through an injected output store before checkpointing the durable worker job.",
  coreBoundary: "Calls deterministic evidence functions, but must not run Agent generation, merchant-review side effects, or business mutation tools.",
  reliability: boundedLocalExecutorReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim exactly-once semantics from the durable job table alone.",
    "Do not treat evidence as causal proof or accept LLM-generated claims as evidence facts.",
    "Do not run Agent runtime, merchant-review side effects, or business mutation execution.",
  ],
});

type ExperimentPlanInput = Parameters<typeof reviewActionEffect>[0]["experimentPlan"];
type MerchantAcceptanceInput = Parameters<typeof assembleInterventionTrajectory>[0]["acceptance"];
type AppliedLifecycleInput = Parameters<typeof assembleInterventionTrajectory>[0]["appliedLifecycleRecord"];
type GuardrailInput = Parameters<typeof reviewGuardrailResult>[0]["guardrail"];

export type EvidenceWorkerOutput = {
  actionEffect: ActionEffect;
  guardrailResults: GuardrailResult[];
  trajectory: InterventionTrajectory;
  evidenceRecord: EvidenceRecord;
};

export type EvidenceWorkerOutputStore = {
  replaceAll(output: EvidenceWorkerOutput): Promise<void>;
  current?(): Promise<EvidenceWorkerOutput | undefined>;
};

export class InMemoryEvidenceWorkerOutputStore implements EvidenceWorkerOutputStore {
  private latest?: EvidenceWorkerOutput;

  async replaceAll(output: EvidenceWorkerOutput): Promise<void> {
    this.latest = output;
  }

  async current(): Promise<EvidenceWorkerOutput | undefined> {
    return this.latest;
  }
}

export type EvidenceWorkerExecutionInput = {
  jobRepository: WorkerJobRepository;
  workerId: string;
  now: Date;
  leaseSeconds?: number;
  experimentPlan: ExperimentPlanInput;
  acceptance: MerchantAcceptanceInput;
  appliedLifecycleRecord: AppliedLifecycleInput;
  opportunityGap: OpportunityGap;
  beforeMetricSnapshot: MetricSnapshot;
  afterMetricSnapshot: MetricSnapshot;
  guardrails: readonly GuardrailInput[];
  beforeGuardrailMetricSnapshots?: Partial<Record<string, MetricSnapshot>>;
  afterGuardrailMetricSnapshots?: Partial<Record<string, MetricSnapshot>>;
  outputStore: EvidenceWorkerOutputStore;
  failurePolicy?: WorkerFailurePolicyInput;
  observability?: WorkerObservabilityInput;
};

export async function runEvidenceWorker(
  input: EvidenceWorkerExecutionInput,
): Promise<BoundedWorkerRunResult<EvidenceWorkerOutput>> {
  return runClaimedWorkerJob({
    workerKind: "evidence",
    jobRepository: input.jobRepository,
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
    now: input.now,
    failurePolicy: input.failurePolicy,
    observability: input.observability,
    buildOutput: async (claimed) => {
      const actionEffect = reviewActionEffect({
        actionEffectId: `action_effect:${input.experimentPlan.experimentPlanId}:${input.beforeMetricSnapshot.snapshotDate}:${input.afterMetricSnapshot.snapshotDate}`,
        experimentPlan: input.experimentPlan,
        beforeMetricSnapshot: input.beforeMetricSnapshot,
        afterMetricSnapshot: input.afterMetricSnapshot,
      });
      const guardrailResults = input.guardrails.map((guardrail) =>
        reviewGuardrailResult({
          guardrailResultId: `guardrail_result:${input.experimentPlan.experimentPlanId}:${guardrail.metricId}`,
          experimentPlan: input.experimentPlan,
          guardrail,
          beforeMetricSnapshot: input.beforeGuardrailMetricSnapshots?.[guardrail.metricId],
          afterMetricSnapshot: input.afterGuardrailMetricSnapshots?.[guardrail.metricId],
        }),
      );
      const trajectory = assembleInterventionTrajectory({
        interventionTrajectoryId: `intervention_trajectory:${input.experimentPlan.experimentPlanId}`,
        experimentPlan: input.experimentPlan,
        acceptance: input.acceptance,
        appliedLifecycleRecord: input.appliedLifecycleRecord,
        actionEffect,
        guardrailResults,
      });
      const evidenceRecord = buildEvidenceRecord({
        evidenceRecordId: `evidence_record:${input.experimentPlan.experimentPlanId}:${input.opportunityGap.opportunityGapId}`,
        trajectory,
        opportunityGap: input.opportunityGap,
        actionEffect,
        guardrailResults,
      });
      const output: EvidenceWorkerOutput = { actionEffect, guardrailResults, trajectory, evidenceRecord };
      return {
        output,
        outputWatermark: evidenceOutputWatermark(claimed.job.inputWatermark, input, output),
        outputSummary: evidenceOutputSummary(output),
      };
    },
    writeOutput: (output) => input.outputStore.replaceAll(output),
  });
}

function evidenceOutputWatermark(
  inputWatermark: WorkerWatermark,
  input: EvidenceWorkerExecutionInput,
  output: EvidenceWorkerOutput,
): WorkerWatermark {
  return {
    ...inputWatermark,
    experimentPlanId: input.experimentPlan.experimentPlanId,
    opportunityGapId: input.opportunityGap.opportunityGapId,
    evidenceRecordId: output.evidenceRecord.evidenceRecordId,
    outputCommittedAt: input.now.toISOString(),
  };
}

function evidenceOutputSummary(output: EvidenceWorkerOutput): WorkerOutputSummary {
  return {
    actionEffects: 1,
    guardrailResults: output.guardrailResults.length,
    trajectories: 1,
    evidenceRecords: 1,
    verdict: output.evidenceRecord.verdict,
    llmGeneratedClaims: output.evidenceRecord.llmGeneratedClaims.length,
  };
}
