import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
    
      // React Rules 
      "react/react-in-jsx-scope": "off",  // React 17+ မှာ import React မလိုတော့လို့ error မတက်အောင် ပိတ်ထားမယ်
      "react/prop-types": "off",          // PropTypes မစစ်ချင်ရင် ပိတ်ထားနိုင်ပါတယ်
      "react/self-closing-comp": "warn",  // အထဲမှာ children မပါတဲ့ tag တွေကို <div /> လို ပိတ်ရေးခိုင်းမယ်
    }
  }
])
