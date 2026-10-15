import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db/index.js';
import { tasks } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TasksService {
  async findAllForUser(userId: string) {
    return db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
    });
  }

  async create(userId: string, dto: CreateTaskDto) {
    const [task] = await db
      .insert(tasks)
      .values({ ...dto, userId })
      .returning();

    return task;
  }

  async update(id: string, userId: string, data: UpdateTaskDto) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    const updates: Partial<typeof tasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    return updated;
  }

  async delete(id: string, userId: string) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    return { message: 'Task deleted successfully' };
  }
}
