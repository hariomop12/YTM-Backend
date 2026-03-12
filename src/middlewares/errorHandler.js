const globalErrorHandler = (err, req, res) => {
  const statusCode = err.status || err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = globalErrorHandler;
