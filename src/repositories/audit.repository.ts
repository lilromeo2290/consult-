import { db } from '@/lib/db';
import { BaseRepository } from './base.repository';
import type { AuditLog } from '@prisma/client';

export class AuditRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('AuditLog', db.auditLog);
  }

  async log(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  async findByEntity(entity: string, entityId: string) {
    return db.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findByUser(userId: string, opts?: { skip?: number; take?: number }) {
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where: { userId },
        skip: opts?.skip,
        take: opts?.take,
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  /** Parse the JSON string old/new values back to objects */
  parseValues(log: AuditLog): { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null } {
    let oldValues = null;
    let newValues = null;
    try { if (log.oldValues) oldValues = JSON.parse(log.oldValues); } catch {}
    try { if (log.newValues) newValues = JSON.parse(log.newValues); } catch {}
    return { oldValues, newValues };
  }
}

export const auditRepo = new AuditRepository();
