
import React, { useEffect, useState } from "react";
import { editPropertyStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import { HiUpload, HiX } from "react-icons/hi";

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    area: "",
    pincode: "",
    propertyType: "flat",
    bhk: "",
    bathrooms: "",
    areaSize: "",
    furnishing: "unfurnished",
    status: "sale",
    amenities: [],
    securityDeposit: "",
    maintenance: "",
  });

  const commonAmenities = [
    "Parking",
    "Pool",
    "Gym",
    "Security",
    "Wifi",
    "Power Backup",
    "Club House",
    "Garden",
  ];

  // Convert an existing saved image into a URL/path string.
  const getExistingImageValue = (image) => {
    if (typeof image === "string") {
      return image;
    }

    return (
      image?.url ||
      image?.secure_url ||
      image?.path ||
      image?.imageUrl ||
      image?.src ||
      ""
    );
  };

  // Support complete URLs and relative backend upload paths.
  const getExistingImageSrc = (image) => {
    const imageValue = getExistingImageValue(image);

    if (!imageValue) return "";

    if (
      imageValue.startsWith("http://") ||
      imageValue.startsWith("https://") ||
      imageValue.startsWith("blob:")
    ) {
      return imageValue;
    }

    return `${API_URL}${imageValue}`;
  };

  // Fetch property details.
  // IMPORTANT: Send the seller's JWT token so the backend
  // can identify the owner of pending or rejected properties.
  useEffect(() => {
    let isMounted = true;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(
          `${API_URL}/api/property/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const p = res.data.property;

        if (!p) {
          throw new Error("Property details were not returned.");
        }

        if (!isMounted) return;

        setFormData({
          title: p.title || "",
          description: p.description || "",
          price: p.price || "",
          city: p.city || "",
          area: p.area || "",
          pincode: p.pincode || "",
          propertyType: p.propertyType || "flat",
          bhk: p.bhk || "",
          bathrooms: p.bathrooms || "",
          areaSize: p.areaSize || "",
          furnishing: p.furnishing || "unfurnished",
          status: p.status || "sale",
          amenities: p.amenities || [],
          securityDeposit: p.securityDeposit || "",
          maintenance: p.maintenance || "",
        });

        // Support both images and Images.
        const savedImages = p.images || p.Images || [];

        setExistingImages(
          savedImages
            .map((image) => getExistingImageValue(image))
            .filter(Boolean)
        );
      } catch (err) {
        console.error(
          "FETCH_PROPERTY_ERROR:",
          err.response?.data || err
        );

        if (isMounted) {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Failed to load property details."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id && token) {
      fetchProperty();
    } else if (!token) {
      setLoading(false);
      setError("Please log in to edit this property.");
    }

    return () => {
      isMounted = false;
    };
  }, [id, token]);

  // Clean up generated image preview URLs.
  useEffect(() => {
    return () => {
      newImagePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [newImagePreviews]);

  // Handle input changes.
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle amenities.
  const handleAmenityChange = (amenity) => {
    setFormData((prev) => {
      const current = prev.amenities || [];

      if (current.includes(amenity)) {
        return {
          ...prev,
          amenities: current.filter((a) => a !== amenity),
        };
      }

      return {
        ...prev,
        amenities: [...current, amenity],
      };
    });
  };

  // Handle new image uploads.
  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (existingImages.length + newImages.length + files.length > 10) {
      setError("Total images cannot exceed 10.");
      e.target.value = "";
      return;
    }

    setError(null);

    setNewImages((prev) => [...prev, ...files]);

    const previews = files.map((file) =>
      URL.createObjectURL(file)
    );

    setNewImagePreviews((prev) => [
      ...prev,
      ...previews,
    ]);

    // Allow selecting the same file again if needed.
    e.target.value = "";
  };

  // Remove an existing image.
  const removeExistingImage = (url) => {
    setExistingImages((prev) =>
      prev.filter((img) => img !== url)
    );
  };

  // Remove a newly selected image.
  const removeNewImage = (index) => {
    setNewImages((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setNewImagePreviews((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // Submit updated property.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = Number(formData.price);
    const bhk = Number(formData.bhk);
    const bathrooms = Number(formData.bathrooms);
    const areaSize = Number(formData.areaSize);

    if (!formData.price || price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (!formData.bhk || bhk <= 0) {
      setError("BHK must be greater than 0.");
      return;
    }

    if (!formData.bathrooms || bathrooms <= 0) {
      setError("Bathrooms must be greater than 0.");
      return;
    }

    if (!formData.areaSize || areaSize <= 0) {
      setError("Area (Sq.Ft) must be greater than 0.");
      return;
    }

    if (!token) {
      setError("Please log in again to update this property.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const data = new FormData();

    Object.keys(formData).forEach((key) => {
      if (key === "amenities") {
        data.append("amenities", JSON.stringify(formData[key]));
      } else if (
        key === "securityDeposit" ||
        key === "maintenance"
      ) {
        data.append(key, formData[key] || 0);
      } else {
        data.append(key, formData[key]);
      }
    });

    data.append(
      "existingImages",
      JSON.stringify(existingImages)
    );

    newImages.forEach((img) => {
      data.append("images", img);
    });

    try {
      const response = await axios.put(
        `${API_URL}/api/property/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(
        response.data.message ||
        "Property updated successfully. Waiting for admin verification."
      );

      navigate("/dashboard");
    } catch (err) {
      console.error(
        "UPDATE_PROPERTY_ERROR:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
        "Failed to update property."
      );

      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-full-page">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      <div className={s.innerContainer}>
        <div className={s.headerWrapper}>
          <h1 className={s.pageTitle}>Edit Property</h1>

          <p className={s.pageSubtitle}>
            Update your property details and manage images.
          </p>
        </div>

        <form
          id="edit-property-form"
          onSubmit={handleSubmit}
          className={s.formContainer}
        >
          {error && (
            <div
              style={{
                padding: "1rem",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              {error}
            </div>
          )}

          <div className={s.section}>
            <div className={s.sectionHeader}>
              <div className={s.sectionIndicator}></div>
              <h3 className={s.sectionTitle}>
                Content & Description
              </h3>
            </div>

            <div className={s.sectionContent}>
              <div>
                <label className={s.label}>
                  Property Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Luxury 3BHK Apartment in Downtown"
                  className={s.input}
                  required
                />
              </div>

              <div>
                <label className={s.label}>
                  Detailed Description
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the property highlights..."
                  className={s.textarea}
                  required
                ></textarea>
              </div>
            </div>
          </div>

          <div className={s.twoColumnGrid}>
            {/* Property Details */}
            <div>
              <div className={s.sectionHeader}>
                <div className={s.sectionIndicator}></div>
                <h3 className={s.sectionTitle}>
                  Property Details
                </h3>
              </div>

              <div className={s.sectionContent}>
                <div>
                  <label className={s.label}>
                    Property Type
                  </label>

                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    className={s.select}
                  >
                    <option value="flat">Flat/Apartment</option>
                    <option value="villa">
                      Independent House/Villa
                    </option>
                    <option value="penthouse">Penthouse</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div className={s.threeColumnGrid}>
                  <div>
                    <label className={s.label}>BHK</label>

                    <input
                      type="number"
                      name="bhk"
                      value={formData.bhk}
                      onChange={handleInputChange}
                      placeholder="e.g. 3"
                      className={s.input}
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className={s.label}>
                      Bathrooms
                    </label>

                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. 2"
                      className={s.input}
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className={s.label}>
                      Area (Sq.Ft)
                    </label>

                    <input
                      type="number"
                      name="areaSize"
                      value={formData.areaSize}
                      onChange={handleInputChange}
                      placeholder="e.g. 1500"
                      className={s.input}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className={s.twoColumnGridInner}>
                  <div>
                    <label className={s.label}>
                      Furnishing
                    </label>

                    <select
                      name="furnishing"
                      value={formData.furnishing}
                      onChange={handleInputChange}
                      className={s.select}
                    >
                      <option value="unfurnished">
                        Unfurnished
                      </option>
                      <option value="semi-furnished">
                        Semi-Furnished
                      </option>
                      <option value="furnished">
                        Fully Furnished
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className={s.label}>
                      Listing Status
                    </label>

                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={s.select}
                    >
                      <option value="sale">For Sale</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Location */}
            <div>
              <div className={s.sectionHeader}>
                <div className={s.sectionIndicator}></div>
                <h3 className={s.sectionTitle}>
                  Pricing & Location
                </h3>
              </div>

              <div className={s.sectionContent}>
                <div>
                  <label className={s.label}>
                    Price (₹)
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 5000000"
                    className={s.input}
                    min="1"
                    required
                  />
                </div>

                <div className={s.twoColumnGridInner}>
                  <div>
                    <label className={s.label}>City</label>

                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Kathmandu"
                      className={s.input}
                      required
                    />
                  </div>

                  <div>
                    <label className={s.label}>
                      Pincode
                    </label>

                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="e.g. 44600"
                      className={s.input}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={s.label}>
                    Specific Area
                  </label>

                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="e.g. Baneshwor"
                    className={s.input}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <div className={s.sectionIndicator}></div>
              <h3 className={s.sectionTitle}>Amenities</h3>
            </div>

            <div className={s.amenitiesGrid}>
              {commonAmenities.map((amenity) => (
                <label
                  key={amenity}
                  className={s.amenityLabel(
                    formData.amenities.includes(amenity)
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => handleAmenityChange(amenity)}
                    className={s.amenityCheckbox}
                  />

                  <span
                    className={s.amenityText(
                      formData.amenities.includes(amenity)
                    )}
                  >
                    {amenity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Image Management */}
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <div className={s.sectionIndicator}></div>
              <h3 className={s.sectionTitle}>
                Image Management
              </h3>
            </div>

            <div className={s.imageGrid}>
              {/* Existing Images */}
              {existingImages.map((src, i) => (
                <div
                  key={`existing-${i}`}
                  className={s.imageCard}
                >
                  <img
                    src={getExistingImageSrc(src)}
                    alt={`Existing property ${i + 1}`}
                    className={s.imageCardImg}
                  />

                  <button
                    type="button"
                    onClick={() => removeExistingImage(src)}
                    className={s.removeImageBtn}
                  >
                    <HiX size={12} />
                  </button>

                  <div className={s.imageBadgeExisting}>
                    EXISTING
                  </div>
                </div>
              ))}

              {/* New Image Previews */}
              {newImagePreviews.map((src, i) => (
                <div
                  key={`new-${i}`}
                  className={s.imageCardNew}
                >
                  <img
                    src={src}
                    alt={`New property preview ${i + 1}`}
                    className={s.imageCardImg}
                  />

                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className={s.removeImageBtn}
                  >
                    <HiX size={12} />
                  </button>

                  <div className={s.imageBadgeNew}>
                    NEW
                  </div>
                </div>
              ))}

              {/* Upload Button */}
              {existingImages.length + newImages.length < 10 && (
                <div className={s.uploadCard}>
                  <input
                    type="file"
                    multiple
                    onChange={handleNewImageChange}
                    className={s.uploadInput}
                    accept="image/*"
                  />

                  <HiUpload size={22} color="#64748b" />

                  <span className={s.uploadText}>
                    Add Image
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className={s.formActions}>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={s.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={s.submitButton}
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProperty;
