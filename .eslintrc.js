/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.json'], // optional but helps with some rules
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic',
    'prettier',
  ],
  rules: {
    // CORE
    'no-console': 'warn',
    'no-empty-function': 'off',

    // TS RULES — STRONG OPINIONS
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: false }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/promise-function-async': 'warn',
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          '{}': false, // allow empty objects
        },
        extendDefaults: true,
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
