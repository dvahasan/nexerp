const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas and run seed on first connect.
 * @param {Function} seedFn - called once after a successful connection
 */
async function connectDB(seedFn) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("✅ MongoDB Atlas connected");
      try { if (seedFn) await seedFn(); }
      catch (e) { console.error("⚠️  Seed error (non-fatal):", e.message); }
    })
    .catch(e => console.error("❌ MongoDB error:", e.message));
}

module.exports = connectDB;
