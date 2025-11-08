import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
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

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

interface ChecklistBlock {
  id: string;
  type: 'checklist';
  items: ChecklistItem[];
}

type NoteBlock = TextBlock | ChecklistBlock;

interface Note {
  id: string;
  title: string;
  content: string; // Mantener para compatibilidad, pero usar blocks
  blocks?: NoteBlock[]; // Nueva estructura: bloques de texto y checklist intercalados
  checklist?: ChecklistItem[]; // Mantener para compatibilidad
  created_at: string;
  updated_at: string;
}

// API Functions
async function apiGetNotes() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notes`, { headers });
  return res;
}

async function apiCreateNote(title: string, content: string, checklist?: any[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, content, checklist }),
  });
  return res;
}

async function apiUpdateNote(id: string, title: string, content: string, blocks?: any[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title, content, blocks }),
  });
  return res;
}

async function apiDeleteNote(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
    headers
  });
  return res;
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState(''); // Mantener para compatibilidad
  const [editingBlocks, setEditingBlocks] = useState<NoteBlock[]>([]);
  const [editingTextBlockId, setEditingTextBlockId] = useState<string | null>(null);
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('');
  const [loading, setLoading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar notas al montar el componente
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await apiGetNotes();
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setNotes(data);
        }
      }
    } catch (error) {
      console.error('❌ Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (newNoteTitle.trim() === '' && newNoteContent.trim() === '') {
      return;
    }

    try {
      setLoading(true);
      const title = newNoteTitle.trim() || 'Nota sin título';
      const response = await apiCreateNote(title, newNoteContent.trim());
      
      if (response.ok) {
        const note = await response.json();
        setNotes(prevNotes => [note, ...prevNotes]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowNoteForm(false);
      }
    } catch (error) {
      console.error('❌ Error creating note:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const response = await apiDeleteNote(id);
      
      if (response.ok) {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        if (selectedNote?.id === id) {
          closeNoteModal();
        }
      }
    } catch (error) {
      console.error('❌ Error deleting note:', error);
    }
  };

  const openNoteModal = (note: Note) => {
    setSelectedNote(note);
    setEditingTitle(note.title);
    setEditingContent(note.content || '');
    
    // Si tiene blocks, usarlos; si no, crear blocks desde content y checklist
    if (note.blocks && note.blocks.length > 0) {
      // Asegurar que todos los blocks tengan IDs únicos
      const blocksWithIds = note.blocks.map((block, index) => ({
        ...block,
        id: block.id || `${Date.now()}_${index}`,
      }));
      console.log('📝 Cargando blocks:', blocksWithIds.map(b => ({ id: b.id, type: b.type })));
      setEditingBlocks(blocksWithIds);
    } else {
      // Migrar de estructura antigua a nueva
      const blocks: NoteBlock[] = [];
      if (note.content) {
        blocks.push({
          id: `${Date.now()}_text`,
          type: 'text',
          content: note.content,
        });
      }
      if (note.checklist && note.checklist.length > 0) {
        blocks.push({
          id: `${Date.now() + 1}_checklist`,
          type: 'checklist',
          items: note.checklist,
        });
      }
      setEditingBlocks(blocks.length > 0 ? blocks : []);
    }
    
    setIsEditingTitle(false);
    setEditingTextBlockId(null);
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
    setNoteModalVisible(true);
  };

  const closeNoteModal = async () => {
    // Guardar antes de cerrar
    if (selectedNote) {
      await saveNoteAuto();
    }
    setNoteModalVisible(false);
    setSelectedNote(null);
    setIsEditingTitle(false);
    setEditingTitle('');
    setEditingContent('');
    setEditingBlocks([]);
    setEditingTextBlockId(null);
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const saveTitleEdit = async () => {
    if (!selectedNote) return;
    
    try {
      const contentBlocks = editingBlocks.filter(b => b.type === 'text') as TextBlock[];
      const content = contentBlocks.map(b => b.content).join('\n\n');
      
      const response = await apiUpdateNote(
        selectedNote.id,
        editingTitle.trim() || 'Nota sin título',
        content,
        editingBlocks
      );
      
      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === selectedNote.id ? updatedNote : note
          )
        );
        setSelectedNote(updatedNote);
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error('❌ Error updating note:', error);
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle(selectedNote?.title || '');
    setIsEditingTitle(false);
  };

  // Guardar automáticamente con debounce
  const saveNoteAuto = async () => {
    if (!selectedNote) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Generar content desde blocks para compatibilidad
        const contentBlocks = editingBlocks.filter(b => b.type === 'text') as TextBlock[];
        const content = contentBlocks.map(b => b.content).join('\n\n');
        
        console.log('💾 Guardando nota:', {
          id: selectedNote.id,
          blocksCount: editingBlocks.length,
          blocks: editingBlocks,
        });
        
        const response = await apiUpdateNote(
          selectedNote.id,
          editingTitle.trim() || 'Nota sin título',
          content,
          editingBlocks
        );
        
        if (response.ok) {
          const updatedNote = await response.json();
          console.log('✅ Nota guardada:', {
            id: updatedNote.id,
            blocksCount: updatedNote.blocks?.length || 0,
            blocks: updatedNote.blocks,
          });
          setNotes(prevNotes => 
            prevNotes.map(note => 
              note.id === selectedNote.id ? updatedNote : note
            )
          );
          setSelectedNote(updatedNote);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Error guardando nota:', errorData);
        }
      } catch (error) {
        console.error('❌ Error auto-saving note:', error);
      }
    }, 500);
  };

  // Funciones para bloques de texto
  const addTextBlock = async () => {
    const newBlock: TextBlock = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      content: '',
    };
    setEditingBlocks(prev => [...prev, newBlock]);
    setEditingTextBlockId(newBlock.id);
    // Guardar automáticamente
    if (selectedNote) {
      await saveNoteAuto();
    }
  };

  const updateTextBlock = async (blockId: string, content: string) => {
    setEditingBlocks(prev =>
      prev.map(block =>
        block.id === blockId && block.type === 'text'
          ? { ...block, content }
          : block
      )
    );
    await saveNoteAuto();
  };

  const deleteTextBlock = async (blockId: string) => {
    setEditingBlocks(prev => prev.filter(block => block.id !== blockId));
    await saveNoteAuto();
  };

  // Funciones para bloques de checklist
  const addChecklistBlock = async () => {
    const newBlock: ChecklistBlock = {
      id: `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'checklist',
      items: [],
    };
    setEditingBlocks(prev => [...prev, newBlock]);
    // Guardar automáticamente
    if (selectedNote) {
      await saveNoteAuto();
    }
  };

  const toggleChecklistItem = async (blockId: string, itemId: string) => {
    setEditingBlocks(prev =>
      prev.map(block => {
        if (block.id === blockId && block.type === 'checklist') {
          return {
            ...block,
            items: block.items.map(item =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          };
        }
        return block;
      })
    );
    await saveNoteAuto();
  };

  const addChecklistItem = async (blockId: string, text: string = '') => {
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      completed: false,
    };
    
    setEditingBlocks(prev =>
      prev.map(block => {
        if (block.id === blockId && block.type === 'checklist') {
          return {
            ...block,
            items: [...block.items, newItem],
          };
        }
        return block;
      })
    );
    
    if (text.trim() === '') {
      setEditingChecklistItemId(newItem.id);
      setEditingChecklistItemText('');
    }
    
    // Guardar automáticamente después de agregar item
    if (selectedNote) {
      await saveNoteAuto();
    }
  };

  const deleteChecklistItem = async (blockId: string, itemId: string) => {
    setEditingBlocks(prev =>
      prev.map(block => {
        if (block.id === blockId && block.type === 'checklist') {
          return {
            ...block,
            items: block.items.filter(item => item.id !== itemId),
          };
        }
        return block;
      })
    );
    await saveNoteAuto();
  };

  const deleteChecklistBlock = async (blockId: string) => {
    console.log('🗑️ Eliminando checklist block:', blockId);
    console.log('📋 Blocks antes:', editingBlocks.map(b => ({ id: b.id, type: b.type })));
    
    setEditingBlocks(prev => {
      const filtered = prev.filter(block => {
        // Comparación estricta de IDs
        const shouldKeep = String(block.id) !== String(blockId);
        if (!shouldKeep) {
          console.log('❌ Eliminando block:', block.id, block.type);
        }
        return shouldKeep;
      });
      console.log('📋 Blocks después:', filtered.map(b => ({ id: b.id, type: b.type })));
      return filtered;
    });
    
    await saveNoteAuto();
  };

  const startEditingChecklistItem = (item: ChecklistItem) => {
    setEditingChecklistItemId(item.id);
    setEditingChecklistItemText(item.text);
  };

  const saveChecklistItemEdit = async (blockId: string, itemId: string) => {
    const text = editingChecklistItemText.trim();
    
    if (text === '') {
      // Si el texto está vacío, eliminar el item
      await deleteChecklistItem(blockId, itemId);
      setEditingChecklistItemId(null);
      setEditingChecklistItemText('');
      return;
    }
    
    setEditingBlocks(prev =>
      prev.map(block => {
        if (block.id === blockId && block.type === 'checklist') {
          return {
            ...block,
            items: block.items.map(item =>
              item.id === itemId ? { ...item, text } : item
            ),
          };
        }
        return block;
      })
    );
    
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
    await saveNoteAuto();
  };

  const cancelChecklistItemEdit = () => {
    setEditingChecklistItemId(null);
    setEditingChecklistItemText('');
  };

  // Componente para input de checklist item
  const ChecklistItemInput = ({ blockId, onAddItem, onDeleteBlock }: { blockId: string; onAddItem: (blockId: string, text?: string) => void; onDeleteBlock: () => void }) => {
    const [inputText, setInputText] = useState('');
    
    const handleAddItem = (text?: string) => {
      if (text?.trim()) {
        onAddItem(blockId, text);
        setInputText('');
      } else if (!text) {
        onAddItem(blockId);
      }
    };
    
    return (
      <View style={styles.addChecklistItemContainer}>
        <TextInput
          style={styles.addChecklistItemInput}
          placeholder="Agregar tarea..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleAddItem(inputText)}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.addChecklistItemButton}
          onPress={() => handleAddItem(inputText)}
        >
          <Ionicons name="add-circle" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderNote = ({ item }: { item: Note }) => (
    <View style={styles.noteContainer}>
      <TouchableOpacity 
        style={styles.noteContent}
        onPress={() => openNoteModal(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.noteDescription} numberOfLines={3}>
          {item.content || 'Sin contenido'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.noteDeleteButton}
        onPress={() => deleteNote(item.id)}
      >
        <IconSymbol name="trash" size={16} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notas</Text>
        <Text style={styles.subtitle}>Tus notas personales</Text>
      </View>

      {/* Header con botón de nueva nota */}
      <View style={styles.notesHeader}>
        <TouchableOpacity 
          style={styles.addNoteButton}
          onPress={() => setShowNoteForm(!showNoteForm)}
        >
          <IconSymbol name="plus" size={18} color="white" />
          <Text style={styles.addNoteText}>Nueva Nota</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario para nueva nota */}
      {showNoteForm && (
        <View style={styles.noteForm}>
          <TextInput
            style={styles.noteTitleInput}
            placeholder="Título de la nota (opcional)"
            value={newNoteTitle}
            onChangeText={setNewNoteTitle}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.noteContentInput}
            placeholder="Escribe tu nota aquí..."
            value={newNoteContent}
            onChangeText={setNewNoteContent}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
          <View style={styles.noteFormActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowNoteForm(false);
                setNewNoteTitle('');
                setNewNoteContent('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveNoteButton, loading && styles.saveNoteButtonDisabled]}
              onPress={addNote}
              disabled={loading}
            >
              <Text style={styles.saveNoteButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lista de notas */}
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={note => note.id}
        style={styles.notesList}
        contentContainerStyle={styles.notesListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="book" size={48} color={Colors.light.text} />
            <Text style={styles.emptyText}>No hay notas aún</Text>
            <Text style={styles.emptySubtext}>Crea tu primera nota para comenzar</Text>
          </View>
        }
      />

      {/* Modal para mostrar nota completa - Bloc de notas */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeNoteModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header mejorado */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={closeNoteModal}
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
                  maxLength={100}
                  placeholder="Título de la nota"
                  placeholderTextColor="#999"
                />
                <View style={styles.titleEditActions}>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={saveTitleEdit}
                    disabled={loading}
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
                  {selectedNote?.title || 'Nota'}
                </Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.textBlockButton}
                    onPress={addTextBlock}
                  >
                    <Text style={styles.textBlockButtonText}>T</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.checklistButton}
                    onPress={addChecklistBlock}
                  >
                    <Ionicons name="checkbox-outline" size={18} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={startEditingTitle}
                  >
                    <Ionicons name="pencil" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          {/* Contenido editable como bloc de notas - bloques intercalados */}
          <View style={styles.notepadContainer}>
            <ScrollView 
              style={styles.contentScrollView} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Renderizar bloques en orden */}
              {editingBlocks.map((block) => {
                if (block.type === 'text') {
                  return (
                    <View key={block.id} style={styles.textBlockContainer}>
                      <TextInput
                        style={styles.textBlockInput}
                        value={block.content}
                        onChangeText={(text) => updateTextBlock(block.id, text)}
                        multiline
                        textAlignVertical="top"
                        placeholder="Escribe tu texto aquí..."
                        placeholderTextColor="#999"
                        autoFocus={editingTextBlockId === block.id}
                      />
                      <TouchableOpacity
                        style={styles.deleteBlockButton}
                        onPress={() => deleteTextBlock(block.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  );
                } else {
                  // Checklist block
                  return (
                    <View key={block.id} style={styles.checklistBlockContainer}>
                      {block.items.map((item) => (
                        <View key={item.id} style={styles.checklistItem}>
                          <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => toggleChecklistItem(block.id, item.id)}
                          >
                            <Ionicons
                              name={item.completed ? "checkbox" : "square-outline"}
                              size={24}
                              color={item.completed ? Colors.light.tint : Colors.light.text}
                            />
                          </TouchableOpacity>
                          {editingChecklistItemId === item.id ? (
                            <TextInput
                              style={styles.checklistItemTextInput}
                              value={editingChecklistItemText}
                              onChangeText={setEditingChecklistItemText}
                              onBlur={() => saveChecklistItemEdit(block.id, item.id)}
                              onSubmitEditing={() => saveChecklistItemEdit(block.id, item.id)}
                              autoFocus
                              placeholder="Tarea..."
                              placeholderTextColor="#999"
                            />
                          ) : (
                            <TouchableOpacity
                              style={styles.checklistItemTextContainer}
                              onPress={() => startEditingChecklistItem(item)}
                            >
                              <Text
                                style={[
                                  styles.checklistItemText,
                                  item.completed && styles.checklistItemTextCompleted
                                ]}
                              >
                                {item.text}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.deleteChecklistItemButton}
                            onPress={() => deleteChecklistItem(block.id, item.id)}
                          >
                            <Ionicons name="close-circle" size={20} color="#dc3545" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      
                      {/* Botón para agregar item a esta checklist */}
                      <View style={styles.checklistBlockFooter}>
                        <ChecklistItemInput 
                          blockId={block.id}
                          onAddItem={addChecklistItem}
                          onDeleteBlock={() => deleteChecklistBlock(block.id)}
                        />
                        <TouchableOpacity
                          style={styles.deleteChecklistBlockButton}
                          onPress={() => deleteChecklistBlock(block.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#dc3545" />
                          <Text style={styles.deleteChecklistBlockText}>Eliminar checklist</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              })}
              
              {/* Botones para agregar nuevos bloques */}
              <View style={styles.addBlocksContainer}>
                <TouchableOpacity
                  style={styles.addBlockButton}
                  onPress={addTextBlock}
                >
                  <Text style={styles.addBlockButtonText}>+ Bloque de texto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBlockButton, styles.addChecklistBlockButton]}
                  onPress={addChecklistBlock}
                >
                  <Text style={styles.addBlockButtonText}>+ Checklist</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
  },
  notesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addNoteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteTitleInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
    color: Colors.light.text,
  },
  noteContentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 15,
    textAlignVertical: 'top',
    color: Colors.light.text,
    minHeight: 100,
  },
  noteFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  saveNoteButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveNoteButtonDisabled: {
    opacity: 0.6,
  },
  saveNoteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  noteDescription: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
    lineHeight: 20,
  },
  noteDeleteButton: {
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcccc',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 32,
  },
  textBlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checklistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
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
    color: Colors.light.text,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
  contentScrollView: {
    flex: 1,
  },
  contentTextInput: {
    minHeight: 100,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  // Text block styles
  textBlockContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'relative',
  },
  textBlockInput: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 40,
    paddingRight: 30,
  },
  deleteBlockButton: {
    position: 'absolute',
    right: 20,
    top: 12,
    padding: 4,
  },
  // Checklist block styles
  checklistBlockContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checklistItemTextContainer: {
    flex: 1,
  },
  checklistItemText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
  },
  checklistItemTextCompleted: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  checklistItemTextInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tint,
  },
  deleteChecklistItemButton: {
    padding: 4,
    marginLeft: 8,
  },
  checklistBlockFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addChecklistItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  deleteChecklistBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  deleteChecklistBlockText: {
    color: '#dc3545',
    fontSize: 14,
    marginLeft: 6,
  },
  addChecklistItemInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    marginRight: 8,
  },
  addChecklistItemButton: {
    padding: 4,
  },
  // Add blocks container
  addBlocksContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  addBlockButton: {
    flex: 1,
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChecklistBlockButton: {
    backgroundColor: '#6c757d',
  },
  addBlockButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
