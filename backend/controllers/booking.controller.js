
import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Property from "../models/property.model.js";

// ==========================================
// KHALTI CONFIGURATION
// ==========================================

const KHALTI_BASE_URL =
  process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

const PAYMENT_MODE = process.env.PAYMENT_MODE || "sandbox";

const SANDBOX_CONVERSION_RATE = Number(
  process.env.SANDBOX_CONVERSION_RATE || 10000
);

const getKhaltiHeaders = () => ({
  Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
  "Content-Type": "application/json",
});

// ==========================================
// CONFIGURATION VALIDATION
// ==========================================

const isValidPaymentMode = () =>
  ["sandbox", "production"].includes(PAYMENT_MODE);

const isValidConversionRate = () =>
  Number.isFinite(SANDBOX_CONVERSION_RATE) &&
  SANDBOX_CONVERSION_RATE > 0;

// ==========================================
// PAYMENT AMOUNT CALCULATION
// ==========================================

const getPaymentAmount = (actualAmount, paymentMode) => {
  if (paymentMode === "sandbox") {
    const convertedAmount =
      Math.round(
        (actualAmount / SANDBOX_CONVERSION_RATE) * 100
      ) / 100;

    return {
      paymentAmount: convertedAmount,
      sandboxPaymentAmount: convertedAmount,
      paymentMode: "sandbox",
    };
  }

  return {
    paymentAmount: actualAmount,
    sandboxPaymentAmount: null,
    paymentMode: "production",
  };
};

// ==========================================
// KHALTI RESPONSE HELPER
// ==========================================

const readKhaltiResponse = async (response) => {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("Invalid response received from Khalti");
  }
};

// ==========================================
// ID COMPARISON HELPER
// ==========================================

const sameId = (first, second) =>
  first != null &&
  second != null &&
  first.toString() === second.toString();

// ==========================================
// PROPERTY RESERVATION HELPER
// ==========================================

const reserveProperty = async (booking) => {
  const reservedProperty = await Property.findOneAndUpdate(
    {
      _id: booking.property,
      status: "sale",
    },
    {
      $set: {
        status: "booked",
        bookedBy: booking.buyer,
        bookedBooking: booking._id,
      },
    },
    {
      new: true,
    }
  );

  if (reservedProperty) {
    return reservedProperty;
  }

  const currentProperty = await Property.findById(
    booking.property
  );

  if (
    currentProperty &&
    currentProperty.status === "booked" &&
    sameId(currentProperty.bookedBy, booking.buyer) &&
    sameId(currentProperty.bookedBooking, booking._id)
  ) {
    return currentProperty;
  }

  return null;
};

// ==========================================
// PROPERTY SOLD HELPER
// ==========================================

const markPropertyAsSold = async (booking) => {
  const soldProperty = await Property.findOneAndUpdate(
    {
      _id: booking.property,
      status: "booked",
      bookedBy: booking.buyer,
      bookedBooking: booking._id,
    },
    {
      $set: {
        status: "sold",
      },
    },
    {
      new: true,
    }
  );

  if (soldProperty) {
    return soldProperty;
  }

  const currentProperty = await Property.findById(
    booking.property
  );

  if (
    currentProperty &&
    currentProperty.status === "sold" &&
    sameId(currentProperty.bookedBy, booking.buyer) &&
    sameId(currentProperty.bookedBooking, booking._id)
  ) {
    return currentProperty;
  }

  return null;
};

// ==========================================
// 1. INITIATE PROPERTY BOOKING AND 25% PAYMENT
// ==========================================

