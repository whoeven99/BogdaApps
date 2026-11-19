import { Navigate, useSearchParams } from "@remix-run/react";
import { imageResourceListPath, type ImageResourceType } from "~/lib/imageResourcePaths";

/** 主题 / Files 无 L2 详情，旧链接回到列表。 */
export default function ImageResourceListOnlyRedirect({ type }: { type: ImageResourceType }) {
  const [searchParams] = useSearchParams();
  const language = searchParams.get("language") ?? undefined;
  return <Navigate to={imageResourceListPath(type, language)} replace />;
}
