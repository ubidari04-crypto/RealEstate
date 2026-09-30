import React, { useEffect, useState } from "react";
import { sellerDashboardStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import API_URL from "../../config";
import {
    HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineLibrary,
  HiOutlinePencilAlt,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiPlus,
} from "react-icons/hi";
import { Link } from "react-router-dom";
import PropertyCard from "../../components/common/propertyCard";

const SellerDashboard = () => {
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    soldProperties: 0,
    totalInquiries: 0,
    totalViews: 0,
  });

  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, propsRes, inqRes] = await Promise.all([
          axios.get(`${API_URL}/api/property/seller/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/property/my`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/inquiry/seller`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(statsRes.data.stats || statsRes.data);

        const fetchedProperties = Array.isArray(propsRes.data)
          ? propsRes.data
          : propsRes.data.properties || [];

        setProperties(fetchedProperties);

        const fetchedInquiries = Array.isArray(inqRes.data?.inquiries)
          ? inqRes.data.inquiries
          : Array.isArray(inqRes.data)
            ? inqRes.data
            : [];

        setInquiries(fetchedInquiries.slice(0, 3));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!shouldDelete) return;

    try {
      await axios.delete(`${API_URL}/api/property/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProperties((previousProperties) =>
        previousProperties.filter((property) => property._id !== id)
      );

      setStats((previousStats) => ({
        ...previousStats,
        totalProperties: Math.max(0, previousStats.totalProperties - 1),
      }));
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert("Failed to delete property.");
    }
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    const newStatus = currentStatus === "sold" ? "sale" : "sold";

    try {
      await axios.patch(
        `${API_URL}/api/property/${id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
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

  const escapeCsvValue = (value) => {
    const stringValue = String(value ?? "");
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const handleExport = () => {
    const headers = ["Title", "Location", "Type", "Price", "Status", "Views"];

    const csvRows = properties.map((property) => [
      property.title,
      `${property.area || ""}, ${property.city || ""}`,
      property.propertyType,
      property.price,
      property.status,
      property.views || 0,
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "property_listings.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: "Total Views",
      value: stats.totalViews?.toLocaleString() || "0",
      icon: HiOutlineEye,
      color: "#0d6e59",
    },
    {
      title: "Active Leads",
      value: stats.totalInquiries?.toLocaleString() || "0",
      icon: HiOutlineUserGroup,
      color: "#0d6e59",
    },
    {
      title: "Live Listings",
      value: stats.activeListings?.toLocaleString() || "0",
      icon: HiOutlineLibrary,
      color: "#0d6e59",
    },
    {
      title: "Properties Sold",
      value: stats.soldProperties?.toLocaleString() || "0",
      icon: HiOutlineCheckCircle,
      color: "#0d6e59",
    },
  ];

  const filteredProperties = properties
    .filter((property) => {
      const search = searchTerm.toLowerCase();

      return (
        property.title?.toLowerCase().includes(search) ||
        property.city?.toLowerCase().includes(search) ||
        property.area?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (loading) {
    return (
      <div className="loader-full-page">
        <div className="loader" />
      </div>
    );
  }

  return (
    <>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <h1 className={s.headerTitle}>Seller Dashboard</h1>
          <p className={s.headerSubtitle}>
            Manage your property portfolio and track performance.
          </p>
        </div>

        <div className={s.headerActions}>
          <button onClick={handleExport} className={s.exportButton}>
            <HiOutlineDownload size={20} />
            Export
          </button>

          <Link to="/add-property" className={s.addButton}>
            <HiPlus size={20} />
            Add New
          </Link>
        </div>
      </header>

      <div className={s.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              style={{ "--card-color": card.color }}
              className={s.statCard}
            >
              <div className={s.statIconWrapper}>
                <Icon size={20} />
              </div>
              <div className={s.statTitle}>{card.title}</div>
              <div className={s.statValue}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className={s.listingsSection}>
        <div className={s.listingsHeader}>
          <h2 className={s.listingsTitle}>Property Listings</h2>

          <div className={s.searchWrapper}>
            <HiOutlineSearch className={s.searchIcon} />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <div className={s.emptyListings}>
            No properties found mathching... {searchTerm && `"${searchTerm}"`}
          </div>
        ) : (
          <>
            <div className={s.propertiesGrid}>
              {filteredProperties.slice(0, 3).map((property) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  renderActions={() => (
                    <div className={s.propertyActions}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStatusUpdate(property._id, property.status);
                        }}
                        className={s.statusButton(property.status)}
                        title={
                          property.status === "sold"
                            ? "Mark as Available"
                            : "Mark as Sold"
                        }
                      >
                        <HiOutlineCheckCircle size={14} />
                        {property.status === "sold" ? "Available" : "Sold"}
                      </button>

                      <Link
                        to={`/edit-property/${property._id}`}
                        className={s.editButton}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <HiOutlinePencilAlt size={14} />
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(property._id);
                        }}
                        className={s.deleteButton}
                      >
                        <HiOutlineTrash size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                />
              ))}
            </div>

            {filteredProperties.length > 3 && (
              <div className={s.showMoreWrapper}>
                <Link to="/my-properties" className={s.showMoreButton}>
                  Show More Listings{" "}
                  <HiOutlinePencilAlt
                    size={18}
                    style={{
                      transform: "rotate(90deg)",
                    }}
                  />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      <div className={s.widgetsGrid}>
        <div className={s.inquiriesWidget}>
            <h2 className={s.widgetTitle}>Recent Lead Inquiries</h2>
            <p className={s.widgetSubtitle}>
                New messages from potential buyers.
            </p>

            <div className={s.inquiriesList}>
                {inquiries.map((inq, i) => (
                    <div key={inq._id} className={s.inquiryItem}>
                        <div className={s.inquiryLeft}>
                            <div className={s.inquiryIcon}>
                                <HiOutlineBell size={18} color="var(--primary)"  />
                            </div>

                            <div>
                                <div className={s.inquiryName}>
                                    {inq.buyer?.name || "Potentail Buyer"}
                                </div>
                                <div className={s.inquiryProperty}>
                                    {inq.property?.title?.length > 30
                                    ? inq.property?.title?.slice(0,30) + "..."
                                    : inq.property?.title}

                                </div>
                            </div>
                        </div>

                        <div className={s.inquiryRight}>
                            <div className={s.inquiryDate}>
                                {new Date(inq.createdAt).toLocaleDateString()}
                            </div>
                            <span className={s.inquiryStatus(inq.status)}>
                                {inq.status === "read" ? "Read" : "New"}
                            </span>
                        </div>
                    </div>
                ))}
                {inquiries.length === 0 && (
                    <p className={s.noInquiries}>No Recent Inquires</p>
                )}
            </div>
        </div>

        <div className={s.tipsWidget}>
            <h2 className={s.widgetTitle}>Quick Tips</h2>
            <div className={s.tipsList}>
                <div className={s.tipCardHighViews}>
                    <h4 className={s.tipTitleHighViews}>
                        <HiOutlineEye size={16} /> High Views!
                    </h4>
                    <p className={s.tipTextHighViews}>
                        Your listings are trending. try adding video tours to increase
                         interest.
                    </p>
                </div>
                <div className={s.tipCardMarket}>
                    <h4 className={s.tipTitleMarket}>Market Insight</h4>
                    <p className={s.tipTextMarket}>
                        Property in your area are selling fast. Your prices are
                         competitive.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default SellerDashboard;