export const initiateBooking = async (req, res) => {
  let booking;

  try {
    const { propertyId } = req.params;

    if (!isValidPaymentMode()) {
      return res.status(500).json({
        success: false,
        message: "Invalid PAYMENT_MODE configuration",
      });
    }

    if (
      PAYMENT_MODE === "sandbox" &&
      !isValidConversionRate()
    ) {
      return res.status(500).json({
        success: false,
        message: "Invalid sandbox conversion rate",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID",
      });
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Khalti secret key is not configured",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is not configured",
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.status !== "sale") {
      return res.status(400).json({
        success: false,
        message:
          property.status === "booked"
            ? "This property has already been booked"
            : "This property is no longer available",
      });
    }

    if (sameId(property.seller, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot book your own property",
      });
    }

    const existingConfirmedBooking = await Booking.findOne({
      property: propertyId,
      bookingStatus: {
        $in: ["confirmed", "completed"],
      },
    });

    if (existingConfirmedBooking) {
      return res.status(409).json({
        success: false,
        message: "This property has already been booked",
      });
    }

    const existingPendingBooking = await Booking.findOne({
      property: propertyId,
      buyer: req.user._id,
      bookingStatus: "pending",
      paymentStatus: {
        $in: ["initiated", "pending"],
      },
      paymentExpiresAt: {
        $gt: new Date(),
      },
    });

    if (existingPendingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending booking for this property",
        bookingId: existingPendingBooking._id,
      });
    }

    // Calculate property amounts
    const totalPrice = Number(property.price);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property price",
      });
    }

    const advanceAmount = Math.round(totalPrice * 0.25);
    const remainingAmount = totalPrice - advanceAmount;

    // Calculate Khalti amount
    const {
      paymentAmount,
      sandboxPaymentAmount,
      paymentMode,
    } = getPaymentAmount(advanceAmount, PAYMENT_MODE);

    if (
      paymentMode === "sandbox" &&
      (paymentAmount < 10 || paymentAmount > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Converted sandbox payment must be between NPR 10 and NPR 1000",
        actualAdvanceAmount: advanceAmount,
        convertedSandboxAmount: paymentAmount,
        conversionRate: SANDBOX_CONVERSION_RATE,
      });
    }

    if (
      paymentMode === "production" &&
      paymentAmount < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Khalti payment must be at least NPR 10",
      });
    }

    const amountInPaisa = Math.round(paymentAmount * 100);

    // Create pending booking
    booking = await Booking.create({
      property: property._id,
      buyer: req.user._id,
      seller: property.seller,

      totalPrice,
      advanceAmount,
      actualAdvanceAmount: advanceAmount,
      remainingAmount,

      sandboxPaymentAmount,
      paymentMode,

      paymentAmountPaisa: amountInPaisa,

      bookingStatus: "pending",
      paymentStatus: "initiated",
      remainingPaymentStatus: "not_started",
    });

    // Initiate Khalti advance payment
    const khaltiResponse = await fetch(
      `${KHALTI_BASE_URL}/epayment/initiate/`,
      {
        method: "POST",
        headers: getKhaltiHeaders(),
        body: JSON.stringify({
          return_url:
            `${frontendUrl}/payment/verify?paymentType=advance`,

          website_url: frontendUrl,

          amount: amountInPaisa,

          purchase_order_id: booking._id.toString(),
          purchase_order_name: property.title,

          customer_info: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || "",
          },
        }),
      }
    );

    const khaltiData = await readKhaltiResponse(
      khaltiResponse
    );

    if (!khaltiResponse.ok) {
      console.error("Khalti initiation error:", khaltiData);

      booking.paymentStatus = "failed";
      booking.bookingStatus = "failed";

      await booking.save();

      return res.status(400).json({
        success: false,
        message:
          khaltiData.detail ||
          "Unable to initiate Khalti payment",
      });
    }

    if (!khaltiData.pidx || !khaltiData.payment_url) {
      throw new Error("Invalid response received from Khalti");
    }

    booking.pidx = khaltiData.pidx;

    booking.paymentExpiresAt = khaltiData.expires_at
      ? new Date(khaltiData.expires_at)
      : null;

    booking.paymentStatus = "pending";

    await booking.save();

    console.log("Booking initiated successfully:", booking._id);
    console.log("Advance payment pidx:", booking.pidx);

    return res.status(200).json({
      success: true,
      message: "Booking initiated successfully",

      bookingId: booking._id,

      paymentUrl: khaltiData.payment_url,
      pidx: khaltiData.pidx,

      paymentMode,

      totalPrice,
      advanceAmount,
      actualAdvanceAmount: advanceAmount,
      remainingAmount,

      paymentAmount,
      paymentAmountPaisa: amountInPaisa,

      sandboxPaymentAmount,

      conversionRate:
        paymentMode === "sandbox"
          ? SANDBOX_CONVERSION_RATE
          : null,
    });
  } catch (error) {
    console.error("Initiate booking error:", error);

    if (booking) {
      booking.paymentStatus = "failed";
      booking.bookingStatus = "failed";

      await booking.save().catch((saveError) => {
        console.error("Booking update error:", saveError);
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to initiate booking",
    });
  }
};

