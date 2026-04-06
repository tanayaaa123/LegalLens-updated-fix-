import React, { useState } from 'react';
import '../../components/Components.css';

export default function CaseTabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.label || '');

  if (!tabs || tabs.length === 0) return null;

  const currentTab = tabs.find((t) => t.label === activeTab) || tabs[0];

  return (
    <div className="tabsContainer">
      <div className="tabsHeader">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`tabBtn ${currentTab.label === tab.label ? 'tabActive' : ''}`}
            onClick={() => setActiveTab(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabContent">
        {currentTab && <div key={currentTab.label}>{currentTab.content}</div>}
      </div>
    </div>
  );
}
