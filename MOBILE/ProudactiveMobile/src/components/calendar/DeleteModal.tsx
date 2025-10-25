// DeleteModal.tsx - Modal for confirming event deletion
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors } from '../../../constants/theme';

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteSingle: () => void;
  onDeleteSeries: () => void;
}

export default function DeleteModal({
  visible,
  onClose,
  onDeleteSingle,
  onDeleteSeries,
}: DeleteModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.deleteModalOverlay}>
        <View style={styles.deleteModalContent}>
          <Text style={styles.deleteModalTitle}>¿Borrar evento?</Text>
          <Text style={styles.deleteModalMessage}>
            ¿Quieres borrar solo este evento o toda la secuencia?
          </Text>
          
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity 
              style={[styles.deleteModalButton, styles.deleteModalButtonSecondary]}
              onPress={onDeleteSingle}
            >
              <Text style={styles.deleteModalButtonTextSecondary}>Solo este evento</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.deleteModalButton, styles.deleteModalButtonPrimary]}
              onPress={onDeleteSeries}
            >
              <Text style={styles.deleteModalButtonTextPrimary}>Toda la secuencia</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteModalCancel}
            onPress={onClose}
          >
            <Text style={styles.deleteModalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  deleteModalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  deleteModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  deleteModalButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteModalButtonPrimary: {
    backgroundColor: '#ff4444',
  },
  deleteModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  deleteModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'white',
  },
  deleteModalCancel: {
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  deleteModalCancelText: {
    fontSize: 16,
    color: '#666',
  },
};
