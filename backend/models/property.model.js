
import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 1,
    },

    district: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    propertyType: {
      type: String,
      enum: [
        "flat",
        "apartment",
        "villa",
        "house",
        "studio",
        "penthouse",
        "office",
        "townhouse",
        "plot",
        "commercial",
      ],
      required: true,
    },

    bhk: {
      type: String,
    },

    bathrooms: {
      type: Number,
    },

    areaSize: {
      type: Number,
    },

    furnishing: {
      type: String,
      enum: ["furnished", "semi-furnished", "unfurnished"],
    },

    amenities: [
      {
        type: String,
      },
    ],

    // Property availability status
    status: {
      type: String,
      enum: ["sale", "booked", "sold"],
      default: "sale",
    },

    // Buyer who successfully paid the 25% advance
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Exact booking associated with this property reservation
    bookedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    images: [
      {
        type: String,
      },
    ],

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Admin property verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    views: {
      type: Number,
      default: 0,
    },

    viewedBy: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Property =
  mongoose.models.Property ||
  mongoose.model("Property", propertySchema);

export default Property;
