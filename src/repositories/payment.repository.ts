import { db } from '@/lib/db';
import { BaseRepository } from './base.repository';
import type { Payment } from '@prisma/client';

export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super('Payment', db.payment);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<Payment | null> {
    return db.payment.findUnique({ where: { receiptNumber } });
  }

  async findByInvoice(invoiceId: string) {
    return db.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      include: { collector: { select: { id: true, fullName: true, username: true } }, invoice: true },
    });
  }

  async findByCollector(collectorId: string, opts?: { from?: Date; to?: Date }) {
    const where: Record<string, unknown> = { collectorId };
    if (opts?.from || opts?.to) {
      where.createdAt = {} as any;
      if (opts.from) (where.createdAt as any).gte = opts.from;
      if (opts.to) (where.createdAt as any).lte = opts.to;
    }
    return db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { invoice: { include: { business: true, property: true } } },
    });
  }

  async getCollectorSummary(collectorId: string, from: Date, to: Date) {
    const payments = await db.payment.findMany({
      where: {
        collectorId,
        createdAt: { gte: from, lte: to },
      },
      select: { amount: true, paymentMethod: true },
    });

    const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const count = payments.length;
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      const m = p.paymentMethod || 'CASH';
      byMethod[m] = (byMethod[m] || 0) + (p.amount || 0);
    }
    return { total, count, byMethod };
  }
}

export const paymentRepo = new PaymentRepository();
