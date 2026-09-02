import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Participant, Programme } from "./types";

const COOKIE = "sprints_participant";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function secret(): string {
  return process.env.SPRINTS_SESSION_SECRET ?? "sprints-dev-secret-set-SPRINTS_SESSION_SECRET";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(token: string): number | null {
  const [value, signature] = token.split(".");
  if (!value || !signature) return null;
  const expected = sign(value);
  // Signatures are equal-length base64url digests, so a length mismatch means forgery.
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

export async function signIn(participantId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, `${participantId}.${sign(String(participantId))}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in participant, or null. */
export async function currentParticipant(): Promise<Participant | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const id = verify(token);
  if (id === null) return null;
  return (db().prepare("SELECT * FROM participants WHERE id = ?").get(id) as Participant) ?? null;
}

/**
 * The signed-in participant, but only if they belong to `programme`.
 * Someone signed into a different programme is treated as a visitor.
 */
export async function participantIn(programme: Programme): Promise<Participant | null> {
  const me = await currentParticipant();
  return me && me.programme_id === programme.id ? me : null;
}
