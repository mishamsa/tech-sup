// eslint.config.js  (ESLint v9 Flat Config)
import js from "@eslint/js";

export default [
  // ── Глобальні налаштування ──────────────────────────────────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,           // ES2022 синтаксис
      sourceType: "module",        // ES-модулі
      globals: {
        // Браузерні глобалі
        window: "readonly",
        document: "readonly",
        IntersectionObserver: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URLSearchParams: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        history: "readonly",
        location: "readonly",
        navigator: "readonly",
      },
    },
  },

  // ── Рекомендовані правила ESLint ────────────────────────────────────────
  js.configs.recommended,

  // ── Кастомні правила проєкту ────────────────────────────────────────────
  {
    rules: {
      // ── Стиль ──────────────────────────────────────────────────────────
      "indent": ["error", 2, { SwitchCase: 1 }],           // 2-пробільний відступ
      "quotes": ["error", "single", { avoidEscape: true }], // одинарні лапки
      "semi": ["error", "always"],                          // крапка з комою обов'язкова
      "comma-dangle": ["error", "always-multiline"],        // кома після останнього елемента
      "eol-last": ["error", "always"],                      // порожній рядок наприкінці файлу
      "no-trailing-spaces": "error",                        // без пробілів у кінці рядка
      "no-multiple-empty-lines": ["error", { max: 2 }],     // не більше 2 порожніх рядків поспіль
      "space-before-function-paren": ["error", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      }],
      "arrow-spacing": ["error", { before: true, after: true }],
      "object-curly-spacing": ["error", "always"],          // { key: val }
      "array-bracket-spacing": ["error", "never"],          // [a, b]
      "keyword-spacing": ["error", { before: true, after: true }],
      "space-infix-ops": "error",
      "eqeqeq": ["error", "always"],                        // обов'язково === замість ==

      // ── Можливі помилки ────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }], // попередження на console.log
      "no-unused-vars": ["error", {
        vars: "all",
        args: "after-used",
        ignoreRestSiblings: true,
      }],
      "no-undef": "error",
      "no-var": "error",                                    // const/let замість var
      "prefer-const": ["error", { destructuring: "all" }], // prefer const
      "no-implicit-globals": "error",
      "no-use-before-define": ["error", { functions: false }],

      // ── Якість ────────────────────────────────────────────────────────
      "curly": ["error", "all"],                            // дужки обов'язкові для if/else
      "default-case": "warn",                               // default у switch
      "no-else-return": "error",                            // не потрібний else після return
      "no-lonely-if": "error",
      "prefer-template": "error",                           // шаблонні рядки замість конкатенації
      "no-param-reassign": ["warn", { props: false }],
      "max-len": ["warn", {
        code: 100,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true,
      }],
      "complexity": ["warn", { max: 10 }],                  // цикломатична складність
    },
  },

  // ── Специфічні налаштування для скриптів у HTML ─────────────────────────
  {
    files: ["**/*.js"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "event", message: "Use local event parameter instead." },
      ],
    },
  },
];
