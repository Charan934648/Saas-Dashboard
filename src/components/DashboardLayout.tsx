'use client';

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="app-container">
        <Sidebar />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
