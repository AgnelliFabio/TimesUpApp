import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Button, Title, Text, List, FAB, TextInput, Dialog, Portal } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database, { Player } from '../database/Database';

type PlayersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Players'>;

type Props = {
  navigation: PlayersScreenNavigationProp;
};

const PlayersScreen: React.FC<Props> = ({ navigation }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');

  // Chargement des joueurs depuis la base de données
  const loadPlayers = async () => {
    try {
      setIsLoading(true);
      const loadedPlayers = await Database.getPlayers();
      setPlayers(loadedPlayers);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs', error);
      Alert.alert('Erreur', 'Impossible de charger les joueurs');
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement des joueurs au démarrage
  useEffect(() => {
    const initDb = async () => {
      try {
        await Database.initDatabase();
        await loadPlayers();
      } catch (error) {
        console.error('Erreur d\'initialisation', error);
        Alert.alert('Erreur', 'Impossible d\'initialiser la base de données');
      }
    };
    
    initDb();
  }, []);

  // Ajout d'un joueur
  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Erreur', 'Le nom du joueur ne peut pas être vide');
      return;
    }

    try {
      await Database.addPlayer({ name: playerName.trim() });
      setPlayerName('');
      setDialogVisible(false);
      loadPlayers();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du joueur', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le joueur');
    }
  };

  // Suppression d'un joueur
  const handleDeletePlayer = (player: Player) => {
    Alert.alert(
      'Confirmation',
      `Êtes-vous sûr de vouloir supprimer ${player.name} ?`,
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
              if (player.id) {
                await Database.deletePlayer(player.id);
                loadPlayers();
              }
            } catch (error) {
              console.error('Erreur lors de la suppression', error);
              Alert.alert('Erreur', 'Impossible de supprimer le joueur');
            }
          }
        }
      ]
    );
  };

  // Édition d'un joueur
  const handleEditPlayer = async () => {
    if (!playerName.trim() || !currentPlayer || !currentPlayer.id) {
      Alert.alert('Erreur', 'Données invalides');
      return;
    }

    try {
      await Database.updatePlayer({
        id: currentPlayer.id,
        name: playerName.trim()
      });
      setEditDialogVisible(false);
      setPlayerName('');
      setCurrentPlayer(null);
      loadPlayers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le joueur');
    }
  };

  // Ouverture du dialogue d'édition
  const openEditDialog = (player: Player) => {
    setCurrentPlayer(player);
    setPlayerName(player.name);
    setEditDialogVisible(true);
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Gestion des Joueurs</Title>
      
      {players.length === 0 && !isLoading ? (
        <Text style={styles.emptyText}>
          Aucun joueur ajouté. Appuyez sur le bouton + pour ajouter un joueur.
        </Text>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              right={(props) => (
                <View style={styles.actionButtons}>
                  <Button 
                    onPress={() => openEditDialog(item)} 
                    mode="text" 
                    compact
                  >
                    Modifier
                  </Button>
                  <Button 
                    onPress={() => handleDeletePlayer(item)} 
                    color="red" 
                    mode="text" 
                    compact
                  >
                    Supprimer
                  </Button>
                </View>
              )}
            />
          )}
          style={styles.list}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          setPlayerName('');
          setDialogVisible(true);
        }}
      />

      {/* Dialog pour ajouter un joueur */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Ajouter un joueur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom du joueur"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleAddPlayer}>Ajouter</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog pour modifier un joueur */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Modifier le joueur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nom du joueur"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Annuler</Button>
            <Button onPress={handleEditPlayer}>Modifier</Button>
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
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#757575',
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
});

export default PlayersScreen;