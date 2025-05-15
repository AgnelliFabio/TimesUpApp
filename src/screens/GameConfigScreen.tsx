import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { Button, Title, Text, IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database, { Category, Team, Player } from '../database/Database';
import { GameConfig } from '../models/GameModels';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { images } from '../hooks/useAssets';
import CustomSlider from '../components/CustomSlider';

const { width } = Dimensions.get('window');

type GameConfigScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GameConfig'>;

type Props = {
  navigation: GameConfigScreenNavigationProp;
};

interface TeamWithPlayers extends Team {
  players: Player[];
}

const GameConfigScreen: React.FC<Props> = ({ navigation }) => {
  const [categories, setCategories] = useState<(Category & { checked: boolean })[]>([]);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roundDuration, setRoundDuration] = useState(45);
  const [numberOfWords, setNumberOfWords] = useState(20);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const loadedCategories = await Database.getCategories();
        setCategories(loadedCategories.map(category => ({ ...category, checked: true })));
        
        const loadedTeams = await Database.getTeams();
        const teamsWithPlayers = await Promise.all(
          loadedTeams.map(async (team) => {
            const players = await Database.getTeamPlayers(team.id!);
            return { ...team, players };
          })
        );
        
        // Filtrer pour ne montrer que les équipes complètes (2 joueurs)
        setTeams(teamsWithPlayers.filter(team => team.players.length === 2));
      } catch (error) {
        console.error('Erreur lors du chargement des données', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Fonction pour obtenir le nom de la couleur
  const getTeamName = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      '#03B0AE': 'CYAN',
      '#4D2BAD': 'VIOLET',
      '#BE2045': 'POURPRE',
      '#ABD926': 'VERTE'
    };
    return colorMap[color] || 'ÉQUIPE';
  };

  // Fonction pour obtenir l'icône de l'équipe
  const getTeamIcon = () => {
    // Placeholder pour l'icône - sera ajouté quand les images seront testées
    return null;
  };

  // Basculer la sélection d'une catégorie
  const toggleCategory = (id: number) => {
    setCategories(categories.map(category => 
      category.id === id ? { ...category, checked: !category.checked } : category
    ));
  };

  // Activer/désactiver toutes les catégories
  const toggleAllCategories = () => {
    const allChecked = categories.every(cat => cat.checked);
    setCategories(categories.map(category => ({ ...category, checked: !allChecked })));
  };

  // Validation et lancement du jeu
  const startGame = async () => {
    const selectedCategories = categories.filter(c => c.checked);
    
    if (selectedCategories.length === 0) {
      alert('Vous devez sélectionner au moins une catégorie.');
      return;
    }
    
    if (teams.length < 2) {
      alert('Vous devez avoir au moins deux équipes complètes.');
      return;
    }

    try {
      const gameConfig: GameConfig = {
        teams: teams,
        selectedCategoryIds: selectedCategories.map(c => c.id!),
        roundDuration,
        phrasesPerTeam: numberOfWords,
      };
      
      navigation.navigate('Game', { gameConfig });
    } catch (error) {
      console.error('Erreur lors de la configuration de la partie', error);
      alert('Impossible de configurer la partie');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={images.gradientBackground} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header avec logo */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <IconButton 
              icon="arrow-left" 
              size={32}
              iconColor={colors.white}
            />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Time's Out</Text>
          </View>
        </View>

        {/* Section Équipes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ÉQUIPES</Text>
          
          <View style={styles.teamsGrid}>
            {teams.map((team) => (
              <View key={team.id} style={[
                styles.teamCard,
                {
                  backgroundColor: team.color,
                  borderColor: colors.white,
                }
              ]}>
                <View style={styles.teamHeader}>
                  <Text style={styles.teamName}>{getTeamName(team.color)}</Text>
                </View>
                {team.players.map((player, index) => (
                  <Text key={player.id} style={styles.playerName}>
                    {player.name}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => navigation.navigate('Players')}
          >
            <Text style={styles.manageButtonText}>GÉRER LES ÉQUIPES</Text>
          </TouchableOpacity>
        </View>

        {/* Section Catégories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATÉGORIES</Text>
          
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: category.checked ? colors.accent : colors.background.secondary,
                    borderColor: colors.white,
                  }
                ]}
                onPress={() => toggleCategory(category.id!)}
              >
                <Text style={[
                  styles.categoryText,
                  { color: category.checked ? colors.black : colors.white }
                ]}>
                  {category.name}
                </Text>
                <Text style={[
                  styles.categoryIcon,
                  { color: category.checked ? colors.black : colors.white }
                ]}>
                  {category.checked ? '✕' : '+'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.manageButton}
            onPress={toggleAllCategories}
          >
            <Text style={styles.manageButtonText}>TOUT ACTIVER</Text>
          </TouchableOpacity>
        </View>

        {/* Section Paramètres */}
        <View style={styles.section}>
          <CustomSlider
            value={roundDuration}
            onValueChange={setRoundDuration}
            minimumValue={30}
            maximumValue={90}
            step={10}
            label="TEMPS DU ROUND"
            unit="S"
          />

          <CustomSlider
            value={numberOfWords}
            onValueChange={setNumberOfWords}
            minimumValue={15}
            maximumValue={35}
            step={5}
            label="NOMBRE DE MOTS"
            unit=""
          />
        </View>

        {/* Bouton de lancement */}
        <View style={styles.launchContainer}>
          <Button
            mode="contained"
            style={styles.launchButton}
            labelStyle={styles.launchButtonText}
            onPress={startGame}
          >
            LANCER LA PARTIE
          </Button>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoText: {
    fontSize: typography.fontSize.xxxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  teamCard: {
    width: (width - (spacing.lg * 2) - spacing.sm) / 2,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 3,
    marginBottom: spacing.sm,
    minHeight: 120,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  teamName: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  playerName: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryButton: {
    width: (width - (spacing.lg * 2) - spacing.sm) / 2,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 3,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
    marginRight: spacing.xs,
  },
  categoryIcon: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
  },
  manageButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  manageButtonText: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  launchContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  launchButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderWidth: 3,
    borderColor: colors.white,
  },
  launchButtonText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.black,
  },
});

export default GameConfigScreen;