import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { getUserData, logoutUser } from '../auth';
import { Ionicons } from '@expo/vector-icons';

export default function Perfil({ navigation }) {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const data = await getUserData();
      setUser(data);
    };
    carregar();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logoutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: 'TelaInicial' }],
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6D00" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header com foto e nome */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image
                style={styles.avatar}
                source={user.foto ? { uri: user.foto } : require('../assets/default-avatar.png')}
              />
              <Text style={styles.userName}>{user.Nome_Cli}</Text>
              <Text style={styles.userEmail}>{user.Email_Cli}</Text>
            </View>
          </View>

          {/* Informações do perfil */}
          <View style={styles.profileInfo}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={22} color="#FF6D00" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Endereço</Text>
                  <Text style={styles.infoText}>{user.Endereco_Cli}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="map-outline" size={22} color="#FF6D00" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>CEP</Text>
                  <Text style={styles.infoText}>{user.Cep_Cli}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={22} color="#FF6D00" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Celular</Text>
                  <Text style={styles.infoText}>{user.Celular_Cli}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="id-card-outline" size={22} color="#FF6D00" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>CPF</Text>
                  <Text style={styles.infoText}>{user.CPF}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Botão de Logout */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="white" />
                <Text style={styles.logoutButtonText}>Sair da conta</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FF6D00',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 15,
    backgroundColor: '#E0E0E0',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileInfo: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 15,
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});