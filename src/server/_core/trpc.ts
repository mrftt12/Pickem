import { initTRPC, TRPCError } from "@trpc/server";

export type UserRole = "user" | "admin";

export interface SessionUser {
  id: number;
  openId: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
}

export interface SessionCookieOptions {
  domain?: string;
  httpOnly?: boolean;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  maxAge?: number;
}

export interface SessionRequest {
  headers: Record<string, string | string[] | undefined>;
  protocol?: string;
}

export interface SessionResponse {
  clearCookie(name: string, options?: SessionCookieOptions): void;
}

export interface Context {
  req: SessionRequest;
  res: SessionResponse;
  user?: SessionUser;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
