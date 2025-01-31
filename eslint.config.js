import base from '@automatta/style-guide/eslint/base';

export default [
  ...base,
  {
    ignores: ['**/dist/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: './tsconfig.eslint.json',
      },
    },
  },
];
