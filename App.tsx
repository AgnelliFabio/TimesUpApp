import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { useAssets } from './src/hooks/useAssets';

export default function App() {
  const assetsLoaded = useAssets();
  
  if (!assetsLoaded) {
    return null; // Ou un écran de chargement personnalisé
  }
  
  return (
    <PaperProvider>
      <AppNavigator />
    </PaperProvider>
  );
}