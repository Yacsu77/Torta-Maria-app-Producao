import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import { useIsFocused } from '@react-navigation/native';
import axios from 'axios';

const Sacola = ({ navigation }) => {
  const [produtos, setProdutos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPontos, setTotalPontos] = useState(0);
  const isFocused = useIsFocused();

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

  const TAXA_ENTREGA = 15;
  const VALOR_BASE_COMBO = 53.00;

  useEffect(() => {
    if (isFocused) {
      carregarSacola();
    }
  }, [isFocused]);

  const carregarSacola = async () => {
    try {
      setLoading(true);
      const secao = await getCurrentSection();
      setSectionInfo(secao);

      if (secao && secao.id) {
        // Carrega produtos normais
        const responseProdutos = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/itens/${secao.id}`);
        const produtosAgrupados = agruparProdutos(responseProdutos.data);
        setProdutos(produtosAgrupados);

        // Carrega combos
        const responseCombos = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/combos/${secao.id}`);
        setCombos(responseCombos.data);

        // Carrega promoções
        const responsePromocoes = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/pontos/${secao.id}`);
        setPromocoes(responsePromocoes.data);
        
        // Calcula totais
        calcularTotais(produtosAgrupados, responseCombos.data, responsePromocoes.data, secao.tipo);
      }
    } catch (error) {
      console.error('Erro ao carregar sacola:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens da sacola');
    } finally {
      setLoading(false);
    }
  };

  const agruparProdutos = (produtos) => {
    const agrupados = {};
    
    produtos.forEach(produto => {
      const key = `${produto.ID_secao}_${produto.Produto}`;
      if (agrupados[key]) {
        agrupados[key].quantidade += 1;
        agrupados[key].ids.push(produto.id);
      } else {
        agrupados[key] = {
          ...produto,
          quantidade: 1,
          ids: [produto.id]
        };
      }
    });
    
    return Object.values(agrupados);
  };

  const calcularTotais = (produtos, combos, promocoes, tipoSecao) => {
    // Soma dos produtos normais
    let somaProdutos = produtos.reduce((acc, item) => acc + parseFloat(item.preco_produto) * item.quantidade, 0);
    
    // Soma dos combos (valor base + acréscimos)
    let somaCombos = combos.reduce((acc, combo) => {
      let valorCombo = VALOR_BASE_COMBO;
      if (combo.primeiro_produto_acrescimo) valorCombo += parseFloat(combo.primeiro_produto_acrescimo);
      if (combo.segundo_produto_acrescimo) valorCombo += parseFloat(combo.segundo_produto_acrescimo);
      return acc + valorCombo;
    }, 0);
    
    // Taxa de entrega se for delivery
    if (tipoSecao === '2') {
      somaProdutos += TAXA_ENTREGA;
      somaCombos += TAXA_ENTREGA;
    }
    
    // Soma dos pontos das promoções
    const somaPontos = promocoes.reduce((acc, item) => acc + parseFloat(item.custo_pontos || 0), 0);
    
    setTotal((somaProdutos + somaCombos).toFixed(2));
    setTotalPontos(somaPontos);
  };

  const deletarItem = async (id) => {
    try {
      await axios.delete(`https://sivpt-betaapi.onrender.com/api/sacola/deletar/itens/${id}`);
      carregarSacola();
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      Alert.alert('Erro', 'Não foi possível remover o item do carrinho');
    }
  };

  const deletarCombo = async (id) => {
    try {
      await axios.delete(`https://sivpt-betaapi.onrender.com/api/sacola/deletar/combo${id}`);
      carregarSacola();
    } catch (error) {
      console.error('Erro ao deletar combo:', error);
      Alert.alert('Erro', 'Não foi possível remover o combo do carrinho');
    }
  };

  const deletarPromocao = async (id) => {
    try {
      await axios.delete(`https://sivpt-betaapi.onrender.com/api/sacola/deletar/pontos/${id}`);
      carregarSacola();
    } catch (error) {
      console.error('Erro ao deletar promoção:', error);
      Alert.alert('Erro', 'Não foi possível remover a promoção do carrinho');
    }
  };

  const adicionarItem = async (ID_secao, Produto) => {
    try {
      await axios.post('https://sivpt-betaapi.onrender.com/api/sacola/inseri/item', { ID_secao, Produto });
      carregarSacola();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar mais um item');
    }
  };

  const adicionarPromocao = async (ID_secao, Produto_pontos) => {
    try {
      await axios.post('https://sivpt-betaapi.onrender.com/api/sacola/inseri/pontos', { ID_secao, Produto_pontos });
      carregarSacola();
    } catch (error) {
      console.error('Erro ao adicionar promoção:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a promoção');
    }
  };

  const renderizarItem = ({ item }) => (
    <View style={[styles.itemContainer, { backgroundColor: colors.white }]}>
      <Image 
        source={{ uri: item.URL_image || 'https://via.placeholder.com/100' }} 
        style={styles.imagemProduto} 
      />
      <View style={styles.infoContainer}>
        <Text style={[styles.nomeProduto, { color: colors.text }]}>{item.nome_produto}</Text>
        <Text style={[styles.descricaoProduto, { color: colors.textLight }]}>{item.descricao_produto}</Text>
        <Text style={[styles.precoProduto, { color: colors.primary }]}>
          R$ {parseFloat(item.preco_produto).toFixed(2)}
        </Text>
        
        <View style={styles.quantidadeContainer}>
          <TouchableOpacity 
            style={[styles.botaoQuantidade, { backgroundColor: colors.border }]} 
            onPress={() => deletarItem(item.ids[0])}
            disabled={item.quantidade <= 1}
          >
            <Text style={styles.textoBotaoQuantidade}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.textoQuantidade}>{item.quantidade}</Text>
          
          <TouchableOpacity 
            style={[styles.botaoQuantidade, { backgroundColor: colors.primary }]} 
            onPress={() => adicionarItem(item.ID_secao, item.Produto)}
          >
            <Text style={[styles.textoBotaoQuantidade, { color: colors.white }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.botaoRemover} 
        onPress={() => item.ids.forEach(id => deletarItem(id))}
      >
        <Ionicons name="trash-outline" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  const renderizarCombo = ({ item }) => {
    const valorCombo = VALOR_BASE_COMBO + 
      (item.primeiro_produto_acrescimo ? parseFloat(item.primeiro_produto_acrescimo) : 0) + 
      (item.segundo_produto_acrescimo ? parseFloat(item.segundo_produto_acrescimo) : 0);

    return (
      <View style={[styles.comboContainer, { backgroundColor: colors.white }]}>
        <View style={styles.comboHeader}>
          <Ionicons name="ios-restaurant" size={24} color={colors.secondary} />
          <Text style={[styles.comboTitle, { color: colors.secondary }]}>Combo</Text>
          <Text style={[styles.comboPrice, { color: colors.primary }]}>
            R$ {valorCombo.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.comboItem}>
          <Image 
            source={{ uri: item.primeiro_produto_imagem || 'https://via.placeholder.com/60' }} 
            style={styles.comboImage} 
          />
          <View style={styles.comboItemInfo}>
            <Text style={[styles.comboItemName, { color: colors.text }]}>{item.primeiro_produto_nome}</Text>
            {item.primeiro_produto_acrescimo && (
              <Text style={[styles.comboItemExtra, { color: colors.textLight }]}>
                +R$ {parseFloat(item.primeiro_produto_acrescimo).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.comboItem}>
          <Image 
            source={{ uri: item.segundo_produto_imagem || 'https://via.placeholder.com/60' }} 
            style={styles.comboImage} 
          />
          <View style={styles.comboItemInfo}>
            <Text style={[styles.comboItemName, { color: colors.text }]}>{item.segundo_produto_nome}</Text>
            {item.segundo_produto_acrescimo && (
              <Text style={[styles.comboItemExtra, { color: colors.textLight }]}>
                +R$ {parseFloat(item.segundo_produto_acrescimo).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.comboItem}>
          <Ionicons name="leaf" size={24} color={colors.primary} style={styles.comboIcon} />
          <View style={styles.comboItemInfo}>
            <Text style={[styles.comboItemName, { color: colors.text }]}>Salada padrão</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.botaoRemoverCombo, { backgroundColor: colors.error }]}
          onPress={() => deletarCombo(item.Id)}
        >
          <Text style={[styles.textoBotaoRemover, { color: colors.white }]}>
            Remover Combo
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderizarPromocao = ({ item }) => (
    <View style={[styles.promocaoContainer, { backgroundColor: colors.white }]}>
      <Image 
        source={{ uri: item.URL_image || 'https://via.placeholder.com/100' }} 
        style={styles.imagemPromocao} 
      />
      <View style={styles.infoPromocaoContainer}>
        <Text style={[styles.nomePromocao, { color: colors.secondary }]}>{item.nome_Promocao}</Text>
        <Text style={[styles.descricaoPromocao, { color: colors.textLight }]}>{item.descricao_promocao}</Text>
        <Text style={[styles.pontosPromocao, { color: colors.primary }]}>{item.custo_pontos} pontos</Text>
      </View>
     
      <TouchableOpacity 
        style={styles.botaoRemover} 
        onPress={() => deletarPromocao(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  const irParaPagamento = () => {
    navigation.navigate('CriarPedidos', { 
      total, 
      totalPontos,
      promocoes,
      combos
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando sua sacola...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.titulo, { color: colors.text }]}>
          <Ionicons name="cart" size={24} /> Sua Sacola
        </Text>
        
        {produtos.length === 0 && combos.length === 0 && promocoes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={60} color={colors.textLight} />
            <Text style={[styles.sacolaVazia, { color: colors.text }]}>Sua sacola está vazia</Text>
          </View>
        ) : (
          <>
            {combos.length > 0 && (
              <>
                <Text style={[styles.subtitulo, { color: colors.text }]}>Combos</Text>
                <FlatList
                  data={combos}
                  renderItem={renderizarCombo}
                  keyExtractor={(item) => item.Id.toString()}
                  scrollEnabled={false}
                />
              </>
            )}

            {produtos.length > 0 && (
              <>
                <Text style={[styles.subtitulo, { color: colors.text }]}>Produtos</Text>
                <FlatList
                  data={produtos}
                  renderItem={renderizarItem}
                  keyExtractor={(item) => item.ids[0].toString()}
                  scrollEnabled={false}
                />
              </>
            )}

            {promocoes.length > 0 && (
              <>
                <Text style={[styles.subtitulo, { color: colors.text }]}>Promoções</Text>
                <FlatList
                  data={promocoes}
                  renderItem={renderizarPromocao}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              </>
            )}
            
            <View style={[styles.resumoContainer, { backgroundColor: colors.white }]}>
              {sectionInfo?.tipo === '2' && (
                <View style={styles.linhaResumo}>
                  <Text style={{ color: colors.text }}>Taxa de entrega:</Text>
                  <Text style={{ color: colors.text }}>R$ {TAXA_ENTREGA.toFixed(2)}</Text>
                </View>
              )}
              
              {promocoes.length > 0 && (
                <View style={styles.linhaResumo}>
                  <Text style={{ color: colors.text }}>Total de pontos:</Text>
                  <Text style={{ color: colors.primary }}>{totalPontos} pontos</Text>
                </View>
              )}
              
              <View style={[styles.linhaResumo, styles.totalLine]}>
                <Text style={[styles.totalText, { color: colors.text }]}>Total:</Text>
                <Text style={[styles.totalText, { color: colors.primary }]}>R$ {total}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      
      {(produtos.length > 0 || combos.length > 0) && (
        <TouchableOpacity 
          style={[styles.botaoFinalizar, { backgroundColor: colors.primary }]} 
          onPress={irParaPagamento}
        >
          <Text style={[styles.textoBotao, { color: colors.white }]}>
            <Ionicons name="card" size={20} /> Finalizar Compra
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  sacolaVazia: {
    fontSize: 18,
    marginTop: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comboContainer: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comboHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  comboTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  comboPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  comboItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  comboImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  comboIcon: {
    width: 60,
    height: 60,
    marginRight: 10,
    textAlign: 'center',
    lineHeight: 60,
  },
  comboItemInfo: {
    flex: 1,
  },
  comboItemName: {
    fontSize: 16,
  },
  comboItemExtra: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  promocaoContainer: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagemProduto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  imagemPromocao: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  infoPromocaoContainer: {
    flex: 1,
  },
  nomeProduto: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nomePromocao: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descricaoProduto: {
    fontSize: 14,
  },
  descricaoPromocao: {
    fontSize: 14,
  },
  precoProduto: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pontosPromocao: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  botaoQuantidade: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  textoBotaoQuantidade: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textoQuantidade: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  botaoRemover: {
    padding: 5,
  },
  botaoRemoverCombo: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotaoRemover: {
    fontWeight: 'bold',
  },
  resumoContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  linhaResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
    marginTop: 5,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  botaoFinalizar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  textoBotao: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Sacola;