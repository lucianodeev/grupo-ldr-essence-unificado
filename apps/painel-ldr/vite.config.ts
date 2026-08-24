// Configuração híbrida Lovable + Netlify.
// - No Lovable, preserva o comportamento original do projeto.
// - Na Netlify, desativa o target Nitro/Cloudflare do wrapper Lovable e usa
//   o adaptador oficial @netlify/vite-plugin-tanstack-start.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

const isNetlify = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";

export default defineConfig({
  tanstackStart: {
    // Mantém o wrapper de erros SSR já utilizado pelo projeto.
    server: { entry: "server" },
  },
  // O wrapper Lovable usa Nitro/Cloudflare por padrão em build. Na Netlify,
  // o plugin oficial deve ser o único adaptador de deploy.
  nitro: isNetlify ? false : undefined,
  vite: isNetlify
    ? {
        plugins: [netlify()],
      }
    : {},
});
