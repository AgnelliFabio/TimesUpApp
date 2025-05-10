import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Button, Title, Text, List, FAB, Dialog, Portal, RadioButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database, { Team, Player } from '../database/Database';

type TeamsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Teams'>;

type Props = {
  navigation: TeamsScreenNavigationProp;
};

// Couleurs disponibles pour les équipes
const TEAM_COLORS = [
  { name: 'Rouge', value: '#e53935' },
  { name: 'Bleu', value: '#1e88e5' },
  { name: 'Vert', value: '#43a047' },
  { name: 'Jaune', value: '#fdd835' },
];

// Interface pour stocker une équipe avec ses joueurs
interface TeamWithPlayers extends Team {
  players: Player[];
}

const TeamsScreen: React.FC<Props> = ({ navigation }) => {
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [playersDialogVisible, setPlayersDialogVisible] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0].value);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  // Chargement des équipes et de leurs joueurs
  const loadTeams = async () => {
    try {
      setIsLoading(true);
      const loadedTeams = await Database.getTeams();
      
      // Pour chaque équipe, récupérer ses joueurs
      const teamsWithPlayers: TeamWithPlayers[] = await Promise.all(
        loadedTeams.map(async (team) => {
          const players = await Database.getTeamPlayers(team.id!);
          return {
            ...team,
            players
          };
        })
      );
      
      setTeams(teamsWithPlayers);
      
      // Mettre à jour les couleurs disponibles
      const usedColors = await Database.getUsedColors();
      const availableColorValues = TEAM_COLORS.map(c => c.value)
        .filter(color => !usedColors.includes(color) || (currentTeam && currentTeam.color === color));
      setAvailableColors(availableColorValues);
      
      // Si aucune couleur n'est disponible, utiliser la première couleur (pour l'édition)
      if (availableColorValues.length > 0) {
        setTeamColor(availableColorValues[0]);
      } else if (TEAM_COLORS.length > 0) {
        setTeamColor(TEAM_COLORS[0].value);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des équipes', error);
      Alert.alert('Erreur', 'Impossible de charger les équipes');
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement de tous les joueurs
  const loadPlayers = async () => {
    try {
      const loadedPlayers = await Database.getPlayers();
      setAllPlayers(loadedPlayers);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs', error);
      Alert.alert('Erreur', 'Impossible de charger les joueurs');
    }
  };

  // Chargement des joueurs disponibles (qui ne sont pas déjà dans une équipe)
  const loadAvailablePlayers = async () => {
    try {
      const allPlayersList = await Database.getPlayers();
      const availablePlayersList = await Promise.all(
        allPlayersList.map(async (player) => {
          const isInTeam = await Database.isPlayerInAnyTeam(player.id!);
          return { player, isAvailable: !isInTeam };
        })
      );
      
      setAvailablePlayers(availablePlayersList
        .filter(item => item.isAvailable)
        .map(item => item.player));
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs disponibles', error);
      Alert.alert('Erreur', 'Impossible de charger les joueurs disponibles');
    }
  };

  // Chargement initial
  useEffect(() => {
    const initData = async () => {
      try {
        await Database.initDatabase();
        await loadPlayers();
        await loadTeams();
        await loadAvailablePlayers();
        await updateAvailableColors(); 
      } catch (error) {
        console.error('Erreur d\'initialisation', error);
        Alert.alert('Erreur', 'Impossible d\'initialiser la base de données');
      }
    };
    
    initData();
  }, []);

  // Ajout d'une équipe
  const handleAddTeam = async () => {
    if (teams.length >= 4) {
      Alert.alert('Erreur', 'Vous ne pouvez pas créer plus de 4 équipes');
      return;
    }

    try {
      const teamId = await Database.addTeam({ color: teamColor });
      setDialogVisible(false);
      await loadTeams();
      await loadAvailablePlayers();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipe', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'équipe');
    }
  };

  // Suppression d'une équipe
  const handleDeleteTeam = (team: TeamWithPlayers) => {
    Alert.alert(
      'Confirmation',
      `Êtes-vous sûr de vouloir supprimer l'équipe ${team.color} ?`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel' 
        },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (team.id) {
                await Database.deleteTeam(team.id);
                await loadTeams();
                await loadAvailablePlayers();
              }
            } catch (error) {
              console.error('Erreur lors de la suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'équipe');
            }
          }
        }
      ]
    );
  };

  // Édition d'une équipe
  const handleEditTeam = async () => {
    if (!currentTeam || !currentTeam.id) {
      Alert.alert('Erreur', 'Données invalides');
      return;
    }

    try {
      await Database.updateTeam({
        id: currentTeam.id,
        color: teamColor
      });
      setEditDialogVisible(false);
      setTeamColor(TEAM_COLORS[0].value);
      setCurrentTeam(null);
      await loadTeams();
    } catch (error) {
      console.error('Erreur lors de la mise à jour', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'équipe');
    }
  };

  // Ouverture du dialogue d'édition
  const openEditDialog = (team: TeamWithPlayers) => {
    setCurrentTeam(team);
    setTeamColor(team.color);
    setEditDialogVisible(true);
  };

  // Ouverture du dialogue des joueurs
  const openPlayersDialog = async (team: TeamWithPlayers) => {
    try {
      setCurrentTeam(team);
      await loadAvailablePlayers();
      setSelectedPlayers(new Set());
      setPlayersDialogVisible(true);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs de l\'équipe', error);
      Alert.alert('Erreur', 'Impossible de charger les joueurs de l\'équipe');
    }
  };

  // Ajout de joueurs à l'équipe
  const handleAddPlayersToTeam = async () => {
    if (!currentTeam || !currentTeam.id || selectedPlayers.size === 0) {
      return;
    }
  
    try {
      // Vérifier si l'ajout de ces joueurs ne dépasse pas la limite de 2 joueurs par équipe
      const currentCount = await Database.countPlayersInTeam(currentTeam.id);
      if (currentCount + selectedPlayers.size > 2) {
        Alert.alert('Erreur', 'Une équipe ne peut pas avoir plus de 2 joueurs');
        return;
      }
  
      // Ajout des joueurs sélectionnés à l'équipe
      for (const playerId of selectedPlayers) {
        await Database.addPlayerToTeam(currentTeam.id, playerId);
      }
  
      setPlayersDialogVisible(false);
      Alert.alert('Succès', 'Joueurs ajoutés à l\'équipe');
      
      await loadTeams();
      await loadAvailablePlayers();
      await updateAvailableColors();
    } catch (error) {
      console.error('Erreur lors de l\'ajout des joueurs à l\'équipe', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les joueurs à l\'équipe');
    }
  };

  // Fonction pour mettre à jour les couleurs disponibles
