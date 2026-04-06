import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  Trash2,
  FileText,
  Image,
  File,
  Video,
  Music,
  Calendar,
  User,
  X,
  Plus,
  Download,
  Eye,
} from "lucide-react";
import api from "../../api.js";
import "../../components/Components.css";

const canUpload = (role) => [1, 2, 3].includes(role);
const canVerify = (role) => [1, 2, 3].includes(role);
const canDelete = (role) => role === 1;

function FileIcon({ type, size = 20 }) {
  if (!type) return <File size={size} color="#94a3b8" />;
  if (type.startsWith("image/")) return <Image size={size} color="#818cf8" />;
  if (type === "application/pdf")
    return <FileText size={size} color="#f87171" />;
  if (type.startsWith("video/")) return <Video size={size} color="#34d399" />;
  if (type.startsWith("audio/")) return <Music size={size} color="#fbbf24" />;
  return <File size={size} color="#94a3b8" />;
}

function PreviewModal({ item, onClose }) {
  const fileUrl = item.file_url?.startsWith("http")
    ? item.file_url
    : `${api.defaults.baseURL}${item.file_url}`;
  const type = item.file_type || "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.9rem 1.5rem",
          background: "#0f172a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FileIcon type={type} size={18} />
          <div>
            <p
              style={{
                margin: 0,
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              {item.title}
            </p>
            <p style={{ margin: 0, color: "#475569", fontSize: "0.75rem" }}>
              {item.file_name} · Case #{item.case_id}
              {item.case_title ? ` · ${item.case_title}` : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer noopener"
            download={item.file_name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(79,70,229,0.15)",
              border: "1px solid rgba(79,70,229,0.3)",
              color: "#818cf8",
              padding: "0.4rem 0.9rem",
              borderRadius: 7,
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} /> Download
          </a>
          <button
            onClick={onClose}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
              borderRadius: 7,
              cursor: "pointer",
              padding: "0.4rem 0.75rem",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {type.startsWith("image/") ? (
          <img
            src={fileUrl}
            alt={item.title}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        ) : type === "application/pdf" ? (
          <iframe
            src={fileUrl}
            title={item.title}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        ) : type.startsWith("video/") ? (
          <video
            controls
            autoPlay
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: 8,
              background: "#000",
            }}
          >
            <source src={fileUrl} type={type} />
            Your browser does not support this video format.
          </video>
        ) : type.startsWith("audio/") ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(251,191,36,0.1)",
                border: "2px solid rgba(251,191,36,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Music size={40} color="#fbbf24" />
            </div>
            <p
              style={{
                color: "#94a3b8",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              {item.file_name}
            </p>
            <audio controls autoPlay style={{ width: "100%", maxWidth: 420 }}>
              <source src={fileUrl} type={type} />
              Your browser does not support this audio format.
            </audio>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                background: "rgba(148,163,184,0.08)",
                border: "1px solid rgba(148,163,184,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <File size={36} color="#64748b" />
            </div>
            <p
              style={{
                color: "#94a3b8",
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              {item.file_name}
            </p>
            <p
              style={{
                color: "#475569",
                fontSize: "0.85rem",
                marginBottom: "2rem",
              }}
            >
              This file type cannot be previewed in the browser.
            </p>
            <a
              href={fileUrl}
              download={item.file_name}
              style={{
                background: "#4f46e5",
                color: "#fff",
                padding: "0.75rem 2rem",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Download size={16} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvidenceTab({ caseId, userRole, onActivity }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  const fetchEvidence = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/case/${caseId}/evidence`);
      setEvidence(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching evidence:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (!uploadForm.title)
      setUploadForm((p) => ({
        ...p,
        title: file.name.replace(/\.[^/.]+$/, ""),
      }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) return setError("Please enter a title");
    if (!selectedFile) return setError("Please select a file");
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      await api.post(`/case/${caseId}/evidence`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadForm({ title: "", description: "" });
      setSelectedFile(null);
      setShowUploadForm(false);
      fetchEvidence();
      onActivity?.();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submitVerify = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    try {
      await api.patch(`/evidence/${verifyTarget._id}/verify`, {
        note: verifyNote.trim(),
      });
      setEvidence((prev) =>
        prev.map((e) =>
          e._id === verifyTarget._id
            ? {
                ...e,
                verified: true,
                verified_note: verifyNote.trim(),
                verified_at: new Date().toISOString(),
                verified_by: "You",
              }
            : e,
        ),
      );
      setVerifyTarget(null);
      setVerifyNote("");
      onActivity?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to verify evidence");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete evidence "${title}"? This cannot be undone.`))
      return;
    try {
      await api.delete(`/evidence/${id}`);
      setEvidence((prev) => prev.filter((e) => e._id !== id));
      onActivity?.();
    } catch {
      alert("Failed to delete evidence");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="tabFilesContainer">
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
          {evidence.length} evidence item{evidence.length !== 1 ? "s" : ""} for
          Case #{caseId}
        </p>
        {canUpload(userRole) && (
          <button
            className="btnUpload"
            onClick={() => setShowUploadForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {showUploadForm ? (
              <>
                <X size={16} /> Cancel
              </>
            ) : (
              <>
                <Plus size={16} /> Upload Evidence
              </>
            )}
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && canUpload(userRole) && (
        <div className="evidenceUploadCard">
          <div className="sectionHeader" style={{ marginBottom: "1.25rem" }}>
            <div className="indicatorDot" style={{ background: "#3b82f6" }} />
            <h3
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontWeight: 800,
              }}
            >
              Upload New Evidence
            </h3>
          </div>

          {error && (
            <div
              className="alertBanner alertError"
              style={{ marginBottom: "1rem" }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div className="inputGroup">
              <label>Evidence Title *</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Crime Scene Photo #1"
              />
            </div>
            <div className="inputGroup">
              <label>Case ID (auto)</label>
              <input
                type="text"
                value={`Case #${caseId}`}
                readOnly
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              />
            </div>
            <div className="inputGroup" style={{ gridColumn: "span 2" }}>
              <label>Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe this evidence..."
                rows={2}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div
            className={`evidenceDropZone ${dragOver ? "evidenceDropZoneActive" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            {selectedFile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FileIcon type={selectedFile.type} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>
                    {selectedFile.name}
                  </p>
                  <p
                    style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}
                  >
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Upload
                  size={32}
                  color="#334155"
                  style={{ marginBottom: "0.5rem" }}
                />
                <p
                  style={{ color: "#475569", margin: 0, fontSize: "0.875rem" }}
                >
                  Drag & drop or{" "}
                  <span style={{ color: "#818cf8" }}>click to browse</span>
                </p>
                <p
                  style={{
                    color: "#334155",
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                  }}
                >
                  PDF, Images, Videos, Audio — Max 50MB
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btnCancel"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setError("");
              }}
            >
              Cancel
            </button>
            <button
              className="btnCreate"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <Upload size={16} style={{ marginRight: 6 }} /> Upload
                  Evidence
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Evidence List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>
          <div className="miniSpinner" style={{ margin: "0 auto 1rem" }} />
          Loading evidence...
        </div>
      ) : evidence.length === 0 ? (
        <div className="evidenceEmpty">
          <File size={40} color="#334155" />
          <p style={{ color: "#475569", marginTop: "0.75rem" }}>
            No evidence uploaded yet
          </p>
          {canUpload(userRole) && (
            <p style={{ color: "#334155", fontSize: "0.8rem" }}>
              Upload files using the button above
            </p>
          )}
        </div>
      ) : (
        <div className="evidenceList">
          {evidence.map((e) => (
            <div key={e._id} className="evidenceItem">
              <div className="evidenceItemIcon">
                <FileIcon type={e.file_type} />
              </div>
              <div className="evidenceItemContent">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <p style={{ fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>
                    {e.title}
                  </p>
                  {e.verified ? (
                    <span
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        color: "#34d399",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCircle size={10} /> Verified
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "rgba(251,191,36,0.1)",
                        color: "#fbbf24",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      Unverified
                    </span>
                  )}
                </div>
                {e.description && (
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "0.8rem",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {e.description}
                  </p>
                )}
                {e.case_title && (
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.8rem",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    <strong>Case title:</strong> {e.case_title}
                  </p>
                )}
                {e.verified_note && (
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.8rem",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    <strong>Verification note:</strong> {e.verified_note}
                  </p>
                )}
                {e.file_name && (
                  <div style={{ marginBottom: "0.3rem" }}>
                    <span
                      style={{
                        background: "rgba(129,140,248,0.08)",
                        border: "1px solid rgba(129,140,248,0.15)",
                        color: "#818cf8",
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      📁 {e.file_name}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.75rem",
                    color: "#475569",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <User size={11} /> {e.uploaded_by}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Calendar size={11} /> {formatDate(e.created_at)} at{" "}
                    {formatTime(e.created_at)}
                  </span>
                </div>
              </div>
              <div className="evidenceItemActions">
                {e.file_url && (
                  <button
                    className="actionCircle"
                    title="Preview file"
                    style={{ color: "#818cf8" }}
                    onClick={() => setPreviewItem(e)}
                  >
                    <Eye size={15} />
                  </button>
                )}
                {canVerify(userRole) && !e.verified && (
                  <button
                    className="actionCircle"
                    onClick={() => {
                      setVerifyTarget(e);
                      setVerifyNote("");
                    }}
                    title="Verify evidence"
                    style={{ color: "#34d399" }}
                  >
                    <CheckCircle size={15} />
                  </button>
                )}
                {canDelete(userRole) && !e.verified && (
                  <button
                    className="actionCircle"
                    onClick={() => handleDelete(e._id, e.title)}
                    title="Delete evidence"
                    style={{ color: "#f87171" }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify Modal */}
      {verifyTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "2rem",
              width: "100%",
              maxWidth: 520,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.15rem" }}>
                  Verify Evidence
                </h3>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                  }}
                >
                  Confirm verification for "{verifyTarget.title}" and add a
                  note.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyTarget(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="inputGroup" style={{ marginBottom: "1.25rem" }}>
              <label>Verification Notes</label>
              <textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Optional: why this evidence is verified"
                rows={4}
                style={{ resize: "vertical" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btnCancel"
                onClick={() => setVerifyTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btnCreate"
                onClick={submitVerify}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Evidence"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
