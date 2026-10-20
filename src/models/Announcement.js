
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 10000
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'General'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
