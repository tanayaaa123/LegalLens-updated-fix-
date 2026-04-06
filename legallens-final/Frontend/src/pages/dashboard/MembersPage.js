import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  UserPlus, Trash2, KeyRound, Search, X,
  CheckCircle, AlertCircle, UserMinus, FolderOpen,
  MoreVertical,
} from "lucide-react";
import api from "../../api.js";
import "../../components/Components.css";
import "../dashboard/Dashboard.css";

/* ─── Role colours ─── */
const ROLE_COLORS = {
  Lead_Investigator:   { color:"#34d399", bg:"rgba(52,211,153,0.1)"  },
  Forensic_Officer:    { color:"#fbbf24", bg:"rgba(251,191,36,0.1)"  },
  Police_Officer:      { color:"#60a5fa", bg:"rgba(96,165,250,0.1)"  },
  Supervising_Officer: { color:"#818cf8", bg:"rgba(129,140,248,0.1)" },
  Administrator:       { color:"#a78bfa", bg:"rgba(167,139,250,0.1)" },
};

const ROLES = ["Lead_Investigator","Forensic_Officer","Police_Officer","Supervising_Officer"];
const DEFAULT_PASSWORD = "pass123";

function buildEmail(name = "") {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  return slug ? `${slug}@gmail.com` : "";
}

