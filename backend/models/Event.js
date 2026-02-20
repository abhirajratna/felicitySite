const mongoose = require('mongoose');

// Dynamic form field schema (for Normal events custom registration form)
const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fieldType: { type: String, enum: ['text', 'number', 'email', 'select', 'checkbox', 'textarea', 'file', 'date'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // for select fields
  order: { type: Number, default: 0 },
}, { _id: true });

const registrationSchema = new mongoose.Schema({
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['confirmed', 'cancelled', 'rejected', 'pending_approval'], default: 'confirmed' },
  // Normal event custom form answers
  formAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Merchandise extras
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  variant: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  // Payment approval workflow
  paymentProof: { type: String, default: '' },
  // Attendance tracking
  attendanceChecked: { type: Boolean, default: false },
  attendanceCheckedAt: { type: Date },
  attendanceNote: { type: String, default: '' },
}, { _id: true });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eventType: { type: String, enum: ['normal', 'merchandise'], required: true },

  // Organizer who created the event
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Section 8 attributes
  eligibility: { type: String, enum: ['all', 'iiit', 'non-iiit'], default: 'all' },
  registrationDeadline: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  registrationLimit: { type: Number, default: 0 }, // 0 = unlimited
  registrationFee: { type: Number, default: 0 },
  tags: [{ type: String }],
  venue: { type: String, default: '' },
  image: { type: String, default: '' },

  // Normal event: dynamic form builder fields
  customFormFields: [formFieldSchema],

  // Merchandise-specific
  price: { type: Number, default: 0 },
  itemType: { type: String, default: '' },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  variants: [{ type: String }],
  stockQuantity: { type: Number, default: 0 },
  purchaseLimitPerUser: { type: Number, default: 1 },

  // Registrations
  registrations: [registrationSchema],

  status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed', 'cancelled'], default: 'draft' },

  // Trending support
  viewCount: { type: Number, default: 0 },
  recentViews: [{ type: Date }], // timestamps of views in last 24h
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
