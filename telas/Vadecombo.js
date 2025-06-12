import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import axios from 'axios';

const Vadecombo = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [categoriasCombo, setCategoriasCombo] = useState([]);
  const [produtosCombo, setProdutosCombo] = useState([]);
  const [etapa, setEtapa] = useState(1); // 1 = selecionar fatias, 2 = selecionar acompanhamento
  const [fatiaSelecionada, setFatiaSelecionada] = useState(null);
  const [acompanhamentoSelecionado, setAcompanhamentoSelecionado] = useState(null);
  const [idSecao, setIdSecao] = useState(null);
  const [error, setError] = useState(null);

  // Valor base do combo
  const VALOR_BASE_COMBO = 53.00;

  // Cores padrão
  const colors = {
    primary: '#2ecc71', // Verde
    secondary: '#e67e22', // Laranja
    background: '#f9f9f9',
    text: '#333',
    textLight: '#777',
    white: '#fff',
    border: '#e0e0e0',
    error: '#e74c3c'
  };

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const secao = await getCurrentSection();
        if (secao) setIdSecao(secao.id);
        
        // Carrega categorias de combo
        const responseCategorias = await axios.get('https://sivpt-betaapi.onrender.com/api/sacola/listar/categorias-combo');
        setCategoriasCombo(responseCategorias.data);
        
        // Carrega produtos de combo
        const responseProdutos = await axios.get('https://sivpt-betaapi.onrender.com/api/sacola/listar/produtos-combo');
        setProdutosCombo(responseProdutos.data);
        
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar opções de combo. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    carregarDados();
  }, []);

  const handleSelecionarFatia = (produto) => {
    setFatiaSelecionada(produto);
    setEtapa(2); // Avança para seleção de acompanhamento
  };

  const handleSelecionarAcompanhamento = (produto) => {
    setAcompanhamentoSelecionado(produto);
  };

  const handleVoltarEtapa = () => {
    if (etapa === 2) {
      setEtapa(1); // Volta para seleção de fatias
    } else {
      navigation.goBack(); // Volta para tela anterior
    }
  };

  const calcularValorTotal = () => {
    let total = VALOR_BASE_COMBO;
    
    // Adiciona acréscimo da fatia se existir
    if (fatiaSelecionada?.acrecimo_valor) {
      total += parseFloat(fatiaSelecionada.acrecimo_valor);
    }
    
    // Adiciona acréscimo do acompanhamento se existir
    if (acompanhamentoSelecionado?.acrecimo_valor) {
      total += parseFloat(acompanhamentoSelecionado.acrecimo_valor);
    }
    
    return total.toFixed(2);
  };

  const handleFinalizarCombo = async () => {
    if (!fatiaSelecionada || !acompanhamentoSelecionado) {
      alert('Por favor, selecione todos os itens do combo');
      return;
    }

    if (!idSecao) {
      alert('Nenhuma seção aberta. Por favor, abra uma seção primeiro.');
      navigation.navigate('AbrirSeçãoModal');
      return;
    }

    try {
      await axios.post('https://sivpt-betaapi.onrender.com/api/sacola/inseri/combo', {
        ID_secao: idSecao,
        primeiro_produto: fatiaSelecionada.id,
        Segundo_produto: acompanhamentoSelecionado.id
      });
      
      alert('Combo adicionado ao carrinho com sucesso!');
      navigation.goBack();
    } catch (err) {
      console.error('Erro ao adicionar combo:', err);
      alert('Erro ao adicionar combo ao carrinho.');
    }
  };

  const renderProdutoItem = ({ item }) => {
    const isSelected = 
      (etapa === 1 && fatiaSelecionada?.id === item.id) || 
      (etapa === 2 && acompanhamentoSelecionado?.id === item.id);
    
    // Verifica se tem acréscimo e formata o valor
    const acrescimo = item.acrecimo_valor ? parseFloat(item.acrecimo_valor) : 0;
    const textoAcrescimo = acrescimo > 0 ? `+R$ ${acrescimo.toFixed(2)}` : 'Sem acréscimo';
    
    return (
      <TouchableOpacity
        style={[
          styles.produtoItem, 
          { 
            backgroundColor: isSelected ? colors.primary : colors.white,
            borderColor: isSelected ? colors.primary : colors.border
          }
        ]}
        onPress={() => {
          if (etapa === 1) handleSelecionarFatia(item);
          else handleSelecionarAcompanhamento(item);
        }}
      >
        <Image 
          source={{ uri: item.URL_imagem }} 
          style={styles.produtoImage}
          resizeMode="contain"
        />
        <View style={styles.produtoInfo}>
          <Text 
            style={[
              styles.produtoNome, 
              { color: isSelected ? colors.white : colors.text }
            ]}
          >
            {item.Produto}
          </Text>
          <Text 
            style={[
              styles.produtoPreco, 
              { color: isSelected ? colors.white : colors.primary }
            ]}
          >
            {textoAcrescimo}
          </Text>
        </View>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={colors.white} 
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleVoltarEtapa} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[
            styles.progressStep, 
            etapa >= 1 && { backgroundColor: colors.secondary }
          ]}>
            <Text style={styles.progressText}>1</Text>
          </View>
          
          <View style={[
            styles.progressLine,
            etapa >= 2 && { backgroundColor: colors.secondary }
          ]} />
          
          <View style={[
            styles.progressStep, 
            etapa >= 2 && { backgroundColor: colors.secondary }
          ]}>
            <Text style={styles.progressText}>2</Text>
          </View>
        </View>
        
        <View style={{ width: 40 }} /> {/* Espaço para alinhamento */}
      </View>
    );
  };

  const renderCurrentStep = () => {
    if (etapa === 1) {
      const fatias = produtosCombo.filter(p => p.categoria_id === 1);
      
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>
            <Ionicons name="pizza" size={24} color={colors.secondary} /> 
            {' '}Escolha sua fatia
          </Text>
          <Text style={styles.stepDescription}>Selecione uma opção de fatia para seu combo</Text>
          
          <FlatList
            data={fatias}
            renderItem={renderProdutoItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.productsList}
          />
        </View>
      );
    } else {
      const acompanhamentos = produtosCombo.filter(p => p.categoria_id === 2);
      
      return (
        <View style={styles.stepContainer}>
          <View style={styles.selectedItemContainer}>
            <Text style={styles.selectedItemTitle}>
              <Ionicons name="checkmark-done" size={18} color={colors.primary} /> 
              {' '}Fatia selecionada:
            </Text>
            <Text style={styles.selectedItemText}>{fatiaSelecionada?.Produto}</Text>
            {fatiaSelecionada?.acrecimo_valor && (
              <Text style={styles.selectedItemText}>
                Acréscimo: +R$ {parseFloat(fatiaSelecionada.acrecimo_valor).toFixed(2)}
              </Text>
            )}
          </View>
          
          <View style={styles.selectedItemContainer}>
            <Text style={styles.selectedItemTitle}>
              <Ionicons name="leaf" size={18} color={colors.primary} /> 
              {' '}Salada padrão incluída
            </Text>
          </View>
          
          <Text style={styles.stepTitle}>
            <Ionicons name="fast-food" size={24} color={colors.secondary} /> 
            {' '}Escolha seu acompanhamento
          </Text>
          <Text style={styles.stepDescription}>Selecione um acompanhamento para completar seu combo</Text>
          
          <FlatList
            data={acompanhamentos}
            renderItem={renderProdutoItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.productsList}
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Valor base do combo: R$ {VALOR_BASE_COMBO.toFixed(2)}</Text>
            {fatiaSelecionada?.acrecimo_valor && (
              <Text style={styles.totalText}>
                Acréscimo fatia: +R$ {parseFloat(fatiaSelecionada.acrecimo_valor).toFixed(2)}
              </Text>
            )}
            {acompanhamentoSelecionado?.acrecimo_valor && (
              <Text style={styles.totalText}>
                Acréscimo acompanhamento: +R$ {parseFloat(acompanhamentoSelecionado.acrecimo_valor).toFixed(2)}
              </Text>
            )}
            <Text style={styles.totalFinal}>Total: R$ {calcularValorTotal()}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleFinalizarCombo}
            disabled={!acompanhamentoSelecionado}
          >
            <Text style={styles.confirmButtonText}>
              <Ionicons name="cart" size={20} /> {' '}
              Adicionar ao carrinho
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando opções de combo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.contentContainer}>
        <Text style={styles.pageTitle}>
          <Ionicons name="ios-restaurant" size={28} color={colors.secondary} /> 
          {' '}Va de Combo!
        </Text>
        <Text style={styles.pageSubtitle}>Monte seu combo perfeito e economize!</Text>
        
        {renderCurrentStep()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2ecc71',
  },
  backButton: {
    padding: 5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLine: {
    height: 2,
    width: 50,
    backgroundColor: '#ccc',
  },
  progressText: {
    color: 'white',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  selectedItemContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  selectedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#666',
  },
  productsList: {
    paddingBottom: 20,
  },
  produtoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  produtoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  produtoPreco: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkIcon: {
    marginLeft: 10,
  },
  totalContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  totalFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginTop: 5,
  },
  confirmButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Vadecombo;