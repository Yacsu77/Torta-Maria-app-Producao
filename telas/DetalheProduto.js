import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const DetalheProduto = ({ route, navigation }) => {
  const { produto } = route.params;
  const [produtosRelacionados, setProdutosRelacionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idSecao, setIdSecao] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));

  // Cores padrão
  const colors = {
    primary: '#2ecc71', // Verde
    secondary: '#e67e22', // Laranja
    background: '#f9f9f9',
    text: '#333',
    textLight: '#777',
    white: '#fff',
    border: '#e0e0e0'
  };

  useEffect(() => {
    // Carrega produtos aleatórios/relacionados
    const carregarProdutosRelacionados = async () => {
      try {
        const response = await axios.get('https://sivpt-betaapi.onrender.com/api/produtos/Produtos/Listar');
        // Filtra o produto atual e pega 4 aleatórios
        const filtrados = response.data.filter(p => p.id !== produto.id);
        const aleatorios = filtrados.sort(() => 0.5 - Math.random()).slice(0, 4);
        setProdutosRelacionados(aleatorios);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar produtos relacionados:', error);
        setLoading(false);
      }
    };

    carregarProdutosRelacionados();
  }, [produto.id]);

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

  const adicionarAoCarrinho = async () => {
    const secaoAberta = await verificarSecaoAberta();
    
    if (!secaoAberta) {
      alert('Nenhuma seção aberta. Por favor, abra uma seção primeiro.');
      return;
    }

    try {
      await axios.post('https://sivpt-betaapi.onrender.com/api/sacola/inseri/item', {
        ID_secao: idSecao,
        Produto: produto.id
      });
      alert('Produto adicionado à sacola com sucesso!');
      navigation.goBack();
    } catch (err) {
      console.error('Erro ao adicionar ao carrinho:', err);
      alert('Erro ao adicionar produto à sacola.');
    }
  };

  const formatarPreco = (preco) => {
    const numero = parseFloat(preco);
    return isNaN(numero) ? 'Preço indisponível' : `R$ ${numero.toFixed(2)}`;
  };

  const handleImagePress = () => {
    setModalVisible(true);
  };

  const zoomIn = () => {
    Animated.timing(scaleValue, {
      toValue: 1.5,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  const zoomOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  const renderProdutoRelacionado = ({ item }) => (
    <TouchableOpacity 
      style={styles.produtoRelacionadoCard}
      onPress={() => navigation.replace('DetalheProduto', { produto: item })}
    >
      <Image 
        source={{ uri: item.URL_image }} 
        style={styles.produtoRelacionadoImagem}
        resizeMode="contain"
      />
      <Text style={styles.produtoRelacionadoNome} numberOfLines={1}>{item.nome_produto}</Text>
      <Text style={styles.produtoRelacionadoPreco}>{formatarPreco(item.preco_produto)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com botão de fechar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Imagem do produto */}
        <TouchableOpacity 
          style={styles.imagemContainer}
          activeOpacity={0.9}
          onPress={handleImagePress}
        >
          <Image 
            source={{ uri: produto.URL_image }} 
            style={styles.produtoImagem}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        {/* Informações do produto */}
        <View style={[styles.infoContainer, { backgroundColor: colors.white }]}>
          <Text style={[styles.produtoNome, { color: colors.text }]}>{produto.nome_produto}</Text>
          <Text style={[styles.produtoPreco, { color: colors.primary }]}>
            {formatarPreco(produto.preco_produto)}
          </Text>
          
          {/* Botão de adicionar ao carrinho */}
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.secondary }]}
            onPress={adicionarAoCarrinho}
          >
            <LinearGradient
              colors={[colors.secondary, '#f39c12']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.addButtonText}>Adicionar à Sacola</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Descrição */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Descrição</Text>
            <Text style={[styles.sectionContent, { color: colors.textLight }]}>
              {produto.descricao_produto || 'Nenhuma descrição disponível.'}
            </Text>
          </View>
          
          {/* Características */}
          {produto.caracteristicas && Object.keys(produto.caracteristicas).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Características</Text>
              {Object.entries(produto.caracteristicas).map(([key, value]) => (
                <View key={key} style={styles.caracteristicaItem}>
                  <Text style={[styles.caracteristicaKey, { color: colors.text }]}>{key}:</Text>
                  <Text style={[styles.caracteristicaValue, { color: colors.textLight }]}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Produtos relacionados */}
        <View style={[styles.relacionadosContainer, { backgroundColor: colors.white }]}>
          <Text style={[styles.relacionadosTitle, { color: colors.secondary }]}>Você também pode gostar</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <FlatList
              horizontal
              data={produtosRelacionados}
              renderItem={renderProdutoRelacionado}
              keyExtractor={item => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relacionadosList}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal para zoom na imagem */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={32} color={colors.white} />
          </TouchableOpacity>
          
          <ScrollView 
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentContainerStyle={styles.modalScrollContent}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPressIn={zoomIn}
              onPressOut={zoomOut}
            >
              <Animated.Image
                source={{ uri: produto.URL_image }}
                style={[styles.modalImage, { transform: [{ scale: scaleValue }] }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 1,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imagemContainer: {
    height: 350,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Fundo totalmente branco
  },
  produtoImagem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff', // Fundo totalmente branco
  },
  infoContainer: {
    padding: 25,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  produtoNome: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  produtoPreco: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addButton: {
    borderRadius: 12,
    marginVertical: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  caracteristicaItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  caracteristicaKey: {
    fontWeight: 'bold',
    marginRight: 5,
    width: 120,
  },
  caracteristicaValue: {
    flex: 1,
  },
  relacionadosContainer: {
    padding: 25,
    marginTop: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  relacionadosTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  relacionadosList: {
    paddingBottom: 10,
  },
  produtoRelacionadoCard: {
    width: 160,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  produtoRelacionadoImagem: {
    width: 160,
    height: 140,
    backgroundColor: '#fff',
  },
  produtoRelacionadoNome: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    color: '#333',
    paddingHorizontal: 8,
  },
  produtoRelacionadoPreco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginTop: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: height * 0.8,
    backgroundColor: '#fff',
  },
});

export default DetalheProduto;