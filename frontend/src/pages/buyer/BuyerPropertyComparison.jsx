
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import { usePropertyComparison } from "../../context/PropertyComparisonContext";

import {
  HiArrowLeft,
  HiCheckCircle,
  HiXCircle,
  HiScale,
  HiLocationMarker,
  HiCurrencyRupee,
  HiHome,
  HiViewGrid,
  HiSparkles,
  HiTrash,
  HiExternalLink,
  HiRefresh,
  HiExclamationCircle,
} from "react-icons/hi";

// ------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------

const formatPrice = (price) => {
  const value = Number(price);

  if (!Number.isFinite(value)) return "Price unavailable";

  return `NPR ${value.toLocaleString("en-IN")}`;
};

const getPropertyImage = (property) => {
  if (!property?.images?.length) return "";

  const firstImage = property.images[0];

  if (typeof firstImage === "string") return firstImage;

  return firstImage?.url || firstImage?.secure_url || "";
};

const getLocation = (property) => {
  return [
    property?.area,
    property?.city,
    property?.district,
  ]
    .filter(Boolean)
    .join(", ");
};

const getPropertyType = (property) => {
  return String(property?.propertyType || "Not specified")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getScoreColor = (score) => {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
};

const getScoreBackground = (score) => {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const getAmenities = (property) => {
  return Array.isArray(property?.amenities)
    ? property.amenities
    : [];
};

// ------------------------------------------
// MAIN COMPONENT
// ------------------------------------------

const BuyerPropertyComparison = () => {
  const {
    selectedProperties = [],
    removeProperty,
    clearComparison,
  } = usePropertyComparison();

  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const token = localStorage.getItem("token");

  // Preserve selected property order.
  const propertyIds = useMemo(
    () => selectedProperties.map((property) => property._id),
    [selectedProperties]
  );

  const propertyIdsKey = propertyIds.join("|");

  const hasTwoProperties = propertyIds.length === 2;

  // ------------------------------------------
  // FETCH COMPARISON FROM BACKEND
  // ------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchComparison = async () => {
      if (propertyIds.length !== 2) {
        setComparisonData(null);
        setError("");
        setLoading(false);
        return;
      }

      if (!token) {
        setError("Please log in to compare properties.");
        setComparisonData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setComparisonData(null);

        const response = await axios.post(
          `${API_URL}/api/recommendations/compare`,
          {
            propertyIds,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (cancelled) return;

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Unable to compare properties."
          );
        }

        setComparisonData(response.data);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Property comparison error:",
          err.response?.data || err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to compare properties. Please try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchComparison();

    return () => {
      cancelled = true;
    };
  }, [propertyIdsKey, token, retryCount]);

  // ------------------------------------------
  // COMPARISON RESULTS
  // ------------------------------------------

  const comparisons = comparisonData?.comparisons || [];

  const firstComparison = comparisons[0];
  const secondComparison = comparisons[1];

  const firstProperty = selectedProperties[0];
  const secondProperty = selectedProperties[1];

  const winnerId = comparisonData?.winner;

  const firstIsWinner =
    Boolean(winnerId) &&
    winnerId === firstProperty?._id;

  const secondIsWinner =
    Boolean(winnerId) &&
    winnerId === secondProperty?._id;

  const isTie =
    comparisonData?.hasPreferences &&
    winnerId === null &&
    comparisons.length === 2 &&
    comparisons[0]?.recommendationScore ===
      comparisons[1]?.recommendationScore;

  // ------------------------------------------
  // REMOVE PROPERTY
  // ------------------------------------------

  const handleRemove = (propertyId) => {
    removeProperty(propertyId);
    setComparisonData(null);
    setError("");
  };

  const handleClear = () => {
    clearComparison();
    setComparisonData(null);
    setError("");
  };

  // ------------------------------------------
  // RETRY COMPARISON
  // ------------------------------------------

  const handleRetry = () => {
    setError("");
    setComparisonData(null);
    setRetryCount((previous) => previous + 1);
  };

  // ------------------------------------------
  // COMPARISON TABLE ROWS
  // ------------------------------------------

  const comparisonRows = [
    {
      label: "Price",
      icon: <HiCurrencyRupee />,
      getValue: (property) => formatPrice(property?.price),
    },
    {
      label: "District",
      icon: <HiLocationMarker />,
      getValue: (property) =>
        property?.district || "Not specified",
    },
    {
      label: "City",
      icon: <HiLocationMarker />,
      getValue: (property) =>
        property?.city || "Not specified",
    },
    {
      label: "Area",
      icon: <HiLocationMarker />,
      getValue: (property) =>
        property?.area || "Not specified",
    },
    {
      label: "Property Type",
      icon: <HiHome />,
      getValue: (property) => getPropertyType(property),
    },
    {
      label: "Bedrooms",
      icon: <HiHome />,
      getValue: (property) =>
        property?.bhk ? `${property.bhk} BHK` : "Not specified",
    },
    {
      label: "Bathrooms",
      icon: <HiHome />,
      getValue: (property) =>
        property?.bathrooms ?? "Not specified",
    },
    {
      label: "Area Size",
      icon: <HiViewGrid />,
      getValue: (property) =>
        property?.areaSize
          ? `${Number(property.areaSize).toLocaleString()} sq. ft.`
          : "Not specified",
    },
    {
      label: "Furnishing",
      icon: <HiHome />,
      getValue: (property) =>
        property?.furnishing || "Not specified",
    },
    {
      label: "Status",
      icon: <HiCheckCircle />,
      getValue: (property) =>
        property?.status || "Not specified",
    },
    {
      label: "Amenities",
      icon: <HiSparkles />,
      getValue: (property) =>
        getAmenities(property).length > 0
          ? getAmenities(property).join(", ")
          : "No amenities listed",
    },
  ];

  // ------------------------------------------
  // SCORE CARD
  // ------------------------------------------

  const ScoreCard = ({ comparison, isWinner }) => {
    if (!comparison) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Comparison score is unavailable.
          </p>
        </div>
      );
    }

    const score = Number(comparison.recommendationScore) || 0;

    return (
      <div
        className={`rounded-2xl border p-5 ${
          isWinner
            ? "border-emerald-300 bg-emerald-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-gray-800">
            AI Match Score
          </h3>

          {isWinner && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
              Best Match
            </span>
          )}
        </div>

        <div className="mb-3 flex items-end gap-1">
          <span
            className={`text-4xl font-extrabold ${getScoreColor(score)}`}
          >
            {comparison.recommendationScore ?? "--"}
          </span>

          <span className="mb-1 text-sm text-gray-500">
            / 100
          </span>
        </div>

        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getScoreBackground(
              score
            )}`}
            style={{
              width: `${Math.max(0, Math.min(100, score))}%`,
            }}
          />
        </div>

        <div className="space-y-2 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">
              Preference Score
            </span>

            <strong className="text-gray-800">
              {comparison.preferenceScore ?? "--"}
              {comparison.preferenceScore != null ? "%" : ""}
            </strong>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-gray-600">
              Activity Similarity
            </span>

            <strong className="text-gray-800">
              {comparison.activityScore ?? "--"}
              {comparison.activityScore != null ? "%" : ""}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // EMPTY STATE
  // ------------------------------------------

  if (selectedProperties.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="mx-auto flex min-h-[75vh] max-w-5xl items-center justify-center px-5 pt-28">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
              <HiScale className="text-4xl text-teal-600" />
            </div>

            <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
              No Properties Selected
            </h1>

            <p className="mb-6 text-gray-500">
              Select two properties from Browse Properties or
              Recommended Properties to compare their details
              and personalized AI match scores.
            </p>

            <Link
              to="/properties"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
            >
              <HiArrowLeft />
              Browse Properties
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------
  // MAIN PAGE
  // ------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}

        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              to="/properties"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              <HiArrowLeft />
              Back to Properties
            </Link>

            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Compare Properties
            </h1>

            <p className="mt-2 text-gray-500">
              Compare property details and discover which
              property better matches your preferences.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <HiArrowLeft />
              Add Properties
            </Link>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <HiTrash />
              Clear All
            </button>
          </div>
        </div>

        {/* SELECTED PROPERTY COUNT */}

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <HiScale className="text-2xl text-teal-700" />

          <div>
            <p className="font-bold text-teal-900">
              {selectedProperties.length} of 2 properties selected
            </p>

            <p className="text-sm text-teal-700">
              You can compare exactly two properties at a time.
            </p>
          </div>
        </div>

        {/* ONE PROPERTY SELECTED */}

        {selectedProperties.length === 1 && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <HiExclamationCircle className="mt-1 text-2xl text-amber-600" />

              <div>
                <h2 className="font-bold text-amber-900">
                  Select one more property
                </h2>

                <p className="mt-1 text-sm text-amber-800">
                  You have selected one property. Add another
                  property to start the AI-powered comparison.
                </p>

                <Link
                  to="/properties"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Browse More Properties
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* PROPERTY CARDS */}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {selectedProperties.map((property, index) => {
            const image = getPropertyImage(property);

            const isWinner =
              index === 0 ? firstIsWinner : secondIsWinner;

            return (
              <div
                key={property._id}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                  isWinner
                    ? "border-emerald-300 ring-2 ring-emerald-100"
                    : "border-gray-200"
                }`}
              >
                <div className="relative h-60 bg-gray-100">
                  {image ? (
                    <img
                      src={image}
                      alt={property.title || "Property"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <HiHome className="text-6xl" />
                    </div>
                  )}

                  <span className="absolute left-4 top-4 rounded-full bg-gray-900/80 px-4 py-2 text-xs font-bold text-white">
                    Property {index + 1}
                  </span>

                  {isWinner && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                      <HiCheckCircle />
                      AI Best Match
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(property._id)}
                    className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 shadow-lg transition hover:bg-red-50"
                    title="Remove property"
                    aria-label="Remove property"
                  >
                    <HiXCircle className="text-2xl" />
                  </button>
                </div>

                <div className="p-5">
                  <h2 className="mb-2 text-xl font-extrabold text-gray-900">
                    {property.title || "Untitled Property"}
                  </h2>

                  <p className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                    <HiLocationMarker className="shrink-0 text-teal-600" />
                    {getLocation(property) || "Location unavailable"}
                  </p>

                  <p className="mb-4 text-2xl font-extrabold text-teal-700">
                    {formatPrice(property.price)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/property/${property._id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      View Property
                      <HiExternalLink />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemove(property._id)}
                      className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* LOADING */}

        {hasTwoProperties && loading && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />

            <h2 className="font-bold text-gray-800">
              Calculating your comparison...
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Analyzing preferences and property interaction
              history using your recommendation algorithm.
            </p>
          </div>
        )}

        {/* ERROR */}

        {hasTwoProperties && !loading && error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <HiExclamationCircle className="mt-1 text-2xl text-red-600" />

              <div className="flex-1">
                <h2 className="font-bold text-red-800">
                  Comparison failed
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <HiRefresh />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI MATCH SCORES */}

        {hasTwoProperties &&
          !loading &&
          !error &&
          comparisonData && (
            <>
              <section className="mb-8">
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <HiSparkles className="text-2xl text-teal-600" />

                    <h2 className="text-2xl font-extrabold text-gray-900">
                      Personalized AI Match Scores
                    </h2>
                  </div>

                  <p className="text-sm text-gray-500">
                    Scores are calculated by your backend using
                    the same content-based recommendation
                    algorithm.
                  </p>
                </div>

                {!comparisonData.hasPreferences ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <h3 className="font-bold text-amber-900">
                      Buyer preferences not found
                    </h3>

                    <p className="mt-2 text-sm text-amber-800">
                      Save your property preferences to see
                      personalized match scores and determine
                      which property suits you better.
                    </p>

                    <Link
                      to="/buyer/preferences"
                      className="mt-4 inline-flex rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Set My Preferences
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <ScoreCard
                        comparison={firstComparison}
                        isWinner={Boolean(firstIsWinner)}
                      />

                      <ScoreCard
                        comparison={secondComparison}
                        isWinner={Boolean(secondIsWinner)}
                      />
                    </div>

                    {/* WINNER EXPLANATION */}

                    <div className="mt-6 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <HiSparkles className="text-2xl text-teal-600" />

                        <h3 className="text-lg font-extrabold text-gray-900">
                          AI Comparison Result
                        </h3>
                      </div>

                      {isTie ? (
                        <div>
                          <p className="font-bold text-gray-800">
                            Both properties have the same AI
                            match score.
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Both properties match your saved
                            preferences equally according to
                            the current recommendation scoring
                            calculation.
                          </p>
                        </div>
                      ) : winnerId ? (
                        <div>
                          <p className="font-bold text-emerald-700">
                            {firstIsWinner
                              ? firstProperty?.title
                              : secondProperty?.title}{" "}
                            is your better AI match.
                          </p>

                          <p className="mt-2 text-sm text-gray-600">
                            It achieved a higher recommendation
                            score based on your saved property
                            preferences and similarity to your
                            previous property activities.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          A winner could not be determined.
                        </p>
                      )}

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="mb-2 text-sm font-bold text-gray-800">
                          How the AI score works
                        </p>

                        {comparisonData.hasActivity ? (
                          <p className="text-sm leading-6 text-gray-600">
                            70% preference matching score +
                            30% activity similarity score.
                            Your previous views, wishlists, and
                            inquiries contribute to activity
                            similarity.
                          </p>
                        ) : (
                          <p className="text-sm leading-6 text-gray-600">
                            100% preference matching score.
                            Since no eligible property activity
                            was found, the system uses your
                            saved preferences alone.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* MATCH REASONS */}

              {comparisonData.hasPreferences &&
                comparisons.length === 2 && (
                  <section className="mb-8">
                    <h2 className="mb-5 text-2xl font-extrabold text-gray-900">
                      Why These Properties Match
                    </h2>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      {[firstComparison, secondComparison].map(
                        (comparison, index) => (
                          <div
                            key={comparison.property?._id || index}
                            className="rounded-2xl border border-gray-200 bg-white p-5"
                          >
                            <h3 className="mb-4 font-bold text-gray-900">
                              {comparison.property?.title ||
                                `Property ${index + 1}`}
                            </h3>

                            {comparison.matchReasons?.length > 0 ? (
                              <ul className="space-y-3">
                                {comparison.matchReasons.map(
                                  (reason, reasonIndex) => (
                                    <li
                                      key={reasonIndex}
                                      className="flex items-start gap-2 text-sm text-gray-600"
                                    >
                                      <HiCheckCircle className="mt-0.5 shrink-0 text-lg text-emerald-500" />
                                      <span>{reason}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No specific matching reasons
                                are available.
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}
            </>
          )}

        {/* SIDE-BY-SIDE PROPERTY DETAILS */}

        {hasTwoProperties && (
          <section className="mb-8">
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Property Details Comparison
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Compare the specifications of both properties
                side by side.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-1/4 px-5 py-4 text-sm font-bold text-gray-700">
                        Property Features
                      </th>

                      <th className="w-[37.5%] px-5 py-4 text-sm font-bold text-gray-900">
                        {firstProperty?.title || "Property 1"}
                      </th>

                      <th className="w-[37.5%] px-5 py-4 text-sm font-bold text-gray-900">
                        {secondProperty?.title || "Property 2"}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonRows.map((row, index) => (
                      <tr
                        key={row.label}
                        className={
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50"
                        }
                      >
                        <td className="border-t border-gray-100 px-5 py-4">
                          <div className="flex items-center gap-2 font-semibold text-gray-700">
                            <span className="text-lg text-teal-600">
                              {row.icon}
                            </span>

                            {row.label}
                          </div>
                        </td>

                        <td className="border-t border-gray-100 px-5 py-4 text-sm text-gray-700">
                          {row.getValue(firstProperty)}
                        </td>

                        <td className="border-t border-gray-100 px-5 py-4 text-sm text-gray-700">
                          {row.getValue(secondProperty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* BOTTOM ACTIONS */}

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-gray-900">
              Need to compare other properties?
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Remove a selected property or clear both selections
              to start a new comparison.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Clear Comparison
            </button>

            <Link
              to="/properties"
              className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Browse Properties
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
};

export default BuyerPropertyComparison;
