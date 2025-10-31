import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";

import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/node_modules", "**/dist", "**/out"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      eslintPluginReact.configs.flat.recommended,
      eslintPluginReact.configs.flat["jsx-runtime"],
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,

      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "quote-props": ["error", "as-needed"],
      // "no-unused-vars": "warn",
      // "@typescript-eslint/no-unused-vars": "warn",
      // "@typescript-eslint/no-explicit-any": "warn",
      // "@typescript-eslint/no-unsafe-assignment": "warn",
      // "@typescript-eslint/no-unsafe-member-access": "warn",
      // "@typescript-eslint/no-unsafe-call": "warn",
      // "@typescript-eslint/no-unsafe-return": "warn",
      // "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
  eslintConfigPrettier,
]);

// export default tseslint.config({
//   ignores: ['**/node_modules', '**/dist', '**/out'],
//   extends: [
//     tseslint.configs.recommended,
//     eslintPluginReact.configs.flat.recommended,
//     eslintPluginReact.configs.flat['jsx-runtime']
//   ],
//   settings: {
//     react: {
//       version: 'detect'
//     }
//   },
//   files: ['**/*.{ts,tsx}'],
//   plugins: {
//     'react-hooks': eslintPluginReactHooks,
//     'react-refresh': eslintPluginReactRefresh
//   },
//   rules: {
//     ...eslintPluginReactHooks.configs.recommended.rules,
//     ...eslintPluginReactRefresh.configs.vite.rules
//   },
//   eslintConfigPrettier
// })
