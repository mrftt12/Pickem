import { createHTTPServer, type CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { serialize } from "cookie";
import { TLSSocket } from "tls";
import { appRouter } from "./api/routers";
import type { Context, SessionCookieOptions } from "./_core/trpc";

const PORT = Number(process.env.PORT ?? 3000);

function createContext({ req, res }: CreateHTTPContextOptions): Context {
  const cookies: string[] = [];

  const clearCookie = (name: string, options?: SessionCookieOptions) => {
    const serialized = serialize(name, "", {
      path: "/",
      ...options,
      maxAge: 0,
    });
    cookies.push(serialized);
    res.setHeader("Set-Cookie", cookies);
  };

  const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const isTls = req.socket instanceof TLSSocket && req.socket.encrypted;
  const protocol = forwardedProto || (isTls ? "https" : "http");

  return {
    req: {
      headers: req.headers,
      protocol,
    },
    res: {
      clearCookie,
    },
  };
}

const server = createHTTPServer({
  router: appRouter,
  createContext,
});

server.listen(PORT, () => {
  console.log(`➜ tRPC server ready on port ${PORT}`);
});
