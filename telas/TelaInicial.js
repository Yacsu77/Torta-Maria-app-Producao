import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';

export default function TelaInicial({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Image 
          source={require('../assets/snack-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        {/* Título */}
        <Text style={styles.title}>Bem-vindo </Text>
        <Text style={styles.subtitle}>A Fantastica Torta da Maria</Text>
        
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
      
      {/* Rodapé */}
      <Text style={styles.footer}>© 2025 A Fantastica Torta da Maria. Todos os direitos reservados.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32', // Verde escuro
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
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
    backgroundColor: '#ff6d00', // Laranja vibrante
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2e7d32', // Verde escuro
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#2e7d32', // Verde escuro
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#757575',
    paddingVertical: 20,
    fontSize: 12,
  },
});