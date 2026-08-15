import { db } from '@/lib/db';
import { businessRepo } from '@/repositories';
import { AuditService } from './audit.service';

/**
 * BusinessService — handles business CRUD with audit logging.
 * Currently reads/writes RmsData for backward compatibility.
 * Will transition to relational tables once migration is complete.
 */
export class BusinessService {
  /**
   * Get all businesses from RmsData (legacy mode).
   * Returns the raw JSON array the frontend expects.
   */
  static async getAll(assemblyId: string): Promise<Record<string, unknown>[]> {
    // Phase 1: Read from relational tables
    const businesses = await db.business.findMany({
      where: { assemblyId },
      orderBy: { createdAt: 'desc' },
    });

    // If relational tables are empty, fall back to RmsData
    if (businesses.length === 0) {
      const record = await db.rmsData.findUnique({ where: { key: 'rms-businesses' } });
      if (record) {
        try { return JSON.parse(record.data); } catch { return []; }
      }
      return [];
    }

    return businesses.map((b) => businessRepo.toLegacy(b));
  }

  /**
   * Save businesses (full array replace, matching current frontend pattern).
   * Writes to BOTH relational tables and RmsData during transition.
   */
  static async saveAll(
    data: Record<string, unknown>[],
    assemblyId: string,
    opts?: { userId?: string; ipAddress?: string },
  ): Promise<void> {
    // Write to RmsData for backward compatibility
    const jsonData = JSON.stringify(data);
    await db.rmsData.upsert({
      where: { key: 'rms-businesses' },
      update: { data: jsonData },
      create: { key: 'rms-businesses', data: jsonData },
    });

    // Also write to relational tables (dual-write during migration)
    // This is a sync from JSON → relational; in production the service
    // would handle individual CRUD operations.
    for (const record of data) {
      const input = businessRepo.toCreateInput(record, assemblyId);
      const existingId = record.id as string;

      if (existingId) {
        const exists = await db.business.findUnique({ where: { id: existingId } });
        if (exists) {
          await db.business.update({ where: { id: existingId }, data: input });
          continue;
        }
      }
      // Create new — avoid unique constraint violations
      try {
        await db.business.create({ data: input });
      } catch (err: any) {
        // If unique constraint on registrationNo or businessUniqueNumber, try update
        if (err?.code === 'P2002') {
          const target = err?.meta?.target as string[];
          if (target?.includes('registrationNo') && input.registrationNo) {
            const existing = await db.business.findUnique({ where: { registrationNo: input.registrationNo } });
            if (existing) await db.business.update({ where: { id: existing.id }, data: input });
          } else if (target?.includes('businessUniqueNumber') && input.businessUniqueNumber) {
            const existing = await db.business.findUnique({ where: { businessUniqueNumber: input.businessUniqueNumber } });
            if (existing) await db.business.update({ where: { id: existing.id }, data: input });
          }
        }
      }
    }

    // Audit log
    await AuditService.log({
      userId: opts?.userId,
      action: 'UPDATE',
      entity: 'Business',
      newValues: { count: data.length },
      ipAddress: opts?.ipAddress,
    });
  }

  /**
   * Search businesses (for bill generation lookups).
   */
  static async search(query: string, assemblyId: string) {
    return businessRepo.search(query, assemblyId);
  }

  /**
   * Get revenue summary by category.
   * This is the kind of query that JSON blobs can't do efficiently.
   */
  static async revenueByCategory(assemblyId: string) {
    const rows = await db.business.groupBy({
      by: ['category'],
      where: { assemblyId, category: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });
    return rows.map((r) => ({
      category: r.category,
      totalAmount: r._sum.amount || 0,
      count: r._count,
    }));
  }
}
