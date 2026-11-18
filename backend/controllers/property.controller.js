
import Property from "../models/property.model.js";
import Inquiry from "../models/inquiry.model.js";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import cloudinary from "../config/cloudinary.js";

// Escape user-supplied strings before using them in regular expressions.
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Check whether a property has been approved by admin.
const approvedPropertyFilter = {
  isVerified: true,
  verificationStatus: "approved",
};

// Publicly visible property statuses.
const publicPropertyStatuses = ["sale", "booked", "sold"];

// Add a property
export const addProperty = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "Only sellers can add properties.",
      });
    }

    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(
          file.buffer,
          "properties"
        );

        imageUrls.push(result.secure_url);
      }
    }

    const property = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: Number(req.body.price),
      district: req.body.district,
      city: req.body.city,
      area: req.body.area,
      pincode: req.body.pincode,
      propertyType: req.body.propertyType,

      bhk: req.body.bhk
        ? String(req.body.bhk)
        : undefined,

      bathrooms: req.body.bathrooms
        ? Number(req.body.bathrooms)
        : undefined,

      areaSize: req.body.areaSize
        ? Number(req.body.areaSize)
        : undefined,

      furnishing: req.body.furnishing,

      status: "sale",

      images: imageUrls,
      seller: req.user._id,

      // Admin verification fields.
      isVerified: false,
      verificationStatus: "pending",
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: "",

      amenities: req.body.amenities
        ? Array.isArray(req.body.amenities)
          ? req.body.amenities
          : (() => {
              try {
                return JSON.parse(req.body.amenities);
              } catch {
                return req.body.amenities.split(",");
              }
            })()
        : [],
    });

    return res.status(201).json({
      success: true,
      message:
        "Property submitted successfully. Waiting for admin verification.",
      property,
    });
  } catch (error) {
    console.error("ADD_PROPERTY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Internal server error while adding property",
    });
  }
};

