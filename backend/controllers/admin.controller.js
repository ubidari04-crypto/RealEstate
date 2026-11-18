
import User from "../models/user.model.js";
import Property from "../models/property.model.js";
import Inquiry from "../models/inquiry.model.js";

// ==========================================
// VIEW ALL USERS
// ==========================================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("GET_ALL_USERS_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// BLOCK OR UNBLOCK A USER
// ==========================================
export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.json({
      success: true,
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error("BLOCK_USER_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// DELETE A USER
// ==========================================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.deleteOne();

    return res.json({
      success: true,
      message: "User deleted successfully!",
    });
  } catch (error) {
    console.error("DELETE_USER_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// VIEW ALL PROPERTIES
// ==========================================
export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate("seller", "name email")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("ADMIN_GET_PROPERTIES_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// VIEW PENDING PROPERTY VERIFICATIONS
// ==========================================
export const getPendingProperties = async (req, res) => {
  try {
    const pendingProperties = await Property.find({
      verificationStatus: "pending",
      isVerified: false,
    })
      .populate("seller", "name email phone")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: pendingProperties.length,
      properties: pendingProperties,
    });
  } catch (error) {
    console.error("GET_PENDING_PROPERTIES_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// APPROVE A PROPERTY
// ==========================================
export const approveProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.verificationStatus === "approved" &&
        property.isVerified === true) {
      return res.json({
        success: true,
        message: "Property is already approved.",
        property,
      });
    }

    property.isVerified = true;
    property.verificationStatus = "approved";
    property.verifiedBy = req.user._id;
    property.verifiedAt = new Date();
    property.rejectionReason = "";

    await property.save();

    return res.json({
      success: true,
      message: "Property approved successfully!",
      property,
    });
  } catch (error) {
    console.error("APPROVE_PROPERTY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// REJECT A PROPERTY
// ==========================================
export const rejectProperty = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason.",
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    property.isVerified = false;
    property.verificationStatus = "rejected";
    property.verifiedBy = req.user._id;
    property.verifiedAt = new Date();
    property.rejectionReason = String(reason).trim();

    await property.save();

    return res.json({
      success: true,
      message: "Property rejected successfully.",
      property,
    });
  } catch (error) {
    console.error("REJECT_PROPERTY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE A PROPERTY
// ==========================================
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (
      property.status === "booked" ||
      property.status === "sold"
    ) {
      return res.status(403).json({
        success: false,
        message: "Booked or sold properties cannot be deleted.",
      });
    }

    await property.deleteOne();

    return res.json({
      success: true,
      message: "Property deleted successfully!",
    });
  } catch (err) {
    console.error("ADMIN_DELETE_PROPERTY_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// VIEW ALL INQUIRIES
// ==========================================
export const getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .populate("property", "title price")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    console.error("GET_ALL_INQUIRIES_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DASHBOARD ANALYTICS
// ==========================================
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalProperties = await Property.countDocuments();

    const activeListings = await Property.countDocuments({
      status: "sale",
      isVerified: true,
      verificationStatus: "approved",
    });

    const soldProperties = await Property.countDocuments({
      status: "sold",
    });

    const bookedProperties = await Property.countDocuments({
      status: "booked",
    });

    const pendingProperties = await Property.countDocuments({
      verificationStatus: "pending",
      isVerified: false,
    });

    const approvedProperties = await Property.countDocuments({
      verificationStatus: "approved",
      isVerified: true,
    });

    const rejectedProperties = await Property.countDocuments({
      verificationStatus: "rejected",
      isVerified: false,
    });

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalProperties,
        activeListings,
        soldProperties,
        bookedProperties,
        pendingProperties,
        approvedProperties,
        rejectedProperties,
      },
    });
  } catch (error) {
    console.error("GET_DASHBOARD_STATS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// VIEW PENDING SELLER ACCOUNTS
// ==========================================
export const getPendingSellers = async (req, res) => {
  try {
    const pendingSellers = await User.find({
      role: "seller",
      isApproved: false,
    }).select("-password");

    return res.json({
      success: true,
      count: pendingSellers.length,
      pendingSellers,
    });
  } catch (err) {
    console.error("GET_PENDING_SELLERS_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// APPROVE A SELLER
// ==========================================
export const approveSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller || seller.role !== "seller") {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    seller.isApproved = true;

    await seller.save();

    return res.json({
      success: true,
      message: "Seller approved successfully!",
      seller,
    });
  } catch (err) {
    console.error("APPROVE_SELLER_ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
