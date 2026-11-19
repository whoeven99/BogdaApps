import SwitcherImagePageList from "~/routes/component/contentImage/SwitcherImagePageList";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("content");

export default function ThirdPartyImages() {
  return <SwitcherImagePageList />;
}
