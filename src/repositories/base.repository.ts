import { db } from '@/lib/db';

/**
 * BaseRepository provides a thin wrapper around Prisma for a given model.
 * Domain repositories extend this to add entity-specific queries.
 *
 * Using Float for monetary values (SQLite phase).
 * When migrating to PostgreSQL, switch to Prisma Decimal.
 */

export class BaseRepository<T extends { id: string }> {
  constructor(
    private modelName: string,
    private prismaDelegate: any,
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.prismaDelegate.findUnique({ where: { id } });
  }

  async findMany(opts?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    skip?: number;
    take?: number;
    include?: Record<string, unknown>;
  }): Promise<T[]> {
    const query: Record<string, unknown> = {};
    if (opts?.where) query.where = opts.where;
    if (opts?.orderBy) query.orderBy = opts.orderBy;
    if (opts?.skip) query.skip = opts.skip;
    if (opts?.take) query.take = opts.take;
    if (opts?.include) query.include = opts.include;
    return this.prismaDelegate.findMany(query);
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.prismaDelegate.count({ where });
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.prismaDelegate.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return this.prismaDelegate.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.prismaDelegate.delete({ where: { id } });
  }

  getModelName(): string {
    return this.modelName;
  }
}
