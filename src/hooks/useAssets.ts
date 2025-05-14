import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

// Définition des images - Les chemins doivent partir de la racine du projet
export const images = {
  logo: require('../../assets/images/Logo-TimesOut.png'),
  gradientBackground: require('../../assets/images/GradientBackground.png'),
  pictos: {
    description: require('../../assets/images/Description-picto.png'),
    oneWord: require('../../assets/images/1mot-picto.png'),
    mime: require('../../assets/images/Mime-picto.png'),
  },
  teams: {
    cyan: require('../../assets/images/icon-cyan.png'),
    violet: require('../../assets/images/icon-violet.png'),
    rouge: require('../../assets/images/icon-rouge.png'),
    vert: require('../../assets/images/icon-vert.png'),
  }
};

export const useAssets = () => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  
  useEffect(() => {
    async function loadAssets() {
      try {
        await Font.loadAsync({
          Nunito_400Regular,
          Nunito_500Medium,
          Nunito_600SemiBold,
          Nunito_700Bold,
          Nunito_800ExtraBold,
        });
        setAssetsLoaded(true);
      } catch (error) {
        console.warn('Error loading assets:', error);
        setAssetsLoaded(true); // Continuer même si les polices échouent
      }
    }
    
    loadAssets();
  }, []);
  
  return assetsLoaded;
};