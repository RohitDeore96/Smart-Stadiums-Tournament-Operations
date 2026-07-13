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
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
      // Fastify plugin functions are async by convention (return Promise<void>)
      // even when their body has no top-level await.
      '@typescript-eslint/require-await': 'off',
      // Firebase Admin SDK types are tricky — `??` is defensive even when TS thinks it's unnecessary
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Generic single-use type params are common in cache wrappers
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
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

  // -------- Route files: Fastify's preHandler type doesn't play nice with
  //         no-misused-promises. Disable it for route definitions. --------
  {
    files: ['**/src/routes/**/*.ts'],
    rules: {
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },

  // -------- Vercel serverless functions: console.log is the standard
  //         logging mechanism (no pino in serverless for size) --------
  {
    files: ['api/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
    },
  },
);
