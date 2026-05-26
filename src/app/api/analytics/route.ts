import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const tenantIdHeader = request.headers.get('x-tenant-id');
    const roleHeader = request.headers.get('x-role') || 'OPERATOR';

    let tenantFilter: any = {};

    // Determine query boundaries
    if (roleHeader === 'SUPER_ADMIN' && !tenantIdHeader) {
      // Global Analytics - fetch everything across all tenants
      tenantFilter = {};
    } else {
      if (!tenantIdHeader) {
        return NextResponse.json(
          { error: 'Tenant ID required for analytics queries.' },
          { status: 400 }
        );
      }
      tenantFilter.tenantId = tenantIdHeader;
    }

    // Fetch Fleet Metrics (visible to all roles)
    const fleetVehicles = await prisma.vehicle.findMany({
      where: tenantFilter,
      select: {
        id: true,
        status: true,
        dailyRate: true,
        speed: true,
      }
    });

    const totalFleet = fleetVehicles.length;
    const activeRentals = fleetVehicles.filter(v => v.status === 'RENTED').length;
    const underMaintenance = fleetVehicles.filter(v => v.status === 'MAINTENANCE').length;
    const availableFleet = fleetVehicles.filter(v => v.status === 'AVAILABLE').length;

    const utilizationRate = totalFleet > 0 ? parseFloat(((activeRentals / totalFleet) * 100).toFixed(1)) : 0;
    
    // Average fleet speed for telemetry insights
    const movingVehicles = fleetVehicles.filter(v => v.speed > 0);
    const averageSpeed = movingVehicles.length > 0 
      ? parseFloat((movingVehicles.reduce((sum, v) => sum + v.speed, 0) / movingVehicles.length).toFixed(1))
      : 0;

    // RBAC check: OPERATOR role is restricted from accessing financial metrics!
    const isRestricted = roleHeader === 'OPERATOR';

    if (isRestricted) {
      return NextResponse.json({
        fleet: {
          total: totalFleet,
          available: availableFleet,
          rented: activeRentals,
          maintenance: underMaintenance,
          utilizationRate,
          averageSpeed,
        },
        financials: {
          isRestricted: true,
          error: 'Access Denied: Insufficient privileges. Fleet Operators are barred from viewing tenant financial models.'
        }
      });
    }

    // OWNER or SUPER_ADMIN access: compile financial aggregates
    // 1. Gather all bookings
    const bookings = await prisma.booking.findMany({
      where: tenantFilter,
      orderBy: { startDate: 'desc' }
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter(b => b.status === 'COMPLETED' || b.status === 'ACTIVE')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const averageOrderValue = totalBookings > 0 ? parseFloat((totalRevenue / totalBookings).toFixed(2)) : 0;

    // 2. Compile monthly revenue aggregates for Recharts line chart (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyStatsMap = new Map<string, { revenue: number; bookings: number }>();

    // Seed map with last 6 months to guarantee order and structure
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyStatsMap.set(label, { revenue: 0, bookings: 0 });
    }

    // Populate data from DB bookings
    bookings.forEach(b => {
      const bDate = new Date(b.startDate);
      const label = `${months[bDate.getMonth()]} ${bDate.getFullYear().toString().substring(2)}`;
      if (monthlyStatsMap.has(label)) {
        const stats = monthlyStatsMap.get(label)!;
        stats.revenue += b.totalAmount;
        stats.bookings += 1;
      }
    });

    const revenueHistory = Array.from(monthlyStatsMap.entries()).map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue),
      bookings: data.bookings,
    }));

    return NextResponse.json({
      fleet: {
        total: totalFleet,
        available: availableFleet,
        rented: activeRentals,
        maintenance: underMaintenance,
        utilizationRate,
        averageSpeed,
      },
      financials: {
        isRestricted: false,
        totalRevenue: Math.round(totalRevenue),
        totalBookings,
        averageOrderValue,
        revenueHistory,
        bookingsLog: bookings.slice(0, 10), // Send recent 10 bookings
      }
    });
  } catch (error: any) {
    console.error('Error compiling analytics:', error);
    return NextResponse.json(
      { error: 'Failed to compile analytics telemetry', details: error.message },
      { status: 500 }
    );
  }
}
