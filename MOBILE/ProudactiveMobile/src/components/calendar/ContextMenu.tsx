// ContextMenu.tsx - Componente compartido para menú contextual
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  currentView?: 'day' | 'week' | 'month' | 'year';
  onDuplicate: () => void;
  onDelete: () => void;
  eventTitle: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  position,
  currentView = 'week',
  onDuplicate,
  onDelete,
  eventTitle
}) => {
  if (!visible) return null;

  return (
    <View style={[
      styles.contextMenu,
      currentView === 'week' && styles.contextMenuWeek,
      {
        position: 'absolute',
        top: position.y,
        left: position.x,
        zIndex: 3000,
      }
    ]}>
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={onDuplicate}
      >
        <Text style={styles.menuIcon}>📋</Text>
        <Text style={styles.menuText}>Duplicar Evento</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.menuItem, styles.menuItemDelete]}
        onPress={onDelete}
      >
        <Text style={styles.menuIcon}>🗑️</Text>
        <Text style={[styles.menuText, styles.menuTextDelete]}>Eliminar Evento</Text>
      </TouchableOpacity>
      
      {/* Puntita/cola del menú */}
      <View style={[styles.menuTail, currentView === 'week' && styles.menuTailWeek]} />
    </View>
  );
};

const styles = StyleSheet.create({
  contextMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 180,
    position: 'relative' as const,
  },
  contextMenuWeek: {
    transform: [{ scale: 0.8 }], // 20% más pequeño (solo escala contenedor)
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemDelete: {
    backgroundColor: '#ffebee',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#333',
  },
  menuTextDelete: {
    color: '#d32f2f',
  },
  // Puntita/cola del menú (como nube de texto)
  menuTail: {
    position: 'absolute',
    bottom: -8,
    left: 12,
    marginLeft: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  menuTailWeek: {
    bottom: -6, // Ajustar para el tamaño más pequeño
    left: 10,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
  },
});

export default ContextMenu;
