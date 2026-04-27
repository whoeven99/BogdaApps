import type { LensRule, ProductContext } from "./lens.js";

export type SyncJobType = "products" | "variants";

export type SyncJobStatus = "pending" | "running" | "success" | "failed";

export type VariantChangeType =
  | "created"
  | "updated"
  | "deleted"
  | "inventory_changed";

export type ProductSnapshot = {
  productId: string;
  title: string;
  productType?: string;
  tags: string[];
};

export type VariantSnapshot = {
  id: string;
  productId: string;
  sku: string;
  isDeleted: boolean;
  inventoryAvailable: boolean;
};

export type VariantSyncChange = {
  variantId: string;
  type: VariantChangeType;
  message: string;
};

export type SyncJobResult = {
  jobType: SyncJobType;
  status: SyncJobStatus;
  productChanges: number;
  variantChanges: number;
  issueMessages: string[];
};

export type ProductHealthStatus = "healthy" | "warning" | "error";

export type ProductHealthIssueCode =
  | "MISSING_RULES"
  | "MISSING_VARIANT"
  | "DELETED_VARIANT_REFERENCED"
  | "NO_VISIBLE_LENS"
  | "RULE_PRIORITY_CONFLICT"
  | "MISSING_PRESCRIPTION_TYPE_METAFIELD"
  | "MISSING_LENS_OPTIONS_METAFIELD"
  | "MISSING_SUBSCRIPTION_PLANS_METAFIELD"
  | "SUBSCRIPTION_PLAN_NOT_BOUND";

export type ProductHealthIssue = {
  code: ProductHealthIssueCode;
  severity: "warning" | "error";
  message: string;
  relatedRuleIds: string[];
  relatedVariantIds: string[];
};

export type ProductHealthReport = {
  productId: string;
  status: ProductHealthStatus;
  issues: ProductHealthIssue[];
};

export type ProductHealthCheckInput = {
  context: ProductContext;
  rules: LensRule[];
  configuration?: {
    prescriptionTypeConfigured: boolean;
    lensOptionsConfigured: boolean;
    subscriptionPlansConfigured: boolean;
    subscriptionPlansRequiresSellingPlanIntegration?: boolean;
  };
};
