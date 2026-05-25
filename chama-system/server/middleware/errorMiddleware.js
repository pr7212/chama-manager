const errorHandler = (err, req, res, next) => {
  // Avoid leaking stack traces in production.
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  } else {
    console.error(err);
  }

  res.status(500).json({
    message: 'Internal server error',
  });
};

module.exports = errorHandler;
