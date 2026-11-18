
import React, { useEffect, useRef, useState } from "react";
import { propertiesStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import {
  HiAdjustments,
  HiFilter,
  HiSearch,
  HiViewGrid,
  HiViewList,
  HiX,
} from "react-icons/hi";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";
import PropertyCard from "../../components/common/propertyCard";

const Properties = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();

  const isBuyer = String(user?.role || "").toLowerCase() === "buyer";

  const [properties, setProperties] = useState([]);
  const [bestMatch, setBestMatch] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState([]);

  // Booking details
  const [bookings, setBookings] = useState([]);
  const [bookedPropertiesLoading, setBookedPropertiesLoading] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [remainingPaymentError, setRemainingPaymentError] = useState("");

  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchTimer = useRef(null);
  const propertyRequestId = useRef(0);

  const [filters, setFilters] = useState({
    district: "",
    area: "",
    city: "",
    propertyType: [],
    bhk: "",
    maxPrice: 100000000,
    amenities: [],
    furnishing: [],
    sort: "latest",
  });

  const propertyTypes = [
    { label: "Flat/Apartment", value: "flat" },
    { label: "Independent House/Villa", value: "villa" },
    { label: "Penthouse", value: "penthouse" },
    { label: "Commercial", value: "commercial" },
  ];

  const bhkOptions = ["1", "2", "3", "4", "5+"];

  const furnishingOptions = [
    { label: "Furnished", value: "furnished" },
    { label: "Semi-Furnished", value: "semi-furnished" },
    { label: "Unfurnished", value: "unfurnished" },
  ];

  // Clear any pending filter request.
  const clearPendingFetch = () => {
    if (fetchTimer.current) {
      clearTimeout(fetchTimer.current);
      fetchTimer.current = null;
    }
  };

  // Format currency.
  const formatPrice = (amount) => {
    return `NPR ${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  // Fetch properties using the existing API.
  const fetchProperties = async (currentFilters) => {
    const requestId = ++propertyRequestId.current;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (currentFilters.district) {
        params.append("district", currentFilters.district);
      }

      if (currentFilters.area) {
        params.append("area", currentFilters.area);
      }

      if (currentFilters.city?.trim()) {
        params.append("city", currentFilters.city.trim());
      }

      if (currentFilters.propertyType?.length > 0) {
        params.append(
          "propertyType",
          currentFilters.propertyType.join(",")
        );
      }

      if (currentFilters.bhk) {
        params.append("bhk", currentFilters.bhk);
      }

      if (currentFilters.maxPrice) {
        params.append("maxPrice", currentFilters.maxPrice);
      }

      if (currentFilters.furnishing?.length > 0) {
        params.append(
          "furnishing",
          currentFilters.furnishing.join(",")
        );
      }

      if (currentFilters.amenities?.length > 0) {
        params.append(
          "amenities",
          currentFilters.amenities.join(",")
        );
      }

      if (currentFilters.sort) {
        params.append("sort", currentFilters.sort);
      }

      const response = await axios.get(
        `${API_URL}/api/property?${params.toString()}`
      );

      if (requestId !== propertyRequestId.current) return;

      const propertyList = Array.isArray(response.data.properties)
        ? response.data.properties
        : [];

      setProperties(propertyList);
      setError(null);
    } catch (err) {
      if (requestId !== propertyRequestId.current) return;

      console.error(
        "Failed to fetch properties:",
        err.response?.data || err.message
      );

      setError("Failed to load properties. Please try again later.");
      setProperties([]);
    } finally {
      if (requestId === propertyRequestId.current) {
        setLoading(false);
      }
    }
  };

  // Load districts and areas.
  useEffect(() => {
    let cancelled = false;

    const fetchLocations = async () => {
      try {
        const params = {};

        if (filters.district) {
          params.district = filters.district;
        }

        const response = await axios.get(
          `${API_URL}/api/property/locations`,
          { params }
        );

        if (cancelled) return;

        if (response.data.success) {
          setDistricts(response.data.districts || []);
          setAreas(response.data.areas || []);
        } else {
          setDistricts([]);
          setAreas([]);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to fetch locations:", err);
        setDistricts([]);
        setAreas([]);
      }
    };

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, [filters.district]);

  // Load filters from URL and fetch matching properties.
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    const district = queryParams.get("district") || "";
    const area = queryParams.get("area") || "";
    const city = queryParams.get("city") || "";

    const type =
      queryParams.get("type") ||
      queryParams.get("propertyType") ||
      "";

    const bhk = queryParams.get("bhk") || "";

    const initialFilters = {
      district,
      area,
      city,
      propertyType: type ? type.split(",") : [],
      bhk,
      maxPrice: 100000000,
      amenities: [],
      furnishing: [],
      sort: "latest",
    };

    setFilters(initialFilters);
    fetchProperties(initialFilters);

    return () => {
      propertyRequestId.current += 1;
    };
  }, [location.search]);

  // Fetch the logged-in user's wishlist.
  useEffect(() => {
    let cancelled = false;

    const fetchWishlist = async () => {
      if (!user || !token) {
        setWishlistedIds([]);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/api/wishlist`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cancelled) return;

        const wishlistItems = Array.isArray(response.data)
          ? response.data
          : response.data.wishlist || response.data.items || [];

        setWishlistedIds(
          wishlistItems
            .filter((item) => item.property)
            .map((item) => String(item.property._id))
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch wishlist:", err);
        }
      }
    };

    fetchWishlist();

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  // Fetch AI recommendations for logged-in buyers.
  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      if (!user || !token || !isBuyer) {
        setBestMatch(null);
        setSimilarProperties([]);
        setRecommendationLoading(false);
        return;
      }

      try {
        setRecommendationLoading(true);

        const response = await axios.get(
          `${API_URL}/api/recommendations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cancelled) return;

        if (response.data.success) {
          setBestMatch(response.data.bestMatch || null);
          setSimilarProperties(
            response.data.similarProperties || []
          );
        } else {
          setBestMatch(null);
          setSimilarProperties([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to fetch recommendations:",
            err.response?.data || err.message
          );

          setBestMatch(null);
          setSimilarProperties([]);
        }
      } finally {
        if (!cancelled) {
          setRecommendationLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [user, token, isBuyer]);

  // Fetch booking details for the logged-in buyer.
  // This endpoint returns both property details and the booking ID.
  useEffect(() => {
    let cancelled = false;

    const fetchMyBookings = async () => {
      if (!user || !token || !isBuyer) {
        setBookings([]);
        setBookedPropertiesLoading(false);
        return;
      }

      try {
        setBookedPropertiesLoading(true);

        const response = await axios.get(
          `${API_URL}/api/booking/my-bookings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cancelled) return;

        if (response.data.success) {
          setBookings(
            Array.isArray(response.data.bookings)
              ? response.data.bookings
              : []
          );
        } else {
          setBookings([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to fetch booking details:",
            err.response?.data || err.message
          );

          setBookings([]);
        }
      } finally {
        if (!cancelled) {
          setBookedPropertiesLoading(false);
        }
      }
    };

    fetchMyBookings();

    return () => {
      cancelled = true;
    };
  }, [user, token, isBuyer]);

  // Initiate remaining 75% payment.
  const handlePayRemaining = async (bookingId) => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    if (!bookingId) {
      setRemainingPaymentError("Booking information is missing.");
      return;
    }

    try {
      setRemainingPaymentError("");
      setPayingBookingId(String(bookingId));

      const response = await axios.post(
        `${API_URL}/api/booking/remaining/initiate/${bookingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        response.data.success &&
        response.data.paymentUrl
      ) {
        // Redirect the buyer to Khalti payment.
        window.location.href = response.data.paymentUrl;
        return;
      }

      throw new Error(
        response.data.message ||
          "Unable to initiate remaining payment."
      );
    } catch (err) {
      console.error(
        "Remaining payment initiation error:",
        err.response?.data || err.message
      );

      setRemainingPaymentError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start remaining payment. Please try again."
      );
    } finally {
      setPayingBookingId(null);
    }
  };

  // Add or remove a property from wishlist.
  const handleToggleWishlist = async (propertyId) => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    try {
      const isWishlisted = wishlistedIds.includes(
        String(propertyId)
      );

      if (isWishlisted) {
        await axios.delete(
          `${API_URL}/api/wishlist/${propertyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setWishlistedIds((previous) =>
          previous.filter((id) => id !== String(propertyId))
        );
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${propertyId}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setWishlistedIds((previous) =>
          previous.includes(String(propertyId))
            ? previous
            : [...previous, String(propertyId)]
        );
      }
    } catch (err) {
      console.error(
        "Failed to toggle wishlist:",
        err.response?.data || err.message
      );
    }
  };

  // Debounce text and slider filters.
  const debouncedFetch = (updatedFilters) => {
    clearPendingFetch();

    fetchTimer.current = setTimeout(() => {
      fetchTimer.current = null;
      fetchProperties(updatedFilters);
    }, 500);
  };

  // Handle district selection.
  const handleDistrictChange = (event) => {
    const selectedDistrict = event.target.value;

    const updatedFilters = {
      ...filters,
      district: selectedDistrict,
      area: "",
    };

    setFilters(updatedFilters);
    setAreas([]);

    clearPendingFetch();
    fetchProperties(updatedFilters);
  };

  // Handle area selection.
  const handleAreaChange = (event) => {
    const updatedFilters = {
      ...filters,
      area: event.target.value,
    };

    setFilters(updatedFilters);

    clearPendingFetch();
    fetchProperties(updatedFilters);
  };

  // Handle property type and furnishing checkboxes.
  const handleCheckboxChange = (category, value) => {
    const current = [...(filters[category] || [])];
    const index = current.indexOf(value);

    if (index === -1) {
      current.push(value);
    } else {
      current.splice(index, 1);
    }

    const updatedFilters = {
      ...filters,
      [category]: current,
    };

    setFilters(updatedFilters);

    clearPendingFetch();
    fetchProperties(updatedFilters);
  };

  // Handle price slider.
  const handlePriceChange = (event) => {
    const value = Number(event.target.value);

    const updatedFilters = {
      ...filters,
      maxPrice: value,
    };

    setFilters(updatedFilters);
    debouncedFetch(updatedFilters);
  };

  // Handle BHK selection.
  const handleBhkSelect = (value) => {
    const updatedFilters = {
      ...filters,
      bhk: filters.bhk === value ? "" : value,
    };

    setFilters(updatedFilters);

    clearPendingFetch();
    fetchProperties(updatedFilters);
  };

  // Handle sorting.
  const handleSortChange = (event) => {
    const updatedFilters = {
      ...filters,
      sort: event.target.value,
    };

    setFilters(updatedFilters);

    clearPendingFetch();
    fetchProperties(updatedFilters);
  };

  // Apply current filters.
  const applyFilters = () => {
    clearPendingFetch();
    fetchProperties(filters);
    setShowMobileFilters(false);
  };

  // Reset filters.
  const resetFilters = () => {
    clearPendingFetch();

    const reset = {
      district: "",
      area: "",
      city: "",
      propertyType: [],
      bhk: "",
      maxPrice: 100000000,
      amenities: [],
      furnishing: [],
      sort: "latest",
    };

    setFilters(reset);
    setAreas([]);
    navigate("/properties");

    fetchProperties(reset);
  };

  // Extract booked properties from booking records.
  const bookedProperties = bookings
    .filter((booking) => booking.property)
    .map((booking) => booking.property);

  // IDs of properties already booked by this buyer.
  const bookedPropertyIds = new Set(
    bookedProperties.map((property) => String(property._id))
  );

  // Combine best match and similar properties.
  // Exclude properties that the buyer has already booked.
  const recommendationItems = [
    ...(bestMatch
      ? [{ ...bestMatch, displayLabel: "Best Match" }]
      : []),

    ...similarProperties.map((item) => ({
      ...item,
      displayLabel: "Similar Property",
    })),
  ].filter(
    (item) =>
      item.property &&
      !bookedPropertyIds.has(String(item.property._id))
  );

  // Exclude recommended and booked properties from normal results.
  const recommendedPropertyIds = new Set(
    recommendationItems.map((item) =>
      String(item.property._id)
    )
  );

  const otherProperties = properties.filter(
    (property) =>
      property &&
      !recommendedPropertyIds.has(String(property._id)) &&
      !bookedPropertyIds.has(String(property._id))
  );

  // Cleanup pending timers and requests.
  useEffect(() => {
    return () => {
      clearPendingFetch();
      propertyRequestId.current += 1;
    };
  }, []);

  return (
    <div className={s.pageContainer}>
      <Navbar />

      <div className={s.container}>
        <div className={s.mobileFilterButtonWrapper}>
          <button
            onClick={() => setShowMobileFilters(true)}
            className={s.mobileFilterButton}
          >
            <HiFilter /> Show Filters &amp; Search
          </button>
        </div>

        <div className={s.layout}>
          <aside
            className={`${s.sidebar} ${
              showMobileFilters
                ? s.sidebarVisible
                : s.sidebarHidden
            }`}
          >
            <div className={s.sidebarHeader}>
              <div className={s.sidebarTitleWrapper}>
                <HiFilter className={s.sidebarTitleIcon} />
                <h2 className={s.sidebarTitle}>Filters</h2>
              </div>

              <div className={s.sidebarHeaderActions}>
                <button
                  onClick={resetFilters}
                  className={s.resetButton}
                >
                  Reset
                </button>

                <button
                  className={s.closeMobileFilters}
                  onClick={() => setShowMobileFilters(false)}
                  aria-label="Close filters"
                >
                  <HiX />
                </button>
              </div>
            </div>

            <div className={s.filtersScrollArea}>
              {/* District filter */}
              <div className={s.filterSection}>
                <label
                  className={s.filterLabel}
                  htmlFor="district-filter"
                >
                  District
                </label>

                <select
                  id="district-filter"
                  className={s.searchInput}
                  value={filters.district}
                  onChange={handleDistrictChange}
                >
                  <option value="">All districts</option>

                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area filter */}
              <div className={s.filterSection}>
                <label
                  className={s.filterLabel}
                  htmlFor="area-filter"
                >
                  Area
                </label>

                <select
                  id="area-filter"
                  className={s.searchInput}
                  value={filters.area}
                  disabled={!filters.district}
                  onChange={handleAreaChange}
                >
                  <option value="">Any area</option>

                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* City filter */}
              <div className={s.filterSection}>
                <label
                  className={s.filterLabel}
                  htmlFor="city-filter"
                >
                  City
                </label>

                <div className={s.searchInputWrapper}>
                  <HiSearch className={s.searchIcon} />

                  <input
                    id="city-filter"
                    type="text"
                    placeholder="Search by city..."
                    value={filters.city}
                    onChange={(event) => {
                      const updatedFilters = {
                        ...filters,
                        city: event.target.value,
                      };

                      setFilters(updatedFilters);
                      debouncedFetch(updatedFilters);
                    }}
                    className={s.searchInput}
                  />
                </div>
              </div>

              {/* Price range */}
              <div className={s.filterSection}>
                <div className={s.priceHeader}>
                  <label className={s.filterLabel}>
                    Price Range
                  </label>

                  <span className={s.priceValue}>
                    {filters.maxPrice >= 10000000
                      ? `Rs ${(filters.maxPrice / 10000000).toFixed(2)} Cr`
                      : `Rs ${(filters.maxPrice / 100000).toFixed(1)} L`}
                  </span>
                </div>

                <input
                  type="range"
                  min="100000"
                  max="100000000"
                  step="500000"
                  value={filters.maxPrice}
                  onChange={handlePriceChange}
                  className={s.priceSlider}
                />

                <div className={s.priceLabels}>
                  <span>Rs 1L</span>
                  <span>Rs 10Cr</span>
                </div>
              </div>

              {/* Property type */}
              <div className={s.filterSection}>
                <label className={s.filterLabel}>
                  Property Type
                </label>

                <div className={s.checkboxGroup}>
                  {propertyTypes.map((type) => (
                    <label
                      key={type.value}
                      className={s.checkboxLabel}
                    >
                      <input
                        type="checkbox"
                        checked={filters.propertyType.includes(
                          type.value
                        )}
                        onChange={() =>
                          handleCheckboxChange(
                            "propertyType",
                            type.value
                          )
                        }
                        className={s.checkbox}
                      />

                      <span>{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* BHK */}
              <div className={s.filterSection}>
                <label className={s.filterLabel}>
                  BHK (Bedrooms)
                </label>

                <div className={s.bhkGroup}>
                  {bhkOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleBhkSelect(option)}
                      className={`${s.bhkButton} ${
                        filters.bhk === option
                          ? s.bhkButtonActive
                          : s.bhkButtonInactive
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing */}
              <div className={s.filterSection}>
                <label className={s.filterLabel}>
                  Furnishing
                </label>

                <div className={s.checkboxGroup}>
                  {furnishingOptions.map((option) => (
                    <label
                      key={option.value}
                      className={s.checkboxLabel}
                    >
                      <input
                        type="checkbox"
                        checked={filters.furnishing.includes(
                          option.value
                        )}
                        onChange={() =>
                          handleCheckboxChange(
                            "furnishing",
                            option.value
                          )
                        }
                        className={s.checkbox}
                      />

                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Apply filters */}
              <button
                type="button"
                onClick={applyFilters}
                className={s.resetButton}
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className={s.mainContent}>
            <div className={s.contentHeader}>
              <div>
                <span className={s.resultCount}>
                  Showing{" "}
                  <strong className={s.resultCountStrong}>
                    {loading ? "..." : otherProperties.length}
                  </strong>{" "}
                  properties
                </span>
              </div>

              <div className={s.headerControls}>
                {/* Grid/list toggle */}
                <div className={s.viewModeToggle}>
                  <button
                    type="button"
                    aria-label="Grid view"
                    onClick={() => setViewMode("grid")}
                    className={`${s.viewModeButton} ${
                      viewMode === "grid"
                        ? s.viewModeActive
                        : s.viewModeInactive
                    }`}
                  >
                    <HiViewGrid size={20} />
                  </button>

                  <button
                    type="button"
                    aria-label="List view"
                    onClick={() => setViewMode("list")}
                    className={`${s.viewModeButton} ${
                      viewMode === "list"
                        ? s.viewModeActive
                        : s.viewModeInactive
                    }`}
                  >
                    <HiViewList size={20} />
                  </button>
                </div>

                {/* Sorting */}
                <div className={s.sortControl}>
                  <span className={s.sortLabel}>Sort:</span>

                  <select
                    value={filters.sort}
                    onChange={handleSortChange}
                    className={s.sortSelect}
                  >
                    <option value="latest">Latest</option>
                    <option value="priceLow">
                      Price: Low to High
                    </option>
                    <option value="priceHigh">
                      Price: High to Low
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI personalized recommendations */}
            {isBuyer && (
              <section className="mb-8 mt-6">
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                      ✦ AI Powered
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900">
                    Recommended for You
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Recommendations are ranked using your saved preferences,
                    property details, and your browsing, wishlist, and inquiry activity.
                  </p>
                </div>

                {recommendationLoading ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-96 animate-pulse rounded-2xl bg-gray-200"
                      />
                    ))}
                  </div>
                ) : recommendationItems.length > 0 ? (
                  <div className={`${s.propertyList} ${s.propertyListGrid}`}>
                    {recommendationItems.map((item) => (
                      <div
                        key={item.property._id}
                        className="flex min-w-0 flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.displayLabel === "Best Match"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.displayLabel}
                          </span>

                          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700">
                            {item.recommendationScore ?? 0}% Match
                          </span>
                        </div>

                        {item.matchReasons?.length > 0 && (
                          <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">
                            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                              <span aria-hidden="true">✦</span>
                              Why this property?
                            </p>

                            <ul className="space-y-1.5">
                              {item.matchReasons.map((reason, reasonIndex) => (
                                <li
                                  key={`${item.property._id}-reason-${reasonIndex}`}
                                  className="flex items-start gap-2 text-xs leading-5 text-gray-600"
                                >
                                  <span
                                    className="mt-0.5 font-bold text-teal-600"
                                    aria-hidden="true"
                                  >
                                    ✓
                                  </span>

                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <PropertyCard
                          property={item.property}
                          isWishlisted={wishlistedIds.includes(
                            String(item.property._id)
                          )}
                          onToggleWishlist={handleToggleWishlist}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                    <div className="mb-3 text-4xl">🏡</div>

                    <h3 className="font-semibold text-gray-800">
                      No recommendations available yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                      Set your property preferences, browse properties,
                      or add properties to your wishlist to receive
                      personalized recommendations.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* YOUR BOOKED PROPERTIES - AFTER AI RECOMMENDATIONS */}
            {isBuyer && (
              <section className="mb-10 mt-8">
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                      ✓ Your Booking
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900">
                    Your Booked Properties
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    View your booked properties, payment details, and remaining balance.
                  </p>
                </div>

                {/* Remaining payment error */}
                {remainingPaymentError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start justify-between gap-3">
                      <p>{remainingPaymentError}</p>

                      <button
                        type="button"
                        onClick={() => setRemainingPaymentError("")}
                        className="font-bold text-red-700 hover:text-red-900"
                        aria-label="Close payment error"
                      >
                        <HiX size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {bookedPropertiesLoading ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-96 animate-pulse rounded-2xl bg-gray-200"
                      />
                    ))}
                  </div>
                ) : bookings.length > 0 ? (
                  <div className={`${s.propertyList} ${s.propertyListGrid}`}>
                    {bookings
                      .filter((booking) => booking.property)
                      .map((booking) => {
                        const property = booking.property;

                        const isFullyPaid =
                          booking.bookingStatus === "completed" ||
                          booking.remainingPaymentStatus === "completed";

                        const isRemainingPaymentPending =
                          booking.remainingPaymentStatus === "pending" ||
                          booking.remainingPaymentStatus === "initiated";

                        const canPayRemaining =
                          booking.bookingStatus === "confirmed" &&
                          booking.paymentStatus === "completed" &&
                          !isFullyPaid &&
                          !isRemainingPaymentPending;

                        const isCurrentlyPaying =
                          payingBookingId === String(booking._id);

                        return (
                          <div
                            key={booking._id}
                            className="flex min-w-0 flex-col gap-3"
                          >
                            {/* Booking status labels */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                                  isFullyPaid
                                    ? "bg-gray-800 text-white"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {isFullyPaid
                                  ? "✓ FULLY PAID"
                                  : "✓ BOOKED BY YOU"}
                              </span>

                              {String(property.status).toLowerCase() === "sold" && (
                                <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                                  SOLD
                                </span>
                              )}
                            </div>

                            {/* Property card */}
                            <PropertyCard
                              property={property}
                              isWishlisted={wishlistedIds.includes(
                                String(property._id)
                              )}
                              onToggleWishlist={handleToggleWishlist}
                            />

                            {/* Booking payment details */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
                                <span className="text-lg">💳</span>
                                Booking Payment Details
                              </h3>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">
                                    Total Property Price
                                  </span>

                                  <span className="font-semibold text-gray-800">
                                    {formatPrice(booking.totalPrice)}
                                  </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">
                                    Advance Paid (25%)
                                  </span>

                                  <span className="font-semibold text-green-700">
                                    {formatPrice(booking.advanceAmount)}
                                  </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">
                                    Remaining Amount (75%)
                                  </span>

                                  <span className="font-bold text-gray-900">
                                    {formatPrice(booking.remainingAmount)}
                                  </span>
                                </div>

                                <div className="my-3 border-t border-gray-100" />

                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">
                                    Booking Status
                                  </span>

                                  <span
                                    className={`font-semibold ${
                                      isFullyPaid
                                        ? "text-green-700"
                                        : "text-teal-700"
                                    }`}
                                  >
                                    {booking.bookingStatus}
                                  </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">
                                    Remaining Payment
                                  </span>

                                  <span
                                    className={`font-semibold ${
                                      isFullyPaid
                                        ? "text-green-700"
                                        : isRemainingPaymentPending
                                          ? "text-amber-600"
                                          : "text-orange-600"
                                    }`}
                                  >
                                    {booking.remainingPaymentStatus || "not_started"}
                                  </span>
                                </div>
                              </div>

                              {/* Fully paid message */}
                              {isFullyPaid && (
                                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                                  <p className="font-bold text-green-800">
                                    ✓ Full Payment Completed
                                  </p>

                                  <p className="mt-1 text-xs text-green-700">
                                    You have successfully paid the full property amount.
                                  </p>
                                </div>
                              )}

                              {/* Pending remaining payment message */}
                              {!isFullyPaid && isRemainingPaymentPending && (
                                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="font-semibold text-amber-800">
                                    Remaining Payment Pending
                                  </p>

                                  <p className="mt-1 text-xs text-amber-700">
                                    A remaining payment has already been initiated.
                                    Please complete that Khalti payment before starting another one.
                                  </p>
                                </div>
                              )}

                              {/* Pay remaining 75% button */}
                              {canPayRemaining && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePayRemaining(booking._id)
                                  }
                                  disabled={isCurrentlyPaying}
                                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isCurrentlyPaying ? (
                                    <>
                                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      Initiating Payment...
                                    </>
                                  ) : (
                                    <>
                                      <span>💳</span>
                                      Pay Remaining 75%
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Sandbox payment information */}
                              {booking.paymentMode === "sandbox" && (
                                <p className="mt-3 text-center text-xs text-gray-400">
                                  Sandbox payment mode: test transaction only.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                    <div className="mb-3 text-4xl">🏠</div>

                    <h3 className="font-semibold text-gray-800">
                      You haven't booked any properties yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                      Once you successfully book a property, it will
                      automatically appear in this section.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Property results */}
            {loading ? (
              <div className={s.skeletonGrid}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className={s.skeletonCard} />
                ))}
              </div>
            ) : error ? (
              <div className={s.errorContainer}>
                <HiX size={48} className={s.errorIcon} />

                <h3 className={s.errorTitle}>{error}</h3>

                <button
                  onClick={applyFilters}
                  className={s.errorButton}
                >
                  Try Again
                </button>
              </div>
            ) : otherProperties.length === 0 ? (
              <div className={s.emptyContainer}>
                <div className={s.emptyIconWrapper}>
                  <HiAdjustments
                    size={32}
                    className={s.emptyIcon}
                  />
                </div>

                <h2 className={s.emptyTitle}>
                  {properties.length > 0
                    ? "All matching properties are already recommended or booked"
                    : "No properties found"}
                </h2>

                <p className={s.emptyText}>
                  {properties.length > 0
                    ? "Your recommended and booked properties are shown above. Broaden your search to find more properties."
                    : "Broaden your search criteria"}
                </p>

                <button
                  onClick={resetFilters}
                  className={s.emptyButton}
                >
                  Clear All
                </button>
              </div>
            ) : (
              <div
                className={`${s.propertyList} ${
                  viewMode === "grid"
                    ? s.propertyListGrid
                    : s.propertyListList
                }`}
              >
                {otherProperties.map((property) => (
                  <PropertyCard
                    key={property._id}
                    property={property}
                    isWishlisted={wishlistedIds.includes(
                      String(property._id)
                    )}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter overlay */}
      {showMobileFilters && (
        <div
          onClick={() => setShowMobileFilters(false)}
          className={s.mobileOverlay}
        />
      )}
    </div>
  );
};

export default Properties;
