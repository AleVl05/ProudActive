// RecurrenceModal.tsx - Modal for configuring event recurrence
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/theme';
import {
  WEEK_DAY_ITEMS,
  MONTH_DAY_ITEMS,
} from '../../utils/dateConstants';
import {
  getWeekDayCode,
} from '../../utils/dateUtils';
import {
  cloneRecurrenceConfig,
  clampRecurrenceInterval,
  getRecurrenceTitle,
  RECURRENCE_MODE_LABEL,
} from '../../utils/recurrenceUtils';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import { ExtendedTutorialStep } from '../tutorial/tutorialSteps';

// Types
export type RecurrenceMode = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  enabled: boolean;
  mode: RecurrenceMode;
  interval: number;
  weekDays: string[]; // códigos ISO-8601: 'MO', 'TU'...
  monthDays: number[]; // 1-31
  hasEndDate: boolean;
  endDate: string | null; // YYYY-MM-DD
}

export interface RecurrenceModalProps {
  config: RecurrenceConfig;
  onSave: (config: RecurrenceConfig) => void;
  onCancel: () => void;
  calendarMonth: Date;
  onCalendarMonthChange: (date: Date) => void;
  // Props del tutorial
  tutorialVisible?: boolean;
  tutorialStep?: number;
  tutorialSteps?: ExtendedTutorialStep[];
  onTutorialNext?: () => void;
  onTutorialSkip?: () => void;
  onTutorialComplete?: () => void;
  beaverImage?: any;
}

