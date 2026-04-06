import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CaseRow from "../../components/cases/CaseRow.js";
import "../dashboard/Dashboard.css";
import api from "../../api.js";
import { Plus, Search, X } from "lucide-react";

export default function CasesPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user"));
  const isAdmin   = user?.role_id === 1;

  const [allCases, setAll]            = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") || "";
  });
  const [statusFilter, setStatus]     = useState("All");
  const [priorityFilter, setPriority] = useState("All");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  const getPriorityLabel = (num) => ({ 3:"High", 2:"Medium", 1:"Low" }[num] || "Unknown");

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await api.get("/cases");
      const data = Array.isArray(res.data) ? res.data : [];
      setAll(data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
      } else {
        setError("Failed to load cases. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    let result = allCases;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.title?.toLowerCase().includes(q) || String(c.caseId).includes(q),
      );
    }
    if (statusFilter !== "All")  result = result.filter((c) => c.status === statusFilter);
    if (priorityFilter !== "All") result = result.filter((c) => getPriorityLabel(c.priority) === priorityFilter);
    setFiltered(result);
  }, [search, statusFilter, priorityFilter, allCases]); // eslint-disable-line

  const STATUS_TABS = [
    { label:"All",      value:"All"      },
    { label:"Open",     value:"Open"     },
    { label:"Closed",   value:"Close"    },
    { label:"Archived", value:"Archived" },
  ];
  const getCount = (v) => v === "All" ? allCases.length : allCases.filter((c) => c.status === v).length;

  return (
    <div className="dashboardMain">
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText"><span>LEGALLENS</span> Cases</h1>
          <p className="systemStatus">
            {isAdmin ? "All cases in the system" : "Your assigned cases"} •{" "}
            <span className="highlightText">{allCases.length} total</span>
          </p>
        </div>
        {isAdmin && (
          <button className="primaryActionBtn" style={{ width:"auto", padding:"0.75rem 1.5rem" }}
            onClick={() => navigate("/create-case")}>
            <Plus size={16} /> Create Case
          </button>
        )}
      </header>

      {/* Status Filter Tabs */}
      <div className="notifFilterTabs" style={{ marginBottom:"1.5rem" }}>
        {STATUS_TABS.map(({ label, value }) => (
          <button key={value}
            className={`notifFilterTab ${statusFilter === value ? "notifFilterTabActive" : ""}`}
            onClick={() => setStatus(value)}>
            {label} ({getCount(value)})
          </button>
        ))}
      </div>

      {/* Search + Priority */}
      <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", alignItems:"center" }}>
        <div className="membersSearch" style={{ flex:1, maxWidth:420 }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Search by title or case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background:"transparent", border:"none", outline:"none", color:"#fff", fontSize:"0.875rem", flex:1 }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select value={priorityFilter} onChange={(e) => setPriority(e.target.value)}
          style={{ background:"#1e293b", border:"1px solid rgba(255,255,255,0.05)", color:"#fff", padding:"0.6rem 1rem", borderRadius:8, fontSize:"0.875rem" }}>
          <option value="All">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Cases List */}
      <div className="formSectionCard">
        <div className="sectionHeader">
          <div className="indicatorDot" />
          <h2>CASE RECORDS</h2>
          <span style={{ marginLeft:"auto", color:"#64748b", fontSize:"0.8rem" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="casesListWrapper" style={{ padding:"0.5rem 0" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"#475569" }}>
              <div className="miniSpinner" style={{ margin:"0 auto 0.75rem" }} />
              Loading cases...
            </div>
          ) : error ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"#f87171" }}>
              {error}
              <br />
              <button className="secondaryActionBtn" style={{ marginTop:"1rem", width:"auto", padding:"0.5rem 1.5rem" }}
                onClick={fetchCases}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"#475569" }}>
              <p>{search ? `No cases matching "${search}"` : "No cases found"}</p>
              {isAdmin && !search && (
                <button className="primaryActionBtn" style={{ width:"auto", marginTop:"1rem" }}
                  onClick={() => navigate("/create-case")}>
                  <Plus size={16} /> Create First Case
                </button>
              )}
            </div>
          ) : (
            filtered.map((c) => (
              <CaseRow key={c.id || c.caseId} id={c.caseId} title={c.title}
                priority={getPriorityLabel(c.priority)} status={c.status} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
