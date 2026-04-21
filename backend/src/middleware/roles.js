exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

exports.requireEmployee = (req, res, next) => {
  if (req.user.table !== 'employees') {
    return res.status(403).json({ error: 'Employees only' });
  }
  next();
};

exports.requireClient = (req, res, next) => {
  if (req.user.table !== 'users') {
    return res.status(403).json({ error: 'Clients only' });
  }
  next();
};
