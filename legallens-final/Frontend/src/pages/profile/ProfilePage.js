import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Save,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  FileText,
  Shield,
} from "lucide-react";
import api from "../../api.js";
import "../dashboard/Dashboard.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", department: "", bio: "", avatar: null, role_name: "",
  });
  const [form, setForm] = useState({ name: "", phone: "", department: "", bio: "" });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data);
      setForm({
        name: res.data.name,
        phone: res.data.phone || "",
        department: res.data.department || "",
        bio: res.data.bio || "",
      });
      if (res.data.avatar)
        setAvatarPreview(`http://localhost:5000${res.data.avatar}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load profile");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrorMsg("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return setErrorMsg("Image must be under 5MB");

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Sync avatar to localStorage so Sidebar reflects it immediately
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, avatar: res.data.avatar }));
      setSuccessMsg("Profile picture updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setErrorMsg("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setErrorMsg("Name cannot be empty");
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await api.put("/profile", form);
      // Sync name to localStorage so Sidebar reflects it immediately
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: res.data.user.name }));
      setProfile(res.data.user);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const map = {
      Supervising_Officer: { bg: "rgba(129,140,248,0.1)", color: "#818cf8" },
      Lead_Investigator: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
      Forensic_Officer: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
      Police_Officer: { bg: "rgba(96,165,250,0.1)", color: "#60a5fa" },
      Administrator: { bg: "rgba(167,139,250,0.1)", color: "#a78bfa" },
    };
    return map[role] || { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
  };

  const roleStyle = getRoleBadgeColor(profile.role_name);

  return (
    <div className="dashboardMain">
      <header className="dashboardHeader">
        <div className="headerBranding">
          <h1 className="logoText"><span>LEGALLENS</span> Profile</h1>
          <p className="systemStatus">Manage your personal information</p>
        </div>
      </header>

      {errorMsg && (
        <div className="alertBanner alertError" style={{ marginBottom: "1rem" }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="alertBanner alertSuccess" style={{ marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem" }}>
        {/* Avatar Card */}
        <div>
          <div className="formSectionCard" style={{ textAlign: "center" }}>
            <div style={{ padding: "2rem" }}>
              <div style={{ position: "relative", display: "inline-block", marginBottom: "1.5rem" }}>
                <div className="profileAvatarLarge">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="profileAvatarImg" />
                  ) : (
                    <span className="profileAvatarInitial">
                      {form.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="avatarEditBtn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Change profile picture"
                >
                  {uploadingAvatar ? <div className="miniSpinner" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
              </div>

              <h2 style={{ fontWeight: 700, margin: "0 0 0.25rem", color: "inherit" }}>
                {profile.name || "—"}
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 1rem" }}>
                {profile.email}
              </p>

              <span style={{ display: "inline-block", background: roleStyle.bg, color: roleStyle.color, padding: "4px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                <Shield size={11} style={{ display: "inline", marginRight: 5 }} />
                {profile.role_name?.replace(/_/g, " ") || "—"}
              </span>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", display: "grid", gridTemplateColumns: "1fr 1fr", padding: "1rem" }}>
              {[
                { label: "Department", value: profile.department || "—" },
                { label: "Phone", value: profile.phone || "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center", padding: "0.75rem" }}>
                  <p style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.25rem" }}>{label}</p>
                  <p style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div>
          <div className="formSectionCard">
            <div className="sectionHeader">
              <div className="indicatorDot" />
              <h2>PERSONAL INFORMATION</h2>
            </div>
            <div style={{ padding: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="inputGroup">
                <label><User size={13} style={{ marginRight: 5 }} />Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="inputGroup">
                <label><Mail size={13} style={{ marginRight: 5 }} />Email Address</label>
                <input type="text" value={profile.email} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
              </div>
              <div className="inputGroup">
                <label><Phone size={13} style={{ marginRight: 5 }} />Phone Number</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="inputGroup">
                <label><Building size={13} style={{ marginRight: 5 }} />Department</label>
                <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Cybercrime Unit" />
              </div>
              <div className="inputGroup" style={{ gridColumn: "span 2" }}>
                <label><FileText size={13} style={{ marginRight: 5 }} />About Me</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Write a short bio..." rows={4} style={{ resize: "vertical" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", gap: "1rem" }}>
            <button type="button" className="btnCancel" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={15} /> Back
            </button>
            <button type="button" className="btnCreate" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
