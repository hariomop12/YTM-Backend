const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const User = require("./User");

const Artist = sequelize.define(
  "Artist",
  {
    stage_name: { type: DataTypes.STRING, allowNull: false },
    bio: { type: DataTypes.TEXT },
    profile_image_url: { type: DataTypes.STRING },
    banner_url: { type: DataTypes.STRING },
    monthly_listeners: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    timestamps: true,
    tableName: "artists",
  },
);

Artist.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasOne(Artist, { foreignKey: "user_id", as: "artistProfile" });

module.exports = Artist;
