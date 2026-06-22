import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const COOKIE = "ipa_token";

export function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 10);
}
export function comparePassword(p: string, h: string): Promise<boolean> {
  return bcrypt.compare(p, h);
}
export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}
export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

/** Returns the logged-in user id from the auth cookie, or null. */
export function getUserId(req: NextRequest): string | null {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token)?.id || null;
}
