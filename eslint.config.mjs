// Next 16 removed the `next lint` CLI command; ESLint 9 defaults to flat
// config. `eslint-config-next`'s default export is already a flat-config
// array (not an eslintrc-shaped object), so no `FlatCompat` shim is needed —
// this is a straight replacement for the old `.eslintrc.json`.
import nextConfig from "eslint-config-next"

const config = [
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]

export default config
