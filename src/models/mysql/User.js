const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const User = sequelize.define(
  "User",
  {
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    display_name: { type: DataTypes.STRING, allowNull: false },
    avatar_url: { type: DataTypes.STRING },
    role: {
      type: DataTypes.ENUM("listener", "artist", "admin"),
      defaultValue: "listener",
    },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    refresh_token: { type: DataTypes.TEXT },
  },
  {
    timestamps: true,
    tableName: "users",
  },
);

module.exports = User;
