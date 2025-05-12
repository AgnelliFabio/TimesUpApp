import { Team, Player, Category, Phrase } from '../database/Database';

// Interface pour une équipe avec ses joueurs
export interface TeamWithPlayers extends Team {
  players: Player[];
}

// Interface pour configurer une partie
export interface GameConfig {
  teams: TeamWithPlayers[];         // Équipes participantes
  selectedCategoryIds: number[];    // Catégories sélectionnées
  roundDuration: number;            // Durée d'un tour en secondes
  phrasesPerTeam: number;           // Nombre de phrases par équipe
}

// Statut d'une phrase dans le jeu
export enum PhraseStatus {
  PENDING = 'pending',      // Pas encore devinée
  FOUND = 'found',          // Devinée
  SKIPPED = 'skipped'       // Passée
}

// Interface pour une phrase dans le jeu
export interface GamePhrase extends Phrase {
  status: PhraseStatus;     // Statut actuel de la phrase
  teamId: number;           // ID de l'équipe à qui appartient cette phrase
}

// État d'une manche
export interface RoundState {
  currentTeamIndex: number;          // Index de l'équipe active
  currentPhraseIndex: number;        // Index de la phrase active
  phrasesForRound: GamePhrase[];     // Phrases pour cette manche
  scores: Record<number, number>;    // Scores par équipe
  timeLeft: number;                  // Temps restant en secondes
  roundActive: boolean;              // Indique si le chronomètre tourne
}

// Numéro de manche (1, 2, 3)
export enum RoundNumber {
  DESCRIPTION = 1,  // Description libre
  ONE_WORD = 2,     // Un seul mot
  MIME = 3          // Mime
}

// État global du jeu
export interface GameState {
  config: GameConfig;             // Configuration du jeu
  currentRound: RoundNumber;      // Manche actuelle (1, 2, 3)
  rounds: Record<RoundNumber, RoundState>;  // État de chaque manche
  gameStarted: boolean;           // Le jeu a-t-il commencé
  gameFinished: boolean;          // Le jeu est-il terminé
}

// Instructions pour chaque manche
export const ROUND_INSTRUCTIONS = {
  [RoundNumber.DESCRIPTION]: 
    "Manche 1 : DESCRIPTION\n\nUtilisez tous les mots que vous voulez pour faire deviner la phrase à votre équipe, sans prononcer les mots de la phrase.",
  [RoundNumber.ONE_WORD]: 
    "Manche 2 : UN SEUL MOT\n\nN'utilisez qu'un seul mot pour faire deviner la phrase à votre équipe. Vous pouvez répéter ce mot autant de fois que nécessaire.",
  [RoundNumber.MIME]: 
    "Manche 3 : MIME\n\nMimez la phrase sans parler pour la faire deviner à votre équipe."
};