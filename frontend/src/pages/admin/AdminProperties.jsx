
import React, { useEffect, useState } from "react";
import { adminPropertiesStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import PropertyCard from "../../components/common/propertyCard";
import axios from "axios";
import API_URL from "../../config";
import { Link } from "react-router-dom";

import {
    HiOutlineExternalLink,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
} from "react-icons/hi";

const AdminProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [processingId, setProcessingId] = useState(null);

    const { token } = useAuth();

    // Fetch all properties
    const fetchProperties = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const res = await axios.get(
                `${API_URL}/api/admin/properties`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const props = Array.isArray(res.data)
                ? res.data
                : res.data.properties || [];

            setProperties(props);
        } catch (err) {
            console.error("Failed to load properties:", err);
            alert(
                err.response?.data?.message ||
                "Failed to load properties."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [token]);

    // Filter properties according to selected tab
    const filteredProperties = properties.filter((property) => {
        const verificationStatus =
            property.verificationStatus || "pending";

        if (activeTab === "pending") {
            return verificationStatus === "pending";
        }

        if (activeTab === "approved") {
            return verificationStatus === "approved";
        }

        if (activeTab === "rejected") {
            return verificationStatus === "rejected";
        }

        if (activeTab === "booked") {
            return property.status === "booked";
        }

        if (activeTab === "sold") {
            return property.status === "sold";
        }

        return false;
    });

    // Approve property
    const handleApprove = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to approve this property?"
        );

        if (!confirmed) return;

        try {
            setProcessingId(id);

            const res = await axios.put(
                `${API_URL}/api/admin/properties/${id}/approve`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const updatedProperty = res.data.property;

            setProperties((prev) =>
                prev.map((property) =>
                    property._id === id
                        ? updatedProperty
                        : property
                )
            );

            alert("Property approved successfully!");
        } catch (err) {
            console.error("Approve property error:", err);

            alert(
                err.response?.data?.message ||
                "Failed to approve property."
            );
        } finally {
            setProcessingId(null);
        }
    };

    // Reject property
    const handleReject = async (id) => {
        const reason = window.prompt(
            "Enter the reason for rejecting this property:"
        );

        if (reason === null) return;

        if (!reason.trim()) {
            alert("Please enter a rejection reason.");
            return;
        }

        try {
            setProcessingId(id);

            const res = await axios.put(
                `${API_URL}/api/admin/properties/${id}/reject`,
                {
                    reason: reason.trim(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const updatedProperty = res.data.property;

            setProperties((prev) =>
                prev.map((property) =>
                    property._id === id
                        ? updatedProperty
                        : property
                )
            );

            alert("Property rejected successfully!");
        } catch (err) {
            console.error("Reject property error:", err);

            alert(
                err.response?.data?.message ||
                "Failed to reject property."
            );
        } finally {
            setProcessingId(null);
        }
    };

    // Delete property
    const handleDelete = async (id) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this property? This action is permanent."
            )
        ) {
            return;
        }

        try {
            await axios.delete(
                `${API_URL}/api/admin/properties/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setProperties((prev) =>
                prev.filter((property) => property._id !== id)
            );

            alert("Property deleted successfully!");
        } catch (err) {
            console.error("Delete property error:", err);

            alert(
                err.response?.data?.message ||
                "Failed to delete property."
            );
        }
    };

    // Loading screen
    if (loading) {
        return (
            <div className={s.loaderFullPage}>
                <div className={s.loader}></div>
            </div>
        );
    }

    // Tab counts
    const pendingCount = properties.filter(
        (p) => (p.verificationStatus || "pending") === "pending"
    ).length;

    const approvedCount = properties.filter(
        (p) => p.verificationStatus === "approved"
    ).length;

    const rejectedCount = properties.filter(
        (p) => p.verificationStatus === "rejected"
    ).length;

    const bookedCount = properties.filter(
        (p) => p.status === "booked"
    ).length;

    const soldCount = properties.filter(
        (p) => p.status === "sold"
    ).length;

    return (
        <>
            {/* Page Header */}
            <div className={s.headerContainer}>
                <h1 className={s.pageTitle}>
                    Property Moderation
                </h1>

                <p className={s.pageSubtitle}>
                    Review, verify, approve, and manage all property
                    listings across the platform.
                </p>
            </div>

            {/* Verification and Property Status Tabs */}
            <div className="flex flex-wrap gap-3 mb-6">

                <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${
                        activeTab === "pending"
                            ? "bg-amber-500 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Pending ({pendingCount})
                </button>

                <button
                    onClick={() => setActiveTab("approved")}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${
                        activeTab === "approved"
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Approved ({approvedCount})
                </button>

                <button
                    onClick={() => setActiveTab("rejected")}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${
                        activeTab === "rejected"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Rejected ({rejectedCount})
                </button>

                {/* Booked Properties */}
                <button
                    onClick={() => setActiveTab("booked")}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${
                        activeTab === "booked"
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Booked ({bookedCount})
                </button>

                {/* Sold Properties */}
                <button
                    onClick={() => setActiveTab("sold")}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${
                        activeTab === "sold"
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Sold ({soldCount})
                </button>

            </div>

            {/* Properties */}
            <div className={s.headerContainer}>
                {filteredProperties.length === 0 ? (
                    <div className={s.emptyStateCard}>
                        No {activeTab} properties found.
                    </div>
                ) : (
                    <div className={s.propertiesGrid}>
                        {filteredProperties.map((p) => (
                            <PropertyCard
                                key={p._id}
                                property={p}
                                renderActions={() => (
                                    <div className={s.actionWrapper}>

                                        {/* Seller Information */}
                                        <div className={s.sellerInfo}>
                                            <div className={s.sellerName}>
                                                Seller: {p.seller?.name || "Unknown"}
                                            </div>

                                            <div className={s.sellerEmail}>
                                                {p.seller?.email || "No email"}
                                            </div>
                                        </div>

                                        {/* Verification Status */}
                                        <div className="mb-3">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                    p.verificationStatus === "approved"
                                                        ? "bg-green-100 text-green-700"
                                                        : p.verificationStatus === "rejected"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                                {p.verificationStatus || "pending"}
                                            </span>
                                        </div>

                                        {/* Booking / Sold Status */}
                                        {p.status === "booked" && (
                                            <div className="mb-3">
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                    PROPERTY BOOKED
                                                </span>
                                            </div>
                                        )}

                                        {p.status === "sold" && (
                                            <div className="mb-3">
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                                    PROPERTY SOLD
                                                </span>
                                            </div>
                                        )}

                                        {/* Rejection Reason */}
                                        {p.verificationStatus === "rejected" &&
                                            p.rejectionReason && (
                                                <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                                    <strong>
                                                        Rejection reason:
                                                    </strong>
                                                    <p>
                                                        {p.rejectionReason}
                                                    </p>
                                                </div>
                                            )}

                                        {/* Action Buttons */}
                                        <div className={s.buttonGroup}>

                                            <Link
                                                to={`/property/${p._id}`}
                                                className={s.viewLink}
                                                title="View property"
                                            >
                                                <HiOutlineExternalLink size={16} />
                                            </Link>

                                            {p.verificationStatus === "pending" ||
                                            !p.verificationStatus ? (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleApprove(p._id)
                                                        }
                                                        disabled={processingId === p._id}
                                                        className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                                        title="Approve property"
                                                    >
                                                        <HiOutlineCheckCircle size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleReject(p._id)
                                                        }
                                                        disabled={processingId === p._id}
                                                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                        title="Reject property"
                                                    >
                                                        <HiOutlineXCircle size={18} />
                                                    </button>
                                                </>
                                            ) : null}

                                            <button
                                                onClick={() =>
                                                    handleDelete(p._id)
                                                }
                                                className={s.deleteButton}
                                                title="Delete property"
                                            >
                                                <HiOutlineTrash size={16} />
                                            </button>

                                        </div>

                                        {processingId === p._id && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Processing...
                                            </p>
                                        )}

                                    </div>
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminProperties;
