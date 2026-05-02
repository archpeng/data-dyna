import { z } from "zod";
import {
  DataDynaEventSchema,
  type DataDynaEvent,
  type JsonValue,
} from "../contracts/event-contract.ts";
import { ExperimentPlanSchema, type ExperimentPlan } from "../agent/experiment-plan.ts";
import {
  ExperimentValidationResultSchema,
  type ExperimentValidationResult,
} from "../agent/experiment-validator.ts";

export const MerchantReviewContractVersionSchema = z.literal("merchant-review.v1");
export const MerchantReviewActorTypeSchema = z.enum(["merchant", "employee", "system"]);
export const MerchantReviewEventNameSchema = z.enum([
  "mobile_hq.experiment_review_submitted",
  "mobile_hq.experiment_review_viewed",
  "mobile_hq.experiment_accepted",
  "mobile_hq.experiment_modified",
  "mobile_hq.experiment_rejected",
  "mobile_hq.experiment_applied_recorded",
  "mobile_hq.experiment_reverted_recorded",
  "mobile_hq.merchant_preference_confirmed",
]);
export const ActionLifecycleStateSchema = z.enum([
  "suggested",
  "drafted",
  "accepted",
  "rejected",
  "applied",
  "measured",
  "kept",
  "reverted",
  "extended",
  "retest_needed",
]);
export const RejectionReasonCodeSchema = z.enum([
  "not_relevant",
  "too_risky",
  "insufficient_evidence",
  "wrong_timing",
  "merchant_constraint",
  "other",
]);

export type MerchantReviewEventName = z.infer<typeof MerchantReviewEventNameSchema>;

