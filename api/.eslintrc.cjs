/**
 * @file api/.eslintrc.cjs
 * @description ESLint config for Vercel serverless functions.
 *   Same strict rules as the rest of the monorepo.
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
    'no-console': 'off', // serverless functions use console for logging
    '@typescript-eslint/no-non-null-assertion': 'error',
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
  ignorePatterns: ['dist', 'node_modules'],
};
