import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import api from "../../api.js";
import "../../components/Components.css";

export default function TimelineTab({ caseId, caseData, refreshKey = 0 }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdminOrLead = user?.role_id === 1 || user?.role_id === 2;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    event_date: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get(`/case/${caseId}/events`);
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      await fetchEvents();
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [caseId, fetchEvents, refreshKey]);

  const handleAdd = async () => {
    if (!form.title.trim()) return setError("Event title is required");
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/case/${caseId}/events`, {
        title: form.title.trim(),
        event_date: form.event_date
          ? new Date(form.event_date).toISOString()
          : new Date().toISOString(),
        description: form.description,
      });
      setForm({ title: "", event_date: "", description: "" });
      setShowForm(false);
      setSuccessMsg("Event added successfully");
      fetchEvents();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Delete this timeline event?")) return;
    try {
      await api.delete(`/case/${caseId}/events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete event");
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  // Helper: is this a real DB event (deletable) vs synthetic/system event?
  const isRealDbEvent = (event) => {
    if (event.isSystem) return false;
    // Synthetic events from backend have string _id like "legacy-evidence-xxx", "legacy-audit-xxx"
    const id = String(event._id || "");
    if (
      id.startsWith("legacy-") ||
      id.startsWith("case-open") ||
      id.startsWith("case-close") ||
      id.startsWith("lead-assign")
    )
      return false;
    // Real MongoDB ObjectIds are 24-char hex strings
    return /^[a-f0-9]{24}$/i.test(id);
  };

  // Build combined timeline with system events
  const baseEvents = [];
  if (caseData?.start_date) {
    baseEvents.push({
      _id: "case-open",
      title: `Case opened: "${caseData.title}"`,
      event_date: caseData.start_date,
      isSystem: true,
      color: "#4f46e5",
    });
  }
  if (caseData?.leadInvestigators?.length) {
    baseEvents.push({
      _id: "lead-assign",
      title: `Lead Investigator: ${caseData.leadInvestigators.join(", ")}`,
      event_date: caseData.start_date,
      isSystem: true,
      color: "#34d399",
    });
  }

  const allEvents = [
    ...baseEvents,
    ...events.map((e) => ({ ...e, color: "#818cf8" })),
  ];

  if (caseData?.status === "Close" && caseData?.end_date) {
    allEvents.push({
      _id: "case-close",
      title: "Case closed",
      event_date: caseData.end_date,
      isSystem: true,
      color: "#f87171",
    });
  }

  allEvents.sort(
    (a, b) =>
      new Date(a.event_date || 0) - new Date(b.event_date || 0),
  );

  return (
    <div className="timelineContainer">
      {/* Add Event Button */}
      {isAdminOrLead && (
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(79,70,229,0.1)",
              border: "1px solid rgba(79,70,229,0.25)",
              color: "#818cf8",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <Plus size={15} />
            {showForm ? "Cancel" : "Add Timeline Event"}
          </button>

          {successMsg && (
            <p
              style={{
                color: "#34d399",
                fontSize: "0.8rem",
                marginTop: "0.5rem",
              }}
            >
              {successMsg}
            </p>
          )}

          {showForm && (
            <div
              style={{
                marginTop: "0.75rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "1.25rem",
              }}
            >
              {error && (
                <p
                  style={{
                    color: "#f87171",
                    fontSize: "0.8rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  {error}
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div className="inputGroup">
                  <label>Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Witness interviewed"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="inputGroup">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, event_date: e.target.value }))
                    }
                  />
                </div>
                <div className="inputGroup" style={{ gridColumn: "span 2" }}>
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="Optional details..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.75rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btnCancel"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btnCreate"
                  onClick={handleAdd}
                  disabled={submitting}
                >
                  {submitting ? "Adding..." : "Add Event"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div
          style={{ textAlign: "center", padding: "2rem", color: "#475569" }}
        >
          <div className="miniSpinner" style={{ margin: "0 auto 0.75rem" }} />
          Loading timeline...
        </div>
      ) : allEvents.length === 0 ? (
        <p style={{ color: "#475569", fontSize: "0.875rem" }}>
          No timeline events yet
        </p>
      ) : (
        allEvents.map((event, i) => (
          <div key={event._id} className="timelineEntry">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                className="timelineDot"
                style={{ background: event.color }}
              />
              {i < allEvents.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    minHeight: 24,
                    marginTop: 4,
                  }}
                />
              )}
            </div>
            <div
              style={{
                paddingBottom: i < allEvents.length - 1 ? "1.25rem" : 0,
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p className="timelineInfo">{event.title}</p>
                {event.description && (
                  <p
                    style={{
                      color: "#475569",
                      fontSize: "0.78rem",
                      margin: "2px 0 0",
                    }}
                  >
                    {event.description}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <Calendar size={10} color="#334155" />
                  <span style={{ fontSize: "0.7rem", color: "#334155" }}>
                    {formatDate(event.event_date)}
                    {event.created_by?.name && (
                      <span> • Added by {event.created_by.name}</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Only show delete for real DB events (not synthetic/system) */}
              {isAdminOrLead && isRealDbEvent(event) && (
                <button
                  className="actionCircle"
                  onClick={() => handleDelete(event._id)}
                  title="Delete event"
                  style={{
                    color: "#f87171",
                    flexShrink: 0,
                    marginLeft: "1rem",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
