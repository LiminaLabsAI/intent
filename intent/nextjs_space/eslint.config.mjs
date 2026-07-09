import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**"
    ]
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  {
    languageOptions: {
      globals: {
        React: "writable",
        JSX: "readonly",
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        URL: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-sync-scripts": "off",
      "no-empty": "off",
      "no-undef": "off"
    }
  }
];
