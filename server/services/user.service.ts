import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";
import type { Role } from "@prisma/client";

interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
}
interface UpdateUserInput {
  username?: string;
  role?: Role;
  password?: string;
}

function serialize(u: {
  id: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Never expose passwordHash.
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export const userService = {
  async list() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return users.map(serialize);
  },

  /** Active waiters for the "order on behalf of" dropdown (id + username only). */
  async listWaiters() {
    const users = await prisma.user.findMany({
      where: { role: "WAITER", isActive: true },
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    });
    return users;
  },

  async create(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { username: input.username.trim(), passwordHash, role: input.role },
    });
    return serialize(user);
  },

  async update(userId: string, input: UpdateUserInput) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new ApiException("User not found", 404);
    const data: { username?: string; role?: Role; passwordHash?: string } = {};
    if (input.username !== undefined) data.username = input.username.trim();
    if (input.role !== undefined) data.role = input.role;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.update({ where: { id: userId }, data });
    return serialize(user);
  },

  async setActive(actingUser: AuthedUser, userId: string, isActive: boolean) {
    if (actingUser.id === userId && !isActive) {
      throw new ApiException("You cannot deactivate your own account", 409);
    }
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new ApiException("User not found", 404);
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
    return serialize(user);
  },
};
