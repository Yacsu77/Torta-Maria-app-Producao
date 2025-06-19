import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, SafeAreaView, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { getUserData, logoutUser, updateUserLocal, getUserPhoto } from '../auth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function Perfil({ navigation }) {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [endereco, setEndereco] = useState('');

  useEffect(() => {
    const carregar = async () => {
      const data = await getUserData();
      if (data) {
        setUser(data);
        // Carrega a foto separadamente se necessário
        const foto = await getUserPhoto();
        if (foto) {
          setUser(prev => ({ ...prev, foto }));
        }
      }
    };
    carregar();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para alterar a foto');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setIsUpdatingImage(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Atualiza localmente e no estado
        const updatedUser = await updateUserLocal({ foto: base64Image });
        setUser(updatedUser);
        
        setIsUpdatingImage(false);
        Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      setIsUpdatingImage(false);
      Alert.alert('Erro', 'Não foi possível atualizar a imagem de perfil');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logoutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' }],
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setIsLoggingOut(false);
      Alert.alert('Erro', 'Não foi possível sair da conta');
    }
  };

  const buscarEnderecoPorCep = async () => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      Alert.alert('CEP inválido', 'Por favor, digite um CEP válido com 8 dígitos');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (response.data.erro) {
        Alert.alert('CEP não encontrado', 'O CEP digitado não foi encontrado na base de dados');
        return;
      }
      
      const { logradouro, bairro, localidade, uf } = response.data;
      const enderecoCompleto = `${logradouro}, ${bairro}, ${localidade} - ${uf}`;
      setEndereco(enderecoCompleto);
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      Alert.alert('Erro', 'Não foi possível buscar o endereço para este CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const salvarEndereco = async () => {
    if (!cep || !endereco || !numero) {
      Alert.alert('Campos obrigatórios', 'CEP, Endereço e Número são obrigatórios');
      return;
    }

    try {
      const enderecoCompleto = `${endereco}, ${numero}` + (complemento ? ` - ${complemento}` : '');
      
      // Atualização no servidor (mantido como estava)
      const response = await axios.put(
        `https://sivpt-betaapi.onrender.com/api/users/${user.CPF}/endereco`,
        {
          endereco: enderecoCompleto,
          cep,
          complemento
        }
      );

      if (response.data.message) {
        // Atualização local com o novo endereço
        const updatedUser = await updateUserLocal({
          Endereco_Cli: enderecoCompleto,
          Cep_Cli: cep,
          complemento: complemento || ''
        });
        
        // Atualiza o estado com o usuário retornado pela função updateUserLocal
        setUser(updatedUser);
        
        Alert.alert('Sucesso', 'Endereço atualizado com sucesso!');
        setEditingAddress(false);
      }
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o endereço');
    }
  };

  const iniciarEdicaoEndereco = () => {
    setEditingAddress(true);
    setCep(user.Cep_Cli || '');
    setEndereco(user.Endereco_Cli ? user.Endereco_Cli.split(', ').slice(0, -1).join(', ') : '');
    setNumero(user.Endereco_Cli ? user.Endereco_Cli.split(', ').pop() : '');
    setComplemento(user.complemento || '');
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6D00" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            {/* Header com foto e nome */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={pickImage} disabled={isUpdatingImage}>
                  {isUpdatingImage ? (
                    <View style={[styles.avatar, styles.avatarLoading]}>
                      <ActivityIndicator size="small" color="white" />
                    </View>
                  ) : (
                    <Image
                      style={styles.avatar}
                      source={user.foto ? { uri: user.foto } : require('../assets/default-avatar.png')}
                    />
                  )}
                  <View style={styles.editIcon}>
                    <Ionicons name="camera-outline" size={20} color="white" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.userName}>{user.Nome_Cli}</Text>
                <Text style={styles.userEmail}>{user.Email_Cli}</Text>
              </View>
            </View>

            {/* Informações do perfil */}
            <View style={styles.profileInfo}>
              <Text style={styles.sectionTitle}>Informações Pessoais</Text>
              
              <View style={styles.infoCard}>
                {editingAddress ? (
                  <View style={styles.addressForm}>
                    <Text style={styles.formLabel}>CEP</Text>
                    <View style={styles.cepContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Digite seu CEP"
                        value={cep}
                        onChangeText={setCep}
                        keyboardType="numeric"
                        onBlur={buscarEnderecoPorCep}
                      />
                      {loadingCep && (
                        <ActivityIndicator size="small" color="#FF6D00" style={styles.cepLoading} />
                      )}
                    </View>

                    <Text style={styles.formLabel}>Endereço</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Endereço completo"
                      value={endereco}
                      onChangeText={setEndereco}
                      editable={!!endereco}
                    />

                    <Text style={styles.formLabel}>Número</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Número"
                      value={numero}
                      onChangeText={setNumero}
                      keyboardType="numeric"
                    />

                    <Text style={styles.formLabel}>Complemento (opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Complemento"
                      value={complemento}
                      onChangeText={setComplemento}
                    />

                    <View style={styles.formButtons}>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => setEditingAddress(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={salvarEndereco}
                      >
                        <Text style={styles.saveButtonText}>Salvar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.infoItem}>
                      <Ionicons name="location-outline" size={22} color="#FF6D00" />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Endereço</Text>
                        <View style={styles.addressRow}>
                          <Text style={styles.infoText}>{user.Endereco_Cli}</Text>
                          <TouchableOpacity onPress={iniciarEdicaoEndereco}>
                            <Ionicons name="pencil-outline" size={18} color="#FF6D00" />
                          </TouchableOpacity>
                        </View>
                        {user.complemento && (
                          <Text style={styles.complementText}>Complemento: {user.complemento}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <Ionicons name="map-outline" size={22} color="#FF6D00" />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>CEP</Text>
                        <Text style={styles.infoText}>{user.Cep_Cli}</Text>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={22} color="#FF6D00" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Celular</Text>
                    <Text style={styles.infoText}>{user.Celular_Cli}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="id-card-outline" size={22} color="#FF6D00" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>CPF</Text>
                    <Text style={styles.infoText}>{user.CPF}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Botão de Logout */}
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text style={styles.logoutButtonText}>Sair da conta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos permanecem os mesmos
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FF6D00',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 15,
    backgroundColor: '#E0E0E0',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CCCCCC',
  },
  editIcon: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    backgroundColor: '#2E7D32',
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileInfo: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 15,
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  complementText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
  },
  addressForm: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cepContainer: {
    position: 'relative',
  },
  cepLoading: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF6D00',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});