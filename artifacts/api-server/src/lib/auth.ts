import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, sessionsTable, usersTable, type PublicUser } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { type Request, type Response } from 'express';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SALT_ROUNDS = 12;

export interface SessionData {
  userId: string;
}

export function toPublicUser(user: typeof usersTable.$inferSelect): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const sid = crypto.randomBytes(32).toString('hex');
  await db.insert(sessionsTable).values({
    sid,
    sess: { userId } satisfies SessionData,
    expire: new Date(Date.now() + SESSION_TTL_MS),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db.select().from(sessionsTable).where(eq(sessionsTable.sid, sid));
  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }
  return row.sess as unknown as SessionData;
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  const rows = await db.select().from(sessionsTable);
  const toDelete = rows.filter((r) => (r.sess as unknown as SessionData)?.userId === userId);
  await Promise.all(toDelete.map((r) => deleteSession(r.sid)));
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

const isSecureCookies = process.env.COOKIE_SECURE === 'true';

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: isSecureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()));
  return user ?? null;
}

export async function countUsers(): Promise<number> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable);
  return rows.length;
}
