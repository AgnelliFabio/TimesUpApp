import React, { useRef } from 'react';
import { View, StyleSheet, Text, PanResponder, Dimensions } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
  label: string;
  unit: string;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step,
  label,
  unit
}) => {
  const sliderWidth = width - (spacing.lg * 2) - 40; // Largeur disponible moins les marges
  const totalSteps = (maximumValue - minimumValue) / step;
  const currentStep = (value - minimumValue) / step;
  const percentage = (currentStep / totalSteps) * 100;
  const sliderRef = useRef<View>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { locationX } = event.nativeEvent;
      updateValue(locationX);
    },
    onPanResponderMove: (event, gestureState) => {
      // Utiliser gestureState pour obtenir la position
      if (sliderRef.current) {
        sliderRef.current.measure((x, y, width, height, pageX, pageY) => {
          const relativeX = gestureState.moveX - pageX;
          updateValue(Math.max(0, Math.min(sliderWidth, relativeX)));
        });
      }
    },
  });

  const updateValue = (locationX: number) => {
    const newPercentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    const newStep = Math.round((newPercentage / 100) * totalSteps);
    const newValue = Math.min(Math.max(minimumValue + (newStep * step), minimumValue), maximumValue);
    onValueChange(newValue);
  };

  // Calculer les positions des crans (exclure les extrémités)
  const renderTicks = () => {
    const ticks = [];
    // Commencer à 1 et finir à totalSteps - 1 pour éviter les extrémités
    for (let i = 1; i < totalSteps; i++) {
      const tickPercentage = (i / totalSteps) * 100;
      ticks.push(
        <View
          key={i}
          style={[
            styles.tick,
            {
              left: `${tickPercentage}%`,
              backgroundColor: i <= currentStep ? colors.accent : colors.white,
            }
          ]}
        />
      );
    }
    return ticks;
  };

  // Calculer la largeur de la barre de progression avec 2px de plus
  const getProgressStyle = () => {
    if (percentage === 0) return { width: 0 };
    
    let differentiel = 0;
    if (percentage>=50){
      differentiel = 9;
    }

    const baseWidth = ((percentage+differentiel) / 100) * sliderWidth;
    
    return {
      width: baseWidth,
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} {unit}</Text>
      </View>
      
      <View>
        <View 
          ref={sliderRef}
          style={styles.sliderTrack}
          {...panResponder.panHandlers}
        >
          <View style={[styles.sliderFill, getProgressStyle()]} />
          
          {/* Crans intermédiaires */}
          {renderTicks()}
        </View>
        
        {/* Thumb (curseur) - maintenant au-dessus */}
        <View style={[
          styles.thumb,
          { 
            left: `${percentage}%`,
            transform: [{ translateX: -12 }] // Centrer le thumb
          }
        ]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  label: {
    color: colors.white,
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.semiBold,
  },
  value: {
    color: colors.accent,
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
  },
  sliderTrack: {
    height: 40,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.white,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 17,
    borderTopRightRadius:0,
    borderBottomRightRadius:0, 
    minWidth: 2, // Largeur minimale pour que le radius soit visible
  },
  thumb: {
    position: 'absolute',
    top: -6, // Position par rapport au container, pas au track
    width: 24,
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10, // S'assurer qu'il est au-dessus
  },
  tick: {
    position: 'absolute',
    top: '50%',
    width: 3,
    height: 16,
    marginTop: -8,
    borderRadius: 1.5,
  },
});

export default CustomSlider;