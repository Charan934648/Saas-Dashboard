'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'OPERATOR';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
}

interface AppContextType {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  currentRole: Role;
  currentUser: User | null;
  isLoading: boolean;
  setTenant: (slug: string) => void;
  setRole: (role: Role) => void;
  refreshTelemetryTrigger: number;
  triggerRefreshTelemetry: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Static mock tenants list to match database seeds
const mockTenants: Tenant[] = [
  { id: 'apex-exotics-id', name: 'Apex Exotic Rentals', slug: 'apex-exotics' },
  { id: 'velocity-supercars-id', name: 'Velocity Supercars', slug: 'velocity-supercars' },
  { id: 'quantum-hypercars-id', name: 'Quantum Hypercars', slug: 'quantum-hypercars' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(mockTenants[0]);
  const [currentRole, setCurrentRole] = useState<Role>('OWNER');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTelemetryTrigger, setRefreshTelemetryTrigger] = useState(0);

  const triggerRefreshTelemetry = () => {
    setRefreshTelemetryTrigger(prev => prev + 1);
  };

  // Fetch real tenants from the database/API or use seeded IDs
  useEffect(() => {
    async function loadTenantsAndInitialize() {
      try {
        // Resolve seeded tenant database IDs dynamically via quick query
        // Let's use a standard fetch to check, or fall back to known UUID structures
        const response = await fetch('/api/vehicles', {
          headers: { 'x-role': 'SUPER_ADMIN' }
        });
        if (response.ok) {
          const vehicles = await response.json();
          // Extract unique tenants from returned vehicles
          const uniqueTenantsMap = new Map<string, Tenant>();
          vehicles.forEach((v: any) => {
            if (v.tenantId && v.tenant) {
              uniqueTenantsMap.set(v.tenantId, {
                id: v.tenantId,
                name: v.tenant.name,
                slug: v.tenant.slug
              });
            }
          });
          
          if (uniqueTenantsMap.size > 0) {
            const list = Array.from(uniqueTenantsMap.values());
            setTenants(list);
            
            // Set current tenant from local storage or default to first in list
            const savedTenantSlug = localStorage.getItem('gearbox_tenant_slug');
            const match = list.find(t => t.slug === savedTenantSlug) || list[0];
            setCurrentTenant(match);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic tenants, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTenantsAndInitialize();
  }, []);

  // Sync role and user info
  useEffect(() => {
    const savedRole = localStorage.getItem('gearbox_role') as Role;
    if (savedRole) {
      setCurrentRole(savedRole);
    }
  }, []);

  const setTenant = (slug: string) => {
    const match = tenants.find(t => t.slug === slug);
    if (match) {
      setCurrentTenant(match);
      localStorage.setItem('gearbox_tenant_slug', slug);
    }
  };

  const setRole = (role: Role) => {
    setCurrentRole(role);
    localStorage.setItem('gearbox_role', role);
  };

  // Build current simulated user details based on role and tenant
  useEffect(() => {
    if (!currentTenant) return;
    
    let simulatedUser: User;
    if (currentRole === 'SUPER_ADMIN') {
      simulatedUser = {
        name: 'Sarah Connor',
        email: 'superadmin@gearbox.com',
        role: 'SUPER_ADMIN'
      };
    } else if (currentRole === 'OWNER') {
      const ownerNames: Record<string, string> = {
        'apex-exotics': 'Max Verstappen',
        'velocity-supercars': 'Lewis Hamilton',
        'quantum-hypercars': 'Christian von Koenigsegg',
      };
      simulatedUser = {
        name: ownerNames[currentTenant.slug] || 'Tenant Owner',
        email: `owner@${currentTenant.slug.split('-')[0]}.com`,
        role: 'OWNER',
        tenantId: currentTenant.id
      };
    } else {
      const operatorNames: Record<string, string> = {
        'apex-exotics': 'Lando Norris',
        'velocity-supercars': 'George Russell',
        'quantum-hypercars': 'Mate Rimac',
      };
      simulatedUser = {
        name: operatorNames[currentTenant.slug] || 'Fleet Operator',
        email: `operator@${currentTenant.slug.split('-')[0]}.com`,
        role: 'OPERATOR',
        tenantId: currentTenant.id
      };
    }
    
    setCurrentUser(simulatedUser);
  }, [currentTenant, currentRole]);

  return (
    <AppContext.Provider
      value={{
        tenants,
        currentTenant,
        currentRole,
        currentUser,
        isLoading,
        setTenant,
        setRole,
        refreshTelemetryTrigger,
        triggerRefreshTelemetry
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