// Get my properties
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("GET_MY_PROPERTIES_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a property
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Do not allow editing properties involved in bookings.
    if (property.status === "booked" || property.status === "sold") {
      return res.status(403).json({
        success: false,
        message: "Booked or sold properties cannot be edited.",
      });
    }

    const fields = [
      "title",
      "description",
      "price",
      "district",
      "city",
      "area",
      "pincode",
      "propertyType",
      "bhk",
      "bathrooms",
      "areaSize",
      "furnishing",
      "amenities",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (
          field === "amenities" &&
          typeof req.body[field] === "string"
        ) {
          try {
            property[field] = JSON.parse(req.body[field]);
          } catch {
            property[field] = req.body[field].split(",");
          }
        } else {
          property[field] = req.body[field];
        }
      }
    });

    // Preserve existing images selected by the user.
    if (req.body.existingImages !== undefined) {
      try {
        const existing = JSON.parse(req.body.existingImages);

        if (Array.isArray(existing)) {
          property.images = existing;
        }
      } catch (error) {
        console.error("Failed to parse existingImages:", error);
      }
    }

    // Upload new images.
    if (req.files && req.files.length > 0) {
      const newImages = [];

      for (const file of req.files) {
        const result = await uploadToCloudinary(
          file.buffer,
          "properties"
        );

        newImages.push(result.secure_url);
      }

      property.images = [
        ...(property.images || []),
        ...newImages,
      ];
    }

    // Any seller edit requires admin verification again.
    property.isVerified = false;
    property.verificationStatus = "pending";
    property.verifiedBy = null;
    property.verifiedAt = null;
    property.rejectionReason = "";

    await property.save();

    return res.json({
      success: true,
      message:
        "Property updated successfully. It is waiting for admin verification again.",
      property,
    });
  } catch (error) {
    console.error("UPDATE_PROPERTY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a property
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Protect properties involved in bookings.
    if (property.status === "booked" || property.status === "sold") {
      return res.status(403).json({
        success: false,
        message: "Booked or sold properties cannot be deleted.",
      });
    }

    // Delete images from Cloudinary.
    for (const imageUrl of property.images || []) {
      try {
        const publicId = imageUrl
          .split("/")
          .pop()
          .split(".")[0];

        await cloudinary.uploader.destroy(
          "properties/" + publicId
        );
      } catch (imageError) {
        console.error(
          "CLOUDINARY_IMAGE_DELETE_ERROR:",
          imageError
        );
      }
    }

    await property.deleteOne();

    return res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("DELETE_PROPERTY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update property status
// Booking controller is responsible for sale -> booked -> sold.
export const updatePropertyStatus = async (req, res) => {
  try {
    return res.status(403).json({
      success: false,
      message:
        "Property booking status can only be changed through the booking process.",
    });
  } catch (error) {
    console.error("UPDATE_PROPERTY_STATUS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all approved properties with filters.
// Available, booked, and sold properties are visible to buyers.
export const getAllProperties = async (req, res) => {
  try {
    const {
      district,
      city,
      area,
      pincode,
      propertyType,
      bhk,
      furnishing,
      minPrice,
      maxPrice,
      amenities,
      sort,
      seller,
    } = req.query;

    const query = {
      ...approvedPropertyFilter,
      status: { $in: publicPropertyStatuses },
    };

    if (seller) {
      query.seller = seller;
    }

    if (district) {
      query.district = new RegExp(
        `^${escapeRegex(district)}$`,
        "i"
      );
    }

    if (city) {
      query.city = new RegExp(
        escapeRegex(city),
        "i"
      );
    }

    if (area) {
      query.area = new RegExp(
        escapeRegex(area),
        "i"
      );
    }

    if (pincode) {
      query.pincode = pincode;
    }

    if (propertyType) {
      query.propertyType = {
        $in: propertyType.toLowerCase().split(","),
      };
    }

    if (bhk) {
      query.bhk =
        bhk === "5+" ? { $gte: "5" } : bhk;
    }

    if (furnishing) {
      query.furnishing = {
        $in: furnishing.split(",").map(
          (value) =>
            new RegExp(
              `^${escapeRegex(value.trim())}$`,
              "i"
            )
        ),
      };
    }

    if (minPrice || maxPrice) {
      query.price = {};

      if (minPrice && !isNaN(minPrice)) {
        query.price.$gte = Number(minPrice);
      }

      if (maxPrice && !isNaN(maxPrice)) {
        query.price.$lte = Number(maxPrice);
      }

      if (Object.keys(query.price).length === 0) {
        delete query.price;
      }
    }

    if (amenities) {
      query.amenities = {
        $in: amenities.split(",").map(
          (value) => value.trim()
        ),
      };
    }

    let sortOption = { createdAt: -1 };

    if (sort === "priceLow") {
      sortOption = { price: 1 };
    }

    if (sort === "priceHigh") {
      sortOption = { price: -1 };
    }

    if (sort === "latest") {
      sortOption = { createdAt: -1 };
    }

    const properties = await Property.find(query)
      .populate("seller", "name phone profilePic")
      .sort(sortOption);

    return res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("GET_ALL_PROPERTIES_ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Internal server error while fetching properties",
      error: error.message,
    });
  }
};

// Get districts and areas for location filters.
// Include locations from available, booked, and sold properties.
export const getPropertyLocations = async (req, res) => {
  try {
    const selectedDistrict = String(
      req.query.district || ""
    ).trim();

    const allDistricts = await Property.distinct(
      "district",
      {
        ...approvedPropertyFilter,
        status: { $in: publicPropertyStatuses },
      }
    );

    const districts = [
      ...new Set(
        allDistricts
          .filter(
            (value) =>
              typeof value === "string" &&
              value.trim().length > 0
          )
          .map((value) => value.trim())
      ),
    ].sort((a, b) => a.localeCompare(b));

    const areaFilter = {
      ...approvedPropertyFilter,
      status: { $in: publicPropertyStatuses },
      area: { $nin: [null, ""] },
    };

    if (selectedDistrict) {
      areaFilter.district = new RegExp(
        `^${escapeRegex(selectedDistrict)}$`,
        "i"
      );
    }

    const allAreas = await Property.distinct(
      "area",
      areaFilter
    );

    const areas = [
      ...new Set(
        allAreas
          .filter(
            (value) =>
              typeof value === "string" &&
              value.trim().length > 0
          )
          .map((value) => value.trim())
      ),
    ].sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      districts,
      areas,
    });
  } catch (error) {
    console.error("GET_PROPERTY_LOCATIONS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch property locations",
      error: error.message,
    });
  }
};

// Get property details
export const getPropertyDetails = async (req, res) => {
  try {
    const property = await Property.findById(
      req.params.id
    ).populate(
      "seller",
      "name email phone profilePic"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    let visitorId = req.ip;
    let isSellerChecking = false;
    let isAdminChecking = false;

    const authHeader = req.headers.authorization;

    // Identify logged-in user from JWT.
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        const tokenUserId =
          decoded.id ||
          decoded._id ||
          decoded.userId;

        if (tokenUserId) {
          visitorId = String(tokenUserId);

          isSellerChecking =
            property.seller &&
            String(property.seller._id) === visitorId;
        }

        isAdminChecking = decoded.role === "admin";

      } catch (authError) {
        console.log(
          "PROPERTY_DETAILS_AUTH_ERROR:",
          authError.message
        );
      }
    }

    // Hide pending and rejected properties from buyers and public visitors.
    if (
      (
        property.isVerified !== true ||
        property.verificationStatus !== "approved"
      ) &&
      !isSellerChecking &&
      !isAdminChecking
    ) {
      return res.status(404).json({
        success: false,
        message: "Property not found or not yet approved.",
      });
    }

    // Count views only from visitors, not owner or admin.
    if (!property.viewedBy) {
      property.viewedBy = [];
    }

    const alreadyViewed = property.viewedBy
      .map(String)
      .includes(String(visitorId));

    if (
      !isSellerChecking &&
      !isAdminChecking &&
      !alreadyViewed
    ) {
      property.views = (property.views || 0) + 1;

      property.viewedBy.push(String(visitorId));

      await property.save();
    }

    // Similar properties remain available properties only.
    const similarProperties = await Property.find({
      _id: { $ne: property._id },
      city: property.city,
      propertyType: property.propertyType,
      status: "sale",
      ...approvedPropertyFilter,
    })
      .limit(4)
      .select(
        "title price images city area propertyType bhk areaSize status"
      );

    return res.json({
      success: true,
      property,
      similarProperties,
    });

  } catch (error) {
    console.error(
      "GET_PROPERTY_DETAILS_ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error while fetching properties",
      error: error.message,
    });
  }
};

