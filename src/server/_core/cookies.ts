import type { SessionCookieOptions, SessionRequest } from "./trpc";

export function getSessionCookieOptions(req: SessionRequest): SessionCookieOptions {
  const secure = (req.protocol ?? "http").toLowerCase() === "https";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  };
}
