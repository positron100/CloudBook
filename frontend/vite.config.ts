import { defineConfig } from "vitest/config";
import { loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The backend is a separate Express service (local: http://localhost:5000,
// prod: Render). The app talks to it via the absolute VITE_API_URL, so no dev
// proxy is needed here.

/**
 * Serves the letter-send endpoint during `npm run dev` — same idiom as the
 * Portfolio project's `contactApiDevServer()`. The deployed site gets
 * `/api/contact` from Vercel; the dev server would otherwise 404 it and the
 * letter could only ever be tested in production. This mounts the *same*
 * handler module, so what is exercised locally is the real validation, rate
 * limiting and payload building rather than a stub that can drift from them.
 *
 * Dev only: `configureServer` never runs in a build, and nothing here is
 * reachable from the client bundle.
 */
function contactApiDevServer(): Plugin {
  return {
    name: "contact-api-dev-server",
    configureServer(server) {
      // Vite only exposes `VITE_`-prefixed variables to the client, and puts
      // nothing on `process.env`. The empty prefix loads everything from
      // `.env` for this server-side route only, which is what lets the real
      // credentials stay unprefixed and therefore unreachable from the bundle.
      const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), "") };

      server.middlewares.use("/api/contact", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);

        const { handleContact } = await server.ssrLoadModule("/api/_contact.ts");
        let result;
        try {
          result = await handleContact(
            JSON.parse(Buffer.concat(chunks).toString() || "{}"),
            env,
            req.socket.remoteAddress ?? "dev",
          );
        } catch {
          result = { status: 400, body: { ok: false, error: "Malformed request." } };
        }
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), contactApiDevServer()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "../shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
});
