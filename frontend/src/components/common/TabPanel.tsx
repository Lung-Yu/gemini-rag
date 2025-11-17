// Tab Panel Component - Container for Tab Content

import type { TabPanelProps } from '../../types';

export function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ 
        height: '100%', 
        width: '100%',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column'
      }}
    >
      {value === index && children}
    </div>
  );
}