import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Configuração global do axios
const api = axios.create({
  baseURL: 'https://api.mercadopago.com/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const apiPedidos = axios.create({
  baseURL: 'https://sivpt-betaapi.onrender.com/api',
  timeout: 30000,
});

// Credenciais globais
let CREDENTIALS = {
  publicKey: '',
  accessToken: '',
  clientId: '',
  clientSecret: '',
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
  warning: '#F39C12',
};

// Mapeamento de bandeiras de cartão
const CARD_BRANDS = {
  visa: { name: 'Visa', paymentMethodId: 'visa' },
  mastercard: { name: 'Mastercard', paymentMethodId: 'master' },
  amex: { name: 'American Express', paymentMethodId: 'amex' },
  diners: { name: 'Diners Club', paymentMethodId: 'diners' },
  elo: { name: 'Elo', paymentMethodId: 'elo' },
  hipercard: { name: 'Hipercard', paymentMethodId: 'hipercard' },
  discover: { name: 'Discover', paymentMethodId: 'discover' },
  jcb: { name: 'JCB', paymentMethodId: 'jcb' },
  aura: { name: 'Aura', paymentMethodId: 'aura' },
};

const Pagamento = () => {
  const [loading, setLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: '',
    brand: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [deviceId, setDeviceId] = useState(null);
  const scrollViewRef = useRef();

  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, valor, items } = route.params || {};

  // Gerar device ID
  useEffect(() => {
    const generateDeviceId = async () => {
      try {
        let storedDeviceId = await AsyncStorage.getItem('deviceId');
        if (!storedDeviceId) {
          storedDeviceId = uuidv4();
          await AsyncStorage.setItem('deviceId', storedDeviceId);
        }
        console.log('[DEVICE] Device ID:', storedDeviceId);
        setDeviceId(storedDeviceId);
      } catch (error) {
        console.error('[DEVICE] Erro ao gerar/salvar deviceId:', error);
        const fallbackId = uuidv4();
        setDeviceId(fallbackId);
      }
    };

    generateDeviceId();
  }, []);

  const loadMercadoPagoCredentials = async () => {
    console.log('[CREDENCIAIS] Iniciando carregamento das credenciais...');
    setLoadingCredentials(true);

    try {
      console.log(`[CREDENCIAIS] Buscando seção para o pedido ID: ${pedidoId}`);
      const secaoResponse = await apiPedidos.get(`/secao/secao/${pedidoId}`);

      if (!secaoResponse.data || !secaoResponse.data.CNPJ_loja) {
        throw new Error('Dados da seção não encontrados ou CNPJ inválido');
      }

      const { CNPJ_loja } = secaoResponse.data;
      console.log(`[CREDENCIAIS] CNPJ da loja encontrado: ${CNPJ_loja}`);

      console.log(`[CREDENCIAIS] Buscando credenciais para o CNPJ: ${CNPJ_loja}`);
      const credenciaisResponse = await apiPedidos.get(`/secao/acesso-loja/${CNPJ_loja}`);

      if (!credenciaisResponse.data) {
        throw new Error('Credenciais não encontradas para este CNPJ');
      }

      CREDENTIALS = {
        publicKey: credenciaisResponse.data.PublicKey_MP,
        accessToken: credenciaisResponse.data.AccessToken_MP,
        clientId: credenciaisResponse.data.ClientID_MP,
        clientSecret: credenciaisResponse.data.ClientSecret_MP,
      };

      console.log('[CREDENCIAIS] Credenciais carregadas com sucesso:', {
        publicKey: CREDENTIALS.publicKey ? '*** (oculta)' : 'não encontrado',
        accessToken: CREDENTIALS.accessToken ? '*** (oculta)' : 'não encontrado',
        clientId: CREDENTIALS.clientId ? '*** (oculta)' : 'não encontrado',
        clientSecret: CREDENTIALS.clientSecret ? '*** (oculta)' : 'não encontrado',
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
          setCardData((prev) => ({
            ...prev,
            name: parsedData.Nome_Cli || '',
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
          Authorization: `Bearer ${CREDENTIALS.accessToken}`,
        },
      });

      console.log(`[PIX] Status do pagamento: ${response.data.status}`);

      if (response.data.status === 'approved') {
        setPaymentStatus('approved');
        handlePaymentApproval();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PIX] Erro ao verificar status do pagamento:', error);
      return false;
    }
  };

  const obterIdPedidoPorSecao = async (idSecao) => {
    try {
      console.log(`[PEDIDO] Buscando ID do pedido para a seção: ${idSecao}`);
      const response = await apiPedidos.get(`/secao/pedido/por-secao/${idSecao}`);

      if (!response.data || !response.data.id) {
        throw new Error('ID do pedido não encontrado para esta seção');
      }

      console.log(`[PEDIDO] ID do pedido encontrado: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('[PEDIDO] Erro ao buscar ID do pedido:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  };

  const atualizarSituacaoPedido = async (pedidoId, situacao) => {
    try {
      console.log(`[PEDIDO] Atualizando situação do pedido ${pedidoId} para ${situacao}`);
      const response = await apiPedidos.put(`/pedido/atualizar-situacao/${pedidoId}`, {
        novaSituacao: situacao,
      });

      console.log('[PEDIDO] Resposta da atualização:', response.data);
      return true;
    } catch (error) {
      console.error('[PEDIDO] Erro ao atualizar situação do pedido:', error);
      return false;
    }
  };

  const validateCard = () => {
    const { number, expiryMonth, expiryYear, cvc, name, brand } = cardData;

    // Validação do número do cartão
    const cleanedNumber = number.replace(/\s/g, '');
    if (!cleanedNumber || cleanedNumber.length < 15 || cleanedNumber.length > 19 || !/^\d+$/.test(cleanedNumber)) {
      Alert.alert('Erro', 'Número do cartão inválido (deve conter 15-19 dígitos numéricos)');
      return false;
    }

    // Validação do mês de expiração
    const monthNum = parseInt(expiryMonth, 10);
    if (!expiryMonth || expiryMonth.length !== 2 || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      Alert.alert('Erro', 'Mês de validade inválido (deve ser MM, ex.: 01-12)');
      return false;
    }

    // Validação do ano de expiração
    const yearNum = parseInt(expiryYear, 10);
    const currentYear = new Date().getFullYear() % 100; // Últimos dois dígitos do ano atual
    if (!expiryYear || expiryYear.length !== 2 || isNaN(yearNum) || yearNum < currentYear) {
      Alert.alert('Erro', 'Ano de validade inválido (deve ser AA, ex.: 25 ou superior)');
      return false;
    }

    // Validação do CVC
    const cvcLength = cardData.brand === 'amex' ? 4 : 3;
    if (!cvc || cvc.length !== cvcLength || !/^\d+$/.test(cvc)) {
      Alert.alert('Erro', `CVC inválido (deve conter ${cvcLength} dígitos numéricos)`);
      return false;
    }

    // Validação do nome
    if (!name || name.length < 3 || !/^[a-zA-Z\s]+$/.test(name)) {
      Alert.alert('Erro', 'Nome no cartão inválido (mínimo 3 caracteres, apenas letras e espaços)');
      return false;
    }

    // Validação da bandeira
    if (!brand || !CARD_BRANDS[brand]) {
      Alert.alert('Erro', 'Bandeira do cartão não reconhecida');
      return false;
    }

    setCardComplete(true);
    return true;
  };

  const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
    try {
      return await requestFn();
    } catch (error) {
      if (retries <= 0) {
        throw new Error(`Falha após ${retries + 1} tentativas: ${error.message}`);
      }
      console.log(`[RETRY] Tentativa falhou, tentando novamente (${retries} tentativas restantes)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryRequest(requestFn, retries - 1, delay * 2);
    }
  };

  const detectCardBrand = (cardNumber) => {
    const cleanedNumber = cardNumber.replace(/\s/g, '');
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      diners: /^3(?:0[0-5]|[68])/,
      elo: /^(?:4011|5067|5090|6363|6500|6516)/,
      hipercard: /^(?:38|60)/,
      discover: /^6(?:011|5)/,
      jcb: /^(?:2131|1800|35)/,
      aura: /^50/,
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanedNumber)) {
        return brand;
      }
    }
    return '';
  };

  const handleCardPayment = async () => {
    if (!validateCard()) return;

    if (!credentialsLoaded) {
      Alert.alert('Atenção', 'Credenciais de pagamento ainda não carregadas. Por favor, aguarde.');
      return;
    }

    if (!deviceId) {
      Alert.alert('Atenção', 'Dispositivo não identificado. Por favor, reinicie o aplicativo.');
      return;
    }

    setLoading(true);

    try {
      const cardPayload = {
        card_number: cardData.number.replace(/\s/g, ''),
        expiration_month: cardData.expiryMonth.padStart(2, '0'),
        expiration_year: `20${cardData.expiryYear}`,
        security_code: cardData.cvc,
        cardholder: {
          name: cardData.name,
          identification: {
            type: 'CPF',
            number: userData?.CPF || '00000000000',
          },
        },
      };

      console.log('[CARTAO] Dados do cartão a serem enviados:', {
        ...cardPayload,
        device: {
          id: deviceId,
          os: Platform.OS,
          os_version: Platform.Version?.toString() || 'unknown',
          model: Device.modelName || 'unknown',
          platform: 'mobile',
          locale: 'pt_BR',
        },
      });

      const tokenResponse = await retryRequest(() =>
        api.post(
          '/card_tokens',
          {
            ...cardPayload,
            device: {
              id: deviceId,
              os: Platform.OS,
              os_version: Platform.Version?.toString() || 'unknown',
              model: Device.modelName || 'unknown',
              platform: 'mobile',
              locale: 'pt_BR',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${CREDENTIALS.accessToken}`, // Corrigido para usar accessToken
              'X-Idempotency-Key': uuidv4(),
            },
          }
        )
      );

      console.log('[CARTAO] Resposta do token:', tokenResponse.data);

      if (!tokenResponse.data?.id) {
        throw new Error('Falha ao gerar token do cartão');
      }

      console.log('[CARTAO] Token do cartão gerado com sucesso:', tokenResponse.data.id);

      console.log('[CARTAO] Processando pagamento...');
      const paymentResponse = await retryRequest(() =>
        api.post(
          '/payments',
          {
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
                number: userData?.CPF || '00000000000',
              },
            },
            metadata: {
              device_id: deviceId,
              platform: Platform.OS,
              app_name: 'SIVPT App',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${CREDENTIALS.accessToken}`,
              'X-Idempotency-Key': uuidv4(),
            },
          }
        )
      );

      console.log('[CARTAO] Resposta do pagamento:', paymentResponse.data);

      if (paymentResponse.data.status === 'approved') {
        handlePaymentApproval();
      } else {
        Alert.alert('Atenção', `Status: ${paymentResponse.data.status || 'Pagamento não concluído'}`);
      }
    } catch (error) {
      console.error('[CARTAO] Erro detalhado no pagamento com cartão:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        cause: error.response?.data?.cause,
      });

      let errorMessage = 'Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.';
      if (error.response?.data?.cause?.length > 0) {
        errorMessage = error.response.data.cause[0].description || errorMessage;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('Erro no pagamento', errorMessage);
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
        api.post(
          '/payments',
          {
            transaction_amount: parseFloat(valor),
            description: `Pedido #${pedidoId}`,
            payment_method_id: 'pix',
            payer: {
              email: userData?.Email_Cli || 'cliente@email.com',
              first_name: userData?.Nome_Cli?.split(' ')[0] || 'Cliente',
              last_name: userData?.Nome_Cli?.split(' ').slice(1).join(' ') || 'Teste',
              identification: {
                type: 'CPF',
                number: userData?.CPF || '00000000000',
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${CREDENTIALS.accessToken}`,
              'X-Idempotency-Key': uuidv4(),
            },
          }
        )
      );

      console.log('[PIX] Resposta do pagamento PIX:', response.data);

      if (!response.data?.point_of_interaction?.transaction_data) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      const pixInfo = {
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
          response.data.point_of_interaction.transaction_data.qr_code
        )}`,
        expiration: response.data.point_of_interaction.transaction_data.qr_code_expiration_date,
        ticketUrl: response.data.point_of_interaction.transaction_data.ticket_url,
      };

      console.log('[PIX] Pagamento PIX gerado com sucesso:', {
        paymentId: response.data.id,
        expiration: pixInfo.expiration,
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
    console.log('[PAGAMENTO] Pagamento aprovado, buscando ID do pedido...');

    try {
      const idPedido = await obterIdPedidoPorSecao(pedidoId);

      if (!idPedido) {
        throw new Error('ID do pedido não encontrado para esta seção');
      }

      console.log(`[PAGAMENTO] ID do pedido encontrado: ${idPedido}`);

      console.log(`[PAGAMENTO] Atualizando situação do pedido ${idPedido}...`);
      const atualizado = await atualizarSituacaoPedido(idPedido, 2);

      if (atualizado) {
        if (userData?.CPF) {
          const pontos = parseFloat(valor) * 100;
          console.log(`[PONTOS] Adicionando ${pontos} pontos para o cliente ${userData.CPF}`);

          try {
            await apiPedidos.post('/pontos/pontos/adicionar', {
              Cliente_CPF: userData.CPF,
              Pontos: pontos,
            });
            console.log('[PONTOS] Pontos adicionados com sucesso');
          } catch (error) {
            console.error('[PONTOS] Erro ao adicionar pontos:', error);
          }
        }

        setModalVisible(true);
      } else {
        Alert.alert('Atenção', 'Pagamento aprovado, mas houve um problema ao atualizar o pedido. Contate o suporte.');
      }
    } catch (error) {
      console.error('[PAGAMENTO] Erro no processo de aprovação:', error);
      Alert.alert(
        'Erro',
        'Pagamento aprovado, mas não foi possível atualizar o pedido. Contate o suporte com o código do pagamento.'
      );
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
      Linking.openURL(pixData.ticketUrl).catch((err) => {
        Alert.alert('Erro', 'Não foi possível abrir o link do PIX');
      });
    }
  };

  const handleCardChange = (field, value) => {
    let updatedCardData = { ...cardData, [field]: value };

    if (field === 'number') {
      const cleanedNumber = value.replace(/\D/g, '');
      const formattedNumber = cleanedNumber.replace(/(.{4})/g, '$1 ').trim();
      updatedCardData.number = formattedNumber;
      updatedCardData.brand = detectCardBrand(cleanedNumber);
    }

    if (field === 'expiry') {
      const cleaned = value.replace(/\D/g, '');
      let month = cleaned.slice(0, 2);
      let year = cleaned.slice(2, 4);
      if (month.length === 2 && parseInt(month, 10) > 12) {
        month = '12';
      }
      updatedCardData.expiryMonth = month;
      updatedCardData.expiryYear = year;
    }

    if (field === 'cvc') {
      updatedCardData.cvc = value.replace(/\D/g, '');
    }

    if (field === 'name') {
      updatedCardData.name = value.toUpperCase();
    }

    setCardData(updatedCardData);

    const isComplete =
      updatedCardData.number.replace(/\s/g, '').length >= 15 &&
      updatedCardData.expiryMonth.length === 2 &&
      updatedCardData.expiryYear.length === 2 &&
      updatedCardData.cvc.length >= (updatedCardData.brand === 'amex' ? 4 : 3) &&
      updatedCardData.name.length >= 3 &&
      updatedCardData.brand !== '';
    setCardComplete(isComplete);
  };

  const formatCardNumber = (number) => {
    if (!number) return '•••• •••• •••• ••••';
    return number;
  };

  const formatExpiry = () => {
    const { expiryMonth, expiryYear } = cardData;
    if (!expiryMonth || !expiryYear) return '••/••';
    return `${expiryMonth}/${expiryYear}`;
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
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

              <View style={styles.cardVisual}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBrand}>{getCardBrandName(cardData.brand)}</Text>
                  <Text style={styles.cardType}>Crédito</Text>
                </View>
                <View style={styles.cardNumberContainer}>
                  <Text style={styles.cardNumber}>{formatCardNumber(cardData.number)}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>Titular</Text>
                    <Text style={styles.cardName}>{cardData.name || '••••••••••••'}</Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>Validade</Text>
                    <Text style={styles.cardExpiry}>{formatExpiry()}</Text>
                  </View>
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Número do Cartão"
                value={cardData.number}
                onChangeText={(text) => handleCardChange('number', text)}
                keyboardType="numeric"
                maxLength={19}
                onFocus={handleInputFocus}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  placeholder="MM/AA"
                  value={`${cardData.expiryMonth}/${cardData.expiryYear}`}
                  onChangeText={(text) => handleCardChange('expiry', text)}
                  keyboardType="numeric"
                  maxLength={5}
                  onFocus={handleInputFocus}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CVC"
                  value={cardData.cvc}
                  onChangeText={(text) => handleCardChange('cvc', text)}
                  keyboardType="numeric"
                  maxLength={4}
                  onFocus={handleInputFocus}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nome no Cartão"
                value={cardData.name}
                onChangeText={(text) => handleCardChange('name', text)}
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
                    <Image source={{ uri: pixData.qrImage }} style={styles.qrCode} />
                  </View>

                  <View style={styles.codeContainer}>
                    <Text selectable style={styles.codeText}>
                      {pixData.qrCode}
                    </Text>
                    <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(pixData.qrCode)}>
                      <Text style={styles.copyButtonText}>Copiar</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.pixLinkButton} onPress={openPixInBrowser}>
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
                  <Text style={styles.pixDescription}>Pague instantaneamente sem taxas usando o PIX.</Text>
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

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.lightText,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
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
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: COLORS.lightText,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.lightText,
  },
  activeTabText: {
    color: COLORS.white,
  },
  form: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: COLORS.text,
  },
  cardVisual: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardType: {
    color: COLORS.white,
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
    color: COLORS.white,
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
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    maxWidth: 180,
  },
  cardExpiry: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
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
    color: COLORS.lightText,
  },
  pixContainer: {
    marginBottom: 20,
  },
  pixDescription: {
    fontSize: 15,
    color: COLORS.lightText,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.white,
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
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  copyButtonText: {
    color: COLORS.white,
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
    color: COLORS.primary,
    fontWeight: '500',
  },
  expirationText: {
    fontSize: 13,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  pixInstructions: {
    fontSize: 14,
    color: COLORS.lightText,
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
    color: COLORS.lightText,
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
    backgroundColor: COLORS.white,
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
    color: COLORS.text,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.lightText,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Pagamento;