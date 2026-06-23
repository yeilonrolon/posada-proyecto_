import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Mantenimiento from "./screens/Mantenimiento";
import EstadoBano from './screens/EstadoBano';
import Habitaciones from './screens/Habitaciones';
import CostoReparacion from './screens/CostoReparacion';
import PantallaPrincipal from './screens/qr';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const Tab = createBottomTabNavigator();

export default function MenuInferior({ route, navigation }) {
  const { idUsuario, nombreUsuario, rol } = route.params || {};

  return (
    <Tab.Navigator 
      screenOptions={{
        headerTintColor: 'white',
        headerTitleAlign: 'center', 
        headerStyle: { 
          backgroundColor: '#525FE1',
          elevation: 0, 
          shadowOpacity: 0, 
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
          letterSpacing: 0.5,
        },
        // Configuración global para colores de los Tabs
        tabBarActiveTintColor: '#525FE1', // Color cuando está seleccionado
        tabBarInactiveTintColor: '#64748b', // Color grisáceo apagado
        
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.replace('Login')}
            style={styles.btnLogout}
          >
            <Text style={styles.btnLogoutText}>Salir</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen 
        name="MantenimientoTab" 
        component={Mantenimiento}  
        initialParams={{ idUsuario, nombreUsuario }} 
        options={{ 
          title: 'PANEL DE MANTENIMIENTO', 
          tabBarLabel: 'Mantenimiento', // ✅ Corregido el typo
          tabBarIcon: ({ color, size }) => ( // ✅ Color dinámico del sistema
            <MaterialIcons name="energy-savings-leaf" size={size || 20} color={color} />
          ) 
        }}
      />
      
      <Tab.Screen 
        name="EstadoBanoTab" 
        component={EstadoBano} 
        initialParams={{ idUsuario, nombreUsuario }} 
        options={{
          title: 'ESTADOS DE BAÑOS', 
          tabBarLabel: 'Baños', 
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bathroom" size={size || 24} color={color} />
          )
        }} 
      />
      
      <Tab.Screen 
        name="HabitacionesTab" 
        component={Habitaciones} 
        initialParams={{ idUsuario, nombreUsuario }} 
        options={{
          title: 'ESTADOS DE HABITACIONES',
          tabBarLabel: 'Habitaciones', 
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="airline-seat-individual-suite" size={size || 20} color={color} />
          )
        }} 
      />
      
      <Tab.Screen 
        name="CostoReparacionTab" 
        component={CostoReparacion} 
        initialParams={{ idUsuario, nombreUsuario, rol }} 
        options={{
          title: 'COSTOS EXTRAS', 
          tabBarLabel: 'Costos extras',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="money" size={size || 20} color={color} />
          )
        }} 
      />
      
      <Tab.Screen 
        name="PantallaQr" 
        component={PantallaPrincipal} 
        initialParams={{ idUsuario, nombreUsuario, rol }} 
        options={{
          title: 'PANTALLA QR', 
          tabBarLabel: 'QR',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-2" size={size || 20} color={color} />
          )
        }} 
      />
    </Tab.Navigator>
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