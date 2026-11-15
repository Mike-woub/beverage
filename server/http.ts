import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Server-side helpers shared by every Route Handler: authentication/authorization
 * (re-verified close to the data, per the Next 16 guidance), consistent JSON
 * responses, and error shaping. Never trust role info from the client — it is
 * read from the signed JWT here.
 */

export interface AuthedUser {
  id: string;
  username: string;
  role: Role;
}

export class ApiException extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Reads and verifies the session JWT. Throws 401 if absent/invalid. */
export async function requireAuth(req: NextRequest): Promise<AuthedUser> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.id) {
    throw new ApiException("Not authenticated", 401);
  }
  return {
    id: token.id as string,
    username: token.username as string,
    role: token.role as Role,
  };
}

/** Requires one of the allowed roles. Throws 403 otherwise. */
export async function requireRole(
  req: NextRequest,
  roles: Role[],
): Promise<AuthedUser> {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) {
    throw new ApiException("You do not have permission to perform this action", 403);
  }
  return user;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/** Normalizes thrown errors (ApiException, ZodError, Prisma, unknown) to JSON. */
export function handleError(error: unknown): NextResponse {
  if (error instanceof ApiException) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ message, issues: error.issues }, { status: 422 });
  }
  // Prisma unique-constraint violation.
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return NextResponse.json(
      { message: "A record with these details already exists" },
      { status: 409 },
    );
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ message }, { status: 500 });
}
