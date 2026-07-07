/**
 * Root ESLint flat config for the StadiumOps AI monorepo.
 *
 * Each workspace (apps/api, apps/web, packages/shared) extends this and adds
 * its own specifics. Run `pnpm lint` from the root to lint everything.
 *
 * Philosophy: strict by default, opt-out only with a written justification
 * comment next to the disable directive.
 */

// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // -------- Global ignores --------
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.firebase/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
    ],
  },

  // -------- Base JS rules --------
  js.configs.recommended,

  // -------- TypeScript rules (strict) --------
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // -------- Shared rules for all TS files --------
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Enforce code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // handled by @typescript-eslint
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Style (kept light — Prettier handles formatting)
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // -------- Allow dev dependencies in config files --------
  {
    files: ['**/*.config.{ts,js,mjs,cjs}', '**/scripts/**'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },
);
