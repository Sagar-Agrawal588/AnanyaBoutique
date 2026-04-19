import {
  hasManagerPermission,
  isValidManagerPermission,
} from "../utils/adminPermissions.js";

const requireAdminPermission = (permission) => {
  const normalizedPermission = String(permission || "").trim();

  if (!isValidManagerPermission(normalizedPermission)) {
    throw new Error(`Invalid admin permission key: ${normalizedPermission}`);
  }

  return async (req, res, next) => {
    if (req.user?.role === "Admin") {
      return next();
    }

    if (req.user?.role !== "Manager") {
      return res.status(403).json({
        error: true,
        success: false,
        message: "Admin access required",
      });
    }

    if (!hasManagerPermission(req.user, normalizedPermission)) {
      return res.status(403).json({
        error: true,
        success: false,
        message: "You do not have permission to access this module",
      });
    }

    return next();
  };
};

export default requireAdminPermission;
