import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Fetch vehicles (with multi-tenant and role-based filtering)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdHeader = request.headers.get('x-tenant-id');
    const roleHeader = request.headers.get('x-role') || 'OPERATOR';
    const statusParam = searchParams.get('status');

    let queryOptions: any = {};

    // RBAC and Tenant isolation logic:
    // If role is SUPER_ADMIN and no tenant header is provided, fetch everything
    // Otherwise, restrict search strictly to the tenant specified in the header
    if (roleHeader === 'SUPER_ADMIN' && !tenantIdHeader) {
      // Fetch all vehicles across all tenants
      queryOptions = {};
    } else {
      if (!tenantIdHeader) {
        return NextResponse.json(
          { error: 'Tenant ID required for this access role.' },
          { status: 400 }
        );
      }
      queryOptions.tenantId = tenantIdHeader;
    }

    if (statusParam) {
      queryOptions.status = statusParam;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: queryOptions,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { name: true, slug: true }
        }
      }
    });

    return NextResponse.json(vehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Add a new supercar (RBAC Restricted: SUPER_ADMIN and OWNER only)
export async function POST(request: Request) {
  try {
    const tenantIdHeader = request.headers.get('x-tenant-id');
    const roleHeader = request.headers.get('x-role') || 'OPERATOR';

    // Enforce RBAC
    if (roleHeader !== 'SUPER_ADMIN' && roleHeader !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges. Only Owners or Super Admins can add fleet vehicles.' },
        { status: 403 }
      );
    }

    if (!tenantIdHeader) {
      return NextResponse.json(
        { error: 'Tenant ID header required to link fleet assets.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { make, model, year, dailyRate, licensePlate, image } = body;

    // Validate inputs
    if (!make || !model || !year || !dailyRate || !licensePlate) {
      return NextResponse.json(
        { error: 'Missing required vehicle fields' },
        { status: 400 }
      );
    }

    const defaultImage = image || 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&auto=format&fit=crop&q=80';

    // Create the vehicle and initialize seed telemetry
    const newVehicle = await prisma.vehicle.create({
      data: {
        make,
        model,
        year: parseInt(year),
        dailyRate: parseFloat(dailyRate),
        licensePlate,
        image: defaultImage,
        status: 'AVAILABLE',
        fuelLevel: 100,
        speed: 0,
        rpm: 0,
        engineTemp: 20,
        gForce: 0.0,
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        tenantId: tenantIdHeader,
        telemetry: {
          create: [
            {
              speed: 0,
              rpm: 0,
              gForce: 0.0,
              engineTemp: 20,
              fuelLevel: 100,
            }
          ]
        }
      },
    });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error.message },
      { status: 500 }
    );
  }
}
