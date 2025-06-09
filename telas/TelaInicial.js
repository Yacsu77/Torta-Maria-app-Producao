import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';

export default function TelaInicial({ navigation }) {
  return (
    <ImageBackground 
      source={require('../assets/fundo.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Logo */}
          <Image 
            source={require('../assets/snack-icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* Título - Agora como imagem */}
          <View style={styles.titleContainer}>
            <Image 
              source={require('../assets/Text.png')} 
              style={styles.titleImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Botões */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('Cadastro')}
            >
              <Text style={styles.buttonTextPrimary}>Cadastrar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonTextSecondary}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Rodapé - Movido para fora do content */}
        <View style={styles.footerContainer}>
          <Text style={styles.footer}>© 2025 A Fantastica Torta da Maria. Todos os direitos reservados.</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    paddingBottom: 60, // Espaço para o footer
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleImage: {
    width: 300,
    height: 150, // Ajuste conforme necessário para sua imagem
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#ff6d00',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    width: '100%',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 12,
  },
});