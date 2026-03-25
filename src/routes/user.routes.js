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
const {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
  getLikedSongs,
  getHistory,
  getFollowing,
  getPublicProfile,
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/auth/register", asyncHandler(register));
router.post("/auth/login", asyncHandler(login));
router.post("/auth/logout", authenticate, asyncHandler(logout));
router.post("/auth/refresh", asyncHandler(refresh));
router.post("/auth/forgot-password", asyncHandler(forgotPassword));
router.post("/auth/reset-password", asyncHandler(resetPassword));
router.get("/auth/verify-email/:token", asyncHandler(verifyEmail));

router.get("/users/me", authenticate, asyncHandler(getMe));
router.put("/users/me", authenticate, asyncHandler(updateMe));
router.put("/users/me/password", authenticate, asyncHandler(changePassword));
router.delete("/users/me", authenticate, asyncHandler(deleteMe));
router.get("/users/me/liked-songs", authenticate, asyncHandler(getLikedSongs));
router.get("/users/me/history", authenticate, asyncHandler(getHistory));
router.get("/users/me/following", authenticate, asyncHandler(getFollowing));
router.get("/users/:id", authenticate, asyncHandler(getPublicProfile));

module.exports = router;
