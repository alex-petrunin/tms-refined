import React, {memo} from 'react';
import {Tabs as TabsComponent} from '@jetbrains/ring-ui-built/components/tabs/tabs';
import Tab from '@jetbrains/ring-ui-built/components/tabs/tab';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: TabItem[];
}

export const Tabs = memo<TabsProps>(({activeTab, onTabChange, tabs}) => {
  return (
    <TabsComponent
      selected={activeTab}
      onSelect={(selected: string) => onTabChange(selected)}
    >
      {tabs.map(tab => (
        <Tab key={tab.id} id={tab.id} title={tab.label} />
      ))}
    </TabsComponent>
  );
});

Tabs.displayName = 'Tabs';

