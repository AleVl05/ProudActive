# Plan Unificado de Internacionalización (i18n + l10n) — Proudactive

> Objetivo: Soportar ES y PT-BR (base), con moneda y formatos dinámicos por país, sin romper el sistema.

LO MAS IMPORTANTE ES NO ROMPER NINGUNA FUNCION EXISTENTE. La internacionalización debe ser gradual y segura.

IMPORTANTE: NADA DE SIMBOLOS RAROS. TODOS LOS ARCHIVOS DEBEN ESTAR EN UTF-8 SIN BOM.

---

## 1) Capas

1. **i18n (Idioma)**: traducción de textos a ES y PT-BR.
2. **l10n (Localización)**: moneda, números y fechas según país del usuario.

---

## 2) Reglas base

- Nunca dejar strings hardcodeadas en UI.
- Todo texto nuevo debe ir a archivos de locales.
- Moneda y fechas siempre formateadas por helper (no `R$`, no `number_format` directo).

---

## 3) MOBILE (React Native)

**Estructura sugerida:**
```
MOBILE/ProudactiveMobile/locales/
  es/
  pt-BR/
```

**Reglas:**
- Usar `i18next` o equivalente.
- Texto en componentes siempre por key.

---

## 4) WEB (React/Vite)

**Estructura sugerida:**
```
WEB/src/locales/
  es/
  pt-BR/
```

**Reglas:**
- Centralizar traducciones en JSON.
- No dejar strings en JSX sin traducir.

---

## 5) l10n (Moneda/Fechas)

- Moneda por país/usuario.
- Formatear con `Intl.NumberFormat`.
- Fechas con `Intl.DateTimeFormat`.

---

## 6) Checklist de implementación

- [ ] Strings movidas a locales
- [ ] Moneda formateada por helper
- [ ] Fechas con `Intl`
- [ ] JSON en UTF-8 sin BOM

