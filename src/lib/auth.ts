import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const getJwtSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-dev-only-change-in-production-32chars"
  );

export const COOKIE_NAME = "__session";

export async function createSession(): Promise<string> {
  return new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export function verifyPassword(input: string): boolean {
  return input === process.env.SECRET;
}

export async function getSession(req?: NextRequest): Promise<boolean> {
  try {
    const token = req
      ? req.cookies.get(COOKIE_NAME)?.value
      : (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return false;
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};
