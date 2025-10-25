import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';

interface SubtaskChangesModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyThisDay: () => void;
  onApplyToSeries: () => void;
  changesCount: {
    added: number;
    removed: number;
    modified: number;
  };
}

const SubtaskChangesModal: React.FC<SubtaskChangesModalProps> = ({
  visible,
  onClose,
  onApplyThisDay,
  onApplyToSeries,
  changesCount
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Cambios en Subtareas</Text>
          
          <ScrollView style={styles.contentContainer}>
            <Text style={styles.description}>
              Has modificado las subtareas de este evento recurrente.
            </Text>
            
            {changesCount.added > 0 && (
              <Text style={styles.changeItem}>
                • {changesCount.added} subtarea{changesCount.added > 1 ? 's' : ''} agregada{changesCount.added > 1 ? 's' : ''}
              </Text>
            )}
            
            {changesCount.removed > 0 && (
              <Text style={styles.changeItem}>
                • {changesCount.removed} subtarea{changesCount.removed > 1 ? 's' : ''} eliminada{changesCount.removed > 1 ? 's' : ''}
              </Text>
            )}
            
            {changesCount.modified > 0 && (
              <Text style={styles.changeItem}>
                • {changesCount.modified} subtarea{changesCount.modified > 1 ? 's' : ''} modificada{changesCount.modified > 1 ? 's' : ''}
              </Text>
            )}
            
            <Text style={styles.question}>
              ¿Dónde quieres aplicar estos cambios?
            </Text>
            
            <Text style={styles.note}>
              Nota: Los estados completados ya guardados se mantendrán como historial.
            </Text>
          </ScrollView>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.thisDayButton]}
              onPress={onApplyThisDay}
            >
              <Text style={styles.buttonText}>Solo este día</Text>
              <Text style={styles.buttonSubtext}>
                Liberar esta instancia
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.seriesButton]}
              onPress={onApplyToSeries}
            >
              <Text style={styles.buttonText}>Toda la serie</Text>
              <Text style={styles.buttonSubtext}>
                Aplicar a todas las instancias
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelText]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    padding: 20,
    paddingBottom: 10,
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 22,
  },
  changeItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    marginLeft: 10,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  note: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 16,
  },
  buttonsContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  thisDayButton: {
    backgroundColor: Colors.primary,
  },
  seriesButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  cancelText: {
    color: '#666',
  },
});

export default SubtaskChangesModal;

