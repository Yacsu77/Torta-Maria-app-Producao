import React, { useState, useRef } from 'react';
import { View, TextInput, Alert, StyleSheet, Text, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Cadastro({ navigation }) {
  // Estados para controlar a parte atual do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Estado e controle do date picker
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateText, setDateText] = useState('');
  
  // Referências para os campos de texto
  const inputs = {
    1: useRef([]),
    2: useRef([]),
    3: useRef([]),
  };

  const [form, setForm] = useState({
    nome: '', sobrenome: '', cpf: '', data_nasc: '',
    celular: '', email: '', senha: '', endereco: '', 
    cep: '', numero: '', complemento: ''
  });

  const [errors, setErrors] = useState({
    cpf: null,
    cep: null
  });
  
  const [touched, setTouched] = useState({
    cpf: false,
    cep: false
  });

  const focusNextField = (nextField) => {
    if (inputs[currentStep].current[nextField]) {
      inputs[currentStep].current[nextField].focus();
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = formatDate(selectedDate);
      setDateText(formattedDate);
      handleChange('data_nasc', formattedDate);
    }
  };

  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  const formatCEP = (cep) => {
    cep = cep.replace(/\D/g, '');
    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    return cep;
  };

  const validateCEP = (cep) => {
    return cep.replace(/\D/g, '').length === 8;
  };

  const fetchCEP = async (cep) => {
    try {
      const cleanedCEP = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        // Verifica se é São Paulo/SP
        if (data.localidade !== 'São Paulo' || data.uf !== 'SP') {
          Alert.alert(
            'Atenção', 
            'A Torta Maria atua apenas na cidade de São Paulo/SP. Você pode continuar o cadastro, mas o serviço pode não estar disponível para seu endereço.'
          );
        }
        
        setForm(prev => ({
          ...prev,
          endereco: `${data.logradouro || ''}, ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''}`,
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

  const nextStep = () => {
    // Validações antes de avançar
    if (currentStep === 1) {
      if (!form.nome || !form.sobrenome || !form.cpf || !form.data_nasc || !form.celular) {
        Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
        return;
      }
      
      if (!validateCPF(form.cpf)) {
        Alert.alert('Erro', 'Por favor, insira um CPF válido');
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!form.email || !form.senha) {
        Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCadastro = async () => {
    // Validações finais
    if (!validateCEP(form.cep)) {
      Alert.alert('Erro', 'Por favor, insira um CEP válido');
      return;
    }
    
    if (!form.numero) {
      Alert.alert('Erro', 'Por favor, informe o número do endereço');
      return;
    }

    // Combina endereço com número
    const enderecoCompleto = `${form.endereco}, ${form.numero}`;

    const res = await fetch('https://sivpt-betaapi.onrender.com/api/users/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        endereco: enderecoCompleto,
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

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 1 de {totalSteps}: Informações Pessoais</Text>
            
            <TextInput 
              ref={ref => inputs[1].current[0] = ref}
              style={styles.input} 
              placeholder="Nome *" 
              placeholderTextColor="#999"
              value={form.nome}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(1)}
              onChangeText={(v) => handleChange('nome', v)}
            />
            
            <TextInput 
              ref={ref => inputs[1].current[1] = ref}
              style={styles.input} 
              placeholder="Sobrenome *" 
              placeholderTextColor="#999"
              value={form.sobrenome}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(2)}
              onChangeText={(v) => handleChange('sobrenome', v)}
            />
            
            <TextInput 
              ref={ref => inputs[1].current[2] = ref}
              style={[styles.input, touched.cpf && errors.cpf && styles.inputError]} 
              placeholder="CPF *" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.cpf}
              maxLength={14}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(3)}
              onChangeText={(v) => handleChange('cpf', v)}
            />
            {touched.cpf && errors.cpf && (
              <Text style={styles.errorText}>CPF inválido</Text>
            )}
            
            <TouchableOpacity 
              style={styles.input} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={dateText ? styles.dateText : styles.datePlaceholder}>
                {dateText || 'Data de Nascimento (AAAA-MM-DD) *'}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
            
            <TextInput 
              ref={ref => inputs[1].current[4] = ref}
              style={styles.input} 
              placeholder="Celular *" 
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={form.celular}
              returnKeyType="done"
              onChangeText={(v) => handleChange('celular', v)}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 2 de {totalSteps}: Informações de Acesso</Text>
            
            <TextInput 
              ref={ref => inputs[2].current[0] = ref}
              style={styles.input} 
              placeholder="Email *" 
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(1)}
              onChangeText={(v) => handleChange('email', v)}
            />
            
            <TextInput 
              ref={ref => inputs[2].current[1] = ref}
              style={styles.input} 
              placeholder="Senha *" 
              placeholderTextColor="#999"
              secureTextEntry
              value={form.senha}
              returnKeyType="done"
              onChangeText={(v) => handleChange('senha', v)}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passo 3 de {totalSteps}: Endereço</Text>
            
            <TextInput 
              ref={ref => inputs[3].current[0] = ref}
              style={[styles.input, touched.cep && errors.cep && styles.inputError]} 
              placeholder="CEP *" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.cep}
              maxLength={9}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(1)}
              onChangeText={(v) => handleChange('cep', v)}
            />
            {touched.cep && errors.cep && (
              <Text style={styles.errorText}>CEP inválido</Text>
            )}
            
            <TextInput 
              ref={ref => inputs[3].current[1] = ref}
              style={styles.input} 
              placeholder="Endereço" 
              placeholderTextColor="#999"
              value={form.endereco}
              editable={false}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(2)}
            />
            
            <TextInput 
              ref={ref => inputs[3].current[2] = ref}
              style={styles.input} 
              placeholder="Número *" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.numero}
              returnKeyType="next"
              onSubmitEditing={() => focusNextField(3)}
              onChangeText={(v) => handleChange('numero', v)}
            />
            
            <TextInput 
              ref={ref => inputs[3].current[3] = ref}
              style={styles.input} 
              placeholder="Complemento *" 
              placeholderTextColor="#999"
              value={form.complemento}
              returnKeyType="done"
              onChangeText={(v) => handleChange('complemento', v)}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Fundo - agora 100% visível */}
          <Image 
            source={require('../assets/fundo.png')} 
            style={styles.backgroundImage}
          />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Logo */}
              <Image 
                source={require('../assets/snack-icon.png')} 
                style={styles.logo}
              />
              
              <Text style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>Preencha seus dados para se cadastrar</Text>
              
              {/* Barra de progresso */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${(currentStep/totalSteps)*100}%` }]} />
              </View>
              
              {/* Formulário */}
              {renderStep()}
              
              {/* Botões de navegação */}
              <View style={styles.navigationButtons}>
                {currentStep > 1 && (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.prevButton]}
                    onPress={prevStep}
                  >
                    <Text style={styles.navButtonText}>Voltar</Text>
                  </TouchableOpacity>
                )}
                
                {currentStep < totalSteps ? (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.nextButton]}
                    onPress={nextStep}
                  >
                    <Text style={styles.navButtonText}>Próximo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.registerButton]}
                    onPress={handleCadastro}
                  >
                    <Text style={styles.navButtonText}>Finalizar Cadastro</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.footer}>
                <Text style={styles.footerText}>Já tem uma conta?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Faça login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 1, // 100% visível
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255,)', // Fundo semi-transparente para melhor legibilidade
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 30,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF9500',
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    marginTop: -10,
    fontSize: 14,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  prevButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  nextButton: {
    backgroundColor: '#FF9500',
  },
  registerButton: {
    backgroundColor: '#34C759',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#666',
    marginRight: 5,
  },
  footerLink: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
});