// Seller dashboard
export const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const totalProperties = await Property.countDocuments({
      seller: sellerId,
    });

    const activeListings = await Property.countDocuments({
      seller: sellerId,
      status: "sale",
      ...approvedPropertyFilter,
    });

    const soldProperties = await Property.countDocuments({
      seller: sellerId,
      status: "sold",
    });

    const pendingProperties = await Property.countDocuments({
      seller: sellerId,
      verificationStatus: "pending",
    });

    const rejectedProperties = await Property.countDocuments({
      seller: sellerId,
      verificationStatus: "rejected",
    });

    const totalInquiries = await Inquiry.countDocuments({
      seller: sellerId,
    });

    const viewsData = await Property.aggregate([
      {
        $match: {
          seller: sellerId,
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: "$views",
          },
        },
      },
    ]);

    const totalViews =
      viewsData.length > 0
        ? viewsData[0].totalViews
        : 0;

    return res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        soldProperties,
        pendingProperties,
        rejectedProperties,
        totalInquiries,
        totalViews,
      },
    });
  } catch (error) {
    console.error("GET_SELLER_DASHBOARD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Internal server error while fetching seller dashboard",
      error: error.message,
    });
  }
};

// Get approved property counts by type.
// Counts include available, booked, and sold properties.
export const getPropertyCounts = async (req, res) => {
  try {
    const counts = await Property.aggregate([
      {
        $match: {
          ...approvedPropertyFilter,
          status: { $in: publicPropertyStatuses },
        },
      },
      {
        $group: {
          _id: "$propertyType",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedCounts = counts.reduce(
      (acc, curr) => {
        if (curr._id) {
          acc[curr._id] = curr.count;
        }

        return acc;
      },
      {}
    );

    return res.json({
      success: true,
      counts: formattedCounts,
    });
  } catch (error) {
    console.error("GET_PROPERTY_COUNTS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Internal server error while fetching counts",
      error: error.message,
    });
  }
};
