import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, BackHandler, ImageBackground, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Button, Text, Dialog, Portal } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Database from '../database/Database';
import { 
  GameConfig, 
  GameState, 
  RoundNumber, 
  PhraseStatus, 
  GamePhrase, 
  RoundState,
  ROUND_INSTRUCTIONS,
  TeamWithPlayers
} from '../models/GameModels';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { images } from '../hooks/useAssets';

const { width, height } = Dimensions.get('window');

type GameScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

type Props = {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
};

// Mapping des pictos de manche
const ROUND_PICTOS = {
  [RoundNumber.DESCRIPTION]: images.pictos?.description,
  [RoundNumber.ONE_WORD]: images.pictos?.oneWord,
  [RoundNumber.MIME]: images.pictos?.mime,
};

// Noms des manches
const ROUND_NAMES = {
  [RoundNumber.DESCRIPTION]: 'DESCRIPTION COMPLÈTE',
  [RoundNumber.ONE_WORD]: 'DESCRIPTION 1 MOT',
  [RoundNumber.MIME]: 'MIME',
};

const GameScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gameConfig } = route.params;
  
  // État du jeu
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [confirmEndGameVisible, setConfirmEndGameVisible] = useState(false);
  const [showTeamPreparationScreen, setShowTeamPreparationScreen] = useState(false);
  
  // Référence pour le timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Obtenir la configuration d'équipe par couleur
  const getTeamConfig = (color: string) => {
    const colorMap: { [key: string]: any } = {
      [colors.teams.cyan.main]: {
        name: 'CYAN',
        icon: images.teams?.cyan,
        colors: colors.teams.cyan
      },
      [colors.teams.violet.main]: {
        name: 'VIOLET',
        icon: images.teams?.violet,
        colors: colors.teams.violet
      },
      [colors.teams.rouge.main]: {
        name: 'POURPRE',
        icon: images.teams?.rouge,
        colors: colors.teams.rouge
      },
      [colors.teams.vert.main]: {
        name: 'VERTE',
        icon: images.teams?.vert,
        colors: colors.teams.vert
      },
    };
    return colorMap[color] || colorMap[colors.teams.cyan.main];
  };

