import * as SQLite from "expo-sqlite";

// Interface pour le type Player
export interface Player {
  id?: number;
  name: string;
  createdAt?: number;
}

// Interface pour le type Team
export interface Team {
  id?: number;
  color: string;
  createdAt?: number;
}

// Interface pour le type TeamPlayer (relation entre Team et Player)
export interface TeamPlayer {
  id?: number;
  teamId: number;
  playerId: number;
}

// Interface pour le type Category
export interface Category {
  id?: number;
  name: string;
  createdAt?: number;
}

// Interface pour le type Phrase
export interface Phrase {
  id?: number;
  text: string;
  categoryId: number;
  createdAt?: number;
}

// Variable pour stocker l'instance de la base de données
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Ouvrir ou récupérer la base de données
const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("timesup.db");
  }
  return dbInstance;
};


// Fermer la base de données
const closeDatabase = async (): Promise<void> => {
  try {
    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
      console.log("Base de données fermée avec succès");
    }
  } catch (error) {
    console.error("Erreur lors de la fermeture de la base de données", error);
    // Forcer la fermeture en cas d'erreur
    dbInstance = null;
  }
};

// Fonction améliorée pour supprimer la base de données
const resetDatabase = async (): Promise<void> => {
  try {
    console.log("🔄 Début de la réinitialisation de la base de données...");
    
    // Étape 1: Forcer la fermeture de toutes les connexions
    if (dbInstance) {
      try {
        console.log("🔒 Fermeture de la connexion principale...");
        await dbInstance.closeAsync();
        console.log("✅ Connexion principale fermée");
      } catch (closeError) {
        console.warn("⚠️ Erreur lors de la fermeture (ignorée):", closeError);
      }
      dbInstance = null;
    }

    // Étape 2: Attendre pour s'assurer que toutes les opérations sont terminées
    console.log("⏳ Attente de la libération des ressources...");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Étape 3: Forcer le garbage collection si possible
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Étape 4: Tentative de suppression
    console.log("🗑️ Tentative de suppression de la base de données...");
    try {
      await SQLite.deleteDatabaseAsync("timesup.db");
      console.log("✅ Base de données supprimée avec succès");
    } catch (deleteError) {
      console.error("❌ Erreur lors de la suppression:", deleteError);
      
      // Si la suppression échoue, essayer une approche alternative
      console.log("🔄 Tentative d'approche alternative...");
      
      // Forcer la nullification de l'instance
      dbInstance = null;
      
      // Attendre plus longtemps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Deuxième tentative
      try {
        await SQLite.deleteDatabaseAsync("timesup.db");
        console.log("✅ Base de données supprimée avec succès (2ème tentative)");
      } catch (secondError) {
        console.error("❌ Impossible de supprimer la base de données:", secondError);
        throw new Error("La base de données ne peut pas être supprimée. Veuillez redémarrer l'application.");
      }
    }

    // Étape 5: Attendre avant de réinitialiser
    console.log("⏳ Attente avant réinitialisation...");
    await new Promise(resolve => setTimeout(resolve, 200));

    // Étape 6: Réinitialiser la base de données
    console.log("🚀 Réinitialisation de la base de données...");
    await initDatabase();
    console.log("✅ Base de données réinitialisée avec succès");
    
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation de la base de données:", error);
    
    // En cas d'erreur, essayer de forcer la réinitialisation
    try {
      console.log("🔄 Tentative de récupération...");
      dbInstance = null;
      
      // Attendre encore plus longtemps
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await initDatabase();
      console.log("✅ Base de données récupérée avec succès");
    } catch (retryError) {
      console.error("❌ Impossible de récupérer la base de données:", retryError);
      throw new Error("Erreur critique: Veuillez redémarrer l'application pour continuer.");
    }
  }
};



