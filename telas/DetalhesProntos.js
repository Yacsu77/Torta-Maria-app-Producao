import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getCurrentSection } from '../auth';

const DetalhesPromocao = ({ route, navigation }) => {
  const { produto } = route.params;
  const [sectionId, setSectionId] = useState(null);

  useEffect(() => {
    const fetchSection = async () => {
      const section = await getCurrentSection();
      if (section && section.id) {
        setSectionId(section.id);
      }
    };
    fetchSection();
  }, []);

  const handleAddToCart = async () => {
    if (!sectionId) {
      Alert.alert('Erro', 'Não foi possível identificar a seção atual');
      return;
    }

    try {
      const response = await fetch('https://sivpt-betaapi.onrender.com/api/sacola/inseri/pontos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ID_secao: sectionId,
          Produto_pontos: produto.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Produto adicionado à sacola de pontos!');
      } else {
        Alert.alert('Erro', data.error || 'Falha ao adicionar produto');
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o produto à sacola');
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: produto.URL_imagem }} 
        style={styles.produtoImagem}
        resizeMode="contain"
      />
      
      <View style={styles.produtoInfo}>
        <Text style={styles.produtoNome}>{produto.nome_Promocao}</Text>
        <Text style={styles.produtoPontos}>{produto.custo_pontos} pontos</Text>
        <Text style={styles.produtoDescricao}>{produto.descricao_promocao}</Text>
      </View>

      <TouchableOpacity 
        style={styles.botaoAdicionar}
        onPress={handleAddToCart}
      >
        <Text style={styles.botaoTexto}>Adicionar à Sacola</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  produtoImagem: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  produtoInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  produtoNome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  produtoPontos: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a9d8f',
    marginBottom: 15,
  },
  produtoDescricao: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  botaoAdicionar: {
    backgroundColor: '#2a9d8f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DetalhesPromocao;