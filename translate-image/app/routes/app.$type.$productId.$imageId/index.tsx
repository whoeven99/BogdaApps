import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { legacySingleImageRedirectPath } from "~/lib/imageListDeepLink";

export const loader = ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  throw redirect(
    legacySingleImageRedirectPath({
      type: params.type,
      productId: params.productId,
      imageId: params.imageId,
      language: url.searchParams.get("language"),
    }),
  );
};

export default function LegacySingleImageRedirect() {
  return null;
}
