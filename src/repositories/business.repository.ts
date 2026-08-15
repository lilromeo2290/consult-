import { db } from '@/lib/db';
import { BaseRepository } from './base.repository';
import type { Business } from '@prisma/client';

export class BusinessRepository extends BaseRepository<Business> {
  constructor() {
    super('Business', db.business);
  }

  async findByUniqueNumber(uniqueNumber: string): Promise<Business | null> {
    return db.business.findUnique({ where: { businessUniqueNumber: uniqueNumber } });
  }

  async findByRegistrationNo(regNo: string): Promise<Business | null> {
    return db.business.findUnique({ where: { registrationNo: regNo } });
  }

  async search(query: string, assemblyId: string, opts?: { skip?: number; take?: number }) {
    const where = {
      assemblyId,
      OR: [
        { businessName: { contains: query } },
        { ownerName: { contains: query } },
        { businessUniqueNumber: { contains: query } },
        { registrationNo: { contains: query } },
        { locality: { contains: query } },
      ],
    };
    const [items, total] = await Promise.all([
      db.business.findMany({
        where,
        skip: opts?.skip,
        take: opts?.take,
        orderBy: { createdAt: 'desc' },
        include: { categoryRel: true, assembly: true },
      }),
      db.business.count({ where }),
    ]);
    return { items, total };
  }

  async findByAssembly(assemblyId: string, opts?: { skip?: number; take?: number }) {
    const [items, total] = await Promise.all([
      db.business.findMany({
        where: { assemblyId },
        skip: opts?.skip,
        take: opts?.take,
        orderBy: { createdAt: 'desc' },
        include: { categoryRel: true },
      }),
      db.business.count({ where: { assemblyId } }),
    ]);
    return { items, total };
  }

  /** Map a legacy JSON business record to Prisma Business create input */
  toCreateInput(record: Record<string, unknown>, assemblyId: string) {
    return {
      registrationNo: (record.regNumber as string) || null,
      businessUniqueNumber: (record.businessUniqueNumber as string) || null,
      businessCertNo: (record.businessCertNo as string) || null,
      daAssignmentNo: (record.daAssignmentNo as string) || null,
      businessName: (record.name as string) || (record.businessName as string) || '',
      revenueCode: (record.revenueCode as string) || null,
      revenueDescription: (record.revenueDescription as string) || null,
      businessClassCode: (record.businessClassCode as string) || null,
      businessClassDesc: (record.businessClassDesc as string) || null,
      category: (record.category as string) || null,
      amount: (record.amount as number) || null,
      employees: (record.employees as number) || null,
      yearEstablished: (record.yearEstablished as number) || null,
      status: (record.status as string) || 'Active',
      dateRegistered: record.dateRegistered ? new Date(record.dateRegistered as string) : null,
      locality: (record.locality as string) || null,
      areaCode: (record.areaCode as string) || null,
      streetName: (record.streetName as string) || null,
      houseNo: (record.houseNo as string) || null,
      ghanaPostGPS: (record.ghanaPostGPS as string) || null,
      latitude: (record.latitude as number) || null,
      longitude: (record.longitude as number) || null,
      landmark: (record.landmark as string) || null,
      ownerName: (record.owner as string) || (record.ownerName as string) || null,
      ghanaCard: (record.ghanaCard as string) || null,
      phone: (record.phone as string) || null,
      email: (record.email as string) || null,
      ownerTin: (record.ownerTin as string) || null,
      assemblyId,
      comments: (record.comments as string) || null,
    };
  }

  /** Convert a Prisma Business record back to the legacy JSON shape the frontend expects */
  toLegacy(b: Business): Record<string, unknown> {
    return {
      id: b.id,
      regNumber: b.registrationNo,
      businessUniqueNumber: b.businessUniqueNumber,
      businessCertNo: b.businessCertNo,
      daAssignmentNo: b.daAssignmentNo,
      name: b.businessName,
      revenueCode: b.revenueCode,
      revenueDescription: b.revenueDescription,
      businessClassCode: b.businessClassCode,
      businessClassDesc: b.businessClassDesc,
      category: b.category,
      amount: b.amount,
      employees: b.employees,
      yearEstablished: b.yearEstablished,
      status: b.status,
      dateRegistered: b.dateRegistered?.toISOString().split('T')[0] || '',
      locality: b.locality,
      areaCode: b.areaCode,
      streetName: b.streetName,
      houseNo: b.houseNo,
      ghanaPostGPS: b.ghanaPostGPS,
      latitude: b.latitude,
      longitude: b.longitude,
      landmark: b.landmark,
      owner: b.ownerName,
      ghanaCard: b.ghanaCard,
      phone: b.phone,
      email: b.email,
      ownerTin: b.ownerTin,
      comments: b.comments,
    };
  }
}

export const businessRepo = new BusinessRepository();