// Initialisation du jeu
useEffect(() => {
  const initializeGame = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer un ensemble unique de phrases pour toutes les équipes
      const uniquePhrases = await Database.getUniquePhrasesByTeams(
        gameConfig.selectedCategoryIds,
        gameConfig.phrasesPerTeam,
        gameConfig.teams.length
      );
      
      // Vérifier qu'on a assez de phrases
      const totalNeeded = gameConfig.phrasesPerTeam * gameConfig.teams.length;
      if (uniquePhrases.length < totalNeeded) {
        Alert.alert(
          'Attention',
          `Pas assez de phrases disponibles dans les catégories sélectionnées.\nDemandé: ${totalNeeded}, Disponible: ${uniquePhrases.length}\n\nLa partie va commencer avec toutes les phrases disponibles.`
        );
      }
      
      // Répartir les phrases entre les équipes
      const teamPhrases: GamePhrase[] = [];
      
      // Log des phrases pour debug avec couleurs
      console.log('🎮 RÉPARTITION DES PHRASES UNIQUES PAR ÉQUIPE:');
      
      for (let teamIndex = 0; teamIndex < gameConfig.teams.length; teamIndex++) {
        const team = gameConfig.teams[teamIndex];
        const teamConfig = getTeamConfig(team.color);
        
        console.log(`\n🎯 ÉQUIPE ${teamConfig.name} (${team.color}) - ID: ${team.id}:`);
        
        // Calculer l'index de début et de fin pour cette équipe
        const startIndex = teamIndex * gameConfig.phrasesPerTeam;
        const endIndex = Math.min(startIndex + gameConfig.phrasesPerTeam, uniquePhrases.length);
        
        // Assigner les phrases à cette équipe
        for (let i = startIndex; i < endIndex; i++) {
          const phrase = uniquePhrases[i];
          const gamePhrase: GamePhrase = {
            ...phrase,
            status: PhraseStatus.PENDING,
            teamId: team.id!
          };
          
          teamPhrases.push(gamePhrase);
          console.log(`  ${i - startIndex + 1}. "${phrase.text}" (ID: ${phrase.id})`);
        }
        
        // Si on n'a pas assez de phrases pour cette équipe
        if (endIndex - startIndex < gameConfig.phrasesPerTeam) {
          console.log(`  ⚠️ Seulement ${endIndex - startIndex} phrases assignées sur ${gameConfig.phrasesPerTeam} demandées`);
        }
      }
      
      // Mélanger toutes les phrases pour la première manche
      const shuffledPhrases = [...teamPhrases].sort(() => 0.5 - Math.random());
      
      console.log(`\n📊 RÉSUMÉ:`);
      console.log(`- Total phrases uniques: ${uniquePhrases.length}`);
      console.log(`- Phrases par équipe (réel): ${Math.floor(teamPhrases.length / gameConfig.teams.length)}`);
      console.log(`- Phrases mélangées pour la manche 1: ${shuffledPhrases.length}`);
      
      // Vérifier la répartition
      const phrasesByTeam = teamPhrases.reduce((acc, phrase) => {
        acc[phrase.teamId] = (acc[phrase.teamId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      console.log('📋 Répartition finale:', phrasesByTeam);
      
      // Initialiser les scores
      const initialScores: Record<number, number> = {};
      gameConfig.teams.forEach(team => {
        initialScores[team.id!] = 0;
      });
      
      // Initialiser l'état des manches
      const roundStates: Record<RoundNumber, RoundState> = {
        [RoundNumber.DESCRIPTION]: {
          currentTeamIndex: 0,
          currentPhraseIndex: 0,
          phrasesForRound: [...shuffledPhrases],
          scores: { ...initialScores },
          timeLeft: gameConfig.roundDuration,
          roundActive: false
        },
        [RoundNumber.ONE_WORD]: {
          currentTeamIndex: 0,
          currentPhraseIndex: 0,
          phrasesForRound: [],
          scores: { ...initialScores },
          timeLeft: gameConfig.roundDuration,
          roundActive: false
        },
        [RoundNumber.MIME]: {
          currentTeamIndex: 0,
          currentPhraseIndex: 0,
          phrasesForRound: [],
          scores: { ...initialScores },
          timeLeft: gameConfig.roundDuration,
          roundActive: false
        }
      };
      
      // Initialiser l'état du jeu
      const newGameState: GameState = {
        config: gameConfig,
        currentRound: RoundNumber.DESCRIPTION,
        rounds: roundStates,
        gameStarted: false,
        gameFinished: false
      };
      
      setGameState(newGameState);
      setShowTeamPreparationScreen(true);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du jeu', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser le jeu. Veuillez réessayer.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  initializeGame();
  
  // Gestion du bouton retour
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (gameState?.gameStarted && !gameState.gameFinished) {
      setConfirmEndGameVisible(true);
      return true;
    }
    return false;
  });
  
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    backHandler.remove();
  };
}, []);
  
  // Démarrer le timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setGameState(prevState => {
        if (!prevState) return null;
        
        const currentRoundState = prevState.rounds[prevState.currentRound];
        
        if (currentRoundState.roundActive) {
          if (currentRoundState.timeLeft <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            const newRounds = { ...prevState.rounds };
            newRounds[prevState.currentRound] = {
              ...currentRoundState,
              timeLeft: 0,
              roundActive: false
            };
            
            setTimeout(() => {
              Alert.alert('Temps écoulé!', 'C\'est au tour de l\'équipe suivante.');
              nextTeamTurn();
            }, 100);
            
            return {
              ...prevState,
              rounds: newRounds
            };
          }
          
          const newRounds = { ...prevState.rounds };
          newRounds[prevState.currentRound] = {
            ...currentRoundState,
            timeLeft: currentRoundState.timeLeft - 1
          };
          
          return {
            ...prevState,
            rounds: newRounds
          };
        }
        
        return prevState;
      });
    }, 1000);
  };
  
  // Marquer une phrase comme trouvée
