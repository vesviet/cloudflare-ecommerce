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
        }
      ]
    }
  }
);
