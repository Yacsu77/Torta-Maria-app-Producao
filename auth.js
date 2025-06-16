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


// Função para obter dados do usuário (já existente, apenas para referência)
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return null;
  }
};

// Função de logout (já existente, apenas para referência)
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('userData');
    // Adicione aqui qualquer outra limpeza necessária
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
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