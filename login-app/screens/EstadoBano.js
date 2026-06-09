import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

export default function EstadoBano({ navigation, route }) {
    const API_URL = BASE_URL;
    
    // 1. Extraemos el 'rol' que viene de los parámetros de la ruta junto a los demás datos
    const { idUsuario, nombreUsuario, rol } = route.params || {};
    
    const [estados, setEstados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Alerta de mantenimiento preventivo (cada 15 días)
    const verificarAntiguedad = useCallback((datosServidor) => {
        const hoy = new Date();
        const QUINCE_DIAS = 15 * 24 * 60 * 60 * 1000;
        let estadosVencidos = [];

        datosServidor.forEach(item => {
            const ultimaFecha = new Date(item.ultima_fecha);
            if ((hoy - ultimaFecha) > QUINCE_DIAS) {
                estadosVencidos.push(item.num_habitacion);
            }
        });

        // Agregamos la condición de que solo alerte si NO es administrador
        if (estadosVencidos.length > 0 && rol !== "Admin") {
            Alert.alert(
                "⚠️ Pendiente de Registro",
                `Es necesario actualizar las lecturas de: ${estadosVencidos.join(' , ')}.`,
                [
                    { text: "Más tarde", style: "cancel" },
                    // Pasamos también el rol aquí al navegar
                    { text: "Ir a Registrar", onPress: () => navigation.navigate('RegistroEstadoBano', { idUsuario, nombreUsuario, rol }) }
                ]
            );
        }
    }, [navigation, idUsuario, nombreUsuario, rol]);

    const cargarDatos = useCallback(async () => {
        try {
            const resEstados = await axios.get(`${API_URL}/listabano`, {}, { timeout: 6000 });
            if (resEstados.data.success) {
                setEstados(resEstados.data.datos);
            }

            try {
                const resFechas = await axios.get(`${API_URL}/verificar-fecha-bano`, {}, { timeout: 4000 });
                if (resFechas.data.success) {
                    verificarAntiguedad(resFechas.data.datos);
                }
            } catch (e) {
                console.log("Aviso: No se pudo verificar antigüedad.");
            }

        } catch (error) {
            console.error('Error en Estado Baño:', error);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor. Verifica que esté encendido.");
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, [verificarAntiguedad]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setCargando(true);
            cargarDatos();
        });
        return unsubscribe;
    }, [navigation, cargarDatos]);

    const renderBano = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.habitacionTexto}> Habitacion N{item.num_habitacion}</Text>
                <Text style={styles.fechaTexto}>{item.fecha_lista}</Text>
            </View>
            <View style={styles.divisor} />
            <View style={styles.cardBody}>
                <Text style={styles.estadoTexto}>{item.estado} </Text>
                <Text style={styles.observacion}>{item.observaciones} </Text>
                <Text style={styles.usuarioTexto}>Registrado por: {item.nombre}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
            
            {rol == "Admin" && (
            <TouchableOpacity 
                onPress={() => navigation.navigate('RegistroEstadoBano', { idUsuario, item,rol })} 
                style={{flex: 1,backgroundColor: '#525FE1', paddingVertical: 10,borderRadius: 6,alignItems: 'center',justifyContent: 'center'}}>
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Editar</Text>
            </TouchableOpacity>
            )}
            </View>
        </View>
    );

    return (
        <View style={styles.contenedorPrincipal}>
            <View style={styles.headerTop}>
                <Text style={styles.tituloHeader}>Estados de los baños</Text>
                <Text style={styles.operadorHeader}>👤 {nombreUsuario || 'Operador'}</Text>
            </View>

            {/* 2. RENDERIZADO CONDICIONAL: Si el rol es diferente de Admin, muestra el botón */}
            {rol !== "Admin" && (
                <TouchableOpacity 
                    style={styles.botonNuevo} 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('RegistroEstadoBano', { idUsuario, nombreUsuario, rol })}
                >
                    <Text style={styles.textoBotonNuevo}>➕ NUEVA ESTADO</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.tituloSeccion}>Historial de Consumo</Text>

            {cargando && !refreshing ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={estados}
                    keyExtractor={(item) => item.id_estado.toString()}
                    renderItem={renderBano}
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
    divisor: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    estadoTexto: { fontSize: 20, fontWeight: 'bold', color: '#525FE1' },
    observacionTexto: { fontSize: 16},
    usuarioTexto: { fontSize: 11, color: '#64748B', marginTop: 10 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});