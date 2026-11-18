import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  HiArrowsExpand,
  HiX,
  HiTrash,
} from "react-icons/hi";

const PropertyComparisonContext = createContext(null);

const STORAGE_KEY = "realEstateComparison";

// ==========================================
// PROPERTY COMPARISON PROVIDER
// ==========================================

export const PropertyComparisonProvider = ({ children }) => {
  const [selectedProperties, setSelectedProperties] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

      return Array.isArray(parsed)
        ? parsed
            .filter((property) => property?._id)
            .slice(0, 2)
        : [];
    } catch (error) {
      console.error("Error loading comparison properties:", error);
      return [];
    }
  });

  // Keep an immediate reference to the latest selection.
  const selectedPropertiesRef = useRef(selectedProperties);

  // Save selected properties to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(selectedProperties)
      );
    } catch (error) {
      console.error("Error saving comparison properties:", error);
    }
  }, [selectedProperties]);

  // ==========================================
  // ADD PROPERTY
  // ==========================================

  const addProperty = useCallback((property) => {
    if (!property?._id) {
      return {
        success: false,
        message: "Invalid property.",
      };
    }

    const current = selectedPropertiesRef.current;

    // Check whether property is already selected.
    const alreadySelected = current.some(
      (item) => String(item._id) === String(property._id)
    );

    if (alreadySelected) {
      return {
        success: false,
        message: "This property is already selected.",
      };
    }

    // Maximum two properties allowed.
    if (current.length >= 2) {
      return {
        success: false,
        message: "You can compare only two properties. Remove a property first.",
      };
    }

    const updatedProperties = [...current, property];

    selectedPropertiesRef.current = updatedProperties;
    setSelectedProperties(updatedProperties);

    return {
      success: true,
      message: "Property added for comparison.",
    };
  }, []);

  // ==========================================
  // REMOVE PROPERTY
  // ==========================================

  const removeProperty = useCallback((propertyId) => {
    const updatedProperties =
      selectedPropertiesRef.current.filter(
        (item) => String(item._id) !== String(propertyId)
      );

    selectedPropertiesRef.current = updatedProperties;
    setSelectedProperties(updatedProperties);
  }, []);

  // ==========================================
  // CLEAR ALL SELECTED PROPERTIES
  // ==========================================

  const clearComparison = useCallback(() => {
    selectedPropertiesRef.current = [];
    setSelectedProperties([]);
  }, []);

  // ==========================================
  // CHECK IF PROPERTY IS SELECTED
  // ==========================================

  const isSelected = useCallback(
    (propertyId) => {
      return selectedProperties.some(
        (item) => String(item._id) === String(propertyId)
      );
    },
    [selectedProperties]
  );

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      selectedProperties,
      addProperty,
      removeProperty,
      clearComparison,
      isSelected,
    }),
    [
      selectedProperties,
      addProperty,
      removeProperty,
      clearComparison,
      isSelected,
    ]
  );

  return (
    <PropertyComparisonContext.Provider value={value}>
      {children}
    </PropertyComparisonContext.Provider>
  );
};

// ==========================================
// CUSTOM HOOK
// ==========================================

export const usePropertyComparison = () => {
  const context = useContext(PropertyComparisonContext);

  if (!context) {
    throw new Error(
      "usePropertyComparison must be used inside PropertyComparisonProvider"
    );
  }

  return context;
};

// ==========================================
// PERSISTENT COMPARISON BAR
// ==========================================

export const PropertyComparisonBar = () => {
  const {
    selectedProperties,
    removeProperty,
    clearComparison,
  } = usePropertyComparison();

  const navigate = useNavigate();

  // Hide bar when no properties are selected.
  if (selectedProperties.length === 0) {
    return null;
  }

  const handleCompare = () => {
    if (selectedProperties.length !== 2) {
      return;
    }

    navigate("/buyer/compare");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white shadow-[0_-5px_25px_rgba(0,0,0,0.12)]">

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Selected properties */}
        <div className="flex flex-1 flex-wrap items-center gap-3">

          <div className="flex items-center gap-2 text-emerald-700">
            <HiArrowsExpand size={22} />

            <span className="font-bold">
              Compare Properties ({selectedProperties.length}/2)
            </span>
          </div>

          {selectedProperties.map((property) => (
            <div
              key={property._id}
              className="flex max-w-[220px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <span className="truncate text-sm font-medium text-gray-700">
                {property.title || "Selected property"}
              </span>

              <button
                type="button"
                onClick={() => removeProperty(property._id)}
                aria-label={`Remove ${property.title || "property"}`}
                className="shrink-0 text-gray-500 transition hover:text-red-600"
              >
                <HiX size={18} />
              </button>
            </div>
          ))}

          {selectedProperties.length === 1 && (
            <span className="text-sm text-gray-500">
              Select one more property to compare.
            </span>
          )}

        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">

          <button
            type="button"
            onClick={clearComparison}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <HiTrash size={17} />
            Clear
          </button>

          <button
            type="button"
            onClick={handleCompare}
            disabled={selectedProperties.length !== 2}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <HiArrowsExpand size={18} />
            Compare Now
          </button>

        </div>
      </div>
    </div>
  );
};