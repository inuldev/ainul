import express from "express";

import isAuth from "../middleware/isAuth.js";
import upload from "../middleware/multer.js";
import {
  getCurrentUser,
  updateAssistant,
} from "../controllers/user.controllers.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.post(
  "/update",
  isAuth,
  upload.single("assistantImage"),
  updateAssistant
);

export default userRouter;
