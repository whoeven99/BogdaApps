import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { legacyThirdPartyImageRedirectPath } from "~/lib/imageListDeepLink";
import { decodeSwitcherPagePathParam } from "~/lib/shopLocale";
import { resolveSwitcherImagePagePath } from "~/server/contentImage/switcherImages.server";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const urlKey =
    decodeSwitcherPagePathParam(params.urlKey ?? "") || String(params.urlKey ?? "").trim();
  const language = url.searchParams.get("language");
  const q = url.searchParams.get("q");
  let pagePath = url.searchParams.get("pagePath")?.trim() || "";
  if (!pagePath && urlKey) {
    pagePath = (await resolveSwitcherImagePagePath(session.shop, urlKey, language)) ?? "";
  }
  throw redirect(
    legacyThirdPartyImageRedirectPath({
      urlKey,
      pagePath,
      language,
      q,
    }),
  );
};

export default function LegacyThirdPartyImageRedirect() {
  return null;
}
