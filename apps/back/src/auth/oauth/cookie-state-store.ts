import { randomBytes } from "crypto";
import type { Request } from "express";
import type { Metadata, StateStore, StateStoreStoreCallback, StateStoreVerifyCallback } from "passport-oauth2";

const STATE_COOKIE = "tau_oauth_state";
/** A consent screen is short-lived; 10 minutes is comfortably enough. */
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Sessionless CSRF protection for the OAuth flow, plugged into passport-oauth2
 * via its `store` option. The library's built-in state store needs
 * express-session; we keep the backend stateless, so instead we round-trip a
 * random nonce through a short-lived, httpOnly, SameSite=Lax cookie and compare
 * it to the `state` the provider echoes back. An attacker can neither read nor
 * set this cookie, so they can't forge a matching state — which is what blocks
 * login CSRF (a victim being silently signed into the attacker's account).
 */
export class CookieStateStore implements StateStore {
  /** Request phase: mint a nonce, drop it in a cookie, send it as `state`. */
  store(req: Request, metaOrCb: Metadata | StateStoreStoreCallback, cb?: StateStoreStoreCallback) {
    const callback = (cb ?? metaOrCb) as StateStoreStoreCallback;
    const state = randomBytes(16).toString("hex");
    req.res?.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: STATE_TTL_MS,
      path: "/",
    });
    callback(null, state);
  }

  /** Callback phase: the cookie must match the `state` the provider returned. */
  verify(
    req: Request,
    providedState: string,
    metaOrCb: Metadata | StateStoreVerifyCallback,
    cb?: StateStoreVerifyCallback,
  ) {
    const callback = (cb ?? metaOrCb) as StateStoreVerifyCallback;
    const expected = readCookie(req, STATE_COOKIE);
    req.res?.clearCookie(STATE_COOKIE, { path: "/" });
    if (!expected || !providedState || expected !== providedState) {
      return callback(null, false, { message: "Invalid OAuth state" });
    }
    callback(null, true, undefined);
  }
}

const readCookie = (req: Request, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
};
