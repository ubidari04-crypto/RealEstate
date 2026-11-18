
import mongoose from "mongoose";
import Property from "../models/property.model.js";
import Preference from "../models/preference.model.js";
import PropertyInteraction from "../models/propertyInteraction.model.js";
import Wishlist from "../models/wishlist.model.js";
import Inquiry from "../models/inquiry.model.js";

// ------------------------------------------
// 1. CONSTANTS AND HELPER FUNCTIONS
// ------------------------------------------

const allowedPropertyTypes = [
    "flat",
    "apartment",
    "villa",
    "house",
    "studio",
    "penthouse",
    "office",
    "townhouse",
    "plot",
    "commercial"
];

const normalize = (value) =>
    String(value ?? "").trim().toLowerCase();

// Identify duplicate property listings
const getPropertyIdentity = (property) => {
    if (!property) return "";

    return [
        property.title,
        property.propertyType,
        property.district,
        property.city,
        property.area,
        property.price
    ]
        .map(normalize)
        .join("|");
};

const arraysMatch = (first = [], second = []) => {
    const normalizedSecond = second.map(normalize);

    return first.some(item =>
        normalizedSecond.includes(normalize(item))
    );
};

// Interaction weights
const INTERACTION_WEIGHTS = {
    view: 1,
    wishlist: 3,
    inquiry: 5
};

// Recommendation weights
const PREFERENCE_WEIGHT = 0.70;
const ACTIVITY_WEIGHT = 0.30;


// ------------------------------------------
// 2. BHK MATCHING HELPER
// ------------------------------------------

const calculateBhkMatchScore = (preferredBhk, propertyBhk) => {
    const preferred = Number.parseFloat(preferredBhk);
    const actual = Number.parseFloat(propertyBhk);

    if (
        !Number.isFinite(preferred) ||
        !Number.isFinite(actual) ||
        preferred <= 0 ||
        actual <= 0
    ) {
        return 0;
    }

    const difference = Math.abs(preferred - actual);

    if (difference === 0) return 1;
    if (difference === 1) return 0.7;

    return 0.4;
};


// ------------------------------------------
// 3. GENERATE MATCH REASONS
// ------------------------------------------

const generateMatchReasons = (
    property,
    preference,
    activityProperties = []
) => {
    const reasons = [];

    if (!preference) return reasons;

    // District match
    if (
        preference.preferredDistrict &&
        normalize(property.district) ===
        normalize(preference.preferredDistrict)
    ) {
        reasons.push(
            `Located in your preferred district: ${property.district}`
        );
    }

    // City match
    if (
        preference.preferredCity &&
        normalize(property.city) ===
        normalize(preference.preferredCity)
    ) {
        reasons.push(
            `Located in your preferred city: ${property.city}`
        );
    }

    // Area match
    if (
        preference.preferredArea &&
        normalize(property.area) ===
        normalize(preference.preferredArea)
    ) {
        reasons.push(
            `Matches your preferred area: ${property.area}`
        );
    }

    // Budget match
    if (
        preference.minPrice > 0 ||
        preference.maxPrice < 100000000
    ) {
        const price = Number(property.price) || 0;
        const minimum = Number(preference.minPrice) || 0;
        const maximum = Number(preference.maxPrice) || 100000000;

        if (price >= minimum && price <= maximum) {
            reasons.push("Within your selected budget");
        }
    }

    // Property type match
    if (
        preference.propertyTypes?.length > 0 &&
        preference.propertyTypes
            .map(normalize)
            .includes(normalize(property.propertyType))
    ) {
        reasons.push(
            `Matches your preferred property type: ${property.propertyType}`
        );
    }

    // BHK match
    if (preference.bhk) {
        const preferredBhk = Number.parseFloat(preference.bhk);
        const propertyBhk = Number.parseFloat(property.bhk);

        if (
            Number.isFinite(preferredBhk) &&
            Number.isFinite(propertyBhk)
        ) {
            const difference = Math.abs(
                preferredBhk - propertyBhk
            );

            if (difference === 0) {
                reasons.push(
                    `Matches your preferred bedroom count: ${property.bhk} BHK`
                );
            } else if (difference === 1) {
                reasons.push(
                    `Close to your preferred ${preference.bhk} BHK requirement (${property.bhk} BHK)`
                );
            }
        }
    }

    // Furnishing match
    if (
        preference.furnishing &&
        normalize(property.furnishing) ===
        normalize(preference.furnishing)
    ) {
        reasons.push(
            `Matches your furnishing preference: ${property.furnishing}`
        );
    }

    // Amenities match
    if (preference.amenities?.length > 0) {
        const matchedAmenities = preference.amenities.filter(
            amenity =>
                arraysMatch([amenity], property.amenities || [])
        );

        if (matchedAmenities.length > 0) {
            reasons.push(
                `Includes ${matchedAmenities.length} of your preferred amenities`
            );
        }
    }

    // Minimum area match
    if (
        Number(preference.minArea) > 0 &&
        Number(property.areaSize) >= Number(preference.minArea)
    ) {
        reasons.push(
            `Meets your minimum area requirement of ${preference.minArea} sq. ft.`
        );
    }

    // Activity similarity
    const hasActivitySimilarity = activityProperties.some(activity => {
        if (!activity.property) return false;

        if (
            activity.property._id.toString() ===
            property._id.toString()
        ) {
            return false;
        }

        return calculatePropertySimilarity(
            property,
            activity.property
        ) >= 40;
    });

    if (hasActivitySimilarity) {
        reasons.push(
            "Similar to properties you have viewed, wishlisted, or enquired about"
        );
    }

    if (reasons.length === 0) {
        reasons.push(
            "Recommended based on your overall property preferences"
        );
    }

    return reasons;
};


