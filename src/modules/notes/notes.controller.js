import { Note } from "./notes.model.js";
import { getNextRepeatingDate } from "../../utils/reminderService.js";

export const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { topic, detail, feeling, type, reminderKind, repeatFrequency, repeatDays, reminderDate, noticeEnabled, noticeAt, result, userTimeZone } = req.body;
    const note = await Note.create({
      user: req.userId,
      topic,
      detail,
      feeling: feeling || 'unknown',
      type,
      reminderKind,
      repeatFrequency,
      repeatDays,
      reminderDate,
      noticeEnabled,
      noticeAt,
      userTimeZone,
      result
    });
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ success: false, error: "Note not found" });
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

export const handleReminderAction = async (req, res, next) => {
  try {
    const { action } = req.body;
    const note = await Note.findOne({ _id: req.params.id, user: req.userId });

    if (!note) return res.status(404).json({ success: false, error: "Note not found" });

    if (action === "stop-always") {
      note.noticeEnabled = false;
      note.noticeSentAt = new Date();
    } else if (action === "pause-once") {
      const nextDate = getNextRepeatingDate(note, note.noticeAt || note.reminderDate || new Date());

      if (nextDate) {
        note.reminderDate = nextDate;
        note.noticeAt = nextDate;
        note.noticeSentAt = null;
        note.noticeEnabled = true;
      } else {
        note.noticeEnabled = false;
        note.noticeSentAt = new Date();
      }
    } else if (action === "notice") {
      note.noticeSentAt = null;
    } else {
      return res.status(400).json({ success: false, error: "Invalid reminder action" });
    }

    await note.save();
    res.status(200).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!note) return res.status(404).json({ success: false, error: "Note not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

