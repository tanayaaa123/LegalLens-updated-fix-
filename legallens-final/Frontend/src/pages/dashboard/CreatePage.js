import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Search, Plus, CheckCircle, AlertCircle, UserPlus, FileText, Users, Settings2 } from "lucide-react";
import "./Dashboard.css";
import "../../App.css";
import api from "../../api";

export default function CreatePage() {
  const navigate = useNavigate();

  const [title,           setTitle]       = useState("");
  const [description,     setDesc]        = useState("");
  const [crimeDate,       setCrimeDate]   = useState("");
  const [startDate,       setStartDate]   = useState("");
  const [priority,        setPriority]    = useState("High");
  const [status,          setStatus]      = useState("Open");
  const [leader,          setLeader]      = useState("");
  const [leaders,         setLeaders]     = useState([]);
  const [searchTerm,      setSearch]      = useState("");
  const [roleFilter,      setRoleFilter]  = useState("");
  const [regionFilter,    setRegionFilter]= useState("");
  const [searchResults,   setResults]     = useState([]);
  const [assignedMembers, setMembers]     = useState([]);
  const [submitting,      setSubmitting]  = useState(false);
  const [msg,             setMsg]         = useState({ type: "", text: "" });
  const [roles,           setRoles]       = useState([]);
  const [regions,         setRegions]     = useState([]);

  const flash = (type, text) => {
    setMsg({ type, text });
    if (type === "success") setTimeout(() => navigate("/cases"), 1800);
    else setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const [leadsRes, rolesRes, regionsRes] = await Promise.all([
          api.get("/users/leads"),
          api.get("/roles"),
          api.get("/regions"),
        ]);
        setLeaders(Array.isArray(leadsRes.data) ? leadsRes.data : []);
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
        setRegions(Array.isArray(regionsRes.data) ? regionsRes.data : []);
      } catch (err) { console.error("Setup load error:", err); }
    })();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchTerm && !roleFilter && !regionFilter) { setResults([]); return; }
    try {
      const params = new URLSearchParams();
      if (searchTerm)   params.append("q",      searchTerm);
      if (roleFilter)   params.append("role",   roleFilter);
      if (regionFilter) params.append("region", regionFilter);
      const res = await api.get(`/users/search?${params}`);
      const existingIds = new Set(assignedMembers.map((m) => m._id));
      setResults((Array.isArray(res.data) ? res.data : []).filter((u) => !existingIds.has(u._id)));
    } catch { setResults([]); }
  }, [searchTerm, roleFilter, regionFilter, assignedMembers]);

  useEffect(() => { handleSearch(); }, [handleSearch]);

  const addMember = (member) => {
    if (!assignedMembers.find((m) => m._id === member._id)) setMembers((p) => [...p, member]);
    setSearch(""); setResults([]);
  };
  const removeMember = (id) => setMembers((p) => p.filter((m) => m._id !== id));

  const handleCreate = async () => {
    if (!title.trim())       return flash("error", "Case title is required");
    if (!description.trim()) return flash("error", "Description is required");
    setSubmitting(true);
    try {
      await api.post("/create-case", {
        title:       title.trim(),
        description: description.trim(),
        status, priority,
        start_date:  startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        crime_date:  crimeDate ? new Date(crimeDate).toISOString() : undefined,
        leader_id:   leader || undefined,
        member_ids:  assignedMembers.map((m) => m._id),
      });
      flash("success", "Case created successfully! Redirecting...");
    } catch (err) {
      flash("error", err.response?.data?.message || "Failed to create case");
    } finally { setSubmitting(false); }
  };

  const priorityColor = priority === "High" ? "#f87171" : priority === "Medium" ? "#fbbf24" : "#34d399";

  return (
    <div className="dashboardMain">

      {/* ── Header ── */}
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText"><span>LEGALLENS</span> Create Case</h1>
          <p className="systemStatus">Fill in the details below to open a new investigation case</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="secondaryActionBtn" style={{ width: "auto", padding: "0.6rem 1.25rem" }}
            onClick={() => navigate("/cases")} disabled={submitting}>
            Cancel
          </button>
          <button className="primaryActionBtn"
            style={{ width: "auto", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={handleCreate} disabled={submitting}>
            <Plus size={15} />{submitting ? "Creating..." : "Create Case"}
          </button>
        </div>
      </header>

      {/* ── Alert ── */}
      {msg.text && (
        <div className={`alertBanner ${msg.type === "success" ? "alertSuccess" : "alertError"}`}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {msg.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════
          THREE PANELS — stacked vertically,
          fields inside each panel are HORIZONTAL
         ══════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── Panel 1: Case Details ── */}
        <div className="createCasePanel">
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background: "#3b82f6", boxShadow: "0 0 8px rgba(59,130,246,0.5)" }} />
            <FileText size={13} style={{ color: "#3b82f6" }} />
            <h2>CASE DETAILS</h2>
          </div>

          <div className="createHPanel">
            {/* Case Title */}
            <div className="createHRow">
              <label className="createHLabel">
                Case Title <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input className="createHInput" type="text"
                placeholder="e.g. Downtown Bank Robbery"
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Description */}
            <div className="createHRow" style={{ alignItems: "flex-start" }}>
              <label className="createHLabel" style={{ paddingTop: "0.6rem" }}>
                Description <span style={{ color: "#f87171" }}>*</span>
              </label>
              <textarea className="createHInput"
                placeholder="Describe the case in detail..."
                value={description} onChange={(e) => setDesc(e.target.value)}
                rows={3} style={{ resize: "vertical" }} />
            </div>

            {/* Date of Crime */}
            <div className="createHRow">
              <label className="createHLabel">Date of Crime</label>
              <input className="createHInput" type="date"
                value={crimeDate} onChange={(e) => setCrimeDate(e.target.value)} />
            </div>

            {/* Case Start Date */}
            <div className="createHRow">
              <label className="createHLabel">Case Start Date</label>
              <input className="createHInput" type="date"
                value={startDate} max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Panel 2: Assign Members ── */}
        <div className="createCasePanel">
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }} />
            <Users size={13} style={{ color: "#34d399" }} />
            <h2>ASSIGN MEMBERS</h2>
          </div>

          <div className="createHPanel">
            {/* Filter by Role */}
            <div className="createHRow">
              <label className="createHLabel">Filter by Role</label>
              <select className="createHInput createFilterSelect"
                value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r._id} value={r.role_name}>{r.role_name.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Filter by Region */}
            <div className="createHRow">
              <label className="createHLabel">Filter by Region</label>
              <div style={{ display: "flex", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                <select className="createHInput createFilterSelect" style={{ flex: 1 }}
                  value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="">All Regions</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {(roleFilter || regionFilter) && (
                  <button type="button" className="createFilterClear"
                    onClick={() => { setRoleFilter(""); setRegionFilter(""); }} title="Clear filters">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Search Members */}
            <div className="createHRow">
              <label className="createHLabel">Search Members</label>
              <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                <div className="membersSearch">
                  <Search size={16} color="#475569" />
                  <input type="text" placeholder="Search by name..."
                    value={searchTerm} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "0.875rem", flex: 1 }} />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearch("")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* Dropdown results */}
                {searchResults.length > 0 && (
                  <div className="createSearchResults" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50 }}>
                    {searchResults.map((u) => (
                      <div key={u._id} className="createSearchItem">
                        <div className="avatarCircle" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                          <p style={{ margin: 0, color: "#64748b", fontSize: "0.73rem" }}>
                            {u.role_id?.role_name?.replace(/_/g, " ")}{u.Region ? ` · ${u.Region}` : ""}
                          </p>
                        </div>
                        <button type="button" className="createAddBtn" onClick={() => addMember(u)}>
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchTerm && searchResults.length === 0 && (
                  <p style={{ color: "#475569", fontSize: "0.78rem", margin: "0.4rem 0 0" }}>No members found.</p>
                )}
              </div>
            </div>

            {/* Lead Investigator */}
            <div className="createHRow">
              <label className="createHLabel">Lead Investigator</label>
              <select className="createHInput createFilterSelect"
                value={leader} onChange={(e) => setLeader(e.target.value)}
                style={{ color: leader ? "#fff" : "#64748b" }}>
                <option value="">— Select Lead Investigator —</option>
                {leaders.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>

            {/* Assigned chips */}
            {assignedMembers.length > 0 && (
              <div className="createHRow" style={{ alignItems: "flex-start" }}>
                <label className="createHLabel" style={{ paddingTop: "0.25rem" }}>
                  Assigned ({assignedMembers.length})
                </label>
                <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {assignedMembers.map((m) => (
                    <span key={m._id} className="memberChip">
                      {m.name}
                      <button type="button" onClick={() => removeMember(m._id)} className="memberChipRemove">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {assignedMembers.length === 0 && !searchTerm && (
              <div className="createHRow">
                <label className="createHLabel" />
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155", fontSize: "0.8rem" }}>
                  <UserPlus size={16} style={{ opacity: 0.5 }} /> Search above to add team members
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel 3: Case Settings ── */}
        <div className="createCasePanel">
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background: "#f59e0b", boxShadow: "0 0 8px rgba(245,158,11,0.5)" }} />
            <Settings2 size={13} style={{ color: "#f59e0b" }} />
            <h2>CASE SETTINGS</h2>
          </div>

          <div className="createHPanel">
            {/* Priority */}
            <div className="createHRow">
              <label className="createHLabel">Priority Level</label>
              <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
                {[
                  { value: "High",   emoji: "🔴", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.35)" },
                  { value: "Medium", emoji: "🟡", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.35)"  },
                  { value: "Low",    emoji: "🟢", color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.35)"  },
                ].map((p) => (
                  <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1, padding: "0.55rem 0.5rem", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${priority === p.value ? p.border : "rgba(255,255,255,0.07)"}`,
                      background: priority === p.value ? p.bg : "rgba(255,255,255,0.02)",
                      color: priority === p.value ? p.color : "#475569",
                      fontWeight: 700, fontSize: "0.8rem",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
                    }}>
                    {p.emoji} {p.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="createHRow">
              <label className="createHLabel">Initial Status</label>
              <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
                {[
                  { value: "Open",     label: "Open",     color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.35)"  },
                  { value: "Close",    label: "Closed",   color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.35)" },
                  { value: "Archived", label: "Archived", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.35)" },
                ].map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                    style={{
                      flex: 1, padding: "0.55rem 0.5rem", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${status === s.value ? s.border : "rgba(255,255,255,0.07)"}`,
                      background: status === s.value ? s.bg : "rgba(255,255,255,0.02)",
                      color: status === s.value ? s.color : "#475569",
                      fontWeight: 700, fontSize: "0.78rem",
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="createHRow" style={{ alignItems: "flex-start" }}>
              <label className="createHLabel" style={{ paddingTop: "0.15rem" }}>Summary</label>
              <div className="createSummaryBox" style={{ flex: 1, margin: 0 }}>
                <div className="createSummaryRow">
                  <span>Title</span>
                  <span>{title.trim() || <em style={{ color: "#334155" }}>Not set</em>}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Crime Date</span>
                  <span>{crimeDate || <em style={{ color: "#334155" }}>Not set</em>}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Start Date</span>
                  <span>{startDate || "Today"}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Priority</span>
                  <span style={{ color: priorityColor }}>{priority}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Status</span>
                  <span style={{ color: "#34d399" }}>{status}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Lead</span>
                  <span>{leaders.find((l) => l._id === leader)?.name || <em style={{ color: "#334155" }}>None</em>}</span>
                </div>
                <div className="createSummaryRow">
                  <span>Members</span>
                  <span style={{ color: "#818cf8" }}>{assignedMembers.length} assigned</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="createHRow">
              <label className="createHLabel" />
              <div style={{ flex: 1, display: "flex", gap: "0.75rem" }}>
                <button type="button" className="btnCancel" style={{ flex: 1, padding: "0.8rem 0" }}
                  onClick={() => navigate("/cases")} disabled={submitting}>
                  Cancel
                </button>
                <button type="button" className="btnCreate"
                  style={{ flex: 2, padding: "0.8rem 0", justifyContent: "center" }}
                  onClick={handleCreate} disabled={submitting}>
                  <Plus size={15} />{submitting ? "Creating..." : "Create Case"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>{/* end panels */}
    </div>
  );
}
