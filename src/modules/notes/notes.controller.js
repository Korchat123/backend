import { Note } from "./notes.model.js";

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
    const { topic, detail, feeling, type, reminderDate, result } = req.body;
    const note = await Note.create({
      user: req.userId,
      topic,
      detail,
      feeling: feeling || 'unknown',
      type,
      reminderDate,
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

export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!note) return res.status(404).json({ success: false, error: "Note not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

