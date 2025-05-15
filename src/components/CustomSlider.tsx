import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

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
  const totalSteps = (maximumValue - minimumValue) / step;
  const currentStep = (value - minimumValue) / step;
  const percentage = (currentStep / totalSteps) * 100;

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const { width } = event.currentTarget.props.style;
    const newPercentage = (locationX / width) * 100;
    const newStep = Math.round((newPercentage / 100) * totalSteps);
    const newValue = Math.min(Math.max(minimumValue + (newStep * step), minimumValue), maximumValue);
    onValueChange(newValue);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} {unit}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.sliderTrack}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
        <View style={[
          styles.thumb,
          { left: `${percentage}%`, marginLeft: -10 }
        ]} />
        
        {/* Affichage des crans */}
        {Array.from({ length: totalSteps + 1 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tick,
              {
                left: `${(index / totalSteps) * 100}%`,
                backgroundColor: index <= currentStep ? colors.accent : colors.white,
              }
            ]}
          />
        ))}
      </TouchableOpacity>
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
    marginBottom: spacing.sm,
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
    borderWidth: 2,
    borderColor: colors.white,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 18,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 50,
    backgroundColor: colors.accent,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  tick: {
    position: 'absolute',
    top: '50%',
    width: 4,
    height: 20,
    marginTop: -10,
    marginLeft: -2,
    borderRadius: 2,
  },
});

export default CustomSlider;