import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

const ConfirmacaoPagamento = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, status } = route.params || {};
  
  const getStatusDetails = () => {
    switch (status) {
      case 'approved':
        return {
          title: 'Pagamento Aprovado!',
          message: 'Seu pagamento foi aprovado com sucesso. O pedido está sendo processado.',
          icon: <MaterialIcons name="check-circle" size={80} color="#27ae60" />,
          color: '#27ae60'
        };
      case 'pending':
        return {
          title: 'Pagamento Pendente',
          message: 'Seu pagamento está sendo processado. Você receberá uma confirmação quando for aprovado.',
          icon: <MaterialCommunityIcons name="clock-time-three" size={80} color="#f39c12" />,
          color: '#f39c12'
        };
      case 'rejected':
        return {
          title: 'Pagamento Recusado',
          message: 'Seu pagamento não foi aprovado. Por favor, tente novamente ou use outro método de pagamento.',
          icon: <MaterialIcons name="error" size={80} color="#e74c3c" />,
          color: '#e74c3c'
        };
      default:
        return {
          title: 'Status Desconhecido',
          message: 'Não foi possível determinar o status do seu pagamento. Por favor, verifique mais tarde.',
          icon: <FontAwesome name="question-circle" size={80} color="#7f8c8d" />,
          color: '#7f8c8d'
        };
    }
  };
  
  const statusDetails = getStatusDetails();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {statusDetails.icon}
        </View>
        <Text style={[styles.title, { color: statusDetails.color }]}>
          {statusDetails.title}
        </Text>
        <Text style={styles.message}>
          {statusDetails.message}
        </Text>
        <Text style={styles.pedidoId}>
          Número do Pedido: #{pedidoId}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.botao}
        onPress={() => navigation.navigate('AcompanharPedido', { pedidoId })}
      >
        <Text style={styles.textoBotao}>Acompanhar Pedido</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.botao, styles.botaoSecundario]}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={[styles.textoBotao, styles.textoBotaoSecundario]}>Voltar à Loja</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  pedidoId: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  botao: {
    backgroundColor: '#009ee3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botaoSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#009ee3',
  },
  textoBotaoSecundario: {
    color: '#009ee3',
  },
});

export default ConfirmacaoPagamento;