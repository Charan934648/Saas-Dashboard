import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.telemetry.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Seeding tenants...');
  const tenantApex = await prisma.tenant.create({
    data: {
      name: 'Apex Exotic Rentals',
      slug: 'apex-exotics',
    },
  });

  const tenantVelocity = await prisma.tenant.create({
    data: {
      name: 'Velocity Supercars',
      slug: 'velocity-supercars',
    },
  });

  const tenantQuantum = await prisma.tenant.create({
    data: {
      name: 'Quantum Hypercars',
      slug: 'quantum-hypercars',
    },
  });

  console.log('Seeding users & roles (RBAC)...');
  // Global Super Admin
  await prisma.user.create({
    data: {
      email: 'superadmin@gearbox.com',
      name: 'Sarah Connor',
      role: 'SUPER_ADMIN',
    },
  });

  // Apex Users
  await prisma.user.create({
    data: {
      email: 'owner@apex.com',
      name: 'Max Verstappen',
      role: 'OWNER',
      tenantId: tenantApex.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'operator@apex.com',
      name: 'Lando Norris',
      role: 'OPERATOR',
      tenantId: tenantApex.id,
    },
  });

  // Velocity Users
  await prisma.user.create({
    data: {
      email: 'owner@velocity.com',
      name: 'Lewis Hamilton',
      role: 'OWNER',
      tenantId: tenantVelocity.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'operator@velocity.com',
      name: 'George Russell',
      role: 'OPERATOR',
      tenantId: tenantVelocity.id,
    },
  });

  // Quantum Users
  await prisma.user.create({
    data: {
      email: 'owner@quantum.com',
      name: 'Christian von Koenigsegg',
      role: 'OWNER',
      tenantId: tenantQuantum.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'operator@quantum.com',
      name: 'Mate Rimac',
      role: 'OPERATOR',
      tenantId: tenantQuantum.id,
    },
  });

  console.log('Seeding vehicles and telemetry...');

  // Helper to generate historical telemetry
  const createTelemetryData = (baseSpeed: number, baseRpm: number, baseTemp: number, baseFuel: number) => {
    const data = [];
    const now = new Date();
    for (let i = 10; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5 min intervals
      const variance = Math.sin(i) * 15;
      data.push({
        timestamp: time,
        speed: baseSpeed === 0 ? 0 : Math.round(baseSpeed + variance),
        rpm: baseRpm === 0 ? 0 : Math.round(baseRpm + variance * 25),
        gForce: baseSpeed === 0 ? 0.0 : parseFloat((1.0 + Math.cos(i) * 0.4).toFixed(2)),
        engineTemp: baseSpeed === 0 ? baseTemp : Math.round(baseTemp + variance * 0.1),
        fuelLevel: baseSpeed === 0 ? baseFuel : Math.max(0, Math.round(baseFuel - (10 - i) * 0.5)),
      });
    }
    return data;
  };

  // Helper to generate historical bookings for revenue reporting (last 6 months)
  const createBookingsData = (tenantId: string, dailyRate: number) => {
    const bookings = [];
    const now = new Date();
    const customers = ['Alexander Wright', 'Sophia Loren', 'James Bond', 'Elon Musk', 'Bruce Wayne', 'Tony Stark', 'Charlotte York', 'Jordan Belfort'];
    
    // We create ~5-8 historical bookings per car
    for (let i = 5; i >= 1; i--) {
      const startDaysAgo = i * 25 + Math.floor(Math.random() * 10);
      const duration = 2 + Math.floor(Math.random() * 4);
      const startDate = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
      const totalAmount = duration * dailyRate;
      
      bookings.push({
        tenantId,
        customerName: customers[Math.floor(Math.random() * customers.length)],
        startDate,
        endDate,
        totalAmount,
        status: 'COMPLETED',
      });
    }

    // Add one active/future booking
    bookings.push({
      tenantId,
      customerName: 'Marcus Aurelius',
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // started yesterday
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // ends in 3 days
      totalAmount: 4 * dailyRate,
      status: 'ACTIVE',
    });

    return bookings;
  };

  // 1. Apex Exotic Rentals Fleet — San Francisco
  // Luxury touring & GT supercars
  const apexCars = [
    {
      make: 'Ferrari',
      model: 'SF90 Stradale',
      year: 2024,
      dailyRate: 1500,
      status: 'AVAILABLE',
      licensePlate: 'APX-SF90',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 78,
      speed: 112,
      rpm: 3400,
      engineTemp: 91,
      gForce: 1.15,
      latitude: 37.7749,
      longitude: -122.4194,
    },
    {
      make: 'Porsche',
      model: '911 GT3 RS',
      year: 2024,
      dailyRate: 1100,
      status: 'RENTED',
      licensePlate: 'APX-GT3R',
      image: 'https://images.unsplash.com/photo-1542168470-792e26052f42?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 42,
      speed: 218,
      rpm: 6900,
      engineTemp: 97,
      gForce: 1.55,
      latitude: 37.8044,
      longitude: -122.2711,
    },
    {
      make: 'Aston Martin',
      model: 'DBS Superleggera',
      year: 2023,
      dailyRate: 1250,
      status: 'MAINTENANCE',
      licensePlate: 'APX-DBS7',
      image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 90,
      speed: 0,
      rpm: 0,
      engineTemp: 24,
      gForce: 0.0,
      latitude: 37.7599,
      longitude: -122.4376,
    },
    {
      make: 'Lamborghini',
      model: 'Huracán Tecnica',
      year: 2024,
      dailyRate: 1400,
      status: 'RENTED',
      licensePlate: 'APX-HURA',
      image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 65,
      speed: 185,
      rpm: 6200,
      engineTemp: 96,
      gForce: 1.42,
      latitude: 37.7833,
      longitude: -122.4167,
    },
  ];

  for (const car of apexCars) {
    await prisma.vehicle.create({
      data: {
        ...car,
        tenantId: tenantApex.id,
        telemetry: {
          create: createTelemetryData(car.speed, car.rpm, car.engineTemp, car.fuelLevel),
        },
        bookings: {
          create: createBookingsData(tenantApex.id, car.dailyRate),
        },
      },
    });
  }

  // 2. Velocity Supercars Fleet — Los Angeles
  // Modern speedsters & track-focused machines
  const velocityCars = [
    {
      make: 'Lamborghini',
      model: 'Revuelto',
      year: 2024,
      dailyRate: 1700,
      status: 'RENTED',
      licensePlate: 'VEL-REVT',
      image: 'https://images.unsplash.com/photo-1566473965997-3de9c817e938?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 58,
      speed: 165,
      rpm: 5400,
      engineTemp: 94,
      gForce: 1.35,
      latitude: 34.0522,
      longitude: -118.2437,
    },
    {
      make: 'McLaren',
      model: '750S Spider',
      year: 2024,
      dailyRate: 1350,
      status: 'AVAILABLE',
      licensePlate: 'VEL-750S',
      image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 88,
      speed: 78,
      rpm: 2300,
      engineTemp: 87,
      gForce: 0.75,
      latitude: 34.1376,
      longitude: -118.1252,
    },
    {
      make: 'Ferrari',
      model: '296 GTB',
      year: 2023,
      dailyRate: 1200,
      status: 'AVAILABLE',
      licensePlate: 'VEL-296G',
      image: 'https://images.unsplash.com/photo-1592853625597-7d17be820d0c?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 95,
      speed: 0,
      rpm: 0,
      engineTemp: 22,
      gForce: 0.0,
      latitude: 34.0928,
      longitude: -118.3287,
    },
    {
      make: 'Maserati',
      model: 'MC20',
      year: 2023,
      dailyRate: 1150,
      status: 'AVAILABLE',
      licensePlate: 'VEL-MC20',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 100,
      speed: 0,
      rpm: 0,
      engineTemp: 20,
      gForce: 0.0,
      latitude: 34.0250,
      longitude: -118.2850,
    },
  ];

  for (const car of velocityCars) {
    await prisma.vehicle.create({
      data: {
        ...car,
        tenantId: tenantVelocity.id,
        telemetry: {
          create: createTelemetryData(car.speed, car.rpm, car.engineTemp, car.fuelLevel),
        },
        bookings: {
          create: createBookingsData(tenantVelocity.id, car.dailyRate),
        },
      },
    });
  }

  // 3. Quantum Hypercars Fleet — New York
  // Elite hypercars & limited-production exotics
  const quantumCars = [
    {
      make: 'Koenigsegg',
      model: 'Jesko Attack',
      year: 2024,
      dailyRate: 5000,
      status: 'RENTED',
      licensePlate: 'QTY-JESK',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 49,
      speed: 312,
      rpm: 7450,
      engineTemp: 101,
      gForce: 1.82,
      latitude: 40.7128,
      longitude: -74.0060,
    },
    {
      make: 'Bugatti',
      model: 'Chiron Super Sport',
      year: 2023,
      dailyRate: 4500,
      status: 'AVAILABLE',
      licensePlate: 'QTY-CHIR',
      image: 'https://images.unsplash.com/photo-1600706432502-75a0e2b3b883?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 82,
      speed: 125,
      rpm: 2900,
      engineTemp: 89,
      gForce: 0.95,
      latitude: 40.7589,
      longitude: -73.9851,
    },
    {
      make: 'Pagani',
      model: 'Utopia',
      year: 2024,
      dailyRate: 4000,
      status: 'MAINTENANCE',
      licensePlate: 'QTY-UTOP',
      image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 100,
      speed: 0,
      rpm: 0,
      engineTemp: 19,
      gForce: 0.0,
      latitude: 40.7282,
      longitude: -74.0776,
    },
    {
      make: 'Rimac',
      model: 'Nevera',
      year: 2024,
      dailyRate: 3500,
      status: 'AVAILABLE',
      licensePlate: 'QTY-NEVR',
      image: 'https://images.unsplash.com/photo-1547046967-23d11aacaee0?w=800&auto=format&fit=crop&q=80',
      fuelLevel: 100,
      speed: 0,
      rpm: 0,
      engineTemp: 20,
      gForce: 0.0,
      latitude: 40.7484,
      longitude: -73.9857,
    },
  ];

  for (const car of quantumCars) {
    await prisma.vehicle.create({
      data: {
        ...car,
        tenantId: tenantQuantum.id,
        telemetry: {
          create: createTelemetryData(car.speed, car.rpm, car.engineTemp, car.fuelLevel),
        },
        bookings: {
          create: createBookingsData(tenantQuantum.id, car.dailyRate),
        },
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
