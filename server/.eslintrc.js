// D:\code debugger\server\.eslintrc.js

const globals = require('globals');
// const eslintPluginReact = require('eslint-plugin-react'); // <-- Is line ko DELETE kar do

module.exports = [
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        // ...globals.browser // Agar browser globals bhi chahiye
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "warn",
      "semi": ["error", "always"],
      "indent": ["error", 4, { "SwitchCase": 1 }],
      "quotes": ["error", "single"],
    },
  },
  {
    ignores: ["node_modules/", "client/", "build/", "dist/"]
  }
];