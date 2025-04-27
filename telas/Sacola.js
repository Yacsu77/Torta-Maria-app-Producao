import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getCurrentSection } from '../auth';
import { useIsFocused } from '@react-navigation/native';

const Sacola = ({ navigation }) => {
  const [produtos, setProdutos] = useState([]);
  const [promocoes, setPromocoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPontos, setTotalPontos] = useState(0);
  const isFocused = useIsFocused();

  const TAXA_ENTREGA = 15;

  useEffect(() => {
    if (isFocused) {
      carregarSacola();
      carregarPromocoes();
    }
  }, [isFocused]);

  const carregarSacola = async () => {
    try {
      setLoading(true);
      const secao = await getCurrentSection();
      setSectionInfo(secao);

      if (secao && secao.id) {
        const response = await fetch(`https://sivpt-betaapi.onrender.com/api/sacola/listar/itens/${secao.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const produtosAgrupados = agruparProdutos(data);
        setProdutos(produtosAgrupados);
        
        let soma = data.reduce((acc, item) => acc + parseFloat(item.preco_produto), 0);
        if (secao.tipo === '2') {
          soma += TAXA_ENTREGA;
        }
        setTotal(soma.toFixed(2));
      }
    } catch (error) {
      console.error('Erro ao carregar sacola:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPromocoes = async () => {
    try {
      const secao = await getCurrentSection();
      
      if (secao && secao.id) {
        const response = await fetch(`https://sivpt-betaapi.onrender.com/api/sacola/listar/pontos/${secao.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPromocoes(data);
        
        const somaPontos = data.reduce((acc, item) => acc + parseFloat(item.custo_pontos || 0), 0);
        setTotalPontos(somaPontos);
      }
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
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

  const deletarItem = async (id) => {
    try {
      const response = await fetch(`https://sivpt-betaapi.onrender.com/api/sacola/deletar/itens/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      carregarSacola();
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      Alert.alert('Erro', 'Não foi possível remover o item do carrinho');
    }
  };

  const deletarPromocao = async (id) => {
    try {
      const response = await fetch(`https://sivpt-betaapi.onrender.com/api/sacola/deletar/pontos/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      carregarPromocoes();
    } catch (error) {
      console.error('Erro ao deletar promoção:', error);
      Alert.alert('Erro', 'Não foi possível remover a promoção do carrinho');
    }
  };

  const adicionarItem = async (ID_secao, Produto) => {
    try {
      const response = await fetch('https://sivpt-betaapi.onrender.com/api/sacola/inseri/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ID_secao, Produto }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      carregarSacola();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar mais um item');
    }
  };

  const adicionarPromocao = async (ID_secao, Produto_pontos) => {
    try {
      const response = await fetch('https://sivpt-betaapi.onrender.com/api/sacola/inseri/pontos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ID_secao, Produto_pontos }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      carregarPromocoes();
    } catch (error) {
      console.error('Erro ao adicionar promoção:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a promoção');
    }
  };

  const renderizarItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image 
        source={{ uri: 'https://via.placeholder.com/100' }} 
        style={styles.imagemProduto} 
      />
      <View style={styles.infoContainer}>
        <Text style={styles.nomeProduto}>{item.nome_produto}</Text>
        <Text style={styles.descricaoProduto}>{item.descricao_produto}</Text>
        <Text style={styles.precoProduto}>R$ {parseFloat(item.preco_produto).toFixed(2)}</Text>
        
        <View style={styles.quantidadeContainer}>
          <TouchableOpacity 
            style={styles.botaoQuantidade} 
            onPress={() => deletarItem(item.ids[0])}
            disabled={item.quantidade <= 1}
          >
            <Text style={styles.textoBotaoQuantidade}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.textoQuantidade}>{item.quantidade}</Text>
          
          <TouchableOpacity 
            style={styles.botaoQuantidade} 
            onPress={() => adicionarItem(item.ID_secao, item.Produto)}
          >
            <Text style={styles.textoBotaoQuantidade}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.botaoRemover} 
        onPress={() => {
          item.ids.forEach(id => deletarItem(id));
        }}
      >
        <Text style={styles.textoBotaoRemover}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderizarPromocao = ({ item }) => (
    <View style={styles.promocaoContainer}>
      <Image 
        source={{ uri: 'https://via.placeholder.com/100' }} 
        style={styles.imagemPromocao} 
      />
      <View style={styles.infoPromocaoContainer}>
        <Text style={styles.nomePromocao}>{item.nome_Promocao}</Text>
        <Text style={styles.descricaoPromocao}>{item.descricao_promocao}</Text>
        <Text style={styles.pontosPromocao}>{item.custo_pontos} pontos</Text>
      </View>
     
      <TouchableOpacity 
        style={styles.botaoRemoverPromocao} 
        onPress={() => deletarPromocao(item.id)}
      >
        <Text style={styles.textoBotaoRemover}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const irParaPagamento = () => {
    navigation.navigate('CriarPedidos', { 
      total, 
      totalPontos,
      promocoes // Enviando também a lista de promoções para verificação
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Sua Sacola</Text>
      
      {produtos.length === 0 && promocoes.length === 0 ? (
        <Text style={styles.sacolaVazia}>Sua sacola está vazia</Text>
      ) : (
        <>
          {produtos.length > 0 && (
            <>
              <Text style={styles.subtitulo}>Produtos</Text>
              <FlatList
                data={produtos}
                renderItem={renderizarItem}
                keyExtractor={(item) => item.ids[0].toString()}
                contentContainerStyle={styles.lista}
              />
            </>
          )}

          {promocoes.length > 0 && (
            <>
              <Text style={styles.subtitulo}>Promoções</Text>
              <FlatList
                data={promocoes}
                renderItem={renderizarPromocao}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listaPromocoes}
              />
            </>
          )}
          
          <View style={styles.resumoContainer}>
            {sectionInfo?.tipo === '2' && (
              <View style={styles.linhaResumo}>
                <Text>Taxa de entrega:</Text>
                <Text>R$ {TAXA_ENTREGA.toFixed(2)}</Text>
              </View>
            )}
            
            {promocoes.length > 0 && (
              <View style={styles.linhaResumo}>
                <Text>Total de pontos:</Text>
                <Text>{totalPontos} pontos</Text>
              </View>
            )}
            
            <View style={[styles.linhaResumo, styles.totalLine]}>
              <Text style={styles.totalText}>Total:</Text>
              <Text style={styles.totalText}>R$ {total}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.botaoFinalizar} 
            onPress={irParaPagamento}
            disabled={produtos.length === 0 && promocoes.length === 0}
          >
            <Text style={styles.textoBotao}>Finalizar Compra</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  sacolaVazia: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 50,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  promocaoContainer: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  imagemProduto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  imagemPromocao: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
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
    color: '#4169e1',
  },
  descricaoProduto: {
    fontSize: 14,
    color: '#666',
  },
  descricaoPromocao: {
    fontSize: 14,
    color: '#4682b4',
  },
  precoProduto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e8b57',
  },
  pontosPromocao: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  botaoQuantidade: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
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
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoRemoverPromocao: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoRemover: {
    fontSize: 24,
    color: 'red',
  },
  lista: {
    paddingBottom: 20,
  },
  listaPromocoes: {
    paddingBottom: 20,
  },
  resumoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
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
    backgroundColor: '#2e8b57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotao: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Sacola;