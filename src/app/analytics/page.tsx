'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  LineChart as ChartIcon,
  ShieldAlert,
  Fuel,
  TrendingUp,
  History,
  TrendingDown,
  Layers,
  ThermometerSnowflake,
  Activity
} from 'lucide-react';

interface Booking {
  id: string;
  customerName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  vehicle: {
    make: string;
    model: string;
    dailyRate: number;
  };
}

interface AnalyticsData {
  fleet: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    utilizationRate: number;
    averageSpeed: number;
  };
  financials: {
    isRestricted: boolean;
    totalRevenue?: number;
    totalBookings?: number;
    averageOrderValue?: number;
    revenueHistory?: Array<{ month: string; revenue: number; bookings: number }>;
    bookingsLog?: Booking[];
  };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  status: string;
  fuelLevel: number;
  engineTemp: number;
  speed: number;
  dailyRate: number;
}

export default function AnalyticsPage() {
  const { currentTenant, currentRole, refreshTelemetryTrigger } = useApp();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentTenant) return;

    async function fetchAnalyticsAndFleet() {
      setIsLoading(true);
      try {
        const headers = {
          'x-tenant-id': currentTenant!.id,
          'x-role': currentRole
        };

        // 1. Fetch Analytics
        const analyticsRes = await fetch('/api/analytics', { headers });
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);

        // 2. Fetch Fleet Vehicles
        const vehiclesRes = await fetch('/api/vehicles', { headers });
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsAndFleet();
  }, [currentTenant, currentRole, refreshTelemetryTrigger]);

  if (isLoading || !currentTenant) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <ChartIcon className="status-dot" size={32} style={{ animation: 'pulse-glow 1.5s infinite' }} />
        <span style={{ color: 'var(--foreground-secondary)', fontFamily: 'var(--font-telemetry)', fontSize: '0.85rem' }}>COMPILING TELEMETRY STATS...</span>
      </div>
    );
  }

  // Prep Fuel data for Bar chart
  const fuelData = vehicles.map(v => ({
    name: `${v.make.substring(0, 3)}. ${v.model}`,
    'Fuel Level (%)': v.fuelLevel,
    'Engine Temp (°C)': v.engineTemp
  }));

  // Mock booking distribution logic for visual display (Owner/Admin only)
  // Let's generate a dynamic metric of active bookings counts per supercar
  const popularityData = vehicles.map(v => {
    let count = 4;
    if (v.model.includes('GT3 RS')) count = 9;
    if (v.model.includes('SF90')) count = 7;
    if (v.model.includes('Jesko')) count = 8;
    if (v.status === 'MAINTENANCE') count = 2;

    return {
      name: `${v.make} ${v.model}`,
      Bookings: count
    };
  });

  return (
    <>
      {/* 1. Header */}
      <header className="dashboard-header">
        <div className="header-title-area">
          <h1>Telemetry & Diagnostic Insights</h1>
          <p>Examine fuel logs, active bookings popularity indexes, and rental ledgers</p>
        </div>
      </header>

      {/* 2. Visuals: Fuel & Diagnostic Bar Chart (Visible to all roles) */}
      <section className="visuals-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '2rem' }}>
        <div className="chart-card" style={{ height: '380px' }}>
          <div className="chart-header">
            <div className="chart-title">
              <h3>Fleet Diagnostic Matrix</h3>
              <p>Comparison of fuel percentages and thermodynamics across all vehicles</p>
            </div>
            
            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Fuel size={14} color="var(--accent-green)" />
              <span>Diagnostic Sync: ACTIVE</span>
            </span>
          </div>

          <div className="chart-wrapper">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="var(--foreground-muted)" fontSize={10} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10, 10, 15, 0.95)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', marginTop: '10px' }} />
                  <Bar dataKey="Fuel Level (%)" fill="var(--accent-green)" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="Engine Temp (°C)" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3. Splitted Advanced analytics (Bookings popular and list) */}
      <section className="visuals-grid">
        {/* Bookings Popularity Index */}
        <div className="chart-card" style={{ height: '400px', position: 'relative' }}>
          {analytics?.financials.isRestricted && (
            <div className="rbac-blocked-cover">
              <span className="blocked-icon"><ShieldAlert size={20} /></span>
              <div className="blocked-title">Popularity Metrics Restricted</div>
              <div className="blocked-desc">Dynamic RBAC: Staff Operators are blocked from examining client rental indexes.</div>
            </div>
          )}
          <div className="chart-header">
            <div className="chart-title">
              <h3>Supercar Popularity Index</h3>
              <p>Total bookings count per vehicle since lifecycle initialization</p>
            </div>
          </div>

          <div className="chart-wrapper">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularityData} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="var(--foreground-muted)" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="var(--foreground-muted)" fontSize={10} width={120} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10, 10, 15, 0.95)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Bar dataKey="Bookings" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Recent Rentals Bookings Ledger Table */}
        <div className="chart-card" style={{ height: '400px', position: 'relative' }}>
          {analytics?.financials.isRestricted && (
            <div className="rbac-blocked-cover">
              <span className="blocked-icon"><ShieldAlert size={20} /></span>
              <div className="blocked-title">Financial Ledger Blocked</div>
              <div className="blocked-desc">Dynamic RBAC: Operator authorization is restricted from accessing the bookings ledger.</div>
            </div>
          )}
          
          <div className="chart-header" style={{ marginBottom: '1rem' }}>
            <div className="chart-title">
              <h3>Recent Bookings Ledger</h3>
              <p>Active and historical client rentals under {currentTenant.name}</p>
            </div>
          </div>

          {/* Bookings Ledger Table */}
          <div style={{ flexGrow: 1, overflowY: 'auto', width: '100%' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--foreground-secondary)' }}>
                  <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'right' }}>Total Paid</th>
                  <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.financials.bookingsLog?.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 0.25rem', fontWeight: 500, color: '#fff' }}>{b.customerName}</td>
                    <td style={{ padding: '0.75rem 0.25rem', color: 'var(--foreground-secondary)' }}>
                      {b.vehicle?.make} {b.vehicle?.model}
                    </td>
                    <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', fontFamily: 'var(--font-telemetry)', color: 'var(--accent-green)', fontWeight: 600 }}>
                      ${b.totalAmount.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: b.status === 'ACTIVE' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: b.status === 'ACTIVE' ? 'var(--accent-cyan)' : 'var(--accent-green)',
                          border: `1px solid ${b.status === 'ACTIVE' ? 'var(--accent-cyan)' : 'var(--accent-green)'}`,
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.65rem',
                          fontWeight: 700
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
