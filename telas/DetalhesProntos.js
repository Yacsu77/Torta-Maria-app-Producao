import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Dimensions,
  ImageBackground
} from 'react-native';
import { getCurrentSection } from '../auth';
import { useNavigation } from '@react-navigation/native';

const DetalhesPromocao = ({ route }) => {
  const { produto } = route.params;
  const [sectionId, setSectionId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const navigation = useNavigation();

  useEffect(() => {
    const fetchSection = async () => {
      const section = await getCurrentSection();
      if (section && section.id) {
        setSectionId(section.id);
      } else {
        // Abre como modal a tela AbrirSecao
        navigation.navigate('AbrirSeçãoModal');
        return;
      }
    };
    fetchSection();
  }, [navigation]);

  const onImageLoad = (event) => {
    const { width, height } = event.nativeEvent.source;
    const screenWidth = Dimensions.get('window').width;
    const ratio = screenWidth / width;
    setImageSize({ width: screenWidth, height: height * ratio });
  };

  const handleAddToCart = async () => {
    if (!sectionId) {
      navigation.navigate('AbrirSeçãoModal');
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
        alert('Produto adicionado à sacola de pontos!');
      } else {
        alert(data.error || 'Falha ao adicionar produto');
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      alert('Ocorreu um erro ao adicionar o produto à sacola');
    }
  };

  return (
    <ImageBackground 
      source={require('../assets/fundo.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Botão X para fechar no canto superior direito */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setModalVisible(true)}
          >
            <Image 
              source={{ uri: produto.URL_imagem }} 
              style={styles.produtoImagem}
              resizeMode="cover"
              onLoad={onImageLoad}
            />
          </TouchableOpacity>
          
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome}>{produto.nome_Promocao}</Text>
            <Text style={styles.produtoPontos}>{produto.custo_pontos} pontos</Text>
            <Text style={styles.produtoDescricao}>{produto.descricao_promocao}</Text>
          </View>
        </ScrollView>

        <TouchableOpacity 
          style={styles.botaoAdicionar}
          onPress={handleAddToCart}
        >
          <Text style={styles.botaoTexto}>Adicionar à Sacola</Text>
        </TouchableOpacity>

        {/* Modal para visualização ampliada da imagem */}
        <Modal
          animationType="fade"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>
            
            <ScrollView 
              maximumZoomScale={3}
              minimumZoomScale={1}
              contentContainerStyle={styles.zoomContainer}
            >
              <Image 
                source={{ uri: produto.URL_imagem }} 
                style={[
                  styles.zoomedImage,
                  { width: imageSize.width, height: imageSize.height }
                ]}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: Dimensions.get('window').width - 30,
    height: Dimensions.get('window').width - 30,
    marginTop: 70,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  produtoImagem: {
    width: '100%',
    height: '100%',
  },
  produtoInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    marginHorizontal: 15,
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
    color: '#FF8C00',
    marginBottom: 15,
  },
  produtoDescricao: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  botaoAdicionar: {
    backgroundColor: '#FF8C00',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    maxWidth: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default DetalhesPromocao;