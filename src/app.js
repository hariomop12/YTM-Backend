require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");

const sequelize = require("./config/db");
const connectMongo = require("./config/mongo");
const redis = require("./config/redis");
const globalErrorHandler = require("./middlewares/errorHandler");
const { HeadBucketCommand } = require("@aws-sdk/client-s3");
const { r2Client, bucketName, isConfigured: isR2Configured } = require("./config/r2");
const userRoutes = require("./routes/user.routes");
const artistRoutes = require("./routes/artist.routes");

 
const app = express();
const PORT = process.env.PORT || 8080;

// ─── Middlewares ───────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────── 
app.use("/api", userRoutes);
app.use("/api", artistRoutes);

// ─── Root ─────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "🎵 SoundWave API is Running",
    version: "1.0.0",
    docs: "/api-docs",
  });
});

// ─── Health Check ─────────────────────────────────────────
app.get("/health", async (req, res) => {
  const health = {
    status: "✅ ok",
    uptime: `⏱️ ${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    services: {
      mysql: "🔴 unreachable",
      mongodb: "🔴 unreachable",
      redis: "🔴 unreachable",
      r2: "🔴 unreachable",
    },
  };

  // MySQL
  try {
    await sequelize.authenticate();
    health.services.mysql = "🟢 connected";
  } catch (err) {
    health.services.mysql = `🔴 error: ${err.message}`;
    health.status = "⚠️ degraded";
  }

  // MongoDB
  try {
    const mongoose = require("mongoose");
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const stateMap = {
      0: "🔴 disconnected",
      1: "🟢 connected",
      2: "🟡 connecting",
      3: "🟠 disconnecting",
    };
    health.services.mongodb = stateMap[state] || "❓ unknown";
    if (state !== 1) health.status = "⚠️ degraded";
  } catch (err) {
    health.services.mongodb = `🔴 error: ${err.message}`;
    health.status = "⚠️ degraded";
  }

  // Redis
  try {
    await redis.ping();
    health.services.redis = "🟢 connected";
  } catch (err) {
    health.services.redis = `🔴 error: ${err.message}`;
    health.status = "⚠️ degraded";
  }

  // R2 Connection
  if (!isR2Configured || !r2Client || !bucketName) {
    health.services.r2 = "⚙️ not configured";
  } else {
    try {
      await r2Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      health.services.r2 = "🟢 connected";
    } catch (err) {
      health.services.r2 = `🔴 error: ${err.message}`;
      health.status = "⚠️ degraded";
    }
  }

  const statusCode = health.status === "✅ ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────
app.use(globalErrorHandler);

const start = async () => {
  try {
    // MySQL connect + sync (use migrations in prod, sync only in dev)
    await sequelize.authenticate();
    console.log("✅ MySQL connected");

    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ MySQL models synced");
    }

    // MongoDB connect
    await connectMongo();
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 SoundWave API running at http://localhost:${PORT}`);
      console.log(`📄 Health check → http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

start();

module.exports = { app, start };
