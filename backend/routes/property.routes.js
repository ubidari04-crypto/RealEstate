import express from "express";

import {
  addProperty,
  deleteProperty,
  getAllProperties,
  getMyProperties,
  getPropertyCounts,
  getPropertyDetails,
  getPropertyLocations,
  getSellerDashboard,
  updateProperty,
  updatePropertyStatus,
} from "../controllers/property.controller.js";

import {
  authorize,
  protect,
} from "../middlewares/auth.middleware.js";

import upload from "../middlewares/upload.middleware.js";

const propertyRouter = express.Router();

// Public routes
propertyRouter.get("/", getAllProperties);
propertyRouter.get("/locations", getPropertyLocations);
propertyRouter.get("/counts", getPropertyCounts);

// Seller routes
propertyRouter.get(
  "/my",
  protect,
  authorize("seller"),
  getMyProperties
);

propertyRouter.get(
  "/seller/dashboard",
  protect,
  authorize("seller"),
  getSellerDashboard
);

propertyRouter.post(
  "/",
  protect,
  authorize("seller"),
  upload.array("images", 10),
  addProperty
);

propertyRouter.put(
  "/:id",
  protect,
  authorize("seller"),
  upload.array("images", 10),
  updateProperty
);

propertyRouter.delete(
  "/:id",
  protect,
  authorize("seller"),
  deleteProperty
);

propertyRouter.patch(
  "/:id/status",
  protect,
  authorize("seller"),
  updatePropertyStatus
);

// Keep this after fixed routes
propertyRouter.get("/:id", getPropertyDetails);

export default propertyRouter;