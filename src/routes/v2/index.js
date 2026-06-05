import { Router } from "express";
import {router as usersRoutes} from "./users.routes.js"
import {router as notesRoutes} from "./notes.routes.js"
export const router=Router();
router.use("/users",usersRoutes);
router.use("/notes",notesRoutes);