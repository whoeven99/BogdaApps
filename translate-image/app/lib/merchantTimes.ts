export function availableTranslationTimes(credits: number): number {
  return Math.max(0, Math.floor(Number(credits) / 2000));
}
