import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, FileText, Image, Film, File, CheckCircle, AlertCircle,
  X, FolderOpen, ChevronDown, Paperclip, Shield,
} from "lucide-react";
import api from "../../api.js";
import "../dashboard/Dashboard.css";
import "../../components/Components.css";

/* ── helpers ── */
function fileIcon(mime = "") {
  if (mime.startsWith("image/")) return <Image size={18} />;
  if (mime.startsWith("video/")) return <Film size={18} />;
  if (mime === "application/pdf") return <FileText size={18} />;
  return <File size={18} />;
}
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadEvidencePage() {
  const user = JSON.parse(localStorage.getItem("user"));

  /* cases */
  const [cases,        setCases]    = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [selectedCase, setCase]     = useState("");

  /* form */
  const [title,   setTitle]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [file,    setFile]    = useState(null);
  const [dragOver,setDragOver]= useState(false);

  /* upload history for selected case */
  const [history,    setHistory]    = useState([]);
  const [histLoading,setHistLoading]= useState(false);

  /* ui */
  const [uploading, setUploading] = useState(false);
  const [msg,       setMsg]       = useState({ type:"", text:"" });
  const fileRef = useRef(null);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:"", text:"" }), 5000);
  };

  /* load assigned cases */
  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    try {
      const res = await api.get("/assigned-cases?limit=50");
      // full list — hit /cases if assigned-cases is capped
      const all  = await api.get("/cases");
      const data = Array.isArray(all.data) ? all.data : [];
      setCases(data.filter((c) => c.status !== "Close" && c.status !== "Archived"));
    } catch {
      setCases([]);
    } finally {
      setCasesLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  /* load evidence history when case changes */
  const loadHistory = useCallback(async (caseId) => {
    if (!caseId) { setHistory([]); return; }
    setHistLoading(true);
    try {
      const res = await api.get(`/case/${caseId}/evidence`);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(selectedCase); }, [selectedCase, loadHistory]);

  /* drag-and-drop */
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  /* submit */
  const handleUpload = async () => {
    if (!selectedCase)     return flash("error", "Please select a case first.");
    if (!title.trim())     return flash("error", "Evidence title is required.");
    if (!file)             return flash("error", "Please attach a file.");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title",       title.trim());
      fd.append("description", desc.trim());
      fd.append("file",        file);

      await api.post(`/case/${selectedCase}/evidence`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      flash("success", `Evidence "${title.trim()}" uploaded successfully!`);
      setTitle(""); setDesc(""); setFile(null);
      loadHistory(selectedCase);
    } catch (err) {
      flash("error", err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const selectedCaseData = cases.find(
    (c) => String(c.case_id ?? c.caseId ?? c._id) === String(selectedCase),
  );

  return (
    <div className="dashboardMain">

      {/* Header */}
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText"><span>LEGALLENS</span> Upload Evidence</h1>
          <p className="systemStatus">
            Upload evidence files for your assigned cases •{" "}
            <span className="highlightText">{user?.name}</span>
          </p>
        </div>
      </header>

      {/* Alert */}
      {msg.text && (
        <div className={`alertBanner ${msg.type === "success" ? "alertSuccess" : "alertError"}`}
          style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1.5rem" }}>
          {msg.type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {msg.text}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", alignItems:"start" }}>

        {/* ── LEFT: Upload Form ── */}
        <div className="formSectionCard">
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background:"#60a5fa" }}/>
            <h2>NEW EVIDENCE</h2>
          </div>
          <div style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

            {/* Case selector */}
            <div className="inputGroup">
              <label>Select Case *</label>
              {casesLoading ? (
                <div style={{ color:"#475569", fontSize:"0.85rem", padding:"0.75rem 0" }}>
                  Loading your cases...
                </div>
              ) : cases.length === 0 ? (
                <div style={{ color:"#f87171", fontSize:"0.85rem", padding:"0.75rem 0" }}>
                  You have no active assigned cases.
                </div>
              ) : (
                <select
                  value={selectedCase}
                  onChange={(e) => setCase(e.target.value)}
                  style={{ background:"#1e293b", border:"1px solid rgba(255,255,255,0.08)",
                    color: selectedCase ? "#fff" : "#475569",
                    padding:"0.75rem 1rem", borderRadius:8, fontSize:"0.9rem", width:"100%" }}>
                  <option value="">— Choose a case —</option>
                  {cases.map((c) => (
                    <option
                      key={c._id}
                      value={String(c.case_id ?? c.caseId ?? c._id)}>
                      #{c.case_id ?? c.caseId} — {c.title}
                      {c.priority ? ` [${c.priority}]` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected case info pill */}
            {selectedCaseData && (
              <div style={{ background:"rgba(96,165,250,0.07)", border:"1px solid rgba(96,165,250,0.15)",
                borderRadius:8, padding:"0.75rem 1rem", display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <FolderOpen size={15} color="#60a5fa"/>
                <span style={{ color:"#93c5fd", fontSize:"0.85rem", fontWeight:600 }}>
                  {selectedCaseData.title}
                </span>
                {selectedCaseData.status && (
                  <span style={{ marginLeft:"auto", background:"rgba(52,211,153,0.1)",
                    color:"#34d399", padding:"2px 8px", borderRadius:4, fontSize:"11px", fontWeight:700 }}>
                    {selectedCaseData.status}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <div className="inputGroup">
              <label>Evidence Title *</label>
              <input type="text" placeholder="e.g. CCTV Footage – 3rd Floor"
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Description */}
            <div className="inputGroup">
              <label>Description <span style={{ color:"#475569", fontWeight:400 }}>(optional)</span></label>
              <textarea placeholder="Add context, location, time of capture, etc."
                value={desc} onChange={(e) => setDesc(e.target.value)}
                rows={3} style={{ resize:"vertical" }} />
            </div>

            {/* Drop zone */}
            <div className="inputGroup">
              <label>Attach File *</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border:`2px dashed ${dragOver ? "#60a5fa" : file ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                  borderRadius:10, padding:"1.5rem 1rem",
                  background: dragOver ? "rgba(96,165,250,0.05)" : file ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)",
                  cursor:"pointer", textAlign:"center", transition:"all 0.2s",
                }}>
                <input ref={fileRef} type="file" style={{ display:"none" }}
                  onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} />

                {file ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.75rem" }}>
                    <span style={{ color:"#34d399" }}>{fileIcon(file.type)}</span>
                    <div style={{ textAlign:"left" }}>
                      <p style={{ margin:0, color:"#e2e8f0", fontWeight:600, fontSize:"0.875rem" }}>{file.name}</p>
                      <p style={{ margin:0, color:"#475569", fontSize:"0.75rem" }}>{fmtSize(file.size)}</p>
                    </div>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background:"rgba(248,113,113,0.1)", border:"none", color:"#f87171",
                        borderRadius:6, padding:"4px", cursor:"pointer", display:"flex", marginLeft:"auto" }}>
                      <X size={14}/>
                    </button>
                  </div>
                ) : (
                  <>
                    <Paperclip size={24} style={{ color:"#475569", marginBottom:"0.5rem" }}/>
                    <p style={{ margin:0, color:"#94a3b8", fontSize:"0.875rem" }}>
                      Drag & drop or <span style={{ color:"#60a5fa" }}>click to browse</span>
                    </p>
                    <p style={{ margin:"0.25rem 0 0", color:"#475569", fontSize:"0.75rem" }}>
                      Images, videos, PDFs, documents — up to 50 MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              className="btnCreate"
              style={{ width:"100%", padding:"0.9rem", justifyContent:"center", fontSize:"0.95rem" }}
              onClick={handleUpload}
              disabled={uploading || !selectedCase || !title.trim() || !file}>
              {uploading
                ? <><div className="miniSpinner" style={{ marginRight:8 }}/> Uploading...</>
                : <><Upload size={16} style={{ marginRight:8 }}/> Upload Evidence</>}
            </button>
          </div>
        </div>

        {/* ── RIGHT: History ── */}
        <div className="formSectionCard">
          <div className="sectionHeader">
            <div className="indicatorDot" style={{ background:"#a78bfa" }}/>
            <h2>CASE EVIDENCE LOG</h2>
            <span style={{ marginLeft:"auto", color:"#475569", fontSize:"0.8rem" }}>
              {selectedCase ? `${history.length} file${history.length !== 1 ? "s" : ""}` : "Select a case"}
            </span>
          </div>

          {!selectedCase ? (
            <div style={{ padding:"3rem 2rem", textAlign:"center", color:"#334155" }}>
              <FolderOpen size={40} style={{ margin:"0 auto 0.75rem" }}/>
              <p>Select a case to view its evidence log</p>
            </div>
          ) : histLoading ? (
            <div style={{ padding:"3rem 2rem", textAlign:"center", color:"#475569" }}>
              <div className="miniSpinner" style={{ margin:"0 auto 0.75rem" }}/>
              Loading evidence...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding:"3rem 2rem", textAlign:"center", color:"#334155" }}>
              <Shield size={40} style={{ margin:"0 auto 0.75rem" }}/>
              <p>No evidence uploaded for this case yet</p>
            </div>
          ) : (
            <div style={{ padding:"0.5rem 0" }}>
              {history.map((ev) => (
                <div key={ev.evidence_id ?? ev._id}
                  style={{ padding:"1rem 1.5rem", borderBottom:"1px solid rgba(255,255,255,0.04)",
                    display:"flex", alignItems:"flex-start", gap:"0.75rem" }}>
                  <div style={{ background:"rgba(167,139,250,0.1)", color:"#a78bfa",
                    width:36, height:36, borderRadius:8,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {fileIcon(ev.file_type || "")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:"0.875rem", color:"#e2e8f0",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p style={{ margin:"2px 0 0", fontSize:"0.78rem", color:"#64748b",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {ev.description}
                      </p>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginTop:"4px" }}>
                      <span style={{ fontSize:"0.72rem", color:"#475569" }}>
                        by {ev.uploaded_by?.name ?? ev.uploaded_by ?? "Unknown"}
                      </span>
                      {ev.verified && (
                        <span style={{ background:"rgba(52,211,153,0.1)", color:"#34d399",
                          padding:"1px 7px", borderRadius:4, fontSize:"10px", fontWeight:700 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {ev.file_url && (
                    <a href={`http://localhost:5000${ev.file_url}`} target="_blank" rel="noreferrer"
                      style={{ color:"#60a5fa", fontSize:"0.75rem", flexShrink:0, textDecoration:"none",
                        background:"rgba(96,165,250,0.08)", padding:"4px 10px", borderRadius:6 }}>
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
