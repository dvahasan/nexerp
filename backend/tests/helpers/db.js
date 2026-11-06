const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let replSet = null;

// The transaction engine uses sessions, which need a replica set.
// launchTimeout is generous because a cold mongod boot can take >60s on
// Windows machines with active antivirus scanning.
async function connect() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: 180000 }],
  });
  await mongoose.connect(replSet.getUri());

  // Warm-up: right after a replica set boots, the primary may not accept
  // transactions yet, which would 500 the first test. Retry a no-op
  // transaction until the topology is actually ready.
  const deadline = Date.now() + 60000;
  for (;;) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await mongoose.connection.db
        .collection("__warmup")
        .insertOne({ ok: 1 }, { session });
      await session.commitTransaction();
      break;
    } catch (e) {
      await session.abortTransaction().catch(() => {});
      if (Date.now() > deadline) throw e;
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      session.endSession();
    }
  }
  await mongoose.connection.db.collection("__warmup").deleteMany({});
}

async function clear() {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
}

async function disconnect() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

module.exports = { connect, clear, disconnect };
