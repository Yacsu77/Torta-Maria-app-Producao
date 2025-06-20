import React, { useState, useEffect, createContext, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, StyleSheet, StatusBar, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import Produtos from './Produtos';
import Perfil from './Perfil';
import Pontos from './Pontos';
import Pedidos from './Pedidos';
import AbrirSeção from './AbrirSecao';
import Sacola from './Sacola';
import CriarPedido from './CriarPedidos';
import Pagamento from './Pagamento';
import ConfirmacaoPagamentos from './ConfirmacaoPagamento';
import DetalhesProntos from './DetalhesProntos';
import DetalheProduto from './DetalheProduto';
import Vadecombo from './Vadecombo';

// Criando o contexto para compartilhar o estado global
const AppContext = createContext();

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// Cores da paleta
const colors = {
  primaryGreen: '#2E7D32',
  darkGreen: '#1B5E20',
  lightGreen: '#81C784',
  primaryOrange: '#FB8C00',
  darkOrange: '#F57C00',
  lightOrange: '#FFB74D',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  darkText: '#212121'
};

// Função para agrupar produtos (simulação)
const agruparProdutos = (produtos) => {
  // Implemente sua lógica de agrupamento aqui
  return produtos;
};

// Componente do cabeçalho personalizado
const CustomHeader = ({ navigation }) => {
  const { sacolaCount, selectedLoja } = useContext(AppContext);

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: colors.primaryOrange }]}
        onPress={() => navigation.navigate('AbrirSeçãoModal')}
      >
        <MaterialIcons name="store" size={20} color={colors.white} />
        <Text style={[styles.headerButtonText, { color: colors.white }]}>
          {selectedLoja ? selectedLoja.Nome_loja : 'Escolher Loja'}
        </Text>
      </TouchableOpacity>
      
      <View style={{ flex: 1 }} />
      
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: colors.primaryOrange }]}
        onPress={() => navigation.navigate('SacolaModal')}
      >
        <MaterialIcons name="shopping-basket" size={20} color={colors.white} />
        <Text style={[styles.headerButtonText, { color: colors.white }]}>
          Sacola {sacolaCount > 0 ? `(${sacolaCount})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Componente principal do Menu com abas
function MainTabs() {
  const { loadSacolaCount } = useContext(AppContext);

  // Atualiza a contagem da sacola sempre que a tab muda
  const handleTabPress = () => {
    loadSacolaCount();
  };

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Produtos') {
            return (
              <Image 
                source={require('../assets/torta-de-maca.png')} 
                style={{ width: size, height: size, tintColor: color }}
              />
            );
          }
          
          let iconName;
          if (route.name === 'Pontos') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Pedidos') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarOnPress: ({ navigation, defaultHandler }) => {
          handleTabPress();
          defaultHandler();
        },
        tabBarActiveTintColor: colors.primaryOrange,
        tabBarInactiveTintColor: colors.darkText,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: colors.darkText,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 90,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarItemStyle: {
          marginVertical: 5
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5
        },
        headerStyle: {
          backgroundColor: colors.primaryGreen,
          elevation: 0,
          shadowOpacity: 0,
          height: 0
        },
        headerTitleStyle: {
          color: colors.white,
          fontWeight: 'bold',
          fontSize: 20
        },
        headerTintColor: colors.white,
        headerTitleAlign: 'center',
        header: () => <CustomHeader navigation={navigation} />
      })}
    >
      <Tab.Screen 
        name="Produtos" 
        component={Produtos} 
        options={{ title: 'Cardápio' }}
      />
      <Tab.Screen name="Pontos" component={Pontos} />
      <Tab.Screen name="Pedidos" component={Pedidos} />
      <Tab.Screen name="Perfil" component={Perfil} />
    </Tab.Navigator>
  );
}

// Provedor de contexto para gerenciar o estado global
const AppProvider = ({ children }) => {
  const [sacolaCount, setSacolaCount] = useState(0);
  const [selectedLoja, setSelectedLoja] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);

  // Carrega a seção atual e a loja selecionada
  const loadSectionData = async () => {
    try {
      const section = await getCurrentSection();
      setCurrentSection(section);
      
      const loja = await AsyncStorage.getItem('selectedLoja');
      if (loja) {
        setSelectedLoja(JSON.parse(loja));
      }
    } catch (error) {
      console.error('Erro ao carregar dados da seção:', error);
    }
  };

  // Carrega a contagem de itens na sacola
  const loadSacolaCount = async () => {
    if (!currentSection) return;

    try {
      // Carrega produtos
      const responseProdutos = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/itens/${currentSection.id}`);
      const produtosCount = responseProdutos.data.length || 0;

      // Carrega combos
      const responseCombos = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/combos/${currentSection.id}`);
      const combosCount = responseCombos.data.length || 0;

      // Carrega promoções
      const responsePromocoes = await axios.get(`https://sivpt-betaapi.onrender.com/api/sacola/listar/pontos/${currentSection.id}`);
      const promocoesCount = responsePromocoes.data.length || 0;

      setSacolaCount(produtosCount + combosCount + promocoesCount);
    } catch (error) {
      console.error('Erro ao carregar contagem da sacola:', error);
      setSacolaCount(0);
    }
  };

  // Atualiza a loja selecionada
  const updateSelectedLoja = async (loja) => {
    try {
      await AsyncStorage.setItem('selectedLoja', JSON.stringify(loja));
      setSelectedLoja(loja);
      loadSacolaCount(); // Atualiza a contagem da sacola quando a loja muda
    } catch (error) {
      console.error('Erro ao atualizar loja selecionada:', error);
    }
  };

  // Carrega os dados iniciais
  useEffect(() => {
    loadSectionData();
  }, []);

  // Atualiza a contagem da sacola quando a seção ou loja muda
  useEffect(() => {
    if (currentSection && selectedLoja) {
      loadSacolaCount();
    }
  }, [currentSection, selectedLoja]);

  return (
    <AppContext.Provider value={{
      sacolaCount,
      selectedLoja,
      currentSection,
      loadSacolaCount,
      updateSelectedLoja
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Stack principal com modais
function MenuStack() {
  return (
    <>
      <StatusBar backgroundColor={colors.darkGreen} barStyle="light-content" />

      <RootStack.Navigator mode="modal">
        <RootStack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      
        <RootStack.Screen
          name="AbrirSeçãoModal"
          component={AbrirSeção}
          options={{ 
            headerShown: false,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: 'rgba(0,0,0,0.5)' },
          }}
        />

        <RootStack.Screen
          name="DetalhesProntos"
          component={DetalhesProntos}
          options={{ 
            headerShown: false,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: 'rgba(0,0,0,0.5)' },
          }}
        />

        <RootStack.Screen
          name="DetalheProduto"
          component={DetalheProduto}
          options={{ 
            headerShown: false,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: 'rgba(0,0,0,0.5)' },
          }}
        />

        <RootStack.Screen
          name="Vadecombo"
          component={Vadecombo}
          options={{ 
            headerShown: false,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: 'rgba(0,0,0,0.5)' },
          }}
        />
        
        <RootStack.Screen
          name="SacolaModal"
          component={Sacola}
          options={{ 
            headerShown: false,
            cardOverlayEnabled: true,
            cardStyle: { backgroundColor: 'rgba(0,0,0,0.5)' },
          }}
        />

        <RootStack.Screen
          name="CriarPedidos"
          component={CriarPedido}
          options={{ headerShown: false }}
        />

        <RootStack.Screen
          name="Pagamento"
          component={Pagamento}
          options={{ headerShown: false }}
        />

        <RootStack.Screen
          name="ConfirmacaoPagamentos"
          component={ConfirmacaoPagamentos}
          options={{ headerShown: false }}
        />
      </RootStack.Navigator>
    </>
  );
}

// Componente principal que envolve tudo com o Provider
export default function Menu() {
  return (
    <AppProvider>
      <MenuStack />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primaryGreen,
    height: 120
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  headerButtonText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14
  },
});