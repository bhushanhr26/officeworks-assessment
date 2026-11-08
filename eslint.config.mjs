import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Enforces CLAUDE.md hard constraint: Fake Store is only referenced inside its adapter.
const noFakeStore = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/fakestoreapi/i], TemplateElement[value.raw=/fakestoreapi/i]',
      message: 'Fake Store may only be referenced in apps/api/src/adapters/fakestore/.',
    },
  ],
};

function restrictImports(group, message) {
  return { 'no-restricted-imports': ['error', { patterns: [{ group, message }] }] };
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/**/*.ts', 'apps/api/src/**/*.ts'],
    ignores: ['apps/api/src/adapters/fakestore/**'],
    rules: noFakeStore,
  },
  // Ports & adapters, enforced: only the composition root (server.ts) may import adapters.
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: [
      'apps/api/src/adapters/**',
      'apps/api/src/server.ts',
      'apps/api/src/**/*.test.ts',
      'apps/api/src/test/**',
    ],
    rules: restrictImports(
      ['**/adapters/**'],
      'Depend on ports in domain/. Only server.ts (composition root) may import adapters.',
    ),
  },
  {
    files: ['apps/api/src/adapters/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: restrictImports(
      ['**/services/**', '**/routes/**', '**/http/**'],
      'Adapters implement ports; they must not depend on services, routes or HTTP.',
    ),
  },
  {
    files: ['apps/api/src/domain/**/*.ts'],
    rules: restrictImports(
      ['**/services/**', '**/routes/**', '**/http/**', '**/adapters/**', 'express'],
      'domain/ is the innermost layer and depends on nothing outward.',
    ),
  },
  // The web app talks to OUR API only through src/api/client.ts.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/api/client.ts', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Only apps/web/src/api/client.ts may call fetch.' },
      ],
    },
  },
  prettier,
);