// Initialisation de la base de données
const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDatabase();

    // Vérifier si la base de données existe déjà
    const tableInfo = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='teams'"
    );

    if (tableInfo && tableInfo.count > 0) {
      // La table teams existe déjà, vérifions sa structure
      const columnInfo = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(teams)"
      );

      // Vérifier si la colonne 'name' existe
      const hasNameColumn = columnInfo.some((col) => col.name === "name");

      if (hasNameColumn) {
        // Migrer la table teams pour supprimer la colonne 'name'
        await db.execAsync(`
            -- Création d'une table temporaire sans la colonne name
            CREATE TABLE teams_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              color TEXT NOT NULL,
              createdAt INTEGER
            );
            
            -- Copier les données sans le nom
            INSERT INTO teams_temp (id, color, createdAt)
            SELECT id, color, createdAt FROM teams;
            
            -- Supprimer l'ancienne table
            DROP TABLE teams;
            
            -- Renommer la table temporaire
            ALTER TABLE teams_temp RENAME TO teams;
          `);
      }
    } else {
      // Créer la table teams sans la colonne name
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            color TEXT NOT NULL,
            createdAt INTEGER
          );
        `);
    }

    // Créer ou s'assurer que les autres tables existent
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          createdAt INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        color TEXT NOT NULL,
        createdAt INTEGER
      );

        CREATE TABLE IF NOT EXISTS team_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teamId INTEGER NOT NULL,
          playerId INTEGER NOT NULL,
          FOREIGN KEY (teamId) REFERENCES teams (id) ON DELETE CASCADE,
          FOREIGN KEY (playerId) REFERENCES players (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        createdAt INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS phrases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        categoryId INTEGER NOT NULL,
        createdAt INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE CASCADE
      );
      `);

      // Insérer des catégories et phrases par défaut si la table est vide
    const categoryCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    
    if (categoryCount && categoryCount.count === 0) {
      await populateDefaultData();
    }
    console.log("Base de données initialisée avec succès");
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de la base de données",
      error
    );
    throw error;
  }
};

// GESTION DES JOUEURS

// Fonction pour ajouter un joueur
const addPlayer = async (player: Player): Promise<number> => {
  try {
    const db = await getDatabase();

    const result = await db.runAsync(
      "INSERT INTO players (name, createdAt) VALUES (?, ?)",
      [player.name, Date.now()]
    );

    console.log("Joueur ajouté avec l'ID", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Erreur lors de l'ajout du joueur", error);
    throw error;
  }
};

// Fonction pour récupérer tous les joueurs
const getPlayers = async (): Promise<Player[]> => {
  try {
    const db = await getDatabase();

    const players = await db.getAllAsync<Player>(
      "SELECT * FROM players ORDER BY name"
    );
    return players;
  } catch (error) {
    console.error("Erreur lors de la récupération des joueurs", error);
    throw error;
  }
};

// Fonction pour supprimer un joueur
const deletePlayer = async (id: number): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.runAsync("DELETE FROM players WHERE id = ?", [id]);
    console.log("Joueur supprimé avec succès");
  } catch (error) {
    console.error("Erreur lors de la suppression du joueur", error);
    throw error;
  }
};

// Fonction pour mettre à jour un joueur
const updatePlayer = async (player: Player): Promise<void> => {
  if (!player.id) {
    throw new Error("ID du joueur manquant");
  }

  try {
    const db = await getDatabase();

    await db.runAsync("UPDATE players SET name = ? WHERE id = ?", [
      player.name,
      player.id,
    ]);

    console.log("Joueur mis à jour avec succès");
  } catch (error) {
    console.error("Erreur lors de la mise à jour du joueur", error);
    throw error;
  }
};

// GESTION DES ÉQUIPES

// Fonction pour ajouter une équipe
const addTeam = async (team: Team): Promise<number> => {
  try {
    const db = await getDatabase();

    const result = await db.runAsync(
      "INSERT INTO teams (color, createdAt) VALUES (?, ?)",
      [team.color, Date.now()]
    );

    console.log("Équipe ajoutée avec l'ID", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'équipe", error);
    throw error;
  }
};

// Fonction pour récupérer toutes les équipes
const getTeams = async (): Promise<Team[]> => {
  try {
    const db = await getDatabase();

    const teams = await db.getAllAsync<Team>(
      "SELECT id, color, createdAt FROM teams"
    );
    return teams;
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes", error);
    throw error;
  }
};

// Fonction pour supprimer une équipe
const deleteTeam = async (id: number): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.runAsync("DELETE FROM teams WHERE id = ?", [id]);
    console.log("Équipe supprimée avec succès");
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipe", error);
    throw error;
  }
};

