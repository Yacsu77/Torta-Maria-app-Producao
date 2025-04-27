import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  TextInput,
  Image,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração global do axios com interceptors
const api = axios.create({
  baseURL: 'https://api.mercadopago.com/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'ReactNative/1.0'
  }
});

// API para atualizar situação do pedido
const apiPedidos = axios.create({
  baseURL: 'https://sivpt-betaapi.onrender.com/api',
  timeout: 30000,
});

// Interceptor para tratamento global de erros
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Erro na requisição:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Credenciais de produção
const CREDENTIALS = {
  publicKey: 'APP_USR-bcf0438f-9524-4bbf-8a2a-423783d4b15e',
  accessToken: 'APP_USR-2586034623043288-041509-64134ab2bdb6a1368766e88f4966e7d8-1047892153',
  clientId: '2586034623043288',
  clientSecret: 'ZxdzFsjxxLd0EcxsAedu307KedqnuOps'
};

const Pagamento = () => {
  const [loading, setLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);

  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, valor } = route.params || {};

  // Carrega os dados do usuário ao montar o componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await AsyncStorage.getItem('user');
        if (data) {
          const parsedData = JSON.parse(data);
          setUserData(parsedData);
          setCardData(prev => ({
            ...prev,
            name: parsedData.Nome_Cli || ''
          }));
        }
      } catch (error) {
        console.log('Erro ao buscar dados do usuário:', error);
      }
    };

    loadUserData();
  }, []);

  // Verifica status do pagamento periodicamente (para PIX)
  useEffect(() => {
    let intervalId;
    
    if (paymentId && paymentMethod === 'pix') {
      intervalId = setInterval(() => {
        checkPaymentStatus(paymentId);
      }, 10000); // Verifica a cada 10 segundos
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentId, paymentMethod]);

  // Função para verificar status do pagamento
  const checkPaymentStatus = async (id) => {
    try {
      const response = await api.get(`/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${CREDENTIALS.accessToken}`
        }
      });

      console.log('Status do pagamento:', response.data.status);
      
      if (response.data.status === 'approved') {
        setPaymentStatus('approved');
        handlePaymentApproval();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      return false;
    }
  };

  // Função para atualizar situação do pedido no banco de dados
  const atualizarSituacaoPedido = async (pedidoId, situacao) => {
    try {
      const response = await apiPedidos.put(`/pedido/atualizar-situacao/${pedidoId}`, {
        novaSituacao: situacao
      });
      
      console.log('Situação do pedido atualizada:', response.data);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar situação do pedido:', error.response?.data || error.message);
      return false;
    }
  };

  // Formatação dos campos
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
    return match ? `${match[1]} ${match[2]} ${match[3]} ${match[4]}`.trim() : cleaned;
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  // Validação reforçada
  const validateCard = () => {
    const cardNumber = cardData.number.replace(/\s/g, '');
    
    if (!cardNumber || cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
      Alert.alert('Erro', 'Número do cartão inválido');
      return false;
    }

    if (!cardData.expiry || cardData.expiry.length !== 5 || !cardData.expiry.includes('/')) {
      Alert.alert('Erro', 'Data de expiração inválida (MM/AA)');
      return false;
    }

    if (!cardData.cvc || cardData.cvc.length < 3 || !/^\d+$/.test(cardData.cvc)) {
      Alert.alert('Erro', 'Código de segurança inválido');
      return false;
    }

    if (!cardData.name || cardData.name.length < 3) {
      Alert.alert('Erro', 'Nome no cartão inválido');
      return false;
    }

    return true;
  };

  // Função para tentar novamente uma requisição
  const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
    try {
      return await requestFn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, retries - 1, delay * 2);
    }
  };

  // Processamento de pagamento com cartão
  const handleCardPayment = async () => {
    if (!validateCard()) return;

    setLoading(true);

    try {
      const [month, year] = cardData.expiry.split('/');
      const expiryYear = `20${year}`;

      // 1. Tokenização do cartão
      const tokenResponse = await retryRequest(() => 
        api.post('/card_tokens', {
          card_number: cardData.number.replace(/\s/g, ''),
          expiration_month: month.padStart(2, '0'),
          expiration_year: expiryYear,
          security_code: cardData.cvc,
          cardholder: { 
            name: cardData.name,
            identification: {
              type: 'CPF',
              number: userData?.CPF || '00000000000'
            }
          }
        }, {
          headers: {
            'Authorization': `Bearer ${CREDENTIALS.accessToken}`,
            'X-Idempotency-Key': uuidv4()
          }
        })
      );

      if (!tokenResponse.data?.id) {
        throw new Error('Falha ao gerar token do cartão');
      }

      // 2. Processamento do pagamento
      const paymentResponse = await retryRequest(() =>
        api.post('/payments', {
          transaction_amount: parseFloat(valor),
          token: tokenResponse.data.id,
          description: `Pedido #${pedidoId}`,
          installments: 1,
          payment_method_id: 'master',
          payer: { 
            email: userData?.Email_Cli || 'cliente@email.com',
            first_name: userData?.Nome_Cli?.split(' ')[0] || 'Cliente',
            last_name: userData?.Nome_Cli?.split(' ').slice(1).join(' ') || 'Teste',
            identification: {
              type: 'CPF',
              number: userData?.CPF || '00000000000'
            },
            phone: {
              area_code: userData?.Celular_Cli?.replace(/\D/g, '').substring(0, 2) || '11',
              number: userData?.Celular_Cli?.replace(/\D/g, '').substring(2) || '999999999'
            }
          },
          notification_url: 'https://sivpt-betaapi.onrender.com/api/pedido/notificacao'
        }, {
          headers: {
            'Authorization': `Bearer ${CREDENTIALS.accessToken}`,
            'X-Idempotency-Key': uuidv4()
          }
        })
      );

      // LOG IMPORTANTE: Payment ID para validação
      console.log('✅ Payment ID:', paymentResponse.data.id);
      console.log('🔍 Detalhes completos do pagamento:', paymentResponse.data);

      setPaymentId(paymentResponse.data.id);

      if (paymentResponse.data.status === 'approved') {
        handlePaymentApproval();
      } else {
        Alert.alert('Atenção', `Status: ${paymentResponse.data.status || 'Pagamento não concluído'}`);
      }
    } catch (error) {
      handlePaymentError(error, 'cartão');
    } finally {
      setLoading(false);
    }
  };

  // Processamento de PIX
  const handlePixPayment = async () => {
    setPixLoading(true);

    try {
      const response = await retryRequest(() =>
        api.post('/payments', {
          transaction_amount: parseFloat(valor),
          description: `Pedido #${pedidoId}`,
          payment_method_id: 'pix',
          payer: { 
            email: userData?.Email_Cli || 'cliente@email.com',
            first_name: userData?.Nome_Cli?.split(' ')[0] || 'Cliente',
            last_name: userData?.Nome_Cli?.split(' ').slice(1).join(' ') || 'Teste',
            identification: {
              type: 'CPF',
              number: userData?.CPF || '00000000000'
            },
            phone: {
              area_code: userData?.Celular_Cli?.replace(/\D/g, '').substring(0, 2) || '11',
              number: userData?.Celular_Cli?.replace(/\D/g, '').substring(2) || '999999999'
            }
          },
          notification_url: 'https://sivpt-betaapi.onrender.com/api/pedido/notificacao'
        }, {
          headers: {
            'Authorization': `Bearer ${CREDENTIALS.accessToken}`,
            'X-Idempotency-Key': uuidv4()
          }
        })
      );

      // LOG IMPORTANTE: Payment ID para validação do PIX
      console.log('✅ Payment ID (PIX):', response.data.id);
      console.log('🔍 Detalhes completos do pagamento PIX:', response.data);

      if (!response.data?.point_of_interaction?.transaction_data) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      const pixInfo = {
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${
          encodeURIComponent(response.data.point_of_interaction.transaction_data.qr_code)
        }`,
        expiration: response.data.point_of_interaction.transaction_data.qr_code_expiration_date,
        ticketUrl: response.data.point_of_interaction.transaction_data.ticket_url
      };

      setPixData(pixInfo);
      setPaymentId(response.data.id);
      setModalVisible(true);
    } catch (error) {
      handlePaymentError(error, 'PIX');
    } finally {
      setPixLoading(false);
    }
  };

  // Tratamento quando o pagamento é aprovado
  const handlePaymentApproval = async () => {
    // Atualiza situação do pedido para 2 (aprovado)
    const atualizado = await atualizarSituacaoPedido(pedidoId, 2);
    
    if (atualizado) {
      setModalVisible(true);
    } else {
      Alert.alert('Atenção', 'Pagamento aprovado, mas houve um problema ao atualizar o pedido. Contate o suporte.');
    }
  };

  // Tratamento centralizado de erros
  const handlePaymentError = (error, paymentType) => {
    console.error(`Erro no ${paymentType}:`, {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    let errorMessage = `Erro ao processar ${paymentType}`;
    
    if (error.response?.status === 500) {
      errorMessage = 'Erro interno no servidor do Mercado Pago. Por favor, tente novamente mais tarde.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Tempo de conexão esgotado. Verifique sua internet e tente novamente.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.cause?.[0]?.description) {
      errorMessage = error.response.data.cause[0].description;
    }

    Alert.alert('Erro', errorMessage);
  };

  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copiado', 'Código copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      Alert.alert('Erro', 'Não foi possível copiar o código');
    }
  };

  const openPixInBrowser = () => {
    if (pixData?.ticketUrl) {
      Linking.openURL(pixData.ticketUrl).catch(err => {
        console.error('Erro ao abrir URL:', err);
        Alert.alert('Erro', 'Não foi possível abrir o link do PIX');
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Botão de fechar no cabeçalho */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Finalizar Pagamento</Text>
          
          {/* Resumo do pedido */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo do Pedido</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Número:</Text>
              <Text style={styles.summaryValue}>#{pedidoId}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryTotal}>R$ {parseFloat(valor).toFixed(2)}</Text>
            </View>
          </View>

          {/* Seletor de método de pagamento */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === 'card' && styles.activeTab]}
              onPress={() => setPaymentMethod('card')}
            >
              <Text style={[styles.tabText, paymentMethod === 'card' && styles.activeTabText]}>Cartão</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, paymentMethod === 'pix' && styles.activeTab]}
              onPress={() => setPaymentMethod('pix')}
            >
              <Text style={[styles.tabText, paymentMethod === 'pix' && styles.activeTabText]}>PIX</Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'card' ? (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Dados do Cartão</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Número do Cartão"
                keyboardType="numeric"
                value={formatCardNumber(cardData.number)}
                onChangeText={(text) => setCardData({...cardData, number: text.replace(/\s/g, '')})}
                maxLength={19}
              />
              
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="MM/AA"
                  value={formatExpiry(cardData.expiry)}
                  onChangeText={(text) => setCardData({...cardData, expiry: text.replace(/\D/g, '')})}
                  maxLength={5}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="CVV"
                  keyboardType="numeric"
                  secureTextEntry
                  value={cardData.cvc}
                  onChangeText={(text) => setCardData({...cardData, cvc: text.replace(/\D/g, '')})}
                  maxLength={4}
                />
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Nome no Cartão"
                value={cardData.name}
                onChangeText={(text) => setCardData({...cardData, name: text})}
              />
              
              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleCardPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Pagar com Cartão</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pixContainer}>
              {pixData ? (
                <>
                  <Text style={styles.sectionTitle}>Pagamento via PIX</Text>
                  
                  <View style={styles.qrCodeContainer}>
                    <Image
                      source={{ uri: pixData.qrImage }}
                      style={styles.qrCode}
                    />
                  </View>
                  
                  <View style={styles.codeContainer}>
                    <Text selectable style={styles.codeText}>{pixData.qrCode}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(pixData.qrCode)}
                    >
                      <Text style={styles.copyButtonText}>Copiar</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.pixLinkButton}
                    onPress={openPixInBrowser}
                  >
                    <Text style={styles.pixLinkButtonText}>Abrir PIX no navegador</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.expirationText}>
                    Válido até: {new Date(pixData.expiration).toLocaleString('pt-BR')}
                  </Text>
                  
                  <Text style={styles.pixInstructions}>
                    Pague usando o QR Code acima ou copie o código e cole no seu aplicativo bancário.
                  </Text>
                  
                  <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color="#009ee3" />
                    <Text style={styles.statusText}>Aguardando confirmação do pagamento...</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Pagamento via PIX</Text>
                  <Text style={styles.pixDescription}>
                    Pague instantaneamente sem taxas usando o PIX.
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, pixLoading && styles.disabledButton]}
                    onPress={handlePixPayment}
                    disabled={pixLoading}
                  >
                    {pixLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Gerar Código PIX</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de sucesso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={60} color="#27ae60" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Pagamento Aprovado!</Text>
            <Text style={styles.modalText}>Seu pedido foi confirmado e está sendo processado.</Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('PedidoConfirmado', { pedidoId });
              }}
            >
              <Text style={styles.modalButtonText}>Ver Pedido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#34495e',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#009ee3',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#fff',
  },
  form: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2c3e50',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  button: {
    backgroundColor: '#009ee3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pixContainer: {
    marginBottom: 20,
  },
  pixDescription: {
    fontSize: 15,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
  },
  copyButton: {
    backgroundColor: '#009ee3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
  pixLinkButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  pixLinkButtonText: {
    color: '#009ee3',
    fontWeight: '500',
  },
  expirationText: {
    fontSize: 13,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 8,
  },
  pixInstructions: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  statusText: {
    marginLeft: 8,
    color: '#7f8c8d',
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#7f8c8d',
  },
  modalButton: {
    backgroundColor: '#009ee3',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Pagamento;