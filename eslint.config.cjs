module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
];
