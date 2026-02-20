const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Common fields ---
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['participant', 'organizer', 'admin'],
    required: true,
  },

  // --- Participant fields (Section 6.1) ---
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  participantType: {
    type: String,
    enum: ['iiit', 'non-iiit', ''],
    default: '',
  },
  collegeName: { type: String, default: '' },   // College / Org Name
  contactNumber: { type: String, default: '' },

  // Participant preferences (Section 5)
  interests: [{ type: String }],
  followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  onboardingDone: { type: Boolean, default: false },

  // --- Organizer fields (Section 6.2) ---
  organizerName: { type: String, default: '' },  // Club / Organizer display name
  category: { type: String, default: '' },        // e.g. Technical, Cultural, Sports
  description: { type: String, default: '' },
  contactEmail: { type: String, default: '' },    // public contact email
  discordWebhook: { type: String, default: '' },  // Discord webhook URL for auto-posting
  isDisabled: { type: Boolean, default: false },   // Admin can disable organizer accounts

  // Legacy compat helper
  isIIIT: { type: Boolean, default: false },
}, { timestamps: true });

// Virtual: full name for participant
userSchema.virtual('name').get(function () {
  if (this.role === 'participant') return `${this.firstName} ${this.lastName}`.trim();
  if (this.role === 'organizer') return this.organizerName;
  return 'Admin';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