// Fonction pour mettre à jour une équipe
const updateTeam = async (team: Team): Promise<void> => {
  if (!team.id) {
    throw new Error("ID de l'équipe manquant");
  }

  try {
    const db = await getDatabase();

    await db.runAsync("UPDATE teams SET color = ? WHERE id = ?", [
      team.color,
      team.id,
    ]);

    console.log("Équipe mise à jour avec succès");
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'équipe", error);
    throw error;
  }
};

// GESTION DES RELATIONS ÉQUIPE-JOUEUR

// Fonction pour ajouter un joueur à une équipe
const addPlayerToTeam = async (
  teamId: number,
  playerId: number
): Promise<number> => {
  try {
    const db = await getDatabase();

    const result = await db.runAsync(
      "INSERT INTO team_players (teamId, playerId) VALUES (?, ?)",
      [teamId, playerId]
    );

    console.log("Joueur ajouté à l'équipe");
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Erreur lors de l'ajout du joueur à l'équipe", error);
    throw error;
  }
};

// Fonction pour récupérer les joueurs d'une équipe
const getTeamPlayers = async (teamId: number): Promise<Player[]> => {
  try {
    const db = await getDatabase();

    const players = await db.getAllAsync<Player>(
      `
      SELECT p.* 
      FROM players p
      JOIN team_players tp ON p.id = tp.playerId
      WHERE tp.teamId = ?
      ORDER BY p.name
    `,
      [teamId]
    );

    return players;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des joueurs de l'équipe",
      error
    );
    throw error;
  }
};

// Fonction pour récupérer les équipes d'un joueur
const getPlayerTeams = async (playerId: number): Promise<Team[]> => {
  try {
    const db = await getDatabase();

    const teams = await db.getAllAsync<Team>(
      `
      SELECT t.* 
      FROM teams t
      JOIN team_players tp ON t.id = tp.teamId
      WHERE tp.playerId = ?
      ORDER BY t.name
    `,
      [playerId]
    );

    return teams;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des équipes du joueur",
      error
    );
    throw error;
  }
};

// Fonction pour vérifier si un joueur est déjà dans une équipe
const isPlayerInAnyTeam = async (playerId: number): Promise<boolean> => {
  try {
    const db = await getDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM team_players
        WHERE playerId = ?
      `,
      [playerId]
    );

    return result !== null && result.count > 0;
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du joueur dans les équipes",
      error
    );
    throw error;
  }
};

// Fonction pour supprimer un joueur d'une équipe
const removePlayerFromTeam = async (
  teamId: number,
  playerId: number
): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.runAsync(
      "DELETE FROM team_players WHERE teamId = ? AND playerId = ?",
      [teamId, playerId]
    );

    console.log("Joueur retiré de l'équipe");
  } catch (error) {
    console.error("Erreur lors de la suppression du joueur de l'équipe", error);
    throw error;
  }
};

// Fonction pour vérifier si un joueur est dans une équipe
const isPlayerInTeam = async (
  teamId: number,
  playerId: number
): Promise<boolean> => {
  try {
    const db = await getDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM team_players
      WHERE teamId = ? AND playerId = ?
    `,
      [teamId, playerId]
    );

    return result !== null && result.count > 0;
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du joueur dans l'équipe",
      error
    );
    throw error;
  }
};

