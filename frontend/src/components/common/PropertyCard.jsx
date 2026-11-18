
import React from "react";
import { propertyCardStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { usePropertyComparison } from "../../context/PropertyComparisonContext";
import { Link, useNavigate } from "react-router-dom";

import {
  HiArrowsExpand,
  HiEye,
  HiHeart,
  HiOutlineHeart,
  HiOutlineHome,
  HiOutlineLocationMarker,
  HiOutlineUserGroup,
  HiShieldCheck,
} from "react-icons/hi";

const PropertyCard = ({
  property,
  renderActions,
  isWishlisted,
  onToggleWishlist,
  compact = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    addProperty,
    removeProperty,
    isSelected,
  } = usePropertyComparison();

  if (!property) return null;

  const userRole = String(user?.role || "").toLowerCase();

  const isBuyer = userRole === "buyer";
  const canCompare = !user || isBuyer;

  const propertySelected = isSelected(property._id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }

    if (onToggleWishlist) {
      onToggleWishlist(property._id);
    }
  };

  const handleCompareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }

    if (!isBuyer) {
      return;
    }

    if (propertySelected) {
      removeProperty(property._id);
      return;
    }

    const result = addProperty(property);

    if (!result.success) {
      window.alert(result.message);
    }
  };

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(property.price) || 0);

  // ==========================================
  // PROPERTY STATUS BADGE
  // ==========================================

  const propertyStatus = String(
    property.status || "sale"
  ).toLowerCase();

  const statusConfig = {
    sale: {
      label: "AVAILABLE",
      className: "bg-green-600 text-white",
    },
    booked: {
      label: "BOOKED",
      className: "bg-red-600 text-white",
    },
    sold: {
      label: "SOLD",
      className: "bg-gray-800 text-white",
    },
  };

  const currentStatus = statusConfig[propertyStatus] || {
    label: propertyStatus.toUpperCase(),
    className: "bg-gray-600 text-white",
  };

  return (
    <div className={s.card}>
      <Link to={`/property/${property._id}`} className={s.link}>
        {/* Property Image Section */}
        <div
          className={`${s.imageSection} relative w-full overflow-hidden bg-gray-100 ${
            compact ? "h-[250px]" : "h-[460px]"
          }`}
        >
          <div
            className={
              compact
                ? "h-full w-full"
                : "mx-auto h-full w-full max-w-[380px]"
            }
          >
            <img
              src={property.images?.[0] || "/placeholder-property.jpg"}
              alt={property.title || "Property"}
              className={`h-full w-full ${
                compact
                  ? "object-contain object-center"
                  : "object-contain"
              }`}
            />
          </div>

          {/* Badges and Wishlist */}
          <div className={s.topBadges}>
            <div className={s.badgesLeft}>
              {/* Always display actual property status */}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-md ${currentStatus.className}`}
              >
                {currentStatus.label}
              </span>

              {/* Admin verified badge */}
              {property.isVerified && (
                <span className={s.badgeVerified}>
                  <HiShieldCheck size={14} />
                  Verified
                </span>
              )}
            </div>

            {(!user || isBuyer) && (
              <button
                type="button"
                className={s.wishlistButton(isWishlisted)}
                onClick={handleWishlistClick}
                aria-label={
                  isWishlisted
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
              >
                {isWishlisted ? (
                  <HiHeart size={20} />
                ) : (
                  <HiOutlineHeart size={20} />
                )}
              </button>
            )}
          </div>

          {/* Property Price */}
          <div className={s.priceOverlay}>
            <h3 className={s.price}>{formattedPrice}</h3>
          </div>
        </div>

        {/* Property Details */}
        <div className={s.content}>
          <div className="flex items-center justify-between">
            <span className={s.propertyType}>
              {property.propertyType}
            </span>

            {property.views !== undefined && (
              <div className={s.views}>
                <HiEye size={16} />
                {property.views}
              </div>
            )}
          </div>

          <h4 className={s.title}>{property.title}</h4>

          <div className={s.location}>
            <HiOutlineLocationMarker className={s.locationIcon} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {property.area}, {property.city}
            </span>
          </div>

          {/* Property Specifications */}
          <div className={s.specsGrid}>
            {property.propertyType?.toLowerCase() === "commercial" ? (
              <>
                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiOutlineHome size={20} />
                  </div>
                  <div className={s.specValue}>
                    {property.status}
                  </div>
                  <div className={s.specLabel}>Type</div>
                </div>

                <div className={`${s.specItem} ${s.specDivider}`}>
                  <div className={s.specIcon}>
                    <HiArrowsExpand size={20} />
                  </div>
                  <div className={s.specValue}>
                    {property.areaSize}
                  </div>
                  <div className={s.specLabel}>Sq Ft</div>
                </div>

                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiShieldCheck size={20} />
                  </div>
                  <div className={s.specValue}>OK</div>
                  <div className={s.specLabel}>Legal</div>
                </div>
              </>
            ) : (
              <>
                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiOutlineHome size={20} />
                  </div>
                  <div className={s.specValue}>
                    {property.bhk || "N/A"}
                  </div>
                  <div className={s.specLabel}>Beds</div>
                </div>

                <div className={`${s.specItem} ${s.specDivider}`}>
                  <div className={s.specIcon}>
                    <HiOutlineUserGroup size={20} />
                  </div>
                  <div className={s.specValue}>
                    {property.bathrooms ||
                      Math.max(1, parseInt(property.bhk) - 1 || 0)}
                  </div>
                  <div className={s.specLabel}>Baths</div>
                </div>

                <div className={s.specItem}>
                  <div className={s.specIcon}>
                    <HiArrowsExpand size={20} />
                  </div>
                  <div className={s.specValue}>
                    {property.areaSize || "N/A"}
                  </div>
                  <div className={s.specLabel}>Sq Ft</div>
                </div>
              </>
            )}
          </div>

          {!renderActions && (
            <div className={s.viewDetailsButton}>
              <button type="button" className={s.viewDetailsBtn}>
                View Detail
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* Buyer Comparison Button */}
      {canCompare && (
        <div className="relative z-10 px-3 pb-3">
          <button
            type="button"
            onClick={handleCompareClick}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              propertySelected
                ? "border-teal-600 bg-teal-50 text-teal-700 hover:bg-teal-100"
                : "border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            <HiArrowsExpand size={17} />

            {propertySelected
              ? "Remove from Compare"
              : "Compare"}
          </button>
        </div>
      )}

      {/* Seller/Admin Actions */}
      {renderActions && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={s.actionsContainer}
        >
          {renderActions(property)}
        </div>
      )}
    </div>
  );
};

export default PropertyCard;
