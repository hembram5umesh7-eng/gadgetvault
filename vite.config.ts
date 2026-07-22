import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
        "@launch-template": path.resolve(process.cwd(), "src/launch-template"),
        "@flash-sale-template": path.resolve(process.cwd(), "src/flash-sale-template"),
        "lucide-react": path.resolve(process.cwd(), "node_modules/lucide-react"),
        gsap: path.resolve(process.cwd(), "node_modules/gsap"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
        "gsap",
      ],
    },
    server: {
      host: true,
      port: 8080,
      strictPort: true,
    },
    optimizeDeps: {
      // Avoid stale pre-bundled deps causing 504 "Outdated Optimize Dep" in dev.
      holdUntilCrawlEnd: false,
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "@tanstack/query-core",
        "@supabase/supabase-js",
        "gsap",
        "lucide-react",
      ],
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      nitro({
        routeRules: {
          "/**": {
            headers: {
              "X-Frame-Options": "SAMEORIGIN",
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "strict-origin-when-cross-origin",
              "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
              "X-DNS-Prefetch-Control": "off",
              "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://*.myshopify.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; base-uri 'self'; form-action 'self'",
            },
          },
        },
      }),
      react(),
    ],
  };
});