// ==========================================
// 2. VERIFY 25% ADVANCE PAYMENT
// ==========================================

export const verifyBookingPayment = async (req, res) => {
  try {
    const pidx = req.body?.pidx || req.query?.pidx;

    console.log("========== ADVANCE PAYMENT VERIFICATION ==========");
    console.log("Received pidx:", pidx);
    console.log("Authenticated buyer:", req.user?._id);

    if (!pidx) {
      return res.status(400).json({
        success: false,
        message: "Payment ID (pidx) is missing",
      });
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Khalti secret key is not configured",
      });
    }

    const booking = await Booking.findOne({
      pidx,
      buyer: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this payment",
      });
    }

    if (
      booking.paymentStatus === "completed" &&
      ["confirmed", "completed"].includes(
        booking.bookingStatus
      )
    ) {
      const property = await Property.findOne({
        _id: booking.property,
        bookedBy: booking.buyer,
        bookedBooking: booking._id,
        status: {
          $in: ["booked", "sold"],
        },
      });

      if (!property) {
        return res.status(409).json({
          success: false,
          message:
            "Booking is already paid, but its property reservation does not match. Please contact support.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Advance payment already verified",
        booking,
        propertyStatus: property.status,
        testOnly: booking.paymentMode === "sandbox",
      });
    }

    const khaltiResponse = await fetch(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      {
        method: "POST",
        headers: getKhaltiHeaders(),
        body: JSON.stringify({
          pidx: booking.pidx,
        }),
      }
    );

    const khaltiData = await readKhaltiResponse(
      khaltiResponse
    );

    if (!khaltiResponse.ok) {
      return res.status(400).json({
        success: false,
        message:
          khaltiData.detail ||
          "Unable to verify payment with Khalti",
      });
    }

    if (khaltiData.pidx !== booking.pidx) {
      return res.status(400).json({
        success: false,
        message: "Payment ID verification failed",
      });
    }

    if (
      Number(khaltiData.total_amount) !==
      Number(booking.paymentAmountPaisa)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match the booking",
      });
    }

    if (khaltiData.status !== "Completed") {
      if (
        ["Expired", "User canceled", "Canceled", "Failed"].includes(
          khaltiData.status
        )
      ) {
        booking.paymentStatus = "failed";
        booking.bookingStatus = "failed";

        await booking.save();

        return res.status(400).json({
          success: false,
          message: "Advance payment was not completed",
          paymentStatus: khaltiData.status,
        });
      }

      return res.status(200).json({
        success: false,
        message: "Advance payment is not completed yet",
        paymentStatus: khaltiData.status,
      });
    }

    // Reserve property for exact booking
    const reservedProperty = await reserveProperty(booking);

    if (!reservedProperty) {
      console.error(
        "Advance payment completed but property reservation failed:",
        booking.property,
        booking._id
      );

      return res.status(409).json({
        success: false,
        paymentCompleted: true,
        message:
          "Your payment was received, but this property has already been reserved by another booking. Please contact support for payment reconciliation.",
      });
    }

    booking.paymentStatus = "completed";
    booking.bookingStatus = "confirmed";

    booking.transactionId =
      khaltiData.transaction_id || null;

    await booking.save();

    console.log("Property successfully booked:", booking.property);
    console.log("Associated booking:", booking._id);

    return res.status(200).json({
      success: true,
      message:
        "Advance payment verified successfully. Property is now booked.",

      testOnly: booking.paymentMode === "sandbox",

      booking: {
        _id: booking._id,
        property: booking.property,

        totalPrice: booking.totalPrice,
        advanceAmount: booking.advanceAmount,
        remainingAmount: booking.remainingAmount,

        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        paymentMode: booking.paymentMode,

        transactionId: booking.transactionId,
      },

      propertyStatus: "booked",
    });
  } catch (error) {
    console.error("========== ADVANCE VERIFICATION ERROR ==========");
    console.error(error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Another confirmed booking exists for this property. Contact support for payment reconciliation.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify booking payment",
    });
  }
};

