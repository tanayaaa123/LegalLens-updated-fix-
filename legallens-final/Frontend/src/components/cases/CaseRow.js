import React from "react";
import { useNavigate } from "react-router-dom";
import '../../components/Components.css';

const PRIORITY_CLASSES = { High: "rowPriorityHigh", Medium: "rowPriorityMedium", Low: "rowPriorityLow" };
const STATUS_CLASSES = { Open: "rowStatusOpen", Close: "rowStatusClose", Archived: "rowStatusArchived" };

export default function CaseRow({ id, title, priority, status }) {
  const navigate = useNavigate();
  return (
    <div className="caseRowItem" onClick={() => navigate(`/cases/${id}`)}>
      <div className="caseRowInfo">
        <span className="caseRowId">#{id}</span>
        <span className="caseRowTitle">{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className={`caseRowBadge ${PRIORITY_CLASSES[priority] || ""}`}>{priority}</span>
        <span className={`caseRowBadge ${STATUS_CLASSES[status] || ""}`}>{status}</span>
      </div>
    </div>
  );
}
