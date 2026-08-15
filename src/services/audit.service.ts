import { auditRepo } from '@/repositories';
import type { AuditLog } from '@prisma/client';

/**
 * AuditService — thin wrapper around auditRepo.
 * Used by other services and middleware to record actions.
 */
export class AuditService {
  /**
   * Log an action. Call from service layer after DB operations.
   */
  static async log(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return auditRepo.log(params);
  }

  static async getEntityHistory(entity: string, entityId: string) {
    return auditRepo.findByEntity(entity, entityId);
  }

  static async getUserActivity(userId: string, opts?: { skip?: number; take?: number }) {
    return auditRepo.findByUser(userId, opts);
  }
}
