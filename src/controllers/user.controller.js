const bcrypt = require("bcrypt");
const Joi = require("joi");
const sequelize = require("../config/db");
const User = require("../models/mysql/User");
const Artist = require("../models/mysql/Artist");
const LikedSong = require("../models/mysql/LikedSong");
const Song = require("../models/mysql/Song");
const ListeningHistory = require("../models/mongo/ListeningHistory");

const updateMeSchema = Joi.object({
  display_name: Joi.string().min(3).max(100),
  avatar_url: Joi.string().uri().allow(null, ""),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const sanitizeUser = (user, includePrivate = false) => {
  const publicFields = {
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    role: user.role,
    is_verified: user.is_verified,
  };

  if (includePrivate) {
    return {
      ...publicFields,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  return publicFields;
};

const getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ["id", "email", "display_name", "avatar_url", "role", "is_verified", "created_at", "updated_at"],
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  let artistProfile = null;
  if (user.role === "artist") {
    artistProfile = await Artist.findOne({
      where: { user_id: user.id },
      attributes: ["id", "stage_name", "bio", "profile_image_url", "banner_url", "monthly_listeners", "is_verified"],
    });
  }

  return res.json({
    ...sanitizeUser(user, true),
    artist_profile: artistProfile,
  });
};

const updateMe = async (req, res) => {
  const { error, value } = updateMeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const allowedFields = ["display_name", "avatar_url"];
  const updateData = {};
  for (const key of allowedFields) {
    if (value[key] !== undefined) {
      updateData[key] = value[key];
    }
  }

  await req.user.update(updateData, { fields: Object.keys(updateData) });

  return res.json({
    message: "Profile updated successfully",
    user: sanitizeUser(req.user, true),
  });
};

const changePassword = async (req, res) => {
  const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const passwordsMatch = await bcrypt.compare(value.currentPassword, req.user.password_hash);
  if (!passwordsMatch) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const password_hash = await bcrypt.hash(value.newPassword, 12);
  await req.user.update({ password_hash }, { fields: ["password_hash"] });

  return res.json({ message: "Password changed successfully" });
};

const deleteMe = async (req, res) => {
  await req.user.update({ refresh_token: null }, { fields: ["refresh_token"] });
  await req.user.destroy();

  return res.json({ message: "Account deleted successfully" });
};

const getLikedSongs = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const { page, limit } = value;
  const offset = (page - 1) * limit;

  const { count, rows } = await LikedSong.findAndCountAll({
    where: { user_id: req.user.id },
    include: [
      {
        model: Song,
        as: "Song",
        include: [
          { model: Artist, as: "artist", attributes: ["id", "stage_name", "profile_image_url", "is_verified"] },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  const songs = rows.map((liked) => ({
    liked_at: liked.created_at,
    song: liked.Song
      ? {
          id: liked.Song.id,
          title: liked.Song.title,
          duration_seconds: liked.Song.duration_seconds,
          thumbnail_url: liked.Song.thumbnail_r2_key,
          play_count: liked.Song.play_count,
          release_date: liked.Song.release_date,
          artist: liked.Song.Artist
            ? {
                id: liked.Song.Artist.id,
                stage_name: liked.Song.Artist.stage_name,
                profile_image_url: liked.Song.Artist.profile_image_url,
                is_verified: liked.Song.Artist.is_verified,
              }
            : null,
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

const getHistory = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const { page, limit } = value;
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    ListeningHistory.find({ user_id: req.user.id })
      .sort({ played_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate("song_id", "title duration_seconds thumbnail_r2_key")
      .populate("artist_id", "stage_name profile_image_url")
      .lean(),
    ListeningHistory.countDocuments({ user_id: req.user.id }),
  ]);

  const items = history.map((h) => ({
    id: h._id,
    played_at: h.played_at,
    duration_played: h.duration_played,
    source: h.source,
    device: h.device,
    song: h.song_id
      ? {
          id: h.song_id._id || h.song_id,
          title: h.song_id.title,
          duration_seconds: h.song_id.duration_seconds,
          thumbnail_url: h.song_id.thumbnail_r2_key,
        }
      : null,
    artist: h.artist_id
      ? {
          id: h.artist_id._id || h.artist_id,
          stage_name: h.artist_id.stage_name,
          profile_image_url: h.artist_id.profile_image_url,
        }
      : null,
  }));

  return res.json({
    history: items,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  });
};

const getFollowing = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join("; ") });
  }

  const { page, limit } = value;
  const offset = (page - 1) * limit;

  const { count, rows } = await Artist.findAndCountAll({
    include: [
      {
        model: User,
        as: "User",
        where: { id: req.user.id },
        through: { attributes: ["created_at"], as: "Follow" },
        attributes: [],
        required: true,
      },
    ],
    limit,
    offset,
  });

  const artists = rows.map((artist) => {
    const followEntry = artist.User?.[0]?.Follow;
    return {
      id: artist.id,
      stage_name: artist.stage_name,
      bio: artist.bio,
      profile_image_url: artist.profile_image_url,
      banner_url: artist.banner_url,
      monthly_listeners: artist.monthly_listeners,
      is_verified: artist.is_verified,
      followed_at: followEntry?.created_at || null,
    };
  });

  return res.json({
    artists,
    pagination: {
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  });
};

const getPublicProfile = async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "display_name", "avatar_url", "role", "is_verified", "created_at"],
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  let artistProfile = null;
  if (user.role === "artist") {
    artistProfile = await Artist.findOne({
      where: { user_id: user.id },
      attributes: ["id", "stage_name", "bio", "profile_image_url", "banner_url", "monthly_listeners", "is_verified"],
    });
  }

  const likedSongsCount = await LikedSong.count({ where: { user_id: user.id } });

  return res.json({
    user: sanitizeUser(user),
    artist_profile: artistProfile,
    stats: {
      liked_songs: likedSongsCount,
    },
  });
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
  getLikedSongs,
  getHistory,
  getFollowing,
  getPublicProfile,
};
