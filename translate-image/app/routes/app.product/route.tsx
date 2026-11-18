import ImageResourceListPage from "~/routes/component/contentImage/ImageResourceListPage";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("product");

export default function ProductImages() {
  return <ImageResourceListPage type="product" />;
}
