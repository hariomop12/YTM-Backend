const Joi = require("joi");
const sequelize = require("../config/db");
const Song = require("../models/mysql/Song");
const Artist = require("../models/mysql/Artist");
const Album = require("../models/mysql/Album");
const LikedSong = require("../models/mysql/LikedSong");
const ArtistAnalytics = require("../models/mongo/ArtistAnalytics");
const ListeningHistory = require("../models/mongo/ListeningHistory");
const redis = require("../config/redis");
const { generateUploadUrl, generateStreamUrl, deleteObject, isConfigured: isR2Configured } = require("../services/r2.service");

const isArtist = (user) => user.role === "artist";

const uploadSongSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  duration_seconds: Joi.number().integer().min(1).required(),
  album_id: Joi.number().integer().allow(null),
  release_date: Joi.date().iso(),
  thumbnail_key: Joi.string().allow(null, ""),
});

const updateSongSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  duration_seconds: Joi.number().integer().min(1),
  album_id: Joi.number().integer().allow(null),
  release_date: Joi.date().iso(),
  thumbnail_key: Joi.string().allow(null, ""),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const getArtistForUser = async (userId) => {
  return await Artist.findOne({ where: { user_id: userId } });
};

const uploadSong = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can upload songs" });
  }

  const artist = await getArtistForUser(req.user.id);
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const { error, value } = uploadSongSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const audioKey = `audio/${artist.id}/${Date.now()}-${value.title.replace(/[^a-zA-Z0-9]/g, "_")}`;

  let presignedUrl = null;
  if (isR2Configured) {
    try {
      presignedUrl = await generateUploadUrl(audioKey, 3600);
    } catch (err) {
      console.error("Failed to generate presigned URL:", err.message);
    }
  }

  const song = await Song.create({
    title: value.title,
    duration_seconds: value.duration_seconds,
    audio_r2_key: audioKey,
    thumbnail_r2_key: value.thumbnail_key || null,
    artist_id: artist.id,
    album_id: value.album_id || null,
    release_date: value.release_date || new Date(),
    is_published: false,
    play_count: 0,
  });

  return res.status(201).json({
    message: "Song created, upload audio to R2",
    song: {
      id: song.id,
      title: song.title,
      audio_r2_key: song.audio_r2_key,
    },
    upload_url: presignedUrl,
  });
};

const confirmUpload = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can confirm uploads" });
  }

  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const artist = await getArtistForUser(req.user.id);
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const song = await Song.findOne({
    where: { id: songId, artist_id: artist.id },
    include: [{ model: Album, as: "album" }],
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found or not owned by you" });
  }

  if (song.is_published) {
    return res.status(400).json({ message: "Song already published" });
  }

  await song.update({ is_published: true });

  return res.json({
    message: "Song published successfully",
    song: {
      id: song.id,
      title: song.title,
      is_published: song.is_published,
    },
  });
};

const getSong = async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const song = await Song.findOne({
    where: { id: songId, is_published: true },
    include: [
      { model: Artist, as: "artist", attributes: ["id", "stage_name", "profile_image_url", "is_verified"] },
      { model: Album, as: "album", attributes: ["id", "title", "cover_r2_key", "release_date", "type"] },
    ],
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  let isLiked = false;
  if (req.user) {
    const like = await LikedSong.findOne({
      where: { user_id: req.user.id, song_id: songId },
    });
    isLiked = !!like;
  }

  return res.json({
    id: song.id,
    title: song.title,
    duration_seconds: song.duration_seconds,
    audio_r2_key: song.audio_r2_key,
    thumbnail_r2_key: song.thumbnail_r2_key,
    play_count: song.play_count,
    release_date: song.release_date,
    is_published: song.is_published,
    is_liked: isLiked,
    artist: song.artist
      ? {
          id: song.artist.id,
          stage_name: song.artist.stage_name,
          profile_image_url: song.artist.profile_image_url,
          is_verified: song.artist.is_verified,
        }
      : null,
    album: song.album
      ? {
          id: song.album.id,
          title: song.album.title,
          cover_url: song.album.cover_r2_key,
          release_date: song.album.release_date,
          type: song.album.type,
        }
      : null,
  });
};

const getStreamUrl = async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const song = await Song.findOne({
    where: { id: songId, is_published: true },
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  if (!isR2Configured) {
    return res.status(503).json({ message: "Streaming not available" });
  }

  try {
    const streamUrl = await generateStreamUrl(song.audio_r2_key, 3600);
    return res.json({ stream_url: streamUrl });
  } catch (err) {
    console.error("Failed to generate stream URL:", err.message);
    return res.status(500).json({ message: "Failed to generate stream URL" });
  }
};

const updateSong = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can update songs" });
  }

  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const artist = await getArtistForUser(req.user.id);
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const { error, value } = updateSongSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const song = await Song.findOne({
    where: { id: songId, artist_id: artist.id },
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found or not owned by you" });
  }

  const allowedFields = ["title", "duration_seconds", "album_id", "release_date", "thumbnail_r2_key"];
  const updateData = {};
  for (const key of allowedFields) {
    if (value[key] !== undefined) {
      updateData[key] = value[key];
    }
  }

  await song.update(updateData);

  return res.json({
    message: "Song updated successfully",
    song: {
      id: song.id,
      title: song.title,
      duration_seconds: song.duration_seconds,
      thumbnail_r2_key: song.thumbnail_r2_key,
      album_id: song.album_id,
      release_date: song.release_date,
    },
  });
};

const deleteSong = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can delete songs" });
  }

  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const artist = await getArtistForUser(req.user.id);
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const song = await Song.findOne({
    where: { id: songId, artist_id: artist.id },
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found or not owned by you" });
  }

  if (isR2Configured) {
    try {
      await deleteObject(song.audio_r2_key);
      if (song.thumbnail_r2_key) {
        await deleteObject(song.thumbnail_r2_key);
      }
    } catch (err) {
      console.error("Failed to delete R2 objects:", err.message);
    }
  }

  await LikedSong.destroy({ where: { song_id: songId } });
  await ArtistAnalytics.deleteMany({ song_id: songId });
  await ListeningHistory.deleteMany({ song_id: songId });

  await song.destroy();

  return res.json({ message: "Song deleted successfully" });
};

