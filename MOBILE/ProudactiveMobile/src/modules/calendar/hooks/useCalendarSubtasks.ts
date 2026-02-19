import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Event, SubtaskItem } from '@/types/calendarTypes';
import type { MonthEvent } from '@/components/calendar/monthEventHelpers';
import {
  apiGetSubtasks,
  apiCreateSubtask,
  apiUpdateSubtask,
  apiDeleteSubtask,
  apiGetSubtasksForInstance,
  apiToggleSubtaskInstance,
  apiUpdateCustomSubtask,
} from '@/services/calendarApi';

interface UseCalendarSubtasksParams {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  eventsRef: React.MutableRefObject<Event[]>;
  selectedEvent: Event | MonthEvent | null;
  currentView: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;
  startOfWeek: (date: Date) => Date;
  addDays: (date: Date, days: number) => Date;
}

export function useCalendarSubtasks({
  events,
  setEvents,
  eventsRef,
  selectedEvent,
  currentView,
  currentDate,
  startOfWeek,
  addDays,
}: UseCalendarSubtasksParams) {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [originalSubtasks, setOriginalSubtasks] = useState<SubtaskItem[]>([]);
  const [subtasksCache, setSubtasksCache] = useState<{[eventId: string]: SubtaskItem[]}>({});
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtaskChangesModalVisible, setSubtaskChangesModalVisible] = useState(false);
  const [pendingSubtaskChanges, setPendingSubtaskChanges] = useState<{
    added: SubtaskItem[];
    removed: SubtaskItem[];
    modified: SubtaskItem[];
  } | null>(null);

  const selectedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedEventIdRef.current = selectedEvent ? String(selectedEvent.id) : null;
  }, [selectedEvent]);

  const eventById = useMemo(() => {
    const map: { [key: string]: Event } = {};
    events.forEach(ev => {
      map[String(ev.id)] = ev;
    });
    return map;
  }, [events]);

  const getSubtaskStatus = useCallback((eventId: string): { hasSubtasks: boolean; allCompleted: boolean } => {
    const cached = subtasksCache[eventId];
    if (cached) {
      const hasSubtasks = cached.length > 0;
      const allCompleted = hasSubtasks && cached.every(subtask => subtask.completed);
      return { hasSubtasks, allCompleted };
    }

    const ev = eventById[eventId];
    if (!ev) {
      return { hasSubtasks: false, allCompleted: false };
    }

    const total = ev.subtasks_total ?? ev.subtasks_count ?? 0;
    const completed = ev.subtasks_completed ?? ev.subtasks_completed_count ?? 0;
    const status = ev.subtask_status;

    if (status === 'done') {
      return { hasSubtasks: total > 0 || status !== 'none', allCompleted: true };
    }
    if (status === 'partial') {
      return { hasSubtasks: true, allCompleted: false };
    }
    if (total > 0) {
      return { hasSubtasks: true, allCompleted: completed >= total };
    }
    return { hasSubtasks: false, allCompleted: false };
  }, [subtasksCache, eventById]);

  const computeSubtaskStatus = useCallback((total?: number, completed?: number): 'none' | 'partial' | 'done' => {
    const safeTotal = total ?? 0;
    const safeCompleted = completed ?? 0;
    if (safeTotal <= 0) {
      return 'none';
    }
    if (safeCompleted >= safeTotal) {
      return 'done';
    }
    if (safeCompleted > 0) {
      return 'partial';
    }
    return 'partial';
  }, []);

  const loadSubtasks = useCallback(async (eventId: string, event?: Event | MonthEvent | null, forceReload: boolean = false) => {
    if (!forceReload && subtasksCache[eventId]) {
      const cached = subtasksCache[eventId];
      if (selectedEventIdRef.current && String(eventId) === selectedEventIdRef.current) {
        setSubtasks(cached);
        setOriginalSubtasks(JSON.parse(JSON.stringify(cached))); // Deep copy
      }
      return;
    }

    try {
      const eventData = event || selectedEvent;
      const isRecurringInstance = eventData && 'series_id' in eventData && eventData.series_id !== null && eventData.series_id !== undefined;

      console.log('[Calendar] loadSubtasks - Event analysis', {
        eventId,
        title: eventData?.title,
        isRecurringInstance,
        series_id: eventData && 'series_id' in eventData ? eventData.series_id : null,
        is_recurring: eventData && 'is_recurring' in eventData ? eventData.is_recurring : null,
        hasEvent: !!event,
        hasSelectedEvent: !!selectedEvent
      });

      let response;
      let loadedSubtasks: SubtaskItem[] = [];

      if (isRecurringInstance) {
        response = await apiGetSubtasksForInstance(eventId);
        if (response.ok) {
          const result = await response.json();
          loadedSubtasks = result.data.subtasks.map((subtask: any) => ({
            id: subtask.id.toString(),
            text: subtask.text,
            completed: subtask.completed || false,
            type: subtask.type || 'master',
            instance_id: subtask.instance_id ? subtask.instance_id.toString() : null,
            sort_order: subtask.sort_order || 0
          }));
        }
      } else {
        response = await apiGetSubtasks(eventId);
        if (response.ok) {
          const result = await response.json();
          loadedSubtasks = result.data.map((subtask: any) => ({
            id: subtask.id.toString(),
            text: subtask.text,
            completed: subtask.completed || false,
            type: 'master',
            sort_order: subtask.sort_order || 0
          }));
        }
      }

      setSubtasksCache(prev => ({
        ...prev,
        [eventId]: loadedSubtasks
      }));

      const totalFromLoad = loadedSubtasks.length;
      const completedFromLoad = loadedSubtasks.filter(st => st.completed).length;
      const statusFromLoad = computeSubtaskStatus(totalFromLoad, completedFromLoad);

      setEvents(prev => prev.map(ev => {
        if (ev.id === eventId) {
          return {
            ...ev,
            subtasks_total: totalFromLoad,
            subtasks_completed: completedFromLoad,
            subtask_status: statusFromLoad,
            subtasks_count: totalFromLoad,
            subtasks_completed_count: completedFromLoad
          };
        }
        return ev;
      }));

      if (selectedEventIdRef.current && String(eventId) === selectedEventIdRef.current) {
        setSubtasks(loadedSubtasks);
        setOriginalSubtasks(JSON.parse(JSON.stringify(loadedSubtasks)));
      }
    } catch (error) {
      setSubtasks([]);
      setOriginalSubtasks([]);
    }
  }, [computeSubtaskStatus, subtasksCache, selectedEvent, setEvents]);

  const migrateSubtasks = useCallback(async (oldEventId: string, newEventId: string, oldEvent?: Event | null, newEvent?: Event | null) => {
    try {
      console.log('[Calendar] migrateSubtasks - START', {
        oldEventId,
        newEventId,
        oldEventTitle: oldEvent?.title,
        oldEventSeriesId: oldEvent?.series_id
      });

      const isOldEventMaster = oldEvent && oldEvent.is_recurring && !oldEvent.series_id;
      const isOldEventUnique = oldEvent && !oldEvent.is_recurring && !oldEvent.series_id;
      const isOldEventInstance = oldEvent && (oldEvent.series_id || oldEvent.original_start_utc);
      const isNewEventOverride = isOldEventInstance;

      let oldSubtasks: any[] = [];

      if (isOldEventInstance) {
        console.log('[Calendar] migrateSubtasks - Obteniendo subtareas de instancia', { oldEventId });
        const instanceResponse = await apiGetSubtasksForInstance(oldEventId);
        if (instanceResponse.ok) {
          const instanceResult = await instanceResponse.json();
          oldSubtasks = instanceResult.data?.subtasks || [];
          console.log('[Calendar] migrateSubtasks - Subtareas de instancia obtenidas', {
            count: oldSubtasks.length,
            completed: oldSubtasks.filter(st => st.completed).length
          });
        }
      } else {
        const response = await apiGetSubtasks(oldEventId);
        if (response.ok) {
          const result = await response.json();
          oldSubtasks = result.data || [];
          console.log('[Calendar] migrateSubtasks - Subtareas normales obtenidas', {
            count: oldSubtasks.length,
            completed: oldSubtasks.filter(st => st.completed).length
          });
        }
      }

      if (oldSubtasks.length === 0) {
        console.log('[Calendar] migrateSubtasks - No hay subtareas para migrar');
        return;
      }

      if (isNewEventOverride && oldEvent?.series_id) {
        console.log('[Calendar] migrateSubtasks - Nuevo evento es override, creando instancias de subtareas');
        for (const oldSubtask of oldSubtasks) {
          if (oldSubtask.completed && oldSubtask.id) {
            try {
              const toggleResponse = await apiToggleSubtaskInstance(oldSubtask.id.toString(), newEventId, true);
              if (toggleResponse.ok) {
                console.log('[Calendar] migrateSubtasks - Instancia de subtarea creada como completada', {
                  subtaskId: oldSubtask.id,
                  newEventId
                });
              } else {
                console.log('[Calendar] migrateSubtasks - Error creando instancia de subtarea', {
                  subtaskId: oldSubtask.id,
                  status: toggleResponse.status
                });
              }
            } catch (error) {
              console.log('[Calendar] migrateSubtasks - Excepción creando instancia de subtarea', error);
            }
          }
        }
      } else {
        console.log('[Calendar] migrateSubtasks - Creando subtareas en nuevo evento único');
        for (let i = 0; i < oldSubtasks.length; i++) {
          const oldSubtask = oldSubtasks[i];
          try {
            const response = await apiCreateSubtask(newEventId, oldSubtask.text, oldSubtask.sort_order ?? i);
            if (response.ok) {
              const result = await response.json();
              if (oldSubtask.completed && result?.data?.id) {
                const toggleResponse = await apiUpdateSubtask(result.data.id.toString(), { completed: true });
                if (toggleResponse.ok) {
                  console.log('[Calendar] migrateSubtasks - Estado completado copiado', { subtaskId: result.data.id });
                } else {
                  console.log('[Calendar] migrateSubtasks - Error copiando estado completado', { subtaskId: result.data.id });
                }
              }
            }
          } catch (error) {
            console.log('[Calendar] migrateSubtasks - Excepción creando subtarea', error);
          }
        }

        if (isOldEventUnique) {
          console.log('[Calendar] migrateSubtasks - Borrando subtareas del evento viejo (único)');
          for (const oldSubtask of oldSubtasks) {
            try {
              await apiDeleteSubtask(oldSubtask.id.toString());
            } catch (deleteError) {
              console.log('[Calendar] migrateSubtasks - Error borrando subtarea vieja', deleteError);
            }
          }
        }
      }

      let eventForLoadSubtasks = newEvent;
      if (!eventForLoadSubtasks) {
        eventForLoadSubtasks = eventsRef.current.find(e => e.id === newEventId);
      }

      console.log('[Calendar] migrateSubtasks - Recargando subtareas del nuevo evento', {
        newEventId,
        hasNewEvent: !!newEvent,
        hasEventFromRef: !!eventForLoadSubtasks,
        hasSeriesId: !!eventForLoadSubtasks?.series_id
      });

      await loadSubtasks(newEventId, eventForLoadSubtasks || undefined, true);
      console.log('? migrateSubtasks - COMPLETE');
    } catch (error) {
      console.log('? migrateSubtasks - ERROR', error);
    }
  }, [loadSubtasks, eventsRef]);

  const handleToggleSubtask = useCallback(async (id: string) => {
    try {
      console.log('[Calendar] handleToggleSubtask - START', { subtaskId: id });

      const subtask = subtasks.find(s => s.id === id);
      if (!subtask) {
        console.warn('[Calendar]  handleToggleSubtask - No subtask found', { subtaskId: id });
        return;
      }

      const newCompletedState = !subtask.completed;
      const isTemporarySubtask = id.startsWith('temp-');

      if (isTemporarySubtask) {
        console.log('[Calendar] handleToggleSubtask - Toggling temporary subtask (local only)', {
          subtaskId: id,
          text: subtask.text,
          currentState: subtask.completed,
          newState: newCompletedState
        });
        const updatedSubtasks = subtasks.map(st => (st.id === id ? { ...st, completed: newCompletedState } : st));
        setSubtasks(updatedSubtasks);
        if (selectedEvent) {
          setSubtasksCache(prev => ({
            ...prev,
            [selectedEvent.id]: updatedSubtasks
          }));
        }
        console.log('? handleToggleSubtask - Temporary subtask toggle complete (local only)');
        return;
      }

      if (!selectedEvent) {
        console.warn('[Calendar]  handleToggleSubtask - No event selected for non-temporary subtask', { subtaskId: id });
        return;
      }

      console.log('[Calendar] handleToggleSubtask - Toggling', {
        subtaskId: id,
        text: subtask.text,
        currentState: subtask.completed,
        newState: newCompletedState,
        type: subtask.type,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title
      });

      const updatedSubtasks = subtasks.map(st => (st.id === id ? { ...st, completed: newCompletedState } : st));
      setSubtasks(updatedSubtasks);
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));

      console.log('? handleToggleSubtask - Optimistic update complete');

      if (!isTemporarySubtask) {
        const isRecurringInstance = 'series_id' in selectedEvent && selectedEvent.series_id !== null && selectedEvent.series_id !== undefined;

        console.log('[Calendar] handleToggleSubtask - Syncing to server', {
          isRecurringInstance,
          subtaskType: subtask.type,
          seriesId: 'series_id' in selectedEvent ? selectedEvent.series_id : null
        });

        if (isRecurringInstance && subtask.type === 'master') {
          console.log('[Calendar] handleToggleSubtask - Calling apiToggleSubtaskInstance');
          const response = await apiToggleSubtaskInstance(id, selectedEvent.id, newCompletedState);
          console.log('[Calendar] handleToggleSubtask - Response from apiToggleSubtaskInstance', {
            ok: response.ok,
            status: response.status
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('? handleToggleSubtask - Failed, reverting', { error: errorText });
            setSubtasks(prev => prev.map(st => (st.id === id ? { ...st, completed: subtask.completed } : st)));
          } else {
            console.log('? handleToggleSubtask - Instance toggle SUCCESS');
          }
        } else if (subtask.type === 'custom') {
          console.log('[Calendar] handleToggleSubtask - Calling apiUpdateCustomSubtask');
          const response = await apiUpdateCustomSubtask(id, { completed: newCompletedState });
          console.log('[Calendar] handleToggleSubtask - Response from apiUpdateCustomSubtask', {
            ok: response.ok,
            status: response.status
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('? handleToggleSubtask - Failed, reverting', { error: errorText });
            setSubtasks(prev => prev.map(st => (st.id === id ? { ...st, completed: subtask.completed } : st)));
          } else {
            console.log('? handleToggleSubtask - Custom toggle SUCCESS');
          }
        } else {
          console.log('[Calendar] handleToggleSubtask - Calling apiUpdateSubtask (normal)');
          const response = await apiUpdateSubtask(id, { completed: newCompletedState });
          console.log('[Calendar] handleToggleSubtask - Response from apiUpdateSubtask', {
            ok: response.ok,
            status: response.status
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('? handleToggleSubtask - Failed, reverting', { error: errorText });
            setSubtasks(prev => prev.map(st => (st.id === id ? { ...st, completed: subtask.completed } : st)));
          } else {
            console.log('? handleToggleSubtask - Normal toggle SUCCESS');
          }
        }
      } else {
        console.log('[Calendar]  handleToggleSubtask - Temporary subtask, no server sync');
      }

      console.log('? handleToggleSubtask - COMPLETE');
    } catch (error) {
      console.error('? handleToggleSubtask - EXCEPTION', {
        subtaskId: id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [subtasks, selectedEvent]);

  const handleDeleteSubtask = useCallback(async (id: string) => {
    const originalSubtasksSnapshot = subtasks;
    const updatedSubtasks = subtasks.filter(subtask => subtask.id !== id);
    setSubtasks(updatedSubtasks);

    if (selectedEvent) {
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));
    }

    const isRecurringInstance = selectedEvent && ('series_id' in selectedEvent && selectedEvent.series_id);

    if (!id.startsWith('temp-') && !isRecurringInstance) {
      try {
        const response = await apiDeleteSubtask(id);
        if (!response.ok) {
          setSubtasks(originalSubtasksSnapshot);
        }
      } catch (error) {
        setSubtasks(originalSubtasksSnapshot);
        console.error('Error al eliminar subtarea:', error);
      }
    }
  }, [subtasks, selectedEvent]);

  const handleAddSubtask = useCallback(async () => {
    const text = newSubtaskText.trim();
    if (!text) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let tempSortOrder = 0;

    // Optimistic update - mostrar inmediatamente
    setSubtasks(prev => {
      tempSortOrder = prev.length;
      const newSubtask: SubtaskItem = {
        id: tempId,
        text,
        completed: false,
        type: 'master',
        sort_order: tempSortOrder
      };
      return [...prev, newSubtask];
    });

    setNewSubtaskText('');
    setShowSubtaskInput(false);

    const selectedEventId = selectedEvent?.id;

    // IMPORTANTE: Detectar si es instancia recurrente
    const isRecurringInstance = selectedEvent && 
      'series_id' in selectedEvent && 
      selectedEvent.series_id !== null;

    // Si estamos editando un evento existente Y NO es instancia recurrente
    // ? crear la subtarea inmediatamente
    // Si ES instancia recurrente ? dejar como temporal, el modal se mostrará al guardar
    if (selectedEventId && !isRecurringInstance) {
      try {
        const response = await apiCreateSubtask(
          selectedEventId, 
          text, 
          tempSortOrder
        );

        if (response.ok) {
          const result = await response.json();
          // Reemplazar la subtarea temporal con la real
          const realSubtask: SubtaskItem = {
            id: result.data.id.toString(),
            text: result.data.text,
            completed: result.data.completed || false,
            type: 'master',
            sort_order: result.data.sort_order ?? tempSortOrder
          };

          setSubtasks(prev => {
            const updated = prev.map(st => st.id === tempId ? realSubtask : st);

            // Invalidar caché para forzar recarga
            setSubtasksCache(cachePrev => {
              const newCache = { ...cachePrev };
              delete newCache[selectedEventId];
              return newCache;
            });

            // Actualizar originalSubtasks también
            setOriginalSubtasks(JSON.parse(JSON.stringify(updated)));

            return updated;
          });
        } else {
          // Si falla, remover la subtarea temporal
          setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
        }
      } catch (error) {
        // Si falla, remover la subtarea temporal
        setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
      }
    } else if (isRecurringInstance) {
      // No hacer nada, quedará como temporal y el modal se mostrará al guardar
    }
  }, [newSubtaskText, selectedEvent]);

  const handleEditSubtask = useCallback(async (id: string, newText: string) => {
    // Optimistic update - actualizar inmediatamente
    const updatedSubtasks = subtasks.map(subtask => 
      subtask.id === id 
        ? { ...subtask, text: newText }
        : subtask
    );
    setSubtasks(updatedSubtasks);

    // Actualizar caché si estamos editando un evento existente
    if (selectedEvent) {
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));
    }

    // Solo actualizar en el servidor si no es una subtarea temporal
    if (!id.startsWith('temp-')) {
      try {
        const response = await apiUpdateSubtask(id, {
          text: newText
        });

        if (!response.ok) {
          // Si falla, revertir el cambio (necesitaríamos el texto original)
          console.error('Error al actualizar subtarea en servidor');
        }
      } catch (error) {
        console.error('Error al editar subtarea:', error);
      }
    }
    // Para subtareas temporales, el cambio se mantiene localmente
    // y se sincronizará cuando se guarde el evento
  }, []);

  // Detectar cambios estructurales en subtareas (ignorando toggles de completed)
  const detectSubtaskStructuralChanges = useCallback(() => {
    const added: SubtaskItem[] = [];
    const removed: SubtaskItem[] = [];
    const modified: SubtaskItem[] = [];

    // Filtrar subtareas temporales (se consideran "added")
    const currentNonTemp = subtasks.filter(st => !st.id.startsWith('temp-'));
    const currentTemp = subtasks.filter(st => st.id.startsWith('temp-'));

    added.push(...currentTemp);

    // Comparar con originales
    const originalMap = new Map(originalSubtasks.map(st => [st.id, st]));
    const currentMap = new Map(currentNonTemp.map(st => [st.id, st]));

    // Detectar eliminadas
    for (const [id, original] of originalMap) {
      if (!currentMap.has(id)) {
        removed.push(original);
      }
    }

    // Detectar agregadas (no temporales)
    for (const [id, current] of currentMap) {
      if (!originalMap.has(id)) {
        added.push(current);
      }
    }

    // Detectar modificadas (texto o sort_order)
    for (const [id, current] of currentMap) {
      const original = originalMap.get(id);
      if (original) {
        const textChanged = current.text !== original.text;
        const orderChanged = (current.sort_order || 0) !== (original.sort_order || 0);

        if (textChanged || orderChanged) {
          modified.push(current);
        }
      }
    }

    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;

    return {
      hasChanges,
      changes: { added, removed, modified }
    };
  }, [subtasks, originalSubtasks]);


  const loadAllEventsSubtasks = useCallback(async (eventsToLoad: Event[], forceReload: boolean = false, targetDate?: Date) => {
    try {
      // Si forceReload es true, procesar todos los eventos. Si no, solo los que no están en cache
      const eventsToProcess = forceReload 
        ? eventsToLoad 
        : eventsToLoad.filter(event => !subtasksCache[event.id]);

      if (eventsToProcess.length === 0) {
        return;
      }

      // FILTRAR SOLO EVENTOS DE LA SEMANA/DÍA ACTUAL
      let visibleEvents: Event[] = [];

      // Usar targetDate si se proporciona, sino usar currentDate
      const dateToUse = targetDate || currentDate;

      if (currentView === 'week') {
        const weekStart = startOfWeek(dateToUse);
        const weekEnd = addDays(weekStart, 6);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);

        visibleEvents = eventsToProcess.filter(event => {
          const eventDate = event.date;
          return eventDate >= weekStartStr && eventDate <= weekEndStr;
        });
      } else if (currentView === 'day') {
        // Para la vista de día, cargar toda la semana para mejor experiencia visual
        const weekStart = startOfWeek(dateToUse);
        const weekEnd = addDays(weekStart, 6);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);

        visibleEvents = eventsToProcess.filter(event => {
          const eventDate = event.date;
          return eventDate >= weekStartStr && eventDate <= weekEndStr;
        });
      } else {
        // Para month y year, usar todos los eventos por ahora
        visibleEvents = eventsToProcess;
        console.log('[Calendar] FILTRO MES/AÑO - Usando todos los eventos:', eventsToProcess.length);
      }

      // Procesar en lotes más grandes para mejor performance
      const batchSize = 10; // Aumentado de 3 a 10
      const allBatches = [];
      for (let i = 0; i < visibleEvents.length; i += batchSize) {
        const batch = visibleEvents.slice(i, i + batchSize);
        allBatches.push(batch);
      }

      // Procesar todos los lotes simultáneamente
      const allBatchPromises = allBatches.map(async (batch, batchIndex) => {
        const batchPromises = batch.map(async (event) => {
          try {
            await loadSubtasks(event.id, event, true);
          } catch (error) {
            console.log('[Calendar] loadAllEventsSubtasks - Error loading', event.id, error instanceof Error ? error.message : String(error));
          }
        });

        await Promise.all(batchPromises);
      });

      // Esperar a que todos los lotes terminen
      await Promise.all(allBatchPromises);
    } catch (error) {
      console.log('[Calendar] loadAllEventsSubtasks - Error:', error instanceof Error ? error.message : String(error));
    }
  }, [loadSubtasks, subtasksCache, currentView, currentDate, startOfWeek, addDays]);

  return {
    subtasks,
    setSubtasks,
    originalSubtasks,
    setOriginalSubtasks,
    subtasksCache,
    setSubtasksCache,
    newSubtaskText,
    setNewSubtaskText,
    showSubtaskInput,
    setShowSubtaskInput,
    subtaskChangesModalVisible,
    setSubtaskChangesModalVisible,
    pendingSubtaskChanges,
    setPendingSubtaskChanges,
    getSubtaskStatus,
    computeSubtaskStatus,
    detectSubtaskStructuralChanges,
    loadSubtasks,
    migrateSubtasks,
    handleToggleSubtask,
    handleDeleteSubtask,
    handleAddSubtask,
    handleEditSubtask,
    loadAllEventsSubtasks,
  };
}
