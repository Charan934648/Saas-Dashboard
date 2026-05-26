import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const tenantIdHeader = request.headers.get('x-tenant-id');
    const roleHeader = request.headers.get('x-role') || 'OPERATOR';

    // If no specific vehicleId is provided, return all telemetry items for all active cars in the tenant
    if (!vehicleId) {
      let tenantFilter: any = {};
      if (roleHeader !== 'SUPER_ADMIN' || tenantIdHeader) {
        if (!tenantIdHeader) {
          return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }
        tenantFilter.tenantId = tenantIdHeader;
      }

      // Find all vehicles and their latest telemetry
      const activeVehicles = await prisma.vehicle.findMany({
        where: {
          ...tenantFilter,
          status: 'RENTED',
        },
        select: {
          id: true,
          make: true,
          model: true,
          licensePlate: true,
          speed: true,
          rpm: true,
          fuelLevel: true,
          engineTemp: true,
          gForce: true,
          latitude: true,
          longitude: true,
        },
      });

      return NextResponse.json(activeVehicles);
    }

    // Fetch details and history for a specific supercar
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        make: true,
        model: true,
        status: true,
        speed: true,
        rpm: true,
        fuelLevel: true,
        engineTemp: true,
        gForce: true,
        latitude: true,
        longitude: true,
        tenantId: true,
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Supercar not found' }, { status: 404 });
    }

    // Tenant check (except for SUPER_ADMIN)
    if (roleHeader !== 'SUPER_ADMIN' && tenantIdHeader && vehicle.tenantId !== tenantIdHeader) {
      return NextResponse.json({ error: 'Unauthorized tenant telemetry access.' }, { status: 403 });
    }

    // Fetch the last 15 telemetry logs for this vehicle, ordered by timestamp ascending
    const telemetryHistory = await prisma.telemetry.findMany({
      where: { vehicleId },
      orderBy: { timestamp: 'asc' },
      take: 15,
    });

    // Formulate a beautiful response with details + series
    return NextResponse.json({
      vehicle,
      history: telemetryHistory.map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        speed: t.speed,
        rpm: t.rpm,
        gForce: t.gForce,
        engineTemp: t.engineTemp,
        fuelLevel: t.fuelLevel,
      })),
    });
  } catch (error: any) {
    console.error('Error serving telemetry:', error);
    return NextResponse.json(
      { error: 'Failed to stream telemetry', details: error.message },
      { status: 500 }
    );
  }
}
