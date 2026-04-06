import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, AlertCircle, RefreshCw, Trash2, ChevronDown } from "lucide-react";
import CaseTabs from "./CaseTabs.js";
import TimelineTab from "./TimelineTab.js";
import MembersTab from "./MembersTab.js";
import EvidenceTab from "./EvidenceTab.js";
import "../../components/Components.css";
import api from "../../api.js";

const PRIORITY_MAP = {
  3: { label: "High",   color: "#f87171", bg: "rgba(239,68,68,0.1)"  },
  2: { label: "Medium", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
  1: { label: "Low",    color: "#34d399", bg: "rgba(16,185,129,0.1)" },
};
const STATUS_MAP = {
  Open:     { color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  Close:    { color: "#f87171", bg: "rgba(239,68,68,0.1)"   },
  Archived: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

export default function CaseDetails() {
  const { caseId } = useParams();
  const navigate   = useNavigate();
  const user       = JSON.parse(localStorage.getItem("user"));
  const isAdmin    = user?.role_id === 1;

  const [caseData,       setCaseData]  = useState(null);
  const [loading,        setLoading]   = useState(true);
  const [error,          setError]     = useState(null);
  const [statusUpdating, setUpdating]  = useState(false);
  const [statusMsg,      setStatusMsg] = useState("");
  const [activityTick,   setTick]      = useState(0);

  const fetchCase = useCallback(async () => {
    try {
      const res = await api.get(`/case/${caseId}`);
      setCaseData(res.data);
      setError(null);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "You do not have access to this case."
          : "Case not found or could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleStatusChange = async (newStatus) => {
    if (!isAdmin) return;
    setUpdating(true);
    setStatusMsg("");
    try {
      await api.patch(`/case/${caseId}/status`, { status: newStatus });
      await fetchCase();
      setTick((v) => v + 1);
      setStatusMsg(`✓ Status updated to ${newStatus === "Close" ? "Closed" : newStatus}`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!window.confirm(`Delete case "${caseData?.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/case/${caseId}`);
      navigate("/cases");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete case");
    }
  };

  const handleCaseActivity = useCallback(async () => {
    await fetchCase();
    setTick((v) => v + 1);
  }, [fetchCase]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const priority    = PRIORITY_MAP[caseData?.priority] || PRIORITY_MAP[1];
  const statusStyle = STATUS_MAP[caseData?.status]     || STATUS_MAP["Open"];

  const tabs = caseData ? [
    {
      label: "Timeline",
      content: <TimelineTab caseId={caseId} caseData={caseData} refreshKey={activityTick} />,
    },
    {
      label: "Members",
      content: (
        <MembersTab
          members={caseData.members || []}
          leadInvestigators={caseData.leadInvestigators || []}
          memberDetails={caseData.memberDetails || []}
          caseId={caseId}
          isAdmin={isAdmin}
          onRefresh={fetchCase}
          onActivity={handleCaseActivity}
        />
      ),
    },
    {
      label: "Evidence",
      content: <EvidenceTab caseId={caseId} userRole={user?.role_id} onActivity={handleCaseActivity} />,
    },
  ] : [];

  if (loading)
    return (
      <div className="detailsPage" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
        <div style={{ textAlign:"center", color:"#475569" }}>
          <div className="miniSpinner" style={{ margin:"0 auto 1rem", width:32, height:32 }} />
          <p>Loading case details...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="detailsPage">
        <button type="button" onClick={() => navigate("/cases")} className="backBtn">
          <ArrowLeft size={18} /> Back to Cases
        </button>
        <div className="detailsGlassCard" style={{ textAlign:"center", padding:"3rem" }}>
          <AlertCircle size={48} color="#f87171" style={{ marginBottom:"1rem" }} />
          <p style={{ color:"#f87171", fontSize:"1.125rem" }}>{error}</p>
          <button className="secondaryActionBtn" style={{ width:"auto", marginTop:"1rem", padding:"0.5rem 1.5rem" }} onClick={fetchCase}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="detailsPage">
      <button type="button" onClick={() => navigate("/cases")} className="backBtn">
        <ArrowLeft size={18} /> Back to Cases
      </button>

      <div className="detailsGlassCard">
        {/* ── Header ── */}
        <header style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", paddingBottom:"1.5rem", marginBottom:"1.5rem" }}>
          <div className="caseDetailHeaderRow">
            {/* Left: title & badges */}
            <div style={{ flex:1, minWidth:0 }}>
              <div className="caseBadgeRow">
                <span className="caseBadgeId">Case #{caseId}</span>
                <span className="caseBadgeStatus" style={{ background:statusStyle.bg, color:statusStyle.color }}>
                  {caseData.status === "Close" ? "Closed" : caseData.status}
                </span>
                <span className="caseBadgePriority" style={{ background:priority.bg, color:priority.color }}>
                  {priority.label} Priority
                </span>
              </div>
              <h1 className="caseDetailTitle">{caseData.title}</h1>
              {caseData.description && (
                <p className="caseDetailDesc">{caseData.description}</p>
              )}
              {statusMsg && (
                <p className="caseStatusMsg" style={{ color: statusMsg.startsWith("✓") ? "#34d399" : "#f87171" }}>
                  {statusMsg}
                </p>
              )}
            </div>

            {/* Right: admin actions */}
            {isAdmin && (
              <div className="caseAdminActions">
                <div className="caseStatusSelectWrap">
                  <select
                    className="caseStatusSelect"
                    value={caseData.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusUpdating}
                  >
                    <option value="Open">Set: Open</option>
                    <option value="Close">Set: Closed</option>
                    <option value="Archived">Set: Archived</option>
                  </select>
                  <ChevronDown size={14} className="caseStatusSelectIcon" />
                </div>
                <button type="button" className="caseDeleteBtn" onClick={handleDeleteCase}>
                  <Trash2 size={15} /> Delete Case
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Info Grid ── */}
        <div className="detailsInfoGrid">
          <div className="infoTile">
            <h4>Lead Investigators</h4>
            <p style={{ color:"#34d399", fontWeight:500 }}>
              {caseData.leadInvestigators?.length ? caseData.leadInvestigators.join(", ") : "Unassigned"}
            </p>
          </div>
          <div className="infoTile">
            <h4>Total Members</h4>
            <p style={{ color:"#818cf8", fontWeight:600, fontSize:"1.25rem" }}>
              {caseData.members?.length || 0}
            </p>
          </div>
          <div className="infoTile">
            <h4><Calendar size={12} style={{ marginRight:4 }} /> Start Date</h4>
            <p>{formatDate(caseData.start_date)}</p>
          </div>
          <div className="infoTile">
            <h4>End Date</h4>
            <p>
              {caseData.end_date
                ? formatDate(caseData.end_date)
                : <span style={{ color:"#475569" }}>Ongoing</span>}
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <CaseTabs tabs={tabs} />
      </div>
    </div>
  );
}
