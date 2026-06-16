const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/tsconfig.tsbuildinfo"
    ]
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...js.configs.recommended.languageOptions?.globals,
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly"
      }
    }
  },
  {
    files: ["services/api/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./services/api/tsconfig.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: ["apps/admin-web/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./apps/admin-web/tsconfig.json"],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true
        },
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
