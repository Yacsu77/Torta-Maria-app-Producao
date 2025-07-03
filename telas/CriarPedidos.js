import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { getCurrentSection, clearCurrentSection, getUserData } from '../auth';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/pt-br';
import { Ionicons } from '@expo/vector-icons';

const CriarPedidos = () => {
  const [loading, setLoading] = useState(false);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { total, totalPontos, promocoes } = route.params || {};
  const [showPicker, setShowPicker] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    const hours = Math.max(10, Math.min(19, now.getHours()));
    now.setHours(hours, 0, 0, 0);
    return now;
  });

  const [pedidoData, setPedidoData] = useState({
    id_secao: null,
    Tipo_Pedido: 1,
    Data_pedido: moment().format('DD/MM/YYYY'),
    // Inicializa a hora no formato 24h (HH:mm:ss)
    Hora_Pedido: moment().format('HH:mm:ss'),
    Valor_pedido: total || '0.00',
    Situacao: 1
  });

  const handleClose = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [secao, user] = await Promise.all([
          getCurrentSection(),
          getUserData()
        ]);

        setSectionInfo(secao);
        setUserInfo(user);
        
        if (secao) {
          setPedidoData(prev => ({
            ...prev,
            id_secao: secao.id,
            Tipo_Pedido: secao.tipo === '2' ? 2 : 1
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados da seção ou do usuário');
      }
    };

    carregarDados();
  }, []);

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = moment(date).format('DD/MM/YYYY');
      setPedidoData(prev => ({
        ...prev,
        Data_pedido: formattedDate
      }));
    }
  };

  const handleTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    
    if (time) {
      const hours = time.getHours();
      if (hours < 10 || hours >= 19) {
        Alert.alert(
          'Horário inválido',
          'Nosso horário de funcionamento é das 10h às 19h. Por favor, selecione um horário dentro deste intervalo.',
          [{ text: 'OK', onPress: () => setShowPicker('time') }]
        );
        return;
      }
      
      setSelectedTime(time);
      // Formata a hora no formato 24h (HH:mm:ss) usando moment
      const formattedTime = moment(time).format('HH:mm:ss');
      setPedidoData(prev => ({
        ...prev,
        Hora_Pedido: formattedTime
      }));
    }
  };

  const showDatepicker = () => {
    setShowPicker('date');
  };

  const showTimepicker = () => {
    setShowPicker('time');
  };

  const validarPedido = () => {
    const hours = selectedTime.getHours();
    if (hours < 10 || hours >= 19) {
      Alert.alert(
        'Horário inválido',
        'Nosso horário de指標: funcionamento é das 10h às 19h. Por favor, selecione um horário dentro deste intervalo.'
      );
      return false;
    }

    if (!pedidoData.id_secao) {
      Alert.alert('Erro', 'Não foi possível identificar sua seção. Por favor, tente novamente.');
      return false;
    }

    if (!pedidoData.Valor_pedido || parseFloat(pedidoData.Valor_pedido) <= 0) {
      Alert.alert('Erro', 'Valor do pedido inválido.');
      return false;
    }

    return true;
  };

  const removerPontosUsuario = async () => {
    if (!userInfo || !userInfo.CPF || !totalPontos || totalPontos <= 0) {
      return true;
    }

    try {
      const response = await fetch('https://sivpt-betaapi.onrender.com/api/pontos/pontos/remover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Cliente_CPF: userInfo.CPF,
          Pontos: totalPontos
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.erro || `Erro ao remover pontos: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao remover pontos:', error);
      Alert.alert('Erro', 'Não foi possível remover os pontos do usuário');
      return false;
    }
  };

  const criarPedidoNoBanco = async () => {
    if (!validarPedido()) return;

    setLoading(true);
    try {
      if (totalPontos > 0) {
        const pontosRemovidos = await removerPontosUsuario();
        if (!pontosRemovidos) {
          setLoading(false);
          return;
        }
      }

      // Formata a data para o formato ISO e a hora para HH:mm:ss
      const dataISO = moment(selectedDate).format('YYYY-MM-DD');
      const horaFormatada = moment(selectedTime).format('HH:mm:ss');
      
      const pedidoParaAPI = {
        ...pedidoData,
        Data_pedido: dataISO,
        Hora_Pedido: horaFormatada // Garante o formato correto
      };

      const response = await fetch('https://sivpt-betaapi.onrender.com/api/pedido/inserir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pedidoParaAPI),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.erro || `Erro HTTP: ${response.status}`);
      }

      if (!data.id_pedido) {
        throw new Error('ID do pedido não retornado pela API');
      }

      await clearCurrentSection();

      navigation.navigate('Pagamento', { 
        pedidoId: pedidoData.id_secao, 
        valor: pedidoData.Valor_pedido,
        pontosUtilizados: totalPontos || 0
      });
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao processar seu pedido');
    } finally {
      setLoading(false);
    }
  };

  const renderPicker = () => {
    if (!showPicker) return null;

    const commonProps = {
      locale: 'pt-BR',
      textColor: Platform.OS === 'ios' ? '#2c3e50' : undefined,
    };

    if (showPicker === 'date') {
      return (
        <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : null}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            onChange={handleDateChange}
            minimumDate={new Date()}
            {...commonProps}
          />
          {Platform.OS === 'ios' && renderIOSButtons()}
        </View>
      );
    }

    if (showPicker === 'time') {
      return (
        <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : null}>
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            onChange={handleTimeChange}
            is24Hour={true}
            minuteInterval={15}
            {...commonProps}
          />
          {Platform.OS === 'ios' && renderIOSButtons()}
        </View>
      );
    }
  };

  const renderIOSButtons = () => (
    <View style={styles.iosButtonContainer}>
      <TouchableOpacity 
        style={styles.iosButton} 
        onPress={() => setShowPicker(null)}
      >
        <Text style={styles.iosButtonText}>Confirmar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
        >
          <Ionicons name="close" size={28} color="#2c3e50" />
        </TouchableOpacity>
        
        <Text style={styles.titulo}>Finalizar Pedido</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do Pedido</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Número do Pedido:</Text>
            <Text style={styles.infoValue}>{pedidoData.id_secao || '--'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>
              {pedidoData.Tipo_Pedido === 1 ? 'Retirada' : 'Entrega'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data:</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={showDatepicker}
            >
              <Text style={styles.dateTimeButtonText}>{pedidoData.Data_pedido}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora:</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={showTimepicker}
            >
              {/* Exibe a hora no formato de exibição, mas armazena em HH:mm:ss */}
              <Text style={styles.dateTimeButtonText}>
                {moment(selectedTime).format('HH:mm')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.horarioInfo}>(10h - 19h)</Text>
          </View>
          
          {totalPontos > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pontos utilizados:</Text>
              <Text style={styles.infoValue}>{totalPontos} pontos</Text>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>R$ {parseFloat(pedidoData.Valor_pedido).toFixed(2)}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.botaoPagar, loading && styles.disabledButton]}
          onPress={criarPedidoNoBanco}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Inserir Dados do Cartão</Text>
          )}
        </TouchableOpacity>

        {renderPicker()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#f5f7fa',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 1,
    padding: 5,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#34495e',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  dateTimeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  dateTimeButtonText: {
    color: '#FF7F00',
    fontSize: 15,
    fontWeight: '500',
  },
  horarioInfo: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#dfe6e9',
    marginVertical: 15,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  botaoPagar: {
    backgroundColor: '#FF7F00',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.8,
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  iosPickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginTop: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iosButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 10,
  },
  iosButton: {
    backgroundColor: '#FF7F00',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  iosButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default CriarPedidos;