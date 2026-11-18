const TRANSITIONS = {
  pause: { from: ["QUEUED", "RUNNING"], status: "PAUSED", pauseReason: "MANUAL" },
  resume: { from: ["PAUSED"], status: "QUEUED", pauseReason: null },
  cancel: { from: ["QUEUED", "RUNNING", "PAUSED"], status: "CANCELLED", pauseReason: null },
};

export function controlTransition(intent) {
  return TRANSITIONS[intent] ?? null;
}
