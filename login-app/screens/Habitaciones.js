import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

export default function Habitaciones({ navigation, route }) {
    // Configuración de conexión (Asegúrate de que la IP sea la de tu Linux Lite)
    const API_URL = BASE_URL;
    const { idUsuario, nombreUsuario } = route.params || {};
    
    const [habitaciones, setHabitaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);


    const cargarDatos = useCallback(async () => {
        try {
            // 1. Obtener Historial
            const resHabitaciones = await axios.get(`${API_URL}/listar-habitaciones`, {}, { timeout: 6000 });
            if (resHabitaciones.data.success) {
                setHabitaciones(resHabitaciones.data.habitacion);
            }
            
        } catch (error) {
            console.error('Error en Listar las habitaciones:', error);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor. Verifica que esté encendido.");
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    });

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setCargando(true);
            cargarDatos();
        });
        return unsubscribe;
    }, [navigation, cargarDatos]);

    const renderHabitacion = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.habitacionTexto}> Habitacion N{item.id_habitacion}</Text>
            </View>
            <View style={styles.divisor} />
            <View style={styles.cardBody}>
                <Text style={styles.estadoTexto}>{item.estado} </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.contenedorPrincipal}>
            <View style={styles.headerTop}>
                <Text style={styles.tituloHeader}>Estados de los habitaciones</Text>
                <Text style={styles.operadorHeader}>👤 {nombreUsuario || 'Operador'}</Text>
            </View>


            <Text style={styles.tituloSeccion}>Informacion de las habitaciones</Text>

            {cargando && !refreshing ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={habitaciones}
                    keyExtractor={(item) => item.id_habitacion.toString()}
                    renderItem={renderHabitacion}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarDatos(); }} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay registros guardados.</Text>}
                />
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    contenedorPrincipal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20 },
    headerTop: { marginTop: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
    operadorHeader: { fontSize: 13, color: '#64748B', backgroundColor: '#E2E8F0', padding: 5, borderRadius: 10 },
    
    // Estilo del botón restaurado
    botonNuevo: { 
        backgroundColor: '#525FE1', 
        paddingVertical: 15, 
        borderRadius: 15, 
        alignItems: 'center', 
        elevation: 4,
        marginBottom: 25 
    },
    textoBotonNuevo: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    
    tituloSeccion: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', marginBottom: 15, textTransform: 'uppercase' },
    card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    habitacionTexto: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    fechaTexto: { fontSize: 12, color: '#94A3B8' },
    divisor: { height: 1, backgroundColor: '#F1F5F9', my: 10, marginVertical: 10 },
    estadoTexto: { fontSize: 20, fontWeight: 'bold', color: '#525FE1' },
    observacionTexto: { fontSize: 16},
    unidad: { fontSize: 12, color: '#94A3B8' },
    usuarioTexto: { fontSize: 11, color: '#64748B', marginTop: 10 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});