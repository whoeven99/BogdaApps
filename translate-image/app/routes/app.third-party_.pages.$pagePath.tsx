import SwitcherImagePageDetail from "~/routes/component/contentImage/SwitcherImagePageDetail";
import { imageManageLoader } from "~/server/contentImage/imageManageLoader.server";

export const loader = imageManageLoader("content");

export default function ThirdPartyPageImages() {
  return <SwitcherImagePageDetail />;
}
