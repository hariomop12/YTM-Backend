const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recommended_songs: [{ type: Number }], // MySQL Song IDs
    algorithm: {
      type: String,
      enum: ["sad", "love", "DHH"],
      default: "DHH",
    },
    generated_at: { type: Date, default: Date.now },
    ttl: { type: Number, default: 86400 }, // seconds, 24h by default
  },
  { collection: "recommendations" },
);

module.exports = mongoose.model("Recommendation", recommendationSchema);