// ------------------------------------------
// 4. BUILD BUYER ACTIVITY DATA
// ------------------------------------------

const getBuyerActivityProperties = async (buyerId) => {
    const [
        viewedInteractions,
        wishlistItems,
        inquiryItems
    ] = await Promise.all([
        PropertyInteraction.find({
            buyer: buyerId,
            interactionType: "view"
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("property"),

        Wishlist.find({
            user: buyerId
        }).populate("property"),

        Inquiry.find({
            buyer: buyerId
        }).populate("property")
    ]);

    const activityMap = new Map();

    const addActivity = (property, weight) => {
        if (!property || !property._id) return;

        const propertyId = property._id.toString();

        // Ignore unavailable and own properties
        if (
            property.status !== "sale" ||
            property.seller?.toString() === buyerId.toString()
        ) {
            return;
        }

        const existing = activityMap.get(propertyId);

        // Keep strongest interaction for each property
        if (!existing || weight > existing.weight) {
            activityMap.set(propertyId, {
                property,
                weight
            });
        }
    };

    viewedInteractions.forEach(item => {
        addActivity(
            item.property,
            INTERACTION_WEIGHTS.view
        );
    });

    wishlistItems.forEach(item => {
        addActivity(
            item.property,
            INTERACTION_WEIGHTS.wishlist
        );
    });

    inquiryItems.forEach(item => {
        addActivity(
            item.property,
            INTERACTION_WEIGHTS.inquiry
        );
    });

    return [...activityMap.values()];
};


// ------------------------------------------
// 5. SAVE BUYER PREFERENCES
// ------------------------------------------

export const savePreferences = async (req, res) => {
    try {
        const {
            preferredDistrict = "",
            preferredCity = "",
            preferredArea = "",
            propertyTypes = [],
            minPrice = 0,
            maxPrice = 100000000,
            bhk = "",
            furnishing = "",
            amenities = [],
            minArea = 0
        } = req.body;

        if (
            !Array.isArray(propertyTypes) ||
            !Array.isArray(amenities)
        ) {
            return res.status(400).json({
                success: false,
                message: "Property types and amenities must be arrays."
            });
        }

        const invalidTypes = propertyTypes.filter(
            type => !allowedPropertyTypes.includes(normalize(type))
        );

        if (invalidTypes.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid property type selected.",
                invalidTypes
            });
        }

        const minimum = Number(minPrice);
        const maximum = Number(maxPrice);
        const minimumArea = Number(minArea);

        if (
            !Number.isFinite(minimum) ||
            !Number.isFinite(maximum) ||
            !Number.isFinite(minimumArea) ||
            minimum < 0 ||
            maximum < minimum ||
            minimumArea < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid price and area values."
            });
        }

        const allowedFurnishing = [
            "",
            "furnished",
            "semi-furnished",
            "unfurnished"
        ];

        if (!allowedFurnishing.includes(normalize(furnishing))) {
            return res.status(400).json({
                success: false,
                message: "Invalid furnishing preference."
            });
        }

        const preferences = await Preference.findOneAndUpdate(
            { buyer: req.user._id },
            {
                $set: {
                    preferredDistrict: String(preferredDistrict).trim(),
                    preferredCity: String(preferredCity).trim(),
                    preferredArea: String(preferredArea).trim(),

                    propertyTypes: propertyTypes.map(normalize),

                    minPrice: minimum,
                    maxPrice: maximum,

                    bhk: String(bhk || "").trim(),
                    furnishing: normalize(furnishing),

                    amenities: amenities
                        .map(item => String(item).trim())
                        .filter(Boolean),

                    minArea: minimumArea
                }
            },
            {
                returnDocument: "after",
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Preferences saved successfully.",
            preferences
        });

    } catch (error) {
        console.error("Save preferences error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save preferences."
        });
    }
};


