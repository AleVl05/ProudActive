import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { Colors } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
// Importación normal - Expo hot reload debería funcionar automáticamente
// Si los cambios no se reflejan:
// 1. Guarda el archivo tutorialStepPositions.ts
// 2. Espera 1-2 segundos para que Expo recargue
// 3. Si no funciona, presiona 'r' en la terminal de Expo para recargar manualmente
// 4. O agrega/elimina un espacio en blanco en este archivo para forzar re-render
import { tutorialStepPositions } from './tutorialStepPositions';

const { width, height } = Dimensions.get('window');

export interface TutorialStep {
  id: string;
  message: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  highlightElement?: string; // ID o identificador del elemento a resaltar
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  skipAllowed?: boolean;
  actionRequired?: boolean; // Si requiere una acción del usuario para avanzar
}

interface TutorialOverlayProps {
  visible: boolean;
  currentStep: number;
  steps: TutorialStep[];
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  beaverImage: any; // require() de la imagen
}

export default function TutorialOverlay({
  visible,
  currentStep,
  steps,
  onNext,
  onSkip,
  onComplete,
  beaverImage,
}: TutorialOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (visible && currentStepData) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Animación de la flecha (pulsante)
      if (currentStepData.arrowDirection) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(arrowAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(arrowAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [visible, currentStep, currentStepData]);

  // Si no está visible, no renderizar nada
  if (!visible) {
    return null;
  }
  
  // Si no hay datos del paso, no renderizar
  if (!currentStepData) {
    return null;
  }

  const isLastStep = currentStep === steps.length - 1;
  const position = currentStepData.position || 'bottom-left';
  const requiresAction = currentStepData.actionRequired === true;

  // Calcular posición del castor según la posición configurada
  // PRIMERO intenta leer de la configuración, si no existe usa la lógica antigua
  const getBeaverPosition = () => {
    const stepId = currentStepData.id;
    // En desarrollo, forzar re-lectura del módulo para hot reload
    let config;
    if (__DEV__) {
      try {
        // @ts-ignore
        if (typeof require !== 'undefined' && require.cache) {
          const modulePath = require.resolve('./tutorialStepPositions');
          delete require.cache[modulePath];
          const freshModule = require('./tutorialStepPositions');
          config = freshModule.tutorialStepPositions[stepId];
        } else {
          config = tutorialStepPositions[stepId];
        }
      } catch (e) {
        config = tutorialStepPositions[stepId];
      }
    } else {
      config = tutorialStepPositions[stepId];
    }
    
    // Si existe configuración para este paso, úsala
    if (config && config.beaver) {
      const beaverConfig = config.beaver;
      const result: any = {};
      
      if (beaverConfig.top !== undefined) {
        result.top = beaverConfig.usePercentage ? height * beaverConfig.top : beaverConfig.top;
      }
      if (beaverConfig.bottom !== undefined) {
        result.bottom = beaverConfig.usePercentage ? height * beaverConfig.bottom : beaverConfig.bottom;
      }
      if (beaverConfig.left !== undefined) {
        result.left = beaverConfig.usePercentage ? width * beaverConfig.left : beaverConfig.left;
      }
      if (beaverConfig.right !== undefined) {
        result.right = beaverConfig.usePercentage ? width * beaverConfig.right : beaverConfig.right;
      }
      
      return result;
    }
    
    // FALLBACK: Lógica antigua (mantener funcionalidad actual)
    switch (position) {
      case 'top-left':
        if (currentStepData.highlightElement === 'recurrence-week-days') {
          return { top: 100, left: 20 };
        }
        return { top: 60, left: 20 };
      case 'top-right':
        if (currentStepData.highlightElement === 'subtasks-section') {
          return { top: height * 0.25, right: 20 };
        }
        return { top: 60, right: 20 };
      case 'bottom-left':
        return { bottom: 140, left: 20 };
      case 'bottom-right':
        return { bottom: 140, right: 20 };
      case 'center':
        return { top: '30%', alignSelf: 'center' };
      default:
        return { bottom: 140, left: 20 };
    }
  };

  // Tamaño del castor según la posición
  // PRIMERO intenta leer de la configuración, si no existe usa la lógica antigua
  const getBeaverSize = () => {
    const stepId = currentStepData.id;
    // En desarrollo, forzar re-lectura del módulo para hot reload
    let config;
    if (__DEV__) {
      try {
        // @ts-ignore
        if (typeof require !== 'undefined' && require.cache) {
          const modulePath = require.resolve('./tutorialStepPositions');
          delete require.cache[modulePath];
          const freshModule = require('./tutorialStepPositions');
          config = freshModule.tutorialStepPositions[stepId];
        } else {
          config = tutorialStepPositions[stepId];
        }
      } catch (e) {
        config = tutorialStepPositions[stepId];
      }
    } else {
      config = tutorialStepPositions[stepId];
    }
    
    // Si existe configuración de tamaño para este paso, úsala
    if (config && config.beaver && (config.beaver.width !== undefined || config.beaver.height !== undefined)) {
      return {
        width: config.beaver.width ?? 140,
        height: config.beaver.height ?? 140,
      };
    }
    
    // FALLBACK: Lógica antigua (más grande cuando está abajo)
    if (position === 'bottom-left' || position === 'bottom-right') {
      return { width: 160, height: 160 };
    }
    return { width: 140, height: 140 };
  };

  // Calcular posición del diálogo según la posición del castor
  // PRIMERO intenta leer de la configuración, si no existe usa la lógica antigua
  const getDialogPosition = () => {
    const stepId = currentStepData.id;
    // En desarrollo, forzar re-lectura del módulo para hot reload
    let config;
    if (__DEV__) {
      try {
        // @ts-ignore
        if (typeof require !== 'undefined' && require.cache) {
          const modulePath = require.resolve('./tutorialStepPositions');
          delete require.cache[modulePath];
          const freshModule = require('./tutorialStepPositions');
          config = freshModule.tutorialStepPositions[stepId];
        } else {
          config = tutorialStepPositions[stepId];
        }
      } catch (e) {
        config = tutorialStepPositions[stepId];
      }
    } else {
      config = tutorialStepPositions[stepId];
    }
    
    // Si existe configuración para este paso, úsala
    if (config && config.dialog) {
      const dialogConfig = config.dialog;
      const result: any = {
        position: 'absolute' as const,
      };
      
      // Determinar si usar porcentajes: si usePercentage es true Y el valor está entre 0 y 1, O si usePercentage no está definido pero el valor está entre 0 y 1
      // Si el valor es > 1, siempre es píxeles, incluso si usePercentage es true
      const usePercentageForTop = dialogConfig.top !== undefined && dialogConfig.top > 0 && dialogConfig.top <= 1 && (dialogConfig.usePercentage === true || dialogConfig.usePercentage === undefined);
      const usePercentageForBottom = dialogConfig.bottom !== undefined && dialogConfig.bottom > 0 && dialogConfig.bottom <= 1 && (dialogConfig.usePercentage === true || dialogConfig.usePercentage === undefined);
      const usePercentageForLeft = dialogConfig.left !== undefined && dialogConfig.left > 0 && dialogConfig.left <= 1 && (dialogConfig.usePercentage === true || dialogConfig.usePercentage === undefined);
      const usePercentageForRight = dialogConfig.right !== undefined && dialogConfig.right > 0 && dialogConfig.right <= 1 && (dialogConfig.usePercentage === true || dialogConfig.usePercentage === undefined);
      const usePercentageForMaxWidth = dialogConfig.maxWidth !== undefined && dialogConfig.maxWidth > 0 && dialogConfig.maxWidth <= 1 && (dialogConfig.usePercentage === true || dialogConfig.usePercentage === undefined);
      
      if (dialogConfig.top !== undefined) {
        result.top = usePercentageForTop ? height * dialogConfig.top : dialogConfig.top;
      }
      if (dialogConfig.bottom !== undefined) {
        result.bottom = usePercentageForBottom ? height * dialogConfig.bottom : dialogConfig.bottom;
      }
      if (dialogConfig.left !== undefined) {
        // Si left es 0.5 (centro) con porcentaje, centrar el elemento
        if (usePercentageForLeft && dialogConfig.left === 0.5) {
          // Calcular el ancho máximo del diálogo para centrarlo correctamente
          const maxWidthValue = dialogConfig.maxWidth !== undefined 
            ? (usePercentageForMaxWidth ? dialogConfig.maxWidth * width : dialogConfig.maxWidth)
            : (width - 80);
          result.left = (width - maxWidthValue) / 2;
        } else {
          result.left = usePercentageForLeft ? width * dialogConfig.left : dialogConfig.left;
        }
      }
      if (dialogConfig.right !== undefined) {
        result.right = usePercentageForRight ? width * dialogConfig.right : dialogConfig.right;
      }
      if (dialogConfig.maxWidth !== undefined) {
        result.maxWidth = usePercentageForMaxWidth ? width * dialogConfig.maxWidth : dialogConfig.maxWidth;
      }
      
      // Asegurar que el diálogo esté dentro de la pantalla
      if (result.left !== undefined && result.left < 0) result.left = 10;
      if (result.right !== undefined && result.right < 0) result.right = 10;
      if (result.top !== undefined && result.top < 0) result.top = 10;
      if (result.bottom !== undefined && result.bottom < 0) result.bottom = 10;
      
      return result;
    }
    
    // FALLBACK: Lógica antigua (mantener funcionalidad actual)
    switch (position) {
      case 'top-left':
        if (currentStepData.highlightElement === 'recurrence-save-button' || 
            currentStepData.highlightElement === 'create-button') {
          return { top: 240, left: 20, maxWidth: width - 100 };
        }
        return { top: 180, left: 20, maxWidth: width - 100 };
      case 'top-right':
        if (currentStepData.highlightElement === 'subtasks-section') {
          return { top: height * 0.35, right: 20, maxWidth: width * 0.45 };
        }
        return { top: 180, right: 20, maxWidth: width - 100 };
      case 'bottom-left':
        return { bottom: 320, left: 20, maxWidth: width - 100 };
      case 'bottom-right':
        return { bottom: 320, right: 20, maxWidth: width - 100 };
      case 'center':
        return { top: '40%', alignSelf: 'center', maxWidth: width - 80 };
      default:
        return { bottom: 320, left: 20, maxWidth: width - 100 };
    }
  };

  // Calcular posición de la flecha según el elemento a destacar
  // PRIMERO intenta leer de la configuración, si no existe usa la lógica antigua
  const getArrowPositionForElement = (elementId: string, direction: string) => {
    const stepId = currentStepData.id;
    // En desarrollo, forzar re-lectura del módulo para hot reload
    let config;
    if (__DEV__) {
      try {
        // @ts-ignore
        if (typeof require !== 'undefined' && require.cache) {
          const modulePath = require.resolve('./tutorialStepPositions');
          delete require.cache[modulePath];
          const freshModule = require('./tutorialStepPositions');
          config = freshModule.tutorialStepPositions[stepId];
        } else {
          config = tutorialStepPositions[stepId];
        }
      } catch (e) {
        config = tutorialStepPositions[stepId];
      }
    } else {
      config = tutorialStepPositions[stepId];
    }
    
    // Si existe configuración para este paso, úsala
    if (config && config.arrow) {
      const arrowConfig = config.arrow;
      const result: any = {
        position: 'absolute' as const,
      };
      
      if (arrowConfig.top !== undefined) {
        // Si usePercentage es explícitamente true, SIEMPRE tratar como porcentaje (multiplicar por height)
        // Si usePercentage es false o undefined, usar lógica automática: <= 1 = porcentaje, > 1 = píxeles
        if (arrowConfig.usePercentage === true) {
          result.top = height * arrowConfig.top;
        } else if (arrowConfig.usePercentage === false) {
          result.top = arrowConfig.top;
        } else {
          // usePercentage undefined: lógica automática
          if (arrowConfig.top <= 1) {
            result.top = height * arrowConfig.top;
          } else {
            result.top = arrowConfig.top;
          }
        }
      }
      if (arrowConfig.bottom !== undefined) {
        if (arrowConfig.usePercentage === true) {
          result.bottom = height * arrowConfig.bottom;
        } else if (arrowConfig.usePercentage === false) {
          result.bottom = arrowConfig.bottom;
        } else {
          if (arrowConfig.bottom <= 1) {
            result.bottom = height * arrowConfig.bottom;
          } else {
            result.bottom = arrowConfig.bottom;
          }
        }
      }
      if (arrowConfig.left !== undefined) {
        if (arrowConfig.usePercentage === true) {
          result.left = width * arrowConfig.left;
        } else if (arrowConfig.usePercentage === false) {
          result.left = arrowConfig.left;
        } else {
          if (arrowConfig.left <= 1) {
            result.left = width * arrowConfig.left;
          } else {
            result.left = arrowConfig.left;
          }
        }
      }
      if (arrowConfig.right !== undefined) {
        if (arrowConfig.usePercentage === true) {
          result.right = width * arrowConfig.right;
        } else if (arrowConfig.usePercentage === false) {
          result.right = arrowConfig.right;
        } else {
          if (arrowConfig.right <= 1) {
            result.right = width * arrowConfig.right;
          } else {
            result.right = arrowConfig.right;
          }
        }
      }
      
      return result;
    }
    
    // FALLBACK: Lógica antigua (mantener funcionalidad actual)
    switch (elementId) {
      case 'calendar-grid':
        return {
          position: 'absolute' as const,
          top: height * 0.35,
          left: width * 0.5 - 30,
        };
      case 'event-title-input':
        return {
          position: 'absolute' as const,
          top: height * 0.27,
          left: width * 0.5 - 30,
        };
      case 'create-button':
        if (currentStepData.arrowDirection === 'down') {
          return {
            position: 'absolute' as const,
            top: 120,
            right: 20,
          };
        }
        return {
          position: 'absolute' as const,
          top: 80,
          right: 20,
        };
      case 'recurrence-button':
        return {
          position: 'absolute' as const,
          top: height * 0.5,
          left: width * 0.5 - 30,
        };
      case 'recurrence-toggle':
        return {
          position: 'absolute' as const,
          top: height * 0.15,
          right: 20,
        };
      case 'recurrence-mode-weekly':
        return {
          position: 'absolute' as const,
          top: height * 0.25,
          left: width * 0.4 - 30,
        };
      case 'recurrence-week-days':
        return {
          position: 'absolute' as const,
          top: height * 0.35,
          left: width * 0.5 - 30,
        };
      case 'recurrence-save-button':
        if (currentStepData.arrowDirection === 'down') {
          return {
            position: 'absolute' as const,
            top: height * 0.75,
            left: width * 0.5 - 30,
          };
        }
        return {
          position: 'absolute' as const,
          top: height * 0.85,
          left: width * 0.5 - 30,
        };
      case 'subtasks-section':
        return {
          position: 'absolute' as const,
          top: height * 0.55,
          right: width * 0.15,
        };
      case 'event-item':
        if (currentStepData.id === 'click-event-to-edit') {
          return {
            position: 'absolute' as const,
            top: height * 0.45,
            left: width * 0.5 - 30,
          };
        }
        return {
          position: 'absolute' as const,
          top: height * 0.35,
          left: width * 0.5 - 30,
        };
      case 'view-selector':
        return {
          position: 'absolute' as const,
          top: 100,
          left: width * 0.5 - 30,
        };
      default:
        return {
          position: 'absolute' as const,
          top: height * 0.35,
          left: width * 0.5 - 30,
        };
    }
  };

  const arrowTranslateY = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  // console.log('🎯 TUTORIAL: Renderizando', {
  //   visible,
  //   requiresAction,
  //   step: currentStep,
  //   stepId: currentStepData?.id,
  // });

  // SOLUCIÓN CRÍTICA: Cuando requiere acción, NO usar Modal (bloquea todo)
  // Usar View absoluto que permite interacciones
  if (requiresAction) {
    return (
      <View 
        style={[StyleSheet.absoluteFill, { zIndex: 99998 }]}
        pointerEvents="box-none"
      >
        {/* Flecha */}
        {currentStepData.arrowDirection && currentStepData.highlightElement && (
          <Animated.View
            style={[
              styles.arrowContainer,
              getArrowPositionForElement(currentStepData.highlightElement, currentStepData.arrowDirection),
              { 
                transform: [
                  { translateY: arrowTranslateY },
                  // PRIMERO: Intentar leer rotación de la configuración
                  ...(tutorialStepPositions[currentStepData.id]?.arrow?.rotation !== undefined
                    ? [{ rotate: `${tutorialStepPositions[currentStepData.id]!.arrow!.rotation}deg` }]
                    : []),
                  // FALLBACK: Lógica antigua de rotación (mantener funcionalidad actual)
                  ...(tutorialStepPositions[currentStepData.id]?.arrow?.rotation === undefined ? [
                    // Rotar hacia la izquierda si es el campo de nombre
                    ...(currentStepData.highlightElement === 'event-title-input' && currentStepData.arrowDirection === 'up'
                      ? [{ rotate: '-90deg' }]
                      : []),
                    // Rotar 180 grados si es el botón de recurrencia para que apunte hacia abajo
                    ...(currentStepData.highlightElement === 'recurrence-button'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar 180 grados si es el botón de guardar recurrencia y apunta hacia abajo
                    ...(currentStepData.highlightElement === 'recurrence-save-button' && currentStepData.arrowDirection === 'down'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar 180 grados si es el botón crear/editar y apunta hacia abajo
                    ...(currentStepData.highlightElement === 'create-button' && currentStepData.arrowDirection === 'down'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar -90 grados si la flecha apunta hacia la izquierda (subtasks)
                    ...(currentStepData.arrowDirection === 'left'
                      ? [{ rotate: '-90deg' }]
                      : [])
                  ] : [])
                ]
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons
              name={
                currentStepData.arrowDirection === 'up' ? 'arrow-up' :
                currentStepData.arrowDirection === 'down' ? 'arrow-down' :
                currentStepData.arrowDirection === 'left' ? 'arrow-back' : 
                currentStepData.arrowDirection === 'right' ? 'arrow-forward' : 'arrow-forward'
              }
              size={60}
              color="#6b53e2"
            />
          </Animated.View>
        )}

        {/* Castor */}
        <Animated.View
          style={[
            styles.beaverContainer,
            getBeaverPosition(),
            getBeaverSize(),
            { 
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }] 
            },
          ]}
          pointerEvents="none"
        >
          <Image source={beaverImage} style={[styles.beaverImage, getBeaverSize()]} resizeMode="contain" />
        </Animated.View>

        {/* Diálogo */}
        <Animated.View
          style={[
            styles.dialogContainer, 
            getDialogPosition(), 
            { opacity: fadeAnim }
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.dialogBubble} pointerEvents="auto">
            <Text style={styles.dialogText}>{currentStepData.message}</Text>
            {/* Botón Saltar dentro del diálogo */}
            <TouchableOpacity
              style={styles.skipButtonInside}
              onPress={(e) => {
                console.log('🔘 Tutorial: Botón presionado en posición:', {
                  x: e.nativeEvent.locationX,
                  y: e.nativeEvent.locationY,
                });
                onSkip();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipButtonTextInside}>
                {isLastStep ? 'Finalizar' : 'Saltar tutorial'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.dialogTail, getDialogTailStyle(position)]} pointerEvents="none" />
        </Animated.View>
      </View>
    );
  }

  // Cuando NO requiere acción, usar Modal normal
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onSkip}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Overlay oscuro */}
        <View style={styles.overlayPressable} />

        {/* Flecha */}
        {currentStepData.arrowDirection && currentStepData.highlightElement && (
          <Animated.View
            style={[
              styles.arrowContainer,
              getArrowPositionForElement(currentStepData.highlightElement, currentStepData.arrowDirection),
              { 
                transform: [
                  { translateY: arrowTranslateY },
                  // PRIMERO: Intentar leer rotación de la configuración
                  ...(tutorialStepPositions[currentStepData.id]?.arrow?.rotation !== undefined
                    ? [{ rotate: `${tutorialStepPositions[currentStepData.id]!.arrow!.rotation}deg` }]
                    : []),
                  // FALLBACK: Lógica antigua de rotación (mantener funcionalidad actual)
                  ...(tutorialStepPositions[currentStepData.id]?.arrow?.rotation === undefined ? [
                    // Rotar hacia la izquierda si es el campo de nombre
                    ...(currentStepData.highlightElement === 'event-title-input' && currentStepData.arrowDirection === 'up'
                      ? [{ rotate: '-90deg' }]
                      : []),
                    // Rotar 180 grados si es el botón de recurrencia para que apunte hacia abajo
                    ...(currentStepData.highlightElement === 'recurrence-button'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar 180 grados si es el botón de guardar recurrencia y apunta hacia abajo
                    ...(currentStepData.highlightElement === 'recurrence-save-button' && currentStepData.arrowDirection === 'down'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar 180 grados si es el botón crear/editar y apunta hacia abajo
                    ...(currentStepData.highlightElement === 'create-button' && currentStepData.arrowDirection === 'down'
                      ? [{ rotate: '180deg' }]
                      : []),
                    // Rotar -90 grados si la flecha apunta hacia la izquierda (subtasks)
                    ...(currentStepData.arrowDirection === 'left'
                      ? [{ rotate: '-90deg' }]
                      : [])
                  ] : [])
                ]
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons
              name={
                currentStepData.arrowDirection === 'up' ? 'arrow-up' :
                currentStepData.arrowDirection === 'down' ? 'arrow-down' :
                currentStepData.arrowDirection === 'left' ? 'arrow-back' : 
                currentStepData.arrowDirection === 'right' ? 'arrow-forward' : 'arrow-forward'
              }
              size={60}
              color="#6b53e2"
            />
          </Animated.View>
        )}

        {/* Castor */}
        <Animated.View
          style={[
            styles.beaverContainer,
            getBeaverPosition(),
            getBeaverSize(),
            { 
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }] 
            },
          ]}
          pointerEvents="none"
        >
          <Image source={beaverImage} style={[styles.beaverImage, getBeaverSize()]} resizeMode="contain" />
        </Animated.View>

        {/* Diálogo */}
        <Animated.View
          style={[
            styles.dialogContainer, 
            getDialogPosition(), 
            { opacity: fadeAnim }
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.dialogBubble} pointerEvents="auto">
            <Text style={styles.dialogText}>{currentStepData.message}</Text>
            {/* Botón Saltar dentro del diálogo */}
            <TouchableOpacity
              style={styles.skipButtonInside}
              onPress={() => {
                console.log('🔘 Tutorial: Botón Saltar presionado');
                onSkip();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipButtonTextInside}>
                {isLastStep ? 'Finalizar' : 'Saltar tutorial'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.dialogTail, getDialogTailStyle(position)]} pointerEvents="none" />
        </Animated.View>

        {/* Botones */}
        <View style={styles.actionsContainer}>
          {!isLastStep && (
            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}

          {isLastStep && (
            <TouchableOpacity style={styles.nextButton} onPress={onComplete}>
              <Text style={styles.nextButtonText}>¡Empezar!</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Función helper para el estilo de la cola del diálogo
function getDialogTailStyle(position: string) {
  switch (position) {
    case 'top-left':
    case 'top-right':
      return {
        bottom: -10,
        borderTopColor: '#6b53e2', // Morado
        borderBottomColor: 'transparent',
      };
    case 'bottom-left':
    case 'bottom-right':
      return {
        top: -10,
        borderBottomColor: '#6b53e2', // Morado
        borderTopColor: 'transparent',
      };
    default:
      return {
        bottom: -10,
        borderTopColor: '#6b53e2', // Morado
        borderBottomColor: 'transparent',
      };
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  beaverContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  beaverImage: {
    // El tamaño se maneja dinámicamente según la posición
  },
  dialogContainer: {
    position: 'absolute',
    zIndex: 999,
  },
  dialogBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 40, // Espacio para el botón en la esquina
    borderWidth: 3,
    borderColor: '#6b53e2', // Morado en lugar de amarillo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    maxWidth: width - 80,
    position: 'relative', // Para posicionar el botón dentro
  },
  dialogText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    lineHeight: 22,
  },
  dialogTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowContainer: {
    position: 'absolute',
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  skipButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Botón saltar dentro del diálogo
  skipButtonInside: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipButtonTextInside: {
    color: '#6b53e2', // Morado
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  nextButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
