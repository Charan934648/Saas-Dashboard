'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Car,
  Plus,
  Compass,
  DollarSign,
  UserCheck,
  ShieldX,
  Fuel,
  Info,
  Calendar,
  Layers,
  Wrench,
  Gauge
} from 'lucide-react';

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

export default function FleetPage() {
  const { currentTenant, currentRole, refreshTelemetryTrigger, triggerRefreshTelemetry } = useApp();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states for adding vehicle
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [dailyRate, setDailyRate] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [image, setImage] = useState('');

  // Fetch fleet vehicles
  useEffect(() => {
    if (!currentTenant) return;

    async function fetchFleet() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch('/api/vehicles', {
          headers: {
            'x-tenant-id': currentTenant!.id,
            'x-role': currentRole
          }
        });
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        } else {
          const errData = await response.json();
          setErrorMessage(errData.error || 'Failed to retrieve fleet list.');
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to fetch fleet list from server.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFleet();
  }, [currentTenant, currentRole, refreshTelemetryTrigger]);

  // Handle Add Supercar form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    // Redundant client-side block for safety
    if (currentRole === 'OPERATOR') {
      alert('Forbidden: Insufficient privileges.');
      return;
    }

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant.id,
          'x-role': currentRole
        },
        body: JSON.stringify({
          make,
          model,
          year,
          dailyRate: parseFloat(dailyRate),
          licensePlate,
          image: image || undefined
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        // Reset form
        setMake('');
        setModel('');
        setYear(new Date().getFullYear());
        setDailyRate('');
        setLicensePlate('');
        setImage('');
        // Trigger global context sync
        triggerRefreshTelemetry();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deploy vehicle to fleet.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send add supercar request.');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return 'tag-available';
      case 'RENTED':
        return 'tag-rented';
      case 'MAINTENANCE':
        return 'tag-maintenance';
      default:
        return 'tag-available';
    }
  };

  return (
    <>
      {/* 1. Page Header */}
      <header className="dashboard-header">
        <div className="header-title-area">
          <h1>Supercar Fleet Manager</h1>
          <p>Deploy, track, and diagnostic-audit your elite rental fleet assets</p>
        </div>

        {/* Deploy Asset trigger - guarded by RBAC style */}
        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{
            background: currentRole === 'OPERATOR' ? 'var(--foreground-muted)' : undefined,
            boxShadow: currentRole === 'OPERATOR' ? 'none' : undefined,
            gap: '6px'
          }}
        >
          <Plus size={16} />
          <span>Deploy Supercar</span>
        </button>
      </header>

      {/* Access alert message */}
      {errorMessage && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            padding: '1rem',
            borderRadius: '12px',
            color: '#f87171',
            marginBottom: '1.5rem',
            fontSize: '0.85rem'
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* 2. Interactive Fleet Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
          <Car className="status-dot" size={32} style={{ animation: 'pulse-glow 1.5s infinite' }} />
          <span style={{ color: 'var(--foreground-secondary)', fontFamily: 'var(--font-telemetry)', fontSize: '0.85rem' }}>SYNCING FLEET MATRIX...</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-glass-card)',
            border: '1px dashed var(--border-glass)',
            padding: '4rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            color: 'var(--foreground-secondary)'
          }}
        >
          <Car size={48} style={{ color: 'var(--foreground-muted)', marginBottom: '1rem' }} />
          <h3>No Supercars Connected</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Click &quot;Deploy Supercar&quot; above to link your first asset to {currentTenant?.name}.</p>
        </div>
      ) : (
        <div className="vehicles-grid">
          {vehicles.map((v) => (
            <div key={v.id} className="vehicle-card">
              {/* Image banner with status tag */}
              <div className="vehicle-img-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.image}
                  alt={`${v.make} ${v.model}`}
                  className="vehicle-img"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <span className={`vehicle-tag ${getStatusClass(v.status)}`}>
                  {v.status}
                </span>
              </div>

              {/* Body */}
              <div className="vehicle-body">
                <div className="vehicle-info">
                  <div className="vehicle-title">
                    <h4>{v.make} {v.model}</h4>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} style={{ verticalAlign: 'middle' }} />
                      {v.year} model • {v.licensePlate}
                    </p>
                  </div>
                  <div className="vehicle-rate">
                    <div className="rate-num">${v.dailyRate}</div>
                    <div className="rate-lbl">DAILY VALUE</div>
                  </div>
                </div>

                {/* Diagnostics Grid */}
                <div className="vehicle-stats">
                  <div className="stat-row">
                    <Fuel size={14} className="stat-icon" color="var(--accent-green)" />
                    <span style={{ fontSize: '0.75rem' }}>Fuel: <strong>{v.fuelLevel}%</strong></span>
                  </div>

                  <div className="stat-row">
                    <Gauge size={14} className="stat-icon" color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.75rem' }}>Speed: <strong>{v.speed} km/h</strong></span>
                  </div>

                  <div className="stat-row" style={{ gridColumn: 'span 2' }}>
                    <Compass size={14} className="stat-icon" color="var(--accent-orange)" />
                    <span style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      GPS: <strong>{v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</strong>
                    </span>
                  </div>
                </div>

                {/* Card Actions guarded by RBAC */}
                <div className="vehicle-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      alert(`Accessing live diagnostics link for ${v.make} ${v.model} [PLATE: ${v.licensePlate}]. Connection established.`);
                    }}
                  >
                    <Compass size={14} />
                    <span>Diagnostics</span>
                  </button>

                  {/* Settings toggle - locks dynamically */}
                  <button
                    className="btn-outline"
                    title={currentRole === 'OPERATOR' ? 'Settings Locked (Requires Owner Role)' : 'Asset Settings'}
                    onClick={() => {
                      if (currentRole === 'OPERATOR') {
                        alert('Access Denied: Insufficient privileges. Operators cannot modify fleet asset properties.');
                      } else {
                        alert(`Supercar settings for ${v.make} ${v.model} loaded. Admin token: APPROVED.`);
                      }
                    }}
                  >
                    <Wrench size={14} color={currentRole === 'OPERATOR' ? 'var(--accent-orange)' : 'var(--foreground-secondary)'} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Add Supercar Glassmorphic Modal Form */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ position: 'relative' }}>
            {/* If role is operator, block form interactiveness */}
            {currentRole === 'OPERATOR' && (
              <div className="rbac-blocked-cover" style={{ borderRadius: '20px' }}>
                <span className="blocked-icon" style={{ borderColor: 'var(--accent-orange)' }}><ShieldX size={32} /></span>
                <div className="blocked-title" style={{ fontSize: '1.4rem' }}>Access Denied</div>
                <div className="blocked-desc" style={{ maxWidth: '300px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Your simulated active role is <strong>FLEET_OPERATOR</strong>. Under current SaaS multi-tenant isolation policy, Operators are barred from creating fleet assets.
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'var(--accent-orange)', boxShadow: '0 5px 15px var(--accent-orange-glow)' }}
                >
                  Return to Fleet
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-telemetry)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={20} color="var(--accent-cyan)" />
                Deploy New Supercar
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--foreground-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Car Manufacturer</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lamborghini, Ferrari, Porsche"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Model Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Revuelto, SF90 Stradale, GT3 RS"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Model Year</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Daily Rental Rate ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 1500"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>License Plate Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. APX-REV1"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Cover Image (Unsplash URL)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional https://images.unsplash.com/... URL"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flexGrow: 1 }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flexGrow: 2 }}
                >
                  Deploy Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
