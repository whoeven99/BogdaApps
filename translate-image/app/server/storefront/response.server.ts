export type BaseResponse<T = unknown> = {
  success: boolean;
  errorCode: number | null;
  errorMsg: string | null;
  response: T | null;
};

export function ok<T>(data: T): BaseResponse<T> {
  return { success: true, errorCode: null, errorMsg: null, response: data };
}

export function fail(code: number, msg: string): BaseResponse<never> {
  return { success: false, errorCode: code, errorMsg: msg, response: null };
}
