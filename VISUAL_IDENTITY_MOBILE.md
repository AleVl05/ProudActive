# Identidad Visual — Proudactive Mobile

O MAIS IMPORTANTE É QUE VOCE SEMPRE CHEQUE QUE SEU NOVO CODIGO NÃO QUEBRE NADA ANTIGO, INPUTS OU ESTILOS QUE JÁ FUNCIONAVAM, SEMPRE

> 🇪🇸 **IDIOMA DEL PROYECTO:**
> - **Código:** Siempre en inglés (variables, funciones, clases)
> - **Comentarios en código:** Español
> - **Documentación:** Español

## Reglas Generales

- Comentarios solo en bloques complejos, explicando el porqué.
- Evitar emojis en el código (no agregar nuevos).
- No hardcodear colores: usar `constants/theme.ts` siempre.

## 🎨 Colores Oficiales

**Primario (brand):** `#6b53e2`  
**Texto:** `#11181C`  
**Fondo:** `#FFFFFF`  
**Iconos neutros:** `#687076`

**Fuente de verdad:** `MOBILE/ProudactiveMobile/constants/theme.ts`

## 🧩 Tipografías

Actualmente se usan fuentes del sistema (ver `Fonts` en `constants/theme.ts`).  
Regla: no introducir nuevas familias sin definirlas en `constants/theme.ts`.

## 📐 Tamaños de Texto

- Evitar tamaños diminutos (`< 12`).
- Para labels y textos secundarios, usar 12-14 como mínimo.
- Títulos principales: 20-28 (según pantalla).

## 🔘 Botones

- Botón primario: usar `Colors.light.tint` como fondo.
- Texto de botón: blanco.
- Border radius consistente (8-12).
- No usar grises como botón principal.

## 🧾 Formularios e Inputs

- Labels claros, sin abreviaciones confusas.
- Inputs con alto mínimo 44-50.
- Estados de error deben ser visibles (color de alerta).

## ♻️ Consistencia

- Mantener alineaciones y spacing uniformes.
- Evitar mezclar estilos inline con StyleSheet sin necesidad.

## ✅ Checklist rápido (antes de enviar)

- [ ] ¿Usé `Colors` del theme y no colores sueltos?
- [ ] ¿No rompí un layout existente?
- [ ] ¿Texto legible en móvil?