const updateAvailableColors = async () => {
    try {
      const usedColors = await Database.getUsedColors();
      const availableColorValues = TEAM_COLORS.map(c => c.value)
        .filter(color => !usedColors.includes(color) || (currentTeam && currentTeam.color === color));
      setAvailableColors(availableColorValues);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des couleurs disponibles', error);
    }
  };
  
  // Suppression d'un joueur de l'équipe
  const handleRemovePlayerFromTeam = async (teamId: number, playerId: number) => {
    try {
      await Database.removePlayerFromTeam(teamId, playerId);
      await loadTeams();
      await loadAvailablePlayers();
      await updateAvailableColors(); // Ajoutez cette ligne
    } catch (error) {
      console.error('Erreur lors de la suppression du joueur de l\'équipe', error);
      Alert.alert('Erreur', 'Impossible de supprimer le joueur de l\'équipe');
    }
  };

  // Basculement de la sélection d'un joueur
  const togglePlayerSelection = (playerId: number) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      // Vérifier si l'ajout de ce joueur ne dépasse pas la limite de 2 joueurs par équipe
      const team = teams.find(t => t.id === currentTeam?.id);
      if (team && team.players.length + newSelected.size >= 2) {
        Alert.alert('Limite atteinte', 'Vous ne pouvez pas sélectionner plus de 2 joueurs par équipe');
        return;
      }
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  // Obtenir le nom de la couleur à partir de sa valeur
  const getColorName = (colorValue: string) => {
    const color = TEAM_COLORS.find(c => c.value === colorValue);
    return color ? color.name : 'Équipe';
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

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Gestion des Équipes</Title>
      
      {teams.length === 0 && !isLoading ? (
        <Text style={styles.emptyText}>
          Aucune équipe créée. Appuyez sur le bouton + pour ajouter une équipe.
        </Text>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.teamContainer}>
              <List.Item
                title={`Équipe ${getColorName(item.color)}`}
                left={() => renderColorIndicator(item.color)}
                right={(props) => (
                  <View style={styles.actionButtons}>
                    <Button 
                      onPress={() => openPlayersDialog(item)} 
                      mode="text"
                    >
                      Joueurs
                    </Button>
                    <Button 
                      onPress={() => openEditDialog(item)} 
                      mode="text"
                    >
                      Modifier
                    </Button>
                    <Button 
                      onPress={() => handleDeleteTeam(item)} 
                      color="red" 
                      mode="text"
                    >
                      Supprimer
                    </Button>
                  </View>
                )}
              />
              {item.players.length > 0 && (
                <View style={styles.playersContainer}>
                  <Text style={styles.playersTitle}>Joueurs:</Text>
                  {item.players.map((player) => (
                    <View key={player.id} style={styles.playerItem}>
                      <Text>{player.name}</Text>
                      <Button
                        icon="close"
                        mode="text"
                        onPress={() => handleRemovePlayerFromTeam(item.id!, player.id!)}
                      >
                        Retirer
                      </Button>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          style={styles.list}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          setCurrentTeam(null);
          // Utiliser la première couleur disponible
          if (availableColors.length > 0) {
            setTeamColor(availableColors[0]);
          } else {
            setTeamColor(TEAM_COLORS[0].value);
          }
          setDialogVisible(true);
        }}
        disabled={teams.length >= 4 || availableColors.length === 0}
      />

      {/* Dialog pour ajouter une équipe */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Ajouter une équipe</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.colorLabel}>Couleur de l'équipe</Text>
            <RadioButton.Group onValueChange={value => setTeamColor(value)} value={teamColor}>
              {TEAM_COLORS.filter(color => availableColors.includes(color.value)).map((color, index) => (
                <View key={index} style={styles.colorOption}>
                  <RadioButton value={color.value} />
                  <Text>{color.name}</Text>
                  <View style={[styles.colorSample, { backgroundColor: color.value }]} />
                </View>
              ))}
            </RadioButton.Group>
            {availableColors.length === 0 && (
              <Text style={styles.warningText}>Toutes les couleurs sont déjà utilisées.</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleAddTeam} disabled={availableColors.length === 0}>Ajouter</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog pour modifier une équipe */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Modifier l'équipe</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.colorLabel}>Couleur de l'équipe</Text>
            <RadioButton.Group onValueChange={value => setTeamColor(value)} value={teamColor}>
              {TEAM_COLORS.filter(color => availableColors.includes(color.value) || (currentTeam && currentTeam.color === color.value)).map((color, index) => (
                <View key={index} style={styles.colorOption}>
                  <RadioButton value={color.value} />
                  <Text>{color.name}</Text>
                  <View style={[styles.colorSample, { backgroundColor: color.value }]} />
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleEditTeam}>Modifier</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog pour gérer les joueurs d'une équipe */}
      <Portal>
        <Dialog visible={playersDialogVisible} onDismiss={() => setPlayersDialogVisible(false)}>
          <Dialog.Title>
            Joueurs de l'équipe {currentTeam && getColorName(currentTeam.color)}
          </Dialog.Title>
          <Dialog.Content>
            {currentTeam && teams.find(t => t.id === currentTeam.id)?.players.length === 2 ? (
              <Text style={styles.infoText}>
                Cette équipe a déjà le nombre maximum de joueurs (2).
              </Text>
            ) : (
              <>
                {availablePlayers.length > 0 ? (
                  <View>
                    <Text style={styles.sectionTitle}>Ajouter des joueurs:</Text>
                    {availablePlayers.map(player => (
                      <TouchableOpacity 
                        key={player.id} 
                        onPress={() => togglePlayerSelection(player.id!)}
                        style={styles.playerSelectItem}
                      >
                        <List.Item
                          title={player.name}
                          right={() => (
                            <RadioButton
                              value={player.id?.toString() || ''}
                              status={selectedPlayers.has(player.id!) ? 'checked' : 'unchecked'}
                              onPress={() => togglePlayerSelection(player.id!)}
                            />
                          )}
                        />
                      </TouchableOpacity>
                    ))}
                    
                    {selectedPlayers.size > 0 && (
                      <Button 
                        mode="contained" 
                        style={styles.addPlayersButton}
                        onPress={handleAddPlayersToTeam}
                      >
                        Ajouter les joueurs sélectionnés
                      </Button>
                    )}
                  </View>
                ) : (
                  <Text style={styles.infoText}>
                    Il n'y a plus de joueurs disponibles. Ajoutez d'abord des joueurs dans la section "Gestion des Joueurs".
                  </Text>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPlayersDialogVisible(false)}>Fermer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    color: '#3f51b5',
  },
  list: {
    flex: 1,
  },
  teamContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  playersContainer: {
    padding: 8,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  playersTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerSelectItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#757575',
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#757575',
    fontStyle: 'italic',
  },
  warningText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3f51b5',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorLabel: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  colorSample: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 10,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 10,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addPlayersButton: {
    marginTop: 16,
  },
});

export default TeamsScreen;