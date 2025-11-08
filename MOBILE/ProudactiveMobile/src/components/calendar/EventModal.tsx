// EventModal.tsx - Modal for creating and editing events
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import AlarmSetting from './AlarmSetting';
import DatePickerSetting from './DatePickerSetting';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import { ExtendedTutorialStep } from '../tutorial/tutorialSteps';

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  eventTitle: string;
  setEventTitle: (title: string) => void;
  eventColor: string;
  setEventColor: (color: string) => void;
  recurrenceSummary: string;
  onOpenRecurrenceModal: () => void;
  subtasks: Subtask[];
  newSubtaskText: string;
  setNewSubtaskText: (text: string) => void;
  showSubtaskInput: boolean;
  setShowSubtaskInput: (show: boolean) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, text: string) => void;
  onDeleteSubtask: (id: string) => void;
  selectedEvent: any;
  onDeleteEvent: () => void;
  selectedCell?: any;
  eventDateKey?: string;
  onAlarmChange?: (enabled: boolean, option?: string) => void;
  alarmEnabled?: boolean;
  alarmOption?: string;
  onDateChange?: (dateKey: string, startTime: number) => void;
  // Props del tutorial
  tutorialVisible?: boolean;
  tutorialStep?: number;
  tutorialSteps?: ExtendedTutorialStep[];
  onTutorialNext?: () => void;
  onTutorialSkip?: () => void;
  onTutorialComplete?: () => void;
  beaverImage?: any;
}

// Colores principales (5 colores por defecto)
const DEFAULT_MAIN_COLORS = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#2196F3']; // Cambié el lila por azul

// Biblioteca completa de 25 colores (incluye los 5 principales)
const COLOR_LIBRARY = [
  // Los 5 principales (siempre estarán disponibles)
  '#6b53e2', // Morado
  '#f44336', // Rojo
  '#4caf50', // Verde
  '#ff9800', // Amarillo/Naranja
  '#2196F3', // Azul
  
  // Colores adicionales (20 más)
  '#9c27b0', // Púrpura
  '#673AB7', // Púrpura oscuro
  '#3F51B5', // Índigo
  '#00BCD4', // Cian/Turquesa
  '#009688', // Verde esmeralda
  '#8BC34A', // Lima
  '#CDDC39', // Amarillo lima
  '#FFEB3B', // Amarillo claro
  '#FFC107', // Ámbar
  '#FF5722', // Naranja oscuro
  '#E91E63', // Rosa
  '#FF4081', // Rosa vibrante
  '#F06292', // Rosa claro
  '#AB47BC', // Púrpura medio
  '#7E57C2', // Púrpura índigo
  '#5C6BC0', // Azul índigo
  '#42A5F5', // Azul claro
  '#26C6DA', // Cian claro
  '#66BB6A', // Verde claro
  '#795548', // Marrón
  '#607D8B', // Azul grisáceo
];

