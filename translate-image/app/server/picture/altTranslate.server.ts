import { DeductAltCredits } from "~/api/JavaServer";
import { getGoogleCloudAccessToken } from "./geminiImage";
import { ImageTranslateError } from "./imageTranslateError";

function toGoogleLang(code: string): string {
  const lower = String(code ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!lower) return "en";
  if (lower === "zh" || lower.startsWith("zh-cn") || lower === "zh-hans") return "zh-CN";
  if (lower.startsWith("zh-tw") || lower === "zh-hant") return "zh-TW";
  const [base, region] = lower.split("-");
  if (region) return `${base}-${region.toUpperCase()}`;
  return base;
}

async function googleTranslateText(text: string, targetCode: string): Promise<string> {
  const token = await getGoogleCloudAccessToken();
  const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      target: toGoogleLang(targetCode),
      format: "text",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { translations?: Array<{ translatedText?: string }> };
    error?: { message?: string };
  };
  const translated = body.data?.translations?.[0]?.translatedText?.trim();
  if (!res.ok || !translated) {
    throw new ImageTranslateError("GEMINI_FAILED", body.error?.message ?? `HTTP ${res.status}`);
  }
  return translated;
}

export async function translateAltText(args: {
  shop: string;
  alt: string;
  targetCode: string;
}): Promise<{ success: boolean; errorCode: number; errorMsg: string; response: string }> {
  const alt = String(args.alt ?? "").trim();
  const targetCode = String(args.targetCode ?? "").trim();
  if (!alt) {
    return { success: true, errorCode: 0, errorMsg: "", response: "" };
  }
  if (!targetCode) {
    return { success: false, errorCode: 400, errorMsg: "targetCode required", response: "" };
  }
  try {
    const translated = await googleTranslateText(alt, targetCode);
    const deduct = await DeductAltCredits({ shop: args.shop });
    if (deduct?.errorMsg === "额度不够") {
      return { success: false, errorCode: 403, errorMsg: "额度不够", response: "" };
    }
    if (deduct && deduct.success === false) {
      console.error(
        `[alt.translate] shop=${args.shop} deduct failed errorMsg=${deduct.errorMsg ?? "unknown"}`,
      );
    }
    return { success: true, errorCode: 0, errorMsg: "", response: translated };
  } catch (err) {
    console.error(
      `[alt.translate] shop=${args.shop} ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      success: false,
      errorCode: 10001,
      errorMsg: err instanceof Error ? err.message : "SERVER_ERROR",
      response: "",
    };
  }
}
