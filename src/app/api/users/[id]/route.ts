import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { basePrisma, prisma } from '@/lib/prisma';
import { userUpdateSchema } from '@/lib/validations/user';
import { hasAdminCapability, hasSuperAdminCapability } from '@/lib/roles';
import { blocksSuperAdminTarget } from '@/lib/admin-user-protection';
import { redactAuditValue } from '@/lib/security/audit-redaction';
import type { Role } from '@prisma/client';

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(redactAuditValue(value))
  ) as Prisma.InputJsonValue;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = userUpdateSchema.parse(await req.json());
  if ((await blocksSuperAdminTarget(session, params.id)) && !data.roles) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const roleUpdateRequested =
    data.role !== undefined || data.roles !== undefined;
  // Role management is available from the admin users list. SUPER_ADMIN stays
  // protected so admins cannot grant or remove that capability.
  if (roleUpdateRequested && !hasAdminCapability(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== params.id) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }
  }

  if (data.dni) {
    const existingDni = await prisma.user.findUnique({
      where: { dni: data.dni },
    });
    if (existingDni && existingDni.id !== params.id) {
      return NextResponse.json(
        { error: 'DNI already in use' },
        { status: 400 }
      );
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dni !== undefined) updateData.dni = data.dni ?? null;
  if (data.birthDate !== undefined)
    updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.maritalStatus !== undefined)
    updateData.maritalStatus = data.maritalStatus;
  if (data.observations !== undefined)
    updateData.observations = data.observations;
  if (data.allergies !== undefined) updateData.allergies = data.allergies;
  if (data.regularMedication !== undefined)
    updateData.regularMedication = data.regularMedication;
  if (data.relevantDiseases !== undefined)
    updateData.relevantDiseases = data.relevantDiseases;
  if (data.previousInjuries !== undefined)
    updateData.previousInjuries = data.previousInjuries;
  if (data.physicalRestrictions !== undefined)
    updateData.physicalRestrictions = data.physicalRestrictions;
  if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
  if (data.primaryDoctor !== undefined)
    updateData.primaryDoctor = data.primaryDoctor;
  if (data.doctorPhone !== undefined) updateData.doctorPhone = data.doctorPhone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.socialFeeActive !== undefined)
    updateData.socialFeeActive = data.socialFeeActive;

  const rolePriority: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COUNTER', 'PROFESSOR'];
  const pickLegacyRole = (roles: Role[]): Role => {
    for (const role of rolePriority) {
      if (roles.includes(role)) return role;
    }
    return 'MEMBER';
  };

  // Sync role assignments when `roles` is provided. We mirror the chosen
  // capabilities into the legacy `role` column for backward compatibility.
  let nextRoles: Role[] | null = null;
  if (data.roles !== undefined) {
    nextRoles = Array.from(new Set(data.roles)) as Role[];
  } else if (data.role !== undefined) {
    nextRoles = data.role === 'MEMBER' ? [] : [data.role as Role];
  }

  if (nextRoles !== null) {
    const currentTarget = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        activeRole: true,
        roleAssignments: { select: { role: true } },
      },
    });
    const currentRoles =
      currentTarget?.roleAssignments.map((a) => a.role) ?? [];
    const currentHasSuperAdmin = currentRoles.includes('SUPER_ADMIN');
    const requestedHasSuperAdmin = nextRoles.includes('SUPER_ADMIN');
    if (
      !hasSuperAdminCapability(session) &&
      (currentHasSuperAdmin || requestedHasSuperAdmin)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const legacyRole: Role = pickLegacyRole(nextRoles);
    updateData.role = legacyRole;
    // If the user's activeRole would no longer be valid, snap it back to MEMBER.
    if (
      currentTarget &&
      currentTarget.activeRole !== 'MEMBER' &&
      !nextRoles.includes(currentTarget.activeRole)
    ) {
      updateData.activeRole = 'MEMBER';
    }
  }

  const userSelect = {
    id: true,
    email: true,
    name: true,
    lastName: true,
    role: true,
    activeRole: true,
    dni: true,
    birthDate: true,
    gender: true,
    address: true,
    phone: true,
    nationality: true,
    maritalStatus: true,
    observations: true,
    isActive: true,
    socialFeeActive: true,
    roleAssignments: { select: { role: true } },
  } as const;

  let user;
  try {
    if (nextRoles === null) {
      user = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
        select: userSelect,
      });
    } else {
      // The audit extension uses a second Prisma connection for writes. Keep
      // role changes and their audit rows on the same connection because
      // production's Supavisor pool is configured with connection_limit=1.
      user = await basePrisma.$transaction(async (tx) => {
        const previousAssignments = await tx.userRoleAssignment.findMany({
          where: { userId: params.id },
        });
        const nextRoleSet = new Set(nextRoles as Role[]);
        const removedAssignments = previousAssignments.filter(
          (assignment) => !nextRoleSet.has(assignment.role)
        );
        const previousUser = await tx.user.findUnique({
          where: { id: params.id },
        });

        await tx.userRoleAssignment.deleteMany({
          where: { userId: params.id, role: { notIn: nextRoles as Role[] } },
        });
        for (const assignment of removedAssignments) {
          await tx.dbAuditLog.create({
            data: {
              id: randomUUID(),
              model: 'UserRoleAssignment',
              action: 'deleteMany',
              recordId: assignment.id,
              before: auditJson(assignment),
              after: Prisma.DbNull,
              args: auditJson({ where: { id: assignment.id } }),
              userId: session.user.id,
            },
          });
        }

        for (const role of nextRoles) {
          const existed = previousAssignments.some(
            (assignment) => assignment.role === role
          );
          const assignment = await tx.userRoleAssignment.upsert({
            where: { userId_role: { userId: params.id, role } },
            create: {
              userId: params.id,
              role,
              assignedById: session.user.id,
            },
            update: {},
          });
          if (!existed) {
            await tx.dbAuditLog.create({
              data: {
                id: randomUUID(),
                model: 'UserRoleAssignment',
                action: 'upsert',
                recordId: assignment.id,
                before: Prisma.DbNull,
                after: auditJson(assignment),
                args: auditJson({ where: { userId: params.id, role } }),
                userId: session.user.id,
              },
            });
          }
        }

        const updatedUser = await tx.user.update({
          where: { id: params.id },
          data: updateData,
          select: userSelect,
        });

        if (previousUser) {
          await tx.dbAuditLog.create({
            data: {
              id: randomUUID(),
              model: 'User',
              action: 'update',
              recordId: updatedUser.id,
              before: auditJson(previousUser),
              after: auditJson(updatedUser),
              args: auditJson({ where: { id: params.id }, data: updateData }),
              userId: session.user.id,
            },
          });
        }

        return updatedUser;
      });
    }
  } catch (error) {
    console.error('[PATCH /api/users/[id]] Failed to update user', error);
    return NextResponse.json(
      {
        error:
          nextRoles !== null
            ? 'No se pudieron guardar los roles'
            : 'No se pudo actualizar el usuario',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(user);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await blocksSuperAdminTarget(session, params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
