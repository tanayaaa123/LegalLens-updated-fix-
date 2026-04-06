import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { LeftPanel } from "./RoleSelection.js";

function LoginForm({ role, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [popup, setPopup] = useState(null);
  const navigate = useNavigate();

  const getRoleTitle = () => {
    const titles = {
      police: "Police Officer",
      forensic: "Forensic Officer",
      admin: "Administrator",
      lead: "Lead Investigator",
    };
    return titles[role] || "User";
  };

  const getRoleColor = () => {
    const colors = {
      police: "#3b82f6",
      forensic: "#f59e0b",
      admin: "#8b5cf6",
      lead: "#10b981",
    };
    return colors[role] || "#4f46e5";
  };

  // Login — uses api instance so baseURL is applied automatically
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/login", { email, password });
      if (res.data.message === "Login successful") {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data?.error || "Login failed"
      );
    }
  };

  // Forgot password — sends a reset request to admin via backend
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await api.post("/password-reset-request-public", { email });
      setPopup({
        message:
          res.data.message ||
          "Your password has been reset to pass123. Please sign in and change it from Settings.",
      });
      setTimeout(() => setPopup(null), 7000);
    } catch (err) {
      setPopup({
        message:
          err.response?.data?.message ||
          "Unable to reset password right now.",
      });
      setTimeout(() => setPopup(null), 7000);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <LeftPanel />
      <div className="right">
        <div className="formContainer">
          <button className="backButton" onClick={onBack}>
            <i className="bx bx-arrow-back"></i> Change Role
          </button>

          <header className="formHeader">
            <h2>Welcome Back</h2>
            <p>
              Sign in as{" "}
              <strong style={{ color: getRoleColor() }}>{getRoleTitle()}</strong>
            </p>
          </header>

          <div className="securityNotice">
            <i className="bx bx-shield-quarter"></i>
            <div>
              <strong>Secure Login</strong>
              <p>Your credentials are encrypted and protected</p>
            </div>
          </div>

          <form className="loginForm" onSubmit={handleSubmit}>
            <div className="inputGroup">
              <label>Email Address</label>
              <div className="inputWrapper">
                <input
                  type="email"
                  placeholder="your.email@agency.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <i className="bx bx-envelope"></i>
              </div>
            </div>

            <div className="inputGroup">
              <label>Password</label>
              <div className="inputWrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <i
                  className={showPassword ? "bx bx-eye" : "bx bx-eye-closed"}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: "pointer" }}
                ></i>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="formUtils">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sending}
                style={{
                  background: "none",
                  border: "none",
                  color: "#818cf8",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.6 : 1,
                  fontSize: "0.85rem",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {sending ? "Sending..." : "Forgot password?"}
              </button>
            </div>

            <button type="submit" className="submitBtn">
              Sign In Securely
            </button>
          </form>

          <footer className="formFooter">
            Need access? <button type="button" className="linkBtnInline">Contact administrator</button>
          </footer>
        </div>

        {/* Success popup for forgot password */}
        {popup && (
          <div className="adminRequestPopup">
            <h4>✓ Request Sent</h4>
            <p>{popup.message}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default LoginForm;
