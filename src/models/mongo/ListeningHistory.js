const mongoose = require("mongoose");

const listeningHistorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    song_id: { type: Number, required: true }, // MySQL Song ID
    artist_id: { type: Number, required: true }, // MySQL Artist ID
    played_at: { type: Date, default: Date.now },
    duration_played: { type: Number, default: 0 }, // in seconds
    source: {
      type: String,
      enum: ["playlist", "search", "recommendation"],
      default: "playlist",
    },
    device: {
      type: String,
      enum: ["web", "mobile", "desktop"],
      default: "web",
    },
  },
  { collection: "listening_history" },
);

module.exports = mongoose.model("ListeningHistory", listeningHistorySchema);
