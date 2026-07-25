// Wraps an async route handler so that any rejected promise is forwarded to
// Express's error-handling middleware instead of becoming an unhandled rejection.
// Without this, a thrown error inside an async controller would crash the process
// rather than returning a clean 500.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
