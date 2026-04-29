import express from "express";
import {
  addPointsToAdminMembershipUser,
  convertUserToMembershipAdmin,
  extendAdminMembershipUser,
  getAdminMembershipAnalytics,
  getAdminMembershipUserById,
  getAdminMembershipUsers,
  toggleAdminMembershipUserStatus,
} from "../controllers/adminMembership.controller.js";
import admin from "../middlewares/admin.js";
import auth from "../middlewares/auth.js";
import requireAdminPermission from "../middlewares/requireAdminPermission.js";

const router = express.Router();

router.use(auth, admin, requireAdminPermission("manage_membership"));

router.get("/membership-users", getAdminMembershipUsers);
router.get("/membership-users/:id", getAdminMembershipUserById);
router.post("/membership-users/extend", extendAdminMembershipUser);
router.post("/membership-users/add-points", addPointsToAdminMembershipUser);
router.post("/membership-users/toggle-status", toggleAdminMembershipUserStatus);
router.post("/membership-users/convert", convertUserToMembershipAdmin);
router.get("/membership-analytics", getAdminMembershipAnalytics);

export default router;