export default function EventModal({
  visible,
  onClose,
  onSave,
  eventTitle,
  setEventTitle,
  eventColor,
  setEventColor,
  recurrenceSummary,
  onOpenRecurrenceModal,
  subtasks,
  newSubtaskText,
  setNewSubtaskText,
  showSubtaskInput,
  setShowSubtaskInput,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  selectedEvent,
  onDeleteEvent,
  selectedCell,
  eventDateKey,
  onAlarmChange,
  alarmEnabled,
  alarmOption,
  onDateChange,
  tutorialVisible = false,
  tutorialStep = 0,
  tutorialSteps = [],
  onTutorialNext,
  onTutorialSkip,
  onTutorialComplete,
  beaverImage,
}: EventModalProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Estado para los 5 colores principales (personalizables)
  const [mainColors, setMainColors] = useState<string[]>(DEFAULT_MAIN_COLORS);
  
  // Estado para el modal de biblioteca de colores
  const [showColorLibrary, setShowColorLibrary] = useState(false);
  
  // Estado para el color seleccionado de la biblioteca que se va a reemplazar
  const [selectedColorToReplace, setSelectedColorToReplace] = useState<string | null>(null);
  
  // Referencia para hacer scroll a los círculos principales
  const colorSectionRef = useRef<View | null>(null);
  

  // 🎯 UX: Hacer scroll automático cuando se abre el input de subtareas
  useEffect(() => {
    if (showSubtaskInput) {
      // Esperar menos tiempo y hacer scroll más suave
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [showSubtaskInput]);

  // Función para seleccionar un color de la biblioteca
  const handleColorLibrarySelect = (color: string) => {
    // Guardar el color seleccionado inmediatamente
    setSelectedColorToReplace(color);
    
    // Cerrar el modal de biblioteca
    setShowColorLibrary(false);
    
    // Hacer scroll a la parte superior donde están los colores principales
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 400);
  };

  // Función para reemplazar un color principal
  const handleMainColorPress = (color: string, index: number) => {
    // Si hay un color seleccionado de la biblioteca, reemplazarlo
    if (selectedColorToReplace) {
      const newMainColors = [...mainColors];
      newMainColors[index] = selectedColorToReplace;
      setMainColors(newMainColors);
      
      // Si el color seleccionado era el que se reemplazó, actualizar también
      if (eventColor === color) {
        setEventColor(selectedColorToReplace);
      }
      
      setSelectedColorToReplace(null);
    } else {
      // Comportamiento normal: seleccionar el color para el evento
      setEventColor(color);
    }
  };

  // Verificar si el paso actual del tutorial debe mostrarse en el modal
  const currentTutorialStep = tutorialSteps && tutorialSteps.length > tutorialStep ? tutorialSteps[tutorialStep] : null;
  const shouldShowTutorialInModal = tutorialVisible && 
    visible && 
    currentTutorialStep && 
    currentTutorialStep.showInModal === true &&
    beaverImage &&
    onTutorialNext &&
    onTutorialSkip &&
    onTutorialComplete;
  
  // Hacer scroll automático si el paso lo requiere
  useEffect(() => {
    if (shouldShowTutorialInModal && currentTutorialStep?.needScroll && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [shouldShowTutorialInModal, currentTutorialStep?.needScroll]);
  
  // console.log('🐾 EventModal Tutorial Debug:', {
  //   tutorialVisible: !!tutorialVisible,
  //   visible: !!visible,
  //   tutorialStep,
  //   currentTutorialStep: currentTutorialStep?.id,
  //   showInModal: currentTutorialStep?.showInModal,
  //   shouldShowTutorialInModal: !!shouldShowTutorialInModal,
  //   needScroll: currentTutorialStep?.needScroll,
  //   hasBeaverImage: !!beaverImage,
  //   hasOnTutorialNext: !!onTutorialNext,
  //   hasOnTutorialSkip: !!onTutorialSkip,
  //   hasOnTutorialComplete: !!onTutorialComplete,
  // });

  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.fullscreenModal}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.createButton} onPress={onSave}>
              <Text style={styles.createButtonText}>{selectedEvent ? 'Guardar' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.modalContent} 
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.titleSection}>
            <Text style={styles.emoji}>☀️</Text>
            <Text style={styles.taskTitle}>Nueva tarea</Text>
            <Text style={styles.subtitle}>Toque para renombrar</Text>
          </View>

          <TextInput 
            style={styles.titleInput} 
            placeholder="Nueva tarea" 
            value={eventTitle} 
            onChangeText={setEventTitle} 
            maxLength={50} 
            autoFocus 
          />
          <Text style={styles.charCounter}>{eventTitle.length}/50</Text>

          <View 
            ref={colorSectionRef}
            style={styles.colorSection}
          >
            {/* Mensaje cuando hay un color seleccionado para reemplazar */}
            {selectedColorToReplace && (
              <View style={styles.colorReplaceMessage}>
                <Text style={styles.colorReplaceMessageText}>
                  Elige por cuál sustituir
                </Text>
                <TouchableOpacity 
                  style={styles.colorReplaceCancelButton}
                  onPress={() => setSelectedColorToReplace(null)}
                >
                  <Ionicons name="close" size={16} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.colorCirclesRow}>
              {mainColors.map((color, index) => (
                <TouchableOpacity 
                  key={`main-${color}-${index}`}
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: color }, 
                    eventColor === color && styles.selectedColorCircle,
                    selectedColorToReplace && styles.colorCircleSelectable
                  ]} 
                  onPress={() => handleMainColorPress(color, index)}
                >
                  {eventColor === color && <Ionicons name="checkmark" size={16} color="white" />}
                  {selectedColorToReplace && (
                    <View style={styles.colorCircleReplaceIndicator}>
                      <Ionicons name="swap-horizontal" size={14} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {/* Círculo con + para abrir biblioteca de colores */}
              <TouchableOpacity 
                style={styles.addColorCircle}
                onPress={() => setShowColorLibrary(true)}
              >
                <Ionicons name="add" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.configCard}>
            <DatePickerSetting
              selectedEvent={selectedEvent}
              selectedCell={selectedCell}
              eventDateKey={eventDateKey}
              onDateChange={onDateChange}
            />
          </View>

          <View style={styles.configCard}>
            <TouchableOpacity
              style={styles.configRow}
              onPress={onOpenRecurrenceModal}
            >
              <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.configLabel}>Repetir</Text>
              <Text style={styles.configValue} numberOfLines={1}>{recurrenceSummary}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.configCard}>
            <AlarmSetting
              selectedEvent={selectedEvent}
              selectedCell={selectedCell}
              eventTitle={eventTitle}
              eventDateKey={eventDateKey}
              alarmEnabled={alarmEnabled}
              alarmOption={alarmOption as any}
              onAlarmChange={onAlarmChange}
            />
          </View>

          <View style={styles.subtasksSection}>
            <TouchableOpacity 
              style={styles.subtasksCard}
              onPress={() => setShowSubtaskInput(!showSubtaskInput)}
            >
              <Ionicons name="add" size={20} color={Colors.light.tint} />
              <Text style={styles.subtasksLabel}>Subtareas</Text>
            </TouchableOpacity>

            <Text style={styles.subtasksDescription}>Las subtareas pueden ser definidas como tu rutina o lista de verificación diaria</Text>

            {/* Input para nueva subtarea */}
            {showSubtaskInput && (
              <View style={styles.subtaskInputContainer}>
                <TextInput
                  style={styles.subtaskInput}
                  placeholder="Nueva subtarea..."
                  value={newSubtaskText}
                  onChangeText={setNewSubtaskText}
                  onSubmitEditing={onAddSubtask}
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.subtaskAddButton}
                  onPress={onAddSubtask}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* Lista de subtareas */}
            {subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskItem}>
                <TouchableOpacity
                  style={[
                    styles.subtaskCheckbox,
                    subtask.completed && styles.subtaskCheckboxCompleted
                  ]}
                  onPress={() => onToggleSubtask(subtask.id)}
                >
                  {subtask.completed && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
                
                <TextInput
                  style={[
                    styles.subtaskText,
                    subtask.completed && styles.subtaskTextCompleted
                  ]}
                  value={subtask.text}
                  onChangeText={(text) => onEditSubtask(subtask.id, text)}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.subtaskDeleteButton}
                  onPress={() => onDeleteSubtask(subtask.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Botón de borrar - solo visible cuando se está editando un evento */}
          {selectedEvent && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDeleteEvent}>
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
              <Text style={styles.deleteButtonText}>Borrar evento</Text>
            </TouchableOpacity>
          )}
          
          {/* Padding adicional para evitar que el botón de borrar quede oculto detrás de los botones del celular */}
          <View style={styles.bottomPadding} />
        </ScrollView>
        </View>

        {/* Tutorial Overlay dentro del modal */}
        {shouldShowTutorialInModal && (
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
      </KeyboardAvoidingView>
    </Modal>
    
    {/* Pantalla de biblioteca de colores (pantalla completa) */}
    <Modal
      visible={showColorLibrary}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowColorLibrary(false)}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.colorLibraryScreen}>
          <View style={[styles.colorLibraryHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              style={styles.colorLibraryBackButton}
              onPress={() => setShowColorLibrary(false)}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.colorLibraryTitle}>Biblioteca de Colores</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <Text style={styles.colorLibrarySubtitle}>
            Toca un color para reemplazar uno de los 5 principales
          </Text>
          
          <ScrollView 
            style={styles.colorLibraryScroll}
            contentContainerStyle={styles.colorLibraryGrid}
            showsVerticalScrollIndicator={true}
          >
            {COLOR_LIBRARY.length > 0 ? COLOR_LIBRARY.map((color, index) => {
              const isInMainColors = mainColors.includes(color);
              
              return (
                <TouchableOpacity
                  key={`lib-${color}-${index}`}
                  style={[
                    styles.colorLibraryItem,
                    { backgroundColor: color },
                    isInMainColors && styles.colorLibraryItemInUse
                  ]}
                  onPress={() => handleColorLibrarySelect(color)}
                  activeOpacity={0.7}
                >
                  {isInMainColors && (
                    <View style={styles.colorLibraryInUseBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }) : (
              <Text style={{ color: Colors.light.text, textAlign: 'center', marginTop: 20 }}>
                No hay colores disponibles
              </Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const styles = {
  fullscreenModal: { flex: 1, backgroundColor: '#f0f8ff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f0f8ff' },
  closeButton: { padding: 8 },
  createButton: { backgroundColor: Colors.light.tint, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  createButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  titleSection: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 60, marginBottom: 10 },
  taskTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  titleInput: { fontSize: 18, fontWeight: '500', color: Colors.light.text, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12, marginBottom: 8 },
  charCounter: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 20 },
  colorSection: { flexDirection: 'column', alignItems: 'center', marginBottom: 30, width: '100%' },
  colorReplaceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.light.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorReplaceMessageText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.tint,
    flex: 1,
    textAlign: 'center',
  },
  colorReplaceCancelButton: {
    padding: 4,
  },
  colorCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  colorCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: 'transparent', 
    marginHorizontal: 6,
    position: 'relative',
  },
  selectedColorCircle: { borderColor: Colors.light.text },
  colorCircleSelectable: {
    borderColor: Colors.light.tint,
    borderWidth: 3,
  },
  colorCircleReplaceIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  configRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  configLabel: { fontSize: 16, color: Colors.light.text, marginLeft: 12, flex: 1 },
  configValue: { fontSize: 14, color: '#666', marginRight: 8, flex: 1, textAlign: 'right' },
  subtasksSection: { marginBottom: 16 },
  subtasksCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subtasksLabel: { fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  subtasksDescription: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 16, marginBottom: 12 },
  subtaskInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  subtaskInput: { flex: 1, fontSize: 16, color: Colors.light.text },
  subtaskAddButton: { backgroundColor: Colors.light.tint, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  subtaskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 8 
  },
  subtaskCheckbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#e0e0e0', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  subtaskCheckboxCompleted: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  subtaskText: { flex: 1, fontSize: 16, color: Colors.light.text, marginRight: 12 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#666' },
  subtaskDeleteButton: { padding: 8 },
  deleteButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  deleteButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#ff4444',
    marginLeft: 8
  },
  bottomPadding: { height: 100 }, // 🎯 UX: Espacio adicional para que el teclado no tape el contenido
  addColorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    backgroundColor: 'white',
    marginHorizontal: 6,
  },
  // Estilos para la pantalla de biblioteca de colores
  colorLibraryScreen: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  colorLibraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f0f8ff',
  },
  colorLibraryBackButton: {
    padding: 8,
  },
  colorLibraryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  colorLibrarySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  colorLibraryScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  colorLibraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingBottom: 20,
  },
  colorLibraryItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  colorLibraryItemInUse: {
    borderColor: Colors.light.tint,
    borderWidth: 3,
  },
  colorLibraryInUseBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
};
