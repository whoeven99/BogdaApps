import type { LensOption, LensRule, ProductContext } from "../types/lens.js";

export type StoredLensRule = {
  productId: string;
  rule: LensRule;
};

export interface LensRepository {
  listRules(productId?: string): StoredLensRule[];
  getProductContext(productId: string): ProductContext | undefined;
  getLensOptions(productId: string): LensOption[];
  saveRule(productId: string, rule: LensRule): LensRule;
}
