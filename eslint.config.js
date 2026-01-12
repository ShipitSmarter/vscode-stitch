const tseslint = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: ['lib/**', 'esbuild.js', 'dist/**', 'out/**', 'node_modules/**']
    },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 6,
                sourceType: 'module',
                project: './tsconfig.json'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs['recommended'].rules,
            ...tseslint.configs['recommended-requiring-type-checking'].rules,
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'memberLike',
                    modifiers: ['private'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require'
                },
                {
                    selector: 'memberLike',
                    modifiers: ['protected'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require'
                },
                { 
                    selector: ['memberLike'],
                    format: ['camelCase']
                },
                {
                    selector: ['function'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require'
                },
                {
                    selector: ['function'],
                    modifiers: ['exported'],
                    format: ['camelCase'],
                    leadingUnderscore: 'forbid'
                },
                {
                    selector: 'variable',
                    types: ['boolean'],
                    format: ['PascalCase'],
                    prefix: ['is', 'has', 'can', 'did', 'will']
                }
            ],
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/prefer-promise-reject-errors': 'error',
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/explicit-member-accessibility': ['error'],
            '@typescript-eslint/restrict-template-expressions': 'off',
            'curly': ['error'],
            'eqeqeq': ['error', 'smart'],
            'no-throw-literal': 'error',
            'semi': ['error'],
            'comma-spacing': ['error']
        }
    }
];
