const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fieldType: { type: String, enum: ['text', 'number', 'email', 'select', 'checkbox', 'textarea', 'file', 'date'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  order: { type: Number, default: 0 },
}, { _id: true });

const registrationSchema = new mongoose.Schema({
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['confirmed', 'cancelled', 'rejected', 'pending_approval'], default: 'confirmed' },
  formAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  variant: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  paymentProof: { type: String, default: '' },
  attendanceChecked: { type: Boolean, default: false },
  attendanceCheckedAt: { type: Date },
  attendanceNote: { type: String, default: '' },
}, { _id: true });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eventType: { type: String, enum: ['normal', 'merchandise'], required: true },

  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  eligibility: { type: String, enum: ['all', 'iiit', 'non-iiit'], default: 'all' },
  registrationDeadline: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  registrationLimit: { type: Number, default: 0 }, // 0 = unlimited
  registrationFee: { type: Number, default: 0 },
  tags: [{ type: String }],
  venue: { type: String, default: '' },
  image: { type: String, default: '' },

  customFormFields: [formFieldSchema],

  price: { type: Number, default: 0 },
  itemType: { type: String, default: '' },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  variants: [{ type: String }],
  stockQuantity: { type: Number, default: 0 },
  purchaseLimitPerUser: { type: Number, default: 1 },

  registrations: [registrationSchema],

  status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed', 'cancelled'], default: 'draft' },

  viewCount: { type: Number, default: 0 },
  recentViews: [{ type: Date }],
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
