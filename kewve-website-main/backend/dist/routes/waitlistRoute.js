import { Router } from "express";
import { submitWaitlist } from "../controllers/waitlistController.js";
const router = Router();
router.post("/waitlist", submitWaitlist);
export default router;
