import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/pt-br';

export default function DetalhesPedido({ navigation }) {
  const route = useRoute();
  const { pedidoId } = route.params;
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState(null);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://sivpt-betaapi.onrender.com/api/pedidos/detalhes/${pedidoId}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar detalhes');
        }

        const data = await response.json();
        setPedido(data.pedido);
        setItens(data.itens);
      } catch (error) {
        console.error('Erro:', error);
        alert('Não foi possível carregar os detalhes do pedido');
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhes();
  }, [pedidoId]);

  const formatarData = (data) => {
    return moment(data).format('DD/MM/YYYY - HH:mm');
  };

  const formatarStatus = (status) => {
    const statusMap = {
      1: 'Aguardando Pagamento',
      2: 'Pago',
      3: 'Em Preparação',
      4: 'Pronto para Retirada',
      5: 'Em Transporte',
      6: 'Entregue',
      7: 'Cancelado'
    };
    return statusMap[status] || 'Status Desconhecido';
  };

  const getStatusColor = (status) => {
    const colors = {
      1: styles.statusAguardando,
      2: styles.statusPago,
      3: styles.statusPreparacao,
      4: styles.statusPronto,
      5: styles.statusTransporte,
      6: styles.statusEntregue,
      7: styles.statusCancelado
    };
    return colors[status] || styles.statusDefault;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando detalhes...</Text>
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.center}>
        <Text>Pedido não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Pedido #{pedido.id}</Text>
        <Text style={[styles.status, getStatusColor(pedido.Situacao)]}>
          {formatarStatus(pedido.Situacao)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Pedido</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data:</Text>
          <Text style={styles.infoValue}>{formatarData(`${pedido.Data_pedido} ${pedido.Hora_Pedido}`)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValue}>{pedido.Tipo_Pedido === 1 ? 'Retirada' : 'Entrega'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Seção:</Text>
          <Text style={styles.infoValue}>{pedido.nome_secao || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itens do Pedido</Text>
        {itens.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.nome_produto}</Text>
            <View style={styles.itemDetails}>
              <Text style={styles.itemQty}>Qtd: {item.quantidade}</Text>
              <Text style={styles.itemPrice}>R$ {parseFloat(item.preco_unitario).toFixed(2)}</Text>
              <Text style={styles.itemTotal}>R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total do Pedido:</Text>
        <Text style={styles.totalValue}>R$ {parseFloat(pedido.Valor_pedido).toFixed(2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusAguardando: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  statusPago: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  statusPreparacao: {
    backgroundColor: '#D1ECF1',
    color: '#0C5460',
  },
  statusPronto: {
    backgroundColor: '#CCE5FF',
    color: '#004085',
  },
  statusTransporte: {
    backgroundColor: '#E2E3E5',
    color: '#383D41',
  },
  statusEntregue: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  statusCancelado: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
  },
  statusDefault: {
    backgroundColor: '#F8F9FA',
    color: '#212529',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQty: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});