import React, { useState } from "react";
import { UserMinus, Search, UserPlus } from "lucide-react";
import api from "../../api.js";
import "../../components/Components.css";

const ROLE_COLORS = {
  Lead_Investigator: { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  Forensic_Officer: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  Police_Officer: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  Supervising_Officer: { color: "#818cf8", bg: "rgba(129,140,248,0.1)" },
};

export default function MembersTab({
  members,
  leadInvestigators,
  memberDetails,
  caseId,
  isAdmin,
  onRefresh,
  onActivity,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length >= 1) {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        setSearchResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (userId, userName) => {
    setAdding(true);
    setAddMsg("");
    try {
      await api.post(`/case/${caseId}/member`, { user_id: userId });
      setSearchTerm("");
      setSearchResults([]);
      setShowSearch(false);
      setAddMsg(`${userName} added successfully`);
      onRefresh?.();
      onActivity?.();
      setTimeout(() => setAddMsg(""), 3000);
    } catch (err) {
      setAddMsg(err.response?.data?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this case?`)) return;
    try {
      await api.delete(`/case/${caseId}/member/${userId}`);
      onRefresh?.();
      onActivity?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const details =
    memberDetails?.length
      ? memberDetails
      : members.map((name) => ({ name, role: null, id: null }));

  return (
    <div
      className="memberList"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      {/* Add Member — Admin only */}
      {isAdmin && (
        <div style={{ marginBottom: "0.5rem" }}>
          <button
            onClick={() => {
              setShowSearch((v) => !v);
              setSearchTerm("");
              setSearchResults([]);
              setAddMsg("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(79,70,229,0.1)",
              border: "1px solid rgba(79,70,229,0.2)",
              color: "#818cf8",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <UserPlus size={15} /> {showSearch ? "Cancel" : "Add Member"}
          </button>

          {addMsg && (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: addMsg.includes("success") || addMsg.includes("added")
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {addMsg}
            </p>
          )}

          {showSearch && (
            <div style={{ marginTop: "0.75rem", position: "relative" }}>
              <div
                className="membersSearch"
                style={{ maxWidth: 360, height: 44 }}
              >
                <Search size={16} color="#475569" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search members by name or role..."
                  autoFocus
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "0.875rem",
                    flex: 1,
                  }}
                />
              </div>
              {searchResults.length > 0 && (
                <div className="searchDropdown" style={{ width: 360 }}>
                  {searchResults.map((u) => (
                    <div
                      key={u._id}
                      className="searchItem"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                          {u.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "0.75rem",
                          }}
                        >
                          {u.role_id?.role_name?.replace(/_/g, " ")} •{" "}
                          {u.Region || "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddMember(u._id, u.name)}
                        disabled={adding}
                        style={{
                          background: "rgba(79,70,229,0.2)",
                          border: "none",
                          color: "#818cf8",
                          padding: "4px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        {adding ? "Adding..." : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchTerm.length >= 1 && searchResults.length === 0 && (
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#475569",
                    fontSize: "0.8rem",
                  }}
                >
                  No users found matching "{searchTerm}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Member List */}
      {details.length === 0 ? (
        <p style={{ color: "#475569", fontSize: "0.875rem" }}>
          No members assigned to this case
        </p>
      ) : (
        details.map((member, i) => {
          const isLead = leadInvestigators.includes(member.name);
          const roleStyle = ROLE_COLORS[member.role] || {
            color: "#94a3b8",
            bg: "rgba(148,163,184,0.1)",
          };

          return (
            <div
              key={member.id || i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div className="avatarCircle">
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {member.name}
                    {isLead && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: "#fbbf24",
                          fontSize: "0.7rem",
                        }}
                      >
                        ★ Lead
                      </span>
                    )}
                  </p>
                  {member.role && (
                    <span
                      style={{
                        background: roleStyle.bg,
                        color: roleStyle.color,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "inline-block",
                        marginTop: 2,
                      }}
                    >
                      {member.role.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && member.id && (
                <button
                  className="actionCircle"
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  title="Remove from case"
                  style={{ color: "#f87171" }}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
