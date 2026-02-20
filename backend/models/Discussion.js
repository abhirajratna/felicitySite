const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  pinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  replies: [replySchema],
  reactions: { type: Map, of: [String], default: {} }, // emoji -> array of user IDs
  createdAt: { type: Date, default: Date.now },
});

const discussionSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  messages: [messageSchema],
}, { timestamps: true });

module.exports = mongoose.model('Discussion', discussionSchema);
