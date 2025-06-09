import React, { useState } from 'react';
import { View, TextInput, Alert, StyleSheet, Text, TouchableOpacity, Image, Keyboard, TouchableWithoutFeedback, ImageBackground } from 'react-native';
import { saveUserData } from '../auth';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
    const res = await fetch('https://sivpt-betaapi.onrender.com/api/users/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    if (res.status === 200) {
      const data = await res.json();
      await saveUserData(data);
      navigation.replace('Menu');
    } else {
      Alert.alert('Erro', 'Login inválido.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground 
        source={require('../assets/fundo.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.container}>
          {/* Logo centralizada */}
          <Image 
            source={require('../assets/snack-icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* Formulário */}
          <View style={styles.formContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="Email" 
              placeholderTextColor="#999"
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="Senha" 
              placeholderTextColor="#999"
              secureTextEntry 
              value={senha} 
              onChangeText={setSenha} 
            />
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
          
          {/* Rodapé */}
          <TouchableOpacity 
            style={styles.registerLink} 
            onPress={() => navigation.navigate('Cadastro')}
          >
            <Text style={styles.registerLinkText}>Não tem uma conta? <Text style={{fontWeight: 'bold'}}>Cadastre-se</Text></Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fundo semi-transparente apenas para o formulário
    borderRadius: 20,
    padding: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  loginButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF9500', // Laranja
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    alignSelf: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fundo semi-transparente
    padding: 10,
    borderRadius: 10,
  },
  registerLinkText: {
    color: '#FF9500',
    fontSize: 14,
  },
});