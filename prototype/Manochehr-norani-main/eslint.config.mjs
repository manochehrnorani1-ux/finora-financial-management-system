import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Existing client-side persistence patterns use effects to hydrate state.
      // Keep the production lint gate focused on actionable application errors.
      "react-hooks/set-state-in-effect": "off",
      // Some legacy form helpers are declared inside render functions.
      "react-hooks/static-components": "off",
      // Compliance report identifiers are generated from runtime values.
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",
  ]),
]);
