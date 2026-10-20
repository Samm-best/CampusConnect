
const Joi = require('joi');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const pagination = require('../utils/pagination');

const createSchema = Joi.object({
  title: Joi.string().trim().min(3).max(160).required(),
  description: Joi.string().trim().min(10).max(10000).required(),
  category: Joi.string()
    .valid('Academic', 'Accommodation', 'Finance', 'Technical', 'Other')
    .required(),
  priority: Joi.string().valid('Low', 'Medium', 'High').default('Medium')
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid('Open', 'In Progress', 'Resolved', 'Closed')
    .required()
});

const responseSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required()
});

function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: true,
    stripUnknown: true
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  return value;
}

// Create a complaint
exports.create = asyncHandler(async (req, res) => {
  const data = validate(createSchema, req.body);

  const complaint = await Complaint.create({
    ...data,
    submittedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: { complaint }
  });
});

// View the logged-in student's complaints
exports.mine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { submittedBy: req.user.id };

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      complaints: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// List complaints for admin and support
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};

  if (['Open', 'In Progress', 'Resolved', 'Closed'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  if (
    ['Academic', 'Accommodation', 'Finance', 'Technical', 'Other']
      .includes(req.query.category)
  ) {
    filter.category = req.query.category;
  }

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      complaints: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// Find a complaint and check access permissions
async function accessibleComplaint(id, user) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid complaint ID', 400);
  }

  const complaint = await Complaint.findById(id)
    .populate('submittedBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('responses.sender', 'name role');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (
    user.role === 'student' &&
    String(complaint.submittedBy._id) !== String(user.id)
  ) {
    throw new AppError('Complaint not found', 404);
  }

  return complaint;
}

// Get one complaint
exports.get = asyncHandler(async (req, res) => {
  const complaint = await accessibleComplaint(req.params.id, req.user);

  res.json({
    success: true,
    data: { complaint }
  });
});

// Update complaint status
exports.status = asyncHandler(async (req, res) => {
  const { status } = validate(statusSchema, req.body);
  const complaint = await accessibleComplaint(req.params.id, req.user);

  if (
    req.user.role === 'student' &&
    ['Resolved', 'Closed'].includes(status)
  ) {
    throw new AppError('Students cannot resolve or close complaints', 403);
  }

  complaint.status = status;
  await complaint.save();

  res.json({
    success: true,
    data: { complaint }
  });
});

// Assign a complaint to an active support officer or admin
exports.assign = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    assignedTo: Joi.string().required()
  });

  const { assignedTo } = validate(schema, req.body);

  if (
    !mongoose.isValidObjectId(req.params.id) ||
    !mongoose.isValidObjectId(assignedTo)
  ) {
    throw new AppError('Invalid complaint or user ID', 400);
  }

  const assignee = await User.findById(assignedTo);

  if (
    !assignee ||
    !['support', 'admin'].includes(assignee.role) ||
    assignee.status !== 'active'
  ) {
    throw new AppError(
      'Assignee must be an active support officer or admin',
      400
    );
  }

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  complaint.assignedTo = assignee.id;

  if (complaint.status === 'Open') {
    complaint.status = 'In Progress';
  }

  await complaint.save();

  res.json({
    success: true,
    data: { complaint }
  });
});

// Add a response to a complaint
exports.respond = asyncHandler(async (req, res) => {
  const { message } = validate(responseSchema, req.body);
  const complaint = await accessibleComplaint(req.params.id, req.user);

  if (req.user.role === 'student' && complaint.status === 'Closed') {
    throw new AppError('Cannot respond to a closed complaint', 400);
  }

  complaint.responses.push({
    sender: req.user.id,
    message,
    timestamp: new Date()
  });

  await complaint.save();

  res.status(201).json({
    success: true,
    data: { complaint }
  });
});
