import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Folder,
  Settings,
  LogOut,
  UserPlus,
  Bell,
  ClipboardList,
  UserCircle,
  UploadCloud,
} from "lucide-react";
import NavItem from "./NavItem.js";
import "../../components/Components.css";
import api from "../../api.js";

function LegalLensLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#4f46e5" />
      <line
        x1="15" y1="5" x2="15" y2="25"
        stroke="white" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="8" y1="8" x2="22" y2="8"
        stroke="white" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M8 8 L5.5 14 Q8 16.5 10.5 14 Z"
        fill="rgba(255,255,255,0.3)" stroke="white"
        strokeWidth="1" strokeLinejoin="round"
      />
      <path
        d="M22 8 L19.5 13 Q22 15.5 24.5 13 Z"
        fill="rgba(255,255,255,0.15)" stroke="white"
        strokeWidth="1" strokeLinejoin="round"
      />
      <path
        d="M11 25 H19" stroke="white" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user"));
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setUnreadCount(res.data.count || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const isAdmin  = user?.role_id === 1;
  const isLead   = user?.role_id === 2;
  const isFieldOfficer = user?.role_id === 3 || user?.role_id === 4; // Forensic or Police

  return (
    <div className="sideBar">
      <div className="sideBarBranding">
        <div className="sideBarLogo">
          <LegalLensLogo />
        </div>
        <span className="sideBarBrandName">LegalLens</span>
      </div>

      <nav className="sideBarNav">
        <NavItem
          icon={<Home size={18} />}
          label="Home"
          active={location.pathname === "/dashboard"}
          onClick={() => navigate("/dashboard")}
        />

        <NavItem
          icon={<Folder size={18} />}
          label="Cases"
          active={location.pathname.startsWith("/cases")}
          onClick={() => navigate("/cases")}
        />

        {/* Field officers — Upload Evidence */}
        {isFieldOfficer && (
          <NavItem
            icon={<UploadCloud size={18} />}
            label="Upload Evidence"
            active={location.pathname === "/upload-evidence"}
            onClick={() => navigate("/upload-evidence")}
          />
        )}

        <NavItem
          icon={
            <div style={{ position: "relative" }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="sidebarNotifBadge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          }
          label="Notifications"
          active={location.pathname === "/notifications"}
          onClick={() => navigate("/notifications")}
        />

        {/* Admin-only nav items */}
        {isAdmin && (
          <>
            <NavItem
              icon={<UserPlus size={18} />}
              label="Members"
              active={location.pathname === "/add-members"}
              onClick={() => navigate("/add-members")}
            />
            <NavItem
              icon={<ClipboardList size={18} />}
              label="Audit Log"
              active={location.pathname === "/audit-log"}
              onClick={() => navigate("/audit-log")}
            />
          </>
        )}

        {/* Lead Investigator also sees Audit Log (their cases only) */}
        {isLead && (
          <NavItem
            icon={<ClipboardList size={18} />}
            label="Audit Log"
            active={location.pathname === "/audit-log"}
            onClick={() => navigate("/audit-log")}
          />
        )}

        <NavItem
          icon={<UserCircle size={18} />}
          label="Profile"
          active={location.pathname === "/profile"}
          onClick={() => navigate("/profile")}
        />

        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          active={location.pathname === "/settings"}
          onClick={() => navigate("/settings")}
        />
      </nav>

      {/* User info section — clickable to go to profile */}
      <div
        className="sideBarUserInfo"
        onClick={() => navigate("/profile")}
        title="View Profile"
        style={{ cursor: "pointer" }}
      >
        <div className="sideBarAvatar">
          {user?.avatar ? (
            <img
              src={`http://localhost:5000${user.avatar}`}
              alt="avatar"
              className="sideBarAvatarImg"
            />
          ) : (
            <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
          )}
        </div>
        <div className="sideBarUserText">
          <p className="sideBarUserName">{user?.name || "User"}</p>
          <p className="sideBarUserRole">
            {user?.role_name?.replace(/_/g, " ") || ""}
          </p>
        </div>
      </div>

      <div className="sideBarFooter">
        <NavItem
          icon={<LogOut size={18} />}
          onClick={handleLogout}
          label="Log Out"
        />
      </div>
    </div>
  );
}
