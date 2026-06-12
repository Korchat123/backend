import { Note } from "./notes.model.js";
import { getNextRepeatingDate } from "../../utils/reminderService.js";
import jwt from "jsonwebtoken";

const allowedFeelings = new Set(['happy', 'sad', 'neutral', 'excited', 'angry', 'unknown']);
const allowedReminderKinds = new Set(['event', 'daily']);
const allowedRepeatFrequencies = new Set(['weekly', 'monthly', 'yearly', 'always']);

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildNotePayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (body.topic !== undefined) payload.topic = String(body.topic).trim();
  if (body.detail !== undefined) payload.detail = String(body.detail || '');
  if (body.result !== undefined) payload.result = String(body.result || '');
  if (body.feeling !== undefined && allowedFeelings.has(body.feeling)) payload.feeling = body.feeling;
  if (body.repeatFrequency !== undefined && allowedRepeatFrequencies.has(body.repeatFrequency)) payload.repeatFrequency = body.repeatFrequency;
  if (Array.isArray(body.repeatDays)) payload.repeatDays = body.repeatDays;
  if (body.userTimeZone !== undefined) payload.userTimeZone = String(body.userTimeZone || '');

  const reminderDate = parseDate(body.reminderDate);
  const noticeAt = parseDate(body.noticeAt);

  if (reminderDate === null || noticeAt === null) {
    return { error: 'Invalid reminder date' };
  }

  if (body.reminderDate !== undefined) payload.reminderDate = reminderDate || null;

  const hasReminder = body.reminderDate !== undefined
    ? Boolean(reminderDate)
    : Boolean(body.existingReminderDate);

  if (body.noticeEnabled !== undefined) payload.noticeEnabled = hasReminder ? Boolean(body.noticeEnabled) : false;

  if (body.noticeAt !== undefined) {
    payload.noticeAt = hasReminder && payload.noticeEnabled !== false ? (noticeAt || reminderDate || null) : null;
  }

  if (body.reminderKind !== undefined && allowedReminderKinds.has(body.reminderKind)) {
    payload.reminderKind = body.reminderKind;
  } else if (!partial && hasReminder) {
    payload.reminderKind = 'event';
  }

  if (!partial) {
    if (!payload.topic) return { error: 'topic is required' };
    payload.type = hasReminder ? 'reminder' : 'diary';
    if (!hasReminder) {
      payload.noticeEnabled = false;
      payload.noticeAt = null;
    }
    payload.noticeSentAt = null;
  } else if (body.reminderDate !== undefined) {
    payload.type = hasReminder ? 'reminder' : 'diary';
    payload.noticeSentAt = null;
  }

  return { payload };
};

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
    const { payload, error } = buildNotePayload(req.body);
    if (error) return res.status(400).json({ success: false, error });

    const note = await Note.create({
      user: req.userId,
      ...payload,
      feeling: payload.feeling || 'unknown',
    });
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const existing = await Note.findOne({ _id: req.params.id, user: req.userId });
    if (!existing) return res.status(404).json({ success: false, error: "Note not found" });

    const { payload, error } = buildNotePayload({
      ...req.body,
      existingReminderDate: existing.reminderDate,
    }, { partial: true });
    if (error) return res.status(400).json({ success: false, error });

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: payload },
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

export const handleReminderActionWithToken = async (req, res, next) => {
  try {
    const { action, token } = req.body || {};
    if (!token) return res.status(401).json({ success: false, error: "Action token is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.noteId !== req.params.id) {
      return res.status(403).json({ success: false, error: "Invalid reminder action token" });
    }

    req.userId = decoded.userId;
    return handleReminderAction(req, res, next);
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, error: "Invalid or expired reminder action token" });
    }
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

