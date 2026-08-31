import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // 既定の 5 秒は、jsdom + React の初回ウォームアップを含むファイル先頭の
    // テストで足りずに flaky になる。マシン負荷に左右されないよう広めに取る。
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      // tsconfig の "@/*": ["./*"] に合わせる
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` はサーバー実行を示すマーカー。既定の解決先は import されると
      // 必ず throw するので、テスト環境ではパッケージが持つ空実装へ差し替える。
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
