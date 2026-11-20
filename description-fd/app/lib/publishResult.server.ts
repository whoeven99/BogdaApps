type UserError = { code?: string; message?: string; field?: string[] };

function firstError(errors: UserError[] | undefined) {
  return errors?.[0];
}

export function publishOk<T>(value: T | null | undefined, errors: UserError[] | undefined, data: T) {
  const error = firstError(errors);
  if (error) {
    return {
      success: false,
      errorCode: error.code ?? "USER_ERROR",
      errorMessage: error.message ?? "Publish failed",
      data: null,
    };
  }
  if (value == null) {
    return {
      success: false,
      errorCode: "EMPTY_RESULT",
      errorMessage: "Publish failed",
      data: null,
    };
  }
  return {
    success: true,
    errorCode: null,
    errorMessage: null,
    data,
  };
}
