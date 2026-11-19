import { ImageTranslateError, summarizeError } from "./imageTranslateError";

/** 返回 GraphQL `data`；顶层 errors 由调用方 adapter 抛错（App `admin.graphql` / Worker `shopifyGraphql`）。 */
export type ShopifyFilesGraphql = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<unknown>;

export const SHOPIFY_FILES_SCOPE = "write_files";

export function hasWriteFilesScope(scope: string | null | undefined): boolean {
  return String(scope ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .includes(SHOPIFY_FILES_SCOPE);
}

export function isShopifyScopeMissingError(err: unknown): boolean {
  const e = err as { message?: unknown; body?: unknown; code?: unknown } | null;
  if (e && (e as { code?: unknown }).code === "SHOPIFY_SCOPE_MISSING") return true;
  let text = String(e?.message ?? err ?? "");
  try {
    if (e?.body) text += JSON.stringify(e.body);
  } catch {
    /* ignore */
  }
  return /ACCESS_DENIED|access denied|write_files/i.test(text);
}

const STAGED_UPLOADS_CREATE = `mutation CiwiStagedUpload($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const FILE_CREATE = `mutation CiwiFileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus }
    userErrors { field message code }
  }
}`;

const FILE_STATUS = `query CiwiFileStatus($id: ID!) {
  node(id: $id) {
    ... on MediaImage { id fileStatus image { url } fileErrors { code message } }
  }
}`;

const FILE_DELETE = `mutation CiwiFileDelete($fileIds: [ID!]!) {
  fileDelete(fileIds: $fileIds) {
    deletedFileIds
    userErrors { field message code }
  }
}`;

type UserError = { message?: string; code?: string };

function throwOnUserErrors(errors: UserError[] | undefined, step: string): void {
  if (!errors?.length) return;
  const text = errors.map((e) => e.message || e.code).join("; ");
  if (/access denied|ACCESS_DENIED/i.test(text)) {
    throw new ImageTranslateError("SHOPIFY_SCOPE_MISSING", text);
  }
  throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", `${step}: ${text}`);
}

async function callGraphql(
  graphql: ShopifyFilesGraphql,
  query: string,
  variables: Record<string, unknown>,
): Promise<any> {
  try {
    return await graphql(query, variables);
  } catch (err) {
    if (isShopifyScopeMissingError(err)) {
      throw new ImageTranslateError("SHOPIFY_SCOPE_MISSING", summarizeError(err), { cause: err });
    }
    throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", summarizeError(err), { cause: err });
  }
}

type StagedTarget = { url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> };

async function createStagedTarget(
  graphql: ShopifyFilesGraphql,
  file: { filename: string; mimeType: string; size: number },
): Promise<StagedTarget> {
  const data = await callGraphql(graphql, STAGED_UPLOADS_CREATE, {
    input: [
      {
        resource: "IMAGE",
        filename: file.filename,
        mimeType: file.mimeType,
        httpMethod: "POST",
        fileSize: String(file.size),
      },
    ],
  });
  throwOnUserErrors(data?.stagedUploadsCreate?.userErrors, "stagedUploadsCreate");
  const target = data?.stagedUploadsCreate?.stagedTargets?.[0] as StagedTarget | undefined;
  if (!target?.url || !target.resourceUrl) {
    throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", "no staged target");
  }
  return target;
}

async function postStagedFile(
  target: StagedTarget,
  file: { bytes: Buffer; filename: string; mimeType: string },
  fetchImpl: typeof fetch,
): Promise<void> {
  const form = new FormData();
  for (const p of target.parameters ?? []) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), file.filename);
  let res: Response;
  try {
    res = await fetchImpl(target.url, { method: "POST", body: form });
  } catch (err) {
    throw new ImageTranslateError(
      "SHOPIFY_UPLOAD_FAILED",
      `staged POST ${summarizeError(err)}`,
      { cause: err },
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ImageTranslateError(
      "SHOPIFY_UPLOAD_FAILED",
      `staged POST HTTP ${res.status} ${body.slice(0, 200)}`.trim(),
    );
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForFileReady(
  graphql: ShopifyFilesGraphql,
  fileId: string,
  opts: { pollIntervalMs: number; timeoutMs: number },
): Promise<string> {
  const deadline = Date.now() + opts.timeoutMs;
  while (Date.now() < deadline) {
    const data = await callGraphql(graphql, FILE_STATUS, { id: fileId });
    const node = data?.node;
    if (node?.fileStatus === "READY" && node.image?.url) return String(node.image.url);
    if (node?.fileStatus === "FAILED") {
      const reason = (node.fileErrors ?? []).map((e: UserError) => e.message).join("; ");
      throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", `file FAILED ${reason}`);
    }
    await sleep(opts.pollIntervalMs);
  }
  throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", "file not READY before timeout");
}

export type UploadImageToShopifyFilesArgs = {
  graphql: ShopifyFilesGraphql;
  bytes: Buffer;
  mimeType: string;
  filename: string;
  alt?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

/** 走 stagedUploadsCreate → POST → fileCreate → 等 READY，返回商户 Files 里的文件 GID 与 CDN 地址。 */
export async function uploadImageToShopifyFiles(
  args: UploadImageToShopifyFilesArgs,
): Promise<{ fileId: string; url: string }> {
  const file = { bytes: args.bytes, filename: args.filename, mimeType: args.mimeType };
  const target = await createStagedTarget(args.graphql, { ...file, size: args.bytes.length });
  await postStagedFile(target, file, args.fetchImpl ?? fetch);
  const data = await callGraphql(args.graphql, FILE_CREATE, {
    files: [
      {
        originalSource: target.resourceUrl,
        contentType: "IMAGE",
        filename: args.filename,
        duplicateResolutionMode: "APPEND_UUID",
        ...(args.alt ? { alt: args.alt } : {}),
      },
    ],
  });
  throwOnUserErrors(data?.fileCreate?.userErrors, "fileCreate");
  const fileId = data?.fileCreate?.files?.[0]?.id as string | undefined;
  if (!fileId) throw new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", "fileCreate returned no id");
  const url = await waitForFileReady(args.graphql, fileId, {
    pollIntervalMs: args.pollIntervalMs ?? 1000,
    timeoutMs: args.timeoutMs ?? 30_000,
  });
  return { fileId, url };
}

/** 只删我们上传的文件（调用方传 `UserPicture.imageAfterFileId`）；已不存在的 id 不算失败。 */
export async function deleteShopifyFiles(
  graphql: ShopifyFilesGraphql,
  fileIds: string[],
): Promise<string[]> {
  const ids = fileIds.filter((id) => typeof id === "string" && id.startsWith("gid://shopify/"));
  if (!ids.length) return [];
  const data = await callGraphql(graphql, FILE_DELETE, { fileIds: ids });
  const errors = (data?.fileDelete?.userErrors ?? []) as UserError[];
  const blocking = errors.filter((e) => e.code !== "FILE_DOES_NOT_EXIST");
  throwOnUserErrors(blocking, "fileDelete");
  return (data?.fileDelete?.deletedFileIds ?? []) as string[];
}