/* ─── Three-dot action menu for one member row ─── */
function MemberActions({ user, onAssign, onReset, onRemoveCases, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const item = (icon, label, color, action) => (
    <button
      type="button"
      className="memberActionItem"
      style={{ "--item-color": color }}
      onClick={() => { setOpen(false); action(); }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="memberActionsWrap">
      <button
        type="button"
        className="memberDotsBtn"
        onClick={() => setOpen((v) => !v)}
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="memberActionsDropdown">
          {item(<FolderOpen size={15} />,  "Assign to Case",         "#60a5fa", () => onAssign(user))}
          {item(<KeyRound    size={15} />,  "Reset Password",          "#fbbf24", () => onReset(user))}
          {item(<UserMinus   size={15} />,  "Remove from All Cases",   "#fb923c", () => onRemoveCases(user))}
          {item(<Trash2      size={15} />,  "Delete from System",      "#f87171", () => onDelete(user))}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─── */
export default function MembersPage() {
  const [users,    setUsers]    = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState({ type:"", text:"" });

  /* Add member */
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name:"", email:"", role_name:"Police_Officer", Region:"", password:DEFAULT_PASSWORD });
  const [adding,  setAdding]  = useState(false);

  /* Reset password modal */
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting,   setResetting]   = useState(false);

  /* Assign to case modal */
  const [assignTarget, setAssignTarget] = useState(null);
  const [assigning,    setAssigning]    = useState(false);
  const [assignMsg,    setAssignMsg]    = useState({ type:"", text:"" });
  const [selectedCase, setSelectedCase] = useState("");
  const [caseList,     setCaseList]     = useState([]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:"", text:"" }), 4500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { flash("error", "Failed to load members"); }
    finally  { setLoading(false); }
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const res = await api.get("/all-cases");
      setCaseList(Array.isArray(res.data) ? res.data : []);
    } catch { flash("error", "Unable to load case list"); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (assignTarget) { setAssignMsg({ type:"", text:"" }); fetchCases(); }
  }, [assignTarget, fetchCases]);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter((u) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role_id?.role_name?.toLowerCase().includes(q),
    ));
  }, [search, users]);

  /* ─ Handlers ─ */
  const handleAdd = async () => {
    if (!newUser.name.trim() || !newUser.email.trim())
      return flash("error", "Name and email are required");
    setAdding(true);
    try {
      await api.post("/users/create", {
        name:      newUser.name.trim(),
        email:     newUser.email.trim(),
        role_name: newUser.role_name,
        Region:    newUser.Region.trim(),
        password:  newUser.password.trim() || DEFAULT_PASSWORD,
      });
      flash("success", `Member "${newUser.name}" created successfully`);
      setNewUser({ name:"", email:"", role_name:"Police_Officer", Region:"", password:DEFAULT_PASSWORD });
      setShowAdd(false);
      fetchUsers();
    } catch (err) {
      flash("error", err.response?.data?.message || "Failed to create member");
    } finally { setAdding(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete "${u.name}" from the system? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      flash("success", `"${u.name}" deleted from system`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
    } catch (err) { flash("error", err.response?.data?.message || "Failed to delete member"); }
  };

  const handleRemoveCases = async (u) => {
    if (!window.confirm(`Remove "${u.name}" from all cases? Their account will remain.`)) return;
    try {
      await api.delete(`/users/${u._id}/cases`);
      flash("success", `"${u.name}" removed from all cases`);
    } catch (err) { flash("error", err.response?.data?.message || "Failed to remove from cases"); }
  };

  const handleAssignCase = async () => {
    if (!selectedCase || !assignTarget) {
      setAssignMsg({ type:"error", text:"Please select a case first." }); return;
    }
    setAssigning(true);
    try {
      await api.post(`/case/${selectedCase}/member`, { user_id: assignTarget._id });
      setAssignMsg({ type:"success", text:`${assignTarget.name} assigned successfully!` });
      flash("success", `${assignTarget.name} assigned to case`);
      fetchUsers();
      setTimeout(() => { setAssignTarget(null); setSelectedCase(""); setAssignMsg({ type:"", text:"" }); }, 1200);
    } catch (err) {
      setAssignMsg({ type:"error", text: err.response?.data?.message || "Failed to assign member" });
    } finally { setAssigning(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6)
      return flash("error", "Password must be at least 6 characters");
    setResetting(true);
    try {
      await api.post(`/users/${resetTarget._id}/reset-password`, { newPassword });
      flash("success", `Password reset for "${resetTarget.name}". They've been notified.`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      flash("error", err.response?.data?.message || "Failed to reset password");
    } finally { setResetting(false); }
  };

  const getRoleStyle = (name) => ROLE_COLORS[name] || { color:"#94a3b8", bg:"rgba(148,163,184,0.1)" };

  /* ─── Render ─── */
  return (
    <div className="dashboardMain">

      {/* Header */}
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText"><span>LEGALLENS</span> Members</h1>
          <p className="systemStatus">
            Manage system users •{" "}
            <span className="highlightText">{users.length} total members</span>
          </p>
        </div>
        <button type="button" className="primaryActionBtn"
          style={{ width:"auto", padding:"0.75rem 1.5rem" }}
          onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <><X size={16} /> Cancel</> : <><UserPlus size={16} /> Add Member</>}
        </button>
      </header>

      {/* Alert banner */}
      {msg.text && (
        <div className={`alertBanner ${msg.type === "success" ? "alertSuccess" : "alertError"}`}
          style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1.5rem" }}>
          {msg.type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {msg.text}
        </div>
      )}

      {/* Add Member form */}
      {showAdd && (
        <div className="formSectionCard" style={{ marginBottom:"1.5rem" }}>
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background:"#34d399" }}/>
            <h2>NEW MEMBER</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", padding:"1.5rem" }}>
            <div className="inputGroup">
              <label>Full Name *</label>
              <input type="text" placeholder="e.g. John Smith" value={newUser.name}
                onChange={(e) => setNewUser((p) => {
                  const n = e.target.value;
                  return { ...p, name:n, email: (!p.email || p.email===buildEmail(p.name)) ? buildEmail(n) : p.email };
                })} />
            </div>
            <div className="inputGroup">
              <label>Email Address *</label>
              <input type="email" placeholder="john.smith@gmail.com" value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email:e.target.value }))} />
            </div>
            <div className="inputGroup">
              <label>Role</label>
              <select value={newUser.role_name}
                onChange={(e) => setNewUser((p) => ({ ...p, role_name:e.target.value }))}
                style={{ background:"#1e293b", border:"1px solid rgba(255,255,255,0.08)", color:"#fff", padding:"0.75rem 1rem", borderRadius:8, fontSize:"0.9rem", width:"100%" }}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div className="inputGroup">
              <label>Region</label>
              <input type="text" placeholder="e.g. North District" value={newUser.Region}
                onChange={(e) => setNewUser((p) => ({ ...p, Region:e.target.value }))} />
            </div>
            <div className="inputGroup" style={{ gridColumn:"span 2" }}>
              <label>Temporary Password <span style={{ color:"#475569", fontWeight:400 }}>(default: pass123)</span></label>
              <input type="text" placeholder="Leave blank for default" value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password:e.target.value }))} />
            </div>
          </div>
          <div style={{ padding:"0 1.5rem 1.5rem", display:"flex", gap:"1rem", justifyContent:"flex-end" }}>
            <button type="button" className="btnCancel" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="button" className="btnCreate" onClick={handleAdd} disabled={adding}>
              {adding ? "Creating..." : <><UserPlus size={15} style={{ marginRight:6 }}/>Create Member</>}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="formSectionCard">
        <div className="sectionHeader">
          <div className="indicatorDot"/>
          <h2>SYSTEM MEMBERS</h2>
          <div style={{ marginLeft:"auto" }}>
            <div className="membersSearch" style={{ maxWidth:340 }}>
              <Search size={16} color="#475569"/>
              <input type="text" placeholder="Search by name, email or role..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ background:"transparent", border:"none", outline:"none", color:"#fff", fontSize:"0.875rem", flex:1 }}/>
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}>
                  <X size={14}/>
                </button>
              )}
            </div>
          </div>
        </div>

        <table className="legalTable">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Region</th>
              <th>Email</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign:"center", padding:"3rem", color:"#475569" }}>
                <div className="miniSpinner" style={{ margin:"0 auto 0.75rem" }}/> Loading members...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign:"center", padding:"3rem", color:"#475569" }}>
                {search ? `No members matching "${search}"` : "No members found"}
              </td></tr>
            ) : (
              filtered.map((u) => {
                const roleName  = u.role_id?.role_name || "Unknown";
                const roleStyle = getRoleStyle(roleName);
                return (
                  <tr key={u._id} className="auditRow">
                    <td>
                      <div className="nameCell">
                        <div className="avatarCircle">{u.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <p className="boldText" style={{ margin:0, fontSize:"0.875rem" }}>{u.name}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ background:roleStyle.bg, color:roleStyle.color, padding:"3px 10px", borderRadius:6, fontSize:"11px", fontWeight:700 }}>
                        {roleName.replace(/_/g," ")}
                      </span>
                    </td>
                    <td className="mutedText" style={{ fontSize:"0.8rem" }}>{u.Region || "—"}</td>
                    <td className="mutedText" style={{ fontSize:"0.8rem" }}>{u.email}</td>
                    <td style={{ textAlign:"right" }}>
                      <MemberActions
                        user={u}
                        onAssign={setAssignTarget}
                        onReset={(u) => { setResetTarget(u); setNewPassword(""); }}
                        onRemoveCases={handleRemoveCases}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Assign to Case Modal ── */}
      {assignTarget && (
        <div className="modalOverlay" onClick={() => setAssignTarget(null)}>
          <div className="modalBox" style={{ maxWidth:500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2 className="modalTitle">Assign {assignTarget.name} to a Case</h2>
                <p className="modalSubtitle">Select a case to assign this member to</p>
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => setAssignTarget(null)}>×</button>
            </div>
            <div className="modalBody">
              <div className="modalField">
                <label>Select Case</label>
                <select className="modalInput" value={selectedCase} onChange={(e) => setSelectedCase(e.target.value)}>
                  <option value="">— Choose a case —</option>
                  {caseList.map((c) => (
                    <option key={c._id || c.case_id} value={c.case_id}>
                      #{c.case_id} — {c.title} [{c.status === "Close" ? "Closed" : c.status}]
                    </option>
                  ))}
                </select>
              </div>
              {assignMsg.text && (
                <div className={`alertBanner ${assignMsg.type === "success" ? "alertSuccess" : "alertError"}`}>
                  {assignMsg.text}
                </div>
              )}
            </div>
            <div className="modalFooter">
              <button type="button" className="secondaryActionBtn" style={{ width:"auto", padding:"0.5rem 1.25rem" }}
                onClick={() => setAssignTarget(null)}>Cancel</button>
              <button type="button" className="btnCreate" onClick={handleAssignCase} disabled={assigning}>
                {assigning ? "Assigning..." : "Assign to Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className="modalOverlay" onClick={() => { setResetTarget(null); setNewPassword(""); }}>
          <div className="modalBox" style={{ maxWidth:440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2 className="modalTitle">Reset Password</h2>
                <p className="modalSubtitle">For {resetTarget.name} — they'll be notified via the app</p>
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => { setResetTarget(null); setNewPassword(""); }}>×</button>
            </div>
            <div className="modalBody">
              <div className="modalField">
                <label>New Password <span style={{ color:"#475569", fontWeight:400 }}>(min 6 characters)</span></label>
                <input className="modalInput" type="text" placeholder="Enter new password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modalFooter">
              <button type="button" className="secondaryActionBtn" style={{ width:"auto", padding:"0.5rem 1.25rem" }}
                onClick={() => { setResetTarget(null); setNewPassword(""); }}>Cancel</button>
              <button type="button" className="btnCreate" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Resetting..." : <><KeyRound size={15} style={{ marginRight:6 }}/>Reset Password</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
