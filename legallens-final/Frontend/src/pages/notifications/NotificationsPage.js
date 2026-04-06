import React, { useEffect, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, RefreshCw, AlertCircle } from "lucide-react";
import api from "../../api.js";
import "../dashboard/Dashboard.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load notifications";
      setError(msg);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRetry = () => { setRetrying(true); load(true); };

  const handleMarkRead = async (id) => {
    // optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: false } : n)),
      );
    }
  };

  const handleMarkAllRead = async () => {
    const prev = notifications;
    setNotifications((all) => all.map((n) => ({ ...n, read: true })));
    try {
      await api.patch("/notifications/read-all");
    } catch {
      setNotifications(prev);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "Unknown time";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read")   return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="dashboardMain">
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText">
            <span>LEGALLENS</span> Notifications
          </h1>
          <p className="systemStatus">
            {loading ? "Loading…" : error ? (
              <span style={{ color: "#f87171" }}>Could not load — see below</span>
            ) : unreadCount > 0 ? (
              <span>
                <span className="highlightText">{unreadCount}</span>{" "}
                unread notification{unreadCount > 1 ? "s" : ""}
              </span>
            ) : (
              "All caught up!"
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Refresh button */}
          <button
            className="secondaryActionBtn"
            style={{ width: "auto", padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={handleRetry}
            disabled={retrying}
            title="Refresh notifications"
          >
            <RefreshCw size={15} style={{ animation: retrying ? "spin 0.8s linear infinite" : "none" }} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              className="primaryActionBtn"
              style={{ width: "auto", padding: "0.6rem 1.5rem" }}
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="notifFilterTabs">
        {[
          { key: "all",    label: `All (${notifications.length})` },
          { key: "unread", label: `Unread (${notifications.filter((n) => !n.read).length})` },
          { key: "read",   label: `Read (${notifications.filter((n) => n.read).length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`notifFilterTab ${filter === key ? "notifFilterTabActive" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="notifPageList">
        {loading ? (
          <div className="notifLoadingState">
            <div className="notifLoadingSpinner" />
            <p>Loading notifications…</p>
          </div>

        ) : error ? (
          <div className="notifEmptyState" style={{ gap: "1rem" }}>
            <AlertCircle size={48} style={{ color: "#f87171" }} />
            <p style={{ color: "#f87171", margin: 0 }}>{error}</p>
            <button
              className="primaryActionBtn"
              style={{ width: "auto", padding: "0.6rem 1.5rem" }}
              onClick={handleRetry}
              disabled={retrying}
            >
              <RefreshCw size={15} /> Try again
            </button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="notifEmptyState">
            <Bell size={48} style={{ color: "#334155" }} />
            <p>
              {filter !== "all"
                ? `No ${filter} notifications`
                : "No notifications yet — they'll appear here as you work on cases"}
            </p>
          </div>

        ) : (
          filtered.map((n) => (
            <div
              key={n._id}
              className={`notifPageItem ${n.read ? "notifPageItemRead" : "notifPageItemUnread"}`}
            >
              <div
                className="notifPageDot"
                style={{ background: n.read ? "#334155" : "#4f46e5" }}
              />
              <div className="notifPageContent">
                <p className="notifPageText">{n.message}</p>
                <span className="notifPageTime">{formatTime(n.created_at)}</span>
              </div>
              <div className="notifPageStatus">
                <span className={`notifStatusBadge ${n.read ? "notifStatusRead" : "notifStatusUnread"}`}>
                  {n.read ? "Read" : "Unread"}
                </span>
                {!n.read && (
                  <button
                    className="notifMarkBtn"
                    onClick={() => handleMarkRead(n._id)}
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
