const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Safety check: req.user might not exist if auth middleware is skipped
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: 'Unauthorized. User not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
