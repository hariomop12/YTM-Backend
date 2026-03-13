const mongoose = require("mongoose");

const searchLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    query: { type: String, required: true },
    filters: { type: Object, default: {} },
    results_count: { type: Number, default: 0 },
    clicked_song_id: { type: Number }, // optional MySQL Song ID
    timestamp: { type: Date, default: Date.now },
  },
  { collection: "search_logs" },
);

module.exports = mongoose.model("SearchLog", searchLogSchema);