import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

export default tseslint.config(
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react': reactPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.plugin.configs['recommended'].rules,
      ...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
      ...reactPlugin.configs.recommended.rules,
      'indent': ['error', 2],
      'linebreak-style': ['error', 'windows'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
); 