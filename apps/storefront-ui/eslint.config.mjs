import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/.next/",
      "**/.next/**",
      "**/node_modules/",
      "**/node_modules/**",
      "**/.turbo/",
      "**/.turbo/**",
      "**/.wrangler/",
      "**/.wrangler/**",
      "**/out/",
      "**/out/**",
      "**/build/",
      "**/build/**",
      "**/*.d.ts"
    ]
  },
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
];