// ------------------------------------------
// 6. GET BUYER PREFERENCES
// ------------------------------------------

export const getPreferences = async (req, res) => {
    try {
        const preferences = await Preference.findOne({
            buyer: req.user._id
        });

        return res.status(200).json({
            success: true,
            preferences
        });

    } catch (error) {
        console.error("Get preferences error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve preferences."
        });
    }
};


// ------------------------------------------
// 7. TRACK PROPERTY VIEWS
// ------------------------------------------

export const trackPropertyView = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const buyerId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(propertyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID."
            });
        }

        const property = await Property.findById(propertyId);

        if (
            !property ||
            property.status !== "sale" ||
            property.seller?.toString() === buyerId.toString()
        ) {
            return res.status(404).json({
                success: false,
                message: "Property not available."
            });
        }

        // Prevent duplicate views within 24 hours
        const recentView = await PropertyInteraction.findOne({
            buyer: buyerId,
            property: propertyId,
            interactionType: "view",
            createdAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        });

        if (!recentView) {
            await PropertyInteraction.create({
                buyer: buyerId,
                property: propertyId,
                interactionType: "view"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Property view tracked successfully."
        });

    } catch (error) {
        console.error("Track property view error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to track property view."
        });
    }
};


// ------------------------------------------
// 8. CALCULATE PREFERENCE MATCH SCORE
// ------------------------------------------

const calculatePreferenceScore = (property, preference) => {
    if (!preference) return 0;

    let score = 0;
    let totalWeight = 0;

    const addScore = (weight, matchValue) => {
        score += weight * Math.max(0, Math.min(1, matchValue));
        totalWeight += weight;
    };

    // District
    if (preference.preferredDistrict) {
        addScore(
            25,
            normalize(property.district) ===
            normalize(preference.preferredDistrict) ? 1 : 0
        );
    }

    // City
    if (preference.preferredCity) {
        addScore(
            15,
            normalize(property.city) ===
            normalize(preference.preferredCity) ? 1 : 0
        );
    }

    // Area
    if (preference.preferredArea) {
        addScore(
            15,
            normalize(property.area) ===
            normalize(preference.preferredArea) ? 1 : 0
        );
    }

    // Budget
    if (
        preference.minPrice > 0 ||
        preference.maxPrice < 100000000
    ) {
        const price = Number(property.price) || 0;
        const minimum = Number(preference.minPrice) || 0;
        const maximum = Number(preference.maxPrice) || 100000000;

        addScore(
            20,
            price >= minimum && price <= maximum ? 1 : 0
        );
    }

    // Property type
    if (preference.propertyTypes?.length > 0) {
        addScore(
            15,
            preference.propertyTypes
                .map(normalize)
                .includes(normalize(property.propertyType)) ? 1 : 0
        );
    }

    // BHK
    if (preference.bhk) {
        addScore(
            5,
            calculateBhkMatchScore(
                preference.bhk,
                property.bhk
            )
        );
    }

    // Furnishing
    if (preference.furnishing) {
        addScore(
            3,
            normalize(property.furnishing) ===
            normalize(preference.furnishing) ? 1 : 0
        );
    }

    // Amenities
    if (preference.amenities?.length > 0) {
        const matchedAmenities = preference.amenities.filter(
            amenity =>
                arraysMatch([amenity], property.amenities || [])
        ).length;

        addScore(
            4,
            matchedAmenities / preference.amenities.length
        );
    }

    // Minimum area
    if (preference.minArea > 0) {
        const propertyArea = Number(property.areaSize) || 0;
        const requiredArea = Number(preference.minArea);

        const areaScore = propertyArea >= requiredArea
            ? 1
            : propertyArea / requiredArea;

        addScore(3, areaScore);
    }

    return totalWeight > 0
        ? (score / totalWeight) * 100
        : 0;
};


