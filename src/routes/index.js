import { Router } from "express";
import{router as v2Routes} from "./v2/index.js";


export const router=Router();

router.use("/v2",v2Routes);