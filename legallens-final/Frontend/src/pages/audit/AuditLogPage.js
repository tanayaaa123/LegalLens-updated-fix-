import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ClipboardList,
  Info,
  RefreshCw,
} from "lucide-react";
import api from "../../api.js";
import "../dashboard/Dashboard.css";

const ACTION_COLORS = {
  created:  { bg: "rgba(59,130,246,0.1)",  color: "#60a5fa",  label: "Created"  },
  assigned: { bg: "rgba(139,92,246,0.1)",  color: "#a78bfa",  label: "Assigned" },
  uploaded: { bg: "rgba(16,185,129,0.1)",  color: "#34d399",  label: "Upload"   },
  verified: { bg: "rgba(234,179,8,0.1)",   color: "#fbbf24",  label: "Verified" },
  deleted:  { bg: "rgba(239,68,68,0.1)",   color: "#f87171",  label: "Deleted"  },
  updated:  { bg: "rgba(249,115,22,0.1)",  color: "#fb923c",  label: "Updated"  },
  removed:  { bg: "rgba(239,68,68,0.1)",   color: "#f87171",  label: "Removed"  },
  added:    { bg: "rgba(139,92,246,0.1)",  color: "#a78bfa",  label: "Added"    },
  profile:  { bg: "rgba(20,184,166,0.1)",  color: "#2dd4bf",  label: "Profile"  },
  password: { bg: "rgba(249,115,22,0.1)",  color: "#fb923c",  label: "Password" },
  reset:    { bg: "rgba(249,115,22,0.1)",  color: "#fb923c",  label: "Reset"    },
};

function getActionTag(action = "") {
  const lower = action.toLowerCase();
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Action" };
}

const ROLE_COLORS = {
  Supervising_Officer: "#818cf8",
  Lead_Investigator:   "#34d399",
  Forensic_Officer:    "#fbbf24",
  Police_Officer:      "#60a5fa",
  Administrator:       "#a78bfa",
};

export default function AuditLogPage() {
  const user   = JSON.parse(localStorage.getItem("user"));
  const isLead = user?.role_id === 2;

  const [logs, setLogs]             = useState([]);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const debounceRef = useRef(null);

  // Debounce search input
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/audit-logs?page=${page}&limit=15&search=${encodeURIComponent(debouncedSearch)}`,
      );
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit logs");
      setLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Silent auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => fetchLogs(true), 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const fmtTime = (ts) =>
    new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const exportCSV = () => {
    const rows = [["Log ID", "User", "Role", "Action", "Date", "Time"]];
    logs.forEach((l) =>
      rows.push([
        l.log_id,
        l.user?.name,
        l.role,
        l.action,
        fmtDate(l.timestamp),
        fmtTime(l.timestamp),
      ]),
    );
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboardMain">
      {/* Header */}
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText">
            <span>LEGALLENS</span>{" "}
            {isLead ? "My Cases — Audit Log" : "Audit Log"}
          </h1>
          <p className="systemStatus">
            {isLead ? (
              "Activity records for cases you are assigned to"
            ) : (
              <>
                Complete system history •{" "}
                <span className="highlightText">{total} total records</span>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="secondaryActionBtn"
            style={{ width: "auto", padding: "0.6rem 1rem" }}
            onClick={() => fetchLogs()}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="secondaryActionBtn"
            style={{ width: "auto", padding: "0.6rem 1.25rem" }}
            onClick={exportCSV}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Lead Investigator info banner */}
      {isLead && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.75rem 1rem",
            background: "rgba(79,70,229,0.08)",
            border: "1px solid rgba(79,70,229,0.2)",
            borderRadius: 10,
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
            color: "#a5b4fc",
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            You can see audit activity for all cases you are assigned to.
            Contact your Administrator to view full system logs.
          </span>
        </div>
      )}

      {/* Search + Stats bar */}
      <div className="auditTopBar">
        <div className="membersSearch" style={{ maxWidth: 420 }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder={
              isLead
                ? "Search actions in your cases..."
                : "Search by user or action..."
            }
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "0.875rem",
              width: "100%",
            }}
          />
        </div>

        <div className="auditStats">
          {[
            ["Created", "created"],
            ["Uploaded", "uploaded"],
            ["Deleted", "deleted"],
            ["Updated", "updated"],
          ].map(([label, key]) => {
            const count = logs.filter((l) =>
              l.action?.toLowerCase().includes(key),
            ).length;
            const tag = getActionTag(key);
            return (
              <div
                key={key}
                className="auditStatChip"
                style={{ background: tag.bg, color: tag.color }}
              >
                <span>{label}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {lastRefreshed && (
        <p
          style={{
            color: "#334155",
            fontSize: "0.72rem",
            marginBottom: "0.75rem",
            textAlign: "right",
          }}
        >
          Last updated: {lastRefreshed.toLocaleTimeString()}
        </p>
      )}

      {/* Table */}
      <div className="formSectionCard" style={{ marginBottom: "2rem" }}>
        <div className="sectionHeader">
          <div className="indicatorDot" />
          <h2>Activity Records</h2>
          {total > 0 && (
            <span
              style={{
                marginLeft: "auto",
                color: "#64748b",
                fontSize: "0.8rem",
              }}
            >
              {total} record{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div
            className="alertBanner alertError"
            style={{ margin: "1rem 1.5rem" }}
          >
            {error}
          </div>
        )}

        <table className="legalTable">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Type</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#475569",
                  }}
                >
                  <div
                    className="miniSpinner"
                    style={{ margin: "0 auto 0.75rem" }}
                  />
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#475569",
                  }}
                >
                  <ClipboardList
                    size={36}
                    style={{ marginBottom: "0.75rem", opacity: 0.4 }}
                  />
                  <p style={{ margin: 0 }}>
                    {search
                      ? `No records matching "${search}"`
                      : isLead
                        ? "No audit records for your assigned cases yet"
                        : "No audit logs found"}
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const tag = getActionTag(log.action);
                return (
                  <tr key={log._id} className="auditRow">
                    <td
                      className="mutedText"
                      style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                    >
                      {String(log.log_id ?? "—").padStart(4, "0")}
                    </td>
                    <td>
                      <div className="nameCell">
                        <div className="avatarCircle">
                          {log.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p
                            className="boldText"
                            style={{ margin: 0, fontSize: "0.875rem" }}
                          >
                            {log.user?.name || "Unknown"}
                          </p>
                          <p
                            className="mutedText"
                            style={{ margin: 0, fontSize: "0.75rem" }}
                          >
                            {log.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          color: ROLE_COLORS[log.role] || "#94a3b8",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {log.role?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td
                      style={{ maxWidth: 320, fontSize: "0.875rem" }}
                      className="auditActionCell"
                    >
                      {log.action}
                    </td>
                    <td>
                      <span
                        style={{
                          background: tag.bg,
                          color: tag.color,
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {tag.label}
                      </span>
                    </td>
                    <td
                      className="mutedText"
                      style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
                    >
                      {fmtDate(log.timestamp)}
                    </td>
                    <td
                      className="mutedText"
                      style={{
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtTime(log.timestamp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="auditPagination">
            <button
              className="actionCircle"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
              Page <span className="highlightText">{page}</span> of{" "}
              {totalPages}
            </span>
            <button
              className="actionCircle"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