// Fonction pour compter le nombre de joueurs dans une équipe
const countPlayersInTeam = async (teamId: number): Promise<number> => {
  try {
    const db = await getDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM team_players
      WHERE teamId = ?
    `,
      [teamId]
    );

    return result !== null ? result.count : 0;
  } catch (error) {
    console.error("Erreur lors du comptage des joueurs dans l'équipe", error);
    throw error;
  }
};

// Fonction pour obtenir les couleurs déjà utilisées par les équipes
const getUsedColors = async (): Promise<string[]> => {
  try {
    const db = await getDatabase();

    const results = await db.getAllAsync<{ color: string }>(`
        SELECT color FROM teams
      `);

    return results.map((result) => result.color);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des couleurs utilisées",
      error
    );
    throw error;
  }
};

// GÉNÉRATION PAR DÉFAUT DE CONTENU DANS LA BDD DE PHRASES

// Fonction pour peupler la base de données avec des données par défaut
const populateDefaultData = async (): Promise<void> => {
  try {
    // Catégories par défaut
    const categories = [
      { name: 'Célébrités' },
      { name: 'Films' },
      { name: 'Personnages de fiction' },
      { name: 'Pays et villes' },
      { name: 'Sports et loisirs' }
    ];
    
    // Phrases par catégorie
    const phrasesByCategoryName: { [key: string]: string[] } = {
      'Célébrités': [
        'Albert Einstein', 'Nelson Mandela', 'Marie Curie', 'Leonardo DiCaprio',
        'Beyoncé', 'Barack Obama', 'Madonna', 'Cristiano Ronaldo',
        'Lady Gaga', 'Michael Jackson', 'Adele', 'Zinedine Zidane',
        'Céline Dion', 'Brad Pitt', 'Johnny Hallyday', 'Edith Piaf'
      ],
      'Films': [
        'Star Wars', 'Titanic', 'Le Roi Lion', 'Matrix',
        'Harry Potter', 'Le Seigneur des Anneaux', 'Jurassic Park', 'Avengers',
        'Forrest Gump', 'Intouchables', 'Le Parrain', 'Inception',
        'La La Land', 'Avatar', 'Les Dents de la mer', 'Pulp Fiction'
      ],
      'Personnages de fiction': [
        'Sherlock Holmes', 'Spider-Man', 'Mickey Mouse', 'James Bond',
        'Batman', 'Wonder Woman', 'Harry Potter', 'Cendrillon',
        'Luke Skywalker', 'Superman', 'Hermione Granger', 'Dumbledore',
        'Astérix', 'Dracula', 'Tintin', 'Peter Pan'
      ],
      'Pays et villes': [
        'Paris', 'New York', 'Japon', 'Londres',
        'Brésil', 'Italie', 'Barcelone', 'Australie',
        'Canada', 'Rome', 'Maroc', 'Venise',
        'Égypte', 'Los Angeles', 'Chine', 'Tokyo'
      ],
      'Sports et loisirs': [
        'Football', 'Tennis', 'Natation', 'Basketball',
        'Ski', 'Jeux vidéo', 'Vélo', 'Danse',
        'Golf', 'Yoga', 'Piano', 'Échecs',
        'Randonnée', 'Cuisine', 'Lecture', 'Peinture'
      ]
    };
    
    // Insérer les catégories et récupérer leurs IDs
    const categoryIds = await Promise.all(
      categories.map(async (category) => {
        const id = await addCategory(category);
        return { name: category.name, id };
      })
    );
    
    // Insérer les phrases pour chaque catégorie
    for (const category of categoryIds) {
      const phrases = phrasesByCategoryName[category.name] || [];
      for (const phraseText of phrases) {
        await addPhrase({
          text: phraseText,
          categoryId: category.id
        });
      }
    }
    
    console.log('Données par défaut ajoutées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'ajout des données par défaut', error);
    throw error;
  }
};

// GESTION DES CATÉGORIES

// Fonction pour ajouter une catégorie
const addCategory = async (category: Category): Promise<number> => {
  try {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO categories (name, createdAt) VALUES (?, ?)',
      [category.name, Date.now()]
    );
    
    console.log('Catégorie ajoutée avec l\'ID', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la catégorie', error);
    throw error;
  }
};

// Fonction pour récupérer toutes les catégories
const getCategories = async (): Promise<Category[]> => {
  try {
    const db = await getDatabase();
    
    const categories = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
    return categories;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories', error);
    throw error;
  }
};

// Fonction pour supprimer une catégorie
const deleteCategory = async (id: number): Promise<void> => {
  try {
    const db = await getDatabase();
    
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    console.log('Catégorie supprimée avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie', error);
    throw error;
  }
};

// Fonction pour mettre à jour une catégorie
const updateCategory = async (category: Category): Promise<void> => {
  if (!category.id) {
    throw new Error('ID de la catégorie manquant');
  }
  
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE categories SET name = ? WHERE id = ?',
      [category.name, category.id]
    );
    
    console.log('Catégorie mise à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie', error);
    throw error;
  }
};

// GESTION DES PHRASES

// Fonction pour ajouter une phrase
const addPhrase = async (phrase: Phrase): Promise<number> => {
  try {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO phrases (text, categoryId, createdAt) VALUES (?, ?, ?)',
      [phrase.text, phrase.categoryId, Date.now()]
    );
    
    console.log('Phrase ajoutée avec l\'ID', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la phrase', error);
    throw error;
  }
};

// Fonction pour récupérer toutes les phrases
const getPhrases = async (): Promise<Phrase[]> => {
  try {
    const db = await getDatabase();
    
    const phrases = await db.getAllAsync<Phrase>('SELECT * FROM phrases ORDER BY text');
    return phrases;
  } catch (error) {
    console.error('Erreur lors de la récupération des phrases', error);
    throw error;
  }
};

// Fonction pour récupérer les phrases d'une catégorie
const getPhrasesByCategory = async (categoryId: number): Promise<Phrase[]> => {
  try {
    const db = await getDatabase();
    
    const phrases = await db.getAllAsync<Phrase>(
      'SELECT * FROM phrases WHERE categoryId = ? ORDER BY text',
      [categoryId]
    );
    return phrases;
  } catch (error) {
    console.error('Erreur lors de la récupération des phrases par catégorie', error);
    throw error;
  }
};

// Fonction pour obtenir un nombre aléatoire de phrases de catégories sélectionnées
const getRandomPhrases = async (categoryIds: number[], count: number): Promise<Phrase[]> => {
  try {
    if (categoryIds.length === 0) {
      return [];
    }
    
    const db = await getDatabase();
    
    // Construire une requête avec des placeholders pour les IDs de catégorie
    const placeholders = categoryIds.map(() => '?').join(',');
    
    // Récupérer toutes les phrases des catégories sélectionnées
    const allPhrases = await db.getAllAsync<Phrase>(
      `SELECT * FROM phrases WHERE categoryId IN (${placeholders})`,
      [...categoryIds]
    );
    
    // Mélanger les phrases et en sélectionner le nombre demandé
    const shuffled = allPhrases.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Erreur lors de la récupération des phrases aléatoires', error);
    throw error;
  }
};

// Fonction pour supprimer une phrase
const deletePhrase = async (id: number): Promise<void> => {
  try {
    const db = await getDatabase();
    
    await db.runAsync('DELETE FROM phrases WHERE id = ?', [id]);
    console.log('Phrase supprimée avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression de la phrase', error);
    throw error;
  }
};

// Fonction pour mettre à jour une phrase
const updatePhrase = async (phrase: Phrase): Promise<void> => {
  if (!phrase.id) {
    throw new Error('ID de la phrase manquant');
  }
  
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE phrases SET text = ?, categoryId = ? WHERE id = ?',
      [phrase.text, phrase.categoryId, phrase.id]
    );
    
    console.log('Phrase mise à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la phrase', error);
    throw error;
  }
};

// Nouvelle fonction pour obtenir des phrases uniques réparties entre équipes
const getUniquePhrasesByTeams = async (
  categoryIds: number[], 
  phrasesPerTeam: number, 
  teamCount: number
): Promise<Phrase[]> => {
  try {
    if (categoryIds.length === 0) {
      return [];
    }
    
    const db = await getDatabase();
    
    // Construire une requête avec des placeholders pour les IDs de catégorie
    const placeholders = categoryIds.map(() => '?').join(',');
    
    // Récupérer toutes les phrases des catégories sélectionnées
    const allPhrases = await db.getAllAsync<Phrase>(
      `SELECT * FROM phrases WHERE categoryId IN (${placeholders}) ORDER BY RANDOM()`,
      [...categoryIds]
    );
    
    // Calculer le nombre total de phrases nécessaires
    const totalNeeded = phrasesPerTeam * teamCount;
    
    // Vérifier qu'on a assez de phrases
    if (allPhrases.length < totalNeeded) {
      console.warn(`⚠️ Pas assez de phrases disponibles! Demandé: ${totalNeeded}, Disponible: ${allPhrases.length}`);
      return allPhrases; // Retourner toutes les phrases disponibles
    }
    
    // Retourner les N premières phrases (déjà mélangées par ORDER BY RANDOM())
    const selectedPhrases = allPhrases.slice(0, totalNeeded);
    
    console.log(`✅ ${selectedPhrases.length} phrases uniques sélectionnées pour ${teamCount} équipes`);
    return selectedPhrases;
  } catch (error) {
    console.error('Erreur lors de la récupération des phrases uniques par équipes', error);
    throw error;
  }
};

// Interface pour une phrase de partie temporaire
interface TempGamePhrase {
  id?: number;
  phraseId: number;
  text: string;
  status: 'pending' | 'found' | 'skipped';
}

// Créer les tables temporaires pour une partie
const createGameTables = async (teams: { id: number, color: string }[]): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Supprimer les anciennes tables de partie si elles existent
    await clearGameTables();
    
    // Créer une table pour chaque équipe
    for (const team of teams) {
      const tableName = getTeamTableName(team.color);
      
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phraseId INTEGER NOT NULL,
          text TEXT NOT NULL,
          status TEXT DEFAULT 'pending'
        );
      `);
      
      console.log(`✅ Table ${tableName} créée`);
    }
  } catch (error) {
    console.error('Erreur lors de la création des tables de jeu', error);
    throw error;
  }
};

