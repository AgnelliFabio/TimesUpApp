import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import PlayersScreen from '../screens/PlayersScreen';
import TeamsScreen from '../screens/TeamsScreen';

// Définition des types pour notre stack de navigation
export type RootStackParamList = {
  Home: undefined;
  Players: undefined;
  Teams: undefined;
  // Nous ajouterons d'autres écrans plus tard
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
        {/* Nous ajouterons d'autres écrans ici */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;