/**
 * @swagger
 * /songs:
 *   post:
 *     summary: Upload a new song
 *     tags: [Songs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               genreId:
 *                 type: integer
 *               albumId:
 *                 type: integer
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Song uploaded
 */

/**
 * @swagger
 * /songs/{id}/confirm-upload:
 *   post:
 *     summary: Confirm song upload
 *     tags: [Songs]
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
 *         description: Upload confirmed
 */

/**
 * @swagger
 * /songs/{id}:
 *   get:
 *     summary: Get song details
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Song details
 *   put:
 *     summary: Update song
 *     tags: [Songs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Song updated
 *   delete:
 *     summary: Delete song
 *     tags: [Songs]
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
 *         description: Song deleted
 */

/**
 * @swagger
 * /songs/{id}/stream:
 *   get:
 *     summary: Get song stream URL
 *     tags: [Songs]
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
 *         description: Stream URL
 */

/**
 * @swagger
 * /songs/{id}/like:
 *   post:
 *     summary: Like a song
 *     tags: [Songs]
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
 *         description: Song liked
 *   delete:
 *     summary: Unlike a song
 *     tags: [Songs]
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
 *         description: Song unliked
 */

/**
 * @swagger
 * /songs/{id}/play:
 *   post:
 *     summary: Record song play
 *     tags: [Songs]
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
 *         description: Play recorded
 */

/**
 * @swagger
 * /songs/trending:
 *   get:
 *     summary: Get trending songs
 *     tags: [Songs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of trending songs
 */

/**
 * @swagger
 * /songs/new-releases:
 *   get:
 *     summary: Get new releases
 *     tags: [Songs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of new releases
 */

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
