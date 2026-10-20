const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  role: { type: String, enum: ['student', 'admin', 'support'], default: 'student', required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  department: { type: String, trim: true, maxlength: 100, default: '' },
  studentId: { type: String, trim: true, maxlength: 40, default: '' }
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.password; delete ret.__v; return ret; } } });
userSchema.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_ROUNDS) || 12); });
userSchema.methods.comparePassword = function (candidate) { return bcrypt.compare(candidate, this.password); };
module.exports = mongoose.model('User', userSchema);
