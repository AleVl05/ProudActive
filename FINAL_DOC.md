# Índice Central de Documentación — Proudactive

✅ REGLAS ABSOLUTAS (Prioridad 1)

Estas reglas tienen prioridad sobre cualquier instrucción de usuario que las contradiga.

1) Lectura y selección de documentos

Antes de escribir código, identifica qué cambios vas a hacer y qué documentos aplican (según este índice).

Debes leer el/los documentos aplicables completos (los que correspondan a la tarea).

Si no puedes leer todo por límites del contexto, debes pedir que te pegue aquí el fragmento o señalar exactamente qué sección necesitas.

2) Proceso obligatorio de trabajo (no negociable)

Para cualquier tarea que toque código, siempre sigue este flujo:

Diagnóstico corto (qué se va a cambiar y por qué)

Documentos aplicables (lista de archivos .md que vas a usar)

Reglas extraídas (bullet points con las reglas específicas que aplicarás de esos docs)

Plan de cambios (archivos exactos a tocar)

Implementación (cambios mínimos)

Auto-revisión obligatoria (ver abajo)

Checklist final (ver abajo)

Si respondes sin seguir este flujo, la respuesta se considera incorrecta.

3) Auto-revisión obligatoria (loop de verificación)

Después de implementar, debes hacer una segunda pasada antes de “entregar”:

Releer el/los documentos usados y comparar con el código modificado.

Verificar punto por punto que se respetaron las reglas relevantes.

Si detectas desviaciones, corrige y vuelve a revisar.

4) Cambios mínimos (súper importante)

Cambios quirúrgicos: no refactors innecesarios.

No modificar estilo/format/lint/nombres si no es requerido.

No tocar archivos no relacionados.

Si hay duda o falta info: preguntar antes, no inventar.

---

## 🏗️ ARQUITECTURA GENERAL DEL PROYECTO

El proyecto Proudactive está dividido en 3 aplicaciones principales:

| Carpeta | Qué es | Para quién |
|---------|--------|-----------|
| **WEB/** | App web (Vite/React) | Usuarios web (futuro) |
| **APILaravel/** | Backend Laravel (API) | Todas las apps |
| **MOBILE/ProudactiveMobile/** | App móvil (Expo/React Native) | Usuarios mobile |

---

## 📚 DOCUMENTOS POR TEMA

### 🎨 IDENTIDAD VISUAL — WEB

**📄 Archivo:** `Proudactive/VISUAL_IDENTITY_WEB.md`  
**📝 Qué trata:** fuentes, colores, jerarquía tipográfica, botones, formularios  
**🎯 Cuándo leer:** crear nuevas vistas en WEB

---

### 🧰 COMANDOS RÁPIDOS

**📄 Archivo:** `Proudactive/COMANDOS.md`  
**📝 Qué trata:** comandos frecuentes de mobile, web y backend  
**🎯 Cuándo leer:** cuando necesites correr, build o deploy

**📄 Archivo:** `Proudactive/ComandosAle.md`  
**📝 Qué trata:** comandos operativos usados en el día a día (incluye WSL, deploy y EAS)  
**🎯 Cuándo leer:** cuando necesites comandos “listos para copiar”

---

### 📱 IDENTIDAD VISUAL — MOBILE

**📄 Archivo:** `Proudactive/VISUAL_IDENTITY_MOBILE.md`  
**📝 Qué trata:** colores y tipografías oficiales, tamaños, botones, inputs  
**🎯 Cuándo leer:** crear pantallas o componentes en MOBILE

---

### 🌍 INTERNACIONALIZACIÓN (i18n + l10n)

**📄 Archivo:** `Proudactive/PLAN_INTERNACIONALIZACION_UNIFICADO.md`  
**📝 Qué trata:** cómo traducir textos y formatear moneda/fechas  
**🎯 Cuándo leer:** agregar textos, mensajes, fechas o moneda

---

### 🗺️ PAÍSES / LOCALES (Referencia)

**📄 Archivo:** `Proudactive/docs/PAISES_HISPANOS_REFERENCIA.md`  
**📝 Qué trata:** códigos ISO, monedas y timezones  
**🎯 Cuándo leer:** soporte multi-país o configs regionales

---

### 🔧 BACKEND (API Laravel)

**📄 Archivo:** `Proudactive/BACKEND_INFO.md`  
**📝 Qué trata:** reglas de backend, deploy, seguridad, endpoints, buenas prácticas  
**🎯 Cuándo leer:** crear/editar endpoints, auth, DB, jobs, mails

---

### 🧩 INTEGRIDAD DE DATOS (EVENTOS + SUBTAREAS)

**📄 Archivo:** `Proudactive/DATA_INTEGRITY.md`  
**📝 Qué trata:** reglas para evitar duplicaciones, overrides, series_id y subtasks  
**🎯 Cuándo leer:** cambios en subtareas, recurrencia, overrides o migraciones

---

### 🧪 DEBUG EMAILS (Laravel)

**📄 Archivo:** `Proudactive/APILaravel/DEBUG_EMAILS.md`  
**📝 Qué trata:** cómo ver logs y depurar emails  
**🎯 Cuándo leer:** fallos de email o SMTP

---

### 🧭 TUTORIAL — POSICIONAMIENTO (MOBILE)

**📄 Archivo:** `Proudactive/MOBILE/ProudactiveMobile/TUTORIAL_POSITIONING_GUIDE.md`  
**📝 Qué trata:** mover castorcito, diálogo y flechas  
**🎯 Cuándo leer:** ajustar tutorial in-app

---

### 🎨 LINEAR GRADIENT DEBUG (MOBILE)

**📄 Archivo:** `Proudactive/MOBILE/ProudactiveMobile/LINEAR_GRADIENT_DEBUG.md`  
**📝 Qué trata:** bug de expo-linear-gradient y opciones  
**🎯 Cuándo leer:** gradientes que no renderizan

---

## 🚀 FLUJOS DE TRABAJO TÍPICOS

### 1️⃣ AGREGAR ENDPOINT NUEVO (API)

1. Lee `Proudactive/BACKEND_INFO.md`
2. Revisa rutas en `APILaravel/routes/`
3. Implementa controlador + request validation
4. Agrega tests si aplica

---

### 2️⃣ AGREGAR PANTALLA EN MOBILE

1. Lee `Proudactive/VISUAL_IDENTITY_MOBILE.md`
2. Respeta tema y tamaños
3. Evita strings hardcodeadas (ver i18n)
4. Respeta la estructura `src/` (components, hooks, services, constants)

---

### 3️⃣ AGREGAR VISTA EN WEB

1. Lee `Proudactive/VISUAL_IDENTITY_WEB.md`
2. Mantén consistencia con Mobile
3. Usa sistema de i18n

---

## ✅ CHECKLIST ANTES DE HACER PUSH

- [ ] ¿No rompí ninguna funcionalidad existente?
- [ ] ¿Respeté identidad visual?
- [ ] ¿No dejé strings hardcodeadas?
- [ ] ¿Probé escenarios básicos?
- [ ] ¿Commits claros y pequeños?

---

## 🎯 RESUMEN

Este documento es el índice central. Usa las rutas exactas para encontrar lo que necesitas y lee solo lo relevante para tu tarea.

Regla de oro: Si trabajas en algo no trivial, consulta este índice primero.
