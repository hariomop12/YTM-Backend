// models/Album.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Artist = require("./Artist");

const Album = sequelize.define(
  "Album",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    cover_r2_key: { type: DataTypes.STRING },
    release_date: { type: DataTypes.DATE },
    artist_id: { type: DataTypes.INTEGER, allowNull: true },
    type: {
      type: DataTypes.ENUM("album", "EP", "single"),
      defaultValue: "album",
    },
  },
  {
    timestamps: true,
    tableName: "albums",
  },
);

Album.belongsTo(Artist, { foreignKey: "artist_id", as: "artist", onDelete: "CASCADE" });
Artist.hasMany(Album, { foreignKey: "artist_id", as: "albums" });

module.exports = Album;
