const AppError = require('../utils/AppError');
exports.notFound = (req, _res, next) => next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500; let message = err.message || 'Internal server error'; let details = err.details;
  if (err.isJoi) { status = 400; message = 'Validation failed'; details = err.details.map(e => ({ message: e.message, field: e.path.join('.') })); }
  if (err.name === 'ValidationError') { status = 400; message = 'Database validation failed'; details = Object.values(err.errors).map(e => e.message); }
  if (err.code === 11000) { status = 409; message = 'An account with this email already exists'; }
  if (err.name === 'CastError') { status = 400; message = 'Invalid resource ID'; }
  const body = { success: false, message };
  if (details) body.details = details;
  if (process.env.NODE_ENV !== 'production' && status >= 500) body.debug = err.message;
  res.status(status).json(body);
};
