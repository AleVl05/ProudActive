import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  SafeAreaView
} from 'react-native';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE } from '../../src/config/api';
import authService from '../../services/auth';

// Helper para obtener headers autenticados
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

interface MarketItem {
  id: string;
  name: string;
  checked: boolean;
}

// API Functions
async function apiGetMarketItems() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/market-items`, { headers });
  return res;
}

async function apiCreateMarketItem(name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/market-items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });
  return res;
}

async function apiDeleteMarketItem(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/market-items/${id}`, {
    method: 'DELETE',
    headers
  });
  return res;
}

async function apiToggleMarketItem(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/market-items/${id}/toggle`, {
    method: 'POST',
    headers
  });
  return res;
}

async function apiDeleteAllMarketItems() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/market-items`, {
    method: 'DELETE',
    headers
  });
  return res;
}

export default function MarketScreen() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar ítems al montar el componente
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await apiGetMarketItems();
      
      if (response.ok) {
        const data = await response.json();
        // Laravel devuelve directamente el array
        if (Array.isArray(data)) {
          // Normalizar IDs a string para consistencia
          const normalizedItems = data.map((item: any) => ({
            ...item,
            id: String(item.id)
          }));
          setItems(normalizedItems);
        }
      }
    } catch (error) {
      console.error('❌ Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (newItemName.trim() === '') {
      return;
    }

    try {
      setLoading(true);
      const response = await apiCreateMarketItem(newItemName.trim());
      
      if (response.ok) {
        const item = await response.json();
        // Laravel devuelve directamente el objeto creado
        // Normalizar ID a string para consistencia
        const normalizedItem = {
          ...item,
          id: String(item.id)
        };
        setItems(prevItems => [...prevItems, normalizedItem]);
        setNewItemName('');
      }
    } catch (error) {
      console.error('❌ Error creating item:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (id: string) => {
    try {
      console.log('🔄 Toggling item:', id);
      const response = await apiToggleMarketItem(id);
      console.log('📡 Toggle API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Toggle API Response data:', data);
        // La API devuelve directamente el objeto item, no un objeto con success/item
        if (data && data.id) {
          setItems(prevItems =>
            prevItems.map(item =>
              item.id === String(id) ? { ...item, checked: data.checked } : item
            )
          );
          console.log('✅ Item toggled successfully');
        }
      } else {
        console.error('❌ Toggle API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error toggling item:', error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      console.log('🗑️ Deleting item:', id);
      const response = await apiDeleteMarketItem(id);
      console.log('📡 Delete API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Delete API Response data:', data);
        // La API devuelve {"message": "..."}, no tiene success, pero si response.ok es true, fue exitoso
          setItems(prevItems => prevItems.filter(item => item.id !== id));
          console.log('✅ Item deleted successfully');
      } else {
        console.error('❌ Delete API Error:', response.status, response.statusText);
        // Si es 404, el item ya no existe, así que lo eliminamos del estado de todas formas
        if (response.status === 404) {
          setItems(prevItems => prevItems.filter(item => item.id !== id));
        }
      }
    } catch (error) {
      console.error('❌ Error deleting item:', error);
    }
  };

  const deleteAllItems = () => {
    if (items.length === 0) {
      return;
    }

    Alert.alert(
      'Eliminar todo',
      '¿Estás seguro de que quieres eliminar todos los ítems?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🗑️ Deleting all items...');
              const response = await apiDeleteAllMarketItems();
              console.log('📡 Delete All API Response status:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('📦 Delete All API Response data:', data);
                // La API devuelve {"message": "..."}, no tiene success, pero si response.ok es true, fue exitoso
                  setItems([]);
                  console.log('✅ All items deleted successfully');
              } else {
                console.error('❌ Delete All API Error:', response.status, response.statusText);
              }
            } catch (error) {
              console.error('❌ Error deleting all items:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: MarketItem }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => toggleItem(item.id)}
      >
        <View style={styles.itemLeft}>
          <View style={[
            styles.checkbox,
            item.checked && styles.checkboxChecked
          ]}>
            {item.checked && (
              <IconSymbol name="checkmark" size={16} color="white" />
            )}
          </View>
          <Text style={[
            styles.itemText,
            item.checked && styles.itemTextChecked
          ]}>
            {item.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item.id)}
        >
          <IconSymbol name="trash" size={20} color="#ff4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mercado</Text>
        <Text style={styles.subtitle}>Lista de compras</Text>
      </View>

      {/* Sección de Mercado */}
      <View style={styles.marketSection}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Agregar ítem (pan, queso, etc.)"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={addItem}
            returnKeyType="done"
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.addButton, loading && styles.addButtonDisabled]} 
            onPress={addItem}
            disabled={loading}
          >
            <IconSymbol name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.deleteAllButton} onPress={deleteAllItems}>
              <IconSymbol name="trash" size={16} color="#ff4444" />
              <Text style={styles.deleteAllText}>Eliminar todo</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.marketList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="cart" size={32} color={Colors.light.text} />
              <Text style={styles.emptyText}>Lista vacía</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  deleteAllText: {
    color: '#ff4444',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemContainer: {
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  itemText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
  },
  // Market section styles
  marketSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  marketList: {
    flex: 1,
  },
});
