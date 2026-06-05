import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: ''
  },
  result: {
    type: String
  },
  feeling: {
    type: String, // Mood tracker result
    enum: ['happy', 'sad', 'neutral', 'excited', 'angry', 'unknown'],
    default: 'unknown'
  },
  reminderDate: {
    type: Date
  },
  noticeEnabled: {
    type: Boolean,
    default: true
  },
  noticeAt: {
    type: Date
  },
  noticeSentAt: {
    type: Date
  },
  userTimeZone: {
    type: String
  },
  type: {
    type: String,
    enum: ['diary', 'reminder'],
    default: 'diary'
  },
  reminderKind: {
    type: String,
    enum: ['event', 'daily'],
    default: 'event'
  },
  repeatFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'always'],
    default: 'always'
  },
  repeatDays: {
    type: [Number],
    default: undefined,
    validate: {
      validator(days) {
        return !days || days.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
      },
      message: 'Repeat days must be numbers from 0 to 6'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Note = mongoose.model('Note', noteSchema);