// ------------------------------------------
// 9. CALCULATE PROPERTY SIMILARITY
// ------------------------------------------

const calculatePropertySimilarity = (first, second) => {
    if (!first || !second) return 0;

    const comparisons = [
        {
            weight: 25,
            match: normalize(first.district) ===
                normalize(second.district) ? 1 : 0
        },
        {
            weight: 15,
            match: normalize(first.city) ===
                normalize(second.city) ? 1 : 0
        },
        {
            weight: 20,
            match: normalize(first.propertyType) ===
                normalize(second.propertyType) ? 1 : 0
        },
        {
            weight: 10,
            match: normalize(first.area) ===
                normalize(second.area) ? 1 : 0
        },
        {
            weight: 10,
            match: calculateBhkMatchScore(
                first.bhk,
                second.bhk
            )
        },
        {
            weight: 5,
            match: normalize(first.furnishing) ===
                normalize(second.furnishing) ? 1 : 0
        }
    ];

    // Price similarity
    const firstPrice = Number(first.price) || 0;
    const secondPrice = Number(second.price) || 0;

    const maxPrice = Math.max(firstPrice, secondPrice, 1);

    const priceDifference =
        Math.abs(firstPrice - secondPrice) / maxPrice;

    comparisons.push({
        weight: 10,
        match: Math.max(0, 1 - priceDifference)
    });

    // Amenity similarity: Jaccard similarity
    const firstAmenities = [
        ...new Set((first.amenities || []).map(normalize))
    ];

    const secondAmenities = [
        ...new Set((second.amenities || []).map(normalize))
    ];

    const commonAmenities = firstAmenities.filter(
        item => secondAmenities.includes(item)
    ).length;

    const totalAmenities = new Set([
        ...firstAmenities,
        ...secondAmenities
    ]).size;

    comparisons.push({
        weight: 5,
        match: totalAmenities
            ? commonAmenities / totalAmenities
            : 0
    });

    const totalWeight = comparisons.reduce(
        (sum, item) => sum + item.weight,
        0
    );

    const matchedWeight = comparisons.reduce(
        (sum, item) => sum + item.weight * item.match,
        0
    );

    return (matchedWeight / totalWeight) * 100;
};


// ------------------------------------------
// 10. CALCULATE ACTIVITY SCORE
// ------------------------------------------

const calculateActivityScore = (property, activityProperties) => {
    let activityScore = 0;
    let totalActivityWeight = 0;

    for (const activity of activityProperties) {
        if (!activity.property) continue;

        // Do not compare a property with itself
        if (
            activity.property._id.toString() ===
            property._id.toString()
        ) {
            continue;
        }

        const similarity = calculatePropertySimilarity(
            property,
            activity.property
        );

        activityScore += similarity * activity.weight;
        totalActivityWeight += activity.weight;
    }

    return {
        activityScore: totalActivityWeight > 0
            ? activityScore / totalActivityWeight
            : 0,

        totalActivityWeight
    };
};


// ------------------------------------------
// 11. CALCULATE FINAL RECOMMENDATION SCORE
// ------------------------------------------