const markPhraseAsFound = () => {
  if (!gameState) return;
  
  const currentRound = gameState.currentRound;
  const roundState = gameState.rounds[currentRound];
  const currentTeamId = gameState.config.teams[roundState.currentTeamIndex].id!;
  const currentPhrase = roundState.phrasesForRound[roundState.currentPhraseIndex];
  
  console.log('🎯 TROUVÉ - Phrase:', currentPhrase?.text, '| Équipe qui joue:', getTeamConfig(currentTeam.color).name, `(${currentTeam.color})`, '| Phrase appartient à:', currentPhrase?.teamId);
  
  setGameState(prevState => {
    if (!prevState) return null;
    
    const currentRoundState = prevState.rounds[currentRound];
    const phrases = [...currentRoundState.phrasesForRound];
    
    phrases[currentRoundState.currentPhraseIndex] = {
      ...currentPhrase,
      status: PhraseStatus.FOUND
    };
    
    const newScores = { ...currentRoundState.scores };
    newScores[currentTeamId] = newScores[currentTeamId] + 1;
    
    // Chercher la prochaine phrase disponible (n'importe laquelle)
    let nextPhraseIndex = -1;
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].status === PhraseStatus.PENDING) {
        nextPhraseIndex = i;
        break;
      }
    }
    
    // Si plus de phrases disponibles, fin de la manche
    if (nextPhraseIndex === -1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        phrasesForRound: phrases,
        scores: newScores,
        roundActive: false
      };
      
      if (currentRound < RoundNumber.MIME) {
        setTimeout(() => {
          prepareNextRound(currentRound + 1, phrases, newScores);
        }, 100);
      } else {
        setTimeout(() => {
          setScoreVisible(true);
        }, 100);
        
        return {
          ...prevState,
          rounds: newRounds,
          gameFinished: true
        };
      }
      
      return {
        ...prevState,
        rounds: newRounds
      };
    } else {
      // Il reste des phrases, continuer avec la prochaine
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        currentPhraseIndex: nextPhraseIndex,
        phrasesForRound: phrases,
        scores: newScores
      };
      
      return {
        ...prevState,
        rounds: newRounds
      };
    }
  });
};

// Marquer une phrase comme passée
const markPhraseAsSkipped = () => {
  if (!gameState) return;
  
  const currentRound = gameState.currentRound;
  const roundState = gameState.rounds[currentRound];
  const currentPhrase = roundState.phrasesForRound[roundState.currentPhraseIndex];
  
  console.log('⏭️ PASSÉ - Phrase:', currentPhrase?.text, '| Équipe qui joue:', getTeamConfig(currentTeam.color).name, `(${currentTeam.color})`, '| Phrase appartient à:', currentPhrase?.teamId);
  
  setGameState(prevState => {
    if (!prevState) return null;
    
    const currentRoundState = prevState.rounds[currentRound];
    const phrases = [...currentRoundState.phrasesForRound];
    
    phrases[currentRoundState.currentPhraseIndex] = {
      ...currentPhrase,
      status: PhraseStatus.SKIPPED
    };
    
    // Chercher la prochaine phrase disponible (n'importe laquelle)
    let nextPhraseIndex = -1;
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].status === PhraseStatus.PENDING) {
        nextPhraseIndex = i;
        break;
      }
    }
    
    // Si plus de phrases disponibles, fin de la manche
    if (nextPhraseIndex === -1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        phrasesForRound: phrases,
        roundActive: false
      };
      
      if (currentRound < RoundNumber.MIME) {
        setTimeout(() => {
          prepareNextRound(currentRound + 1, phrases, currentRoundState.scores);
        }, 100);
      } else {
        setTimeout(() => {
          setScoreVisible(true);
        }, 100);
        
        return {
          ...prevState,
          rounds: newRounds,
          gameFinished: true
        };
      }
      
      return {
        ...prevState,
        rounds: newRounds
      };
    } else {
      // Il reste des phrases, continuer avec la prochaine
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        currentPhraseIndex: nextPhraseIndex,
        phrasesForRound: phrases
      };
      
      return {
        ...prevState,
        rounds: newRounds
      };
    }
  });
};
  
  // Préparer la manche suivante
  const prepareNextRound = (nextRound: RoundNumber, phrases: GamePhrase[], scores: Record<number, number>) => {
    setTimeout(() => {
      const resetPhrases = phrases.map(phrase => ({
        ...phrase,
        status: PhraseStatus.PENDING
      }));
      
      const shuffledPhrases = [...resetPhrases].sort(() => 0.5 - Math.random());
      
      setGameState(prevState => {
        if (!prevState) return null;
        
        const newRounds = { ...prevState.rounds };
        newRounds[nextRound] = {
          ...newRounds[nextRound],
          phrasesForRound: shuffledPhrases,
          scores: { ...scores },
          timeLeft: gameConfig.roundDuration,
          currentTeamIndex: 0,
          currentPhraseIndex: 0
        };
        
        return {
          ...prevState,
          currentRound: nextRound,
          rounds: newRounds
        };
      });
      
      setShowTeamPreparationScreen(true);
    }, 100);
  };
  
  // Passer au tour de l'équipe suivante
