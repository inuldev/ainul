import express from "express";

import { signup, login, logout } from "../controllers/auth.controllers.js";
import { authRateLimit, generalRateLimit } from "../middleware/rateLimiter.js";

const authRouter = express.Router();

authRouter.post("/signup", authRateLimit, signup);
authRouter.post("/signin", authRateLimit, login);
authRouter.get("/logout", generalRateLimit, logout);

export default authRouter;
