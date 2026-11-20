import { getImageRedisClient } from "~/server/redis.server";
import { emailFreqCooldownKey, emailInvalidTemplateCooldownKey } from "./emailRecipientCooldown";

const EMAIL_FREQ_COOLDOWN_TTL_SEC = 60 * 60;
const EMAIL_INVALID_TEMPLATE_TTL_SEC = 24 * 60 * 60;

/** Redis 异常或未配置时放行，避免冷却把发信永久卡住。 */
export async function isEmailRecipientInCooldown(email: string): Promise<boolean> {
  const key = emailFreqCooldownKey(email);
  if (!key) return false;
  try {
    const redis = getImageRedisClient();
    if (!redis) return false;
    const value = await redis.get(key);
    return value != null;
  } catch {
    return false;
  }
}

/** 频控命中后写下 TTL；失败静默，下轮仍可能再撞一次 SES。 */
export async function setEmailRecipientCooldown(email: string): Promise<void> {
  const key = emailFreqCooldownKey(email);
  if (!key) return;
  try {
    const redis = getImageRedisClient();
    if (!redis) return;
    await redis.set(key, String(Date.now()), "EX", EMAIL_FREQ_COOLDOWN_TTL_SEC);
  } catch {
    // ignore
  }
}

export async function isEmailTemplateInCooldown(templateId: number): Promise<boolean> {
  const key = emailInvalidTemplateCooldownKey(templateId);
  if (!key) return false;
  try {
    const redis = getImageRedisClient();
    if (!redis) return false;
    const value = await redis.get(key);
    return value != null;
  } catch {
    return false;
  }
}

export async function setEmailTemplateCooldown(templateId: number): Promise<void> {
  const key = emailInvalidTemplateCooldownKey(templateId);
  if (!key) return;
  try {
    const redis = getImageRedisClient();
    if (!redis) return;
    await redis.set(key, String(Date.now()), "EX", EMAIL_INVALID_TEMPLATE_TTL_SEC);
  } catch {
    // ignore
  }
}
