const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const User = require("./User");
const Song = require("./Song");

const LikedSong = sequelize.define(
  "LikedSong",
  {},
  { timestamps: true, tableName: "liked_songs" },
);

User.belongsToMany(Song, {
  through: LikedSong,
  foreignKey: "user_id",
  otherKey: "song_id",
  as: "likedSongs",
});
Song.belongsToMany(User, {
  through: LikedSong,
  foreignKey: "song_id",
  otherKey: "user_id",
  as: "likedBy",
});

module.exports = LikedSong;
