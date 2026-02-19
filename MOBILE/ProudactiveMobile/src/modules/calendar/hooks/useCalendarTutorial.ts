import { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { calendarTutorialSteps } from '@/components/tutorial/tutorialSteps';
import tutorialService from '@/utils/tutorialService';
import type { Event, RecurrenceConfig, SubtaskItem } from '@/types/calendarTypes';
import type { MonthEvent } from '@/components/calendar/monthEventHelpers';

interface UseCalendarTutorialParams {
  modalVisible: boolean;
  selectedEvent: Event | MonthEvent | null;
  eventTitle: string;
  recurrenceModalVisible: boolean;
  recurrenceConfig: RecurrenceConfig;
  subtasks: SubtaskItem[];
  currentView: 'day' | 'week' | 'month' | 'year';
}

export function useCalendarTutorial({
  modalVisible,
  selectedEvent,
  eventTitle,
  recurrenceModalVisible,
  recurrenceConfig,
  subtasks,
  currentView,
}: UseCalendarTutorialParams) {
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Ref para evitar múltiples llamadas a handleTutorialNext para el mismo objetivo
  const tutorialObjectiveCompletedRef = useRef<string | null>(null);
  const tutorialNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para verificar el estado del tutorial
  const checkTutorialStatus = useCallback(async () => {
    try {
      const isCompleted = await tutorialService.isTutorialCompleted();
      if (!isCompleted) {
        const savedStep = await tutorialService.getCurrentStep();
        setTutorialStep(savedStep);
        setTutorialVisible(true);
        setTutorialCompleted(false);
      } else {
        setTutorialCompleted(true);
        setTutorialVisible(false);
      }
    } catch (error) {
      console.error('? Tutorial: Error en checkTutorialStatus:', error);
      // Si hay error, no mostrar tutorial
      setTutorialCompleted(true);
      setTutorialVisible(false);
    }
  }, []);

  // Verificar si el tutorial debe mostrarse al montar - SOLO UNA VEZ
  useEffect(() => {
    // Delay más largo para asegurar que la UI está completamente cargada
    const timer = setTimeout(() => {
      checkTutorialStatus();
    }, 1000); // 1 segundo de delay
    return () => clearTimeout(timer);
  }, []); // Sin dependencias - solo al montar

  // Verificar cuando la pantalla vuelve a estar en foco (cuando vuelves de configuraciones)
  useFocusEffect(
    useCallback(() => {
      checkTutorialStatus();
    }, [checkTutorialStatus])
  );

  // Completar el tutorial
  const handleTutorialComplete = useCallback(async () => {
    await tutorialService.markTutorialCompleted();
    setTutorialVisible(false);
    setTutorialCompleted(true);
  }, []);

  // Avanzar al siguiente paso del tutorial
  const handleTutorialNext = useCallback(() => {
    // Resetear el ref cuando avanzamos al siguiente paso
    tutorialObjectiveCompletedRef.current = null;

    const nextStep = tutorialStep + 1;
    if (nextStep < calendarTutorialSteps.length) {
      setTutorialStep(nextStep);
      tutorialService.saveCurrentStep(nextStep);
    } else {
      handleTutorialComplete();
    }
  }, [tutorialStep, handleTutorialComplete]);

  // Saltar el tutorial
  const handleTutorialSkip = useCallback(async () => {
    console.log('[Calendar] Tutorial: handleTutorialSkip llamado');
    try {
      // Primero ocultar el tutorial inmediatamente
      setTutorialVisible(false);
      setTutorialCompleted(true);
      setTutorialStep(0); // Resetear el paso

      // Luego marcar como completado en storage
      await tutorialService.markTutorialCompleted();
      console.log('? Tutorial: Tutorial saltado exitosamente');
    } catch (error) {
      console.error('? Tutorial: Error al saltar tutorial:', error);
      // Incluso si hay error, asegurar que se oculte
      setTutorialVisible(false);
      setTutorialCompleted(true);
    }
  }, []);

  // Detectar acciones del usuario para avanzar pasos automáticamente
  // Usa el sistema de objetivos para solo avanzar cuando se cumple la acción correcta
  useEffect(() => {
    if (!tutorialVisible || tutorialCompleted) {
      tutorialObjectiveCompletedRef.current = null;
      return;
    }

    const currentStepData = calendarTutorialSteps[tutorialStep] as any;
    if (!currentStepData || !currentStepData.actionRequired || !currentStepData.objective) {
      tutorialObjectiveCompletedRef.current = null;
      return;
    }

    const objective = currentStepData.objective;

    // Si ya se completó este objetivo, no hacer nada
    // Usar clave única por paso y objetivo para evitar conflictos
    const objectiveKey = `${tutorialStep}-${objective}`;
    if (tutorialObjectiveCompletedRef.current === objectiveKey || tutorialObjectiveCompletedRef.current === objective) {
      return;
    }

    // Solo avanzar cuando se cumple el objetivo correcto
    switch (objective) {
      case 'click-empty-cell':
        // Solo avanzar si se abrió el modal al hacer clic en una celda vacía (no al editar un evento existente)
        if (modalVisible && !selectedEvent) {
          console.log('? Objetivo cumplido: click-empty-cell');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'enter-event-name':
        // Avanzar cuando se ingresa cualquier nombre (no solo "ir al gimnasio")
        if (eventTitle.trim().length > 0) {
          console.log('? Objetivo cumplido: enter-event-name');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'press-create-button':
        // Este se detecta cuando se cierra el modal después de presionar crear
        // Se detecta en handleCloseModal o cuando modalVisible cambia a false después de guardar
        break;

      case 'click-event-item':
        // Avanzar cuando se abre el modal al hacer clic en un evento existente
        if (modalVisible && selectedEvent) {
          console.log('? Objetivo cumplido: click-event-item');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          // Dar más tiempo para que el modal se renderice completamente antes de avanzar
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 300);
        }
        break;

      case 'open-recurrence-modal':
        if (recurrenceModalVisible) {
          console.log('? Objetivo cumplido: open-recurrence-modal');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'enable-recurrence':
        // Verificar que la recurrencia está habilitada en el modal
        if (recurrenceModalVisible && recurrenceConfig.enabled) {
          console.log('? Objetivo cumplido: enable-recurrence');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'select-weekly-mode':
        // Verificar que el modo sea semanal
        if (recurrenceModalVisible && recurrenceConfig.enabled && recurrenceConfig.mode === 'weekly') {
          console.log('? Objetivo cumplido: select-weekly-mode');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'select-recurrence-days':
        // Verificar que se hayan seleccionado los días específicos: Lunes (MO), Martes (TU), Jueves (TH), Viernes (FR)
        const requiredDays = ['MO', 'TU', 'TH', 'FR'];
        if (
          recurrenceConfig.enabled &&
          recurrenceConfig.mode === 'weekly' &&
          recurrenceConfig.weekDays.length >= 4 &&
          requiredDays.every(day => recurrenceConfig.weekDays.includes(day))
        ) {
          console.log('? Objetivo cumplido: select-recurrence-days');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'save-recurrence':
        // Se detecta cuando se cierra el modal de recurrencia después de guardar
        // Se detecta cuando recurrenceModalVisible cambia a false y hay recurrencia configurada
        break;

      case 'add-subtasks':
        // Verificar que se hayan agregado al menos 2 subtareas
        // Ya no requiere textos específicos, solo que haya 2 o más subtareas
        // También verificar que el modal está visible (estamos en el paso correcto)
        if (modalVisible && subtasks.length >= 2) {
          console.log('? Objetivo cumplido: add-subtasks (2 o más subtareas agregadas)');
          tutorialObjectiveCompletedRef.current = `${tutorialStep}-${objective}`;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'save-event-with-subtasks':
        // Se detecta cuando se guarda el evento después de agregar subtareas
        // Se detecta en handleSaveEvent
        break;

      case 'complete-subtasks':
        // Solo avanzar si todas las subtareas están completadas Y se está editando (no solo marcando)
        // El tutorial debe avanzar cuando se cierra el modal después de completar las subtareas
        // Esto se detecta cuando modalVisible cambia a false y todas las subtareas están completadas
        if (subtasks.length > 0 && subtasks.every(st => st.completed) && !modalVisible) {
          console.log('? Objetivo cumplido: complete-subtasks (todas completadas y modal cerrado)');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'drag-event':
        // Se detecta en onMoveCommit cuando se mueve un evento
        break;

      case 'resize-event':
        // Se detecta en onResizeCommit cuando se estira un evento
        break;

      case 'long-press-event':
        // Se detecta cuando se muestra el menú contextual (long press)
        break;

      case 'switch-to-day-view':
        // Se detecta cuando currentView cambia a 'day'
        if (currentView === 'day') {
          console.log('? Objetivo cumplido: switch-to-day-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'switch-to-month-view':
        // Se detecta cuando currentView cambia a 'month'
        if (currentView === 'month') {
          console.log('? Objetivo cumplido: switch-to-month-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      case 'switch-to-year-view':
        // Se detecta cuando currentView cambia a 'year'
        if (currentView === 'year') {
          console.log('? Objetivo cumplido: switch-to-year-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;

      default:
        break;
    }
  }, [
    tutorialVisible,
    tutorialCompleted,
    tutorialStep,
    modalVisible,
    selectedEvent,
    eventTitle,
    recurrenceModalVisible,
    recurrenceConfig,
    subtasks,
    currentView,
    handleTutorialNext,
  ]);

  return {
    tutorialVisible,
    tutorialStep,
    tutorialCompleted,
    handleTutorialComplete,
    handleTutorialNext,
    handleTutorialSkip,
    checkTutorialStatus,
    tutorialObjectiveCompletedRef,
    tutorialNextTimeoutRef,
  };
}
