const Joi = require("joi");
const sequelize = require("../config/db");
const User = require("../models/mysql/User");
const Artist = require("../models/mysql/Artist");
const Song = require("../models/mysql/Song");
const Album = require("../models/mysql/Album");
const Follow = require("../models/mysql/Follow");
const ArtistAnalytics = require("../models/mongo/ArtistAnalytics");

const registerArtistSchema = Joi.object({
  stage_name: Joi.string().min(2).max(100).required(),
  bio: Joi.string().max(1000).allow(null, ""),
  profile_image_url: Joi.string().uri().allow(null, ""),
});

const updateArtistProfileSchema = Joi.object({
  stage_name: Joi.string().min(2).max(100),
  bio: Joi.string().max(1000).allow(null, ""),
  profile_image_url: Joi.string().uri().allow(null, ""),
  banner_url: Joi.string().uri().allow(null, ""),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const isArtist = (user) => user.role === "artist";

const getArtistProfile = async (req, res) => {
  const artistId = parseInt(req.params.id, 10);
  if (isNaN(artistId)) {
    return res.status(400).json({ message: "Invalid artist ID" });
  }

  const artist = await Artist.findByPk(artistId, {
    include: [
      { model: User, as: "User", attributes: ["id", "display_name", "avatar_url"] },
    ],
  });

  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  const followerCount = await Follow.count({ where: { artist_id: artistId } });
  const songCount = await Song.count({ where: { artist_id: artistId, is_published: true } });

  return res.json({
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
      bio: artist.bio,
      profile_image_url: artist.profile_image_url,
      banner_url: artist.banner_url,
      monthly_listeners: artist.monthly_listeners,
      is_verified: artist.is_verified,
      user: artist.User
        ? {
            id: artist.User.id,
            display_name: artist.User.display_name,
            avatar_url: artist.User.avatar_url,
          }
        : null,
    },
    stats: {
      followers: followerCount,
      songs: songCount,
    },
  });
};

const registerArtist = async (req, res) => {
  if (isArtist(req.user)) {
    return res.status(400).json({ message: "Already registered as an artist" });
  }

  const { error, value } = registerArtistSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const existingArtist = await Artist.findOne({ where: { stage_name: value.stage_name } });
  if (existingArtist) {
    return res.status(409).json({ message: "Stage name already taken" });
  }

  const t = await sequelize.transaction();
  try {
    await req.user.update({ role: "artist" }, { fields: ["role"], transaction: t });

    const artist = await Artist.create(
      {
        user_id: req.user.id,
        stage_name: value.stage_name,
        bio: value.bio || null,
        profile_image_url: value.profile_image_url || null,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      message: "Registered as artist successfully",
      artist: {
        id: artist.id,
        stage_name: artist.stage_name,
        bio: artist.bio,
        profile_image_url: artist.profile_image_url,
        is_verified: artist.is_verified,
      },
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const updateArtistProfile = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can update artist profile" });
  }

  const { error, value } = updateArtistProfileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  if (value.stage_name) {
    const existing = await Artist.findOne({
      where: { stage_name: value.stage_name, user_id: { [sequelize.Sequelize.Op.ne]: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ message: "Stage name already taken" });
    }
  }

  const artist = await Artist.findOne({ where: { user_id: req.user.id } });
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const allowedFields = ["stage_name", "bio", "profile_image_url", "banner_url"];
  const updateData = {};
  for (const key of allowedFields) {
    if (value[key] !== undefined) {
      updateData[key] = value[key];
    }
  }

  await artist.update(updateData, { fields: Object.keys(updateData) });

  return res.json({
    message: "Artist profile updated successfully",
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
      bio: artist.bio,
      profile_image_url: artist.profile_image_url,
      banner_url: artist.banner_url,
      is_verified: artist.is_verified,
    },
  });
};

const getArtistSongs = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const artistId = parseInt(req.params.id, 10);
  if (isNaN(artistId)) {
    return res.status(400).json({ message: "Invalid artist ID" });
  }

  const artist = await Artist.findByPk(artistId);
  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  const { page, limit } = value;
  const offset = (page - 1) * limit;

  const { count, rows } = await Song.findAndCountAll({
    where: { artist_id: artistId, is_published: true },
    include: [
      {
        model: Album,
        as: "album",
        attributes: ["id", "title", "cover_r2_key", "release_date", "type"],
      },
    ],
    order: [["release_date", "DESC"]],
    limit,
    offset,
  });

  const songs = rows.map((song) => ({
    id: song.id,
    title: song.title,
    duration_seconds: song.duration_seconds,
    thumbnail_url: song.thumbnail_r2_key,
    play_count: song.play_count,
    release_date: song.release_date,
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
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
      profile_image_url: artist.profile_image_url,
    },
    songs,
    pagination: {
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  });
};

const getArtistAlbums = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const artistId = parseInt(req.params.id, 10);
  if (isNaN(artistId)) {
    return res.status(400).json({ message: "Invalid artist ID" });
  }

  const artist = await Artist.findByPk(artistId);
  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  const { page, limit } = value;
  const offset = (page - 1) * limit;

  const { count, rows } = await Album.findAndCountAll({
    where: { artist_id: artistId },
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["id"],
        required: false,
      },
    ],
    order: [["release_date", "DESC"]],
    limit,
    offset,
  });

  const albums = rows.map((album) => ({
    id: album.id,
    title: album.title,
    description: album.description,
    cover_url: album.cover_r2_key,
    release_date: album.release_date,
    type: album.type,
    song_count: album.songs ? album.songs.length : 0,
  }));

  return res.json({
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
      profile_image_url: artist.profile_image_url,
    },
    albums,
    pagination: {
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  });
};

