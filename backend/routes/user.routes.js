import express from "express";

import isAuth from "../middleware/isAuth.js";
import upload from "../middleware/multer.js";
import {
  assistantRateLimit,
  generalRateLimit,
} from "../middleware/rateLimiter.js";
import {
  getCurrentUser,
  updateAssistant,
  askToAssistant,
} from "../controllers/user.controllers.js";

const userRouter = express.Router();

userRouter.get("/current", generalRateLimit, isAuth, getCurrentUser);
userRouter.post(
  "/update",
  generalRateLimit,
  isAuth,
  upload.single("assistantImage"),
  updateAssistant
);
userRouter.post("/asktoassistant", assistantRateLimit, isAuth, askToAssistant);

export default userRouter;
