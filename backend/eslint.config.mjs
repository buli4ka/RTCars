// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // ── Ignored paths ────────────────────────────────────────────────────────────
  {
    name: 'app/ignores',
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },

  // ── Main config ──────────────────────────────────────────────────────────────
  {
    name: 'app/main',

    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintPluginPrettierRecommended,
    ],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      import: importPlugin,
      unicorn,
    },

    rules: {
      // ── TypeScript ────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',     // too verbose for controllers
      '@typescript-eslint/no-extraneous-class': 'off',               // NestJS modules/services are classes by design
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',

      // ── Imports ───────────────────────────────────────────────────────────
      'import/no-duplicates': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'warn',

      // ── Unicorn ───────────────────────────────────────────────────────────
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/prefer-module': 'off',         // NestJS uses CJS
      'unicorn/no-null': 'off',               // Prisma uses null heavily
      'unicorn/prevent-abbreviations': 'off', // dto, req, res are fine in NestJS

      // ── Spacing / blank lines ─────────────────────────────────────────────
      'padding-line-between-statements': [
        'error',
        // Blank line before return — skip only when return follows a closing block
        { blankLine: 'always', prev: '*',          next: 'return' },
        { blankLine: 'any',    prev: 'block-like', next: 'return' },
        // Blank line before/after control-flow blocks
        { blankLine: 'always', prev: '*',                                      next: ['if', 'for', 'while', 'switch', 'try', 'throw'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },
        // Consecutive declarations may stay grouped
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],

      // ── Magic numbers ─────────────────────────────────────────────────────
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],              // idiomatic: array indices, loop steps, comparisons
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          ignoreReadonlyClassProperties: true,
          enforceConst: true,
        },
      ],

      // ── General ───────────────────────────────────────────────────────────
      'no-console': 'error',
      'no-debugger': 'error',
      'no-return-await': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'object-shorthand': 'error',
      'no-nested-ternary': 'error',

      // ── Prettier ──────────────────────────────────────────────────────────
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // ── Spec files ───────────────────────────────────────────────────────────────
  {
    name: 'app/specs',
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-magic-numbers': 'off',
    },
  },

  // ── Constants files ───────────────────────────────────────────────────────────
  {
    name: 'app/constants',
    files: ['**/*.constants.ts'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },
]);
