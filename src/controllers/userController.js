const Joi = require('joi');
const mongoose = require('mongoose');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const pagination = require('../utils/pagination');
const profileSchema = Joi.object({ name: Joi.string().trim().min(2).max(80), department: Joi.string().trim().max(100).allow(''), studentId: Joi.string().trim().max(40).allow('') }).min(1);
exports.updateMe = asyncHandler(async (req, res) => {
  const data = await profileSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
  const user = await User.findByIdAndUpdate(req.user.id, { $set: data }, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
});
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query); const filter = {};
  if (req.query.search) { const term = req.query.search.trim().slice(0, 100); filter.$or = [{ name: { $regex: term, $options: 'i' } }, { email: { $regex: term, $options: 'i' } }]; }
  if (['student','admin','support'].includes(req.query.role)) filter.role = req.query.role;
  if (['active','suspended'].includes(req.query.status)) filter.status = req.query.status;
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});
exports.getById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid user ID', 400);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (req.user.role === 'student' && user.id !== req.user.id) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user } });
});
exports.changeRole = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid user ID', 400);
  const schema = Joi.object({ role: Joi.string().valid('student','admin','support').required() });
  const { role } = await schema.validateAsync(req.body);
  if (req.params.id === req.user.id && role !== 'admin') throw new AppError('You cannot remove your own admin role', 400);
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user } });
});
exports.changeStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid user ID', 400);
  const schema = Joi.object({ status: Joi.string().valid('active','suspended').required() }); const { status } = await schema.validateAsync(req.body);
  if (req.params.id === req.user.id && status === 'suspended') throw new AppError('You cannot suspend your own account', 400);
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user } });
});
