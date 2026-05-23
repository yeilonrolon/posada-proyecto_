import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Mantenimiento from "./screens/Mantenimiento";
import EstadoBano from './screens/EstadoBano';
import Habitaciones from './screens/Habitaciones';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const Tab = createBottomTabNavigator();

export default function MenuInferior({route, navigation}) {
    const {idUsuario,nombreUsuario} = route.params || {};
  return (
    <Tab.Navigator 
              screenOptions={{
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
              }}>
      <Tab.Screen name="MantenimientoTab" component={Mantenimiento}  initialParams={{idUsuario,nombreUsuario}} options={{ title: 'PANEL MANTENIMIENTO', tabBarIcon:() =>(<MaterialIcons name="energy-savings-leaf" size={24} color="black" />) }}/>
      <Tab.Screen name="EstadoBanoTab" component={EstadoBano} initialParams={{idUsuario,nombreUsuario}} options={{title: 'ESTADOS DE BAÑOS', tabBarIcon:() =>(<MaterialIcons name="bathroom" size={24} color="black" />)}} />
      <Tab.Screen name="HabitacionesTab" component={Habitaciones} initialParams={{idUsuario,nombreUsuario}} options={{title: 'HABITACIONES', tabBarIcon:() =>(<MaterialIcons name="airline-seat-individual-suite" size={24} color="black" />)}} />
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