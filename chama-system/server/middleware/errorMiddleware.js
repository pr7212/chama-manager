const errorHandler = (err, req, res, next) => {
  // Log error (safe for dev + prod)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error Stack:', err.stack);
  } else {
    console.error('Error:', err.message);
  }

  // Default status code (important improvement)
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
