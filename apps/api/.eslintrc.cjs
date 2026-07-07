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
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
};
