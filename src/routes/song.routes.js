const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middlewares/auth.middleware");
const {
  uploadSong,
  confirmUpload,
  getSong,
  getStreamUrl,
  updateSong,
  deleteSong,
  likeSong,
  unlikeSong,
  recordPlay,
  getTrendingSongs,
  getNewReleases,
} = require("../controllers/song.controller");

const router = express.Router();

router.post("/songs", authenticate, asyncHandler(uploadSong));
router.post("/songs/:id/confirm-upload", authenticate, asyncHandler(confirmUpload));

router.get("/songs/:id", asyncHandler(getSong));
router.get("/songs/:id/stream", authenticate, asyncHandler(getStreamUrl));

router.put("/songs/:id", authenticate, asyncHandler(updateSong));
router.delete("/songs/:id", authenticate, asyncHandler(deleteSong));

router.post("/songs/:id/like", authenticate, asyncHandler(likeSong));
router.delete("/songs/:id/like", authenticate, asyncHandler(unlikeSong));

router.post("/songs/:id/play", authenticate, asyncHandler(recordPlay));

router.get("/songs/trending", asyncHandler(getTrendingSongs));
router.get("/songs/new-releases", asyncHandler(getNewReleases));

module.exports = router;
