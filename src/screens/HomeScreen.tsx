import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  
  // Fonction de reset améliorée
  const handleResetDatabase = async () => {
    Alert.alert(
      "⚠️ Réinitialiser la base de données",
      "Cette action va :\n\n• Supprimer toutes les équipes\n• Supprimer tous les joueurs\n• Arrêter toute partie en cours\n• Remettre les données par défaut\n\nCette action est irréversible !",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            
            try {
              console.log("🔄 Début de la réinitialisation depuis HomeScreen...");
              
              // Forcer la fermeture de toutes les connexions possibles
              await Database.closeDatabase();
              
              // Attendre un peu plus pour s'assurer que tout est fermé
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Réinitialiser la base de données
              await Database.resetDatabase();
              
              Alert.alert(
                "✅ Succès", 
                "La base de données a été réinitialisée avec succès !",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      console.log("✅ Réinitialisation terminée");
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error("❌ Erreur lors du reset:", error);
              
              Alert.alert(
                "❌ Erreur",
                error instanceof Error ? error.message : "Une erreur est survenue lors de la réinitialisation.\n\nVeuillez redémarrer l'application.",
                [
                  {
                    text: "OK"
                  }
                ]
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
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
            disabled={isLoading}
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
            disabled={isLoading}
          >
            GESTION DES JOUEURS
          </Button>
        </View>
        
        {/* Bouton temporaire de réinitialisation */}
        <View style={styles.tempButtonContainer}>
          <Button 
            mode="outlined" 
            style={[
              styles.tempButton,
              isLoading && styles.tempButtonDisabled
            ]}
            labelStyle={[
              styles.tempButtonLabel,
              isLoading && styles.tempButtonLabelDisabled
            ]}
            onPress={handleResetDatabase}
            disabled={isLoading}
          >
            {isLoading ? "🔄 RESET EN COURS..." : "DEBUG: Reset BDD"}
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
  tempButtonDisabled: {
    borderColor: colors.white,
    opacity: 0.7,
  },
  tempButtonLabelDisabled: {
    color: colors.white,
  },
});

export default HomeScreen;