// Obtenir le nom de table pour une couleur d'équipe
const getTeamTableName = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    '#03B0AE': 'cyan_partie_en_cours',
    '#4D2BAD': 'violet_partie_en_cours', 
    '#BE2045': 'rouge_partie_en_cours',
    '#ABD926': 'vert_partie_en_cours'
  };
  return colorMap[color] || 'equipe_inconnue_partie_en_cours';
};

// Peupler les tables d'équipe avec les phrases
const populateTeamTables = async (
  teams: { id: number, color: string }[],
  categoryIds: number[],
  phrasesPerTeam: number
): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Récupérer toutes les phrases disponibles des catégories sélectionnées
    const placeholders = categoryIds.map(() => '?').join(',');
    const allPhrases = await db.getAllAsync<Phrase>(
      `SELECT * FROM phrases WHERE categoryId IN (${placeholders}) ORDER BY RANDOM()`,
      [...categoryIds]
    );
    
    const totalNeeded = phrasesPerTeam * teams.length;
    if (allPhrases.length < totalNeeded) {
      console.warn(`⚠️ Pas assez de phrases! Demandé: ${totalNeeded}, Disponible: ${allPhrases.length}`);
    }
    
    // Répartir les phrases entre les équipes
    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      const team = teams[teamIndex];
      const tableName = getTeamTableName(team.color);
      
      console.log(`🎯 Peuplement de ${tableName}:`);
      
      // Calculer les indices pour cette équipe
      const startIndex = teamIndex * phrasesPerTeam;
      const endIndex = Math.min(startIndex + phrasesPerTeam, allPhrases.length);
      
      // Insérer les phrases dans la table de l'équipe
      for (let i = startIndex; i < endIndex; i++) {
        const phrase = allPhrases[i];
        
        await db.runAsync(
          `INSERT INTO ${tableName} (phraseId, text, status) VALUES (?, ?, ?)`,
          [phrase.id!, phrase.text, 'pending']
        );
        
        console.log(`  ${i - startIndex + 1}. "${phrase.text}" (ID: ${phrase.id})`);
      }
      
      console.log(`✅ ${endIndex - startIndex} phrases ajoutées à ${tableName}`);
    }
  } catch (error) {
    console.error('Erreur lors du peuplement des tables d\'équipe', error);
    throw error;
  }
};

