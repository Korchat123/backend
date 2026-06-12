import { Router } from "express";
import { getNotes, createNote, updateNote, handleReminderAction, deleteNote } from "../../modules/notes/notes.controller.js";
import { authUser } from "../../middlewares/auth.js";

export const router = Router();

router.use(authUser);

router.get("/", getNotes);
router.post("/", createNote);
router.post("/:id/reminder-action", handleReminderAction);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
