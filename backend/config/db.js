const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas and run seed on first connect.
 * @param {Function} seedFn - called once after a successful connection
 */
async function connectDB(seedFn) {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error("❌ MONGODB_URI or MONGO_URL is not defined in environment variables! Please set it in Railway.");
    return;
  }
  
  mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
    .then(async () => {
      console.log("✅ MongoDB Atlas connected");
      try { if (seedFn) await seedFn(); }
      catch (e) { console.error("⚠️  Seed error (non-fatal):", e.message); }
    })
    .catch(e => console.error("❌ MongoDB connection error:", e.message));
}

module.exports = connectDB;
