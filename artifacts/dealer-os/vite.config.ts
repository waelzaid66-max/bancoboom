import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT/BASE_PATH are dev-server / deploy concerns, NOT build inputs. A production
// `vite build` must succeed with neither set (CI, a fresh clone, any host), so we
// only *require* PORT when actually serving (command === "serve") and fall back
// to "/" for the base path during a build. The dev server stays strict because
// Replit injects the exact PORT it expects us to bind (strictPort).
export default defineConfig(async ({ command }) => {
  const rawPort = process.env.PORT;
  let port = 5173;
  if (command === "serve") {
    if (!rawPort) {
      throw new Error("PORT environment variable is required but was not provided.");
    }
    const parsed = Number(rawPort);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
    port = parsed;
  } else if (rawPort) {
    const parsed = Number(rawPort);
    if (!Number.isNaN(parsed) && parsed > 0) port = parsed;
  }

  const basePath = process.env.BASE_PATH ?? "/";

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss({ optimize: false }),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