const likeSong = async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const song = await Song.findOne({
    where: { id: songId, is_published: true },
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  const existingLike = await LikedSong.findOne({
    where: { user_id: req.user.id, song_id: songId },
  });

  if (existingLike) {
    return res.status(409).json({ message: "Song already liked" });
  }

  await LikedSong.create({
    user_id: req.user.id,
    song_id: songId,
  });

  return res.status(201).json({ message: "Song liked successfully" });
};

const unlikeSong = async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const deleted = await LikedSong.destroy({
    where: { user_id: req.user.id, song_id: songId },
  });

  if (!deleted) {
    return res.status(404).json({ message: "Song not liked" });
  }

  return res.json({ message: "Song unliked successfully" });
};

const recordPlay = async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const song = await Song.findOne({
    where: { id: songId, is_published: true },
  });

  if (!song) {
    return res.status(404).json({ message: "Song not found" });
  }

  const t = await sequelize.transaction();
  try {
    await song.increment("play_count", { transaction: t });

    const { source = "playlist", device = "web", duration_played = 0, country_code } = req.body || {};

    await ListeningHistory.create(
      {
        user_id: req.user.id,
        song_id: songId,
        artist_id: song.artist_id,
        duration_played,
        source,
        device,
      },
      { transaction: t }
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await ArtistAnalytics.findOneAndUpdate(
      { song_id: songId, artist_id: song.artist_id },
      {
        $inc: { "plays_by_date.$[elem].count": 1 },
        $addToSet: country_code ? { countries: { country_code, count: 1 } } : {},
      },
      {
        arrayFilters: [{ "elem.date": { $gte: today } }],
        upsert: true,
        new: true,
      }
    );

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("Failed to record play:", err.message);
    return res.status(500).json({ message: "Failed to record play event" });
  }

  return res.json({
    message: "Play recorded",
    song: {
      id: song.id,
      title: song.title,
      play_count: song.play_count + 1,
    },
  });
};

const getTrendingSongs = async (req, res) => {
  const cacheKey = "songs:trending";
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const songs = await Song.findAll({
    where: { is_published: true },
    include: [
      { model: Artist, as: "artist", attributes: ["id", "stage_name", "profile_image_url", "is_verified"] },
      { model: Album, as: "album", attributes: ["id", "title", "cover_r2_key", "release_date", "type"] },
    ],
    order: [["play_count", "DESC"]],
    limit: 50,
  });

  const result = songs.map((song) => ({
    id: song.id,
    title: song.title,
    duration_seconds: song.duration_seconds,
    thumbnail_r2_key: song.thumbnail_r2_key,
    play_count: song.play_count,
    release_date: song.release_date,
    artist: song.artist
      ? {
          id: song.artist.id,
          stage_name: song.artist.stage_name,
          profile_image_url: song.artist.profile_image_url,
          is_verified: song.artist.is_verified,
        }
      : null,
    album: song.album
      ? {
          id: song.album.id,
          title: song.album.title,
          cover_url: song.album.cover_r2_key,
        }
      : null,
  }));

  await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

  return res.json(result);
};

const getNewReleases = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const { page, limit } = value;
  const offset = (page - 1) * limit;

  const { count, rows } = await Song.findAndCountAll({
    where: { is_published: true },
    include: [
      { model: Artist, as: "artist", attributes: ["id", "stage_name", "profile_image_url", "is_verified"] },
      { model: Album, as: "album", attributes: ["id", "title", "cover_r2_key", "release_date", "type"] },
    ],
    order: [["release_date", "DESC"]],
    limit,
    offset,
  });

  const songs = rows.map((song) => ({
    id: song.id,
    title: song.title,
    duration_seconds: song.duration_seconds,
    thumbnail_r2_key: song.thumbnail_r2_key,
    play_count: song.play_count,
    release_date: song.release_date,
    artist: song.artist
      ? {
          id: song.artist.id,
          stage_name: song.artist.stage_name,
          profile_image_url: song.artist.profile_image_url,
          is_verified: song.artist.is_verified,
        }
      : null,
    album: song.album
      ? {
          id: song.album.id,
          title: song.album.title,
          cover_url: song.album.cover_r2_key,
          release_date: song.album.release_date,
          type: song.album.type,
        }
      : null,
  }));

  return res.json({
    songs,
    pagination: {
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  });
};

module.exports = {
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
};
