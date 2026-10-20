
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const schemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().email().max(254).required(),
    password: Joi.string().min(8).max(128).required(),
    department: Joi.string().max(100).allow('').optional(),
    studentId: Joi.string().max(40).allow('').optional(),
    role: Joi.any().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
};

function tokenFor(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    department: user.department,
    studentId: user.studentId,
    createdAt: user.createdAt
  };
}

exports.schemas = schemas;

exports.register = asyncHandler(async (req, res) => {
  const data = await schemas.register.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  const user = await User.create({
    name: data.name,
    email: data.email,
    password: data.password,
    department: data.department || '',
    studentId: data.studentId || '',
    role: 'student'
  });

  res.status(201).json({
    success: true,
    message: 'Student account created',
    data: {
      user: publicUser(user),
      token: tokenFor(user)
    }
  });
});

exports.login = asyncHandler(async (req, res) => {
  const data = await schemas.login.validateAsync(req.body, {
    abortEarly: false
  });

  const user = await User.findOne({
    email: data.email.toLowerCase()
  }).select('+password');

  if (!user || !(await user.comparePassword(data.password)))
    throw new AppError('Invalid email or password', 401);

  if (user.status !== 'active')
    throw new AppError('Account is suspended', 403);

  res.json({
    success: true,
    data: {
      user: publicUser(user),
      token: tokenFor(user)
    }
  });
});

exports.me = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: {
      user: publicUser(req.user)
    }
  })
);

exports.changePassword = asyncHandler(async (req, res) => {
  const data = await schemas.changePassword.validateAsync(req.body, {
    abortEarly: false
  });

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(data.currentPassword)))
    throw new AppError('Current password is incorrect', 400);

  user.password = data.newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed. Please log in again on your other devices.'
  });
});

exports.logout = asyncHandler(async (_req, res) =>
  res.json({
    success: true,
    message: 'Logout acknowledged. Delete the bearer token on the client. This stateless access token remains valid until expiry unless server-side revocation is implemented.'
  })
);
