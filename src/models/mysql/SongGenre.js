const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Song = require("./Song");

const Genre = sequelize.define(
  "Genre",
  {
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
  },
  { timestamps: false, tableName: "genres" },
);

// Many-to-Many Song <-> Genre
Genre.belongsToMany(Song, {
  through: "song_genres",
  foreignKey: "genre_id",
  otherKey: "song_id",
  as: "songs",
});
Song.belongsToMany(Genre, {
  through: "song_genres",
  foreignKey: "song_id",
  otherKey: "genre_id",
  as: "genres",
});

module.exports = Genre;
