const mongoose = require("mongoose");

const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined");
  }

  mongoose.set("strictQuery", true);

  return mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
};

module.exports = connectMongo;
