import React from 'react';

const roles = [
  {
    id: 'police',
    title: 'Police Officer',
    icon: 'bx-shield-quarter',
    description: 'Case tracking & evidence management',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.2)',
  },
  {
    id: 'forensic',
    title: 'Forensic Officer',
    icon: 'bx-file-find',
    description: 'Analyze & verify digital evidence',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    id: 'admin',
    title: 'Administrator',
    icon: 'bx-user-check',
    description: 'Manage users & system settings',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    id: 'lead',
    title: 'Lead Investigator',
    icon: 'bx-search-alt',
    description: 'Lead investigations & team oversight',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
  },
];

// Particles for background
function Particles() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${10 + i * 12}%`,
            animationDuration: `${8 + i * 2}s`,
            animationDelay: `${i * 1.2}s`,
            width: i % 2 === 0 ? '4px' : '3px',
            height: i % 2 === 0 ? '4px' : '3px',
          }}
        />
      ))}
    </>
  );
}

function LeftPanel() {
  return (
    <div className="left">
      <div className="leftBg">
        <div className="bgGrid" />
        <div className="bgOrb bgOrb1" />
        <div className="bgOrb bgOrb2" />
        <div className="bgOrb bgOrb3" />
        <Particles />
      </div>
      <div className="leftInner">
        <div className="leftLogo">
          <div className="leftLogoIcon">
            <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
              <line x1="15" y1="4" x2="15" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="7" y1="8" x2="23" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 8 L4 15 Q7 18 10 15 Z" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M23 8 L20 14 Q23 17 26 14 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M10 26 H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="leftLogoText">Legal<span>Lens</span></span>
        </div>
        <h1 className="leftTagline">
          Justice Through<br /><span>Intelligence</span>
        </h1>
        <p className="leftDesc">
          A unified case management platform for law enforcement teams, forensic experts, and legal investigators.
        </p>
        <div className="leftFeatures">
          {['End-to-end case lifecycle management', 'Tamper-proof digital evidence chain', 'Role-based access & audit trails'].map((f) => (
            <div key={f} className="leftFeatureItem">
              <div className="leftFeatureDot" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleSelection({ onRoleSelect }) {
  return (
    <>
      <LeftPanel />
      <div className="right">
        <div className="formContainer">
          <div className="roleSelectHeader">
            <div className="roleSelectBadge">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="6" r="3"/>
                <circle cx="6" cy="6" r="6" opacity="0.2"/>
              </svg>
              SECURE PORTAL
            </div>
            <h2 className="roleSelectTitle">Select Your Role</h2>
            <p className="roleSelectSubtitle">Choose your role to access LegalLens</p>
          </div>

          <div className="rolesGrid">
            {roles.map((role) => (
              <div
                key={role.id}
                className="roleCard"
                onClick={() => onRoleSelect(role.id)}
              >
                <div className="roleCardShine" />
                <div className="roleIcon" style={{ background: role.bg, border: `1px solid ${role.border}` }}>
                  <i className={`bx ${role.icon}`} style={{ fontSize: '1.6rem', color: role.color }} />
                </div>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
              </div>
            ))}
          </div>

          <footer className="formFooter">
            Need help? <button type="button" className="linkBtnInline">Contact support</button>
          </footer>
        </div>
      </div>
    </>
  );
}

export default RoleSelection;
export { LeftPanel };
