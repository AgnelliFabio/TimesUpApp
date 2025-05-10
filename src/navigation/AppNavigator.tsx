import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import PlayersScreen from '../screens/PlayersScreen';
import TeamsScreen from '../screens/TeamsScreen';
import GameConfigScreen from '../screens/GameConfigScreen';

// Définition des types pour notre stack de navigation
export type RootStackParamList = {
  Home: undefined;
  Players: undefined;
  Teams: undefined;
  GameConfig: undefined;
  // Game sera ajouté plus tard
  // Game: { gameData: any };
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
        {/* L'écran de jeu sera ajouté plus tard */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;