import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { NewUser } from '../db/schema.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findByVerificationToken(token: string) {
    return this.queryOrUnavailable(() =>
      db.query.users.findFirst({
        where: eq(users.verificationToken, token),
      }),
    );
  }

  async findByResetToken(token: string) {
    return this.queryOrUnavailable(() =>
      db.query.users.findFirst({
        where: eq(users.resetToken, token),
      }),
    );
  }

  async findByEmail(email: string) {
    return this.queryOrUnavailable(() =>
      db.query.users.findFirst({
        where: eq(users.email, email.trim().toLowerCase()),
      }),
    );
  }

  async findById(id: string) {
    return this.queryOrUnavailable(() =>
      db.query.users.findFirst({
        where: eq(users.id, id),
      }),
    );
  }

  async create(data: NewUser) {
    try {
      const [user] = await db.insert(users).values(data).returning();
      return user;
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        throw error;
      }

      this.logger.error(
        'User creation failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Database temporarily unavailable. Please try again.',
      );
    }
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    return this.queryOrUnavailable(async () => {
      const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return user;
    });
  }

  async findAll() {
    return this.queryOrUnavailable(() => db.query.users.findMany());
  }

  async findAllSafe() {
    return this.queryOrUnavailable(() =>
      db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );
  }

  async delete(id: string) {
    return this.queryOrUnavailable(() =>
      db.delete(users).where(eq(users.id, id)),
    );
  }

  private async queryOrUnavailable<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error: unknown) {
      this.logger.error(
        'Database query failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Database temporarily unavailable. Please try again.',
      );
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
