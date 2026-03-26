/**
 * @swagger
 * /artists/register:
 *   post:
 *     summary: Register as an artist
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stageName, bio]
 *             properties:
 *               stageName:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Artist registered
 */

/**
 * @swagger
 * /artists/me:
 *   get:
 *     summary: Get current artist profile
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Artist profile
 *   put:
 *     summary: Update artist profile
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stageName:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /artists/me/analytics:
 *   get:
 *     summary: Get artist analytics
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Analytics data
 */

/**
 * @swagger
 * /artists/{id}:
 *   get:
 *     summary: Get artist profile
 *     tags: [Artists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artist profile
 */

/**
 * @swagger
 * /artists/{id}/songs:
 *   get:
 *     summary: Get artist's songs
 *     tags: [Artists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of artist songs
 */

/**
 * @swagger
 * /artists/{id}/albums:
 *   get:
 *     summary: Get artist's albums
 *     tags: [Artists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of artist albums
 */

/**
 * @swagger
 * /artists/{id}/follow:
 *   post:
 *     summary: Follow an artist
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artist followed
 *   delete:
 *     summary: Unfollow an artist
 *     tags: [Artists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artist unfollowed
 */

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
