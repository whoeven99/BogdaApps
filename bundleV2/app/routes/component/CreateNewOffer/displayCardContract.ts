import type { PreviewProduct } from "../BundlePreview/bundlePreviewShared";

export type BuilderDisplayCard = {
  title: string;
  subtitle: string;
  price: string;
  original?: string;
  saveLabel?: string;
  summary?: string;
  badge?: string;
  products?: PreviewProduct[];
};
