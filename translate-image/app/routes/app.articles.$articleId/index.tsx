import ImageResourceDetailPage from "~/routes/component/contentImage/ImageResourceDetailPage";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("content");

export default function ArticleImageDetail() {
  return <ImageResourceDetailPage type="article" />;
}
