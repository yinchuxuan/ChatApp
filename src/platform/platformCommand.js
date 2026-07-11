const ERROR_FIELDS = ['stage', 'file', 'details', 'code'];

function errorMessage(reason, fallback) {
  if (typeof reason === 'string' && reason) return reason;
  if (reason?.error) return String(reason.error);
  if (reason?.message) return String(reason.message);
  return fallback;
}

function normalizePlatformError(reason, fallback = 'Platform command failed') {
  const source = reason && typeof reason === 'object' ? reason : {};
  const error = new Error(errorMessage(reason, fallback));
  error.canceled = source.canceled === true;
  ERROR_FIELDS.forEach((field) => {
    if (source[field] !== undefined) error[field] = source[field];
  });
  return error;
}

function unwrapCommandResult(result, field, fallback) {
  if (!result || result.success === false) {
    throw normalizePlatformError(result, fallback);
  }
  if (field) return result[field];
  const payload = { ...result };
  delete payload.success;
  return payload;
}

function unwrapTauriResult(result, field, fallback) {
  if (result?.success === false) {
    throw normalizePlatformError(result, fallback);
  }
  if (field && Object.prototype.hasOwnProperty.call(result || {}, field)) {
    return result[field];
  }
  if (result?.success === true) return unwrapCommandResult(result, field, fallback);
  return result;
}

export { normalizePlatformError, unwrapCommandResult, unwrapTauriResult };
