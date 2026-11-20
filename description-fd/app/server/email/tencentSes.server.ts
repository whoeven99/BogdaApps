import { ses } from "tencentcloud-sdk-nodejs-ses";

const LOG = "[tencentSes]";
const DEFAULT_CC = ["feynman@ciwi.ai", "yewen@ciwi.ai"] as const;
const FROM_EMAIL = process.env.TENCENT_FROM_EMAIL?.trim() || "support@msg.ciwi.ai";

type SesClientInstance = InstanceType<typeof ses.v20201002.Client>;

let client: SesClientInstance | null = null;

function getSesClient(): SesClientInstance | null {
  if (client) return client;
  const secretId = process.env.TENCENT_CLOUD_KEY_ID?.trim();
  const secretKey = process.env.TENCENT_CLOUD_KEY?.trim();
  if (!secretId || !secretKey) {
    console.warn(`${LOG} missing Tencent SES credentials`);
    return null;
  }
  const region = process.env.TENCENT_SES_REGION?.trim() || "ap-hongkong";
  client = new ses.v20201002.Client({
    credential: { secretId, secretKey },
    region,
  });
  return client;
}

export function formatUsNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function parseShopDisplayName(shop: string): string {
  return shop.replace(/\.myshopify\.com$/i, "");
}

export async function sendTencentTemplateEmail(params: {
  templateId: number;
  subject: string;
  templateData: Record<string, string>;
  to: string;
  cc?: string[];
}): Promise<boolean> {
  const sesClient = getSesClient();
  if (!sesClient) return false;
  const to = params.to.trim();
  if (!to) {
    console.warn(`${LOG} skip send: empty recipient templateId=${params.templateId}`);
    return false;
  }
  try {
    const resp = await sesClient.SendEmail({
      FromEmailAddress: FROM_EMAIL,
      Destination: [to],
      Cc: params.cc ?? [...DEFAULT_CC],
      Subject: params.subject,
      Template: {
        TemplateID: params.templateId,
        TemplateData: JSON.stringify(params.templateData),
      },
    });
    const requestId =
      typeof resp === "object" && resp !== null && "RequestId" in resp
        ? String((resp as { RequestId?: string }).RequestId ?? "").trim()
        : "";
    if (!requestId) {
      console.warn(`${LOG} send missing RequestId templateId=${params.templateId}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      `${LOG} send failed templateId=${params.templateId}`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export function resetTencentSesClientForTests(): void {
  client = null;
}
