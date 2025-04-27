import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView
} from 'react-native';
import { getUserData, getCurrentSection, clearCurrentSection } from '../auth';
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
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (tipoSecao) {
      fetchLojas();
    }
  }, [tipoSecao]);

  const fetchLojas = async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://sivpt-betaapi.onrender.com/api/loja/Lojas/Listar');
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

  const handleCriarSecao = async () => {
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

      const response = await axios.post('https://sivpt-betaapi.onrender.com/api/secao/secao/criar', {
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
                onPress={handleCriarSecao}
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
    marginTop: 20
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
  }
});

export default AbrirSecao;