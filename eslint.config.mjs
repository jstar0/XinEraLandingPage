import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "design-exploration/**",
    "next-env.d.ts",
    ".superpowers/**",
  ]),
  {
    files: [
      "app/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
      "components/site/**/*.tsx",
    ],
    rules: {
      // Native navigation enables progressively enhanced cross-document photo transitions.
      "@next/next/no-html-link-for-pages": "off",
      // These art-directed assets share exact geometry/crops with the WebGL scene.
      "@next/next/no-img-element": "off",
    },
  },
]);
