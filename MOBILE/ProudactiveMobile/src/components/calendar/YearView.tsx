// YearView.tsx - Component for year view calendar
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MonthEvent } from './monthEventHelpers';

const GOAL_SUGGESTIONS = [
  'Ganar músculo en el gimnasio',
  'Generar $10,000',
  'Comprar mi casa',
  'Comprar mi auto',
  'Aprender un nuevo idioma',
  'Viajar a 3 países',
  'Leer 20 libros',
  'Iniciar mi negocio',
  'Completar mi educación',
  'Mejorar mi salud',
];

interface YearViewProps {
  currentDate: Date;
  yearEvents: MonthEvent[];
  onMonthPress: (year: number, month: number) => void;
}

export default function YearView({
  currentDate,
  yearEvents,
  onMonthPress,
}: YearViewProps) {
  const [yearPlanModalVisible, setYearPlanModalVisible] = useState(false);
  const [yearPlanPage, setYearPlanPage] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const customGoalInputRef = useRef<TextInput>(null);

  const currentYear = currentDate.getFullYear();

  return (
    <View style={styles.yearContainer}>
      {/* Botón Planear Año - Fijo arriba */}
      <View style={styles.yearPlanButtonContainer}>
        <TouchableOpacity
          style={styles.yearPlanButton}
          onPress={() => {
            setYearPlanModalVisible(true);
            setYearPlanPage(1);
            setSelectedGoals([]);
            setShowAllSuggestions(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.yearPlanButtonText}>Planear Año</Text>
        </TouchableOpacity>
      </View>
      
      {/* Scroll horizontal para la barra de meses */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.yearScrollContent}
      >
        <View style={styles.yearView}>
          {/* Contenedor de la barra continua y líneas */}
          <View style={styles.monthsBarContainer}>
            {/* Barra continua de meses */}
            <View style={styles.monthsBar}>
              {[
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ].map((monthName, monthIndex) => (
                <TouchableOpacity
                  key={monthIndex}
                  style={styles.monthSegment}
                  onPress={() => {
                    onMonthPress(currentYear, monthIndex);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.monthLabel}>{monthName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Líneas de objetivos debajo de toda la barra */}
            <View style={styles.objectivesContainer}>
              {yearEvents.map((event, eventIndex) => {
                if (event.year !== currentYear) return null;
                
                // Cada mes ocupa exactamente 1/12 del ancho total de la barra
                const monthWidthPercent = 100 / 12; // ≈ 8.333%
                
                // Posición del inicio del mes en la barra (0 = Enero, 8.333 = Febrero, etc.)
                const monthStartPercent = event.month * monthWidthPercent;
                
                // Días totales en el mes del evento
                const daysInMonth = new Date(currentYear, event.month + 1, 0).getDate();
                
                // Posición relativa dentro del mes (día 1 = 0%, último día = 100% del mes)
                // Convertir días a porcentaje del mes: (startDay - 1) porque día 1 = posición 0
                const relativeStartInMonth = (event.startDay - 1) / daysInMonth;
                const relativeDurationInMonth = event.duration / daysInMonth;
                
                // Posición absoluta desde el inicio de la barra completa
                // mesStartPercent + (posición relativa dentro del mes * ancho del mes)
                const startPercent = monthStartPercent + (relativeStartInMonth * monthWidthPercent);
                const widthPercent = relativeDurationInMonth * monthWidthPercent;
                
                return (
                  <View
                    key={`${event.id}-${eventIndex}`}
                    style={[
                      styles.objectiveLine,
                      {
                        backgroundColor: event.color,
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Línea divisoria fija */}
      <View style={styles.colorLegendDivider} />
      
      {/* Leyenda de colores fija (máximo 6 por fila) */}
      <ScrollView
        style={styles.colorLegendScrollContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.colorLegendContainer}>
          {(() => {
            // Obtener colores únicos y sus títulos (nombres de los eventos)
            const colorMap = new Map<string, string>();
            yearEvents.forEach(event => {
              if (event.year === currentYear) {
                // Si el color ya existe, mantener el primer título encontrado
                if (!colorMap.has(event.color)) {
                  colorMap.set(event.color, event.title || 'Sin título');
                }
              }
            });
            
            // Convertir a array para renderizar
            return Array.from(colorMap.entries()).map(([color, title], index) => (
              <View 
                key={`legend-${color}-${index}`} 
                style={[
                  styles.colorLegendItem,
                  { width: `${100 / 6}%` } // Máximo 6 items por fila (16.666% cada uno)
                ]}
              >
                <View style={[styles.colorLegendCircle, { backgroundColor: color }]} />
                <Text style={styles.colorLegendText} numberOfLines={1}>{title}</Text>
              </View>
            ));
          })()}
        </View>
      </ScrollView>

      {/* Modal para Planear Año */}
      <Modal
        visible={yearPlanModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setYearPlanModalVisible(false);
          setYearPlanPage(1);
          setSelectedGoals([]);
          setShowAllSuggestions(false);
        }}
      >
        <View style={styles.yearPlanModalContainer}>
          {/* Header con indicador de página */}
          <View style={styles.yearPlanModalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (yearPlanPage === 1) {
                  setYearPlanModalVisible(false);
                } else {
                  setYearPlanPage(yearPlanPage - 1);
                }
              }}
              style={styles.yearPlanModalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.yearPlanModalTitle}>
              {yearPlanPage === 1 ? 'Mis Metas del Año' : 'Asignar Fechas'}
            </Text>
            <Text style={styles.yearPlanModalPageIndicator}>
              {yearPlanPage}/2
            </Text>
          </View>

          {/* Contenido según la página */}
          {yearPlanPage === 1 ? (
            // Página 1: Selección de metas
            <ScrollView style={styles.yearPlanModalContent}>
              <Text style={styles.yearPlanInstructions}>
                Selecciona las metas que quieres alcanzar este año:
              </Text>
              
              {/* Campo para agregar metas personalizadas - PRIMERO */}
              <View style={styles.yearPlanCustomGoalContainer}>
                <TextInput
                  ref={customGoalInputRef}
                  style={styles.yearPlanCustomGoalInput}
                  placeholder="Escribe tu propia meta..."
                  placeholderTextColor="#999"
                  onSubmitEditing={(e) => {
                    const newGoal = e.nativeEvent.text.trim();
                    if (newGoal && !selectedGoals.includes(newGoal)) {
                      setSelectedGoals([...selectedGoals, newGoal]);
                      customGoalInputRef.current?.clear();
                    }
                  }}
                />
              </View>

              {/* Sugerencias de metas - DESPUÉS */}
              <View style={styles.yearPlanSuggestionsContainer}>
                <Text style={styles.yearPlanSuggestionsTitle}>Sugerencias:</Text>
                
                <View style={styles.yearPlanSuggestionsList}>
                  {(showAllSuggestions ? GOAL_SUGGESTIONS : GOAL_SUGGESTIONS.slice(0, 3)).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.yearPlanGoalChip,
                        selectedGoals.includes(suggestion) && styles.yearPlanGoalChipSelected
                      ]}
                      onPress={() => {
                        if (selectedGoals.includes(suggestion)) {
                          setSelectedGoals(selectedGoals.filter(g => g !== suggestion));
                        } else {
                          setSelectedGoals([...selectedGoals, suggestion]);
                        }
                      }}
                    >
                      <Ionicons
                        name={selectedGoals.includes(suggestion) ? 'checkmark-circle' : 'add-circle-outline'}
                        size={20}
                        color={selectedGoals.includes(suggestion) ? Colors.light.tint : Colors.light.text}
                      />
                      <Text style={[
                        styles.yearPlanGoalChipText,
                        selectedGoals.includes(suggestion) && styles.yearPlanGoalChipTextSelected
                      ]}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Fade y botón "Ver más" si hay más de 3 sugerencias y no están todas mostradas */}
                {!showAllSuggestions && GOAL_SUGGESTIONS.length > 3 && (
                  <View style={styles.yearPlanSuggestionsFadeContainer}>
                    {/* Capas de fade para efecto visual */}
                    <View style={styles.yearPlanSuggestionsFadeLayer1} pointerEvents="none" />
                    <View style={styles.yearPlanSuggestionsFadeLayer2} pointerEvents="none" />
                    <View style={styles.yearPlanSuggestionsFadeLayer3} pointerEvents="none" />
                    <TouchableOpacity
                      style={styles.yearPlanShowMoreButton}
                      onPress={() => setShowAllSuggestions(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-down" size={20} color={Colors.light.tint} />
                      <Text style={styles.yearPlanShowMoreText}>Ver más sugerencias</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Metas seleccionadas */}
              {selectedGoals.length > 0 && (
                <View style={styles.yearPlanSelectedContainer}>
                  <Text style={styles.yearPlanSelectedTitle}>Metas seleccionadas ({selectedGoals.length}):</Text>
                  {selectedGoals.map((goal, index) => (
                    <View key={index} style={styles.yearPlanSelectedGoal}>
                      <Text style={styles.yearPlanSelectedGoalText}>{goal}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedGoals(selectedGoals.filter(g => g !== goal))}
                        style={styles.yearPlanRemoveGoalButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Botón Continuar */}
              <TouchableOpacity
                style={[
                  styles.yearPlanContinueButton,
                  selectedGoals.length === 0 && styles.yearPlanContinueButtonDisabled
                ]}
                onPress={() => {
                  if (selectedGoals.length > 0) {
                    setYearPlanPage(2);
                  }
                }}
                disabled={selectedGoals.length === 0}
              >
                <Text style={[
                  styles.yearPlanContinueButtonText,
                  selectedGoals.length === 0 && styles.yearPlanContinueButtonTextDisabled
                ]}>
                  Continuar
                </Text>
                <Ionicons name="arrow-forward" size={20} color={selectedGoals.length > 0 ? 'white' : '#999'} />
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // Página 2: Asignación de fechas (estructura similar a vista de año)
            <View style={styles.yearPlanDatesContainer}>
              <Text style={styles.yearPlanDatesInstructions}>
                Arrastra tus metas al calendario y estira las líneas para asignar períodos:
              </Text>
              
              {/* Barra de meses (similar a vista de año) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.yearPlanMonthsBarContainer}>
                  <View style={styles.yearPlanMonthsBar}>
                    {[
                      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                    ].map((monthName, monthIndex) => (
                      <View key={monthIndex} style={styles.yearPlanMonthSegment}>
                        <Text style={styles.yearPlanMonthLabel}>{monthName}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Aquí irían las líneas de metas (por ahora solo estructura) */}
                  <View style={styles.yearPlanObjectivesContainer}>
                    {/* Líneas se agregarían aquí cuando se implemente la funcionalidad */}
                  </View>
                </View>
              </ScrollView>

              {/* Leyenda de metas (similar a vista de año) */}
              <View style={styles.yearPlanLegendDivider} />
              <ScrollView style={styles.yearPlanLegendScrollContainer}>
                <View style={styles.yearPlanLegendContainer}>
                  {selectedGoals.map((goal, index) => {
                    // Asignar colores aleatorios a cada meta
                    const colors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <View key={index} style={[styles.yearPlanLegendItem, { width: `${100 / 6}%` }]}>
                        <View style={[styles.yearPlanLegendCircle, { backgroundColor: color }]} />
                        <Text style={styles.yearPlanLegendText} numberOfLines={1}>{goal}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Botón Finalizar */}
              <TouchableOpacity
                style={styles.yearPlanFinishButton}
                onPress={() => {
                  // TODO: Guardar metas y fechas
                  setYearPlanModalVisible(false);
                  setYearPlanPage(1);
                  setSelectedGoals([]);
                }}
              >
                <Text style={styles.yearPlanFinishButtonText}>Finalizar Planificación</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  yearContainer: { flex: 1, backgroundColor: Colors.light.background },
  yearScrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  yearView: { flex: 1 },
  monthsBarContainer: {
    position: 'relative',
    width: '100%',
  },
  monthsBar: { 
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 60,
    width: '100%',
    minWidth: 1800,
  },
  monthSegment: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  objectivesContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 40,
    width: '100%',
  },
  objectiveLine: {
    position: 'absolute',
    height: 10,
    borderRadius: 5,
    top: '50%',
    marginTop: -5,
  },
  colorLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
  },
  colorLegendScrollContainer: {
    maxHeight: 200,
    paddingHorizontal: 10,
  },
  colorLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  colorLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colorLegendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  colorLegendText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  // Estilos para botón Planear Año
  yearPlanButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  yearPlanButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearPlanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  // Estilos para Modal Planear Año
  yearPlanModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  yearPlanModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  yearPlanModalBackButton: {
    padding: 8,
  },
  yearPlanModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  yearPlanModalPageIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  yearPlanModalContent: {
    flex: 1,
    padding: 20,
  },
  yearPlanInstructions: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    fontWeight: '600',
  },
  yearPlanSuggestionsContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  yearPlanSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  yearPlanSuggestionsList: {
    position: 'relative',
  },
  yearPlanSuggestionsFadeContainer: {
    position: 'relative',
    marginTop: -40,
    height: 60,
    zIndex: 1,
  },
  yearPlanSuggestionsFadeLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 0.6,
  },
  yearPlanSuggestionsFadeLayer2: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 0.8,
  },
  yearPlanSuggestionsFadeLayer3: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 1,
  },
  yearPlanShowMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  yearPlanShowMoreText: {
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: '600',
    marginLeft: 8,
  },
  yearPlanGoalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  yearPlanGoalChipSelected: {
    backgroundColor: Colors.light.tint + '20',
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  yearPlanGoalChipText: {
    fontSize: 15,
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
  },
  yearPlanGoalChipTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  yearPlanCustomGoalContainer: {
    marginBottom: 24,
  },
  yearPlanCustomGoalInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  yearPlanSelectedContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  yearPlanSelectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  yearPlanSelectedGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yearPlanSelectedGoalText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  yearPlanRemoveGoalButton: {
    padding: 4,
  },
  yearPlanContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  yearPlanContinueButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  yearPlanContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
  yearPlanContinueButtonTextDisabled: {
    color: '#999',
  },
  // Estilos para página 2 (Asignación de fechas)
  yearPlanDatesContainer: {
    flex: 1,
    padding: 20,
  },
  yearPlanDatesInstructions: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    fontWeight: '600',
  },
  yearPlanMonthsBarContainer: {
    position: 'relative',
    width: '100%',
    minWidth: 1800,
  },
  yearPlanMonthsBar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 60,
  },
  yearPlanMonthSegment: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
  },
  yearPlanMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  yearPlanObjectivesContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 40,
    width: '100%',
  },
  yearPlanLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
  },
  yearPlanLegendScrollContainer: {
    maxHeight: 200,
    paddingHorizontal: 10,
  },
  yearPlanLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  yearPlanLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  yearPlanLegendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  yearPlanLegendText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  yearPlanFinishButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  yearPlanFinishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

