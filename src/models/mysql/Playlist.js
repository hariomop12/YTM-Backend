const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Artist = require("./Artist");
const Album = require("./Album");

const Song = sequelize.define(
  "Song",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    duration_seconds: { type: DataTypes.INTEGER, allowNull: false },
    audio_r2_key: { type: DataTypes.STRING, allowNull: false },
    thumbnail_r2_key: { type: DataTypes.STRING },
    play_count: { type: DataTypes.BIGINT, defaultValue: 0 },
    is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
    release_date: { type: DataTypes.DATE },
  },
  {
    timestamps: true,
    tableName: "songs",
  },
);

Song.belongsTo(Artist, { foreignKey: "artist_id", as: "artist" });
Artist.hasMany(Song, { foreignKey: "artist_id", as: "songs" });

Song.belongsTo(Album, { foreignKey: "album_id", as: "album" });
Album.hasMany(Song, { foreignKey: "album_id", as: "songs" });

module.exports = Song;
