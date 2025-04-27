import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserData } from '../auth';

const TelaTrocaPontos = ({ navigation }) => {
  const [pontos, setPontos] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCPF, setUserCPF] = useState(null);

  // Função principal para carregar os dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obter dados do usuário
      const userData = await getUserData();
      console.log('Dados do usuário:', userData); // Debug
      
      if (!userData || !userData.CPF) { // Note que mudei para userData.CPF (maiúsculo)
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      setUserCPF(userData.CPF);

      // 2. Consultar pontos do usuário
      const pontosResponse = await fetch(`https://sivpt-betaapi.onrender.com/api/pontos/pontos/consultar/${userData.CPF}`);
      
      if (!pontosResponse.ok) {
        throw new Error('Falha ao carregar pontos');
      }
      
      const pontosData = await pontosResponse.json();
      setPontos(pontosData.pontos || 0);

      // 3. Carregar categorias e produtos em paralelo
      const [categoriasResponse, produtosResponse] = await Promise.all([
        fetch('https://sivpt-betaapi.onrender.com/api/pontos/Categoria/Listar'),
        fetch('https://sivpt-betaapi.onrender.com/api/pontos/prontos/Listar')
      ]);

      if (!categoriasResponse.ok || !produtosResponse.ok) {
        throw new Error('Falha ao carregar categorias ou produtos');
      }

      const [categoriasData, produtosData] = await Promise.all([
        categoriasResponse.json(),
        produtosResponse.json()
      ]);

      setCategorias(categoriasData);
      setProdutos(produtosData);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
      
      // Se for erro de autenticação, sugerir fazer login novamente
      if (err.message.includes('autenticado')) {
        setError(`${err.message} (Código: 401)`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Carrega os dados quando o componente monta
  useEffect(() => {
    loadData();
  }, []);

  const produtosPorCategoria = (categoriaId) => {
    return produtos.filter(produto => produto.categoria_id === categoriaId);
  };

  const renderItem = ({ item: categoria }) => (
    <View style={styles.categoriaContainer}>
      <Text style={styles.categoriaTitulo}>{categoria.Categoria}</Text>
      <FlatList
        data={produtosPorCategoria(categoria.id)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item: produto }) => (
          <TouchableOpacity 
            style={styles.produtoItem}
            onPress={() => navigation.navigate('DetalhesProntos', { produto })}
          >
            <Image 
              source={{ uri: produto.URL_imagem }} 
              style={styles.produtoImagem} 
              resizeMode="contain"
            />
            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome}>{produto.nome_Promocao}</Text>
              <Text style={styles.produtoDescricao} numberOfLines={2}>{produto.descricao_promocao}</Text>
              <Text style={styles.produtoPontos}>{produto.custo_pontos} pontos</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const reloadData = () => {
    loadData(); // Agora chama loadData em vez de fetchData
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Carregando seus pontos e produtos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.reloadButton}
          onPress={reloadData}
        >
          <Text style={styles.reloadButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        
        {error.includes('autenticado') && (
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Fazer login</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pontosContainer}>
        <Text style={styles.pontosTitulo}>Seus Pontos</Text>
        <Text style={styles.pontosValor}>{pontos}</Text>
        {/* Removi o CPF da tela, mas deixe se precisar para debug */}
      </View>

      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listaContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  reloadButton: {
    backgroundColor: '#2a9d8f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  reloadButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#e63946',
    padding: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pontosContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pontosTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pontosValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a9d8f',
    marginTop: 5,
  },
  cpfText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  listaContainer: {
    paddingBottom: 20,
  },
  categoriaContainer: {
    marginTop: 15,
  },
  categoriaTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  produtoItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  produtoImagem: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  produtoInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  produtoDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  produtoPontos: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
});

export default TelaTrocaPontos;