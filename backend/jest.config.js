module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  // mongodb-memory-server downloads a mongod binary on first run, and a cold
  // mongod boot can take >60s under antivirus scanning; be generous
  testTimeout: 240000,
  // One DB per worker keeps things simple and deterministic
  maxWorkers: 1,
};
