//将字符串转化为分为单位的金额方法
export const toCents = (amountStr: string) => {
  return Math.round(Number(amountStr) * 100);
};

//安全解析json字符串
export const parseJSON = <T>(s?: string | null): T | null => {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};