const calculateRecommendationDetails = (
    property,
    preferences,
    activityProperties
) => {
    const preferenceScore = calculatePreferenceScore(
        property,
        preferences
    );

    const {
        activityScore,
        totalActivityWeight
    } = calculateActivityScore(
        property,
        activityProperties
    );

    const recommendationScore = totalActivityWeight > 0
        ? (
            preferenceScore * PREFERENCE_WEIGHT
        ) + (
            activityScore * ACTIVITY_WEIGHT
        )
        : preferenceScore;

    const matchReasons = generateMatchReasons(
        property,
        preferences,
        activityProperties
    );

    return {
        property,

        preferenceScore: Math.round(preferenceScore),

        activityScore: Math.round(activityScore),

        recommendationScore: Math.round(
            Math.max(0, Math.min(100, recommendationScore))
        ),

        hasActivity: totalActivityWeight > 0,

        matchReasons
    };
};


// ------------------------------------------
// 12. GET PERSONALIZED RECOMMENDATIONS
// ------------------------------------------

export const getRecommendations = async (req, res) => {
    try {
        const buyerId = req.user._id;

        // A. Get buyer preferences
        const preferences = await Preference.findOne({
            buyer: buyerId
        });

        if (!preferences) {
            return res.status(200).json({
                success: true,
                message: "Please save your property preferences first.",
                count: 0,
                bestMatch: null,
                similarProperties: [],
                recommendations: []
            });
        }

        // B. Get buyer activity
        const activityProperties = await getBuyerActivityProperties(
            buyerId
        );

        // C. Get available properties
        const allProperties = await Property.find({
            status: "sale",
            seller: { $ne: buyerId }
        });

        // D. Apply buyer requirements
        const eligibleProperties = allProperties.filter(property => {
            if (
                preferences.preferredDistrict &&
                normalize(property.district) !==
                normalize(preferences.preferredDistrict)
            ) {
                return false;
            }

            if (
                preferences.preferredCity &&
                normalize(property.city) !==
                normalize(preferences.preferredCity)
            ) {
                return false;
            }

            if (
                preferences.propertyTypes?.length > 0 &&
                !preferences.propertyTypes
                    .map(normalize)
                    .includes(normalize(property.propertyType))
            ) {
                return false;
            }

            const price = Number(property.price) || 0;
            const minPrice = Number(preferences.minPrice) || 0;

            const maxPrice = preferences.maxPrice != null
                ? Number(preferences.maxPrice)
                : 100000000;

            if (price < minPrice || price > maxPrice) {
                return false;
            }

            if (
                Number(preferences.minArea) > 0 &&
                Number(property.areaSize) < Number(preferences.minArea)
            ) {
                return false;
            }

            return true;
        });

        // E. Prioritize exact preferred area
        let propertiesForRecommendations = eligibleProperties;

        if (preferences.preferredArea) {
            const preferredArea = normalize(
                preferences.preferredArea
            );

            const exactAreaProperties = eligibleProperties.filter(
                property =>
                    normalize(property.area) === preferredArea
            );

            if (exactAreaProperties.length > 0) {
                propertiesForRecommendations = exactAreaProperties;
            }
        }

        // F. Calculate scores
        const rankedProperties = propertiesForRecommendations.map(
            property => calculateRecommendationDetails(
                property,
                preferences,
                activityProperties
            )
        );

        // G. Sort by recommendation score
        rankedProperties.sort(
            (a, b) =>
                b.recommendationScore - a.recommendationScore
        );

        // H. Best Match
        const bestProperty = rankedProperties.length > 0
            ? rankedProperties[0]
            : null;

        const bestMatch = bestProperty
            ? {
                ...bestProperty,
                matchType: "Best Match"
            }
            : null;

        // I. Find different properties from the same location
        let similarProperties = [];

        if (bestProperty) {
            const bestLocation = bestProperty.property;
            const bestPropertyId = bestLocation._id.toString();
            const bestIdentity = getPropertyIdentity(bestLocation);

            // Exclude Best Match by ID and duplicate identity
            const remainingProperties = rankedProperties.filter(item => {
                const property = item.property;

                return (
                    property._id.toString() !== bestPropertyId &&
                    getPropertyIdentity(property) !== bestIdentity &&
                    item.recommendationScore >= 35
                );
            });

            // First priority: Same area and same city
            const sameAreaProperties = remainingProperties.filter(item =>
                normalize(item.property.area) ===
                    normalize(bestLocation.area) &&
                normalize(item.property.city) ===
                    normalize(bestLocation.city)
            );

            // Second priority: Same city, different area
            const sameCityProperties = remainingProperties.filter(item =>
                normalize(item.property.city) ===
                    normalize(bestLocation.city) &&
                normalize(item.property.area) !==
                    normalize(bestLocation.area)
            );

            // Third priority: Same district, different city
            const sameDistrictProperties = remainingProperties.filter(item =>
                normalize(item.property.district) ===
                    normalize(bestLocation.district) &&
                normalize(item.property.city) !==
                    normalize(bestLocation.city)
            );

            // Combine results and remove duplicate listings
            const seenProperties = new Set([bestIdentity]);

            similarProperties = [
                ...sameAreaProperties,
                ...sameCityProperties,
                ...sameDistrictProperties
            ]
                .filter(item => {
                    const identity = getPropertyIdentity(item.property);

                    if (seenProperties.has(identity)) {
                        return false;
                    }

                    seenProperties.add(identity);
                    return true;
                })
                .slice(0, 10)
                .map(item => ({
                    ...item,
                    matchType: "Similar Property"
                }));
        }

        // J. Combine recommendations
        const recommendations = [
            ...(bestMatch ? [bestMatch] : []),
            ...similarProperties
        ];

        return res.status(200).json({
            success: true,
            count: recommendations.length,
            bestMatch,
            similarProperties,
            recommendations
        });

    } catch (error) {
        console.error("Get recommendations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate recommendations."
        });
    }
};