// Récupérer les phrases d'une équipe pour le jeu
const getTeamGamePhrases = async (teamColor: string): Promise<TempGamePhrase[]> => {
  try {
    const db = await getDatabase();
    const tableName = getTeamTableName(teamColor);
    
    const phrases = await db.getAllAsync<TempGamePhrase>(
      `SELECT * FROM ${tableName} ORDER BY RANDOM()`
    );
    
    return phrases;
  } catch (error) {
    console.error(`Erreur lors de la récupération des phrases pour l'équipe ${teamColor}`, error);
    throw error;
  }
};

// Récupérer une phrase spécifique d'une équipe
const getTeamPhrase = async (teamColor: string, phraseId: number): Promise<TempGamePhrase | null> => {
  try {
    const db = await getDatabase();
    const tableName = getTeamTableName(teamColor);
    
    const phrase = await db.getFirstAsync<TempGamePhrase>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [phraseId]
    );
    
    return phrase || null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la phrase ${phraseId} pour l'équipe ${teamColor}`, error);
    throw error;
  }
};

// Marquer une phrase comme trouvée/passée
const updateTeamPhraseStatus = async (
  teamColor: string, 
  phraseId: number, 
  status: 'found' | 'skipped'
): Promise<void> => {
  try {
    const db = await getDatabase();
    const tableName = getTeamTableName(teamColor);
    
    await db.runAsync(
      `UPDATE ${tableName} SET status = ? WHERE id = ?`,
      [status, phraseId]
    );
    
    console.log(`✅ Phrase ${phraseId} marquée comme ${status} dans ${tableName}`);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du statut de la phrase ${phraseId}`, error);
    throw error;
  }
};

// Compter les phrases restantes pour une équipe
const countPendingPhrasesForTeam = async (teamColor: string): Promise<number> => {
  try {
    const db = await getDatabase();
    const tableName = getTeamTableName(teamColor);
    
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE status = 'pending'`
    );
    
    return result?.count || 0;
  } catch (error) {
    console.error(`Erreur lors du comptage des phrases restantes pour l'équipe ${teamColor}`, error);
    throw error;
  }
};

