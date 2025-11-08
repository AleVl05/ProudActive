# 📍 Guía Simple: Cómo Mover el Castorcito y sus Elementos

Esta guía te explica cómo ajustar las posiciones del castorcito, su texto y las flechas en el tutorial.

## 🎯 Archivo Principal

**`src/components/tutorial/tutorialStepPositions.ts`** - Este es el archivo que debes editar. Contiene todas las posiciones de cada paso del tutorial de forma simple y clara.

**`src/components/tutorial/TutorialOverlay.tsx`** - Este archivo lee las posiciones del archivo anterior. No necesitas editarlo a menos que quieras cambiar la lógica general.

---

## 📝 Paso 1: Encontrar el Paso que Quieres Cambiar

Abre el archivo **`tutorialStepPositions.ts`** y busca el paso que quieres cambiar. Cada paso tiene un comentario que dice "PASO X:" seguido del nombre del paso.

Por ejemplo:
```typescript
// ============================================
// PASO 2: Crear evento (clic en espacio en blanco)
// ============================================
'create-event': {
  beaver: { ... },
  dialog: { ... },
  arrow: { ... },
},
```

---

## 🦫 Paso 2: Mover el Castorcito

Busca el paso que quieres cambiar y encuentra la sección `beaver:`.

**¿Qué hace?** Controla dónde aparece el castorcito en la pantalla.

**Cómo cambiarlo:**
Simplemente cambia los números en `top`, `bottom`, `left` o `right`.

**Ejemplo:**
```typescript
'add-subtasks': {
  beaver: {
    top: 0.25,      // 25% desde arriba (cambia este número)
    right: 20,      // 20 píxeles desde la derecha
    usePercentage: true,  // Si es true, top es porcentaje (0.0 a 1.0)
  },
  // ...
}
```

**Tip:** 
- Si `usePercentage: true`, usa valores entre 0.0 y 1.0 (ej: 0.25 = 25%)
- Si `usePercentage: false` o no está, usa valores en píxeles (ej: 140 = 140 píxeles)

---

## 💬 Paso 3: Mover el Texto del Diálogo

Busca el paso que quieres cambiar y encuentra la sección `dialog:`.

**¿Qué hace?** Controla dónde aparece el globo de texto del castorcito.

**Cómo cambiarlo:**
Cambia los números en `top`, `bottom`, `left`, `right` o `maxWidth`.

**Ejemplo:**
```typescript
'add-subtasks': {
  dialog: {
    top: 0.35,      // 35% desde arriba
    right: 20,      // 20 píxeles desde la derecha
    maxWidth: 0.45, // 45% del ancho de la pantalla
    usePercentage: true,
  },
  // ...
}
```

---

## ➡️ Paso 4: Mover la Flecha

Busca el paso que quieres cambiar y encuentra la sección `arrow:`.

**¿Qué hace?** Controla dónde aparece la flecha naranja que apunta a elementos.

**Cómo cambiarlo:**
Cambia los números en `top`, `bottom`, `left` o `right`.

**Ejemplo:**
```typescript
'create-event': {
  arrow: {
    top: 0.35,      // 35% desde arriba (cambia este número)
    left: 0.5,      // 50% del ancho (centro)
    rotation: 0,    // Rotación en grados (0 = sin rotación)
    usePercentage: true,
  },
  // ...
}
```

**Tip:** 
- Si `usePercentage: true`, usa valores entre 0.0 y 1.0 (ej: 0.35 = 35%)
- Si `usePercentage: false`, usa valores en píxeles (ej: 100 = 100 píxeles)

---

## 🔄 Paso 5: Rotar la Flecha

Busca el paso que quieres cambiar y encuentra la sección `arrow:`. Ahí está la propiedad `rotation:`.

**¿Qué hace?** Rota la flecha para que apunte en diferentes direcciones.

**Cómo cambiarlo:**
Simplemente cambia el número en `rotation:`.

**Ejemplo:**
```typescript
'click-recurrence': {
  arrow: {
    top: 0.5,
    left: 0.5,
    rotation: 180,  // Cambia este número (180 = al revés)
    usePercentage: true,
  },
  // ...
}
```

**Grados comunes:**
- `0` - Sin rotación (normal)
- `90` - 90 grados a la derecha
- `180` - 180 grados (al revés)
- `-90` - 90 grados a la izquierda

---

## 🎨 Valores que Puedes Usar

- **Números fijos:** `top: 60` (60 píxeles desde arriba)
- **Porcentajes:** `top: height * 0.35` (35% desde arriba)
- **Desde abajo:** `bottom: 140` (140 píxeles desde abajo)
- **Desde la derecha:** `right: 20` (20 píxeles desde la derecha)

---

## 💡 Tips Rápidos

- **Mover más arriba:** Reduce el número de `top` o aumenta `bottom`
- **Mover más abajo:** Aumenta el número de `top` o reduce `bottom`
- **Mover más a la izquierda:** Reduce `left` o aumenta `right`
- **Mover más a la derecha:** Aumenta `left` o reduce `right`
- **Hacer el texto más ancho:** Aumenta `maxWidth`
- **Hacer el texto más estrecho:** Reduce `maxWidth`

---

## 📋 Ejemplo Completo: Ajustar el Paso de Subtareas

Si quieres ajustar el paso donde dice "Agrega dos subtareas":

1. **Busca** el paso `'add-subtasks'` en `tutorialStepPositions.ts`

2. **Cambia** los valores directamente:
```typescript
'add-subtasks': {
  beaver: {
    top: 0.2,      // Cambia de 0.25 a 0.2 para moverlo más arriba
    right: 30,     // Cambia de 20 a 30 para moverlo más a la izquierda
    usePercentage: true,
  },
  dialog: {
    top: 0.3,      // Cambia de 0.35 a 0.3 para acercarlo al castorcito
    right: 30,     // Cambia de 20 a 30
    maxWidth: 0.5, // Cambia de 0.45 a 0.5 para hacerlo más ancho
    usePercentage: true,
  },
  arrow: {
    top: 0.6,      // Cambia de 0.55 a 0.6 para moverla más abajo
    right: 0.2,    // Cambia de 0.15 a 0.2 para moverla más a la izquierda
    rotation: -90,
    usePercentage: true,
  },
},
```

¡Eso es todo! Solo cambias los números y listo.

---

## ✅ Listo

Con estos cambios, puedes ajustar cualquier posición del tutorial. Empieza con números pequeños (10-20 píxeles) y ve ajustando hasta que se vea bien.
