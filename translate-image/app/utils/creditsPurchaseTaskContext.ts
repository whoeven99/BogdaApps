export function buildImageTranslateCreditsPurchaseContext(args: {
  imageCount?: number;
  estimatedCredits?: number | null;
  currentRemainingCredits?: number | null;
  imageJobId?: string;
}) {
  return { kind: "create_task" as const, ...args };
}
