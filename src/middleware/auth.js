
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required', 401));
  }

  const token = header.slice(7).trim();

  if (!token) {
    return next(new AppError('Authentication token required', 401));
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_e) {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findById(payload.sub).select('+password');

  if (!user) {
    return next(new AppError('Account no longer exists', 401));
  }

  if (user.status !== 'active') {
    return next(new AppError('Account is suspended', 403));
  }

  // DB role is authoritative, so a stale token cannot preserve an old role.
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(
      new AppError(
        'You do not have permission to perform this action',
        403
      )
    );
  }

  next();
};
