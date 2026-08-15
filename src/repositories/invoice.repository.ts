import { db } from '@/lib/db';
import { BaseRepository } from './base.repository';
import type { Invoice } from '@prisma/client';

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super('Invoice', db.invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return db.invoice.findUnique({ where: { invoiceNumber } });
  }

  async findByBusiness(businessId: string, opts?: { skip?: number; take?: number }) {
    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where: { businessId },
        skip: opts?.skip,
        take: opts?.take,
        orderBy: { createdAt: 'desc' },
        include: { business: true, property: true, lease: true, payments: true },
      }),
      db.invoice.count({ where: { businessId } }),
    ]);
    return { items, total };
  }

  async findByStatus(status: string, opts?: { skip?: number; take?: number }) {
    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where: { status: status as any },
        skip: opts?.skip,
        take: opts?.take,
        orderBy: { createdAt: 'desc' },
        include: { business: true, property: true, payments: true },
      }),
      db.invoice.count({ where: { status: status as any } }),
    ]);
    return { items, total };
  }

  /** Map a legacy JSON bill record to Prisma Invoice create input */
  toCreateInput(record: Record<string, unknown>) {
    return {
      invoiceNumber: (record.billNumber as string) || '',
      billType: (record.billType as string) || 'BOP',
      amount: (record.amount as number) || 0,
      arrears: (record.arrears as number) || 0,
      charge: (record.charge as number) || 0,
      amountDue: (record.amountDue as number) || 0,
      revenueCode: (record.revenueCode as string) || null,
      classDescription: (record.businessClass as string) || (record.businessClassDesc as string) || null,
      category: (record.category as string) || null,
      location: (record.location as string) || null,
      locality: (record.locality as string) || null,
      gpsCoordinates: (record.gpsCoordinates as string) || null,
      status: this.mapStatus(record.status as string),
      dueDate: record.dueDate ? new Date(record.dueDate as string) : null,
      billDate: record.date ? new Date(record.date as string) : null,
      fieldOfficer: (record.fieldOfficer as string) || null,
    };
  }

  /** Convert a Prisma Invoice back to legacy JSON shape */
  toLegacy(inv: Invoice & { business?: { businessName: string; ownerName: string | null } | null; property?: { propertyNumber: string | null; ownerName: string | null } | null; lease?: { rentPropertyNumber: string | null; occupantName: string | null } | null }): Record<string, unknown> {
    const entityName = inv.business?.businessName || inv.property?.ownerName || inv.lease?.occupantName || '';
    const owner = inv.business?.ownerName || inv.property?.ownerName || '';
    const uniqueNumber = inv.business?.businessUniqueNumber || inv.property?.propertyUniqueNumber || inv.lease?.rentPropertyUniqueNumber || '';

    return {
      id: inv.id,
      billNumber: inv.invoiceNumber,
      date: inv.billDate?.toISOString().split('T')[0] || '',
      billType: inv.billType,
      uniqueNumber,
      businessName: entityName,
      owner,
      category: inv.category,
      location: inv.location,
      arrears: inv.arrears,
      charge: inv.charge,
      amountDue: inv.amountDue,
      status: this.unmapStatus(inv.status),
      dueDate: inv.dueDate?.toISOString().split('T')[0] || '',
      billClass: inv.classDescription,
      fieldOfficer: inv.fieldOfficer,
    };
  }

  private mapStatus(s?: string): string {
    if (!s) return 'PENDING';
    const map: Record<string, string> = {
      'Unpaid': 'PENDING', 'Outstanding': 'PENDING',
      'Partial': 'PARTIAL', 'Partially Paid': 'PARTIAL',
      'Paid': 'PAID',
      'Overdue': 'OVERDUE',
      'Cancelled': 'CANCELLED',
    };
    return map[s] || 'PENDING';
  }

  private unmapStatus(s: string): string {
    const map: Record<string, string> = {
      'PENDING': 'Unpaid', 'PARTIAL': 'Partial', 'PAID': 'Paid', 'OVERDUE': 'Overdue', 'CANCELLED': 'Cancelled',
    };
    return map[s] || s;
  }
}

export const invoiceRepo = new InvoiceRepository();
