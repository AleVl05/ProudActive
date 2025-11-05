import React, { useState, useEffect } from 'react';
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

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// API Functions - Usando el mismo endpoint de recetas por ahora
async function apiGetNotes() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes`, { headers });
  return res;
}

async function apiCreateNote(title: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, content }),
  });
  return res;
}

async function apiUpdateNote(id: string, title: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title, content }),
  });
  return res;
}

async function apiDeleteNote(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
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
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);

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
    setEditingContent(note.content);
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    setNoteModalVisible(false);
    setSelectedNote(null);
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setEditingTitle('');
    setEditingContent('');
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setIsEditingContent(true);
  };

  const saveTitleEdit = async () => {
    if (!selectedNote) return;
    
    try {
      setLoading(true);
      const response = await apiUpdateNote(
        selectedNote.id,
        editingTitle.trim() || 'Nota sin título',
        editingContent.trim()
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
        setIsEditingContent(false);
      }
    } catch (error) {
      console.error('❌ Error updating note:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle(selectedNote?.title || '');
    setEditingContent(selectedNote?.content || '');
    setIsEditingTitle(false);
    setIsEditingContent(false);
  };

  const startEditingContent = () => {
    setIsEditingContent(true);
  };

  const saveContentEdit = async () => {
    if (!selectedNote) return;
    
    try {
      setLoading(true);
      const response = await apiUpdateNote(
        selectedNote.id,
        editingTitle.trim() || 'Nota sin título',
        editingContent.trim()
      );
      
      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === selectedNote.id ? updatedNote : note
          )
        );
        setSelectedNote(updatedNote);
        setIsEditingContent(false);
      }
    } catch (error) {
      console.error('❌ Error updating note content:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelContentEdit = () => {
    setEditingContent(selectedNote?.content || '');
    setIsEditingContent(false);
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
                  <Text style={styles.editLabel}>Editando nota</Text>
                  <View style={styles.contentEditActions}>
                    <TouchableOpacity 
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                      onPress={saveContentEdit}
                      disabled={loading}
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
                  placeholder="Escribe tu nota aquí..."
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.contentDisplayContainer}>
                <View style={styles.contentHeader}>
                  <Text style={styles.contentLabel}>Nota</Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={startEditingContent}
                  >
                    <Ionicons name="pencil" size={16} color="white" />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.contentScrollView} showsVerticalScrollIndicator={true}>
                  <Text style={styles.modalNoteContent}>
                    {selectedNote?.content || 'No hay contenido'}
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
  modalNoteContent: {
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
