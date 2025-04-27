import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator  // Adicionei esta importação
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import axios from 'axios';

const DetalheProduto = ({ route, navigation }) => {
  const { produto } = route.params;
  const [produtosRelacionados, setProdutosRelacionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idSecao, setIdSecao] = useState(null);

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
        <View style={styles.imagemContainer}>
          <Image 
            source={{ uri: produto.URL_image }} 
            style={styles.produtoImagem}
            resizeMode="contain"
          />
        </View>
        
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
            <Text style={styles.addButtonText}>Adicionar à Sacola</Text>
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
          <Text style={[styles.relacionadosTitle, { color: colors.text }]}>Você também pode gostar</Text>
          
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
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemContainer: {
    height: 300,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
  },
  produtoImagem: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  produtoNome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  produtoPreco: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  caracteristicaItem: {
    flexDirection: 'row',
    marginBottom: 5,
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
    padding: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  relacionadosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  relacionadosList: {
    paddingBottom: 10,
  },
  produtoRelacionadoCard: {
    width: 150,
    marginRight: 15,
  },
  produtoRelacionadoImagem: {
    width: 150,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
  },
  produtoRelacionadoNome: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    color: '#333',
  },
  produtoRelacionadoPreco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginTop: 5,
  },
});

export default DetalheProduto;