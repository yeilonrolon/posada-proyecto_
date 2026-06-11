import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Pantallas
import Login from "./screens/Login"; 
import Admin from "./screens/Admin";
import Mantenimiento from "./screens/Mantenimiento";
import CrearLuzAgua from './screens/CrearLuzAgua';
import Registro from './screens/Registro'; 
import HistorialAccesos from './screens/HistorialAccesos';
import PanelUsuarios from './screens/PanelUsuarios';
import MostrarUsuariosInactivos from './screens/MostrarUsuariosInactivos';
import CalcularConsumo from './screens/CalcularConsumo';
import RegistroEstadoBano from './screens/RegistroEstadoBano';
import EstadoBano from './screens/EstadoBano';
import MenuInferior from './MenuInferior';
import Habitaciones from './screens/Habitaciones';
import RecuperacionClave from './screens/recuperacion_clave';
import RegistroCosto from './screens/RegistroCostoReparacion';
import CostoReparacion from './screens/CostoReparacion';
import PantallaCamara from './screens/PantallaCamara';
import PantallaListaQR from './screens/PantallaListaQR';
import qr from './screens/qr';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={({ navigation }) => ({
            headerTintColor: 'white',
            headerTitleAlign: 'center', // Centra los títulos en Android también
            headerStyle: { 
              backgroundColor: '#525FE1',
              elevation: 0, // Quita sombra en Android
              shadowOpacity: 0, // Quita sombra en iOS
            },
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              letterSpacing: 0.5,
            },
            // Botón global de Cerrar Sesión para pantallas principales
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.replace('Login')}
                style={styles.btnLogout}
              >
                <Text style={styles.btnLogoutText}>Salir</Text>
              </TouchableOpacity>
            ),
          })}
        >
          {/* Módulo de Acceso */}
          <Stack.Screen 
            name="Login" 
            component={Login} 
            options={{ headerShown: false }} 
          />
          
          {/* Paneles Principales */}
          <Stack.Screen 
            name="Admin" 
            component={Admin} 
            options={{ title: 'PANEL ADMINISTRATIVO' }} 
          />
          
          <Stack.Screen 
            name="Mantenimiento" 
            component={Mantenimiento} 
            options={{ title: 'PANEL MANTENIMIENTO' }} 
          />
          
          {/* Gestión de Gastos y Consumo */}
          <Stack.Screen 
            name="CrearLuzAgua" 
            component={CrearLuzAgua} 
            options={{ title: 'REGISTRO DE GASTOS', headerRight: null }}
          />

          <Stack.Screen 
            name="CalcularConsumo"
            component={CalcularConsumo}
            options={{ title: 'CALCULAR CONSUMO', headerRight: null }}
          />

          {/* Gestión de Personal */}
          <Stack.Screen 
            name="Registro" 
            component={Registro} 
            options={{ title: 'NUEVO OPERADOR', headerRight: null }} 
          />

          <Stack.Screen 
            name="PanelUsuarios"
            component={PanelUsuarios}
            options={{ title: 'GESTIÓN DE USUARIOS', headerRight: null }}
          />

          <Stack.Screen 
            name="MostrarUsuariosInactivos"
            component={MostrarUsuariosInactivos}
            options={{ title: 'PAPELERA DE USUARIOS', headerRight: null }}
          />

          {/* Auditoría */}
          <Stack.Screen 
            name="HistorialAccesos" 
            component={HistorialAccesos} 
            options={{ title: 'HISTORIAL DE INGRESOS', headerRight: null }} 
          />
          <Stack.Screen 
            name="RegistroEstadoBano"
            component={RegistroEstadoBano}
            options={{title: 'REGISTRO ESTADOS DE BAÑOS', headerRight:null}}
          />
          <Stack.Screen 
            name="EstadoBano"
            component={EstadoBano}
            options={{title: 'ESTADOS DE BAÑOS', headerRight:null}}
          />
          <Stack.Screen 
            name="Habitaciones"
            component={Habitaciones}
            options={{title: 'ESTADOS DE HABITACIONES', headerRight:null}}
          />
          <Stack.Screen 
            name="MenuInferior"
            component={MenuInferior}
            options={{ headerShown: false}}
          />
          <Stack.Screen 
          name="RecuperacionClave"
          component={RecuperacionClave}
          options={{ 
            title: 'RECUPERACIÓN DE CLAVE', 
            headerRight: null 
          }}
          />
          <Stack.Screen 
            name="RegistroCosto" 
            component={RegistroCosto} 
            options={{ title: 'REGISTRO DE COSTOS EXTRAS', headerRight: null }}
          />
          <Stack.Screen 
            name="CostoReparacion" 
            component={CostoReparacion} 
            options={{ title: 'HISTORIAL DE COSTOS DE REPARACION', headerRight: null }}
          />
          <Stack.Screen 
          name="PantallaCamara" 
          component={PantallaCamara} 
          options={{ title: 'Cámara QR' }} 
        />
        <Stack.Screen 
          name="PantallaListaQR" 
          component={PantallaListaQR} 
          options={{ title: 'Lista de QR' }} 
        />
        <Stack.Screen 
          name="qr" 
          component={qr} 
          options={{ title: 'Control de Activos QR' }} 
        />

        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  btnLogout: {
    marginRight: 15, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingVertical: 4,
    paddingHorizontal: 12, 
    borderRadius: 12 
  },
  btnLogoutText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 12 
  },
});