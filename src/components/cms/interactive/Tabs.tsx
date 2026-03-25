'use client';

import React, { useState } from 'react';

interface TabsProps {
  tabs: Array<{ label: string; content: string }>;
  defaultTab: number;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.map((tab, index) => (
          <div
            key={index}
            id={`tabpanel-${index}`}
            role="tabpanel"
            aria-hidden={activeTab !== index ? 'true' : 'false'}
            style={activeTab !== index ? { display: 'none' } : undefined}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