// ==========================================
// 3. INITIATE REMAINING 75% PAYMENT
// ==========================================

export const initiateRemainingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (!isValidPaymentMode()) {
      return res.status(500).json({
        success: false,
        message: "Invalid PAYMENT_MODE configuration",
      });
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Khalti secret key is not configured",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is not configured",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      buyer: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.bookingStatus !== "confirmed" ||
      booking.paymentStatus !== "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your 25% advance payment must be completed before paying the remaining amount",
      });
    }

    if (booking.remainingPaymentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Remaining payment has already been completed",
      });
    }

    if (
      booking.paymentMode === "sandbox" &&
      !isValidConversionRate()
    ) {
      return res.status(500).json({
        success: false,
        message: "Invalid sandbox conversion rate",
      });
    }

    // Check exact property reservation
    const property = await Property.findOne({
      _id: booking.property,
      status: "booked",
      bookedBy: booking.buyer,
      bookedBooking: booking._id,
    });

    if (!property) {
      return res.status(409).json({
        success: false,
        message:
          "This property is not reserved under this exact booking",
      });
    }

    if (
      ["initiated", "pending"].includes(
        booking.remainingPaymentStatus
      ) &&
      booking.remainingPaymentExpiresAt &&
      booking.remainingPaymentExpiresAt > new Date()
    ) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending remaining payment",
        pidx: booking.remainingPaymentPidx,
      });
    }

    const remainingAmount = Number(booking.remainingAmount);

    if (
      !Number.isFinite(remainingAmount) ||
      remainingAmount < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining payment must be at least NPR 10",
      });
    }

    // Calculate remaining payment
    let paymentAmount;

    if (booking.paymentMode === "sandbox") {
      paymentAmount =
        Math.round(
          (remainingAmount / SANDBOX_CONVERSION_RATE) * 100
        ) / 100;

      if (paymentAmount < 10 || paymentAmount > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Converted sandbox remaining payment must be between NPR 10 and NPR 1000",
          actualRemainingAmount: remainingAmount,
          convertedSandboxAmount: paymentAmount,
          conversionRate: SANDBOX_CONVERSION_RATE,
        });
      }
    } else if (booking.paymentMode === "production") {
      paymentAmount = remainingAmount;

      if (paymentAmount < 10) {
        return res.status(400).json({
          success: false,
          message: "Khalti payment must be at least NPR 10",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid booking payment mode",
      });
    }

    const amountInPaisa = Math.round(paymentAmount * 100);

    // Initiate Khalti remaining payment
    const khaltiResponse = await fetch(
      `${KHALTI_BASE_URL}/epayment/initiate/`,
      {
        method: "POST",
        headers: getKhaltiHeaders(),
        body: JSON.stringify({
          return_url:
            `${frontendUrl}/payment/verify?paymentType=remaining`,

          website_url: frontendUrl,

          amount: amountInPaisa,

          purchase_order_id: `${booking._id}-remaining`,
          purchase_order_name: `Remaining payment - ${property.title}`,

          customer_info: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || "",
          },
        }),
      }
    );

    const khaltiData = await readKhaltiResponse(
      khaltiResponse
    );

    if (!khaltiResponse.ok) {
      console.error(
        "Khalti remaining payment initiation error:",
        khaltiData
      );

      return res.status(400).json({
        success: false,
        message:
          khaltiData.detail ||
          "Unable to initiate remaining payment",
      });
    }

    if (!khaltiData.pidx || !khaltiData.payment_url) {
      throw new Error(
        "Invalid remaining payment response received from Khalti"
      );
    }

    booking.remainingPaymentPidx = khaltiData.pidx;

    booking.remainingPaymentAmountPaisa = amountInPaisa;

    booking.remainingPaymentExpiresAt = khaltiData.expires_at
      ? new Date(khaltiData.expires_at)
      : null;

    booking.remainingPaymentStatus = "pending";

    await booking.save();

    console.log("Remaining payment initiated:", booking._id);
    console.log("Remaining payment pidx:", khaltiData.pidx);

    return res.status(200).json({
      success: true,
      message: "Remaining payment initiated successfully",

      bookingId: booking._id,

      paymentUrl: khaltiData.payment_url,
      pidx: khaltiData.pidx,

      paymentMode: booking.paymentMode,

      remainingAmount,
      paymentAmount,
      paymentAmountPaisa: amountInPaisa,

      sandboxPaymentAmount:
        booking.paymentMode === "sandbox"
          ? paymentAmount
          : null,

      conversionRate:
        booking.paymentMode === "sandbox"
          ? SANDBOX_CONVERSION_RATE
          : null,
    });
  } catch (error) {
    console.error("Initiate remaining payment error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This payment ID already exists. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to initiate remaining payment",
    });
  }
};

