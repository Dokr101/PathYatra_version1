import babelParser from '@babel/eslint-parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/**
 * Lint policy, frontend: React hooks dependencies and Fast Refresh boundaries.
 * `react-hooks/exhaustive-deps` is an error so a stale closure cannot be
 * silenced with a comment, and `react-refresh/only-export-components` warns when
 * a module mixes components with other exports (which breaks hot reload).
 *
 * Parsing goes through Babel rather than typescript-eslint because the project
 * is on TypeScript 7, which typescript-eslint refuses to load. Babel only has
 * to build the AST these rules inspect; nothing is emitted.
 *
 * Lint policy, backend: the logic-safety rules TypeScript does not check
 * (`==` vs `===`, unreachable code, fallthrough, self-assignment). `no-undef`
 * and `no-unused-vars` are deliberately absent: a non-type-aware parser cannot
 * tell a type-only reference from an unused binding, and `tsc` already covers
 * both. `@typescript-eslint` would be the natural home for all of this; it
 * becomes available once the project leaves TypeScript 7.
 */
const hooksRules = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
}

const backendRules = {
  eqeqeq: ['error', 'smart'],
  'no-var': 'error',
  'prefer-const': ['error', { destructuring: 'all' }],
  'no-unreachable': 'error',
  'no-fallthrough': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-else-if': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-async-promise-executor': 'error',
  'no-unsafe-finally': 'error',
  'no-constant-binary-expression': 'error',
  'no-useless-escape': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
}

const typescript = { presets: ['@babel/preset-typescript'] }

function sourceBlock(files, { babelOptions, plugins, rules }) {
  return {
    files,
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        babelOptions,
      },
    },
    plugins,
    rules,
  }
}

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'backend/node_modules/**',
      'backend/dist/**',
      'scripts/**',
      'coverage/**',
    ],
  },
  // JSX is only enabled for .tsx: in a .ts file `<T>` is a type parameter, not
  // the start of a JSX tag.
  sourceBlock(['src/**/*.tsx'], {
    babelOptions: { ...typescript, parserOpts: { plugins: ['jsx'] } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: { ...hooksRules, 'react-refresh/only-export-components': 'warn' },
  }),
  sourceBlock(['src/**/*.ts'], {
    babelOptions: typescript,
    plugins: { 'react-hooks': reactHooks },
    rules: hooksRules,
  }),
  sourceBlock(['backend/src/**/*.ts'], {
    babelOptions: typescript,
    plugins: {},
    rules: backendRules,
  }),
]
