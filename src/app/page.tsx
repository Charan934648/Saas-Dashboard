'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Car,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldAlert,
  MapPin,
  Flame,
  Gauge,
  Calendar,
  Layers
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  dailyRate: number;
  status: string;
  licensePlate: string;
  image: string;
  fuelLevel: number;
  speed: number;
  rpm: number;
  engineTemp: number;
  gForce: number;
  latitude: number;
  longitude: number;
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
    bookingsLog?: any[];
  };
}

export default function OverviewPage() {
  const { currentTenant, currentRole, refreshTelemetryTrigger } = useApp();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingLive, setIsSeedingLive] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Live simulation states for telemetry widget
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveRpm, setLiveRpm] = useState(0);
  const [liveGForce, setLiveGForce] = useState(0);
  const [liveTemp, setLiveTemp] = useState(0);
  const [liveFuel, setLiveFuel] = useState(100);
  const [liveCoords, setLiveCoords] = useState({ lat: 37.7749, lng: -122.4194 });
  const [liveHistory, setLiveHistory] = useState<any[]>([]);

  // Telemetry stream generator interval
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  // Fetch Core Dashboard Data
  useEffect(() => {
    if (!currentTenant) return;

    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const headers = {
          'x-tenant-id': currentTenant!.id,
          'x-role': currentRole,
        };

        // 1. Fetch Analytics
        const analyticsRes = await fetch('/api/analytics', { headers });
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);

        // 2. Fetch Fleet Vehicles
        const vehiclesRes = await fetch('/api/vehicles', { headers });
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);

        // Auto-select the first RENTED supercar for live telemetry simulation, or default to first available
        const rentedCar = vehiclesData.find((v: any) => v.status === 'RENTED');
        const defaultCar = rentedCar || vehiclesData[0] || null;
        setSelectedVehicle(defaultCar);
      } catch (err) {
        console.error('Failed to load dashboard parameters:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [currentTenant, currentRole, refreshTelemetryTrigger]);

  // Hook up selected vehicle telemetry simulation
  useEffect(() => {
    if (!selectedVehicle) {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
      return;
    }

    // Set initial values
    setLiveSpeed(selectedVehicle.speed);
    setLiveRpm(selectedVehicle.rpm);
    setLiveGForce(selectedVehicle.gForce);
    setLiveTemp(selectedVehicle.engineTemp);
    setLiveFuel(selectedVehicle.fuelLevel);
    setLiveCoords({ lat: selectedVehicle.latitude, lng: selectedVehicle.longitude });

    // Seed mock telemetry history lines
    const now = new Date();
    const history = [];
    for (let i = 10; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 3 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      history.push({
        time: timeStr,
        speed: selectedVehicle.speed === 0 ? 0 : Math.round(selectedVehicle.speed + Math.sin(i) * 12),
        rpm: selectedVehicle.rpm === 0 ? 0 : Math.round(selectedVehicle.rpm + Math.cos(i) * 300),
      });
    }
    setLiveHistory(history);

    // If car is in maintenance or parked available, don't simulate telemetry changes
    if (selectedVehicle.status !== 'RENTED') {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
      return;
    }

    setIsSeedingLive(true);

    // Active speed simulation interval (updates every 1.5 seconds)
    if (simulationInterval.current) clearInterval(simulationInterval.current);

    let counter = 0;
    simulationInterval.current = setInterval(() => {
      counter++;
      
      setLiveSpeed((prev) => {
        const peak = selectedVehicle.make === 'Koenigsegg' ? 330 : selectedVehicle.make === 'Porsche' ? 240 : 210;
        const base = selectedVehicle.make === 'Koenigsegg' ? 250 : selectedVehicle.make === 'Porsche' ? 180 : 130;
        const drift = Math.sin(counter * 0.7) * 20;
        const val = Math.round(base + drift + (counter % 3 === 0 ? 15 : -5));
        return Math.min(peak, Math.max(80, val));
      });

      setLiveRpm((prev) => {
        const base = 4500;
        const drift = Math.cos(counter * 0.8) * 800;
        const val = Math.round(base + drift + (Math.random() - 0.5) * 400);
        return Math.min(8500, Math.max(2200, val));
      });

      setLiveGForce(() => {
        const val = 1.0 + Math.sin(counter * 0.5) * 0.4 + (Math.random() - 0.5) * 0.2;
        return parseFloat(Math.min(2.4, Math.max(0.4, val)).toFixed(2));
      });

      setLiveTemp((prev) => {
        const base = 94;
        const val = base + Math.sin(counter * 0.1) * 2;
        return Math.round(val);
      });

      setLiveFuel((prev) => {
        // slow fuel drainage
        return Math.max(5, prev - (Math.random() > 0.8 ? 1 : 0));
      });

      setLiveCoords((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0004,
        lng: prev.lng + (Math.random() - 0.5) * 0.0004,
      }));

      // Append data point to telemetry history lines
      setLiveHistory((prevList) => {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newList = [...prevList];
        if (newList.length > 12) newList.shift();
        
        // Re-read current values at update boundary
        let speedVal = 100;
        let rpmVal = 3000;
        setLiveSpeed(s => { speedVal = s; return s; });
        setLiveRpm(r => { rpmVal = r; return r; });

        newList.push({
          time: nowStr,
          speed: speedVal,
          rpm: rpmVal,
        });
        return newList;
      });

    }, 1500);

    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [selectedVehicle]);

  if (isLoading || !currentTenant) {
    return (
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity className="status-dot" size={32} style={{ animation: 'pulse-glow 1.5s infinite' }} />
        <span style={{ color: 'var(--foreground-secondary)', fontFamily: 'var(--font-telemetry)', fontSize: '0.85rem' }}>GEARBOX TELEMETRY BOOTING...</span>
      </div>
    );
  }

  // Speedometer circular mathematics
  // Total dash length is 283 (corresponds to full circle)
  // Standard speed range is 0 to 350 km/h
  const dashOffset = 283 - (Math.min(350, liveSpeed) / 350) * 283;

  return (
    <>
      {/* 1. Header Area */}
      <header className="dashboard-header">
        <div className="header-title-area">
          <h1>{currentTenant.name}</h1>
          <p>Multi-Tenant SaaS Operations Control Center</p>
        </div>

        <div className="header-status-area">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span style={{ fontFamily: 'var(--font-telemetry)', fontSize: '0.8rem', fontWeight: 600 }}>TELEMETRY STREAM ONLINE</span>
          </div>
          <div className="tenant-pill">
            <Layers size={12} />
            <span>ID: {currentTenant.id.substring(0, 8)}</span>
          </div>
        </div>
      </header>

      {/* 2. Key Performance Indicators */}
      <section className="metrics-grid">
        {/* KPI: Total Fleet */}
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span>Total Supercar Fleet</span>
            <span className="kpi-icon"><Car size={16} color="var(--accent-cyan)" /></span>
          </div>
          <div className="kpi-value">{analytics?.fleet.total}</div>
          <div className="kpi-trend positive">
            <TrendingUp size={12} />
            <span>{analytics?.fleet.available} Available for hire</span>
          </div>
        </div>

        {/* KPI: Fleet Occupancy */}
        <div className="kpi-card green">
          <div className="kpi-header">
            <span>Fleet Occupancy Rate</span>
            <span className="kpi-icon"><Activity size={16} color="var(--accent-green)" /></span>
          </div>
          <div className="kpi-value">{analytics?.fleet.utilizationRate}%</div>
          <div className="kpi-trend positive">
            <span>{analytics?.fleet.rented} Active rental track cycles</span>
          </div>
        </div>

        {/* KPI: Average Track Speed */}
        <div className="kpi-card orange">
          <div className="kpi-header">
            <span>Average Tracker Speed</span>
            <span className="kpi-icon"><Gauge size={16} color="var(--accent-orange)" /></span>
          </div>
          <div className="kpi-value">{analytics?.fleet.averageSpeed} <span style={{ fontSize: '1rem', fontWeight: 500 }}>km/h</span></div>
          <div className="kpi-trend" style={{ color: 'var(--foreground-secondary)' }}>
            <span>Telemetry logged across {vehicles.filter(v => v.speed > 0).length} moving cars</span>
          </div>
        </div>

        {/* KPI: Monthly SaaS Revenue */}
        <div className="kpi-card" style={{ position: 'relative' }}>
          {analytics?.financials.isRestricted && (
            <div className="rbac-blocked-cover">
              <span className="blocked-icon"><ShieldAlert size={20} /></span>
              <div className="blocked-title">Financial Access Blocked</div>
              <div className="blocked-desc">Dynamic RBAC: Operator privileges filter out tenant revenue ledgers.</div>
            </div>
          )}
          <div className="kpi-header">
            <span>Total Tenant Revenue</span>
            <span className="kpi-icon"><DollarSign size={16} color="var(--accent-green)" /></span>
          </div>
          <div className="kpi-value">
            ${analytics?.financials.totalRevenue?.toLocaleString()}
          </div>
          <div className="kpi-trend positive">
            <TrendingUp size={12} />
            <span>AOV: ${analytics?.financials.averageOrderValue?.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* 3. Mid-Section: Telemetry widget & Performance Analytics */}
      <section className="visuals-grid">
        {/* Telemetry Stream Dashboard Widget */}
        <div className="telemetry-card">
          <div className="chart-header" style={{ marginBottom: '0.5rem' }}>
            <div className="chart-title">
              <h3>Live Telemetry Stream</h3>
              <p>Active coordinate tracker & engine diagnostics</p>
            </div>
            
            {/* Supercar selection toggle */}
            <select
              className="switcher-select"
              style={{ width: '180px', margin: 0 }}
              value={selectedVehicle?.id || ''}
              onChange={(e) => {
                const match = vehicles.find(v => v.id === e.target.value);
                if (match) setSelectedVehicle(match);
              }}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>

          {selectedVehicle ? (
            <>
              {/* Telemetry gauge layout */}
              <div className="speedometer-container">
                <svg className="speedometer-svg" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0891b2" />
                      <stop offset="100%" stopColor="var(--accent-cyan)" />
                    </linearGradient>
                    <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="var(--accent-orange)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Background track circle */}
                  <circle className="speedometer-bg" cx="50" cy="50" r="45" />
                  
                  {/* Dynamic fill line */}
                  <circle
                    className={`speedometer-fill ${liveSpeed > 220 ? 'orange' : 'cyan'}`}
                    cx="50"
                    cy="50"
                    r="45"
                    strokeDashoffset={dashOffset}
                  />
                </svg>

                <div className="speedometer-readout">
                  <div className="speedometer-number">{liveSpeed}</div>
                  <div className="speedometer-label">KM/H</div>
                </div>
              </div>

              {/* Grid with diagnostic coordinates and stats */}
              <div className="telemetry-row">
                <div className="telemetry-item">
                  <div className="telemetry-item-label">RPM Engine</div>
                  <div className="telemetry-item-value" style={{ color: liveRpm > 6800 ? 'var(--accent-orange)' : 'var(--foreground-primary)' }}>
                    {liveRpm.toLocaleString()}
                  </div>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-label">G-Force (Lat)</div>
                  <div className="telemetry-item-value">{liveGForce} G</div>
                </div>

                <div className="telemetry-item">
                  <div className="telemetry-item-label">Engine Temp</div>
                  <div className="telemetry-item-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Flame size={12} color="var(--accent-orange)" />
                    {liveTemp}°C
                  </div>
                </div>
              </div>

              {/* Active coordinates tracker */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--foreground-secondary)',
                  marginTop: '0.75rem',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  justifyContent: 'center'
                }}
              >
                <MapPin size={12} color="var(--accent-cyan)" />
                <span style={{ fontFamily: 'var(--font-telemetry)', letterSpacing: '0.5px' }}>
                  GPS: {liveCoords.lat.toFixed(6)}, {liveCoords.lng.toFixed(6)}
                </span>
                <span
                  style={{
                    backgroundColor: selectedVehicle.status === 'RENTED' ? 'var(--accent-green)' : 'var(--accent-orange)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    marginLeft: 'auto'
                  }}
                ></span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  {selectedVehicle.status}
                </span>
              </div>
            </>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-secondary)' }}>
              No supercar selected in database
            </div>
          )}
        </div>

        {/* Live Speed / Performance Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">
              <h3>Telemetry Drive Line</h3>
              <p>Active tracking speed & engine revs index</p>
            </div>
            
            {selectedVehicle?.status === 'RENTED' && (
              <span
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--accent-green)',
                  border: '1px solid var(--accent-green)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-telemetry)'
                }}
              >
                STREAMING LIVE
              </span>
            )}
          </div>

          <div className="chart-wrapper">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveHistory} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" stroke="var(--foreground-muted)" fontSize={10} />
                  <YAxis yAxisId="left" stroke="var(--accent-cyan)" fontSize={10} domain={[0, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--accent-orange)" fontSize={10} domain={[0, 9000]} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10, 10, 15, 0.95)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="speed" stroke="var(--accent-cyan)" name="Speed (km/h)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="rpm" stroke="var(--accent-orange)" name="Engine RPM" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>

      {/* 4. Bottom Section: Revenue Analysis & Bookings Ledger */}
      <section className="visuals-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="chart-card" style={{ height: '350px', position: 'relative' }}>
          {analytics?.financials.isRestricted && (
            <div className="rbac-blocked-cover">
              <span className="blocked-icon"><ShieldAlert size={20} /></span>
              <div className="blocked-title">Financial Chart Restricted</div>
              <div className="blocked-desc">SaaS security policy restricts local operators from viewing monthly revenue metrics.</div>
            </div>
          )}
          <div className="chart-header">
            <div className="chart-title">
              <h3>Dealership Gross Revenue History</h3>
              <p>Monthly booking values spanning the previous six cycles</p>
            </div>
            <div className="tenant-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
              <Calendar size={12} />
              <span>FY 2026 AUDIT APPROVED</span>
            </div>
          </div>

          <div className="chart-wrapper">
            {mounted && analytics?.financials.revenueHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.financials.revenueHistory} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenue-glow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0.00} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" stroke="var(--foreground-muted)" fontSize={11} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(v: any) => [v ? `$${v.toLocaleString()}` : '$0', 'Revenue']}
                    contentStyle={{
                      background: 'rgba(10, 10, 15, 0.95)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--accent-green)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenue-glow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
