import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { savedLocationCreateSchema } from '@/lib/validations/saved-location';

function canManageSavedLocations(role: string | undefined) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageSavedLocations(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locations = await prisma.savedLocation.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      latitude: true,
      longitude: true,
    },
  });

  return NextResponse.json(locations);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageSavedLocations(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = savedLocationCreateSchema.parse(await req.json());

  try {
    const location = await prisma.savedLocation.create({
      data: {
        name: data.name,
        description: data.description || null,
        latitude: data.latitude,
        longitude: data.longitude,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        latitude: true,
        longitude: true,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ya existe un lugar guardado con ese nombre' },
        { status: 409 }
      );
    }

    throw error;
  }
}
