// EventModal.tsx - Modal for creating and editing events
import React, { useRef, useEffect } from 'react';
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
}

const availableColors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];

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
}: EventModalProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // 🎯 UX: Hacer scroll automático cuando se abre el input de subtareas
  useEffect(() => {
    if (showSubtaskInput) {
      // Esperar menos tiempo y hacer scroll más suave
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150); // 🎯 UX: Reducido de 300ms a 150ms para menos zoom exagerado
    }
  }, [showSubtaskInput]);

  return (
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
              <Text style={styles.createButtonText}>{selectedEvent ? 'Editar' : 'Crear'}</Text>
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
            placeholder="Nova tarefa" 
            value={eventTitle} 
            onChangeText={setEventTitle} 
            maxLength={50} 
            autoFocus 
          />
          <Text style={styles.charCounter}>{eventTitle.length}/50</Text>

          <View style={styles.colorSection}>
            {availableColors.map(color => (
              <TouchableOpacity 
                key={color} 
                style={[
                  styles.colorCircle, 
                  { backgroundColor: color }, 
                  eventColor === color && styles.selectedColorCircle
                ]} 
                onPress={() => setEventColor(color)}
              >
                {eventColor === color && <Ionicons name="checkmark" size={16} color="white" />}
              </TouchableOpacity>
            ))}
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

          <View style={styles.subtasksSection}>
            <TouchableOpacity 
              style={styles.subtasksCard}
              onPress={() => setShowSubtaskInput(!showSubtaskInput)}
            >
              <Ionicons name="add" size={20} color={Colors.light.tint} />
              <Text style={styles.subtasksLabel}>Subtarefas</Text>
            </TouchableOpacity>

            <Text style={styles.subtasksDescription}>As subtarefas podem ser definidas como sua rotina ou lista de verificação diária</Text>

            {/* Input para nueva subtarea */}
            {showSubtaskInput && (
              <View style={styles.subtaskInputContainer}>
                <TextInput
                  style={styles.subtaskInput}
                  placeholder="Nova subtarefa..."
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
      </KeyboardAvoidingView>
    </Modal>
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
  colorSection: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  selectedColorCircle: { borderColor: Colors.light.text },
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
  bottomPadding: { height: 100 } // 🎯 UX: Espacio adicional para que el teclado no tape el contenido
};
