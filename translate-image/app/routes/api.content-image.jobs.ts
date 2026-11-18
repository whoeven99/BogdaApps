import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  controlContentImageJob,
  createContentImageJob,
  getContentImageJobDetail,
  getCurrentContentImageJob,
  getLatestContentImageJob,
  listFailedImageItems,
  listHistoryContentImageJobs,
  parseImageTranslateJobKind,
} from "~/server/contentImage/contentImageJobs.server";

/** GET /api/content-image/jobs */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind = kindParam ? parseImageTranslateJobKind(kindParam) : undefined;
  const jobId = url.searchParams.get("id")?.trim();
  if (jobId) {
    return json({
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: await getContentImageJobDetail(session.shop, jobId),
    });
  }
  if (url.searchParams.get("failed") === "1") {
    const languageCode = url.searchParams.get("languageCode")?.trim() || undefined;
    return json({
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        items: await listFailedImageItems(session.shop, kind ?? "content", languageCode),
      },
    });
  }
  if (url.searchParams.get("history") === "1") {
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
    return json({
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: { jobs: await listHistoryContentImageJobs(session.shop, limit) },
    });
  }
  if (url.searchParams.get("current") === "1") {
    return json({
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: await getCurrentContentImageJob(session.shop),
    });
  }
  return json({
    success: true,
    errorCode: 0,
    errorMsg: "",
    response: await getLatestContentImageJob(session.shop, kind),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const intent = typeof body.intent === "string" ? body.intent : "";

  const result =
    intent === "create"
      ? await createContentImageJob({
          shop: session.shop,
          session,
          kind: parseImageTranslateJobKind(body.kind),
          targetLanguage: typeof body.targetLanguage === "string" ? body.targetLanguage : "",
          model: typeof body.model === "string" ? body.model : undefined,
          items: (Array.isArray(body.items) ? body.items : []).map((raw) => {
            const item = raw as Record<string, unknown>;
            return {
              imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
              title: typeof item.title === "string" ? item.title : undefined,
              productId: typeof item.productId === "string" ? item.productId : undefined,
            };
          }),
          retranslate: body.retranslate === true,
        })
      : await controlContentImageJob({
          shop: session.shop,
          jobId: typeof body.jobId === "string" ? body.jobId : "",
          intent,
          session,
        });

  if (!result.ok) {
    return json(
      { success: false, errorCode: result.status, errorMsg: result.error, response: null },
      { status: result.status === 403 ? 403 : 200 },
    );
  }
  return json({ success: true, errorCode: 0, errorMsg: "", response: result.data });
};
