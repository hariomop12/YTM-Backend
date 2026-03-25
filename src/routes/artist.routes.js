const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = require("../middlewares/auth.middleware");
const {
  registerArtist,
  getArtistProfile,
  updateArtistProfile,
  getArtistSongs,
  getArtistAlbums,
  getArtistAnalytics,
  followArtist,
  unfollowArtist,
} = require("../controllers/artist.controller");

const router = express.Router();

router.post("/artists/register", authenticate, asyncHandler(registerArtist));
router.get("/artists/me", authenticate, asyncHandler(updateArtistProfile));
router.put("/artists/me", authenticate, asyncHandler(updateArtistProfile));
router.get("/artists/me/analytics", authenticate, asyncHandler(getArtistAnalytics));

router.get("/artists/:id", asyncHandler(getArtistProfile));
router.get("/artists/:id/songs", asyncHandler(getArtistSongs));
router.get("/artists/:id/albums", asyncHandler(getArtistAlbums));

router.post("/artists/:id/follow", authenticate, asyncHandler(followArtist));
router.delete("/artists/:id/follow", authenticate, asyncHandler(unfollowArtist));

module.exports = router;
