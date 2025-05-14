export const colors = {
    // Couleurs d'équipes
    teams: {
      cyan: {
        main: '#03B0AE',
        secondary: '#35D6CF'
      },
      violet: {
        main: '#4D2BAD',
        secondary: '#A67FE3'
      },
      rouge: {
        main: '#BE2045',
        secondary: '#EB6175'
      },
      vert: {
        main: '#ABD926',
        secondary: '#69BD1B'
      }
    },
    
    // Couleurs de background
    background: {
      primary: '#152232',    // Bleu foncé
      secondary: '#043E4B'   // Bleu clair
    },
    
    // Couleur secondaire de l'app
    accent: '#E7E50A',      // Jaune
    
    // Couleurs utilitaires
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    lightGray: '#CCCCCC'
  };
  
  // Mapping des couleurs d'équipes avec les codes hex originaux
  export const teamColorMapping = {
    '#e53935': colors.teams.rouge,    // Rouge
    '#1e88e5': colors.teams.cyan,     // Cyan 
    '#43a047': colors.teams.vert,     // Vert
    '#fdd835': colors.teams.violet    // Violet
  };
  
  // Fonction pour obtenir la couleur d'équipe
  export const getTeamColors = (colorHex: string) => {
    return teamColorMapping[colorHex as keyof typeof teamColorMapping] || colors.teams.cyan;
  };
  
  // Typographie
  export const typography = {
    fontFamily: {
      regular: 'Nunito_400Regular',
      medium: 'Nunito_500Medium',
      semiBold: 'Nunito_600SemiBold',
      bold: 'Nunito_700Bold',
      extraBold: 'Nunito_800ExtraBold'
    },
    fontSize: {
      small: 14,
      medium: 16,
      large: 18,
      xlarge: 20,
      xxlarge: 24,
      xxxlarge: 32,
      title: 36
    }
  };
  
  // Espacements
  export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  };
  
  // Border radius
  export const borderRadius = {
    small: 8,
    medium: 16,
    large: 24,
    round: 50
  };
  
  // Ombres
  export const shadows = {
    small: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    medium: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4
    },
    large: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8
    }
  };