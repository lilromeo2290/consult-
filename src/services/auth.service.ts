import { db } from '@/lib/db';
import { hashPassword, verifyPassword, signToken, type JwtPayload } from '@/lib/auth';
import { ALL_PERMISSION_CODES, ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { AuditService } from './audit.service';

/**
 * AuthService — authentication and user management.
 */
export class AuthService {
  /**
   * Initialize roles, permissions, and default admin user.
   * Called once during first setup / migration.
   */
  static async seed(ipAddress?: string) {
    // Seed permissions
    for (const p of ALL_PERMISSION_CODES) {
      await db.permission.upsert({
        where: { code: p.code },
        update: { description: p.description, module: p.module },
        create: { code: p.code, description: p.description, module: p.module },
      });
    }

    // Seed roles and their permissions
    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await db.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });

      for (const code of permCodes) {
        const perm = await db.permission.findUnique({ where: { code } });
        if (perm) {
          await db.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            update: {},
            create: { roleId: role.id, permissionId: perm.id },
          });
        }
      }
    }

    // Seed default assembly
    const assembly = await db.assembly.upsert({
      where: { code: 'KPMA' },
      update: {},
      create: { code: 'KPMA', name: 'Kpando Municipal Assembly', region: 'Oti', district: 'Kpando' },
    });

    // Seed admin user
    const adminRole = await db.role.findUnique({ where: { name: 'Administrator' } });
    if (adminRole) {
      const existingAdmin = await db.user.findUnique({ where: { username: 'admin' } });
      if (!existingAdmin) {
        const passwordHash = await hashPassword('admin123');
        await db.user.create({
          data: {
            username: 'admin',
            passwordHash,
            fullName: 'System Administrator',
            email: 'admin@kpma.gov.gh',
            staffId: 'STF-001',
            roleId: adminRole.id,
            assemblyId: assembly.id,
          },
        });

        await AuditService.log({
          action: 'CREATE',
          entity: 'User',
          newValues: { username: 'admin', role: 'Administrator' },
          ipAddress,
        });
      }
    }

    return { assemblyId: assembly.id };
  }

  /**
   * Authenticate a user by username + password.
   */
  static async login(
    username: string,
    password: string,
    ipAddress?: string,
  ): Promise<{ token: string; user: { id: string; username: string; fullName: string; role: string; assemblyId: string | null } } | null> {
    const user = await db.user.findUnique({
      where: { username },
      include: { role: true, assembly: true },
    });

    if (!user || !user.active) return null;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      assemblyId: user.assemblyId,
    };

    const token = await signToken(payload);

    await AuditService.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
        assemblyId: user.assemblyId,
      },
    };
  }

  /**
   * Get user permissions by role.
   */
  static async getUserPermissions(roleId: string): Promise<string[]> {
    const rolePerms = await db.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { code: true } } },
    });
    return rolePerms.map((rp) => rp.permission.code);
  }

  /**
   * Check if a user's role has a specific permission.
   */
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) return false;
    if (user.role.name === 'Administrator') return true;
    return user.role.permissions.some((rp) => rp.permission.code === permissionCode);
  }
}
