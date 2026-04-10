const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  timezone: { type: String, default: 'UTC' },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    defaultPomodoroMinutes: { type: Number, default: 25 },
    defaultShortBreakMinutes: { type: Number, default: 5 },
    defaultLongBreakMinutes: { type: Number, default: 15 },
    startWeekOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
  },
  defaultWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  refreshTokens: [{ type: String }],
}, { timestamps: true });

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
