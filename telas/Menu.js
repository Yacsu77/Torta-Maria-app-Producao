import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, StyleSheet, StatusBar } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getCurrentSection } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Componente do cabeçalho personalizado
const CustomHeader = ({ navigation }) => {
  const [currentSection, setCurrentSection] = useState(null);
  const [selectedLoja, setSelectedLoja] = useState(null);

  useEffect(() => {
    const loadSectionData = async () => {
      const section = await getCurrentSection();
      setCurrentSection(section);
      
      const loja = await AsyncStorage.getItem('selectedLoja');
      if (loja) {
        setSelectedLoja(JSON.parse(loja));
      }
    };
    
    loadSectionData();
  }, []);

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: colors.primaryOrange }]}
        onPress={() => navigation.navigate('AbrirSeçãoModal')}
      >
        <MaterialIcons name="store" size={20} color={colors.white} />
        <Text style={[styles.headerButtonText, { color: colors.white }]}>
          {currentSection ? (selectedLoja?.Nome_loja || 'Loja Selecionada') : 'Escolher Loja'}
        </Text>
      </TouchableOpacity>
      
      <View style={{ flex: 1 }} />
      
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: colors.primaryGreen }]}
        onPress={() => navigation.navigate('SacolaModal')}
      >
        <MaterialIcons name="shopping-basket" size={20} color={colors.white} />
        <Text style={[styles.headerButtonText, { color: colors.white }]}>Sacola</Text>
      </TouchableOpacity>
    </View>
  );
};

// Componente principal do Menu com abas
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Produtos') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'Pontos') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Pedidos') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
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

// Stack principal com modais
export default function Menu() {
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