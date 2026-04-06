import React from 'react';
import { Folder, Zap, CheckSquare, Flag } from 'lucide-react';
import '../Components.css';

export default function StatCard({ title, value, type }) {
  const configs = {
    total: { icon: <Folder size={20} />, theme: 'themeBlue' },
    active: { icon: <Zap size={20} />, theme: 'themeEmerald' },
    closed: { icon: <CheckSquare size={20} />, theme: 'themeIndigo' },
    priority: { icon: <Flag size={20} />, theme: 'themeRed' },
  };

  const { icon, theme } = configs[type] || configs.total;

  return (
    <div className="statCardItem">
      <div className="statCardFlex">
        <div>
          <p className="statCardTitle">{title}</p>
          <h3 className="statCardValue">{value}</h3>
        </div>
        <div className={`statCardIconBox ${theme}`}>{icon}</div>
      </div>
      <div className={`statCardGlow ${theme}`}></div>
    </div>
  );
}
