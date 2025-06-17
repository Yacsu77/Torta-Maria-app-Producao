import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  } catch (error) {
    console.log('Erro ao salvar dados:', error);
  }
};

export const updateUserLocal = async (updates) => {
  try {
    // Obter dados atuais do usuário
    const currentUserData = await getUserData();
    if (!currentUserData) throw new Error('Usuário não encontrado');
    
    // Atualizar os dados
    const updatedUser = { ...currentUserData, ...updates };
    
    // Salvar no AsyncStorage
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    
    return updatedUser;
  } catch (error) {
    console.error('Erro ao atualizar usuário localmente:', error);
    throw error;
  }
};


export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.log('Erro ao buscar dados:', error);
    return null;
  }
};

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('currentSection');
    await AsyncStorage.removeItem('tipoSecao');
    await AsyncStorage.removeItem('selectedLoja');
  } catch (error) {
    console.log('Erro ao fazer logout:', error);
  }
};

export const getCurrentSection = async () => {
  try {
    const sectionId = await AsyncStorage.getItem('currentSection');
    const sectionType = await AsyncStorage.getItem('tipoSecao');
    return sectionId ? { id: sectionId, tipo: sectionType } : null;
  } catch (error) {
    console.log('Erro ao buscar seção:', error);
    return null;
  }
};

export const clearCurrentSection = async () => {
  try {
    await AsyncStorage.removeItem('currentSection');
    await AsyncStorage.removeItem('tipoSecao');
    await AsyncStorage.removeItem('selectedLoja');
  } catch (error) {
    console.log('Erro ao limpar seção:', error);
    throw error;
  }
};