const nextTeamTurn = () => {
  if (!gameState) return;
  
  const currentRound = gameState.currentRound;
  const teamCount = gameState.config.teams.length;
  
  setGameState(prevState => {
    if (!prevState) return null;
    
    const currentRoundState = prevState.rounds[currentRound];
    
    // Calculer l'index de la prochaine équipe
    const nextTeamIndex = (currentRoundState.currentTeamIndex + 1) % teamCount;
    
    // Trouver la première phrase disponible (n'importe laquelle)
    let nextPhraseIndex = -1;
    const phrases = currentRoundState.phrasesForRound;
    
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].status === PhraseStatus.PENDING) {
        nextPhraseIndex = i;
        break;
      }
    }
    
    // Si aucune phrase disponible, fin de la manche
    if (nextPhraseIndex === -1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        roundActive: false
      };
      
      if (currentRound < RoundNumber.MIME) {
        setTimeout(() => {
          prepareNextRound(currentRound + 1, phrases, currentRoundState.scores);
        }, 100);
      } else {
        setTimeout(() => {
          setScoreVisible(true);
        }, 100);
        
        return {
          ...prevState,
          rounds: newRounds,
          gameFinished: true
        };
      }
      
      return prevState;
    }
    
    // Mettre à jour l'état avec la nouvelle équipe et phrase
    const newRounds = { ...prevState.rounds };
    newRounds[currentRound] = {
      ...currentRoundState,
      currentTeamIndex: nextTeamIndex,
      currentPhraseIndex: nextPhraseIndex,
      timeLeft: gameConfig.roundDuration,
      roundActive: false
    };
    
    return {
      ...prevState,
      rounds: newRounds
    };
  });
  
  setTimeout(() => {
    setShowTeamPreparationScreen(true);
  }, 100);
};
  
  // Reprendre le jeu
  const resumeGame = () => {
    if (!gameState) return;
    
    setShowTeamPreparationScreen(false);
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRoundState = prevState.rounds[prevState.currentRound];
      
      const newRounds = { ...prevState.rounds };
      newRounds[prevState.currentRound] = {
        ...currentRoundState,
        roundActive: true
      };
      
      return {
        ...prevState,
        gameStarted: true,
        rounds: newRounds
      };
    });
    
    startTimer();
  };
  
  // Quitter le jeu
  const quitGame = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setConfirmEndGameVisible(false);
    navigation.navigate('Home');
  };
  
  // Formater le temps restant (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculer le pourcentage du temps écoulé pour le cercle
  const getTimePercentage = (): number => {
    if (!gameState) return 0;
    const roundState = gameState.rounds[gameState.currentRound];
    const totalTime = gameConfig.roundDuration;
    const timeElapsed = totalTime - roundState.timeLeft;
    return (timeElapsed / totalTime) * 100;
  };
  
  // Affichage des scores
  const renderScores = () => {
    if (!gameState) return null;
    
    const currentRound = gameState.currentRound;
    const scores = gameState.rounds[currentRound].scores;
    const teams = gameState.config.teams;
    
    return (
      <View style={styles.scoresContainer}>
        <Text style={styles.scoresTitle}>SCORES</Text>
        {teams.map(team => {
          const teamConfig = getTeamConfig(team.color);
          return (
            <View key={team.id} style={styles.scoreRow}>
              <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
              <Text style={styles.scoreTeamName}>ÉQUIPE {teamConfig.name}</Text>
              <Text style={styles.scoreValue}>{scores[team.id!]}</Text>
            </View>
          );
        })}
      </View>
    );
  };
  
  if (isLoading || !gameState) {
    return (
      <ImageBackground source={images.gradientBackground} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement du jeu...</Text>
        </View>
      </ImageBackground>
    );
  }
  
  const currentRound = gameState.currentRound;
  const roundState = gameState.rounds[currentRound];
  const currentTeam = gameState.config.teams[roundState.currentTeamIndex];
  const currentPhrase = roundState.phrasesForRound[roundState.currentPhraseIndex];
  const teamConfig = getTeamConfig(currentTeam.color);
  
  return (
    <ImageBackground source={images.gradientBackground} style={styles.container}>
      <View style={styles.content}>
        {/* Header permanent avec info équipe et manche */}
        <View style={[styles.headerCard, { backgroundColor: currentTeam.color }]}>
          <View style={styles.teamSection}>
            {teamConfig.icon && (
              <Image source={teamConfig.icon} style={styles.teamIcon} resizeMode="contain" />
            )}
            <View style={styles.teamInfo}>
              <Text style={styles.teamTitle}>ÉQUIPE {teamConfig.name}</Text>
              <Text style={styles.playerText}>{currentTeam.players[0]?.name}</Text>
              <Text style={styles.playerText}>{currentTeam.players[1]?.name}</Text>
            </View>
          </View>
          
          <View style={styles.roundSection}>
            <Text style={styles.roundNumber}>MANCHE {currentRound}</Text>
            <Image source={ROUND_PICTOS[currentRound]} style={styles.roundIcon} resizeMode="contain" />
            <Text style={styles.roundName}>{ROUND_NAMES[currentRound]}</Text>
          </View>
        </View>
        
        {/* Bouton Scores */}
        <TouchableOpacity style={styles.scoresButton} onPress={() => setScoreVisible(true)}>
          <Text style={styles.scoresButtonText}>SCORES</Text>
        </TouchableOpacity>
        
        {/* Contenu principal selon l'état */}
        <View style={styles.mainContent}>
          {showTeamPreparationScreen ? (
            // Écran de préparation
            <View style={styles.preparationContainer}>
              <Text style={styles.preparationTitle}>MANCHE {currentRound}</Text>
              <Text style={styles.preparationSubtitle}>ÉQUIPE {teamConfig.name}</Text>
              <Text style={styles.preparationPlayers}>
                {currentTeam.players.map(p => p.name).join(' & ')}
              </Text>
              
              <Text style={styles.preparationDescription}>
                {ROUND_INSTRUCTIONS[currentRound]}
              </Text>
              
              <Text style={styles.preparationTime}>
                Temps disponible: {formatTime(roundState.timeLeft)}
              </Text>
              
              <TouchableOpacity style={styles.startRoundButton} onPress={resumeGame}>
                <Text style={styles.startRoundButtonText}>LANCER LA MANCHE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Écran de jeu
            <View style={styles.gameContainer}>
              {/* Chrono circulaire */}
              <View style={styles.timerContainer}>
                <View style={styles.timerCircle}>
                  <View 
                    style={[
                      styles.timerProgress, 
                      { 
                        backgroundColor: currentTeam.color,
                        transform: [{ rotate: `${getTimePercentage() * 3.6}deg` }]
                      }
                    ]} 
                  />
                  <View style={styles.timerInner}>
                    <Text style={styles.timerText}>{formatTime(roundState.timeLeft)}</Text>
                  </View>
                </View>
              </View>
              
              {/* Mot à deviner */}
              <View style={styles.wordContainer}>
                <Text style={styles.wordLabel}>MOT À FAIRE DEVINER</Text>
                <Text style={styles.wordText}>{currentPhrase?.text || 'Aucun mot'}</Text>
              </View>
              
              {/* Boutons d'action */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.skipButton]}
                  onPress={markPhraseAsSkipped}
                  disabled={!roundState.roundActive}
                >
                  <Text style={styles.skipButtonText}>PASSER</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.foundButton]}
                  onPress={markPhraseAsFound}
                  disabled={!roundState.roundActive}
                >
                  <Text style={styles.foundButtonText}>TROUVÉ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      
      {/* Dialogue des scores */}
      <Portal>
        <Dialog visible={scoreVisible} onDismiss={() => setScoreVisible(false)} style={styles.scoreDialog}>
          <Dialog.Content>
            {renderScores()}
          </Dialog.Content>
          <Dialog.Actions style={styles.scoreDialogActions}>
            <Button 
              onPress={() => setScoreVisible(false)}
              textColor={colors.white}
              labelStyle={styles.scoreDialogButton}
            >
              Fermer
            </Button>
            {gameState.gameFinished && (
              <Button 
                onPress={quitGame}
                mode="contained"
                buttonColor={colors.accent}
                textColor={colors.black}
                labelStyle={styles.scoreDialogButton}
              >
                Terminer la partie
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialogue de confirmation de fin de partie */}
      <Portal>
        <Dialog visible={confirmEndGameVisible} onDismiss={() => setConfirmEndGameVisible(false)} style={styles.scoreDialog}>
          <Dialog.Title style={styles.dialogTitle}>Quitter la partie</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Êtes-vous sûr de vouloir quitter la partie ? Tout progrès sera perdu.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.scoreDialogActions}>
            <Button 
              onPress={() => setConfirmEndGameVisible(false)}
              textColor={colors.white}
              labelStyle={styles.scoreDialogButton}
            >
              Annuler
            </Button>
            <Button 
              onPress={quitGame}
              mode="contained"
              buttonColor={colors.teams.rouge.main}
              textColor={colors.white}
              labelStyle={styles.scoreDialogButton}
            >
              Quitter
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
  },
  loadingText: {
    color: colors.white,
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.medium,
  },
  content: {
    flex: 1,
  },
  
  // Header permanent
  headerCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: colors.white,
    marginBottom: spacing.lg,
  },
  teamSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamTitle: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  playerText: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  roundSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  roundNumber: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  roundIcon: {
    width: 32,
    height: 32,
    marginBottom: spacing.xs,
  },
  roundName: {
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
    textAlign: 'center',
  },
  
  // Bouton Scores
  scoresButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.medium,
  },
  scoresButtonText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.black,
  },
  
  // Contenu principal
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  
  // Écran de préparation
  preparationContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  preparationTitle: {
    fontSize: typography.fontSize.xxxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  preparationSubtitle: {
    fontSize: typography.fontSize.xxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  preparationPlayers: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    marginBottom: spacing.xl,
  },
  preparationDescription: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  preparationTime: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.accent,
    marginBottom: spacing.xxl,
  },
  startRoundButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.medium,
  },
  startRoundButtonText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.black,
  },
  
  // Écran de jeu
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  
  // Timer circulaire
  timerContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.background.secondary,
    borderWidth: 6,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  timerProgress: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.7,
    transformOrigin: 'center',
  },
  timerInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timerText: {
    fontSize: typography.fontSize.xxxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  
  // Mot à deviner
  wordContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    flex: 1,
    justifyContent: 'center',
  },
  wordLabel: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  wordText: {
    fontSize: typography.fontSize.xxxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 40,
  },
  
  // Boutons d'action
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.medium,
  },
  skipButton: {
    backgroundColor: colors.white,
  },
  skipButtonText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.background.primary,
  },
  foundButton: {
    backgroundColor: colors.accent,
  },
  foundButtonText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.bold,
    color: colors.black,
  },
  
  // Dialogues
  scoreDialog: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scoresContainer: {
    padding: spacing.md,
  },
  scoresTitle: {
    fontSize: typography.fontSize.xxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  teamColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.white,
  },
  scoreTeamName: {
    flex: 1,
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  scoreValue: {
    fontSize: typography.fontSize.xxlarge,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    marginLeft: spacing.md,
  },
  scoreDialogActions: {
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
  },
  scoreDialogButton: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontFamily.semiBold,
  },
  dialogTitle: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  dialogText: {
    fontSize: typography.fontSize.medium,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default GameScreen;