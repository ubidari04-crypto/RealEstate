
import express from "express";

import {
  initiateBooking,
  verifyBookingPayment,
  initiateRemainingPayment,
  verifyRemainingPayment,
  getMyBookedProperties,
  getMyBookings,
} from "../controllers/booking.controller.js";

import {
  protect,
  authorize,
} from "../middlewares/auth.middleware.js";

const bookingRouter = express.Router();

// ==========================================
// AUTHENTICATION AND AUTHORIZATION
// ==========================================

bookingRouter.use(protect);
bookingRouter.use(authorize("buyer"));

// ==========================================
// BUYER BOOKED PROPERTIES
// ==========================================

// Get all properties booked by logged-in buyer
bookingRouter.get(
  "/my-booked-properties",
  getMyBookedProperties
);

// ==========================================
// BUYER BOOKING DETAILS
// ==========================================

// Get booking records with booking IDs and property details
bookingRouter.get(
  "/my-bookings",
  getMyBookings
);

// ==========================================
// 25% ADVANCE PAYMENT ROUTES
// ==========================================

bookingRouter.post(
  "/initiate/:propertyId",
  initiateBooking
);

bookingRouter.post(
  "/verify",
  verifyBookingPayment
);

// ==========================================
// REMAINING 75% PAYMENT ROUTES
// ==========================================

bookingRouter.post(
  "/remaining/initiate/:bookingId",
  initiateRemainingPayment
);

bookingRouter.post(
  "/remaining/verify",
  verifyRemainingPayment
);

export default bookingRouter;
