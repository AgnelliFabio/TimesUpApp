import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

// Test d'images une par une
export const images = {
  // Logo et background ✅
  logo: require('../../assets/images/Logo-TimesOut.png'),
  gradientBackground: require('../../assets/images/GradientBackground.png'),
  
  // Test des icônes d'équipes
  teams: {
    cyan: require('../../assets/images/icon-cyan.png'),
    violet: require('../../assets/images/icon-violet.png'),
    rouge: require('../../assets/images/icon-rouge.png'),
    vert: require('../../assets/images/icon-vert.png'),
  },
  
  // Pictos suivants
  pictos: {
    description: require('../../assets/images/Description-picto.png'),
    oneWord: require('../../assets/images/1mot-picto.png'),
    mime: require('../../assets/images/Mime-picto.png'),
  },
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
        console.warn('Error loading fonts:', error);
        setAssetsLoaded(true);
      }
    }
    
    loadAssets();
  }, []);
  
  return assetsLoaded;
};