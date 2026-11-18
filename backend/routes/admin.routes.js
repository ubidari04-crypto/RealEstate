
import express from "express";

import {
  authorize,
  protect,
} from "../middlewares/auth.middleware.js";

import {
  approveSeller,
  blockUser,
  deleteProperty,
  deleteUser,
  getAllInquiries,
  getAllProperties,
  getAllUsers,
  getDashboardStats,
  getPendingSellers,

  // Property verification functions
  getPendingProperties,
  approveProperty,
  rejectProperty,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// Protect all admin routes
adminRouter.use(protect, authorize("admin"));

// ==========================================
// USER MANAGEMENT
// ==========================================

adminRouter.get("/users", getAllUsers);

adminRouter.patch("/users/:id/block", blockUser);

adminRouter.delete("/users/:id", deleteUser);

// ==========================================
// PROPERTY MANAGEMENT
// ==========================================

adminRouter.get("/properties", getAllProperties);

// Property verification
adminRouter.get(
  "/properties/pending",
  getPendingProperties
);

adminRouter.put(
  "/properties/:id/approve",
  approveProperty
);

adminRouter.put(
  "/properties/:id/reject",
  rejectProperty
);

// Delete property
adminRouter.delete(
  "/properties/:id",
  deleteProperty
);

// ==========================================
// INQUIRY MANAGEMENT
// ==========================================

adminRouter.get("/inquiries", getAllInquiries);

// ==========================================
// DASHBOARD
// ==========================================

adminRouter.get("/stats", getDashboardStats);

// ==========================================
// SELLER MANAGEMENT
// ==========================================

adminRouter.get("/pending-sellers", getPendingSellers);

adminRouter.patch(
  "/approve-seller/:id",
  approveSeller
);

export default adminRouter;
