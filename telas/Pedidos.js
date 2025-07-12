import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import moment from 'moment';
import { getUserData } from '../auth'; 

const ListaPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clienteCpf, setClienteCpf] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const userData = await getUserData();
        
        if (!userData || !userData.CPF) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        setClienteCpf(userData.CPF);
        await fetchPedidos(userData.CPF);
      } catch (err) {
        setError('Erro ao carregar dados do usuário');
        setLoading(false);
        console.error('Erro:', err);
      }
    };

    if (isFocused) {
      carregarDados();
    }
  }, [isFocused]);

  const fetchPedidos = async (cpf) => {
    try {
      setLoading(true);
      const response = await fetch(`https://sivpt-api-v2.onrender.com/api/pedido/listar/cliente/${cpf}`);      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      // Ensure Valor_pedido is treated as a number
      const formattedData = data.map(item => ({
        ...item,
        Valor_pedido: parseFloat(item.Valor_pedido) || 0
      }));
      setPedidos(formattedData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar pedidos. Tente novamente mais tarde.');
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    try {
      setLoading(true);
      
      if (!pedidoId) {
        throw new Error('ID do pedido não fornecido');
      }

      const response = await fetch(`https://sivpt-api-v2.onrender.com/api/pedido/atualizar-situacao/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          novaSituacao: '0' // Ou 0 sem aspas, dependendo do que o backend espera
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.erro || responseData.message || `Erro HTTP: ${response.status}`);
      }

      await fetchPedidos(clienteCpf);
      Alert.alert('Sucesso', responseData.mensagem || 'Pedido cancelado com sucesso!');
      
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      Alert.alert('Erro', err.message || 'Falha ao cancelar pedido');
    } finally {
      setLoading(false);
    }
  };

  const confirmarCancelamento = (pedidoId) => {
    Alert.alert(
      'Confirmar Cancelamento',
      'Tem certeza que deseja cancelar este pedido?',
      [
        {
          text: 'Não',
          style: 'cancel'
        },
        {
          text: 'Sim',
          onPress: () => cancelarPedido(pedidoId)
        }
      ]
    );
  };

  const renderSituacao = (situacaoId) => {
    switch(situacaoId) {
      case 0: 
        return { texto: 'Cancelado', cor: '#ff3b30' };
      case 1: 
        return { texto: 'Aguardando Pagamento', cor: '#ff9500' };
      case 2: 
        return { texto: 'Aguardando Aceitação', cor: '#007aff' };
      case 3: 
        return { texto: 'Pronto para Envio', cor: '#34c759' };
      default:
        return { texto: 'Status Desconhecido', cor: '#8e8e93' };
    }
  };

  const handlePedidoPress = (pedido) => {
    if (pedido.Situacao === 1) {
      navigation.navigate('Pagamento', { 
        pedidoId: pedido.id_secao,  // Alterado de id para id_secao
        valor: pedido.Valor_pedido 
      });
    }
  };

  const renderItem = ({ item }) => {
    const situacao = renderSituacao(item.Situacao);
    const dataFormatada = moment(item.Data_pedido).format('DD/MM/YYYY');
    const valorFormatado = parseFloat(item.Valor_pedido || 0).toFixed(2);
    
    return (
      <TouchableOpacity 
        style={[styles.pedidoContainer, { opacity: item.Situacao === 0 ? 0.6 : 1 }]}
        onPress={() => handlePedidoPress(item)}
        disabled={item.Situacao !== 1}
      >
        <View style={styles.pedidoHeader}>
          <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
          <Text style={[styles.situacao, { color: situacao.cor }]}>
            {situacao.texto}
          </Text>
        </View>
        
        <Text style={styles.pedidoData}>Data: {dataFormatada} às {item.Hora_Pedido}</Text>
        <Text style={styles.pedidoValor}>Valor: R$ {valorFormatado}</Text>
        <Text style={styles.pedidoItens}>Itens: {item.total_itens || 0}</Text>
        
        {item.Situacao === 1 && (
          <View style={styles.botoesContainer}>
            <TouchableOpacity 
              style={[styles.botaoAcao, styles.botaoPagar]}
              onPress={() => navigation.navigate('Pagamento', { 
                pedidoId: item.id_secao,  // Alterado de id para id_secao
                valor: parseFloat(item.Valor_pedido || 0)
              })}
            >
              <Text style={styles.botaoTexto}>Pagar Agora</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.botaoAcao, styles.botaoCancelar]}
              onPress={() => confirmarCancelamento(item.id)}
            >
              <Text style={styles.botaoTexto}>Cancelar Pedido</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.botaoRecarregar}
          onPress={() => clienteCpf ? fetchPedidos(clienteCpf) : navigation.goBack()}
        >
          <Text style={styles.botaoRecarregarTexto}>
            {clienteCpf ? 'Tentar novamente' : 'Voltar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Meus Pedidos</Text>
      
      {pedidos.length === 0 ? (
        <Text style={styles.semPedidos}>Você não possui pedidos</Text>
      ) : (
        <FlatList
          data={pedidos}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.lista}
          refreshing={loading}
          onRefresh={() => clienteCpf && fetchPedidos(clienteCpf)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  lista: {
    paddingBottom: 20,
  },
  pedidoContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  situacao: {
    fontSize: 16,
    fontWeight: '500',
  },
  pedidoData: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pedidoValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pedidoItens: {
    fontSize: 14,
    color: '#666',
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  botaoAcao: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  botaoPagar: {
    backgroundColor: '#007aff',
  },
  botaoCancelar: {
    backgroundColor: '#ff3b30',
  },
  botaoTexto: {
    color: 'white',
    fontWeight: 'bold',
  },
  semPedidos: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  botaoRecarregar: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007aff',
    borderRadius: 5,
  },
  botaoRecarregarTexto: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default ListaPedidos;