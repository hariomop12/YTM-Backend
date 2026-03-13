const mongoose = require("mongoose");

const artistAnalyticsSchema = new mongoose.Schema(
  {
    artist_id: { type: Number, required: true }, // MySQL Artist ID
    song_id: { type: Number, required: true }, // MySQL Song ID
    plays_by_date: [{ date: Date, count: Number }],
    countries: [{ country_code: String, count: Number }],
    devices: [{ device: String, count: Number }],
  },
  { collection: "artist_analytics" },
);

module.exports = mongoose.model("ArtistAnalytics", artistAnalyticsSchema);
