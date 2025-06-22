import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';

// Configuração global do axios
const api = axios.create({
  baseURL: 'https://api.mercadopago.com/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const apiPedidos = axios.create({
  baseURL: 'https://sivpt-betaapi.onrender.com/api',
  timeout: 30000,
});

// Removemos as credenciais fixas
let CREDENTIALS = {
  publicKey: '',
  accessToken: '',
  clientId: '',
  clientSecret: ''
};

const COLORS = {
  primary: '#FF7F00',
  secondary: '#4CAF50',
  background: '#F5F5F5',
  text: '#333333',
  lightText: '#777777',
  white: '#FFFFFF',
  border: '#E0E0E0',
  error: '#E74C3C',
  success: '#27AE60',
  warning: '#F39C12'
};

// Mapeamento completo de bandeiras de cartão com seus payment_method_id correspondentes
const CARD_BRANDS = {
  visa: { name: 'Visa', paymentMethodId: 'visa' },
  mastercard: { name: 'Mastercard', paymentMethodId: 'master' },
  amex: { name: 'American Express', paymentMethodId: 'amex' },
  diners: { name: 'Diners Club', paymentMethodId: 'diners' },
  elo: { name: 'Elo', paymentMethodId: 'elo' },
  hipercard: { name: 'Hipercard', paymentMethodId: 'hipercard' },
  discover: { name: 'Discover', paymentMethodId: 'discover' },
  jcb: { name: 'JCB', paymentMethodId: 'jcb' },
  aura: { name: 'Aura', paymentMethodId: 'aura' }
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
    name: '',
    brand: ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const scrollViewRef = useRef();

  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, valor, items } = route.params || {};

  // Função para carregar as credenciais do Mercado Pago
  const loadMercadoPagoCredentials = async () => {
    console.log('[CREDENCIAIS] Iniciando carregamento das credenciais...');
    setLoadingCredentials(true);
    
    try {
      // 1. Primeira requisição para obter a seção pelo ID do pedido
      console.log(`[CREDENCIAIS] Buscando seção para o pedido ID: ${pedidoId}`);
      const secaoResponse = await apiPedidos.get(`/secao/secao/${pedidoId}`);
      
      if (!secaoResponse.data || !secaoResponse.data.CNPJ_loja) {
        throw new Error('Dados da seção não encontrados ou CNPJ inválido');
      }
      
      const { CNPJ_loja } = secaoResponse.data;
      console.log(`[CREDENCIAIS] CNPJ da loja encontrado: ${CNPJ_loja}`);
      
      // 2. Segunda requisição para obter as credenciais usando o CNPJ
      console.log(`[CREDENCIAIS] Buscando credenciais para o CNPJ: ${CNPJ_loja}`);
      const credenciaisResponse = await apiPedidos.get(`/secao/acesso-loja/${CNPJ_loja}`);
      
      if (!credenciaisResponse.data) {
        throw new Error('Credenciais não encontradas para este CNPJ');
      }
      
      // Atualiza as credenciais globais
      CREDENTIALS = {
        publicKey: credenciaisResponse.data.PublicKey_MP,
        accessToken: credenciaisResponse.data.AccessToken_MP,
        clientId: credenciaisResponse.data.ClientID_MP,
        clientSecret: credenciaisResponse.data.ClientSecret_MP
      };
      
      console.log('[CREDENCIAIS] Credenciais carregadas com sucesso:', {
        publicKey: CREDENTIALS.publicKey ? '*** (oculto)' : 'não encontrado',
        accessToken: CREDENTIALS.accessToken ? '*** (oculto)' : 'não encontrado',
        clientId: CREDENTIALS.clientId ? '*** (oculto)' : 'não encontrado',
        clientSecret: CREDENTIALS.clientSecret ? '*** (oculto)' : 'não encontrado'
      });
      
      setCredentialsLoaded(true);
    } catch (error) {
      console.error('[CREDENCIAIS] Erro ao carregar credenciais:', error);
      Alert.alert(
        'Erro', 
        'Não foi possível carregar as credenciais de pagamento. Por favor, tente novamente mais tarde.'
      );
      navigation.goBack();
    } finally {
      setLoadingCredentials(false);
    }
  };

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
    loadMercadoPagoCredentials();
  }, []);

  useEffect(() => {
    let intervalId;
    
    if (paymentId && paymentMethod === 'pix' && credentialsLoaded) {
      intervalId = setInterval(() => {
        checkPaymentStatus(paymentId);
      }, 10000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentId, paymentMethod, credentialsLoaded]);

  const checkPaymentStatus = async (id) => {
    try {
      console.log(`[PIX] Verificando status do pagamento ID: ${id}`);
      const response = await api.get(`/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${CREDENTIALS.accessToken}`
        }
      });
      
      console.log(`[PIX] Status do pagamento: ${response.data.status}`);
      
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

  const atualizarSituacaoPedido = async (pedidoId, situacao) => {
    try {
      console.log(`[PEDIDO] Atualizando situação do pedido ${pedidoId} para ${situacao}`);
      const response = await apiPedidos.put(`/pedido/atualizar-situacao/${pedidoId}`, {
        novaSituacao: situacao
      });
      
      console.log('[PEDIDO] Situação do pedido atualizada:', response.data);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar situação do pedido:', error.response?.data || error.message);
      return false;
    }
  };

  const validateCard = () => {
    if (!cardComplete) {
      Alert.alert('Erro', 'Por favor, preencha todos os dados do cartão corretamente');
      return false;
    }

    if (!cardData.name || cardData.name.length < 3) {
      Alert.alert('Erro', 'Nome no cartão inválido');
      return false;
    }

    if (!cardData.brand) {
      Alert.alert('Erro', 'Bandeira do cartão não reconhecida');
      return false;
    }

    return true;
  };

  const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
    try {
      return await requestFn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.log(`[RETRY] Tentativa falhou, tentando novamente (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, retries - 1, delay * 2);
    }
  };

  const handleCardPayment = async () => {
    if (!validateCard()) return;

    if (!credentialsLoaded) {
      Alert.alert('Atenção', 'Credenciais de pagamento ainda não carregadas. Por favor, aguarde.');
      return;
    }

    setLoading(true);

    try {
      // 1. Tokenização do cartão
      console.log('[CARTAO] Iniciando tokenização do cartão...');
      const tokenResponse = await retryRequest(() => 
        api.post('/card_tokens', {
          card_number: cardData.number?.replace(/\s/g, '') || '',
          expiration_month: cardData.expiry?.split('/')[0]?.padStart(2, '0') || '',
          expiration_year: `20${cardData.expiry?.split('/')[1] || ''}`,
          security_code: cardData.cvc || '',
          cardholder: { 
            name: cardData.name || '',
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

      console.log('[CARTAO] Token do cartão gerado com sucesso:', tokenResponse.data.id);

      // 2. Processamento do pagamento
      console.log('[CARTAO] Processando pagamento...');
      const paymentResponse = await retryRequest(() =>
        api.post('/payments', {
          transaction_amount: parseFloat(valor),
          token: tokenResponse.data.id,
          description: `Pedido #${pedidoId}`,
          installments: 1,
          payment_method_id: CARD_BRANDS[cardData.brand]?.paymentMethodId,
          payer: { 
            email: userData?.Email_Cli || 'cliente@email.com',
            first_name: userData?.Nome_Cli?.split(' ')[0] || 'Cliente',
            last_name: userData?.Nome_Cli?.split(' ').slice(1).join(' ') || 'Teste',
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

      console.log('[CARTAO] ✅ Payment ID:', paymentResponse.data.id);
      setPaymentId(paymentResponse.data.id);

      if (paymentResponse.data.status === 'approved') {
        handlePaymentApproval();
      } else {
        Alert.alert('Atenção', `Status: ${paymentResponse.data.status || 'Pagamento não concluído'}`);
      }
    } catch (error) {
      console.error('[CARTAO] Erro no pagamento com cartão:', error.response?.data || error.message);
      Alert.alert(
        'Erro no pagamento', 
        error.response?.data?.message || 
        error.response?.data?.cause?.[0]?.description || 
        'Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePixPayment = async () => {
    if (!credentialsLoaded) {
      Alert.alert('Atenção', 'Credenciais de pagamento ainda não carregadas. Por favor, aguarde.');
      return;
    }

    setPixLoading(true);

    try {
      console.log('[PIX] Gerando pagamento PIX...');
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
            }
          }
        }, {
          headers: {
            'Authorization': `Bearer ${CREDENTIALS.accessToken}`,
            'X-Idempotency-Key': uuidv4()
          }
        })
      );

      if (!response.data?.point_of_interaction?.transaction_data) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      const pixInfo = {
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${
          encodeURIComponent(response.data.point_of_interaction.transaction_data.qr_code)
        }`,
        expiration: response.data.point_of_interaction.transaction_data.qr_code_expiration_date,
        ticketUrl: response.data.point_of_interaction.transaction_data.ticket_url
      };

      console.log('[PIX] Pagamento PIX gerado com sucesso:', {
        paymentId: response.data.id,
        expiration: pixInfo.expiration
      });

      setPixData(pixInfo);
      setPaymentId(response.data.id);
      setModalVisible(true);
    } catch (error) {
      console.error('[PIX] Erro no PIX:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível gerar o PIX. Tente novamente mais tarde.');
    } finally {
      setPixLoading(false);
    }
  };

  const handlePaymentApproval = async () => {
    console.log('[PAGAMENTO] Pagamento aprovado, atualizando situação do pedido...');
    const atualizado = await atualizarSituacaoPedido(pedidoId, 2);
    
    if (atualizado) {
      setModalVisible(true);
    } else {
      Alert.alert('Atenção', 'Pagamento aprovado, mas houve um problema ao atualizar o pedido. Contate o suporte.');
    }
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
        Alert.alert('Erro', 'Não foi possível abrir o link do PIX');
      });
    }
  };

  const handleCardChange = (cardDetails) => {
    setCardComplete(cardDetails.complete);
    setCardData({
      number: cardDetails.number,
      expiry: `${cardDetails.expiryMonth}/${cardDetails.expiryYear.toString().slice(-2)}`,
      cvc: cardDetails.cvc,
      name: cardData.name,
      brand: cardDetails.brand || ''
    });
  };

  const handleNameChange = (text) => {
    setCardData({
      ...cardData,
      name: text
    });
  };

  const formatCardNumber = (number) => {
    if (!number) return '•••• •••• •••• ••••';
    const cleaned = number.replace(/\s+/g, '');
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substr(i, 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (expiry) => {
    if (!expiry) return '••/••';
    return expiry;
  };

  const getCardBrandName = (brand) => {
    return CARD_BRANDS[brand]?.name || '••••••••';
  };

  const handleInputFocus = () => {
    scrollViewRef.current?.scrollTo({ y: 200, animated: true });
  };

  if (loadingCredentials) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando informações de pagamento...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Finalizar Pagamento</Text>
          </View>
          
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
              
              {/* Cartão visual */}
              <View style={styles.cardVisual}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBrand}>
                    {getCardBrandName(cardData.brand)}
                  </Text>
                  <Text style={styles.cardType}>Crédito</Text>
                </View>
                <View style={styles.cardNumberContainer}>
                  <Text style={styles.cardNumber}>
                    {formatCardNumber(cardData.number)}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>Titular</Text>
                    <Text style={styles.cardName}>
                      {cardData.name || '••••••••••••'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>Validade</Text>
                    <Text style={styles.cardExpiry}>
                      {formatExpiry(cardData.expiry)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.cardFieldContainer}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: '4242 4242 4242 4242',
                    expiration: 'MM/AA',
                    cvc: 'CVC'
                  }}
                  cardStyle={styles.cardField}
                  style={styles.cardFieldStyle}
                  onCardChange={handleCardChange}
                  onFocus={handleInputFocus}
                />
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Nome no Cartão"
                value={cardData.name}
                onChangeText={handleNameChange}
                onFocus={handleInputFocus}
              />
              
              <TouchableOpacity
                style={[styles.button, (loading || !cardComplete) && styles.disabledButton]}
                onPress={handleCardPayment}
                disabled={loading || !cardComplete}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Pagar com Cartão</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.securityInfo}>
                <Ionicons name="lock-closed" size={16} color={COLORS.secondary} />
                <Text style={styles.securityText}>Pagamento seguro com criptografia</Text>
              </View>
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
                    <ActivityIndicator size="small" color={COLORS.primary} />
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
                      <ActivityIndicator color={COLORS.white} />
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.success} style={styles.modalIcon} />
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#777777',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    color: '#333333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#777777',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF7F00',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#777777',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  form: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333333',
  },
  cardVisual: {
    backgroundColor: '#FF7F00',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    height: 200,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardType: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardNumberContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    maxWidth: 180,
  },
  cardExpiry: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 12,
  },
  cardField: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    placeholderColor: '#999999',
  },
  cardFieldStyle: {
    height: 50,
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    color: '#333333',
  },
  button: {
    backgroundColor: '#FF7F00',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  securityText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#777777',
  },
  pixContainer: {
    marginBottom: 20,
  },
  pixDescription: {
    fontSize: 15,
    color: '#777777',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#FF7F00',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  pixLinkButton: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  pixLinkButtonText: {
    color: '#FF7F00',
    fontWeight: '500',
  },
  expirationText: {
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 8,
  },
  pixInstructions: {
    fontSize: 14,
    color: '#777777',
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
    color: '#777777',
    fontSize: 14,
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#777777',
  },
  modalButton: {
    backgroundColor: '#FF7F00',
    padding: 14,
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