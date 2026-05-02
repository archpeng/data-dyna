import { z } from "zod";

export const DATAMESH_MEMBER_LABELS_SOURCE_TABLE = "report.crm.member_labels" as const;

export const DatameshRfmTagSchema = z.object({
  rfm_tag_30d: z.string().min(1),
  rfm_tag_90d: z.string().min(1),
  rfm_tag_180d: z.string().min(1),
});

export const DatameshRfmMetricsSchema = z.object({
  latest_pay_time: z.string().datetime({ offset: true }).nullable().optional(),
});

export const DatameshRfmMetrics90dSchema = z.object({
  pay_cnt_90d: z.number().nonnegative(),
  pay_amount_90d: z.number().nonnegative(),
  avg_pay_amount_90d: z.number().nonnegative(),
});

export const DatameshMemberLabelsRowSchema = z.object({
  memberStrId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1).optional(),
  snapshotDate: z.string().date(),
  sourceTable: z.literal(DATAMESH_MEMBER_LABELS_SOURCE_TABLE).default(DATAMESH_MEMBER_LABELS_SOURCE_TABLE),
  rfm_tag: DatameshRfmTagSchema,
  metrics: DatameshRfmMetricsSchema.default({}),
  metrics_90d: DatameshRfmMetrics90dSchema,
});

export type DatameshMemberLabelsRow = z.infer<typeof DatameshMemberLabelsRowSchema>;

export type MemberRfmSnapshotInput = {
  memberId: string;
  brandId: string;
  storeId?: string;
  snapshotDate: string;
  sourceTable: typeof DATAMESH_MEMBER_LABELS_SOURCE_TABLE;
  rfmTag30d: string;
  rfmTag90d: string;
  rfmTag180d: string;
  latestPayTime?: string;
  payCnt90d: number;
  payAmount90d: number;
  avgPayAmount90d: number;
};

export function parseDatameshMemberLabelsRows(input: unknown[]): DatameshMemberLabelsRow[] {
  return input.map((row) => DatameshMemberLabelsRowSchema.parse(row));
}

export function toMemberRfmSnapshotInput(row: DatameshMemberLabelsRow): MemberRfmSnapshotInput {
  return {
    memberId: row.memberStrId,
    brandId: row.brandId,
    storeId: row.storeId,
    snapshotDate: row.snapshotDate,
    sourceTable: row.sourceTable,
    rfmTag30d: row.rfm_tag.rfm_tag_30d,
    rfmTag90d: row.rfm_tag.rfm_tag_90d,
    rfmTag180d: row.rfm_tag.rfm_tag_180d,
    latestPayTime: row.metrics.latest_pay_time ?? undefined,
    payCnt90d: row.metrics_90d.pay_cnt_90d,
    payAmount90d: row.metrics_90d.pay_amount_90d,
    avgPayAmount90d: row.metrics_90d.avg_pay_amount_90d,
  };
}