// ==========================================
// 4. VERIFY REMAINING 75% PAYMENT
// ==========================================

export const verifyRemainingPayment = async (req, res) => {
  try {
    const pidx =
      req.body?.pidx ||
      req.body?.remainingPaymentPidx ||
      req.query?.pidx;

    console.log("========== REMAINING PAYMENT VERIFICATION ==========");
    console.log("Received remaining pidx:", pidx);
    console.log("Authenticated buyer:", req.user?._id);

    if (!pidx) {
      return res.status(400).json({
        success: false,
        message: "Remaining payment ID (pidx) is missing",
      });
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Khalti secret key is not configured",
      });
    }

    const booking = await Booking.findOne({
      remainingPaymentPidx: pidx,
      buyer: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this remaining payment",
      });
    }

    // Already fully paid
    if (
      booking.remainingPaymentStatus === "completed" &&
      booking.bookingStatus === "completed"
    ) {
      const property = await Property.findOne({
        _id: booking.property,
        status: "sold",
        bookedBy: booking.buyer,
        bookedBooking: booking._id,
      });

      if (!property) {
        return res.status(409).json({
          success: false,
          message:
            "Payment is completed, but the property does not match this booking. Please contact support.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Full payment already verified",
        booking,
        propertyStatus: "sold",
        testOnly: booking.paymentMode === "sandbox",
      });
    }

    if (
      booking.bookingStatus !== "confirmed" ||
      booking.paymentStatus !== "completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "Advance payment must be completed first",
      });
    }

    // Verify exact property reservation
    const reservedProperty = await Property.findOne({
      _id: booking.property,
      status: "booked",
      bookedBy: booking.buyer,
      bookedBooking: booking._id,
    });

    if (!reservedProperty) {
      return res.status(409).json({
        success: false,
        message:
          "This property is not reserved under this exact booking",
      });
    }

    // Lookup remaining payment with Khalti
    const khaltiResponse = await fetch(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      {
        method: "POST",
        headers: getKhaltiHeaders(),
        body: JSON.stringify({
          pidx: booking.remainingPaymentPidx,
        }),
      }
    );

    const khaltiData = await readKhaltiResponse(
      khaltiResponse
    );

    if (!khaltiResponse.ok) {
      return res.status(400).json({
        success: false,
        message:
          khaltiData.detail ||
          "Unable to verify remaining payment with Khalti",
      });
    }

    if (
      khaltiData.pidx !== booking.remainingPaymentPidx
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining payment ID verification failed",
      });
    }

    if (
      Number(khaltiData.total_amount) !==
      Number(booking.remainingPaymentAmountPaisa)
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining payment amount does not match the booking",
      });
    }

    if (khaltiData.status !== "Completed") {
      if (
        ["Expired", "User canceled", "Canceled", "Failed"].includes(
          khaltiData.status
        )
      ) {
        booking.remainingPaymentStatus = "failed";

        await booking.save();

        return res.status(400).json({
          success: false,
          message: "Remaining payment was not completed",
          paymentStatus: khaltiData.status,
        });
      }

      return res.status(200).json({
        success: false,
        message: "Remaining payment is not completed yet",
        paymentStatus: khaltiData.status,
      });
    }

    // Mark property as sold
    const soldProperty = await markPropertyAsSold(booking);

    if (!soldProperty) {
      console.error(
        "Remaining payment completed but property could not be marked sold:",
        booking.property,
        booking._id
      );

      return res.status(409).json({
        success: false,
        paymentCompleted: true,
        message:
          "Your remaining payment was received, but the property status could not be updated. Please contact support.",
      });
    }

    // Complete booking
    booking.remainingPaymentStatus = "completed";

    booking.remainingTransactionId =
      khaltiData.transaction_id || null;

    booking.bookingStatus = "completed";

    await booking.save();

    console.log("Full payment verified successfully");
    console.log("Property marked as sold:", booking.property);
    console.log("Completed booking:", booking._id);

    return res.status(200).json({
      success: true,
      message:
        "Remaining payment verified successfully. Property is now sold.",

      testOnly: booking.paymentMode === "sandbox",

      booking: {
        _id: booking._id,
        property: booking.property,

        totalPrice: booking.totalPrice,
        advanceAmount: booking.advanceAmount,
        remainingAmount: booking.remainingAmount,

        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        remainingPaymentStatus: booking.remainingPaymentStatus,

        paymentMode: booking.paymentMode,

        transactionId: booking.transactionId,
        remainingTransactionId: booking.remainingTransactionId,
      },

      propertyStatus: "sold",
    });
  } catch (error) {
    console.error("========== REMAINING VERIFICATION ERROR ==========");
    console.error(error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Payment record conflict. Please contact support.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify remaining payment",
    });
  }
};

