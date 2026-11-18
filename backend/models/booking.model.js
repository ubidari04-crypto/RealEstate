
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Original property price in NPR
    totalPrice: {
      type: Number,
      required: true,
      min: 1,
    },

    // Actual 25% advance in NPR
    advanceAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Remaining 75% in NPR
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Actual advance amount
    actualAdvanceAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Converted amount used only in sandbox mode
    sandboxPaymentAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    // Payment environment
    paymentMode: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },

    // Booking status
    bookingStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "test_completed",
        "cancelled",
        "failed",
      ],
      default: "pending",
    },

    // 25% advance payment status
    paymentStatus: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "completed",
        "failed",
        "refunded",
      ],
      default: "initiated",
    },

    paymentMethod: {
      type: String,
      default: "Khalti",
    },

    // Khalti ID for the 25% advance payment
    pidx: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Transaction ID for the 25% advance payment
    transactionId: {
      type: String,
      default: null,
    },

    // Advance amount sent to Khalti, in paisa
    paymentAmountPaisa: {
      type: Number,
      required: true,
    },

    paymentExpiresAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // REMAINING 75% PAYMENT
    // ==========================================

    remainingPaymentStatus: {
      type: String,
      enum: [
        "not_started",
        "initiated",
        "pending",
        "completed",
        "failed",
        "refunded",
      ],
      default: "not_started",
    },

    // Separate Khalti ID for the remaining payment
    remainingPaymentPidx: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },

    // Transaction ID for the remaining payment
    remainingTransactionId: {
      type: String,
      default: null,
    },

    // Remaining payment amount sent to Khalti, in paisa
    remainingPaymentAmountPaisa: {
      type: Number,
      default: null,
      min: 0,
    },

    remainingPaymentExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// DATABASE INDEXES
// ==========================================

// Only one confirmed or completed booking per property
bookingSchema.index(
  { property: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingStatus: {
        $in: ["confirmed", "completed"],
      },
    },
    name: "one_active_booking_per_property",
  }
);

// General property and booking status lookup
bookingSchema.index({
  property: 1,
  bookingStatus: 1,
});

// Buyer booking history
bookingSchema.index({
  buyer: 1,
  createdAt: -1,
});

// Seller booking history
bookingSchema.index({
  seller: 1,
  createdAt: -1,
});

// ==========================================
// EXPORT MODEL
// ==========================================

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;
