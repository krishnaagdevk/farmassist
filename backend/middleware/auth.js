const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "no_token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "invalid_token" });

    req.user = decoded; // { sub: user._id, role: "farmer/buyer/admin/fpo/driver" }
    next();
  });
}

function optionalToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.user = decoded;
    }
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    verifyToken(req, res, () => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "forbidden_role" });
      }
      next();
    });
  };
}

const requireFarmerAuth = requireRole("farmer", "fpo");
const requireAdminAuth = requireRole("admin");
const requireOfficerAuth = requireRole("officer");
const requireAdminOrOfficerAuth = requireRole("admin", "officer");
const requireDriverAuth = requireRole("driver");
const requireBuyerAuth = requireRole("buyer");

module.exports = {
  verifyToken,
  optionalToken,
  requireRole,
  requireFarmerAuth,
  requireAdminAuth,
  requireOfficerAuth,
  requireAdminOrOfficerAuth,
  requireDriverAuth,
  requireBuyerAuth,
};