// Compter le total de phrases restantes pour toutes les équipes
const countTotalPendingPhrases = async (teams: { color: string }[]): Promise<number> => {
  try {
    let total = 0;
    
    for (const team of teams) {
      const count = await countPendingPhrasesForTeam(team.color);
      total += count;
    }
    
    return total;
  } catch (error) {
    console.error('Erreur lors du comptage total des phrases restantes', error);
    throw error;
  }
};

// Récupérer la prochaine phrase disponible (toutes équipes confondues)
const getNextAvailablePhrase = async (teams: { color: string }[]): Promise<{ phrase: TempGamePhrase, teamColor: string } | null> => {
  try {
    // Chercher dans chaque équipe une phrase en attente
    for (const team of teams) {
      const phrases = await getTeamGamePhrases(team.color);
      const pendingPhrase = phrases.find(p => p.status === 'pending');
      
      if (pendingPhrase) {
        return {
          phrase: pendingPhrase,
          teamColor: team.color
        };
      }
    }
    
    return null; // Aucune phrase disponible
  } catch (error) {
    console.error('Erreur lors de la recherche de la prochaine phrase', error);
    throw error;
  }
};

// Nettoyer les tables de partie
const clearGameTables = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    const tableNames = [
      'cyan_partie_en_cours',
      'violet_partie_en_cours', 
      'rouge_partie_en_cours',
      'vert_partie_en_cours'
    ];
    
    for (const tableName of tableNames) {
      try {
        await db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`🗑️ Table ${tableName} supprimée`);
      } catch (error) {
        // Ignore les erreurs si la table n'existe pas
      }
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des tables de jeu', error);
  }
};

// Réinitialiser les statuts pour une nouvelle manche
const resetTeamPhrasesStatus = async (teams: { color: string }[]): Promise<void> => {
  try {
    const db = await getDatabase();
    
    for (const team of teams) {
      const tableName = getTeamTableName(team.color);
      
      await db.runAsync(
        `UPDATE ${tableName} SET status = 'pending' WHERE status IN ('found', 'skipped')`
      );
      
      console.log(`🔄 Statuts réinitialisés pour ${tableName}`);
    }
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des statuts', error);
    throw error;
  }
};

export default {
  initDatabase,
  resetDatabase,
  closeDatabase,

  // Joueurs
  addPlayer,
  getPlayers,
  deletePlayer,
  updatePlayer,

  // Équipes
  addTeam,
  getTeams,
  deleteTeam,
  updateTeam,
  getUsedColors,

  // Relations Équipe-Joueur
  addPlayerToTeam,
  isPlayerInAnyTeam,
  getTeamPlayers,
  getPlayerTeams,
  removePlayerFromTeam,
  isPlayerInTeam,
  countPlayersInTeam,

  // Catégories
  addCategory,
  getCategories,
  deleteCategory,
  updateCategory,
  
  // Phrases
  addPhrase,
  getPhrases,
  getPhrasesByCategory,
  getRandomPhrases,
  deletePhrase,
  updatePhrase,
  getUniquePhrasesByTeams,

  // Nouvelles fonctions pour les parties
  createGameTables,
  populateTeamTables,
  getTeamGamePhrases,
  getTeamPhrase,
  updateTeamPhraseStatus,
  countPendingPhrasesForTeam,
  countTotalPendingPhrases,
  getNextAvailablePhrase,
  clearGameTables,
  resetTeamPhrasesStatus,
};
