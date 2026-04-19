const adminOnly = async (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({
      error: true,
      success: false,
      message: "Only Admin can perform this action",
    });
  }

  return next();
};

export default adminOnly;
