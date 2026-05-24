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
    required: true
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
  type: {
    type: String,
    enum: ['diary', 'reminder'],
    default: 'diary'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Note = mongoose.model('Note', noteSchema);
