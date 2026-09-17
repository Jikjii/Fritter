// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*'],
  },
  {
    // Node scripts and Jest setup run outside the app bundle.
    files: ['scripts/**/*.js', 'jest.setup.js', 'babel.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    // Service adapters lazy-require optional native modules so the app runs in Expo Go / web / CI.
    files: ['src/services/**/*.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
