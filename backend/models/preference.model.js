
import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    preferredDistrict: {
      type: String,
      trim: true,
      default: ""
    },

    preferredCity: {
      type: String,
      trim: true,
      default: ""
    },

    preferredArea: {
      type: String,
      trim: true,
      default: ""
    },

    propertyTypes: {
      type: [String],
      default: []
    },

    minPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    maxPrice: {
      type: Number,
      min: 0,
      default: 100000000
    },

    bhk: {
      type: String,
      default: ""
    },

    furnishing: {
      type: String,
      enum: ["", "furnished", "semi-furnished", "unfurnished"],
      default: ""
    },

    amenities: {
      type: [String],
      default: []
    },

    minArea: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Preference =
  mongoose.models.Preference ||
  mongoose.model("Preference", preferenceSchema);

export default Preference;
