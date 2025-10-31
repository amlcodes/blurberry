import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
// import { defineConfig } from 'electron-vite'
import { defineConfig } from "eslint/config";

export default defineConfig({
  ignores: ['**/node_modules', '**/dist', '**/out'],
  extends: [
    tseslint.configs.recommended,
    eslintPluginReact.configs.flat.recommended,
    eslintPluginReact.configs.flat['jsx-runtime']
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  files: ['**/*.{ts,tsx}'],
  plugins: {
    'react-hooks': eslintPluginReactHooks,
    'react-refresh': eslintPluginReactRefresh
  },
  rules: {
    ...eslintPluginReactHooks.configs.recommended.rules,
    ...eslintPluginReactRefresh.configs.vite.rules,
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'quote-props': ['error', 'as-needed'],
    'quote-props': ['error', 'as-needed'],
  },
  ...eslintConfigPrettier
})

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
