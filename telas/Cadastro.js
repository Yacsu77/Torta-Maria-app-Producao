import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, TouchableOpacity, Image, ScrollView } from 'react-native';

export default function Cadastro({ navigation }) {
  const [form, setForm] = useState({
    nome: '', sobrenome: '', cpf: '', data_nasc: '',
    celular: '', email: '', senha: '', endereco: '', cep: '', complemento: ''
  });

  const [errors, setErrors] = useState({
    cpf: null,
    cep: null
  });
  const [touched, setTouched] = useState({
    cpf: false,
    cep: false
  });

  const handleChange = (key, value) => {
    // Formatação automática do CPF
    if (key === 'cpf') {
      value = formatCPF(value);
      setTouched({...touched, cpf: true});
      setErrors({...errors, cpf: !validateCPF(value)});
    }
    
    if (key === 'cep') {
      value = formatCEP(value);
      setTouched({...touched, cep: true});
      setErrors({...errors, cep: !validateCEP(value)});
      
      // Busca automática quando o CEP está completo
      if (value.replace(/\D/g, '').length === 8) {
        fetchCEP(value);
      }
    }
    
    setForm({ ...form, [key]: value });
  };

  const formatCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, '');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
  };

  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) {
      soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
  };

  // Formatação e validação de CEP
  const formatCEP = (cep) => {
    cep = cep.replace(/\D/g, '');
    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    return cep;
  };

  const validateCEP = (cep) => {
    return cep.replace(/\D/g, '').length === 8;
  };

  // Busca CEP na API ViaCEP
  const fetchCEP = async (cep) => {
    try {
      const cleanedCEP = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          complemento: data.complemento || '',
        }));
      } else {
        Alert.alert('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      Alert.alert('Erro', 'Não foi possível buscar o CEP');
    }
  };

  const handleCadastro = async () => {
    // Verifica CPF antes de enviar
    if (!validateCPF(form.cpf)) {
      Alert.alert('Erro', 'Por favor, insira um CPF válido');
      return;
    }

    if (!validateCEP(form.cep)) {
      Alert.alert('Erro', 'Por favor, insira um CEP válido');
      return;
    }

    const res = await fetch('https://sivpt-betaapi.onrender.com/api/users/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        cpf: form.cpf.replace(/[^\d]+/g, ''), // Envia apenas números
        cep: form.cep.replace(/\D/g, '')
      }),
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
  style={[styles.input, touched.cpf && errors.cpf && styles.inputError]} 
  placeholder="CPF" 
  placeholderTextColor="#999"
  keyboardType="numeric"
  value={form.cpf}
  maxLength={14}
  onChangeText={(v) => handleChange('cpf', v)}
/>
{touched.cpf && errors.cpf && (
  <Text style={styles.errorText}>CPF inválido</Text>
)}
          
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
            style={[styles.input, touched.cep && errors.cep && styles.inputError]} 
            placeholder="CEP" 
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={form.cep}
            maxLength={9}
            onChangeText={(v) => handleChange('cep', v)}
          />
          {touched.cep && errors.cep && (
            <Text style={styles.errorText}>CEP inválido</Text>
          )}
          
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
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    marginTop: -5,
    fontSize: 14,
  },
});