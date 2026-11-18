
import React, { useEffect, useState } from "react";
import { myPropertiesStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import {
  HiOutlineCheckCircle,
  HiOutlineLibrary,
  HiOutlinePencilAlt,
  HiOutlineTrash,
} from "react-icons/hi";
import PropertyCard from "../../components/common/propertyCard";

const MyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuth();

  // Fetch all properties created by the logged-in seller.
  const fetchMyProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_URL}/api/property/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const props = Array.isArray(res.data)
        ? res.data
        : res.data.properties || [];

      setProperties(props);
    } catch (error) {
      console.error("Failed to load properties:", error);
      setError("Failed to load your properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyProperties();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Delete a property.
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/api/property/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProperties((previousProperties) =>
        previousProperties.filter((property) => property._id !== id)
      );
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert("Failed to delete the property.");
    }
  };

  // Update a property's status.
  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/api/property/${id}/status`,
        {
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProperties((previousProperties) =>
        previousProperties.map((property) =>
          property._id === id
            ? { ...property, status: newStatus }
            : property
        )
      );
    } catch (err) {
      console.error("Failed to update property status:", err);
      alert(
        err.response?.data?.message || "Failed to update status."
      );
    }
  };

  // The backend stores available properties as "sale".
  const getAvailableStatus = () => {
    return "sale";
  };

  // Priority:
  // 1. SOLD properties
  // 2. BOOKED properties
  // 3. Rejected properties
  // 4. Other available properties
  const sortedProperties = [...properties].sort((a, b) => {
    const getPriority = (property) => {
      if (property.status === "sold") return 1;
      if (property.status === "booked") return 2;

      if (property.verificationStatus === "rejected") {
        return 3;
      }

      return 4;
    };

    const priorityDifference =
      getPriority(a) - getPriority(b);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (loading) {
    return (
      <div className={s.loaderFullPage}>
        <div className={s.loader}></div>
      </div>
    );
  }

  return (
    <div className={s.fadeIn}>
      <div className={s.header}>
        <div>
          <h1 className={s.heading}>My Listings.</h1>
          <p className={s.subheading}>
            Manage your listed properties and their status.
          </p>
        </div>

        <Link to="/add-property" className={s.addButton}>
          Add New Listing
        </Link>
      </div>

      <div className={s.content}>
        {error && (
          <div className={s.errorMessage}>
            <p>{error}</p>

            <button type="button" onClick={fetchMyProperties}>
              Try Again
            </button>
          </div>
        )}

        {!error &&
        (!Array.isArray(properties) || properties.length === 0) ? (
          <div className={s.emptyCard}>
            <div className={s.emptyIconWrapper}>
              <HiOutlineLibrary size={40} color="#94a3b8" />
            </div>

            <h2 className={s.emptyTitle}>No Properties Found</h2>

            <p className={s.emptyText}>
              Start your journey by adding your first property listing.
            </p>

            <Link to="/add-property" className={s.emptyButton}>
              Add Your First Listing
            </Link>
          </div>
        ) : (
          !error && (
            <>
              {/* PROPERTY STATUS SUMMARY */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold text-red-600">
                    SOLD
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {properties.filter(
                      (property) => property.status === "sold"
                    ).length}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-xs font-semibold text-yellow-700">
                    BOOKED
                  </p>
                  <p className="mt-1 text-2xl font-bold text-yellow-800">
                    {properties.filter(
                      (property) => property.status === "booked"
                    ).length}
                  </p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-700">
                    AVAILABLE
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-800">
                    {properties.filter(
                      (property) => property.status === "sale"
                    ).length}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-600">
                    TOTAL LISTINGS
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">
                    {properties.length}
                  </p>
                </div>
              </div>

              <div className={s.grid}>
                {sortedProperties.map((property) => (
                  <PropertyCard
                    key={property._id}
                    property={property}
                    renderActions={() => (
                      <div className={s.actionContainer}>

                        {/* SOLD PROPERTY BADGE */}
                        {property.status === "sold" && (
                          <div className="w-full mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold tracking-wider text-red-700">
                              <HiOutlineCheckCircle size={15} />
                              PROPERTY SOLD
                            </span>

                            <p className="mt-2 text-xs font-medium text-green-700">
                              Full payment completed successfully.
                            </p>
                          </div>
                        )}

                        {/* BOOKED PROPERTY BADGE */}
                        {property.status === "booked" && (
                          <div className="w-full mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                            <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-bold tracking-wider text-yellow-800">
                              <HiOutlineCheckCircle size={15} />
                              PROPERTY BOOKED
                            </span>

                            <p className="mt-2 text-xs font-medium text-yellow-800">
                              Advance payment received. Remaining payment pending.
                            </p>
                          </div>
                        )}

                        {/* ADMIN VERIFICATION STATUS */}
                        <div className="w-full mb-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              property.verificationStatus === "approved"
                                ? "bg-green-100 text-green-700"
                                : property.verificationStatus === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {property.verificationStatus === "approved"
                              ? "Admin Approved"
                              : property.verificationStatus === "rejected"
                              ? "Admin Rejected"
                              : "Pending Verification"}
                          </span>
                        </div>

                        {/* ADMIN REJECTION REASON */}
                        {property.verificationStatus === "rejected" && (
                          <div className="w-full mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm font-semibold text-red-700">
                              Property Rejected by Admin
                            </p>

                            <p className="mt-1 text-sm text-red-600">
                              {property.rejectionReason ||
                                "Please review your property information and correct the issues."}
                            </p>

                            <p className="mt-2 text-xs font-medium text-red-700">
                              Correct the issues and submit your property again
                              for verification.
                            </p>
                          </div>
                        )}

                        {/* PROPERTY STATUS DROPDOWN */}
                        <div className={s.selectWrapper}>
                          <select
                            value={
                              property.status === "sale"
                                ? "available"
                                : property.status
                            }
                            disabled={property.status === "booked"}
                            onChange={(e) => {
                              const selectedStatus = e.target.value;

                              if (selectedStatus === "available") {
                                updateStatus(
                                  property._id,
                                  getAvailableStatus()
                                );
                              } else if (selectedStatus === "sold") {
                                updateStatus(
                                  property._id,
                                  "sold"
                                );
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`${s.select} ${
                              property.status === "sold"
                                ? s.selectSold
                                : s.selectAvailable
                            } ${
                              property.status === "booked"
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <option value="available">
                              Available
                            </option>

                            <option value="booked">
                              Booked
                            </option>

                            <option value="sold">
                              Sold
                            </option>
                          </select>

                          <div className={s.selectIcon}>
                            <HiOutlineCheckCircle size={14} />
                          </div>
                        </div>

                        {/* EDIT / CORRECT AND RESUBMIT */}
                        <Link
                          to={`/edit-property/${property._id}`}
                          className={s.editButton}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HiOutlinePencilAlt />

                          {property.verificationStatus === "rejected"
                            ? "Correct & Resubmit"
                            : "Edit"}
                        </Link>

                        {/* DELETE PROPERTY */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(property._id);
                          }}
                          className={s.deleteButton}
                          aria-label="Delete property"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    )}
                  />
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default MyProperties;
