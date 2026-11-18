
import express from "express";

import {
    savePreferences,
    getPreferences,
    trackPropertyView,
    getRecommendations,
    compareProperties
} from "../controllers/recommendation.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

const recommendationRouter = express.Router();

// All recommendation routes require buyer authentication
recommendationRouter.use(protect, authorize("buyer"));

// Save buyer preferences
recommendationRouter.post(
    "/preferences",
    savePreferences
);

// Get buyer preferences
recommendationRouter.get(
    "/preferences",
    getPreferences
);

// Track a property view
recommendationRouter.post(
    "/track-view/:propertyId",
    trackPropertyView
);

// Get personalized recommendations
recommendationRouter.get(
    "/",
    getRecommendations
);

// Compare exactly two properties
recommendationRouter.post(
    "/compare",
    compareProperties
);

export default recommendationRouter;
