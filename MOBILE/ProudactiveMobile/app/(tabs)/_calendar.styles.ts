import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { CELL_HEIGHT } from '@/utils/dateConstants';

export const celebrationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  number: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
    textAlign: 'center',
  },
});

// ===== ESTILOS =====
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12 },
  viewFilters: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5' },
  activeFilterButton: { backgroundColor: Colors.light.tint },
  filterText: { fontSize: 14, fontWeight: '500', color: Colors.light.text },
  activeFilterText: { color: 'white' },
  dateNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  navButton: { fontSize: 24, fontWeight: 'bold', color: Colors.light.tint, paddingHorizontal: 16 },
  currentDate: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  weekHeader: { flexDirection: 'row', backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12 },
  timeColumn: { width: 60, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', height: CELL_HEIGHT },
  weekContainer: { flexDirection: 'row', flex: 1 },
  dayContainer: { flexDirection: 'row', flex: 1 },
  fixedTimeColumn: { width: 60, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  weekContent: { flex: 1 },
  dayHeader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridCell: { position: 'absolute', borderWidth: 0.5, borderColor: '#e0e0e0', backgroundColor: 'transparent' },
  currentHourCell: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentTimeLine: { position: 'absolute', height: 2, backgroundColor: '#ff4444', zIndex: 10 },
  dayText: { fontSize: 14, fontWeight: '600', color: Colors.light.tint },
  calendarContainer: { flex: 1 },
  timeRow: { flexDirection: 'row', height: CELL_HEIGHT },
  timeText: { fontSize: 12, color: Colors.light.text, textAlign: 'center' },
  cell: { flex: 1, borderRightWidth: 0.5, borderRightColor: '#f0f0f0', position: 'relative' },
  cellTouchable: { flex: 1, position: 'relative' },
  todayCell: { position: 'relative' },
  todayLine: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(107, 83, 226, 0.3)',
    zIndex: 1001
  },
  currentHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(107, 83, 226, 0.3)',
    zIndex: 1001
  },
  todayHeader: { backgroundColor: '#6b53e2', borderRadius: 8, marginHorizontal: 2, paddingVertical: 1 },
  todayHeaderText: { color: 'white', fontWeight: '700' },
  // Estilos para vista de año
  yearContainer: { flex: 1, backgroundColor: Colors.light.background },
  yearScrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 }, // Más padding abajo para evitar que se corte
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
    marginBottom: 60, // Espacio para las líneas de objetivos
    width: '100%',
    minWidth: 1800, // 12 meses * 150px mínimo cada uno (para nombres largos)
  },
  monthSegment: {
    flex: 1, // Cada mes ocupa el mismo espacio
    minWidth: 150, // Ancho mínimo para nombres largos como "Septiembre"
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
    top: 75, // Debajo de la barra de meses
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
    maxHeight: 200, // Altura máxima para permitir scroll si hay muchas filas
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
  },
  yearPlanSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
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
  eventContainer: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, zIndex: 1000 },
  eventBlock: { flex: 1, borderRadius: 4, padding: 4, justifyContent: 'center', minHeight: 20, marginBottom: 2, marginHorizontal: 1, zIndex: 1000 },
  gridBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  eventText: { fontSize: 16, color: 'white', fontWeight: '500' },
  eventTextDay: { fontSize: 22, fontWeight: '600', paddingLeft: 8, paddingRight: 4 }, // Texto más grande para vista de día con padding
  eventTextWeek: { fontSize: 14, fontWeight: '500', paddingLeft: 4, paddingRight: 2 }, // Texto ligeramente más grande para vista de semana con padding reducido
  
  // Estilos para resaltar la hora actual
  currentHourRow: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentHourColumn: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentHourText: { color: '#6b53e2', fontWeight: '700' },
  fullscreenModal: { flex: 1, backgroundColor: '#f0f8ff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f0f8ff' },
  closeButton: { padding: 8 },
  createButton: { backgroundColor: Colors.light.tint, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  createButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  titleSection: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 60, marginBottom: 10 },
  taskTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  titleInput: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  charCounter: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 20 },
  colorSection: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  selectedColorCircle: { borderColor: Colors.light.text },
  configCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  configRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  configLabel: { flex: 1, fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  configValue: { fontSize: 14, color: '#666', marginRight: 8 },
  subtasksSection: { marginBottom: 16 },
  subtasksCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subtasksLabel: { fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  subtasksDescription: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 16, marginBottom: 12 },
  
  // Estilos para input de subtarea
  subtaskInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8 
  },
  subtaskInput: { 
    flex: 1, 
    fontSize: 16, 
    color: Colors.light.text, 
    paddingVertical: 8 
  },
  subtaskAddButton: { 
    backgroundColor: Colors.light.tint, 
    borderRadius: 20, 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  
  // Estilos para items de subtarea
  subtaskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8 
  },
  subtaskCheckbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#ddd', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    backgroundColor: '#f8f8f8'
  },
  subtaskCheckboxCompleted: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint
  },
  subtaskText: { 
    flex: 1, 
    fontSize: 16, 
    color: Colors.light.text, 
    paddingVertical: 4 
  },
  subtaskTextCompleted: { 
    textDecorationLine: 'line-through', 
    color: '#999' 
  },
  subtaskDeleteButton: { 
    padding: 8, 
    marginLeft: 8 
  },
  
  // Estilos para botón de borrar
  deleteButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff5f5', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ff4444'
  },
  deleteButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#ff4444', 
    marginLeft: 8 
  },
  
  // Padding adicional para evitar que el botón de borrar quede oculto detrás de los botones del celular
  bottomPadding: {
    height: 100, // Espacio suficiente para los botones de navegación del celular
    backgroundColor: 'transparent'
  },
  
  // Estilos para modal de confirmación de borrado
  deleteModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  deleteModalContent: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 24, 
    margin: 20, 
    minWidth: 280 
  },
  deleteModalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: Colors.light.text, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  deleteModalMessage: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  deleteModalButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16 
  },
  deleteModalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8 
  },
  deleteModalButtonSecondary: { 
    backgroundColor: '#f5f5f5', 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  deleteModalButtonPrimary: { 
    backgroundColor: '#ff4444' 
  },
  deleteModalButtonTextSecondary: { 
    color: Colors.light.text, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  deleteModalButtonTextPrimary: { 
    color: 'white', 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  deleteModalCancel: { 
    paddingVertical: 8 
  },
  deleteModalCancelText: { 
    color: '#666', 
    textAlign: 'center', 
    fontSize: 16 
  },
});

// Estilos para el Modal de Repetición
export const recurrenceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: 20 },
  
  // Switch principal
  mainSwitchSection: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    marginVertical: 20,
    padding: 16 
  },
  mainSwitchRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    minHeight: 50
  },
  mainSwitchLabel: { 
    fontSize: 16, 
    fontWeight: '600',
    color: Colors.light.text, 
    marginLeft: 12,
    flex: 1
  },
  mainSwitchSubtitle: { 
    fontSize: 12, 
    color: '#666',
    marginTop: 4,
    marginLeft: 12,
    flex: 2
  },
  
  // Pestañas
  tabsSection: { marginBottom: 20 },
  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4
  },
  tab: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center',
    borderRadius: 20
  },
  tabActive: { backgroundColor: '#a8e6cf' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: Colors.light.text },
  
  // Contenido de pestañas
  tabContent: { marginBottom: 20 },
  
  // Secciones
  intervalSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.light.text, 
    marginBottom: 16 
  },
  
  // Controles de intervalo
  intervalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  intervalLabel: { fontSize: 14, color: Colors.light.text },
  stepperContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4
  },
  stepperButton: { 
    width: 32, 
    height: 32, 
    backgroundColor: 'white',
    borderRadius: 6,
    justifyContent: 'center', 
    alignItems: 'center',
    marginHorizontal: 2
  },
  stepperText: { fontSize: 18, fontWeight: 'bold', color: Colors.light.tint },
  stepperDisabled: { color: '#ccc' },
  intervalValue: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.light.text,
    minWidth: 40,
    textAlign: 'center',
    marginHorizontal: 8
  },
  
  // Días de la semana
  weekDaysSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  weekDaysGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  weekDayChip: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  weekDayChipSelected: { backgroundColor: '#a8e6cf' },
  weekDayChipText: { fontSize: 14, fontWeight: '500', color: '#666' },
  weekDayChipTextSelected: { color: Colors.light.text },
  
  // Días del mes
  monthDaysSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  monthGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  monthDayChip: { 
    width: '13%', 
    aspectRatio: 1,
    borderRadius: 8, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8
  },
  monthDayChipSelected: { backgroundColor: '#a8e6cf' },
  monthDayChipText: { fontSize: 12, fontWeight: '500', color: '#666' },
  monthDayChipTextSelected: { color: Colors.light.text },
  
  // Fecha de término
  endDateSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  endDateRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 12
  },
  endDateLabel: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  endDateButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12
  },
  endDateButtonText: { fontSize: 14, color: Colors.light.text },
  
  // Botón de guardar
  saveSection: { paddingBottom: 40 },
  saveButton: { 
    backgroundColor: Colors.light.tint, 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  
  // Botón de refresh
  refreshButton: { 
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0'
  },
  refreshButtonText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Colors.light.tint 
  },
});



