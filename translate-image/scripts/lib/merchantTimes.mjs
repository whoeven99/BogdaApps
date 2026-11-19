export function availableTranslationTimes(credits) {
  return Math.max(0, Math.floor(Number(credits) / 2000));
}
