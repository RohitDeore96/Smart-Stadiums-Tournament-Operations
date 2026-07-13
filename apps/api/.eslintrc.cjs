/**
 * @file apps/api/.eslintrc.cjs
 * @description API workspace ESLint config. Extends the root flat config
 *   via inheritance in pnpm workspace scripts. Adds Node-specific rules.
 */

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  env: { node: true, es2022: true },
  rules: {
    // Node-specific
    'no-process-exit': 'off', // we exit on boot errors (legitimate)
    '@typescript-eslint/no-non-null-assertion': 'error',
    // Fastify plugin functions are async by convention (return Promise<void>)
    // even when their body has no top-level await.
    '@typescript-eslint/require-await': 'off',
    // We use the admin namespace import for firebase-admin types
    '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    // Firebase Admin types are tricky — `??` is defensive even when TS thinks it's unnecessary
    '@typescript-eslint/no-unnecessary-condition': 'off',
    // Fastify route handlers return Promise — disable the void-return check
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
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
};
