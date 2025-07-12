import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { getUserData, getCurrentSection, clearCurrentSection, updateUserLocal } from '../auth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const AbrirSecao = ({ navigation }) => {
  const [tipoSecao, setTipoSecao] = useState(null);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [endereco, setEndereco] = useState('');

  useEffect(() => {
    const checkSection = async () => {
      const section = await getCurrentSection();
      setCurrentSection(section);
    };
    checkSection();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
      if (data) {
        setCep(data.Cep_Cli || '');
        setEndereco(data.Endereco_Cli ? data.Endereco_Cli.split(', ').slice(0, -1).join(', ') : '');
        setNumero(data.Endereco_Cli ? data.Endereco_Cli.split(', ').pop() : '');
        setComplemento(data.complemento || '');
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (cep.length === 8 && !isNaN(cep)) {
      buscarEnderecoPorCep();
    }
  }, [cep]);

  useEffect(() => {
    if (tipoSecao) {
      fetchLojas();
    }
  }, [tipoSecao]);

  const fetchLojas = async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://sivpt-api-v2.onrender.com/api/loja/Lojas/Listar');
      setLojas(response.data);
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as lojas');
    } finally {
      setLoading(false);
    }
  };

  const handleFecharSecao = async () => {
    if (!currentSection) return;

    setLoading(true);
    try {
      await clearCurrentSection();
      setCurrentSection(null);
      setSelectedLoja(null);
      setTipoSecao(null);
      Alert.alert('Sucesso', 'Seção fechada com sucesso');
    } catch (error) {
      console.error('Erro ao fechar seção:', error);
      Alert.alert('Erro', 'Não foi possível fechar a seção');
    } finally {
      setLoading(false);
    }
  };

  const buscarEnderecoPorCep = async () => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
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
      
      // Atualização no servidor
      const response = await axios.put(
        `https://sivpt-api-v2.onrender.com/api/users/${userData.CPF}/endereco`,
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
        setUserData(updatedUser);
        
        Alert.alert('Sucesso', 'Endereço atualizado com sucesso!');
        setEditingAddress(false);
        setShowAddressModal(false);
      }
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o endereço');
    }
  };

  const verificarEnderecoEntrega = () => {
    if (tipoSecao === 'entrega') {
      setShowAddressModal(true);
    } else {
      criarSecao();
    }
  };

  const criarSecao = async () => {
    if (!selectedLoja || !tipoSecao || !userData) {
      Alert.alert('Atenção', 'Selecione uma loja para continuar');
      return;
    }

    if (currentSection) {
      Alert.alert('Atenção', 'Feche a seção atual antes de abrir uma nova');
      return;
    }

    setLoading(true);
    try {
      // CORREÇÃO: Invertendo os tipos de seção
      const tipoSecaoNumerico = tipoSecao === 'entrega' ? 2 : 1;

      const response = await axios.post('https://sivpt-api-v2.onrender.com/api/secao/secao/criar', {
        CPF_cliente: userData.CPF,
        CNPJ_loja: selectedLoja.CNPJ,
        Situacao: 1,
        tipo_secao: tipoSecaoNumerico
      });

      if (response.data && response.data.ID) {
        await AsyncStorage.setItem('currentSection', response.data.ID.toString());
        await AsyncStorage.setItem('tipoSecao', tipoSecaoNumerico.toString());
        await AsyncStorage.setItem('selectedLoja', JSON.stringify(selectedLoja));
        
        setCurrentSection({
          id: response.data.ID.toString(),
          tipo: tipoSecaoNumerico.toString()
        });

        // Fecha a tela automaticamente após abrir a seção
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao criar seção:', error);
      Alert.alert('Erro', 'Não foi possível criar a seção');
    } finally {
      setLoading(false);
    }
  };

  const renderLojaItem = ({ item }) => {
    const isSelected = selectedLoja?.CNPJ === item.CNPJ;

    return (
      <TouchableOpacity
        onPress={() => setSelectedLoja(item)}
        style={[styles.lojaItem, isSelected && styles.lojaItemSelected]}
      >
        <Text style={styles.lojaNome}>{item.Nome_loja}</Text>
        <Text style={styles.lojaEndereco}>{item.Endereco_Loja}</Text>
        <Text style={styles.lojaEndereco}>CEP: {item.Cep_loja}</Text>
        {item.Complemento_Loja && (
          <Text style={styles.lojaEndereco}>Complemento: {item.Complemento_Loja}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolher Loja</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {!currentSection ? (
          <>
            <Text style={styles.titulo}>Como você deseja receber seu pedido?</Text>

            <View style={styles.opcoes}>
              <TouchableOpacity
                style={[
                  styles.botaoTipo,
                  tipoSecao === 'entrega' && styles.botaoSelecionadoLaranja
                ]}
                onPress={() => setTipoSecao('entrega')}
              >
                <Text style={styles.textoBotao}>Entrega</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoTipo,
                  tipoSecao === 'retirada' && styles.botaoSelecionadoVerde
                ]}
                onPress={() => setTipoSecao('retirada')}
              >
                <Text style={styles.textoBotao}>Retirada na Loja</Text>
              </TouchableOpacity>
            </View>

            {tipoSecao && (
              <>
                <Text style={styles.subtitulo}>Selecione a loja:</Text>
                {loading && lojas.length === 0 ? (
                  <ActivityIndicator size="large" color="#4CAF50" />
                ) : (
                  <FlatList
                    data={lojas}
                    renderItem={renderLojaItem}
                    keyExtractor={(item) => item.CNPJ}
                    scrollEnabled={false}
                  />
                )}
              </>
            )}

            {selectedLoja && (
              <TouchableOpacity
                style={styles.botaoConfirmar}
                onPress={verificarEnderecoEntrega}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoConfirmar}>Confirmar Loja</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.currentSectionContainer}>
            <Text style={styles.currentSectionTitle}>Seção Ativa</Text>
            <Text style={styles.currentSectionText}>
              Você já tem uma seção aberta nesta loja: {selectedLoja?.Nome_loja || 'Loja não identificada'}
            </Text>
            <Text style={styles.currentSectionText}>
              Tipo: {currentSection.tipo === '1' ? 'Retirada na Loja' : 'Entrega'}
            </Text>
            
            <TouchableOpacity 
              style={styles.botaoFechar} 
              onPress={handleFecharSecao} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.textoFechar}>Fechar Seção</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de confirmação de endereço */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContainer}>
              {!editingAddress ? (
                <>
                  <Text style={styles.modalTitle}>Confirme o endereço de entrega</Text>
                  <Text style={styles.modalText}>
                    O endereço cadastrado é: {userData?.Endereco_Cli}
                  </Text>
                  {userData?.complemento && (
                    <Text style={styles.modalText}>
                      Complemento: {userData.complemento}
                    </Text>
                  )}
                  <Text style={styles.modalText}>CEP: {userData?.Cep_Cli}</Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={styles.modalButtonSecondary}
                      onPress={() => setEditingAddress(true)}
                    >
                      <Text style={styles.modalButtonTextSecondary}>Alterar Endereço</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalButtonPrimary}
                      onPress={criarSecao}
                    >
                      <Text style={styles.modalButtonTextPrimary}>Confirmar Endereço</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Editar Endereço</Text>
                  
                  <Text style={styles.formLabel}>CEP</Text>
                  <View style={styles.cepContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Digite seu CEP"
                      value={cep}
                      onChangeText={setCep}
                      keyboardType="numeric"
                      maxLength={8}
                    />
                    {loadingCep && (
                      <ActivityIndicator size="small" color="#FF6D00" style={styles.cepLoading} />
                    )}
                  </View>

                  <Text style={styles.formLabel}>Endereço</Text>
                  <View style={styles.readOnlyInputContainer}>
                    <Text style={styles.readOnlyInput}>{endereco || 'O endereço será preenchido automaticamente'}</Text>
                  </View>

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
                      onPress={() => {
                        setEditingAddress(false);
                        // Resetar para os valores originais ao cancelar
                        if (userData) {
                          setCep(userData.Cep_Cli || '');
                          setEndereco(userData.Endereco_Cli ? userData.Endereco_Cli.split(', ').slice(0, -1).join(', ') : '');
                          setNumero(userData.Endereco_Cli ? userData.Endereco_Cli.split(', ').pop() : '');
                          setComplemento(userData.complemento || '');
                        }
                      }}
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
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40, // Adicionado para evitar que os botões fiquem muito próximos da borda
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center'
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    color: '#555'
  },
  opcoes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  botaoTipo: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center'
  },
  botaoSelecionadoLaranja: {
    backgroundColor: '#FFA726',
  },
  botaoSelecionadoVerde: {
    backgroundColor: '#66BB6A',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold'
  },
  lojaItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  lojaItemSelected: {
    backgroundColor: '#E0F2F1',
    borderColor: '#4CAF50'
  },
  lojaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  lojaEndereco: {
    fontSize: 14,
    color: '#555'
  },
  botaoConfirmar: {
    backgroundColor: '#FFA726',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  textoConfirmar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  botaoFechar: {
    backgroundColor: '#FF7043',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  textoFechar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  currentSectionContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginTop: 20
  },
  currentSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center'
  },
  currentSectionText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555'
  },
  // Estilos para o modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center'
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  modalButtonPrimary: {
    backgroundColor: '#FFA726',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center'
  },
  modalButtonSecondary: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center'
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontWeight: '600'
  },
  modalButtonTextSecondary: {
    color: '#333',
    fontWeight: '600'
  },
  // Estilos para o formulário de endereço
  formLabel: {
    fontSize: 14,
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
    marginBottom: 10,
  },
  readOnlyInputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  readOnlyInput: {
    fontSize: 16,
    color: '#333',
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
});

export default AbrirSecao;