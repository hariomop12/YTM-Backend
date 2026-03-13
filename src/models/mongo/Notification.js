const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "song_release", "playlist_update", "system"],
      default: "info",
    },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    related_entity: { type: Object }, // can store { song_id, playlist_id, artist_id }
    created_at: { type: Date, default: Date.now },
  },
  { collection: "notifications" },
);

module.exports = mongoose.model("Notification", notificationSchema);
