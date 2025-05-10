import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Button, Title, Text } from "react-native-paper";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import Database from "../database/Database";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

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
            navigation.navigate("GameConfig");
          }}
        >
          Nouvelle Partie
        </Button>

        <Button
          mode="outlined"
          style={styles.button}
          onPress={() => {
            navigation.navigate("Players");
          }}
        >
          Gérer les Joueurs
        </Button>

        <Button
          mode="outlined"
          style={styles.button}
          onPress={() => {
            navigation.navigate("Teams");
          }}
        >
          Gérer les Équipes
        </Button>
        <Button
          mode="outlined"
          style={[styles.button, { marginTop: 20, backgroundColor: "#ffcccc" }]}
          onPress={async () => {
            try {
              await Database.resetDatabase();
              Alert.alert(
                "Succès",
                "Base de données réinitialisée avec succès. Redémarrez l'application."
              );
            } catch (error) {
              console.error("Erreur lors de la réinitialisation", error);
              Alert.alert(
                "Erreur",
                "Impossible de réinitialiser la base de données"
              );
            }
          }}
        >
          Réinitialiser la base de données
        </Button>
        <Button
          mode="outlined"
          style={styles.button}
          onPress={() => {
            // Naviguer vers l'écran des paramètres (à implémenter)
            console.log("Paramètres");
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
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f7f7f7",
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    color: "#3f51b5",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    color: "#757575",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  button: {
    marginVertical: 8,
  },
});

export default HomeScreen;
