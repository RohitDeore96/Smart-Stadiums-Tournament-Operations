/**
 * @file apps/web/.eslintrc.cjs
 * @description Web workspace ESLint config. Adds React + a11y rules.
 */

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:jsx-a11y/recommended',
  ],
  env: { browser: true, es2022: true },
  rules: {
    // React-specific (no eslint-plugin-react yet — add in Phase 3)
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
};
