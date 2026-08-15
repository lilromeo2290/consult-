import { db } from '@/lib/db';
import { paymentRepo } from '@/repositories';
import { AuditService } from './audit.service';

/**
 * PaymentService — handles payment recording with audit logging.
 */
export class PaymentService {
  /**
   * Record a payment against an invoice.
   */
  static async recordPayment(params: {
    invoiceId: string;
    amount: number;
    method: string;
    collectorId?: string;
    transactionRef?: string;
    receiptNumber: string;
    payerName?: string;
    payerPhone?: string;
    ipAddress?: string;
  }) {
    return db.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          invoiceId: params.invoiceId,
          amount: params.amount,
          paymentMethod: params.method as any,
          collectorId: params.collectorId || null,
          transactionRef: params.transactionRef || null,
          receiptNumber: params.receiptNumber,
          payerName: params.payerName || null,
          payerPhone: params.payerPhone || null,
        },
      });

      // Update invoice amounts
      const invoice = await tx.invoice.findUnique({ where: { id: params.invoiceId } });
      if (invoice) {
        const newAmountPaid = (invoice.amountPaid || 0) + params.amount;
        const newStatus = newAmountPaid >= invoice.amountDue ? 'PAID' : 'PARTIAL';
        await tx.invoice.update({
          where: { id: params.invoiceId },
          data: { amountPaid: newAmountPaid, status: newStatus as any },
        });
      }

      // Audit
      await AuditService.log({
        userId: params.collectorId,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        newValues: { amount: params.amount, method: params.method, receiptNumber: params.receiptNumber },
        ipAddress: params.ipAddress,
      });

      return payment;
    });
  }

  /**
   * Get all payments for an invoice.
   */
  static async getInvoicePayments(invoiceId: string) {
    return paymentRepo.findByInvoice(invoiceId);
  }

  /**
   * Collector performance report.
   */
  static async collectorPerformance(from: Date, to: Date) {
    const collectors = await db.user.findMany({
      where: { active: true, role: { name: { in: ['Revenue Collector', 'Administrator'] } } },
      include: {
        _count: { select: { collectedPayments: { where: { createdAt: { gte: from, lte: to } } } } },
      },
    });

    const results = [];
    for (const c of collectors) {
      const summary = await paymentRepo.getCollectorSummary(c.id, from, to);
      results.push({
        collectorId: c.id,
        collectorName: c.fullName,
        username: c.username,
        ...summary,
      });
    }

    return results.sort((a, b) => b.total - a.total);
  }
}
