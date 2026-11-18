import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  HiHome,
  HiLocationMarker,
  HiCurrencyRupee,
  HiCheckCircle,
  HiArrowLeft,
  HiSparkles,
  HiRefresh,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";

const propertyTypeOptions = [
  { label: "Flat/Apartment", values: ["flat", "apartment"] },
  { label: "Villa/House", values: ["villa", "house"] },
  { label: "Penthouse", values: ["penthouse"] },
  { label: "Commercial", values: ["commercial"] },
];

const amenityOptions = [
  "Parking",
  "Pool",
  "Gym",
  "Security",
  "Wifi",
  "PowerBackup",
  "Club",
  "HouseGarden",
];

const initialForm = {
  preferredDistrict: "",
  preferredCity: "",
  preferredArea: "",
  propertyTypes: [],
  minPrice: 0,
  maxPrice: 100000000,
  bhk: "",
  furnishing: "",
  amenities: [],
  minArea: 0,
};

const BuyerPreferences = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const messageRef = useRef(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // Scroll to notifications.
  useEffect(() => {
    if (message || error) {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [message, error]);

  // Load existing preferences and districts.
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const currentToken = localStorage.getItem("token");

        if (!currentToken) {
          navigate("/login", { replace: true });
          return;
        }

        const [preferencesResponse, locationsResponse] =
          await Promise.all([
            axios.get(
              `${API_URL}/api/recommendations/preferences`,
              {
                headers: {
                  Authorization: `Bearer ${currentToken}`,
                },
              }
            ),
            axios.get(`${API_URL}/api/property/locations`),
          ]);

        if (!isMounted) return;

        const savedPreferences =
          preferencesResponse.data?.preferences;

        setDistricts(locationsResponse.data?.districts || []);

        if (savedPreferences) {
          const allowedValues = propertyTypeOptions.flatMap(
            (type) => type.values
          );

          const savedTypes = Array.isArray(
            savedPreferences.propertyTypes
          )
            ? savedPreferences.propertyTypes.filter((type) =>
                allowedValues.includes(type)
              )
            : [];

          const savedAmenities = Array.isArray(
            savedPreferences.amenities
          )
            ? savedPreferences.amenities.filter((amenity) =>
                amenityOptions.includes(amenity)
              )
            : [];

          setForm({
            ...initialForm,
            ...savedPreferences,
            propertyTypes: savedTypes,
            amenities: savedAmenities,
          });

          if (savedPreferences.preferredDistrict) {
            const areaResponse = await axios.get(
              `${API_URL}/api/property/locations`,
              {
                params: {
                  district: savedPreferences.preferredDistrict,
                },
              }
            );

            if (!isMounted) return;

            setAreas(areaResponse.data?.areas || []);
          }
        }
      } catch (err) {
        console.error("LOAD_PREFERENCES_ERROR:", err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your preferences. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Handle normal input changes.
  const handleChange = (e) => {
    const { name, value } = e.target;

    setMessage("");
    setError("");

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Load areas when district changes.
  const handleDistrictChange = async (e) => {
    const district = e.target.value;

    setMessage("");
    setError("");

    setForm((previous) => ({
      ...previous,
      preferredDistrict: district,
      preferredArea: "",
    }));

    setAreas([]);

    if (!district) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/property/locations`,
        {
          params: { district },
        }
      );

      setAreas(response.data?.areas || []);
    } catch (err) {
      console.error("LOAD_AREAS_ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load areas for this district."
      );
    }
  };

  // Reset all form fields.
  const handleReset = () => {
    setForm({
      ...initialForm,
      propertyTypes: [],
      amenities: [],
    });

    setAreas([]);
    setMessage("");
    setError("");
  };

  // Toggle amenities.
  const toggleArrayValue = (field, value) => {
    setMessage("");
    setError("");

    setForm((previous) => ({
      ...previous,
      [field]: previous[field].includes(value)
        ? previous[field].filter((item) => item !== value)
        : [...previous[field], value],
    }));
  };

  // Toggle grouped property types.
  const togglePropertyType = (type) => {
    setMessage("");
    setError("");

    setForm((previous) => {
      const allSelected = type.values.every((value) =>
        previous.propertyTypes.includes(value)
      );

      return {
        ...previous,
        propertyTypes: allSelected
          ? previous.propertyTypes.filter(
              (value) => !type.values.includes(value)
            )
          : [
              ...previous.propertyTypes.filter(
                (value) => !type.values.includes(value)
              ),
              ...type.values,
            ],
      };
    });
  };

  // Save preferences.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    setMessage("");
    setError("");

    const minPrice = Number(form.minPrice);
    const maxPrice = Number(form.maxPrice);
    const minArea = Number(form.minArea);

    if (
      !Number.isFinite(minPrice) ||
      !Number.isFinite(maxPrice) ||
      !Number.isFinite(minArea) ||
      minPrice < 0 ||
      maxPrice < 0 ||
      minArea < 0
    ) {
      setError("Please enter valid non-negative numbers.");
      return;
    }

    if (minPrice > maxPrice) {
      setError("Minimum budget cannot exceed maximum budget.");
      return;
    }

    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setError("Your session has expired. Please log in again.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        propertyTypes: form.propertyTypes,
        amenities: form.amenities,
        minPrice,
        maxPrice,
        minArea,
      };

      const response = await axios.post(
        `${API_URL}/api/recommendations/preferences`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (response.data?.success === true) {
        navigate("/buyer/recommendations", {
          replace: true,
          state: {
            message:
              response.data.message ||
              "Your preferences have been saved successfully!",
          },
        });

        return;
      }

      setError(
        response.data?.message ||
          "Unable to save preferences. Please try again."
      );
    } catch (err) {
      console.error("SAVE_PREFERENCES_ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save preferences. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading screen.
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-slate-600">
              Loading your preferences...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-6"
          >
            <HiArrowLeft size={20} />
            Back
          </button>

          {/* Page header */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-2xl p-7 md:p-10 text-white mb-8">
            <div className="flex items-center gap-3 mb-3">
              <HiSparkles size={30} />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Personalized Recommendations
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Find Properties That Match You
            </h1>

            <p className="text-emerald-50 max-w-2xl leading-relaxed">
              Tell us what kind of property you are looking for.
              Our content-based recommendation system will analyze
              your preferences and suggest properties that match
              your interests.
            </p>
          </div>

          {/* Success notification */}
          {message && (
            <div
              ref={messageRef}
              role="status"
              aria-live="polite"
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex gap-3 items-center shadow-sm"
            >
              <HiCheckCircle size={24} className="shrink-0" />
              <span className="font-semibold">{message}</span>
            </div>
          )}

          {/* Error notification */}
          {error && (
            <div
              ref={!message ? messageRef : null}
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-sm"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-9 space-y-9"
          >

            {/* Location preferences */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <HiLocationMarker size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Preferred Location
                  </h2>
                  <p className="text-sm text-slate-500">
                    Where would you like to find a property?
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">

                {/* District */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    District
                  </label>

                  <select
                    name="preferredDistrict"
                    value={form.preferredDistrict}
                    onChange={handleDistrictChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Any district</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    City
                  </label>

                  <input
                    type="text"
                    name="preferredCity"
                    value={form.preferredCity}
                    onChange={handleChange}
                    placeholder="e.g. Kathmandu"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Area
                  </label>

                  <select
                    name="preferredArea"
                    value={form.preferredArea}
                    onChange={handleChange}
                    disabled={!form.preferredDistrict}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
                  >
                    <option value="">Any area</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Property types */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <HiHome size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Property Type
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select one or more property types.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {propertyTypeOptions.map((type) => {
                  const selected = type.values.every((value) =>
                    form.propertyTypes.includes(value)
                  );

                  return (
                    <button
                      type="button"
                      key={type.label}
                      onClick={() => togglePropertyType(type)}
                      aria-pressed={selected}
                      className={`p-3 rounded-xl border text-sm font-medium transition ${
                        selected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-500"
                      }`}
                    >
                      {selected && (
                        <HiCheckCircle className="inline mr-1" />
                      )}
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Budget */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <HiCurrencyRupee size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Budget Range
                  </h2>
                  <p className="text-sm text-slate-500">
                    Set your preferred property budget in NPR.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Minimum Budget (NPR)
                  </label>

                  <input
                    type="number"
                    name="minPrice"
                    min="0"
                    value={form.minPrice}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Maximum Budget (NPR)
                  </label>

                  <input
                    type="number"
                    name="maxPrice"
                    min="0"
                    value={form.maxPrice}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Property specifications */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-5">
                Property Specifications
              </h2>

              <div className="grid md:grid-cols-3 gap-5">

                {/* BHK */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Preferred BHK
                  </label>

                  <select
                    name="bhk"
                    value={form.bhk}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Any BHK</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </select>
                </div>

                {/* Furnishing */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Furnishing
                  </label>

                  <select
                    name="furnishing"
                    value={form.furnishing}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Any furnishing</option>
                    <option value="furnished">Furnished</option>
                    <option value="semi-furnished">Semi-furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                  </select>
                </div>

                {/* Minimum area */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Minimum Area (Sq. Ft.)
                  </label>

                  <input
                    type="number"
                    name="minArea"
                    min="0"
                    value={form.minArea}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Amenities */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Preferred Amenities
              </h2>

              <p className="text-sm text-slate-500 mb-5">
                Choose the facilities you would like in your property.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {amenityOptions.map((amenity) => {
                  const selected = form.amenities.includes(amenity);

                  return (
                    <label
                      key={amenity}
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm transition ${
                        selected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                          : "border-slate-200 text-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleArrayValue("amenities", amenity)
                        }
                        className="accent-emerald-600"
                      />
                      {amenity}
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Reset and Submit buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <p className="text-sm text-slate-500">
                You can update your preferences anytime.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <HiRefresh size={19} />
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Saving Preferences..."
                    : "Save My Preferences"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BuyerPreferences;
