const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas and run seed on first connect.
 * @param {Function} seedFn - called once after a successful connection
 */
async function connectDB(seedFn) {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error("❌ MONGODB_URI or MONGO_URL is not defined in environment variables! Refusing to start.");
    process.exit(1);
  }

  mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
    .then(async () => {
      console.log("✅ MongoDB connected");
      try { if (seedFn) await seedFn(); }
      catch (e) { console.error("⚠️  Seed error (non-fatal):", e.message); }
    })
    .catch(e => {
      // Exit so the platform's restart policy kicks in, instead of serving
      // 500s forever from a half-alive process.
      console.error("❌ MongoDB connection error:", e.message);
      process.exit(1);
    });
}

module.exports = connectDB;
