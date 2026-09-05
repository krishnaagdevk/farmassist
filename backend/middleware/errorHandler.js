function errorHandler(err, req, res, next) {
  const requestId = req.headers["x-request-id"] || Math.random().toString(36).substring(7);
  console.error(`[ERROR] [ReqId: ${requestId}]`, err.stack || err.message || err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    error: statusCode === 500 ? "internal_server_error" : err.message,
    requestId,
  });
}

module.exports = errorHandler;
