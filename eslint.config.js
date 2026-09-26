// ESLint — SÓLO LAS REGLAS QUE ATRAPAN LO QUE EL TYPECHECK NO VE.
//
// ── POR QUÉ EXISTE ESTE ARCHIVO ────────────────────────────────────────────────
// `tsc --noEmit` corre con `checkJs` sobre `engine`, `constants` y `lib`: el núcleo de
// cálculo. Los componentes quedan afuera a propósito (docs/tipado.md explica por qué:
// tiparlos daba 461 errores de props de React y ninguno era un defecto real). El agujero
// que eso deja es concreto y ya se materializó: en `SitioTab` se usaron `Divisor` y `t`
// sin importarlos, el build pasó limpio y la pantalla explotaba recién al abrirla.
//
// Por eso la configuración es DELIBERADAMENTE CHICA. No se activan los conjuntos
// `recommended`: un linter que tira doscientas advertencias de estilo se termina
// ignorando, y con él se ignoran las tres que importan. Son éstas:
//
//   · no-undef ................... identificador usado y nunca declarado ni importado
//   · react/jsx-no-undef ......... lo mismo para un componente en JSX, que `no-undef` no
//                                  ve porque no entiende los nombres de elemento
//   · react-hooks/rules-of-hooks . un hook dentro de un if o de un loop, que rompe el
//                                  orden de hooks y da errores que no señalan la causa
//
// Si más adelante conviene sumar reglas, que sea de a una y con el motivo escrito.
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  {
    files: ["src/**/*.{js,jsx}", "tests/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    rules: {
      // De `js.configs.recommended` se toma UNA sola regla, a propósito.
      "no-undef": "error",
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // Los tests corren en vitest, que inyecta sus propios globales aunque acá se importen
    // explícitamente. `process` lo usa algún helper.
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
