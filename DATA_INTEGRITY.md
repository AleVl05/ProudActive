# Integridad de Datos — Proudactive

Este documento protege la consistencia de eventos, recurrencias y subtareas.

## Reglas críticas (no romper)

1. **Subtasks únicas (master)**
   - Clave lógica: `event_id + text + sort_order` con `deleted_at IS NULL`.
   - Nunca crear duplicados. Usa lógica idempotente en backend.

2. **Custom subtasks únicas (instancia)**
   - Clave lógica: `event_instance_id + text + sort_order`.
   - Nunca crear duplicados. Usa lógica idempotente en backend.

3. **Overrides de recurrencia**
   - Un override **SIEMPRE** debe tener `series_id` y `original_start_utc`.
   - El color **nunca** debe quedar `null`. Fallback mínimo: `#6b53e2`.
   - Si no hay color en override, heredar del master.

4. **Instancias generadas**
   - ID local: `${series_id}_${YYYY-MM-DD}`.
   - Se considera “instancia” si tiene `series_id`.
   - Nunca perder `series_id` al reemplazar instancia por override.

5. **Soft delete**
   - Subtasks duplicadas se limpian con `deleted_at`, no hard delete.
   - Limpieza se hace **después** de fixes en backend.

## Checklist rápido al tocar recurrencia

- ¿El override conserva `series_id`?
- ¿`original_start_utc` correcto para la fecha de la instancia?
- ¿El color queda definido?
- ¿No se duplicaron subtareas al migrar?

## Reglas de frontend (recurrencia + overrides)

1. **Diferenciar instancia virtual vs override real**
   - Instancia virtual: `id` con formato `${series_id}_YYYY-MM-DD`.
   - Override real: `id` numérico y `series_id` presente.
   - **Regla:** nunca crear un override nuevo si ya es override real; en ese caso, **solo actualizar** el override existente.

2. **Mover instancia por fecha/hora (modal)**
   - Si es instancia virtual y cambia fecha/hora: crear override con `series_id` + `original_start_utc`.
   - Si ya es override real y cambia fecha/hora: `PUT` al override.
   - **Nunca** crear una nueva serie por un simple cambio de hora/fecha en una instancia.

3. **`original_start_utc` siempre del día de la instancia**
   - En instancias generadas, `original_start_utc` debe ser la fecha/hora de ESA instancia (no la del master).
   - Si está mal, los overrides no matchean y desaparecen.

4. **Overrides fuera de la regla de recurrencia**
   - Si un override se mueve a un día que NO está en la regla, debe seguir mostrándose.
   - En fetch, agregar overrides dentro del rango visible aunque la serie esté activa.

5. **Cache de subtareas no debe pisar selección**
   - `loadSubtasks(eventId)` solo puede actualizar `subtasks` si `eventId` coincide con el evento seleccionado.
   - Si no, solo actualizar cache. Esto evita “reapariciones” de subtareas.

6. **No recrear series sin intención**
   - Crear nueva serie solo si `recurrenceConfig.enabled` es verdadero.
   - Cambios simples de título/color/fecha/hora no deben convertir un evento en serie.

## Limpieza de duplicados (solo cuando se confirme)

Usar los scripts de limpieza definidos en el plan maestro (no ejecutar sin confirmar).
