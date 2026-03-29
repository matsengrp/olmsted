import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

// Custom local rule
const maxExportedClassesRule = await import("./eslint-rules/max-exported-classes-per-file.js");

export default [
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: ["node_modules/**", "_deploy/**", "dist/**", "devel/**", "data/**", "s3-current/**", "_ignore/**", "dev-server.js"]
  },

  // Extend airbnb + prettier using FlatCompat
  ...compat.extends("airbnb", "prettier"),

  // Main config
  {
    languageOptions: {
      parser: (await import("@babel/eslint-parser")).default,
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
          modules: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020
      }
    },
    plugins: {
      local: {
        rules: {
          "max-exported-classes-per-file": maxExportedClassesRule.default || maxExportedClassesRule
        }
      }
    },
    rules: {
      "camelcase": "off",
      "prefer-template": "off",
      "object-shorthand": "off",
      "quotes": "off",
      "max-len": "off",
      "no-mixed-operators": "off",
      "no-confusing-arrow": "off",
      "no-useless-constructor": "off",
      "no-nested-ternary": "off",
      "object-curly-spacing": "off",
      "block-spacing": "off",
      "dot-notation": "off",
      "comma-dangle": ["error", "never"],
      "padded-blocks": "off",
      "no-plusplus": "off",
      "arrow-body-style": "off",
      "arrow-parens": ["error", "always"],
      "no-case-declarations": "off",
      "one-var": "off",
      "one-var-declaration-per-line": "off",
      "no-console": [1, { allow: ["warn", "error"] }],
      "space-infix-ops": "off",
      "no-param-reassign": [1, { props: false }],
      "no-underscore-dangle": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-unused-expressions": ["error", { allowTernary: true }],
      "no-restricted-syntax": ["error", "ForInStatement", "WithStatement"],
      "class-methods-use-this": "off",
      "react/jsx-tag-spacing": ["error", { closingSlash: "never", beforeSelfClosing: "allow", afterOpening: "never" }],
      "react/forbid-prop-types": "off",
      "react/jsx-filename-extension": [1, { extensions: [".js", ".jsx"] }],
      "react/jsx-first-prop-new-line": "off",
      "react/no-did-mount-set-state": "off",
      "react/no-did-update-set-state": "off",
      "react/prop-types": "off",
      "react/sort-comp": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "react/destructuring-assignment": "off",
      "react/no-access-state-in-setstate": "off",
      "react/static-property-placement": "off",
      "react/jsx-props-no-spreading": "off",
      "react/jsx-no-constructed-context-values": "off",
      "react/prefer-stateless-function": "off",
      "react/no-unused-class-component-methods": "off",
      "prefer-destructuring": "off",
      "no-await-in-loop": "off",
      "import/prefer-default-export": "off",
      "no-labels": "off",
      "no-continue": "off",
      "no-unneeded-ternary": ["error", { defaultAssignment: true }],
      "quote-props": ["error", "as-needed"],
      "prefer-const": ["error", { destructuring: "all" }],
      "max-classes-per-file": "off",
      "local/max-exported-classes-per-file": ["error", 1]
    }
  },

  // Test file overrides
  {
    files: ["**/__tests__/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];
