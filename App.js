import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getUserData } from './auth';

import TelaInicial from './telas/TelaInicial';
import Login from './telas/Login';
import Cadastro from './telas/Cadastro';
import Menu from './telas/Menu';

const Stack = createNativeStackNavigator();

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificarLogin = async () => {
      const user = await getUserData();
      setUsuarioLogado(user);
      setCarregando(false);
    };
    verificarLogin();
  }, []);

  if (carregando) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {usuarioLogado ? (
          <Stack.Screen name="Menu" component={Menu} />
        ) : (
          <>
            <Stack.Screen name="TelaInicial" component={TelaInicial} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Cadastro" component={Cadastro} />
            <Stack.Screen name="Menu" component={Menu} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
