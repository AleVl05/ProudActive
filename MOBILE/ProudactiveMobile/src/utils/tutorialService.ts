import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_COMPLETED_KEY = '@proudactive_tutorial_completed';
const TUTORIAL_CURRENT_STEP_KEY = '@proudactive_tutorial_current_step';

export interface TutorialState {
  completed: boolean;
  currentStep: number;
}

class TutorialService {
  /**
   * Verificar si el tutorial ya fue completado
   */
  async isTutorialCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      return false;
    }
  }

  /**
   * Marcar el tutorial como completado
   */
  async markTutorialCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      await AsyncStorage.removeItem(TUTORIAL_CURRENT_STEP_KEY);
    } catch (error) {
      console.error('Error marking tutorial as completed:', error);
    }
  }

  /**
   * Reiniciar el tutorial (para poder verlo de nuevo)
   */
  async resetTutorial(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY);
      await AsyncStorage.removeItem(TUTORIAL_CURRENT_STEP_KEY);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  }

  /**
   * Obtener el paso actual del tutorial
   */
  async getCurrentStep(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(TUTORIAL_CURRENT_STEP_KEY);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Error getting current step:', error);
      return 0;
    }
  }

  /**
   * Guardar el paso actual del tutorial
   */
  async saveCurrentStep(step: number): Promise<void> {
    try {
      await AsyncStorage.setItem(TUTORIAL_CURRENT_STEP_KEY, step.toString());
    } catch (error) {
      console.error('Error saving current step:', error);
    }
  }
}

export default new TutorialService();

