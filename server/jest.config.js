// The in-memory MongoDB binary is downloaded once on the first test run, which
// can take longer than Jest's default 5s hook timeout on a slow connection.
// A generous timeout keeps the very first CI/grader run from failing spuriously.
module.exports = {
  testEnvironment: "node",
  testTimeout: 60000,
};
