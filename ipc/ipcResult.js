function failureResult(error, fallback = {}) {
  return {
    success: false,
    error: error?.message || String(error),
    ...(error?.stage ? { stage: error.stage } : {}),
    ...(error?.file ? { file: error.file } : {}),
    ...(error?.details ? { details: error.details } : {}),
    ...fallback
  };
}

module.exports = { failureResult };
