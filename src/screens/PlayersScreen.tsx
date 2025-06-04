import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { Text, IconButton, Dialog, Portal, TextInput, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database, { Player, Team } from '../database/Database';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import { images } from '../hooks/useAssets';

type PlayersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Players'>;

type Props = {
  navigation: PlayersScreenNavigationProp;
};

interface TeamWithPlayers extends Team {
  players: Player[];
}

interface TeamConfig {
  id: string;
  name: string;
  color: string;
  icon: any;
}

const TEAMS_CONFIG: TeamConfig[] = [
  {
    id: 'cyan',
    name: 'ÉQUIPE CYAN',
    color: colors.teams.cyan.main,
    icon: images.teams?.cyan,
  },
  {
    id: 'violet',
    name: 'ÉQUIPE VIOLET',
    color: colors.teams.violet.main,
    icon: images.teams?.violet,
  },
  {
    id: 'rouge',
    name: 'ÉQUIPE POURPRE',
    color: colors.teams.rouge.main,
    icon: images.teams?.rouge,
  },
  {
    id: 'vert',
    name: 'ÉQUIPE VERTE',
    color: colors.teams.vert.main,
    icon: images.teams?.vert,
  },
];

const PlayersScreen: React.FC<Props> = ({ navigation }) => {
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamColor, setSelectedTeamColor] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

  // Obtenir la couleur secondaire d'une équipe
  const getTeamSecondaryColor = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      [colors.teams.cyan.main]: colors.teams.cyan.secondary,
      [colors.teams.violet.main]: colors.teams.violet.secondary,
      [colors.teams.rouge.main]: colors.teams.rouge.secondary,
      [colors.teams.vert.main]: colors.teams.vert.secondary,
    };
    return colorMap[color] || colors.teams.cyan.secondary;
  };

  // Charger les données
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      await Database.initDatabase();
      
      // Créer des équipes pour chaque couleur si elles n'existent pas
      for (const teamConfig of TEAMS_CONFIG) {
        const existingTeams = await Database.getTeams();
        const teamExists = existingTeams.find(team => team.color === teamConfig.color);
        
        if (!teamExists) {
          await Database.addTeam({
            color: teamConfig.color,
          });
        }
      }
      
      // Charger toutes les équipes avec leurs joueurs
      const loadedTeams = await Database.getTeams();
      const teamsWithPlayers = await Promise.all(
        loadedTeams.map(async (team) => {
          const players = await Database.getTeamPlayers(team.id!);
          return { ...team, players };
        })
      );
      
      setTeams(teamsWithPlayers);
    } catch (error) {
      console.error('Erreur lors du chargement des équipes', error);
      Alert.alert('Erreur', 'Impossible de charger les équipes');
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter un joueur
  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Erreur', 'Le nom du joueur ne peut pas être vide');
      return;
    }

    try {
      const team = teams.find(t => t.color === selectedTeamColor);
      if (!team) {
        Alert.alert('Erreur', 'Équipe introuvable');
        return;
      }

      if (team.players.length >= 2) {
        Alert.alert('Erreur', 'Cette équipe a déjà le maximum de joueurs (2)');
        return;
      }

      const playerId = await Database.addPlayer({ name: playerName.trim() });
      await Database.addPlayerToTeam(team.id!, playerId);
      
      setPlayerName('');
      setDialogVisible(false);
      loadTeams();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du joueur', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le joueur');
    }
  };

  // Modifier un joueur
  const handleEditPlayer = async () => {
    if (!playerName.trim() || !editingPlayer) {
      Alert.alert('Erreur', 'Données invalides');
      return;
    }

    try {
      await Database.updatePlayer({
        id: editingPlayer.id,
        name: playerName.trim()
      });
      
      setEditDialogVisible(false);
      setPlayerName('');
      setEditingPlayer(null);
      loadTeams();
    } catch (error) {
      console.error('Erreur lors de la modification', error);
      Alert.alert('Erreur', 'Impossible de modifier le joueur');
    }
  };

  // Supprimer un joueur
  const handleDeletePlayer = async () => {
    if (!deletingPlayer) return;

    try {
      await Database.deletePlayer(deletingPlayer.id!);
      setDeleteDialogVisible(false);
      setDeletingPlayer(null);
      loadTeams();
    } catch (error) {
      console.error('Erreur lors de la suppression', error);
      Alert.alert('Erreur', 'Impossible de supprimer le joueur');
    }
  };

  // Ouvrir le dialogue d'ajout
  const openAddDialog = (teamColor: string) => {
    setSelectedTeamColor(teamColor);
    setPlayerName('');
    setDialogVisible(true);
  };

  // Ouvrir le dialogue de modification
  const openEditDialog = (player: Player) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
    setEditDialogVisible(true);
  };

  // Ouvrir le dialogue de suppression
  const openDeleteDialog = (player: Player) => {
    setDeletingPlayer(player);
    setDeleteDialogVisible(true);
  };

  // Navigation vers l'accueil
  const handleGoBack = () => {
    navigation.navigate('Home');
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
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <IconButton 
              icon="arrow-left" 
              size={32}
              iconColor={colors.white}
            />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>GESTION DES JOUEURS</Text>
          </View>
        </View>

        {/* Équipes avec scroll */}
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.teamsContainer}
        >
          {TEAMS_CONFIG.map((teamConfig) => {
            const team = teams.find(t => t.color === teamConfig.color);
            const teamPlayers = team?.players || [];
            const canAddPlayer = teamPlayers.length < 2;

            return (
              <View 
                key={teamConfig.id}
                style={[
                  styles.teamCard,
                  { backgroundColor: teamConfig.color }
                ]}
              >
                {/* Header de l'équipe avec bouton + unique */}
                <View style={styles.teamHeader}>
                  {teamConfig.icon && (
                    <Image 
                      source={teamConfig.icon} 
                      style={styles.teamIcon}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.teamName}>{teamConfig.name}</Text>
                  {canAddPlayer && (
                    <TouchableOpacity
                      style={[
                        styles.addButton,
                        { backgroundColor: getTeamSecondaryColor(teamConfig.color) }
                      ]}
                      onPress={() => openAddDialog(teamConfig.color)}
                    >
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Joueurs */}
                <View style={styles.playersContainer}>
                  {teamPlayers.map((player, index) => (
                    <React.Fragment key={player.id}>
                      <View style={styles.playerRow}>
                        <View style={styles.playerInfo}>
                          <View style={styles.playerDot} />
                          <Text style={styles.playerName}>{player.name}</Text>
                        </View>
                        <View style={styles.playerActions}>
                          <TouchableOpacity
                            onPress={() => openEditDialog(player)}
                            style={styles.actionButton}
                          >
                            <IconButton 
                              icon="pencil" 
                              size={20}
                              iconColor={colors.white}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openDeleteDialog(player)}
                            style={styles.actionButton}
                          >
                            <IconButton 
                              icon="close" 
                              size={20}
                              iconColor={colors.white}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* Séparateur entre les joueurs */}
                      {index < teamPlayers.length - 1 && (
                        <View style={styles.separator} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Dialog d'ajout */}
      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Ajouter un joueur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom du joueur"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
              style={styles.textInput}
              textColor={colors.white}
              theme={{
                colors: {
                  primary: colors.accent,
                  outline: colors.white,
                  onSurfaceVariant: colors.white,
                }
              }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setDialogVisible(false)}
              textColor={colors.white}
            >
              Annuler
            </Button>
            <Button 
              onPress={handleAddPlayer}
              mode="contained"
              buttonColor={colors.accent}
              textColor={colors.black}
              style={styles.actionDialogButton}
            >
              Ajouter
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog de modification */}
      <Portal>
        <Dialog 
          visible={editDialogVisible} 
          onDismiss={() => setEditDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Modifier le joueur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom du joueur"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
              style={styles.textInput}
              textColor={colors.white}
              theme={{
                colors: {
                  primary: colors.accent,
                  outline: colors.white,
                  onSurfaceVariant: colors.white,
                }
              }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setEditDialogVisible(false)}
              textColor={colors.white}
            >
              Annuler
            </Button>
            <Button 
              onPress={handleEditPlayer}
              mode="contained"
              buttonColor={colors.accent}
              textColor={colors.black}
              style={styles.actionDialogButton}
            >
              Modifier
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog de suppression */}
      <Portal>
        <Dialog 
          visible={deleteDialogVisible} 
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Supprimer le joueur</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.deleteText}>
              Êtes-vous sûr de vouloir supprimer "{deletingPlayer?.name}" ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setDeleteDialogVisible(false)}
              textColor={colors.white}
            >
              Annuler
            </Button>
            <Button 
              onPress={handleDeletePlayer}
              mode="contained"
              buttonColor={colors.teams.rouge.main}
              textColor={colors.white}
              style={styles.actionDialogButton}
            >
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingRight: 40, // Compenser la largeur du bouton retour pour centrer le titre
  },
  logoText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  teamsContainer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  teamCard: {
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    borderWidth: 3,
    borderColor: colors.white,
    minHeight: 120,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.md,
  },
  teamName: {
    flex: 1,
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: typography.fontSize.xxxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    lineHeight: typography.fontSize.xxxlarge,
    textAlign: 'center',
  },
  playersContainer: {
    // Pas de gap ici car on gère les séparateurs manuellement
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: spacing.md,
  },
  playerName: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    flex: 1,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.3,
    marginVertical: spacing.xs,
  },
  dialog: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dialogTitle: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  dialogActions: {
    justifyContent: 'space-around',
  },
  textInput: {
    backgroundColor: colors.background.secondary,
  },
  actionDialogButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  deleteText: {
    color: colors.white,
    fontSize: typography.fontSize.medium,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});

export default PlayersScreen;