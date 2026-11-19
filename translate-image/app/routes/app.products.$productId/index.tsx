import ImageResourceDetailPage from "~/routes/component/contentImage/ImageResourceDetailPage";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("product");

export default function ProductImageDetail() {
  return <ImageResourceDetailPage type="product" />;
}
