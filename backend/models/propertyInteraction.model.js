
import mongoose from "mongoose";

const propertyInteractionSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true
    },

    interactionType: {
      type: String,
      enum: ["view"],
      default: "view",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Useful for retrieving a buyer's recent activity
propertyInteractionSchema.index({
  buyer: 1,
  createdAt: -1
});

const PropertyInteraction =
  mongoose.models.PropertyInteraction ||
  mongoose.model("PropertyInteraction", propertyInteractionSchema);

export default PropertyInteraction;
