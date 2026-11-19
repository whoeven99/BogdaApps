import ImageResourceListPage from "~/routes/component/contentImage/ImageResourceListPage";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("content");

export default function FileImages() {
  return <ImageResourceListPage type="file" />;
}
