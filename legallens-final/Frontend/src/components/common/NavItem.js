import React from 'react';
import '../Components.css';

export default function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`navItemLink ${active ? 'navItemActive' : ''}`}>
      <span className="navIcon">{icon}</span>
      <span className="navLabel">{label}</span>
    </div>
  );
}
