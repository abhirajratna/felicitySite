const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['participant', 'organizer', 'admin'],
    required: true,
  },

  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  participantType: {
    type: String,
    enum: ['iiit', 'non-iiit', ''],
    default: '',
  },
  collegeName: { type: String, default: '' },
  contactNumber: { type: String, default: '' },

  interests: [{ type: String }],
  followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  onboardingDone: { type: Boolean, default: false },

  organizerName: { type: String, default: '' },
  category: { type: String, default: '' },
  description: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  discordWebhook: { type: String, default: '' },
  isDisabled: { type: Boolean, default: false },

  isIIIT: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.virtual('name').get(function () {
  if (this.role === 'participant') return `${this.firstName} ${this.lastName}`.trim();
  if (this.role === 'organizer') return this.organizerName;
  return 'Admin';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
