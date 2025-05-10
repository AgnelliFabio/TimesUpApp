import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Button, Title, Text, Checkbox, RadioButton, Card, Divider, Subheading, List } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database, { Category, Team, Player } from '../database/Database';

type GameConfigScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GameConfig'>;

type Props = {
  navigation: GameConfigScreenNavigationProp;
};

// Interface pour les équipes avec leurs joueurs
interface TeamWithPlayers extends Team {
  players: Player[];
  checked: boolean;
}

// Durations for the game rounds (in seconds)
const ROUND_DURATIONS = [30, 45, 60, 90, 120];
// Number of phrases per team
const PHRASES_PER_TEAM_OPTIONS = [10, 15, 20, 25, 30];

const GameConfigScreen: React.FC<Props> = ({ navigation }) => {
  const [categories, setCategories] = useState<(Category & { checked: boolean })[]>([]);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roundDuration, setRoundDuration] = useState(ROUND_DURATIONS[1]); // Default to 45 seconds
  const [phrasesPerTeam, setPhrasesPerTeam] = useState(PHRASES_PER_TEAM_OPTIONS[1]); // Default to 15 phrases

  // Chargement des catégories et des équipes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Charger les catégories
        const loadedCategories = await Database.getCategories();
        setCategories(loadedCategories.map(category => ({ ...category, checked: true })));
        
        // Charger les équipes avec leurs joueurs
        const loadedTeams = await Database.getTeams();
        const teamsWithPlayers = await Promise.all(
          loadedTeams.map(async (team) => {
            const players = await Database.getTeamPlayers(team.id!);
            return { ...team, players, checked: true };
          })
        );
        
        setTeams(teamsWithPlayers);
      } catch (error) {
        console.error('Erreur lors du chargement des données', error);
        Alert.alert('Erreur', 'Impossible de charger les données de configuration');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Basculer la sélection d'une catégorie
  const toggleCategory = (id: number) => {
    setCategories(categories.map(category => 
      category.id === id ? { ...category, checked: !category.checked } : category
    ));
  };

  // Basculer la sélection d'une équipe
  const toggleTeam = (id: number) => {
    setTeams(teams.map(team => 
      team.id === id ? { ...team, checked: !team.checked } : team
    ));
  };

  // Vérifier si la configuration est valide pour démarrer une partie
  const isConfigValid = () => {
    const selectedCategories = categories.filter(c => c.checked);
    const selectedTeams = teams.filter(t => t.checked);
    
    if (selectedCategories.length === 0) {
      Alert.alert('Configuration invalide', 'Vous devez sélectionner au moins une catégorie.');
      return false;
    }
    
    if (selectedTeams.length < 2) {
      Alert.alert('Configuration invalide', 'Vous devez sélectionner au moins deux équipes.');
      return false;
    }
    
    // Vérifier que toutes les équipes sélectionnées ont au moins un joueur
    const teamsWithoutPlayers = selectedTeams.filter(team => team.players.length === 0);
    if (teamsWithoutPlayers.length > 0) {
      Alert.alert('Configuration invalide', 'Toutes les équipes sélectionnées doivent avoir au moins un joueur.');
      return false;
    }
    
    return true;
  };

  // Démarrer une nouvelle partie
  const startGame = async () => {
    if (!isConfigValid()) {
      return;
    }
    
    try {
      const selectedCategoryIds = categories
        .filter(c => c.checked)
        .map(c => c.id!);
      
      const selectedTeamIds = teams
        .filter(t => t.checked)
        .map(t => t.id!);
      
      const totalPhrases = phrasesPerTeam * selectedTeamIds.length;
      
      // Récupérer des phrases aléatoires pour la partie
      const gameData = {
        roundDuration,
        phrasesPerTeam,
        selectedCategoryIds,
        selectedTeamIds,
        teams: teams.filter(t => t.checked),
      };
      
      // À ce stade, nous passerions les données à l'écran de jeu
      // Nous allons implémenter cet écran dans la prochaine étape
      
      Alert.alert(
        'Configuration terminée',
        `Partie configurée avec ${selectedTeamIds.length} équipes, ${selectedCategoryIds.length} catégories, ${totalPhrases} phrases au total, et ${roundDuration} secondes par tour.`,
        [
          {
            text: 'OK',
            // Nous commenterons cette navigation jusqu'à ce que l'écran de jeu soit implémenté
            // onPress: () => navigation.navigate('Game', { gameData })
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la configuration de la partie', error);
      Alert.alert('Erreur', 'Impossible de configurer la partie');
    }
  };

  // Obtenir le nom de la couleur à partir de sa valeur
  const getColorName = (colorValue: string): string => {
    const colorMap: { [key: string]: string } = {
      '#e53935': 'Rouge',
      '#1e88e5': 'Bleu',
      '#43a047': 'Vert',
      '#fdd835': 'Jaune'
    };
    
    return colorMap[colorValue] || 'Inconnu';
  };

  // Rendu de l'indicateur de couleur
  const renderColorIndicator = (color: string) => {
    return (
      <View 
        style={[
          styles.colorIndicator, 
          { backgroundColor: color }
        ]} 
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Chargement de la configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Configuration de la partie</Title>
      
      {/* Section des équipes */}
      <Card style={styles.card}>
        <Card.Title title="Équipes" />
        <Card.Content>
          <Text style={styles.subtitle}>
            Sélectionnez au moins deux équipes qui vont participer
          </Text>
          {teams.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune équipe disponible. Créez d'abord des équipes dans la section "Gestion des Équipes".
            </Text>
          ) : (
            teams.map((team) => (
              <List.Item
                key={team.id}
                title={`Équipe ${getColorName(team.color)}`}
                description={
                  team.players.length > 0
                    ? `Joueurs: ${team.players.map(p => p.name).join(', ')}`
                    : "Aucun joueur dans cette équipe"
                }
                left={() => renderColorIndicator(team.color)}
                right={() => (
                  <Checkbox
                    status={team.checked ? 'checked' : 'unchecked'}
                    onPress={() => toggleTeam(team.id!)}
                    disabled={team.players.length === 0}
                  />
                )}
                disabled={team.players.length === 0}
                style={[
                  styles.listItem,
                  team.players.length === 0 && styles.disabledItem
                ]}
              />
            ))
          )}
        </Card.Content>
      </Card>
      
      {/* Section des catégories */}
      <Card style={styles.card}>
        <Card.Title title="Catégories" />
        <Card.Content>
          <Text style={styles.subtitle}>
            Sélectionnez les catégories de mots à utiliser
          </Text>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune catégorie disponible.
            </Text>
          ) : (
            categories.map((category) => (
              <List.Item
                key={category.id}
                title={category.name}
                right={() => (
                  <Checkbox
                    status={category.checked ? 'checked' : 'unchecked'}
                    onPress={() => toggleCategory(category.id!)}
                  />
                )}
                style={styles.listItem}
              />
            ))
          )}
        </Card.Content>
      </Card>
      
      {/* Section de la durée des tours */}
      <Card style={styles.card}>
        <Card.Title title="Durée des tours" />
        <Card.Content>
          <Text style={styles.subtitle}>
            Sélectionnez la durée de chaque tour en secondes
          </Text>
          <RadioButton.Group onValueChange={(value) => setRoundDuration(Number(value))} value={roundDuration.toString()}>
            <View style={styles.optionsContainer}>
              {ROUND_DURATIONS.map((duration) => (
                <View key={duration} style={styles.optionItem}>
                  <RadioButton value={duration.toString()} />
                  <Text>{duration} secondes</Text>
                </View>
              ))}
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>
      
      {/* Section du nombre de phrases */}
      <Card style={styles.card}>
        <Card.Title title="Nombre de phrases" />
        <Card.Content>
          <Text style={styles.subtitle}>
            Sélectionnez le nombre de phrases par équipe
          </Text>
          <RadioButton.Group onValueChange={(value) => setPhrasesPerTeam(Number(value))} value={phrasesPerTeam.toString()}>
            <View style={styles.optionsContainer}>
              {PHRASES_PER_TEAM_OPTIONS.map((count) => (
                <View key={count} style={styles.optionItem}>
                  <RadioButton value={count.toString()} />
                  <Text>{count} phrases</Text>
                </View>
              ))}
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>
      
      {/* Bouton pour démarrer la partie */}
      <Button 
        mode="contained" 
        style={styles.startButton}
        onPress={startGame}
        disabled={teams.filter(t => t.checked).length < 2 || categories.filter(c => c.checked).length === 0}
      >
        Démarrer la partie
      </Button>
      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    color: '#3f51b5',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  listItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  disabledItem: {
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
    color: '#757575',
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 10,
    marginRight: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    marginBottom: 8,
  },
  startButton: {
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: '#3f51b5',
    paddingVertical: 8,
  },
});

export default GameConfigScreen;