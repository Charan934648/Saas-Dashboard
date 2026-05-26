'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LayoutDashboard, Car, ShieldAlert, LineChart, RefreshCw, UserCheck } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    tenants,
    currentTenant,
    currentRole,
    currentUser,
    setTenant,
    setRole,
    triggerRefreshTelemetry,
  } = useApp();

  const links = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Fleet Manager', href: '/fleet', icon: Car },
    { name: 'Telemetry Insights', href: '/analytics', icon: LineChart },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">
          <span>GEAR</span>BOX
        </div>

        <nav className="sidebar-menu">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Session Switcher Dashboard Controller */}
      <div className="session-switcher-card">
        <div className="switcher-title">
          <UserCheck size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          RBAC Switcher
        </div>

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label className="switcher-title" style={{ fontSize: '0.65rem' }}>Active Tenant</label>
          <select
            className="switcher-select"
            value={currentTenant?.slug || ''}
            onChange={(e) => setTenant(e.target.value)}
          >
            {tenants.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
          <label className="switcher-title" style={{ fontSize: '0.65rem' }}>Simulated Role</label>
          <select
            className="switcher-select"
            value={currentRole}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN (Sarah)</option>
            <option value="OWNER">OWNER (Owner)</option>
            <option value="OPERATOR">FLEET_OPERATOR (Staff)</option>
          </select>
        </div>

        {/* Current Identity Details Badge */}
        {currentUser && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.75rem',
              lineHeight: '1.4',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentRole === 'SUPER_ADMIN'
                      ? 'var(--accent-magenta)'
                      : currentRole === 'OWNER'
                      ? 'var(--accent-cyan)'
                      : 'var(--accent-green)',
                  display: 'inline-block',
                }}
              ></span>
              {currentUser.name}
            </div>
            <div style={{ color: 'var(--foreground-muted)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.email}
            </div>
          </div>
        )}

        <button
          onClick={triggerRefreshTelemetry}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: '6px',
            color: 'var(--foreground-secondary)',
            fontSize: '0.7rem',
            padding: '0.35rem',
            marginTop: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'var(--transition-smooth)'
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--foreground-secondary)')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
        >
          <RefreshCw size={10} />
          <span>Ping API / Sync Data</span>
        </button>
      </div>
    </aside>
  );
}