export default function RecurrenceModal({ 
  config, 
  onSave, 
  onCancel, 
  calendarMonth, 
  onCalendarMonthChange,
  tutorialVisible = false,
  tutorialStep = 0,
  tutorialSteps = [],
  onTutorialNext,
  onTutorialSkip,
  onTutorialComplete,
  beaverImage,
}: RecurrenceModalProps) {
  const insets = useSafeAreaInsets();
  const [localConfig, setLocalConfig] = useState<RecurrenceConfig>(() => cloneRecurrenceConfig(config));
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Verificar si el paso actual del tutorial debe mostrarse en el modal de recurrencia
  const currentTutorialStep = tutorialSteps && tutorialSteps.length > tutorialStep ? tutorialSteps[tutorialStep] : null;
  const shouldShowTutorialInRecurrenceModal = tutorialVisible && 
    currentTutorialStep && 
    currentTutorialStep.showInRecurrenceModal === true &&
    beaverImage &&
    onTutorialNext &&
    onTutorialSkip &&
    onTutorialComplete;
  
  // console.log('🔄 RecurrenceModal Tutorial Debug:', {
  //   tutorialVisible,
  //   tutorialStep,
  //   currentTutorialStep: currentTutorialStep?.id,
  //   showInRecurrenceModal: currentTutorialStep?.showInRecurrenceModal,
  //   shouldShowTutorialInRecurrenceModal,
  // });

  // Actualizar configuración local cuando cambie la prop
  useEffect(() => {
    setLocalConfig(cloneRecurrenceConfig(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<RecurrenceConfig>) => {
    setLocalConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // Notificar cambios al padre para detección del tutorial
      // Esto se hace a través de onSave, pero necesitamos que se detecte en tiempo real
      return newConfig;
    });
  }, []);
  
  // Detectar cambios en localConfig para avanzar el tutorial
  useEffect(() => {
    if (!tutorialVisible || !currentTutorialStep) return;
    
    const objective = currentTutorialStep.objective;
    
    // Detectar cuando se activa la recurrencia
    if (objective === 'enable-recurrence' && localConfig.enabled) {
      console.log('✅ RecurrenceModal: Objetivo cumplido: enable-recurrence');
      setTimeout(() => onTutorialNext?.(), 500);
      return;
    }
    
    // Detectar cuando se selecciona modo semanal
    if (objective === 'select-weekly-mode' && localConfig.enabled && localConfig.mode === 'weekly') {
      console.log('✅ RecurrenceModal: Objetivo cumplido: select-weekly-mode');
      setTimeout(() => onTutorialNext?.(), 500);
      return;
    }
    
    // Detectar cuando se seleccionan los días correctos
    if (objective === 'select-recurrence-days') {
      const requiredDays = ['MO', 'TU', 'TH', 'FR']; // Lunes, Martes, Jueves, Viernes
      if (localConfig.enabled && 
          localConfig.mode === 'weekly' && 
          localConfig.weekDays.length >= 4 &&
          requiredDays.every(day => localConfig.weekDays.includes(day))) {
        console.log('✅ RecurrenceModal: Objetivo cumplido: select-recurrence-days');
        setTimeout(() => onTutorialNext?.(), 500);
        return;
      }
    }
  }, [localConfig, tutorialVisible, currentTutorialStep, onTutorialNext]);

  const handleSave = useCallback(() => {
    onSave(localConfig);
  }, [localConfig, onSave]);

  const handleModeChange = useCallback((mode: RecurrenceMode) => {
    const updates: Partial<RecurrenceConfig> = { mode };
    
    // Configurar valores por defecto según el modo
    if (mode === 'weekly') {
      const currentWeekDay = getWeekDayCode(new Date());
      updates.weekDays = localConfig.weekDays.length > 0 ? localConfig.weekDays : [currentWeekDay];
    } else if (mode === 'monthly') {
      const currentDay = new Date().getDate();
      updates.monthDays = localConfig.monthDays.length > 0 ? localConfig.monthDays : [currentDay];
    }
    
    updateConfig(updates);
  }, [localConfig.weekDays, localConfig.monthDays, updateConfig]);

  const handleIntervalChange = useCallback((delta: number) => {
    const newInterval = clampRecurrenceInterval(localConfig.interval + delta);
    updateConfig({ interval: newInterval });
  }, [localConfig.interval, updateConfig]);

  const handleWeekDayToggle = useCallback((dayCode: string) => {
    const newWeekDays = localConfig.weekDays.includes(dayCode)
      ? localConfig.weekDays.filter(d => d !== dayCode)
      : [...localConfig.weekDays, dayCode];
    updateConfig({ weekDays: newWeekDays });
  }, [localConfig.weekDays, updateConfig]);

  const handleMonthDayToggle = useCallback((day: number) => {
    const newMonthDays = localConfig.monthDays.includes(day)
      ? localConfig.monthDays.filter(d => d !== day)
      : [...localConfig.monthDays, day];
    updateConfig({ monthDays: newMonthDays });
  }, [localConfig.monthDays, updateConfig]);

  const handleEndDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      updateConfig({ endDate: dateStr });
    }
  }, [updateConfig]);

  const formatEndDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES');
  }, []);

  const renderTabContent = () => {
    switch (localConfig.mode) {
      case 'daily':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>Cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'weekly':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.weekDaysSection}>
              <View style={recurrenceStyles.weekDaysGrid}>
                {WEEK_DAY_ITEMS.map(item => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      recurrenceStyles.weekDayChip,
                      localConfig.weekDays.includes(item.code) && recurrenceStyles.weekDayChipSelected
                    ]}
                    onPress={() => handleWeekDayToggle(item.code)}
                  >
                    <Text style={[
                      recurrenceStyles.weekDayChipText,
                      localConfig.weekDays.includes(item.code) && recurrenceStyles.weekDayChipTextSelected
                    ]}>
                      {item.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>Cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'semana' : 'semanas'}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'monthly':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.monthDaysSection}>
              <View style={recurrenceStyles.monthGrid}>
                {MONTH_DAY_ITEMS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      recurrenceStyles.monthDayChip,
                      localConfig.monthDays.includes(day) && recurrenceStyles.monthDayChipSelected
                    ]}
                    onPress={() => handleMonthDayToggle(day)}
                  >
                    <Text style={[
                      recurrenceStyles.monthDayChipText,
                      localConfig.monthDays.includes(day) && recurrenceStyles.monthDayChipTextSelected
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>Cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'mes' : 'meses'}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={recurrenceStyles.container}>
      <View style={[recurrenceStyles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={recurrenceStyles.backButton} onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={recurrenceStyles.headerTitle}>
          {localConfig.enabled ? getRecurrenceTitle(localConfig) : 'Repetir'}
        </Text>
      </View>

      <ScrollView style={recurrenceStyles.content}>
        {/* Switch principal de repetición */}
        <View style={recurrenceStyles.mainSwitchSection}>
          <View style={recurrenceStyles.mainSwitchRow}>
            <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
            <Text style={recurrenceStyles.mainSwitchLabel}>Repetir</Text>
            <Text style={recurrenceStyles.mainSwitchSubtitle}>Define un ciclo para tu plan</Text>
            <Switch
              value={localConfig.enabled}
              onValueChange={(enabled) => updateConfig({ enabled })}
              trackColor={{ false: '#e0e0e0', true: Colors.light.tint }}
              thumbColor={localConfig.enabled ? 'white' : '#f4f3f4'}
            />
          </View>
        </View>

        {localConfig.enabled && (
          <>
            {/* Pestañas de modo */}
            <View style={recurrenceStyles.tabsSection}>
              <View style={recurrenceStyles.tabsContainer}>
                {(['daily', 'weekly', 'monthly'] as RecurrenceMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      recurrenceStyles.tab,
                      localConfig.mode === mode && recurrenceStyles.tabActive
                    ]}
                    onPress={() => handleModeChange(mode)}
                  >
                    <Text style={[
                      recurrenceStyles.tabText,
                      localConfig.mode === mode && recurrenceStyles.tabTextActive
                    ]}>
                      {RECURRENCE_MODE_LABEL[mode]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contenido de la pestaña activa */}
            {renderTabContent()}

            {/* Sección de fecha de término */}
            <View style={recurrenceStyles.endDateSection}>
              <View style={recurrenceStyles.endDateRow}>
                <Text style={recurrenceStyles.endDateLabel}>Fecha de término</Text>
                <Switch
                  value={localConfig.hasEndDate}
                  onValueChange={(hasEndDate) => updateConfig({ hasEndDate, endDate: hasEndDate ? new Date().toISOString().split('T')[0] : null })}
                  trackColor={{ false: '#e0e0e0', true: Colors.light.tint }}
                  thumbColor={localConfig.hasEndDate ? 'white' : '#f4f3f4'}
                />
              </View>

              {localConfig.hasEndDate && (
                <TouchableOpacity
                  style={recurrenceStyles.endDateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={recurrenceStyles.endDateButtonText}>
                    {formatEndDate(localConfig.endDate) || 'Seleccionar fecha'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Botón de guardar */}
        <View style={recurrenceStyles.saveSection}>
          <TouchableOpacity style={recurrenceStyles.saveButton} onPress={handleSave}>
            <Text style={recurrenceStyles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tutorial Overlay dentro del modal de recurrencia */}
      {shouldShowTutorialInRecurrenceModal && (
        <TutorialOverlay
          visible={tutorialVisible}
          currentStep={tutorialStep}
          steps={tutorialSteps}
          onNext={onTutorialNext || (() => {})}
          onSkip={onTutorialSkip || (() => {})}
          onComplete={onTutorialComplete || (() => {})}
          beaverImage={beaverImage}
        />
      )}

      {/* Date Picker para fecha de término */}
      {showEndDatePicker && (
        <DateTimePicker
          value={localConfig.endDate ? new Date(localConfig.endDate + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

// Styles - necesito copiar los estilos del archivo original
const recurrenceStyles = {
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mainSwitchSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  mainSwitchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  mainSwitchLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
    marginLeft: 8,
  },
  mainSwitchSubtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  tabsSection: {
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center' as const,
  },
  tabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#666',
  },
  tabTextActive: {
    color: Colors.light.tint,
  },
  tabContent: {
    marginBottom: 24,
  },
  weekDaysSection: {
    marginBottom: 24,
  },
  weekDaysGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  weekDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weekDayChipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  weekDayChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#666',
  },
  weekDayChipTextSelected: {
    color: 'white',
  },
  monthDaysSection: {
    marginBottom: 24,
  },
  monthGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  monthDayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  monthDayChipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  monthDayChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#666',
  },
  monthDayChipTextSelected: {
    color: 'white',
  },
  intervalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  intervalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  intervalLabel: {
    fontSize: 16,
    color: Colors.light.text,
    marginHorizontal: 8,
  },
  stepperContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepperText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
  stepperDisabled: {
    color: '#ccc',
  },
  intervalValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center' as const,
  },
  endDateSection: {
    marginBottom: 24,
  },
  endDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  endDateLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  endDateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  endDateButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  saveSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
};