// ------------------------------------------
// 13. COMPARE TWO PROPERTIES
// ------------------------------------------

export const compareProperties = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { propertyIds } = req.body;

        // A. Validate exactly two IDs
        if (
            !Array.isArray(propertyIds) ||
            propertyIds.length !== 2
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide exactly two property IDs."
            });
        }

        if (
            !propertyIds.every(id =>
                mongoose.Types.ObjectId.isValid(id)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "One or more property IDs are invalid."
            });
        }

        const firstId = String(propertyIds[0]);
        const secondId = String(propertyIds[1]);

        if (firstId === secondId) {
            return res.status(400).json({
                success: false,
                message: "Please select two different properties."
            });
        }

        // B. Get preferences
        const preferences = await Preference.findOne({
            buyer: buyerId
        });

        // C. Fetch properties
        const properties = await Property.find({
            _id: { $in: propertyIds }
        });

        const propertyMap = new Map(
            properties.map(property => [
                property._id.toString(),
                property
            ])
        );

        // Preserve buyer's selected order
        const selectedProperties = propertyIds.map(id =>
            propertyMap.get(String(id))
        );

        if (selectedProperties.some(property => !property)) {
            return res.status(404).json({
                success: false,
                message: "One or both selected properties could not be found."
            });
        }

        // D. Validate availability and ownership
        const unavailableProperty = selectedProperties.some(
            property =>
                property.status !== "sale" ||
                property.seller?.toString() === buyerId.toString()
        );

        if (unavailableProperty) {
            return res.status(400).json({
                success: false,
                message: "One or both properties are unavailable for comparison."
            });
        }

        // E. Get buyer activity
        const activityProperties = await getBuyerActivityProperties(
            buyerId
        );

        // F. Calculate exact recommendation scores
        const comparisons = selectedProperties.map(property => {
            if (!preferences) {
                return {
                    property,
                    preferenceScore: null,
                    activityScore: null,
                    recommendationScore: null,
                    hasActivity: false,
                    matchReasons: []
                };
            }

            return calculateRecommendationDetails(
                property,
                preferences,
                activityProperties
            );
        });

        // G. Determine winner
        let winner = null;

        if (preferences) {
            const firstScore = comparisons[0].recommendationScore;
            const secondScore = comparisons[1].recommendationScore;

            if (firstScore > secondScore) {
                winner = selectedProperties[0]._id.toString();
            } else if (secondScore > firstScore) {
                winner = selectedProperties[1]._id.toString();
            }
        }

        return res.status(200).json({
            success: true,
            hasPreferences: Boolean(preferences),
            hasActivity: comparisons.some(
                item => item.hasActivity
            ),
            winner,
            comparisons
        });

    } catch (error) {
        console.error("Compare properties error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to compare properties."
        });
    }
};
