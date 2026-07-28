import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
      "no-useless-assignment": "off",
      "no-empty": "warn",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.property.name='req'][callee.property.name='json']",
          message: "Use zValidator instead of req.json() for request parsing."
        },
        {
          selector: "CallExpression[callee.object.property.name='req'][callee.property.name='parseBody']",
          message: "Use zValidator instead of req.parseBody() for request parsing."
        },
        {
          selector: "ImportExpression[source.value=/admin-api/]",
          message: "Dynamic cross-app imports from admin-api into public-api are strictly forbidden."
        },
        {
          selector: "TSImportType[argument.value=/admin-api/], TSImportType[source.value=/admin-api/]",
          message: "Inline type cross-app imports from admin-api into public-api are strictly forbidden."
        },
        {
          selector: "CallExpression[callee.name='require'][arguments.0.value=/admin-api/]",
          message: "Cross-app require statements from admin-api into public-api are strictly forbidden."
        }
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "*admin-api*",
                "*admin-api*/**",
                "**/admin-api/**",
                "**/admin-api"
              ],
              message: "Cross-app imports from admin-api into public-api are strictly forbidden."
            }
          ]
        }
      ]
    }
  }
);
