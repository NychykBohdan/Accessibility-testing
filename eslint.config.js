import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'node_modules/',
    'reports/',
    'playwright-report/',
    'test-results/',
    'blob-report/',
    'site/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-focused-test': 'error',
      // Conditional skips (e.g. browser-specific behaviour) are intentional and always carry a reason.
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      // a11yScan asserts internally (fails on new critical/serious violations).
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['a11yScan'] }],
    },
  },
  prettier,
]);
