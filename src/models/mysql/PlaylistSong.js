const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const User = require("./User");
const Song = require("./Song");

const Playlist = sequelize.define(
  "Playlist",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    cover_image_url: { type: DataTypes.STRING },
    is_public: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    timestamps: true,
    tableName: "playlists",
  },
);

Playlist.belongsTo(User, { foreignKey: "user_id", as: "owner" });
User.hasMany(Playlist, { foreignKey: "user_id", as: "playlists" });

// Many-to-Many Playlist <-> Song
Playlist.belongsToMany(Song, {
  through: "playlist_songs",
  foreignKey: "playlist_id",
  otherKey: "song_id",
  as: "songs",
});
Song.belongsToMany(Playlist, {
  through: "playlist_songs",
  foreignKey: "song_id",
  otherKey: "playlist_id",
  as: "playlists",
});

module.exports = Playlist;