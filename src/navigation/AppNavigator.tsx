import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import PlayersScreen from '../screens/PlayersScreen';
import TeamsScreen from '../screens/TeamsScreen';
import GameConfigScreen from '../screens/GameConfigScreen';
import GameScreen from '../screens/GameScreen';
import { GameConfig } from '../models/GameModels';

// Définition des types pour notre stack de navigation
export type RootStackParamList = {
  Home: undefined;
  Players: undefined;
  Teams: undefined;
  GameConfig: { refresh?: number } | undefined; // Permettre le paramètre refresh
  Game: { gameConfig: GameConfig };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Times Up!' }} 
        />
        <Stack.Screen 
          name="Players" 
          component={PlayersScreen} 
          options={{ title: 'Gestion des Joueurs' }} 
        />
        <Stack.Screen 
          name="Teams" 
          component={TeamsScreen} 
          options={{ title: 'Gestion des Équipes' }} 
        />
        <Stack.Screen 
          name="GameConfig" 
          component={GameConfigScreen} 
          options={{ title: 'Configuration de la partie' }} 
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen} 
          options={{ 
            title: 'Partie en cours',
            headerShown: false,  // Masquer l'en-tête pour l'écran de jeu
            gestureEnabled: false  // Désactiver le geste de retour arrière
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;