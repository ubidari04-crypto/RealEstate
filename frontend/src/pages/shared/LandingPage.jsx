
import React, { useEffect, useState } from "react";
import { landingPageStyles as s } from "../../assets/dummyStyles";
import Navbar from "../../components/common/Navbar";
import {
  HiCurrencyDollar,
  HiHome,
  HiLightningBolt,
  HiLocationMarker,
  HiMail,
  HiOfficeBuilding,
  HiPhone,
  HiSearch,
  HiShieldCheck,
  HiVideoCamera,
  HiSparkles,
  HiRefresh,
  HiInformationCircle,
} from "react-icons/hi";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";
import axios from "axios";
import banner from "../../assets/bannerimage.png";
import PropertyCard from "../../components/common/propertyCard";
import logo from "../../assets/hexagonlogo1.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Personalized recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);
  const [recommendationError, setRecommendationError] =
    useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [propertyType, setPropertyType] = useState("Select Type");

  // District and dependent area filters
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);

  const [propertyCounts, setPropertyCounts] = useState({
    flat: 0,
    villa: 0,
    penthouse: 0,
    commercial: 0,
  });

  const [wishlistedIds, setWishlistedIds] = useState([]);

  // Initial data loading
  useEffect(() => {
    fetchProperties();
    fetchCounts();
  }, []);

  // Fetch wishlist when the user logs in
  useEffect(() => {
    if (user && token) {
      fetchWishlist();
    } else {
      setWishlistedIds([]);
    }
  }, [user, token]);

  // Fetch personalized recommendations for buyers only
  useEffect(() => {
    if (user?.role === "buyer" && token) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
      setRecommendationError("");
      setRecommendationLoading(false);
    }
  }, [user, token]);

  // Fetch available districts from the backend
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/property/locations`
        );

        if (res.data.success) {
          setDistricts(res.data.districts || []);
        }
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      }
    };

    fetchDistricts();
  }, []);

  // Fetch areas belonging to the selected district
  useEffect(() => {
    let cancelled = false;

    const fetchAreas = async () => {
      if (!district) {
        setAreas([]);
        return;
      }

      try {
        const res = await axios.get(
          `${API_URL}/api/property/locations`,
          {
            params: { district },
          }
        );

        if (!cancelled && res.data.success) {
          setAreas(res.data.areas || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch areas:", err);
          setAreas([]);
        }
      }
    };

    fetchAreas();

    return () => {
      cancelled = true;
    };
  }, [district]);

  // Fetch wishlist
  const fetchWishlist = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/wishlist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const items = Array.isArray(res.data)
        ? res.data
        : res.data.wishlist || [];

      setWishlistedIds(
        items
          .filter((item) => item.property)
          .map((item) => String(item.property._id))
      );
    } catch (err) {
      console.error("Failed to fetch the wishlist:", err);
    }
  };

  // Fetch personalized recommendations
  const fetchRecommendations = async () => {
    if (!token || user?.role !== "buyer") return;

    try {
      setRecommendationLoading(true);
      setRecommendationError("");

      const res = await axios.get(
        `${API_URL}/api/recommendations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = res.data || {};

      // Support a best match and a list of similar properties.
      const candidates = [];

      if (data.bestMatch) {
        candidates.push(data.bestMatch);
      }

      const recommendationList =
        data.recommendations ||
        data.similarProperties ||
        data.properties ||
        [];

      if (Array.isArray(recommendationList)) {
        candidates.push(...recommendationList);
      }

      // Normalize recommendation objects and remove duplicates.
      const normalized = candidates
        .map((item) => {
          const property =
            item?.property ||
            item?.listing ||
            item;

          if (!property || !property._id) return null;

          return {
            property,
            score:
              item.score ??
              item.matchScore ??
              item.similarityScore ??
              property.recommendationScore ??
              null,
            reason:
              item.reason ||
              item.explanation ||
              property.recommendationReason ||
              "",
          };
        })
        .filter(Boolean);

      const uniqueRecommendations = normalized.filter(
        (item, index, array) =>
          array.findIndex(
            (other) =>
              String(other.property._id) ===
              String(item.property._id)
          ) === index
      );

      setRecommendations(uniqueRecommendations);
    } catch (err) {
      console.error(
        "FAILED_TO_FETCH_RECOMMENDATIONS:",
        err
      );

      setRecommendationError(
        err.response?.data?.message ||
          "Unable to load personalized recommendations."
      );

      setRecommendations([]);
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Toggle property wishlist
  const handleToggleWishlist = async (propertyId) => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    const id = String(propertyId);
    const isWishlisted = wishlistedIds.includes(id);

    try {
      if (isWishlisted) {
        await axios.delete(
          `${API_URL}/api/wishlist/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setWishlistedIds((prev) =>
          prev.filter((itemId) => itemId !== id)
        );
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

        setWishlistedIds((prev) => [...prev, id]);
      }
    } catch (err) {
      console.error("Failed to toggle wishlist:", err);
    }
  };

  // Fetch property counts
  const fetchCounts = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/property/counts`
      );

      if (res.data.success) {
        setPropertyCounts({
          flat: 0,
          villa: 0,
          penthouse: 0,
          commercial: 0,
          ...res.data.counts,
        });
      }
    } catch (err) {
      console.error("Failed to fetch property counts:", err);
    }
  };

  // Fetch featured properties
  const fetchProperties = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_URL}/api/property`
      );

      setProperties(
        res.data.properties || res.data || []
      );

      setError(null);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      setError("Failed to load properties. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Search and navigate to the properties page
  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (district) {
      params.set("district", district);
    }

    if (area) {
      params.set("area", area);
    }

    if (searchTerm.trim()) {
      params.set("city", searchTerm.trim());
    }

    if (propertyType !== "Select Type") {
      params.set("type", propertyType);
    }

    navigate(`/properties?${params.toString()}`);
  };

  const categories = [
    {
      name: "Modern Flats",
      count: propertyCounts.flat || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "flat",
    },
    {
      name: "Luxury Villas",
      count: propertyCounts.villa || 0,
      icon: <HiHome size={32} />,
      type: "villa",
    },
    {
      name: "Penthouse",
      count: propertyCounts.penthouse || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "penthouse",
    },
    {
      name: "Commercial",
      count: propertyCounts.commercial || 0,
      icon: <HiOfficeBuilding size={32} />,
      type: "commercial",
    },
  ];

  const features = [
    {
      title: "Verified Trust",
      desc: "Every listing is strictly audited for ownership, condition, and legality.",
      icon: <HiShieldCheck size={24} />,
    },
    {
      title: "Smart Search",
      desc: "Our AI-driven algorithms help you find the best matches based on preferences.",
      icon: <HiLightningBolt size={24} />,
    },
    {
      title: "Best Value",
      desc: "Direct-from-owner listings and zero-commission options to ensure competitive prices.",
      icon: <HiCurrencyDollar size={24} />,
    },
    {
      title: "Virtual Tours",
      desc: "High-definition 3D tours allow you to experience the property from home.",
      icon: <HiVideoCamera size={24} />,
    },
  ];

  return (
    <div className={s.bgMain}>
      <Navbar />

      {/* Hero Section */}
      <section className={s.heroSection}>
        <div className={s.heroContent}>
          <span className={s.badge}>
            Trusted by 20,000+ homeowners
          </span>

          <h1 className={s.heroTitle}>
            Find Your{" "}
            <span className={s.textGradient}>Perfect</span> Next
            Chapter.
          </h1>

          <p className={s.heroSubtitle}>
            Experience the most advanced real estate search platform.
            Discover verified listings, connect with top agents, and
            find a place you'll love.
          </p>

          {/* District, Area, City and Property Type Search */}
          <form
            onSubmit={handleSearch}
            className={`${s.searchForm} flex flex-wrap items-center gap-3`}
          >
            {/* District */}
            <div className={`${s.searchField} min-w-0 flex-1`}>
              <div className={s.textPrimary}>
                <HiLocationMarker size={26} />
              </div>

              <div className={`${s.flexCol} min-w-0 flex-1`}>
                <label className={s.labelSmall}>
                  District
                </label>

                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setArea("");
                  }}
                  className={`${s.inputTransparent} w-full cursor-pointer`}
                >
                  <option value="">All districts</option>

                  {districts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={s.searchDivider}></div>

            {/* Area */}
            <div className={`${s.searchField} min-w-0 flex-1`}>
              <div className={s.textPrimary}>
                <HiLocationMarker size={26} />
              </div>

              <div className={`${s.flexCol} min-w-0 flex-1`}>
                <label className={s.labelSmall}>
                  Area
                </label>

                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={!district}
                  className={`${s.inputTransparent} w-full cursor-pointer disabled:opacity-50`}
                >
                  <option value="">
                    {district ? "All areas" : "Select district first"}
                  </option>

                  {areas.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={s.searchDivider}></div>

            {/* City */}
            <div className={`${s.searchField} min-w-0 flex-1`}>
              <div className={s.textPrimary}>
                <HiLocationMarker size={26} />
              </div>

              <div className={`${s.flexCol} min-w-0 flex-1`}>
                <label className={s.labelSmall}>
                  City (optional)
                </label>

                <input
                  type="text"
                  placeholder="Enter city"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${s.inputTransparent} w-full`}
                />
              </div>
            </div>

            <div className={s.searchDivider}></div>

            {/* Property Type */}
            <div className={`${s.searchField} min-w-0 flex-1`}>
              <div className={s.textPrimary}>
                <HiHome size={26} />
              </div>

              <div className={`${s.flexCol} min-w-0 flex-1`}>
                <label className={s.labelSmall}>
                  Property Type
                </label>

                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className={`${s.inputTransparent} w-full cursor-pointer`}
                >
                  <option value="Select Type">Select Type</option>
                  <option value="flat">Flat/Apartment</option>
                  <option value="villa">Villa/House</option>
                  <option value="penthouse">Penthouse</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className={s.searchButton}
            >
              <HiSearch size={22} />
              Search
            </button>
          </form>

          {/* Stats */}
          <div className={s.statsContainer}>
            <div className={s.statItemFlex}>
              <h3 className={s.statNumber}>12K+</h3>
              <p className={s.statLabel}>Ready Properties</p>
            </div>

            <div className={s.statItemBorder}>
              <h3 className={s.statNumber}>500+</h3>
              <p className={s.statLabel}>Agent Network</p>
            </div>

            <div className={s.statItemBorder}>
              <h3 className={s.statNumber}>4.9/5</h3>
              <p className={s.statLabel}>User Rating</p>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className={s.heroImageContainer}>
          <div className={s.imageWrapper}>
            <img
              src={banner}
              alt="Real estate banner"
              className={s.heroImage}
            />

            <div className={s.verifiedBadge}>
              <div className={s.badgeIconWrapper}>
                <HiShieldCheck
                  size={24}
                  className="text-primary"
                />
              </div>

              <div>
                <h4 className={s.badgeTitle}>
                  Verified Listing
                </h4>

                <p className={s.badgeText}>
                  Inspected by our professional team
                </p>
              </div>

              <span className={s.preApproved}>
                pre-Approved
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Section */}
      <section className={s.categorySection}>
        <div className={s.container}>
          <div className={s.categoryHeader}>
            <div className={s.categoryHeaderText}>
              <h2 className={s.categoryTitle}>
                Browse by Category
              </h2>

              <p className={s.categoryDesc}>
                Explore curated collections of properties
                tailored to your specific lifestyle and needs.
              </p>
            </div>
          </div>

          <div className={s.categoryGrid}>
            {categories.map((cat) => (
              <div
                key={cat.type}
                className={s.categoryCard}
                onClick={() =>
                  navigate(`/properties?type=${cat.type}`)
                }
              >
                <div className={s.categoryIconWrapper}>
                  {cat.icon}
                </div>

                <h3 className={s.categoryName}>
                  {cat.name}
                </h3>

                <p className={s.categoryCount}>
                  {cat.count.toLocaleString()} Properties
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={s.featuredSection}>
        <div className={s.featuresContainer}>
          <div className={s.featuresList}>
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className={s.featureCard}
                style={{
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <div className={s.featureIconWrapper}>
                  {feature.icon}
                </div>

                <h3 className={s.featureTitle}>
                  {feature.title}
                </h3>

                <p className={s.featureDesc}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className={s.featuresContent}>
            <h2 className={s.featuresHeading}>
              Why RealEstate <br />
              is the{" "}
              <span className={s.textGradient}>
                preferred Choice
              </span>
            </h2>

            <p className={s.featuresSubtext}>
              We've reinvented the property search experience
              from the ground up. By focusing on transparency,
              technological precision, and user-centric design,
              we help you find not just a house, but a home.
            </p>

            <ul className={s.featuresListItems}>
              {[
                "Direct connection with certified agents",
                "Real-time market valuation data",
                "Secure document management system",
                "24/7 Premium customer support",
              ].map((item) => (
                <li key={item} className={s.listItem}>
                  <HiLightningBolt className="text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <a href="#process" className={s.learnMoreLink}>
              Learn more about our process &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="process" className={s.processSection}>
        <div className={s.container}>
          <div className={s.processHeader}>
            <span className={s.processBadge}>
              How It Works
            </span>

            <h2 className={s.processTitle}>
              Our Seamless{" "}
              <span className={s.textGradient}>Process</span>
            </h2>

            <p className={s.processSubtitle}>
              We've simplified the journey of finding your
              dream home into three clear, stress-free steps.
            </p>
          </div>

          <div className={s.processGrid}>
            {[
              {
                step: "01",
                title: "Smart Search",
                desc: "Leverage our AI-driven Smart Search algorithms to find the best property matches tailored to your specific preferences.",
                icon: <HiLightningBolt size={32} />,
              },
              {
                step: "02",
                title: "Virtual Tours",
                desc: "Experience your future home from anywhere with our high-definition 3D virtual tours and immersive walkthroughs.",
                icon: <HiVideoCamera size={32} />,
              },
              {
                step: "03",
                title: "Verified Trust",
                desc: "Every listing is strictly audited for ownership and condition, ensuring your peace of mind and a secure transaction.",
                icon: <HiShieldCheck size={32} />,
              },
            ].map((item) => (
              <div key={item.step} className={s.processCard}>
                <div className={s.stepNumber}>{item.step}</div>

                <div className={s.processIconWrapper}>
                  {item.icon}
                </div>

                <h3 className={s.processCardTitle}>
                  {item.title}
                </h3>

                <p className={s.processCardDesc}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personalized Recommendations - Buyers Only */}
      {user?.role === "buyer" && (
        <section className="py-16 bg-emerald-50/60">
          <div className={s.container}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-9">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-4">
                  <HiSparkles size={18} />
                  AI-Powered Recommendations
                </span>

                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Recommended For You
                </h2>

                <p className="mt-3 text-slate-600 max-w-2xl">
                  Discover properties selected according to your
                  preferred location, budget, property type,
                  BHK, amenities, and interests.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/buyer/preferences")
                  }
                  className="px-5 py-3 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100 transition"
                >
                  Update Preferences
                </button>

                <button
                  type="button"
                  onClick={fetchRecommendations}
                  disabled={recommendationLoading}
                  className="px-5 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition disabled:opacity-60 flex items-center gap-2"
                >
                  <HiRefresh
                    size={19}
                    className={
                      recommendationLoading ? "animate-spin" : ""
                    }
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Recommendation loading */}
            {recommendationLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />

                <p className="mt-4 text-slate-600 font-medium">
                  Finding properties that match your preferences...
                </p>
              </div>
            ) : recommendationError ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
                <HiInformationCircle
                  size={36}
                  className="mx-auto text-red-500 mb-3"
                />

                <p className="text-red-700 font-medium">
                  {recommendationError}
                </p>

                <button
                  type="button"
                  onClick={fetchRecommendations}
                  className="mt-5 px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                >
                  Try Again
                </button>
              </div>
            ) : recommendations.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((item, index) => (
                    <div
                      key={item.property._id}
                      className="relative"
                    >
                      <PropertyCard
                        property={item.property}
                        isWishlisted={wishlistedIds.includes(
                          String(item.property._id)
                        )}
                        onToggleWishlist={handleToggleWishlist}
                      />

                      {item.score !== null &&
                        item.score !== undefined && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold">
                            <HiSparkles size={16} />
                            {Math.round(Number(item.score))}% Match
                          </div>
                        )}

                      {item.reason && (
                        <p className="mt-2 text-sm text-slate-600">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mt-7 text-center text-sm text-slate-500">
                  Recommendations are generated using your saved
                  preferences and property interests.
                </p>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-9 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <HiSparkles
                    size={30}
                    className="text-emerald-700"
                  />
                </div>

                <h3 className="text-xl font-bold text-slate-800">
                  No Recommendations Yet
                </h3>

                <p className="text-slate-600 mt-2 max-w-xl mx-auto">
                  We couldn't find matching properties at the
                  moment. Update your preferences or check back
                  when more properties become available.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/buyer/preferences")
                  }
                  className="mt-6 px-6 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                >
                  Update My Preferences
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Collection - Existing Section */}
      <section className={s.featuredSection}>
        <div className={s.container}>
          <div className={s.featuredHeader}>
            <span className={s.featuredBadge}>
              Handpicked For You
            </span>

            <h2 className={s.featureTitle}>
              Featured Collections
            </h2>

            <p className={s.featuredSubtitle}>
              Discover high-value properties curated by our
              experts for their exceptional design, location,
              and investment potential.
            </p>
          </div>

          {loading ? (
            <div className={s.loadingContainer}>
              <div className={s.loader}></div>
            </div>
          ) : error ? (
            <div className={s.errorContainer}>
              <p>{error}</p>
            </div>
          ) : (
            <div className={s.propertiesGrid}>
              {properties
                .filter(Boolean)
                .sort(
                  (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
                )
                .slice(0, 6)
                .map((property) => (
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

          <div className={s.discoverButtonContainer}>
            <button
              onClick={() => navigate("/properties")}
              className={s.discoverButton}
            >
              Discover More Properties
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerMainGrid}>
            {/* Brand */}
            <div className={s.footerBrand}>
              <div className={s.brandLogo}>
                <div className={s.brandIcon}>RE</div>
                RealEstate
              </div>

              <p className={s.brandDesc}>
                The most trusted platform for buying, selling,
                and renting Premium real estate globally.
                We make property hunting seamless.
              </p>

              <div className={s.socialIcons}>
                {[
                  FaFacebookF,
                  FaTwitter,
                  FaInstagram,
                  FaLinkedinIn,
                ].map((Icon, idx) => (
                  <a
                    href="#"
                    key={idx}
                    className={s.socialIcon}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className={s.footerHeading}>Company</h4>

              <ul className={s.footerLinks}>
                <li>
                  <a href="/" className={s.footerLink}>
                    Home
                  </a>
                </li>

                <li>
                  <a href="/properties" className={s.footerLink}>
                    Property
                  </a>
                </li>

                <li>
                  <a href="/wishlist" className={s.footerLink}>
                    Wishlist
                  </a>
                </li>

                <li>
                  <a href="/contact" className={s.footerLink}>
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className={s.footerHeading}>Support</h4>

              <ul className={s.footerLinks}>
                <li className={s.contactInfo}>
                  <HiMail className="text-primary text-xl" />
                  contact@reestate.com
                </li>

                <li className={s.contactInfo}>
                  <HiPhone className="text-primary text-xl" />
                  +977 9881323889
                </li>

                <li className={s.contactInfoStart}>
                  <HiLocationMarker
                    className={`text-primary ${s.contactIcon}`}
                  />
                  Business Hub, Kathmandu
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className={s.footerHeading}>Newsletter</h4>

              <p className={s.newsletterDesc}>
                Subscribe to get the latest listings and market
                insights directly in your inbox.
              </p>

              <div className={s.newsletterInputWrapper}>
                <input
                  type="email"
                  placeholder="Enter your Email"
                  className={s.newsletterInput}
                />

                <button className={s.newsletterButton}>
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={s.bottomBar}>
            <div className={s.bottomBarFlex}>
              <p>
                &copy;{new Date().getFullYear()} RealEstate.
                All rights reserved.
              </p>

              <div className={s.footerLegalLinks}>
                <a href="#" className={s.footerLink}>
                  Privacy Policy
                </a>

                <a href="#" className={s.footerLink}>
                  Terms of Service
                </a>

                <a href="#" className={s.footerLink}>
                  Cookie settings
                </a>
              </div>
            </div>

            <div className={s.designCredit}>
              <img
                src={logo}
                alt="Logo"
                className={s.designLogo}
              />

              <span className="text-text-muted">
                Designed By
              </span>

              <a
                href="https://github.com/ubidari04-crypto?tab=repositories"
                target="_blank"
                rel="noopener noreferrer"
                className={s.designLink}
              >
                Umanga Project Demo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
