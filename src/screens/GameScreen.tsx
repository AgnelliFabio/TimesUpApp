import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { Button, Card, Text, Title, IconButton, Divider, FAB, Dialog, Portal } from 'react-native-paper';
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

type GameScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

type Props = {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
};

const GameScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gameConfig } = route.params;
  
  // État du jeu
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [confirmEndTurnVisible, setConfirmEndTurnVisible] = useState(false);
  const [confirmEndGameVisible, setConfirmEndGameVisible] = useState(false);
  const [showTeamPreparationScreen, setShowTeamPreparationScreen] = useState(false);
  
  // Référence pour le timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Récupérer un nom d'équipe à partir de sa couleur
  const getTeamName = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      '#e53935': 'Rouge',
      '#1e88e5': 'Bleu',
      '#43a047': 'Vert',
      '#fdd835': 'Jaune'
    };
    
    return colorMap[color] || 'Inconnu';
  };
  
  // Initialisation du jeu
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Pour chaque équipe, récupérer ses propres phrases
        const teamPhrases: GamePhrase[] = [];
        
        // Pour chaque équipe, récupérer un ensemble de phrases
        for (const team of gameConfig.teams) {
          // Récupérer des phrases aléatoires pour cette équipe
          const phrasesForTeam = await Database.getRandomPhrases(
            gameConfig.selectedCategoryIds,
            gameConfig.phrasesPerTeam
          );
          
          // Transformer les phrases pour le jeu et les assigner à cette équipe
          const gamePhrases: GamePhrase[] = phrasesForTeam.map(phrase => ({
            ...phrase,
            status: PhraseStatus.PENDING,
            teamId: team.id!
          }));
          
          // Ajouter ces phrases à la liste globale
          teamPhrases.push(...gamePhrases);
        }
        
        // Mélanger toutes les phrases pour la première manche
        const shuffledPhrases = [...teamPhrases].sort(() => 0.5 - Math.random());
        
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
            phrasesForRound: [],  // Sera rempli après la première manche
            scores: { ...initialScores },
            timeLeft: gameConfig.roundDuration,
            roundActive: false
          },
          [RoundNumber.MIME]: {
            currentTeamIndex: 0,
            currentPhraseIndex: 0,
            phrasesForRound: [],  // Sera rempli après la deuxième manche
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
        setInstructionsVisible(true);
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
      // Nettoyage
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      backHandler.remove();
    };
  }, []);
  
  // Démarrer le jeu
  const startGame = () => {
    if (!gameState) return;
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      return {
        ...prevState,
        gameStarted: true,
      };
    });
    
    // Montrer l'écran de préparation pour la première équipe
    setShowTeamPreparationScreen(true);
  };
  
  // Démarrer le timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setGameState(prevState => {
        if (!prevState) return null;
        
        const currentRoundState = prevState.rounds[prevState.currentRound];
        
        // Si le timer est actif
        if (currentRoundState.roundActive) {
          // Si le temps est écoulé
          if (currentRoundState.timeLeft <= 1) {
            // Arrêter le timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Mettre à jour l'état pour le tour suivant (next team)
            const newRounds = { ...prevState.rounds };
            newRounds[prevState.currentRound] = {
              ...currentRoundState,
              timeLeft: 0,
              roundActive: false
            };
            
            // Afficher un message indiquant la fin du tour
            setTimeout(() => {
              Alert.alert('Temps écoulé!', 'C\'est au tour de l\'équipe suivante.');
              nextTeamTurn();
            }, 100);
            
            return {
              ...prevState,
              rounds: newRounds
            };
          }
          
          // Décrémenter le temps
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
    
    // Vérifier si la phrase appartient à l'équipe actuelle
    if (currentPhrase.teamId !== currentTeamId) {
      Alert.alert('Attention', 'Cette phrase appartient à une autre équipe. Vous ne pouvez pas la marquer comme trouvée.');
      return;
    }
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRoundState = prevState.rounds[currentRound];
      const phrases = [...currentRoundState.phrasesForRound];
      
      // Mettre à jour le statut de la phrase
      phrases[currentRoundState.currentPhraseIndex] = {
        ...currentPhrase,
        status: PhraseStatus.FOUND
      };
      
      // Mettre à jour le score de l'équipe
      const newScores = { ...currentRoundState.scores };
      newScores[currentTeamId] = newScores[currentTeamId] + 1;
      
      // Compter combien de phrases de l'équipe actuelle sont encore en attente
      const pendingPhrases = phrases.filter(p => 
        p.status === PhraseStatus.PENDING && p.teamId === currentTeamId
      );
      
      // Si toutes les phrases de l'équipe actuelle ont été devinées, c'est au tour de l'équipe suivante
      if (pendingPhrases.length === 0) {
        // Vérifier s'il reste des phrases pour les autres équipes
        const anyPendingPhrases = phrases.some(p => p.status === PhraseStatus.PENDING);
        
        if (!anyPendingPhrases) {
          // Toutes les phrases ont été devinées
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
          
          // Si ce n'est pas la dernière manche, préparer la suivante
          if (currentRound < RoundNumber.MIME) {
            setTimeout(() => {
              Alert.alert('Fin de la manche!', 'Toutes les phrases ont été devinées. Passons à la manche suivante.');
              prepareNextRound(currentRound + 1, phrases, newScores);
            }, 100);
          } else {
            // C'est la fin du jeu
            setTimeout(() => {
              Alert.alert('Fin du jeu!', 'La partie est terminée. Consultez les scores finaux.');
              setScoreVisible(true);
            }, 100);
            
            return {
              ...prevState,
              rounds: newRounds,
              gameFinished: true
            };
          }
        } else {
          // Il reste des phrases pour d'autres équipes, passer à l'équipe suivante
          setTimeout(() => {
            Alert.alert('Bravo!', 'Vous avez deviné toutes vos phrases. C\'est au tour de l\'équipe suivante.');
            nextTeamTurn();
          }, 100);
          
          const newRounds = { ...prevState.rounds };
          newRounds[currentRound] = {
            ...currentRoundState,
            phrasesForRound: phrases,
            scores: newScores,
            roundActive: false
          };
          
          return {
            ...prevState,
            rounds: newRounds
          };
        }
      } else {
        // Il reste des phrases pour l'équipe actuelle, trouver la prochaine phrase pour cette équipe
        let nextPhraseIndex = -1;
        
        for (let i = 0; i < phrases.length; i++) {
          if (phrases[i].status === PhraseStatus.PENDING && phrases[i].teamId === currentTeamId) {
            nextPhraseIndex = i;
            break;
          }
        }
        
        const newRounds = { ...prevState.rounds };
        newRounds[currentRound] = {
          ...currentRoundState,
          currentPhraseIndex: nextPhraseIndex !== -1 ? nextPhraseIndex : currentRoundState.currentPhraseIndex,
          phrasesForRound: phrases,
          scores: newScores
        };
        
        return {
          ...prevState,
          rounds: newRounds
        };
      }
      
      return prevState; // Fallback return pour éviter l'erreur de TypeScript
    });
  };
  
  // Marquer une phrase comme passée
  const markPhraseAsSkipped = () => {
    if (!gameState) return;
    
    const currentRound = gameState.currentRound;
    const roundState = gameState.rounds[currentRound];
    const currentTeamId = gameState.config.teams[roundState.currentTeamIndex].id!;
    const currentPhrase = roundState.phrasesForRound[roundState.currentPhraseIndex];
    
    // Vérifier si la phrase appartient à l'équipe actuelle
    if (currentPhrase.teamId !== currentTeamId) {
      Alert.alert('Attention', 'Cette phrase appartient à une autre équipe. Vous ne pouvez pas la passer.');
      return;
    }
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRoundState = prevState.rounds[currentRound];
      const phrases = [...currentRoundState.phrasesForRound];
      
      // Mettre à jour le statut de la phrase
      phrases[currentRoundState.currentPhraseIndex] = {
        ...currentPhrase,
        status: PhraseStatus.SKIPPED
      };
      
      // Compter combien de phrases de l'équipe actuelle sont encore en attente
      const pendingPhrases = phrases.filter(p => 
        p.status === PhraseStatus.PENDING && p.teamId === currentTeamId
      );
      
      // Si toutes les phrases de l'équipe actuelle ont été traitées, c'est au tour de l'équipe suivante
      if (pendingPhrases.length === 0) {
        // Vérifier s'il reste des phrases pour les autres équipes
        const anyPendingPhrases = phrases.some(p => p.status === PhraseStatus.PENDING);
        
        if (!anyPendingPhrases) {
          // Toutes les phrases ont été traitées
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
          
          // Si ce n'est pas la dernière manche, préparer la suivante
          if (currentRound < RoundNumber.MIME) {
            setTimeout(() => {
              Alert.alert('Fin de la manche!', 'Toutes les phrases ont été traitées. Passons à la manche suivante.');
              prepareNextRound(currentRound + 1, phrases, currentRoundState.scores);
            }, 100);
          } else {
            // C'est la fin du jeu
            setTimeout(() => {
              Alert.alert('Fin du jeu!', 'La partie est terminée. Consultez les scores finaux.');
              setScoreVisible(true);
            }, 100);
            
            return {
              ...prevState,
              rounds: newRounds,
              gameFinished: true
            };
          }
        } else {
          // Il reste des phrases pour d'autres équipes, passer à l'équipe suivante
          setTimeout(() => {
            Alert.alert('Attention!', 'Vous avez traité toutes vos phrases. C\'est au tour de l\'équipe suivante.');
            nextTeamTurn();
          }, 100);
          
          const newRounds = { ...prevState.rounds };
          newRounds[currentRound] = {
            ...currentRoundState,
            phrasesForRound: phrases,
            roundActive: false
          };
          
          return {
            ...prevState,
            rounds: newRounds
          };
        }
      } else {
        // Il reste des phrases pour l'équipe actuelle, trouver la prochaine phrase pour cette équipe
        let nextPhraseIndex = -1;
        
        for (let i = 0; i < phrases.length; i++) {
          if (phrases[i].status === PhraseStatus.PENDING && phrases[i].teamId === currentTeamId) {
            nextPhraseIndex = i;
            break;
          }
        }
        
        const newRounds = { ...prevState.rounds };
        newRounds[currentRound] = {
          ...currentRoundState,
          currentPhraseIndex: nextPhraseIndex !== -1 ? nextPhraseIndex : currentRoundState.currentPhraseIndex,
          phrasesForRound: phrases
        };
        
        return {
          ...prevState,
          rounds: newRounds
        };
      }
      
      return prevState; // Fallback return pour éviter l'erreur de TypeScript
    });
  };
  
  // Préparer la manche suivante
  const prepareNextRound = (nextRound: RoundNumber, phrases: GamePhrase[], scores: Record<number, number>) => {
    setTimeout(() => {
      // Réinitialiser le statut des phrases
      const resetPhrases = phrases.map(phrase => ({
        ...phrase,
        status: PhraseStatus.PENDING
      }));
      
      // Mélanger les phrases
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
      
      // Afficher les instructions de la nouvelle manche
      setInstructionsVisible(true);
      
      // Montrer l'écran de préparation après les instructions
      setTimeout(() => {
        setInstructionsVisible(false);
        setShowTeamPreparationScreen(true);
      }, 3000);
    }, 100);
  };
  
  // Passer au tour de l'équipe suivante
  const nextTeamTurn = () => {
    if (!gameState) return;
    
    const currentRound = gameState.currentRound;
    const roundState = gameState.rounds[currentRound];
    const teamCount = gameState.config.teams.length;
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRoundState = prevState.rounds[currentRound];
      
      // Calculer l'index de la prochaine équipe
      let nextTeamIndex = (currentRoundState.currentTeamIndex + 1) % teamCount;
      const nextTeam = prevState.config.teams[nextTeamIndex];
      
      // Trouver l'index de la première phrase non devinée pour cette équipe
      let nextPhraseIndex = -1;
      const phrases = currentRoundState.phrasesForRound;
      
      for (let i = 0; i < phrases.length; i++) {
        if (phrases[i].status === PhraseStatus.PENDING && phrases[i].teamId === nextTeam.id) {
          nextPhraseIndex = i;
          break;
        }
      }
      
      // Si toutes les phrases de l'équipe sont devinées, voir si une autre équipe a encore des phrases
      if (nextPhraseIndex === -1) {
        let foundTeamWithPendingPhrases = false;
        let teamsChecked = 0;
        let checkTeamIndex = nextTeamIndex;
        
        // Vérifier toutes les équipes pour voir si l'une d'elles a encore des phrases à deviner
        while (teamsChecked < teamCount) {
          const checkTeam = prevState.config.teams[checkTeamIndex];
          
          // Chercher une phrase pour cette équipe
          for (let i = 0; i < phrases.length; i++) {
            if (phrases[i].status === PhraseStatus.PENDING && phrases[i].teamId === checkTeam.id) {
              nextPhraseIndex = i;
              nextTeamIndex = checkTeamIndex;
              foundTeamWithPendingPhrases = true;
              break;
            }
          }
          
          if (foundTeamWithPendingPhrases) {
            break;
          }
          
          // Passer à l'équipe suivante
          checkTeamIndex = (checkTeamIndex + 1) % teamCount;
          teamsChecked++;
        }
        
        // Si aucune équipe n'a de phrases en attente, c'est la fin de la manche
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
          
          // Si ce n'est pas la dernière manche, préparer la suivante
          if (currentRound < RoundNumber.MIME) {
            setTimeout(() => {
              Alert.alert('Fin de la manche!', 'Toutes les phrases ont été devinées. Passons à la manche suivante.');
              prepareNextRound(currentRound + 1, phrases, currentRoundState.scores);
            }, 100);
          } else {
            // C'est la fin du jeu
            setTimeout(() => {
              Alert.alert('Fin du jeu!', 'La partie est terminée. Consultez les scores finaux.');
              setScoreVisible(true);
            }, 100);
            
            return {
              ...prevState,
              rounds: newRounds,
              gameFinished: true
            };
          }
          
          return prevState; // Pour éviter une erreur de TypeScript
        }
      }
      
      // Mettre à jour l'état avec la nouvelle équipe et phrase
      const newRounds = { ...prevState.rounds };
      newRounds[currentRound] = {
        ...currentRoundState,
        currentTeamIndex: nextTeamIndex,
        currentPhraseIndex: nextPhraseIndex !== -1 ? nextPhraseIndex : 0,
        timeLeft: gameConfig.roundDuration,
        roundActive: false
      };
      
      return {
        ...prevState,
        rounds: newRounds
      };
    });
    
    setConfirmEndTurnVisible(false);
    
    // Montrer l'écran de préparation pour l'équipe suivante
    setTimeout(() => {
      setShowTeamPreparationScreen(true);
    }, 100);
  };
  
  // Terminer le tour en cours (bouton "Terminer le tour")
  const endCurrentTurn = () => {
    if (!gameState) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setConfirmEndTurnVisible(true);
  };
  
  // Reprendre le jeu (après une pause ou les instructions)
  const resumeGame = () => {
    if (!gameState) return;
    
    setInstructionsVisible(false);
    setScoreVisible(false);
    setShowTeamPreparationScreen(false);
    
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRoundState = prevState.rounds[prevState.currentRound];
      
      // Activer la manche
      const newRounds = { ...prevState.rounds };
      newRounds[prevState.currentRound] = {
        ...currentRoundState,
        roundActive: true
      };
      
      return {
        ...prevState,
        rounds: newRounds
      };
    });
    
    // Démarrer le timer
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
  
  // Affichage des scores
  const renderScores = () => {
    if (!gameState) return null;
    
    const currentRound = gameState.currentRound;
    const scores = gameState.rounds[currentRound].scores;
    const teams = gameState.config.teams;
    
    return (
      <View style={styles.scoresContainer}>
        <Text style={styles.scoresTitle}>Scores actuels</Text>
        {teams.map(team => (
          <View key={team.id} style={styles.scoreRow}>
            <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
            <Text style={styles.teamName}>Équipe {getTeamName(team.color)}</Text>
            <Text style={styles.scoreValue}>{scores[team.id!]}</Text>
          </View>
        ))}
      </View>
    );
  };
  
  // Rendu principal
  if (isLoading || !gameState) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement du jeu...</Text>
      </View>
    );
  }
  
  const currentRound = gameState.currentRound;
  const roundState = gameState.rounds[currentRound];
  const currentTeam = gameState.config.teams[roundState.currentTeamIndex];
  const currentPhrase = roundState.phrasesForRound[roundState.currentPhraseIndex];
  
  return (
    <View style={styles.container}>
      {/* En-tête du jeu */}
      <View style={styles.header}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>Manche {currentRound}</Text>
          <Text style={styles.timeText}>{formatTime(roundState.timeLeft)}</Text>
        </View>
        
        <View style={styles.teamInfo}>
          <View style={[styles.teamColorBadge, { backgroundColor: currentTeam.color }]} />
          <Text style={styles.teamText}>Équipe {getTeamName(currentTeam.color)}</Text>
        </View>
      </View>
      
      {/* Contenu principal */}
      <View style={styles.content}>
        {!gameState.gameStarted ? (
          <Card style={styles.instructionCard}>
            <Card.Content>
              <Title style={styles.instructionTitle}>Prêt à commencer la partie ?</Title>
              <Text style={styles.instructionText}>
                Appuyez sur "Commencer" lorsque tous les joueurs sont prêts.
              </Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="contained" 
                onPress={startGame}
                style={styles.startButton}
              >
                Commencer
              </Button>
            </Card.Actions>
          </Card>
        ) : showTeamPreparationScreen ? (
          <Card style={styles.instructionCard}>
            <Card.Content>
              <View style={[styles.teamColorIndicator, { backgroundColor: currentTeam.color }]} />
              <Title style={styles.instructionTitle}>
                Équipe {getTeamName(currentTeam.color)}
              </Title>
              <Text style={styles.preparationText}>
                Manche {currentRound} - {
                  currentRound === RoundNumber.DESCRIPTION ? "Description" :
                  currentRound === RoundNumber.ONE_WORD ? "Un seul mot" : "Mime"
                }
              </Text>
              <Text style={styles.preparationText}>
                Durée: {Math.floor(roundState.timeLeft / 60)} minute{roundState.timeLeft >= 120 ? 's' : ''} {roundState.timeLeft % 60} seconde{roundState.timeLeft % 60 > 1 ? 's' : ''}
              </Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="contained" 
                onPress={resumeGame}
                style={styles.startButton}
              >
                Démarrer le Tour
              </Button>
            </Card.Actions>
          </Card>
        ) : currentPhrase ? (
          <Card style={styles.phraseCard}>
            <Card.Content>
              <Text style={styles.phraseLabelText}>Phrase à faire deviner :</Text>
              <Text style={styles.phraseText}>{currentPhrase.text}</Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="contained" 
                onPress={markPhraseAsFound}
                style={styles.foundButton}
                disabled={!roundState.roundActive}
              >
                Trouvé
              </Button>
              <Button 
                mode="outlined" 
                onPress={markPhraseAsSkipped}
                style={styles.skipButton}
                disabled={!roundState.roundActive}
              >
                Passer
              </Button>
              </Card.Actions>
          </Card>
        ) : (
          <Card style={styles.phraseCard}>
            <Card.Content>
              <Text style={styles.phraseLabelText}>Aucune phrase disponible</Text>
              <Text style={styles.instructionText}>
                Toutes les phrases ont été devinées ou passées pour cette manche.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
      
      {/* Actions de jeu */}
      <View style={styles.actions}>
        <Button 
          mode="outlined" 
          onPress={() => setScoreVisible(true)}
          style={styles.actionButton}
        >
          Scores
        </Button>
        
        {roundState.roundActive && (
          <Button 
            mode="outlined" 
            onPress={endCurrentTurn}
            style={[styles.actionButton, styles.endTurnButton]}
          >
            Terminer le tour
          </Button>
        )}
      </View>
      
      {/* FAB pour les instructions */}
      <FAB
        style={styles.fab}
        icon="help"
        onPress={() => setInstructionsVisible(true)}
      />
      
      {/* Dialogue d'instructions */}
      <Portal>
        <Dialog visible={instructionsVisible} onDismiss={() => setInstructionsVisible(false)}>
          <Dialog.Title>Instructions</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {ROUND_INSTRUCTIONS[currentRound]}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInstructionsVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialogue des scores */}
      <Portal>
        <Dialog visible={scoreVisible} onDismiss={() => setScoreVisible(false)}>
          <Dialog.Title>Scores</Dialog.Title>
          <Dialog.Content>
            {renderScores()}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setScoreVisible(false)}>Fermer</Button>
            {gameState.gameFinished && (
              <Button onPress={quitGame}>Terminer la partie</Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialogue de confirmation de fin de tour */}
      <Portal>
        <Dialog visible={confirmEndTurnVisible} onDismiss={() => setConfirmEndTurnVisible(false)}>
          <Dialog.Title>Terminer le tour</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Êtes-vous sûr de vouloir terminer le tour de l'équipe {getTeamName(currentTeam.color)} ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmEndTurnVisible(false)}>Annuler</Button>
            <Button onPress={nextTeamTurn}>Terminer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialogue de confirmation de fin de partie */}
      <Portal>
        <Dialog visible={confirmEndGameVisible} onDismiss={() => setConfirmEndGameVisible(false)}>
          <Dialog.Title>Quitter la partie</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Êtes-vous sûr de vouloir quitter la partie ? Tout progrès sera perdu.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmEndGameVisible(false)}>Annuler</Button>
            <Button onPress={quitGame}>Quitter</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#3f51b5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundInfo: {
    flexDirection: 'column',
  },
  roundText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamColorBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  teamText: {
    color: 'white',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  phraseCard: {
    padding: 16,
    elevation: 4,
  },
  instructionCard: {
    padding: 16,
    elevation: 4,
  },
  phraseLabelText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 24,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  preparationText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 8,
  },
  teamColorIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardActions: {
    justifyContent: 'space-evenly',
    marginTop: 16,
  },
  foundButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
  },
  skipButton: {
    borderColor: '#FF5722',
    paddingHorizontal: 24,
  },
  startButton: {
    backgroundColor: '#3f51b5',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  actionButton: {
    marginHorizontal: 8,
  },
  endTurnButton: {
    borderColor: '#F44336',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: '#3f51b5',
  },
  dialogText: {
    fontSize: 16,
    lineHeight: 24,
  },
  scoresContainer: {
    padding: 8,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  teamColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 16,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default GameScreen;