export const MERCHANT_REVIEW_EVENT_NAMES: MerchantReviewEventName[] = [
  "mobile_hq.experiment_review_submitted",
  "mobile_hq.experiment_review_viewed",
  "mobile_hq.experiment_accepted",
  "mobile_hq.experiment_modified",
  "mobile_hq.experiment_rejected",
  "mobile_hq.experiment_applied_recorded",
  "mobile_hq.experiment_reverted_recorded",
  "mobile_hq.merchant_preference_confirmed",
];

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const MerchantReviewActorSchema = z.object({
  actorType: MerchantReviewActorTypeSchema,
  actorId: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

export const MerchantReviewSubmissionSchema = z
  .object({
    contractVersion: MerchantReviewContractVersionSchema,
    reviewId: z.string().min(1),
    experimentPlanId: z.string().min(1),
    hypothesisId: z.string().min(1),
    agentRunId: z.string().min(1),
    brandId: z.string().min(1),
    storeId: z.string().min(1),
    opportunityGapId: z.string().min(1),
    reviewStatus: z.literal("submitted_for_review"),
    lifecycleState: z.literal("drafted"),
    submittedAt: IsoDateTimeSchema,
    submittedBy: MerchantReviewActorSchema,
    experimentPlan: ExperimentPlanSchema,
    validationResult: ExperimentValidationResultSchema,
    evidenceRefs: z.array(z.string().min(1)).min(1),
  })
  .superRefine((submission, ctx) => {
    checkPlanIdentity(submission.experimentPlan, submission, ctx);
    if (submission.validationResult.decision !== "accept") {
      ctx.addIssue({ code: "custom", path: ["validationResult", "decision"], message: "Only accepted validator results can be submitted for merchant review." });
    }
    for (const ref of submission.evidenceRefs) {
      if (!submission.experimentPlan.evidenceRefs.includes(ref)) {
        ctx.addIssue({ code: "custom", path: ["evidenceRefs"], message: `Unknown review evidence ref: ${ref}` });
      }
    }
  });

export const MerchantReviewViewedSchema = z.object({
  contractVersion: MerchantReviewContractVersionSchema,
  reviewViewId: z.string().min(1),
  reviewId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  eventName: z.literal("mobile_hq.experiment_review_viewed"),
  viewedAt: IsoDateTimeSchema,
  actor: MerchantReviewActorSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

const MerchantReviewDecisionBaseSchema = z.object({
  contractVersion: MerchantReviewContractVersionSchema,
  decisionId: z.string().min(1),
  reviewId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  decidedAt: IsoDateTimeSchema,
  actor: MerchantReviewActorSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const MerchantReviewAcceptanceSchema = MerchantReviewDecisionBaseSchema.extend({
  decision: z.literal("accepted"),
  eventName: z.literal("mobile_hq.experiment_accepted"),
  lifecycleTransition: z.object({ from: z.literal("drafted"), to: z.literal("accepted") }),
  acceptanceNotes: z.string().min(1).optional(),
});

export const MerchantReviewRejectionSchema = MerchantReviewDecisionBaseSchema.extend({
  decision: z.literal("rejected"),
  eventName: z.literal("mobile_hq.experiment_rejected"),
  lifecycleTransition: z.object({ from: z.literal("drafted"), to: z.literal("rejected") }),
  rejection: z.object({
    reasonCode: RejectionReasonCodeSchema,
    reasonText: z.string().min(1),
    createsPreferenceCandidate: z.literal(true),
  }),
});

export const MerchantReviewModificationSchema = MerchantReviewDecisionBaseSchema.extend({
  decision: z.literal("modified"),
  eventName: z.literal("mobile_hq.experiment_modified"),
  lifecycleState: z.literal("drafted"),
  modificationSummary: z.string().min(1),
});

export const MerchantReviewDecisionSchema = z.discriminatedUnion("decision", [
  MerchantReviewAcceptanceSchema,
  MerchantReviewRejectionSchema,
  MerchantReviewModificationSchema,
]);

export const ActionLifecycleTransitionSchema = z
  .object({
    fromState: ActionLifecycleStateSchema,
    toState: ActionLifecycleStateSchema,
  })
  .superRefine((transition, ctx) => {
    if (!canTransitionActionLifecycle(transition.fromState, transition.toState)) {
      ctx.addIssue({ code: "custom", message: `Invalid action lifecycle transition: ${transition.fromState} -> ${transition.toState}` });
    }
  });

export const ActionLifecycleRecordSchema = z
  .object({
    contractVersion: MerchantReviewContractVersionSchema,
    lifecycleRecordId: z.string().min(1),
    reviewId: z.string().min(1),
    experimentPlanId: z.string().min(1),
    brandId: z.string().min(1),
    storeId: z.string().min(1),
    eventName: MerchantReviewEventNameSchema.optional(),
    occurredAt: IsoDateTimeSchema,
    actor: MerchantReviewActorSchema,
    fromState: ActionLifecycleStateSchema,
    toState: ActionLifecycleStateSchema,
    acceptanceDecisionId: z.string().min(1).optional(),
    rollbackRef: z.string().min(1).optional(),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    businessMutationCalled: z.literal(false),
  })
  .superRefine((record, ctx) => {
    if (!canTransitionActionLifecycle(record.fromState, record.toState)) {
      ctx.addIssue({ code: "custom", path: ["toState"], message: `Invalid action lifecycle transition: ${record.fromState} -> ${record.toState}` });
    }
    if (record.toState === "applied" && !record.acceptanceDecisionId) {
      ctx.addIssue({ code: "custom", path: ["acceptanceDecisionId"], message: "Apply records require an explicit merchant acceptance decision." });
    }
    if ((record.toState === "applied" || record.toState === "reverted") && !record.rollbackRef) {
      ctx.addIssue({ code: "custom", path: ["rollbackRef"], message: "Apply/revert records require rollback contract reference." });
    }
    if (record.toState === "applied" && record.eventName !== "mobile_hq.experiment_applied_recorded") {
      ctx.addIssue({ code: "custom", path: ["eventName"], message: "Applied records must use the bounded mobile_hq applied event name." });
    }
    if (record.toState === "reverted" && record.eventName !== "mobile_hq.experiment_reverted_recorded") {
      ctx.addIssue({ code: "custom", path: ["eventName"], message: "Reverted records must use the bounded mobile_hq reverted event name." });
    }
  });

export const PreferenceCandidateFromRejectionSchema = z.object({
  contractVersion: MerchantReviewContractVersionSchema,
  preferenceCandidateId: z.string().min(1),
  reviewId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  rejectionDecisionId: z.string().min(1),
  status: z.literal("candidate_pending_confirmation"),
  candidateKey: z.string().min(1),
  candidateValue: z.string().min(1),
  reasonText: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const MerchantPreferenceConfirmationSchema = z.object({
  contractVersion: MerchantReviewContractVersionSchema,
  preferenceId: z.string().min(1),
  preferenceCandidateId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  eventName: z.literal("mobile_hq.merchant_preference_confirmed"),
  status: z.literal("confirmed"),
  preferenceKey: z.string().min(1),
  preferenceValue: z.string().min(1),
  confirmedAt: IsoDateTimeSchema,
  confirmedBy: MerchantReviewActorSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export type MerchantReviewActor = z.infer<typeof MerchantReviewActorSchema>;
export type MerchantReviewSubmission = z.infer<typeof MerchantReviewSubmissionSchema>;
export type MerchantReviewViewed = z.infer<typeof MerchantReviewViewedSchema>;
export type MerchantReviewDecision = z.infer<typeof MerchantReviewDecisionSchema>;
export type MerchantReviewAcceptance = z.infer<typeof MerchantReviewAcceptanceSchema>;
export type MerchantReviewRejection = z.infer<typeof MerchantReviewRejectionSchema>;
export type MerchantReviewModification = z.infer<typeof MerchantReviewModificationSchema>;
export type ActionLifecycleState = z.infer<typeof ActionLifecycleStateSchema>;
export type ActionLifecycleRecord = z.infer<typeof ActionLifecycleRecordSchema>;
export type PreferenceCandidateFromRejection = z.infer<typeof PreferenceCandidateFromRejectionSchema>;
export type MerchantPreferenceConfirmation = z.infer<typeof MerchantPreferenceConfirmationSchema>;

export function submitExperimentPlanForMerchantReview(input: {
  reviewId: string;
  experimentPlan: ExperimentPlan;
  validationResult: ExperimentValidationResult;
  submittedAt: string;
  submittedBy?: MerchantReviewActor;
}): MerchantReviewSubmission {
  return MerchantReviewSubmissionSchema.parse({
    contractVersion: "merchant-review.v1",
    reviewId: input.reviewId,
    experimentPlanId: input.experimentPlan.experimentPlanId,
    hypothesisId: input.experimentPlan.hypothesisId,
    agentRunId: input.experimentPlan.agentRunId,
    brandId: input.experimentPlan.brandId,
    storeId: input.experimentPlan.storeId,
    opportunityGapId: input.experimentPlan.opportunityGapId,
    reviewStatus: "submitted_for_review",
    lifecycleState: "drafted",
    submittedAt: input.submittedAt,
    submittedBy: input.submittedBy ?? { actorType: "system", actorId: "data-dyna-agent" },
    experimentPlan: input.experimentPlan,
    validationResult: input.validationResult,
    evidenceRefs: input.experimentPlan.evidenceRefs,
  });
}

export function recordExperimentReviewViewed(input: {
  submission: MerchantReviewSubmission;
  reviewViewId: string;
  viewedAt: string;
  actor: MerchantReviewActor;
}): MerchantReviewViewed {
  return MerchantReviewViewedSchema.parse({
    contractVersion: "merchant-review.v1",
    reviewViewId: input.reviewViewId,
    reviewId: input.submission.reviewId,
    experimentPlanId: input.submission.experimentPlanId,
    brandId: input.submission.brandId,
    storeId: input.submission.storeId,
    eventName: "mobile_hq.experiment_review_viewed",
    viewedAt: input.viewedAt,
    actor: input.actor,
    evidenceRefs: input.submission.evidenceRefs,
  });
}

export function acceptExperimentReview(input: {
  submission: MerchantReviewSubmission;
  decisionId: string;
  decidedAt: string;
  actor: MerchantReviewActor;
  acceptanceNotes?: string;
}): MerchantReviewAcceptance {
  return MerchantReviewAcceptanceSchema.parse({
    ...decisionBase(input),
    decision: "accepted",
    eventName: "mobile_hq.experiment_accepted",
    lifecycleTransition: { from: "drafted", to: "accepted" },
    acceptanceNotes: input.acceptanceNotes,
  });
}

export function rejectExperimentReview(input: {
  submission: MerchantReviewSubmission;
  decisionId: string;
  decidedAt: string;
  actor: MerchantReviewActor;
  reasonCode: z.infer<typeof RejectionReasonCodeSchema>;
  reasonText: string;
}): MerchantReviewRejection {
  return MerchantReviewRejectionSchema.parse({
    ...decisionBase(input),
    decision: "rejected",
    eventName: "mobile_hq.experiment_rejected",
    lifecycleTransition: { from: "drafted", to: "rejected" },
    rejection: { reasonCode: input.reasonCode, reasonText: input.reasonText, createsPreferenceCandidate: true },
  });
}

export function recordExperimentReviewModification(input: {
  submission: MerchantReviewSubmission;
  decisionId: string;
  decidedAt: string;
  actor: MerchantReviewActor;
  modificationSummary: string;
}): MerchantReviewModification {
  return MerchantReviewModificationSchema.parse({
    ...decisionBase(input),
    decision: "modified",
    eventName: "mobile_hq.experiment_modified",
    lifecycleState: "drafted",
    modificationSummary: input.modificationSummary,
  });
}

export function canTransitionActionLifecycle(fromState: ActionLifecycleState, toState: ActionLifecycleState): boolean {
  const allowed: Record<ActionLifecycleState, ActionLifecycleState[]> = {
    suggested: ["drafted"],
    drafted: ["accepted", "rejected"],
    accepted: ["applied"],
    rejected: [],
    applied: ["measured"],
    measured: ["kept", "reverted", "extended", "retest_needed"],
    kept: [],
    reverted: [],
    extended: [],
    retest_needed: [],
  };
  return allowed[fromState].includes(toState);
}

export function recordActionLifecycleTransition(input: Omit<ActionLifecycleRecord, "contractVersion" | "businessMutationCalled">): ActionLifecycleRecord {
  return ActionLifecycleRecordSchema.parse({
    contractVersion: "merchant-review.v1",
    ...input,
    businessMutationCalled: false,
  });
}

export function createPreferenceCandidateFromRejection(input: {
  rejection: MerchantReviewRejection;
  preferenceCandidateId: string;
  candidateKey: string;
  candidateValue: string;
  createdAt: string;
}): PreferenceCandidateFromRejection {
  return PreferenceCandidateFromRejectionSchema.parse({
    contractVersion: "merchant-review.v1",
    preferenceCandidateId: input.preferenceCandidateId,
    reviewId: input.rejection.reviewId,
    experimentPlanId: input.rejection.experimentPlanId,
    brandId: input.rejection.brandId,
    storeId: input.rejection.storeId,
    rejectionDecisionId: input.rejection.decisionId,
    status: "candidate_pending_confirmation",
    candidateKey: input.candidateKey,
    candidateValue: input.candidateValue,
    reasonText: input.rejection.rejection.reasonText,
    createdAt: input.createdAt,
    evidenceRefs: input.rejection.evidenceRefs,
  });
}

export function confirmMerchantPreference(input: {
  candidate: PreferenceCandidateFromRejection;
  preferenceId: string;
  confirmedAt: string;
  confirmedBy: MerchantReviewActor;
}): MerchantPreferenceConfirmation {
  return MerchantPreferenceConfirmationSchema.parse({
    contractVersion: "merchant-review.v1",
    preferenceId: input.preferenceId,
    preferenceCandidateId: input.candidate.preferenceCandidateId,
    brandId: input.candidate.brandId,
    storeId: input.candidate.storeId,
    eventName: "mobile_hq.merchant_preference_confirmed",
    status: "confirmed",
    preferenceKey: input.candidate.candidateKey,
    preferenceValue: input.candidate.candidateValue,
    confirmedAt: input.confirmedAt,
    confirmedBy: input.confirmedBy,
    evidenceRefs: input.candidate.evidenceRefs,
  });
}

export function buildMobileHqMerchantActionEvent(input: {
  name: z.infer<typeof MerchantReviewEventNameSchema>;
  eventId: string;
  occurredAt: string;
  producerService: string;
  brandId: string;
  storeId: string;
  actorId: string;
  experimentPlanId: string;
  reviewId?: string;
  preferenceId?: string;
  properties?: Record<string, JsonValue>;
}): DataDynaEvent {
  const entity = merchantReviewEventEntity(input);
  return DataDynaEventSchema.parse({
    version: "event-contract.v1",
    source: "mobile_hq",
    domain: "merchant_action",
    name: input.name,
    occurredAt: input.occurredAt,
    producer: {
      service: input.producerService,
      app: "mobile-hq",
      environment: "test",
      emittedAt: input.occurredAt,
      schemaRef: "data-dyna.event-contract.v1",
    },
    identity: {
      brandId: input.brandId,
      storeId: input.storeId,
      merchantId: input.actorId,
      actorType: "merchant",
    },
    correlation: {
      eventId: input.eventId,
      correlationId: input.experimentPlanId,
    },
    entity,
    properties: input.properties ?? {},
    idempotency: {
      key: `mobile-hq:${input.eventId}`,
      scope: "producer",
    },
  });
}

function merchantReviewEventEntity(input: {
  name: z.infer<typeof MerchantReviewEventNameSchema>;
  experimentPlanId: string;
  reviewId?: string;
  preferenceId?: string;
}): DataDynaEvent["entity"] {
  if (input.name === "mobile_hq.experiment_review_submitted" || input.name === "mobile_hq.experiment_review_viewed") {
    return { type: "experiment_review", id: input.reviewId ?? input.experimentPlanId };
  }
  if (input.name === "mobile_hq.merchant_preference_confirmed") {
    return { type: "merchant_preference", id: input.preferenceId ?? input.experimentPlanId };
  }
  return { type: "experiment_plan", id: input.experimentPlanId };
}

function decisionBase(input: {
  submission: MerchantReviewSubmission;
  decisionId: string;
  decidedAt: string;
  actor: MerchantReviewActor;
}): z.infer<typeof MerchantReviewDecisionBaseSchema> {
  return {
    contractVersion: "merchant-review.v1",
    decisionId: input.decisionId,
    reviewId: input.submission.reviewId,
    experimentPlanId: input.submission.experimentPlanId,
    brandId: input.submission.brandId,
    storeId: input.submission.storeId,
    decidedAt: input.decidedAt,
    actor: input.actor,
    evidenceRefs: input.submission.evidenceRefs,
  };
}

function checkPlanIdentity(
  plan: ExperimentPlan,
  expected: { experimentPlanId: string; hypothesisId: string; agentRunId: string; brandId: string; storeId: string; opportunityGapId: string },
  ctx: z.RefinementCtx,
): void {
  for (const field of ["experimentPlanId", "hypothesisId", "agentRunId", "brandId", "storeId", "opportunityGapId"] as const) {
    if (plan[field] !== expected[field]) {
      ctx.addIssue({ code: "custom", path: [field], message: `${field} must match the submitted experiment plan.` });
    }
  }
}
