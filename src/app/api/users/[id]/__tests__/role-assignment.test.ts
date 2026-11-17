/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
  basePrisma: {
    $transaction: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { basePrisma, prisma } from '@/lib/prisma';
import { PATCH } from '../route';

const mockBasePrisma = basePrisma as unknown as {
  $transaction: jest.Mock;
};
const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
};

describe('PATCH /api/users/[id] role assignments', () => {
  const tx = {
    userRoleAssignment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dbAuditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN',
        activeRole: 'ADMIN',
        roles: ['MEMBER', 'ADMIN'],
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ roleAssignments: [] });
    mockBasePrisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.userRoleAssignment.findMany.mockResolvedValue([]);
    tx.userRoleAssignment.deleteMany.mockResolvedValue({ count: 0 });
    tx.userRoleAssignment.upsert.mockResolvedValue({
      id: 'assignment-1',
      userId: 'target-1',
      role: 'COUNTER',
      assignedById: 'admin-1',
    });
    tx.user.findUnique.mockResolvedValue({
      id: 'target-1',
      role: 'MEMBER',
      activeRole: 'MEMBER',
    });
    tx.user.update.mockResolvedValue({
      id: 'target-1',
      email: 'counter@example.com',
      role: 'COUNTER',
      activeRole: 'MEMBER',
      roleAssignments: [{ role: 'COUNTER' }],
    });
  });

  it('saves the role and its audit rows on the unextended transaction client', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/users/target-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['COUNTER'] }),
      }),
      { params: { id: 'target-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      role: 'COUNTER',
      activeRole: 'MEMBER',
      roleAssignments: [{ role: 'COUNTER' }],
    });
    expect(mockBasePrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.userRoleAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_role: { userId: 'target-1', role: 'COUNTER' } },
      })
    );
    expect(tx.dbAuditLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
