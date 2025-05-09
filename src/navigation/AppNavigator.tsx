import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import des écrans (nous les créerons ensuite)
import HomeScreen from '../screens/HomeScreen';
// Les autres écrans seront importés ici plus tard

// Définition des types pour notre stack de navigation
export type RootStackParamList = {
  Home: undefined;
  // Nous ajouterons d'autres écrans ici
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
        {/* Nous ajouterons d'autres écrans ici */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;