// ==========================================
// 5. GET LOGGED-IN BUYER'S BOOKED PROPERTIES
// ==========================================

export const getMyBookedProperties = async (req, res) => {
  try {
    const bookings = await Booking.find({
      buyer: req.user._id,
      bookingStatus: {
        $in: ["confirmed", "completed"],
      },
      paymentStatus: "completed",
    })
      .populate({
        path: "property",
      })
      .sort({ updatedAt: -1 });

    const validBookings = bookings.filter(
      (booking) => booking.property
    );

    const bookedProperties = validBookings.map(
      (booking) => booking.property
    );

    return res.status(200).json({
      success: true,
      count: bookedProperties.length,
      properties: bookedProperties,
    });
  } catch (error) {
    console.error(
      "Get booked properties error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your booked properties",
    });
  }
};

// ==========================================
// 6. GET LOGGED-IN BUYER'S BOOKING DETAILS
// ==========================================

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      buyer: req.user._id,
      bookingStatus: {
        $in: ["confirmed", "completed"],
      },
      paymentStatus: "completed",
    })
      .populate({
        path: "property",
      })
      .sort({ updatedAt: -1 });

    // Remove bookings whose properties no longer exist.
    const validBookings = bookings.filter(
      (booking) => booking.property
    );

    // Each booking includes its _id, which is required
    // by the remaining payment initiation endpoint.
    const formattedBookings = validBookings.map(
      (booking) => ({
        _id: booking._id,
        property: booking.property,

        totalPrice: booking.totalPrice,
        advanceAmount: booking.advanceAmount,
        remainingAmount: booking.remainingAmount,

        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        remainingPaymentStatus:
          booking.remainingPaymentStatus,

        paymentMode: booking.paymentMode,

        transactionId: booking.transactionId,
        remainingTransactionId:
          booking.remainingTransactionId,

        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      })
    );

    return res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your booking details",
    });
  }
};
