import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { getUserData } from '../auth';

const TelaTrocaPontos = ({ navigation }) => {
  const [pontos, setPontos] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCPF, setUserCPF] = useState(null);
  const [progressAnimation] = useState(new Animated.Value(0));
  const [blinkAnimation] = useState(new Animated.Value(0));

  // Configuração da animação de piscar
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(blinkAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
    blink.start();

    return () => blink.stop();
  }, [blinkAnimation]);

  // Função para atualizar a animação de progresso
  const updateProgress = useCallback(() => {
    const progress = Math.min(pontos / 100000, 1); // Limita a 1 milhão
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pontos, progressAnimation]);

  // Atualiza a animação de progresso quando os pontos mudam
  useEffect(() => {
    updateProgress();
  }, [pontos, updateProgress]);

  // Função principal para carregar os dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obter dados do usuário
      const userData = await getUserData();
      console.log('Dados do usuário:', userData);
      
      if (!userData || !userData.CPF) {
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
    loadData();
  };

  // Interpolação para a cor laranja com variação de brilho
  const progressColor = blinkAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 140, 0, 0.8)', 'rgba(255, 165, 0, 1)'] // Laranja com variação
  });

  // Largura da barra de progresso
  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
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
      <Text style={styles.headerText}>Área de Troca de Pontos</Text>
      
      <View style={styles.pontosContainer}>
        <Text style={styles.pontosTitulo}>Seus Pontos</Text>
        <Text style={styles.pontosValor}>{pontos.toLocaleString()}</Text>
        
        {/* Barra de progresso laranja piscante */}
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { 
                width: progressWidth,
                backgroundColor: progressColor
              }
            ]}
          />
        </View>
        

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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00', // Laranja
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
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
    backgroundColor: '#2E8B57', // Verde
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  reloadButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#FF8C00', // Laranja
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8C00', // Laranja
    marginTop: 5,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
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
    color: '#2E8B57', // Verde
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
    color: '#333',
  },
  produtoDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  produtoPontos: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00', // Laranja (alterado para laranja conforme solicitado)
  },
});

export default TelaTrocaPontos;