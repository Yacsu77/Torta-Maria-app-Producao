import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions 
} from 'react-native';
import { getCurrentSection } from '../auth';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const formatarPreco = (preco) => {
  const numero = parseFloat(preco);
  return isNaN(numero) ? 'Preço indisponível' : `R$ ${numero.toFixed(2)}`;
};

const Produtos = ({ route, navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [idSecao, setIdSecao] = useState(null);
  const [lojaSelecionada, setLojaSelecionada] = useState(route.params?.loja || null);
  const [refreshing, setRefreshing] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);

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

  // Atualiza quando a loja selecionada muda
  useEffect(() => {
    setLojaSelecionada(route.params?.loja || null);
  }, [route.params]);

  // Carrega os dados quando a tela recebe foco ou quando a loja muda
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', carregarDados);
    return unsubscribe;
  }, [navigation, lojaSelecionada]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      const secao = await getCurrentSection();
      if (secao) setIdSecao(secao.id);

      if (lojaSelecionada) {
        // Busca APENAS produtos em estoque na loja selecionada
        const response = await axios.get(`https://sivpt-betaapi.onrender.com/api/produtos/Estoque/Listar/${lojaSelecionada.cnpj}`);
        
        if (response.data.produtos && response.data.produtos.length > 0) {
          // Converte para a estrutura de dados esperada
          const produtosFormatados = response.data.produtos.map(p => ({
            id: p.id,
            nome_produto: p.nome,
            descricao_produto: p.descricao,
            preco_produto: p.preco,
            URL_image: p.imagem,
            categoria_id: p.categoria
          }));
          
          setProdutos(produtosFormatados);
          
          // Busca apenas categorias dos produtos em estoque
          const categoriasResponse = await axios.get('https://sivpt-betaapi.onrender.com/api/produtos/Categiria/Listar');
          const categoriasIds = [...new Set(produtosFormatados.map(p => p.categoria_id))];
          setCategorias(categoriasResponse.data.filter(c => categoriasIds.includes(c.id)));
        } else {
          setProdutos([]);
          setCategorias([]);
        }
      } else {
        // Modo sem loja selecionada - lista todos os produtos
        const [responseCategorias, responseProdutos] = await Promise.all([
          axios.get('https://sivpt-betaapi.onrender.com/api/produtos/Categiria/Listar'),
          axios.get('https://sivpt-betaapi.onrender.com/api/produtos/Produtos/Listar')
        ]);
        setCategorias(responseCategorias.data);
        setProdutos(responseProdutos.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar produtos. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtra produtos por categoria e pesquisa
  useEffect(() => {
    const filtered = produtos.filter(produto => {
      const matchesCategory = categoriaSelecionada ? produto.categoria_id === categoriaSelecionada : true;
      const matchesSearch = produto.nome_produto.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          produto.descricao_produto.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    setProdutosFiltrados(filtered);
  }, [produtos, categoriaSelecionada, searchQuery]);

  // Agrupa produtos por categoria
  const produtosPorCategoria = produtosFiltrados.reduce((acc, produto) => {
    const categoria = categorias.find(cat => cat.id === produto.categoria_id);
    const categoriaNome = categoria ? categoria.Categoria : 'Outros';
    
    if (!acc[categoriaNome]) acc[categoriaNome] = [];
    acc[categoriaNome].push(produto);
    return acc;
  }, {});

  const verificarSecaoAberta = async () => {
    try {
      const secao = await getCurrentSection();
      if (secao) {
        setIdSecao(secao.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao verificar seção:', err);
      return false;
    }
  };

  const adicionarAoCarrinho = async (produtoId) => {
    const secaoAberta = await verificarSecaoAberta();
    
    if (!secaoAberta) {
      // Abre a tela de abrir seção como modal
      navigation.navigate('AbrirSeçãoModal');
      return;
    }

    try {
      await axios.post('https://sivpt-betaapi.onrender.com/api/sacola/inseri/item', {
        ID_secao: idSecao,
        Produto: produtoId
      });
      alert('Produto adicionado à sacola com sucesso!');
    } catch (err) {
      console.error('Erro ao adicionar ao carrinho:', err);
      alert('Erro ao adicionar produto à sacola.');
    }
  };

  const abrirDetalhesProduto = (produto) => {
    navigation.navigate('DetalheProduto', { produto });
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const renderBannerCombo = () => {
    return (
      <View style={styles.bannerComboWrapper}>
        <TouchableOpacity 
          style={styles.bannerComboContainer}
          onPress={() => navigation.navigate('Vadecombo')}
        >
          <View style={styles.borderAnimation} />
          <Image 
            source={{ uri: 'https://yacsu77.blob.core.windows.net/promos/Prancheta 1.png' }} 
            style={styles.bannerComboImage}
            resizeMode="contain"
          />
          <Text style={styles.comboText}>Monte o seu combo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={carregarDados}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/fundo.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {lojaSelecionada && (
        <View style={[styles.lojaInfo, { backgroundColor: colors.primary }]}>
          <Text style={styles.lojaNome}>{lojaSelecionada.nome}</Text>
          <Text style={styles.lojaCnpj}>CNPJ: {lojaSelecionada.cnpj}</Text>
          <Text style={styles.lojaStatus}>
            {produtos.length > 0 
              ? `Produtos em estoque: ${produtos.length}` 
              : 'Nenhum produto em estoque'}
          </Text>
        </View>
      )}

      <TextInput
        style={[styles.searchBar, { 
          backgroundColor: colors.white, 
          borderColor: colors.border 
        }]}
        placeholder="Pesquisar produtos..."
        placeholderTextColor={colors.textLight}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.categoriasContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoriaItem, 
              !categoriaSelecionada && { backgroundColor: colors.primary }
            ]}
            onPress={() => setCategoriaSelecionada(null)}
          >
            <Text style={[
              styles.categoriaTexto, 
              !categoriaSelecionada && { color: colors.white }
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          
          {categorias.map(categoria => (
            <TouchableOpacity
              key={categoria.id}
              style={[
                styles.categoriaItem, 
                categoriaSelecionada === categoria.id && { backgroundColor: colors.primary }
              ]}
              onPress={() => setCategoriaSelecionada(categoria.id)}
            >
              <Text style={[
                styles.categoriaTexto, 
                categoriaSelecionada === categoria.id && { color: colors.white }
              ]}>
                {categoria.Categoria}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={Object.entries(produtosPorCategoria)}
        keyExtractor={([categoria]) => categoria}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item: [categoria, produtosDaCategoria] }) => (
          <View style={styles.categoriaSection}>
            <Text style={[styles.categoriaTitulo, { color: colors.primary }]}>{categoria}</Text>
            
            {/* Renderiza o banner de combo apenas na primeira categoria e quando nenhuma categoria está selecionada */}
            {categoriaSelecionada === null && categoria === Object.keys(produtosPorCategoria)[0] && renderBannerCombo()}
            
            {produtosDaCategoria.map(produto => (
              <TouchableOpacity
                key={produto.id}
                onPress={() => abrirDetalhesProduto(produto)}
              >
                <View style={[
                  styles.produtoCard, 
                  { 
                    backgroundColor: colors.white,
                    shadowColor: colors.text,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.secondary
                  }
                ]}>
                  <Image 
                    source={{ uri: produto.URL_image }} 
                    style={styles.produtoImagem}
                    resizeMode="cover"
                  />
                  <View style={styles.produtoInfo}>
                    <Text style={[styles.produtoNome, { color: colors.text }]}>{produto.nome_produto}</Text>
                    <Text style={[styles.produtoDescricao, { color: colors.textLight }]}>{produto.descricao_produto}</Text>
                    <Text style={[styles.produtoPreco, { color: colors.primary }]}>{formatarPreco(produto.preco_produto)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.adicionarButton, { backgroundColor: colors.secondary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      adicionarAoCarrinho(produto.id);
                    }}
                  >
                    <Text style={styles.adicionarButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {searchQuery 
                ? 'Nenhum produto encontrado com essa pesquisa.' 
                : lojaSelecionada 
                  ? 'Nenhum produto disponível em estoque nesta loja.' 
                  : 'Nenhum produto disponível.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  lojaInfo: {
    padding: 15,
    borderRadius: 8,
    margin: 10,
    marginBottom: 10,
  },
  lojaNome: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lojaCnpj: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 5,
  },
  lojaStatus: {
    color: '#fff',
    fontSize: 14,
    fontStyle: 'italic',
  },
  searchBar: {
    borderRadius: 8,
    padding: 12,
    margin: 10,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  categoriasContainer: {
    height: 50,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  categoriaItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  categoriaTexto: {
    fontWeight: '500',
  },
  categoriaSection: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  categoriaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 10,
  },
  bannerComboWrapper: {
    margin: 10,
    marginBottom: 15,
    position: 'relative',
  },
  bannerComboContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  borderAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e67e22',
    zIndex: 1,
    borderRadius: 12,
  },
  bannerComboImage: {
    width: '100%',
    height: 180,
    marginTop: 4,
  },
  comboText: {
    color: '#e67e22',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  produtoCard: {
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  produtoImagem: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 10,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  produtoDescricao: {
    fontSize: 14,
    marginBottom: 5,
  },
  produtoPreco: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  adicionarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adicionarButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Produtos;