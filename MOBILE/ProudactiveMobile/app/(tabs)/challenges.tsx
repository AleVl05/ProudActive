import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
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

interface Recipe {
  id: string;
  title: string;
  content: string;
  ingredients: any;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
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

// Recipe API Functions
async function apiGetRecipes() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes`, { headers });
  return res;
}

async function apiCreateRecipe(title: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, content }),
  });
  return res;
}

async function apiDeleteRecipe(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE',
    headers
  });
  return res;
}

export default function MarketScreen() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Recipe states
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeContent, setNewRecipeContent] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState('');

  // Cargar ítems al montar el componente
  useEffect(() => {
    loadItems();
    loadRecipes();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await apiGetMarketItems();
      
      if (response.ok) {
        const data = await response.json();
        // Laravel devuelve directamente el array
        if (Array.isArray(data)) {
          setItems(data);
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
        setItems(prevItems => [...prevItems, item]);
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
        if (data.success && data.item) {
          setItems(prevItems =>
            prevItems.map(item =>
              item.id === id ? { ...item, checked: data.item.checked } : item
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
        if (data.success) {
          setItems(prevItems => prevItems.filter(item => item.id !== id));
          console.log('✅ Item deleted successfully');
        }
      } else {
        console.error('❌ Delete API Error:', response.status, response.statusText);
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
                if (data.success) {
                  setItems([]);
                  console.log('✅ All items deleted successfully');
                }
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

  // Recipe functions
  const loadRecipes = async () => {
    try {
      const response = await apiGetRecipes();
      
      if (response.ok) {
        const data = await response.json();
        // Laravel devuelve directamente el array
        if (Array.isArray(data)) {
          setRecipes(data);
        }
      }
    } catch (error) {
      console.error('❌ Error loading recipes:', error);
    }
  };

  const addRecipe = async () => {
    if (newRecipeTitle.trim() === '' || newRecipeContent.trim() === '') {
      return;
    }

    try {
      setLoading(true);
      const response = await apiCreateRecipe(newRecipeTitle.trim(), newRecipeContent.trim());
      
      if (response.ok) {
        const recipe = await response.json();
        // Laravel devuelve directamente el objeto creado
        setRecipes(prevRecipes => [...prevRecipes, recipe]);
        setNewRecipeTitle('');
        setNewRecipeContent('');
        setShowRecipeForm(false);
      }
    } catch (error) {
      console.error('❌ Error creating recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      console.log('🗑️ Deleting recipe:', id);
      const response = await apiDeleteRecipe(id);
      console.log('📡 Delete Recipe API Response status:', response.status);
      
      if (response.ok) {
        setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== id));
        console.log('✅ Recipe deleted successfully');
      } else {
        console.error('❌ Delete Recipe API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error deleting recipe:', error);
    }
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setEditingTitle(recipe.title);
    setEditingContent(recipe.content);
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setRecipeModalVisible(true);
  };

  const closeRecipeModal = () => {
    setRecipeModalVisible(false);
    setSelectedRecipe(null);
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setEditingTitle('');
    setEditingContent('');
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setIsEditingContent(true); // También activar edición de contenido
  };

  const saveTitleEdit = async () => {
    if (!selectedRecipe || editingTitle.trim() === '') return;
    
    try {
      // Aquí podrías agregar una API call para actualizar el título y contenido
      // Por ahora solo actualizamos el estado local
      setRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === selectedRecipe.id 
            ? { ...recipe, title: editingTitle.trim(), content: editingContent.trim() }
            : recipe
        )
      );
      setSelectedRecipe({ 
        ...selectedRecipe, 
        title: editingTitle.trim(), 
        content: editingContent.trim() 
      });
      setIsEditingTitle(false);
      setIsEditingContent(false);
    } catch (error) {
      console.error('❌ Error updating recipe:', error);
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle(selectedRecipe?.title || '');
    setEditingContent(selectedRecipe?.content || '');
    setIsEditingTitle(false);
    setIsEditingContent(false);
  };

  const startEditingContent = () => {
    setIsEditingContent(true);
  };

  const saveContentEdit = async () => {
    if (!selectedRecipe || editingContent.trim() === '') return;
    
    try {
      // Aquí podrías agregar una API call para actualizar el contenido
      // Por ahora solo actualizamos el estado local
      setRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === selectedRecipe.id 
            ? { ...recipe, content: editingContent.trim() }
            : recipe
        )
      );
      setSelectedRecipe({ ...selectedRecipe, content: editingContent.trim() });
      setIsEditingContent(false);
    } catch (error) {
      console.error('❌ Error updating recipe content:', error);
    }
  };

  const cancelContentEdit = () => {
    setEditingContent(selectedRecipe?.content || '');
    setIsEditingContent(false);
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

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeContainer}>
      <TouchableOpacity 
        style={styles.recipeContent}
        onPress={() => openRecipeModal(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.recipeTitle}>{item.title}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {item.content}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.recipeDeleteButton}
        onPress={() => deleteRecipe(item.id)}
      >
        <IconSymbol name="trash" size={16} color="#ff4444" />
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

      {/* Sección de Recetas */}
      <View style={styles.recipesSection}>
        <View style={styles.recipesHeader}>
          <Text style={styles.recipesTitle}>Mis Recetas</Text>
          <TouchableOpacity 
            style={styles.addRecipeButton}
            onPress={() => setShowRecipeForm(!showRecipeForm)}
          >
            <IconSymbol name="plus" size={16} color="white" />
            <Text style={styles.addRecipeText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {showRecipeForm && (
          <View style={styles.recipeForm}>
            <TextInput
              style={styles.recipeTitleInput}
              placeholder="Título de la receta"
              value={newRecipeTitle}
              onChangeText={setNewRecipeTitle}
            />
            <TextInput
              style={styles.recipeContentInput}
              placeholder="Ingredientes y preparación..."
              value={newRecipeContent}
              onChangeText={setNewRecipeContent}
              multiline
              numberOfLines={3}
            />
            <View style={styles.recipeFormActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowRecipeForm(false);
                  setNewRecipeTitle('');
                  setNewRecipeContent('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveRecipeButton}
                onPress={addRecipe}
                disabled={loading}
              >
                <Text style={styles.saveRecipeButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={recipe => recipe.id}
          style={styles.recipesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyRecipesContainer}>
              <IconSymbol name="book" size={32} color={Colors.light.text} />
              <Text style={styles.emptyRecipesText}>Sin recetas</Text>
            </View>
          }
        />
      </View>

      {/* Modal para mostrar receta completa - Bloc de notas */}
      <Modal
        visible={recipeModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeRecipeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header mejorado */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={closeRecipeModal}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
              <Text style={styles.backButtonText}>Atrás</Text>
            </TouchableOpacity>
            
            {isEditingTitle ? (
              <View style={styles.titleEditContainer}>
                <TextInput
                  style={styles.titleEditInput}
                  value={editingTitle}
                  onChangeText={setEditingTitle}
                  autoFocus
                  maxLength={50}
                  placeholder="Título de la receta"
                />
                <View style={styles.titleEditActions}>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={saveTitleEdit}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={cancelTitleEdit}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.titleDisplayContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedRecipe?.title || 'Receta'}
                </Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={startEditingTitle}
                >
                  <Ionicons name="pencil" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Contenido editable como bloc de notas */}
          <View style={styles.notepadContainer}>
            {isEditingContent ? (
              <View style={styles.contentEditContainer}>
                <View style={styles.contentEditHeader}>
                  <Text style={styles.editLabel}>Editando receta</Text>
                  <View style={styles.contentEditActions}>
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={saveContentEdit}
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={cancelContentEdit}
                    >
                      <Ionicons name="close" size={16} color="white" />
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.contentTextInput}
                  value={editingContent}
                  onChangeText={setEditingContent}
                  multiline
                  textAlignVertical="top"
                  placeholder="Escribe los ingredientes y preparación aquí..."
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.contentDisplayContainer}>
                <View style={styles.contentHeader}>
                  <Text style={styles.contentLabel}>Receta</Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={startEditingContent}
                  >
                    <Ionicons name="pencil" size={16} color="white" />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.contentScrollView} showsVerticalScrollIndicator={true}>
                  <Text style={styles.modalRecipeContent}>
                    {selectedRecipe?.content || 'No hay contenido'}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  // Recipe section styles
  recipesSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recipesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recipesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addRecipeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  recipeForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recipeTitleInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  recipeContentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  recipeFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  saveRecipeButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveRecipeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  recipesList: {
    flex: 1,
  },
  recipeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
  },
  recipeDeleteButton: {
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  emptyRecipesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyRecipesText: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.6,
    marginTop: 8,
  },
  // Modal styles - Bloc de notas profesional
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: Colors.light.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  titleDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  titleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  titleEditInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
  },
  titleEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Bloc de notas container
  notepadContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  contentDisplayContainer: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  contentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalRecipeContent: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 26,
    textAlign: 'left',
  },
  // Edición de contenido
  contentEditContainer: {
    flex: 1,
  },
  contentEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  contentEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contentTextInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
