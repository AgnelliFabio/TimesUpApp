import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Title, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Title style={styles.title}>Times Up!</Title>
      <Text style={styles.subtitle}>Le jeu de devinettes par équipes</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          style={styles.button}
          onPress={() => {
            // Naviguer vers l'écran de nouvelle partie (à implémenter)
            console.log('Nouvelle Game');
          }}
        >
          Nouvelle Game
        </Button>
        
        <Button 
          mode="outlined" 
          style={styles.button}
          onPress={() => {
            // Naviguer vers l'écran de gestion des joueurs (à implémenter)
            console.log('Gérer les joueurs');
          }}
        >
          Gérer les Joueurs
        </Button>
        
        <Button 
          mode="outlined" 
          style={styles.button}
          onPress={() => {
            // Naviguer vers l'écran des paramètres (à implémenter)
            console.log('Paramètres');
          }}
        >
          Paramètres
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    color: '#3f51b5',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    color: '#757575',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    marginVertical: 8,
  },
});

export default HomeScreen;