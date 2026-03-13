const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const User = require("./User");
const Artist = require("./Artist");

const Follow = sequelize.define(
  "Follow",
  {},
  { timestamps: true, tableName: "follows" },
);

User.belongsToMany(Artist, {
  through: Follow,
  foreignKey: "user_id",
  otherKey: "artist_id",
  as: "following",
});
Artist.belongsToMany(User, {
  through: Follow,
  foreignKey: "artist_id",
  otherKey: "user_id",
  as: "followers",
});

module.exports = Follow;
