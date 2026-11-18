
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import PropertyCard from "../../components/common/propertyCard";
import API_URL from "../../config";

// ------------------------------------------
// 1. GET MATCH SCORE
// ------------------------------------------

const getMatchScore = (item) => {
  const score = Number(
    item?.recommendationScore ?? item?.preferenceScore ?? 0
  );

  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;
};

// ------------------------------------------
// 2. IDENTIFY DUPLICATE PROPERTIES
// ------------------------------------------

const getPropertyIdentity = (property) => {
  if (!property) return "";

  return [
    property.title,
    property.propertyType,
    property.district,
    property.city,
    property.area,
    property.price,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
};


// ------------------------------------------
// 3. BUYER RECOMMENDATIONS COMPONENT
// ------------------------------------------

const BuyerRecommendations = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [recommendations, setRecommendations] = useState([]);
  const [bestMatch, setBestMatch] = useState(null);
  const [hasPreferences, setHasPreferences] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const successMessage = location.state?.message;


  // ------------------------------------------
  // 4. FETCH RECOMMENDATIONS
  // ------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await axios.get(
          `${API_URL}/api/recommendations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = response.data || {};

        console.log("RECOMMENDATIONS_RESPONSE:", data);

        setHasPreferences(data.hasPreferences !== false);

        // Get Best Match
        const best = data.bestMatch || null;

        setBestMatch(best);

        const bestProperty = best?.property || null;

        const bestPropertyId = bestProperty?._id
          ? String(bestProperty._id)
          : null;

        const bestPropertyIdentity =
          getPropertyIdentity(bestProperty);

        // Get recommendation list
        const items = Array.isArray(data.recommendations)
          ? data.recommendations
          : Array.isArray(data.similarProperties)
          ? data.similarProperties
          : [];

        // Remove Best Match and duplicate listings
        const uniqueItems = [];
        const seenIds = new Set();
        const seenIdentities = new Set();

        if (bestPropertyId) {
          seenIds.add(bestPropertyId);
        }

        if (bestPropertyIdentity) {
          seenIdentities.add(bestPropertyIdentity);
        }

        items.forEach((item) => {
          const property = item?.property;

          if (!property?._id) return;

          const propertyId = String(property._id);
          const propertyIdentity = getPropertyIdentity(property);

          // Remove Best Match by ID
          if (seenIds.has(propertyId)) return;

          // Remove duplicate listings
          if (
            propertyIdentity &&
            seenIdentities.has(propertyIdentity)
          ) {
            return;
          }

          seenIds.add(propertyId);

          if (propertyIdentity) {
            seenIdentities.add(propertyIdentity);
          }

          uniqueItems.push(item);
        });

        setRecommendations(uniqueItems);

      } catch (err) {
        if (
          axios.isCancel(err) ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "Failed to fetch recommendations:",
          err.response?.data || err.message
        );

        setError(
          err.response?.data?.message ||
            "Unable to load your recommended properties. Please try again."
        );

      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      controller.abort();
    };
  }, [navigate, location.key, retryCount]);


  // ------------------------------------------
  // 5. BEST MATCH PROPERTY
  // ------------------------------------------

  const bestProperty = bestMatch?.property || null;

  // Recommendations are already filtered in fetchRecommendations
  const otherRecommendations = recommendations;


  // ------------------------------------------
  // 6. RETRY
  // ------------------------------------------

  const handleRetry = () => {
    setRetryCount((previous) => previous + 1);
  };


  // ------------------------------------------
  // 7. PAGE UI
  // ------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4 pb-16 pt-32">

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-teal-600">
            Personalized for you
          </p>

          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Your Recommended Properties
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Discover properties selected according to your preferences,
            budget, location, and activity on our platform.
          </p>
        </div>


        {/* Success message */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {successMessage}
          </div>
        )}


        {/* Loading */}
        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>

              <p className="text-slate-600">
                Finding properties that match your preferences...
              </p>
            </div>
          </div>
        )}


        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="mb-4 text-red-600">
              {error}
            </p>

            <button
              onClick={handleRetry}
              className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white hover:bg-teal-700"
            >
              Try Again
            </button>
          </div>
        )}


        {!loading && !error && (
          <>

            {/* No preferences saved */}
            {!hasPreferences && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="mb-2 text-xl font-bold text-slate-800">
                  Set up your property preferences
                </h2>

                <p className="mb-4 text-slate-600">
                  Tell us your preferred location, budget, property type,
                  and other requirements so we can find properties
                  that suit you.
                </p>

                <Link
                  to="/buyer/preferences"
                  className="inline-block rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700"
                >
                  Set My Preferences
                </Link>
              </div>
            )}


            {/* ------------------------------------------
                BEST MATCH
            ------------------------------------------ */}

            {bestProperty && (
              <section className="mb-12">

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                  <div>
                    <span className="mb-2 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
                      BEST MATCH
                    </span>

                    <h2 className="text-2xl font-bold text-slate-900">
                      Your Best Match
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      The property that best matches your preferences.
                    </p>
                  </div>

                  <span className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-teal-700 shadow-sm">
                    {getMatchScore(bestMatch)}% Match
                  </span>

                </div>


                <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">

                  <PropertyCard
                    property={bestProperty}
                    compact
                  />

                  {Array.isArray(bestMatch?.matchReasons) &&
                    bestMatch.matchReasons.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-4">

                        <h3 className="mb-3 font-semibold text-slate-800">
                          Why we recommend this property
                        </h3>

                        <ul className="grid gap-2 sm:grid-cols-2">
                          {bestMatch.matchReasons.map((reason, index) => (
                            <li
                              key={`${index}-${reason}`}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="font-bold text-teal-600">
                                ✓
                              </span>

                              {reason}
                            </li>
                          ))}
                        </ul>

                      </div>
                    )}

                </div>
              </section>
            )}


            {/* ------------------------------------------
                MORE PROPERTIES YOU MAY LIKE
            ------------------------------------------ */}

            <section>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  More Properties You May Like
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Other properties selected based on your preferences
                  and browsing activity.
                </p>
              </div>


              {otherRecommendations.length > 0 ? (

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                  {otherRecommendations.map((item) => (

                    <div
                      key={item.property._id}
                      className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                    >

                      {/* IMPORTANT: Display item.property, not bestProperty */}
                      <PropertyCard
                        property={item.property}
                      />

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">

                        <span className="text-sm font-medium text-slate-500">
                          Match score
                        </span>

                        <span className="font-bold text-teal-700">
                          {getMatchScore(item)}%
                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              ) : bestProperty ? (

                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-slate-600">
                    We found your best match. More matching properties
                    may appear as additional listings become available.
                  </p>
                </div>

              ) : (

                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">

                  <h3 className="mb-2 text-xl font-bold text-slate-800">
                    No recommendations found yet
                  </h3>

                  <p className="mb-5 text-slate-500">
                    Update your preferences or check again when more
                    suitable properties become available.
                  </p>

                  <Link
                    to="/buyer/preferences"
                    className="inline-block rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700"
                  >
                    Update My Preferences
                  </Link>

                </div>

              )}

            </section>


            {/* Update preferences */}
            <div className="mt-12 text-center">
              <Link
                to="/buyer/preferences"
                className="font-semibold text-teal-700 hover:text-teal-900"
              >
                ← Update My Preferences
              </Link>
            </div>

          </>
        )}

      </main>
    </div>
  );
};

export default BuyerRecommendations;
