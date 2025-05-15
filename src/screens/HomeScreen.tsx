import React from 'react';
import { View, StyleSheet, ImageBackground, Image, Dimensions, Alert } from 'react-native';
import { Button, Title, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { images, useAssets } from '../hooks/useAssets';
import Database from '../database/Database';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const assetsLoaded = useAssets();
  
  if (!assetsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }
  
  return (
    <ImageBackground 
      source={images.gradientBackground} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={images.logo} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Boutons principaux */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            style={[styles.button, styles.primaryButton]}
            labelStyle={styles.buttonLabel}
            onPress={() => {
              navigation.navigate('GameConfig');
            }}
          >
            NOUVELLE PARTIE
          </Button>
          
          <Button 
            mode="contained" 
            style={[styles.button, styles.secondaryButton]}
            labelStyle={styles.buttonLabel}
            onPress={() => {
              navigation.navigate('Players');
            }}
          >
            GESTION DES JOUEURS
          </Button>
        </View>
        
        {/* Bouton temporaire de réinitialisation */}
        <View style={styles.tempButtonContainer}>
          <Button 
            mode="outlined" 
            style={styles.tempButton}
            labelStyle={styles.tempButtonLabel}
            onPress={async () => {
              try {
                await Database.resetDatabase();
                Alert.alert('Succès', 'Base de données réinitialisée avec succès');
              } catch (error) {
                console.error('Erreur lors de la réinitialisation', error);
                Alert.alert('Erreur', 'Erreur lors de la réinitialisation de la base de données');
              }
            }}
          >
            DEBUG: Reset BDD
          </Button>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    color: colors.white,
    fontSize: typography.fontSize.large,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl * 2,
  },
  logo: {
    width: width * 0.7,
    height: height * 0.15,
    maxWidth: 300,
    maxHeight: 100,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
  button: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    ...shadows.medium,
  },
  primaryButton: {
    backgroundColor: colors.teams.cyan.main,
    borderWidth: 3,
    borderColor: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.teams.vert.main,
    borderWidth: 3,
    borderColor: colors.white,
  },
  buttonLabel: {
    fontSize: typography.fontSize.large,
    color: colors.white,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  tempButtonContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  tempButton: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  tempButtonLabel: {
    fontSize: typography.fontSize.small,
    color: colors.accent,
  },
});

export default HomeScreen;