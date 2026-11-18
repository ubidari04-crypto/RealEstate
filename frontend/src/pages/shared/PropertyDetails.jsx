
import React, { useEffect, useState, useRef } from "react";
import { propertyDetailsStyles as s } from "../../assets/dummyStyles";
import Navbar from "../../components/common/Navbar";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import API_URL from "../../config";
import PropertyCard from "../../components/common/propertyCard";

import {
  HiBadgeCheck,
  HiCalendar,
  HiChatAlt,
  HiChevronLeft,
  HiChevronRight,
  HiCollection,
  HiHeart,
  HiLocationMarker,
  HiOutlineHeart,
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineViewGrid,
  HiX,
} from "react-icons/hi";

const PropertyDetails = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [inquiry, setInquiry] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [inquiryStatus, setInquiryStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const [isInWishlist, setIsInWishlist] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Khalti booking loading state
  const [bookingLoading, setBookingLoading] = useState(false);

  // Prevent duplicate tracking from repeated effect execution
  const trackedViews = useRef(new Set());

  // ------------------------------------------
  // FETCH PROPERTY DETAILS
  // ------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(
          `${API_URL}/api/property/${id}`,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
          }
        );

        if (cancelled) return;

        const fetchedProperty = res.data.property;

        if (!fetchedProperty) {
          throw new Error("Property not found.");
        }

        setProperty(fetchedProperty);

        setSimilarProperties(
          res.data.similarProperties || []
        );

        // ----------------------------------
        // TRACK PROPERTY VIEW FOR BUYERS
        // ----------------------------------

        if (
          user &&
          user.role === "buyer" &&
          token &&
          fetchedProperty._id
        ) {
          const trackingKey = `${user._id || user.id}-${id}`;

          if (!trackedViews.current.has(trackingKey)) {
            trackedViews.current.add(trackingKey);

            axios
              .post(
                `${API_URL}/api/recommendations/track-view/${id}`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              .then((trackRes) => {
                console.log(
                  "Property view tracked:",
                  trackRes.data.message
                );
              })
              .catch((trackError) => {
                trackedViews.current.delete(trackingKey);

                console.error(
                  "Failed to track property view:",
                  trackError.response?.data ||
                    trackError.message
                );
              });
          }

          // ----------------------------------
          // FETCH BUYER WISHLIST
          // ----------------------------------

          try {
            const wishRes = await axios.get(
              `${API_URL}/api/wishlist`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (cancelled) return;

            const wishlistData = Array.isArray(wishRes.data)
              ? wishRes.data
              : wishRes.data.wishlist || [];

            const found = wishlistData.some(
              (item) =>
                String(item.property?._id || item.property) ===
                String(id)
            );

            setIsInWishlist(found);
          } catch (wishlistError) {
            console.error(
              "Failed to fetch wishlist:",
              wishlistError.response?.data ||
                wishlistError.message
            );

            setIsInWishlist(false);
          }
        } else {
          setIsInWishlist(false);
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load property details:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load property details."
        );

        setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [id, user, token]);

  // ------------------------------------------
  // HANDLE WISHLIST TOGGLE
  // ------------------------------------------

  const handleWishlistToggle = async () => {
    if (!user) {
      return navigate("/login");
    }

    if (user.role !== "buyer") {
      return;
    }

    try {
      if (isInWishlist) {
        await axios.delete(
          `${API_URL}/api/wishlist/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setIsInWishlist(false);

        navigate("/wishlist");
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${id}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setIsInWishlist(true);
      }
    } catch (err) {
      console.error(
        "Failed to update wishlist:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to update wishlist"
      );
    }
  };

  // ------------------------------------------
  // HANDLE INQUIRY SUBMIT
  // ------------------------------------------

  const handleInquirySubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      return navigate("/login");
    }

    if (user.role !== "buyer") {
      return alert("Only buyers can send inquiries.");
    }

    if (!inquiry.message.trim()) {
      return;
    }

    setInquiryStatus({
      loading: true,
      success: false,
      error: null,
    });

    try {
      await axios.post(
        `${API_URL}/api/inquiry`,
        {
          propertyId: id,
          message: inquiry.message,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setInquiryStatus({
        loading: false,
        success: true,
        error: null,
      });

      setInquiry((prev) => ({
        ...prev,
        message: "",
      }));
    } catch (err) {
      console.error(
        "Failed to send inquiry:",
        err
      );

      setInquiryStatus({
        loading: false,
        success: false,
        error:
          err.response?.data?.message ||
          "Failed to send inquiry.",
      });
    }
  };

  // ------------------------------------------
  // START CHAT
  // ------------------------------------------

  const handleChatStart = async () => {
    if (!user) {
      return navigate("/login");
    }

    if (user.role !== "buyer") {
      return alert("Only buyers can chat with sellers.");
    }

    if (!property?.seller?._id) {
      return alert("Seller information is unavailable.");
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/chat/start`,
        {
          propertyId: property._id,
          sellerId: property.seller._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const chat = res.data.chat || res.data;

      const images = property.images || [];

      await axios.post(
        `${API_URL}/api/chat/send`,
        {
          chatId: chat._id,
          text: `(Context: Interested in property "${property.title}")`,
          image: images[0] || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/chat-messages", {
        state: {
          chat,
        },
      });
    } catch (err) {
      console.error(
        "Error starting chat:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to start chat."
      );
    }
  };

  // ------------------------------------------
  // HANDLE PROPERTY BOOKING WITH KHALTI
  // ------------------------------------------

  const handleBooking = async () => {
    if (!user) {
      return navigate("/login");
    }

    if (user.role !== "buyer") {
      return alert("Only buyers can book properties.");
    }

    if (!token) {
      return alert("Your login session has expired. Please log in again.");
    }

    if (property.status?.toLowerCase() !== "sale") {
      return alert("Only properties listed for sale can be booked.");
    }

    if (
      String(property.seller?._id) ===
      String(user._id || user.id)
    ) {
      return alert("You cannot book your own property.");
    }

    const propertyPrice = Number(property.price);

    if (!Number.isFinite(propertyPrice) || propertyPrice <= 0) {
      return alert("Invalid property price.");
    }

    const advanceAmount = Math.round(propertyPrice * 0.25);
    const remainingAmount = propertyPrice - advanceAmount;

    const confirmed = window.confirm(
      `Property: ${property.title}\n\n` +
      `Property Price: NPR ${propertyPrice.toLocaleString("en-IN")}\n\n` +
      `Advance Payment (25%): NPR ${advanceAmount.toLocaleString("en-IN")}\n\n` +
      `Remaining Amount (75%): NPR ${remainingAmount.toLocaleString("en-IN")}\n\n` +
      "Do you want to proceed with Khalti payment?"
    );

    if (!confirmed) return;

    try {
      setBookingLoading(true);

      const response = await axios.post(
        `${API_URL}/api/booking/initiate/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Booking initiation response:",
        response.data
      );

      const paymentUrl =
        response.data.paymentUrl ||
        response.data.payment_url;

      if (!paymentUrl) {
        throw new Error(
          "Khalti payment URL was not returned by the server."
        );
      }

      console.log(
        "Khalti pidx:",
        response.data.pidx
      );

      // Redirect buyer to Khalti payment page.
      window.location.href = paymentUrl;
    } catch (err) {
      console.error(
        "Booking initiation error:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          err.message ||
          "Unable to initiate booking. Please try again."
      );

      setBookingLoading(false);
    }
  };

  // ------------------------------------------
  // LIGHTBOX FUNCTIONS
  // ------------------------------------------

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    const images = property?.images || [];

    if (images.length === 0) return;

    setLightboxIndex(
      (prev) => (prev + 1) % images.length
    );
  };

  const prevImage = () => {
    const images = property?.images || [];

    if (images.length === 0) return;

    setLightboxIndex(
      (prev) =>
        (prev - 1 + images.length) % images.length
    );
  };

  // ------------------------------------------
  // LOADING STATE
  // ------------------------------------------

  if (loading) {
    return (
      <div className="loader-full-page">
        <div className="loader"></div>
      </div>
    );
  }

  // ------------------------------------------
  // ERROR STATE
  // ------------------------------------------

  if (error || !property) {
    return (
      <div
        className="container"
        style={{
          padding: "4rem",
          textAlign: "center",
        }}
      >
        {error || "Property not found"}
      </div>
    );
  }

  const images = property.images || [];

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(property.price);

  const advanceAmount = Math.round(Number(property.price) * 0.25);
  const remainingAmount = Number(property.price) - advanceAmount;

  const canBook =
    property.status?.toLowerCase() === "sale" &&
    (!user || user.role === "buyer") &&
    String(property.seller?._id) !==
      String(user?._id || user?.id);

  // ------------------------------------------
  // RENDER PAGE
  // ------------------------------------------

  return (
    <div className={s.pageContainer}>
      <Navbar />

      <main className={s.mainContainer}>
        {/* Breadcrumbs */}

        <nav className={s.breadcrumbs}>
          <Link to="/" className={s.breadcrumbLink}>
            Home
          </Link>

          <HiChevronRight />

          <Link to="/properties" className={s.breadcrumbLink}>
            Listings
          </Link>

          <HiChevronRight />

          <span className={s.breadcrumbCurrent}>
            {property.title}
          </span>
        </nav>

        {/* Gallery */}

        <div
          className={s.galleryContainer}
          style={{
            width: "80%",
            margin: "0 auto",
          }}
        >
          <div
            className={s.galleryGrid}
            style={{
              gridTemplateColumns:
                images.length > 1
                  ? "repeat(4, 1fr)"
                  : "1fr",

              gridTemplateRows:
                images.length > 1
                  ? "repeat(2, 180px)"
                  : "clamp(350px, 32vw, 500px)",
            }}
          >
            {images.length > 0 && (
              <>
                <div
                  className={s.galleryMainItem(
                    images.length > 1
                  )}
                  onClick={() => openLightbox(0)}
                >
                  <img
                    src={images[0]}
                    alt="Property"
                    className={s.galleryImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      background: "transparent",
                    }}
                  />
                </div>

                {images.slice(1, 5).map((img, idx) => (
                  <div
                    key={idx}
                    className={s.gallerySideItem}
                    onClick={() => openLightbox(idx + 1)}
                  >
                    <img
                      src={img}
                      alt="Property"
                      className={s.galleryImage}
                    />

                    {idx === 3 && images.length > 5 && (
                      <div className={s.galleryMoreOverlay}>
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Mobile slider */}

          <div className={s.mobileSliderContainer}>
            <div className={s.mobileSliderTrack}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={s.mobileSlide}
                  onClick={() => openLightbox(idx)}
                >
                  <img
                    src={img}
                    alt="Property"
                    className={s.mobileSlideImage}
                  />

                  <div className={s.mobileSlideCounter}>
                    {idx + 1} / {images.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lightbox */}

        {lightboxIndex !== null &&
          images.length > 0 && (
            <div
              className={s.lightboxOverlay}
              onClick={closeLightbox}
            >
              <button
                onClick={closeLightbox}
                className={s.lightboxCloseBtn}
              >
                <HiX
                  size={24}
                  className={s.lightboxCloseIcon}
                />
              </button>

              <div
                onClick={(e) => e.stopPropagation()}
                className={s.lightboxContent}
              >
                <img
                  src={images[lightboxIndex]}
                  alt="Property"
                  className={s.lightboxImage}
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className={s.lightboxPrevBtn}
                    >
                      <HiChevronLeft size={30} />
                    </button>

                    <button
                      onClick={nextImage}
                      className={s.lightboxNextBtn}
                    >
                      <HiChevronRight size={30} />
                    </button>
                  </>
                )}

                <div className={s.lightboxCounter}>
                  {lightboxIndex + 1} / {images.length}
                </div>
              </div>
            </div>
          )}

        {/* Main content */}

        <div className={s.detailsLayout}>
          <div className={s.infoColumn}>
            <div className={s.infoHeader}>
              <div className={s.titleWrapper}>
                <div className={s.badgeWrapper}>
                  <span className={s.premiumBadge}>
                    Premium Listing
                  </span>
                </div>

                <h1 className={s.propertyTitle}>
                  {property.title}
                </h1>

                <p className={s.propertyLocation}>
                  <HiLocationMarker
                    className={s.locationIcon}
                  />

                  <span className={s.locationText}>
                    {property.area}, {property.city}, Nepal
                  </span>
                </p>
              </div>

              {/* Wishlist button */}

              <div className={s.actionButtons}>
                {(!user || user.role === "buyer") && (
                  <button
                    onClick={handleWishlistToggle}
                    className={s.wishlistButton(isInWishlist)}
                  >
                    {isInWishlist ? (
                      <HiHeart
                        size={26}
                        fill="#ef4444"
                      />
                    ) : (
                      <HiOutlineHeart size={26} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats */}

            <div className={s.statsGrid}>
              {[
                {
                  label: "Bedrooms",
                  value: property.bhk || 0,
                  icon: HiOutlineHome,
                },
                {
                  label: "Bathrooms",
                  value:
                    property.bathrooms ||
                    Math.max(
                      1,
                      (parseInt(property.bhk) || 1) - 1
                    ),
                  icon: HiOutlineUserGroup,
                },
                {
                  label: "Furnishing",
                  value: property.furnishing || "N/A",
                  icon: HiCollection,
                },
                {
                  label: "Living Area",
                  value: `${property.areaSize} sqft`,
                  icon: HiOutlineViewGrid,
                },
                {
                  label: "Type",
                  value: property.propertyType,
                  icon: HiCalendar,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={s.statCard}
                >
                  {stat.icon && (
                    <stat.icon
                      size={18}
                      className={s.statIcon}
                    />
                  )}

                  <div className={s.statValue}>
                    {stat.value}
                  </div>

                  <div className={s.statLabel}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}

            <div className={s.descriptionSection}>
              <h3 className={s.sectionTitle}>
                Description
              </h3>

              <p className={s.descriptionText}>
                {property.description ||
                  "No description available for the property"}
              </p>
            </div>

            {/* Amenities */}

            <div className={s.amenitiesSection}>
              <h3 className={s.sectionTitle}>
                Amenities
              </h3>

              <div className={s.amenitiesGrid}>
                {(property.amenities?.length
                  ? property.amenities
                  : [
                      "Parking",
                      "Security",
                      "Water Supply",
                      "Power Backup",
                    ]
                ).map((amn, i) => (
                  <div
                    key={i}
                    className={s.amenityItem}
                  >
                    <HiBadgeCheck
                      size={18}
                      className={s.amenityIcon}
                    />

                    <span className={s.amenityText}>
                      {amn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}

          <div className={s.sidebarColumn}>
            {/* Price card */}

            <div
              className={s.priceCard}
              style={{
                background: "var(--primary)",
              }}
            >
              <div className={s.priceCardLabel}>
                {property.status?.toLowerCase() === "rent"
                  ? "Rental Details"
                  : "Listing Price"}
              </div>

              <div className={s.priceCardValue}>
                {property.status?.toLowerCase() === "rent"
                  ? `₹${Number(property.price).toLocaleString(
                      "en-IN"
                    )}`
                  : formattedPrice}

                {property.status?.toLowerCase() === "rent" && (
                  <span className={s.priceCardPeriod}>
                    {" "}
                    /month
                  </span>
                )}
              </div>

              {property.status?.toLowerCase() === "rent" && (
                <div className={s.rentDetails}>
                  <div className={s.rentDetailRow}>
                    <span className={s.rentDetailLabel}>
                      Security Deposit
                    </span>

                    <span className={s.rentDetailValue}>
                      RS{" "}
                      {Number(
                        property.securityDeposit || 0
                      ).toLocaleString("en-NP")}
                    </span>
                  </div>

                  <div className={s.rentDetailRow}>
                    <span className={s.rentDetailLabel}>
                      Maintenance
                    </span>

                    <span className={s.rentDetailValue}>
                      RS{" "}
                      {Number(
                        property.maintenace || 0
                      ).toLocaleString("en-NP")}
                      /mo
                    </span>
                  </div>
                </div>
              )}

              <div className={s.priceCardAvailability}>
                Available for{" "}
                {property.status?.toLowerCase() === "rent"
                  ? "Rent"
                  : "Sale"}
              </div>
            </div>

            {/* Book Now Button */}

            {canBook && (
              <div className="bg-white rounded-xl shadow-md p-5 mb-5">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Interested in this property?
                </h3>

                <p className="text-sm text-gray-500 mb-4">
                  Pay 25% advance through Khalti to initiate your booking.
                </p>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    Advance (25%)
                  </span>

                  <span className="font-semibold text-gray-800">
                    NPR {advanceAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-600">
                    Remaining (75%)
                  </span>

                  <span className="font-semibold text-gray-800">
                    NPR {remainingAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={bookingLoading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition duration-200"
                >
                  {bookingLoading
                    ? "Processing..."
                    : user
                    ? "Book Now"
                    : "Login to Book"}
                </button>
              </div>
            )}

            {/* Seller & contact */}

            <div className={s.sellerCard}>
              <div className={s.sellerInfo}>
                <div className={s.sellerAvatar}>
                  <img
                    src={
                      property.seller?.profilePic ||
                      `https://ui-avatars.com/api/?name=${
                        property.seller?.name || "Seller"
                      }&background=0d6e59&color=fff`
                    }
                    alt="Agent"
                    className={s.sellerAvatarImage}
                  />
                </div>

                <div className={s.sellerDetails}>
                  <div className={s.sellerNameLink}>
                    <h4 className={s.sellerName}>
                      {property.seller?.name || "Seller"}
                    </h4>
                  </div>

                  <div className={s.sellerVerifiedBadge}>
                    <HiBadgeCheck
                      className={s.verifiedIcon}
                    />{" "}
                    Verified Seller
                  </div>
                </div>
              </div>

              {/* Chat */}

              <div className={s.chatButtonWrapper}>
                <button
                  className={s.chatButton}
                  onClick={handleChatStart}
                >
                  <HiChatAlt /> Chat
                </button>
              </div>

              {/* Inquiry form */}

              <h4 className={s.inquiryFormTitle}>
                Inquire
              </h4>

              <form onSubmit={handleInquirySubmit}>
                {user?.role === "buyer" ? (
                  <>
                    <textarea
                      placeholder="Your Message..."
                      value={inquiry.message}
                      onChange={(e) =>
                        setInquiry((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className={s.inquiryTextarea}
                      required
                    />

                    <button
                      type="submit"
                      className={s.inquirySubmitButton}
                      disabled={inquiryStatus.loading}
                    >
                      {inquiryStatus.loading
                        ? "Sending..."
                        : "Send Inquiry"}
                    </button>

                    {inquiryStatus.success && (
                      <p className={s.inquirySuccessMessage}>
                        Inquiry sent!
                      </p>
                    )}

                    {inquiryStatus.error && (
                      <p
                        className={
                          s.inquiryErrorMessage ||
                          s.inquirySuccessMessage
                        }
                      >
                        {inquiryStatus.error}
                      </p>
                    )}
                  </>
                ) : (
                  <div className={s.inquiryDisabledMessage}>
                    <p className={s.inquiryDisabledText}>
                      {user
                        ? "Only buyers can send inquiries."
                        : "Please login as a buyer to send inquiries."}
                    </p>

                    {!user && (
                      <Link
                        to="/login"
                        className={s.inquiryLoginButton}
                      >
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Additional Details */}

        <div className={s.additionalDetails}>
          <h3 className={s.detailsTitle}>
            Property Details
          </h3>

          <div className={s.detailsGrid}>
            {[
              {
                label: "Property ID",
                value: property._id
                  .slice(-8)
                  .toUpperCase(),
              },
              {
                label: "Added On",
                value: new Date(
                  property.createdAt
                ).toLocaleDateString(),
              },
              {
                label: "Property Type",
                value: property.propertyType,
              },
              {
                label: "Status",
                value: `For ${property.status}`,
              },
            ].map((detail, i) => (
              <div
                key={i}
                className={s.detailRow}
              >
                <span className={s.detailValue}>
                  {detail.label}
                </span>

                <span className={s.detailValue}>
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Similar Properties */}

        <section className={s.similarSection}>
          <div className={s.similarHeader}>
            <div>
              <h2 className={s.similarTitle}>
                Similar Properties
              </h2>

              <p className={s.similarSubtitle}>
                Listings you might like in {property.city}.
              </p>
            </div>

            <Link
              to="/properties"
              className={s.similarAllLink}
            >
              All Listings <HiChevronRight />
            </Link>
          </div>

          <div className={s.similarGrid}>
            {similarProperties.length > 0 ? (
              similarProperties
                .slice(0, 3)
                .map((p) => (
                  <PropertyCard
                    key={p._id}
                    property={p}
                  />
                ))
            ) : (
              <div className={s.similarEmptyState}>
                No similar properties found in this location.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PropertyDetails;
