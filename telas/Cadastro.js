import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, TouchableOpacity, Image, ScrollView } from 'react-native';

export default function Cadastro({ navigation }) {
  const [form, setForm] = useState({
    nome: '', sobrenome: '', cpf: '', data_nasc: '',
    celular: '', email: '', senha: '', endereco: '', cep: '', complemento: ''
  });

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleCadastro = async () => {
    const res = await fetch('https://sivpt-betaapi.onrender.com/api/users/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.status === 200) {
      Alert.alert('Sucesso', 'Cadastro realizado!');
      navigation.replace('Login');
    } else {
      Alert.alert('Erro', 'Não foi possível cadastrar.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image 
            style={styles.logo}
          />
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para se cadastrar</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Nome" 
            placeholderTextColor="#999"
            onChangeText={(v) => handleChange('nome', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Sobrenome" 
            placeholderTextColor="#999"
            onChangeText={(v) => handleChange('sobrenome', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="CPF" 
            placeholderTextColor="#999"
            keyboardType="numeric"
            onChangeText={(v) => handleChange('cpf', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Data de Nascimento (DD/MM/AAAA)" 
            placeholderTextColor="#999"
            onChangeText={(v) => handleChange('data_nasc', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Celular" 
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            onChangeText={(v) => handleChange('celular', v)}
          />
          
          <Text style={styles.sectionTitle}>Informações de Acesso</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(v) => handleChange('email', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Senha" 
            placeholderTextColor="#999"
            secureTextEntry
            onChangeText={(v) => handleChange('senha', v)}
          />
          
          <Text style={styles.sectionTitle}>Endereço</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="CEP" 
            placeholderTextColor="#999"
            keyboardType="numeric"
            onChangeText={(v) => handleChange('cep', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Endereço" 
            placeholderTextColor="#999"
            onChangeText={(v) => handleChange('endereco', v)}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Complemento" 
            placeholderTextColor="#999"
            onChangeText={(v) => handleChange('complemento', v)}
          />
          
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleCadastro}
          >
            <Text style={styles.registerButtonText}>Cadastrar</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Faça login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9500', // Laranja
    marginTop: 15,
    marginBottom: 10,
    paddingLeft: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  registerButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#34C759', // Verde
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    marginTop: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    marginRight: 5,
  },
  footerLink: {
    color: '#FF9500', // Laranja
    fontWeight: 'bold',
  },
});