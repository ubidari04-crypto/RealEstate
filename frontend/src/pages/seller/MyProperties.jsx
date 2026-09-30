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

  // Fetch the properties created by the logged-in seller
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

  // Delete a property
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

  // Update a property's status
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
      alert("Failed to update status.");
    }
  };

  // The backend stores available properties as "sale"
  const getAvailableStatus = () => {
    return "sale";
  };

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

        {!error && (!Array.isArray(properties) || properties.length === 0) ? (
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
            <div className={s.grid}>
              {properties.map((property) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  renderActions={() => (
                    <div className={s.actionContainer}>
                      <div className={s.selectWrapper}>
                        <select
                          value={
                            property.status === "sale"
                              ? "available"
                              : property.status
                          }
                          onChange={(e) => {
                            const selectedStatus = e.target.value;

                            if (selectedStatus === "available") {
                              updateStatus(
                                property._id,
                                getAvailableStatus()
                              );
                            } else {
                              updateStatus(property._id, selectedStatus);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`${s.select} ${
                            property.status === "sold"
                              ? s.selectSold
                              : s.selectAvailable
                          }`}
                        >
                          <option value="available">Available</option>
                          <option value="sold">Sold</option>
                        </select>

                        <div className={s.selectIcon}>
                          <HiOutlineCheckCircle size={14} />
                        </div>
                      </div>

                      <Link
                        to={`/edit-property/${property._id}`}
                        className={s.editButton}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HiOutlinePencilAlt />
                        Edit
                      </Link>

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
          )
        )}
      </div>
    </div>
  );
};

export default MyProperties;