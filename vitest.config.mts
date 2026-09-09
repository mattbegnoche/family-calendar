import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // `server-only` exists to fail the build if a module reaches the client
      // bundle. That guard is meaningless in a Node test process — and the real
      // package throws on import outside a react-server condition — so it is
      // stubbed here rather than removed from the modules it protects.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
