import { db } from '@/lib/db';
import { invoiceRepo } from '@/repositories';
import { AuditService } from './audit.service';

/**
 * BillingService — handles invoice/bill CRUD with audit logging.
 * Dual-write to RmsData and Invoice table during migration.
 */
export class BillingService {
  /**
   * Get all bills from RmsData (legacy mode).
   */
  static async getAll(): Promise<Record<string, unknown>[]> {
    // Phase 1: Try relational tables first
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { business: true, property: true, lease: true },
    });

    if (invoices.length === 0) {
      const record = await db.rmsData.findUnique({ where: { key: 'rms-bills' } });
      if (record) {
        try { return JSON.parse(record.data); } catch { return []; }
      }
      return [];
    }

    return invoices.map((inv) => invoiceRepo.toLegacy(inv as any));
  }

  /**
   * Save bills (full array replace for backward compat).
   */
  static async saveAll(
    data: Record<string, unknown>[],
    opts?: { userId?: string; ipAddress?: string },
  ): Promise<void> {
    const jsonData = JSON.stringify(data);
    await db.rmsData.upsert({
      where: { key: 'rms-bills' },
      update: { data: jsonData },
      create: { key: 'rms-bills', data: jsonData },
    });

    // Dual-write to relational tables
    for (const record of data) {
      const input = invoiceRepo.toCreateInput(record);
      const existingId = record.id as string;

      if (existingId) {
        const exists = await db.invoice.findUnique({ where: { id: existingId } });
        if (exists) {
          await db.invoice.update({ where: { id: existingId }, data: input });
          continue;
        }
      }

      try {
        await db.invoice.create({ data: input as any });
      } catch (err: any) {
        if (err?.code === 'P2002' && err?.meta?.target?.includes('invoiceNumber')) {
          const existing = await db.invoice.findUnique({ where: { invoiceNumber: (input as any).invoiceNumber } });
          if (existing) await db.invoice.update({ where: { id: existing.id }, data: input });
        }
      }
    }

    await AuditService.log({
      userId: opts?.userId,
      action: 'UPDATE',
      entity: 'Invoice',
      newValues: { count: data.length },
      ipAddress: opts?.ipAddress,
    });
  }

  /**
   * Revenue reporting — total collected by month.
   * This is impossible with JSON blobs but trivial with relational tables.
   */
  static async revenueByMonth(year: number) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const payments = await db.payment.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
      },
      include: { invoice: true },
    });

    const byMonth: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      byMonth[`${year}-${String(m + 1).padStart(2, '0')}`] = 0;
    }

    for (const p of payments) {
      const month = p.createdAt.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + (p.amount || 0);
    }

    return Object.entries(byMonth).map(([month, total]) => ({ month, total }));
  }

  /**
   * Outstanding arrears report.
   */
  static async arrearsReport() {
    const overdue = await db.invoice.findMany({
      where: { status: 'OVERDUE' },
      include: { business: { select: { businessName: true, ownerName: true } }, property: { select: { propertyNumber: true, ownerName: true } } },
      orderBy: { amountDue: 'desc' },
    });
    return overdue;
  }
}
