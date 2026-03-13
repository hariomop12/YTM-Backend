const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middlewares/auth.middleware");
const {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/auth/register", asyncHandler(register));
router.post("/auth/login", asyncHandler(login));
router.post("/auth/logout", authenticate, asyncHandler(logout));
router.post("/auth/refresh", asyncHandler(refresh));
router.post("/auth/forgot-password", asyncHandler(forgotPassword));
router.post("/auth/reset-password", asyncHandler(resetPassword));
router.get("/auth/verify-email/:token", asyncHandler(verifyEmail));

module.exports = router;