const getArtistAnalytics = async (req, res) => {
  if (!isArtist(req.user)) {
    return res.status(403).json({ message: "Only artists can view analytics" });
  }

  const artist = await Artist.findOne({ where: { user_id: req.user.id } });
  if (!artist) {
    return res.status(404).json({ message: "Artist profile not found" });
  }

  const { period = "30d" } = req.query;

  let daysBack = 30;
  if (period === "7d") daysBack = 7;
  else if (period === "90d") daysBack = 90;
  else if (period === "365d") daysBack = 365;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const analytics = await ArtistAnalytics.aggregate(
    [
      {
        $match: {
          artist_id: artist.id,
          "plays_by_date.date": { $gte: startDate },
        },
      },
      {
        $unwind: "$plays_by_date",
      },
      {
        $match: {
          "plays_by_date.date": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total_plays: { $sum: "$plays_by_date.count" },
          total_countries: { $addToSet: "$countries.country_code" },
        },
      },
    ],
    [
      {
        $project: {
          _id: 0,
          total_plays: 1,
          country_count: { $size: "$total_countries" },
          countries: "$total_countries",
        },
      },
    ]
  );

  const songStats = await ArtistAnalytics.aggregate([
    { $match: { artist_id: artist.id } },
    { $unwind: "$plays_by_date" },
    { $match: { "plays_by_date.date": { $gte: startDate } } },
    {
      $group: {
        _id: "$song_id",
        total_plays: { $sum: "$plays_by_date.count" },
      },
    },
    { $sort: { total_plays: -1 } },
    { $limit: 10 },
  ]);

  const songIds = songStats.map((s) => s._id);
  const songs = await Song.findAll({
    where: { id: songIds },
    attributes: ["id", "title", "thumbnail_r2_key"],
  });
  const songMap = new Map(songs.map((s) => [s.id, s]));

  const topSongs = songStats.map((stat) => {
    const song = songMap.get(stat._id);
    return {
      song_id: stat._id,
      title: song ? song.title : "Unknown",
      thumbnail_url: song ? song.thumbnail_r2_key : null,
      plays: stat.total_plays,
    };
  });

  const result = analytics[0] || { total_plays: 0, country_count: 0, countries: [] };

  return res.json({
    artist: {
      id: artist.id,
      stage_name: artist.stage_name,
    },
    period,
    analytics: {
      total_plays: result.total_plays,
      unique_countries: result.country_count,
      top_songs: topSongs,
    },
  });
};

const followArtist = async (req, res) => {
  const artistId = parseInt(req.params.id, 10);
  if (isNaN(artistId)) {
    return res.status(400).json({ message: "Invalid artist ID" });
  }

  if (req.user.id === artistId) {
    return res.status(400).json({ message: "Cannot follow yourself" });
  }

  const artist = await Artist.findByPk(artistId);
  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  const existingFollow = await Follow.findOne({
    where: { user_id: req.user.id, artist_id: artistId },
  });

  if (existingFollow) {
    return res.status(409).json({ message: "Already following this artist" });
  }

  await Follow.create({
    user_id: req.user.id,
    artist_id: artistId,
  });

  return res.status(201).json({ message: "Followed artist successfully" });
};

const unfollowArtist = async (req, res) => {
  const artistId = parseInt(req.params.id, 10);
  if (isNaN(artistId)) {
    return res.status(400).json({ message: "Invalid artist ID" });
  }

  const artist = await Artist.findByPk(artistId);
  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  const deleted = await Follow.destroy({
    where: { user_id: req.user.id, artist_id: artistId },
  });

  if (!deleted) {
    return res.status(404).json({ message: "Not following this artist" });
  }

  return res.json({ message: "Unfollowed artist successfully" });
};

module.exports = {
  registerArtist,
  getArtistProfile,
  updateArtistProfile,
  getArtistSongs,
  getArtistAlbums,
  getArtistAnalytics,
  followArtist,
  unfollowArtist,
};
