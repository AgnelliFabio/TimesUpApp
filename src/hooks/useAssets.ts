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
  // Testez cette image en premier (assurez-vous qu'elle existe)
  // Décommentez UNE SEULE ligne à la fois pour tester
  
  // Test 1 - Logo
  logo: require('../../assets/images/Logo-TimesOut.png'),
  
  // Test 2 - Background (à décommenter après que le logo fonctionne)
  gradientBackground: require('../../assets/images/GradientBackground.png'),
  
  // Tests 3-5 - Pictos (à décommenter un par un)
  // pictos: {
  //   description: require('../../assets/images/Description-picto.png'),
  //   oneWord: require('../../assets/images/1mot-picto.png'),
  //   mime: require('../../assets/images/Mime-picto.png'),
  // },
  
  // Tests 6-9 - Icônes équipes (à décommenter un par un)
  // teams: {
  //   cyan: require('../../assets/images/icon-cyan.png'),
  //   violet: require('../../assets/images/icon-violet.png'),
  //   rouge: require('../../assets/images/icon-rouge.png'),
  //   vert: require('../../assets/images/icon-vert.png'),
  // }
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
        console.log('Fonts loaded successfully');
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