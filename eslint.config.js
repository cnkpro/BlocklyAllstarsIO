var globals = require("globals");
var js = require("@eslint/js");

module.exports = [
  {
    ignores: ["public/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2015,
      sourceType: "commonjs",
      globals: Object.assign({}, globals.node, globals.browser, {$: "readonly"})
    },
    rules: {
      //The code base reuses "var" names and keeps unused parameters for documentation.
      "no-redeclare": "off",
      "no-unused-vars": ["warn", {args: "none", caughtErrors: "none"}]
    }
  }
];
