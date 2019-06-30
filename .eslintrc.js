module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:security/recommended',
        'plugin:react/recommended',
        'plugin:prettier/recommended',
        'prettier',
        'prettier/@typescript-eslint',
        'prettier/react',
    ],
    env: {
        es6: true,
        browser: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'security', 'react', 'react-hooks', 'prettier'],
    parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // Disabled
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Since it is checked by TypeScript compiler
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/camelcase': 'off', // Due to vimwasm_* C APIs
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off', // false positive at array index accesses
        'react/prop-types': 'off', // Props are checked by TypeScript statically

        // Enabled
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': 'error', // Checks effect dependencies

        // Configured
        '@typescript-eslint/array-type': ['error', 'array-simple'],
        'no-constant-condition': ['error', { checkLoops: false }],
    },
    overrides: [
        {
            files: ['index.tsx'],
            rules: {
                'no-console': 'error',
            },
        },
    ],
};
