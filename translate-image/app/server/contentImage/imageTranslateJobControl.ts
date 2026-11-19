export type ImageJobControlIntent = "pause" | "resume" | "cancel";

const TRANSITIONS: Record<
  ImageJobControlIntent,
  { from: string[]; status: string; pauseReason: string | null }
> = {
  pause: { from: ["QUEUED", "RUNNING"], status: "PAUSED", pauseReason: "MANUAL" },
  resume: { from: ["PAUSED"], status: "QUEUED", pauseReason: null },
  cancel: { from: ["QUEUED", "RUNNING", "PAUSED"], status: "CANCELLED", pauseReason: null },
};

export function controlTransition(intent: string) {
  if (intent !== "pause" && intent !== "resume" && intent !== "cancel") return null;
  return TRANSITIONS[intent];
}
