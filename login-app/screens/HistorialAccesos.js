import React, { useEffect, useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    ActivityIndicator, 
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: HISTORIAL DE ACCESOS
 * Función: Muestra quién ha entrado al sistema mediante la tabla de auditoría del backend.
 */
export default function HistorialAccesos() {
    const API_URL = BASE_URL;

    const [accesos, setAccesos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);

    // Función para obtener los datos del servidor (memorizada con useCallback)
    const obtenerAccesos = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/historial-accesos`, { timeout: 7000 });
            if (res.data.success && Array.isArray(res.data.datos)) {
                setAccesos(res.data.datos);
            }
        } catch (error) {
            console.error("Error al obtener accesos:", error);
            Alert.alert(
                "Error de Carga", 
                "No se pudo conectar con el servidor de la posada. Verifique la conexión WiFi."
            );
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    }, [API_URL]);

    // Carga inicial al montar el componente
    useEffect(() => {
        obtenerAccesos();
    }, [obtenerAccesos]);

    // Función para manejar el "pull-to-refresh"
    const alRefrescar = useCallback(() => {
        setRefrescando(true);
        obtenerAccesos();
    }, [obtenerAccesos]);

    // Diseño de cada tarjeta de acceso
    const renderAcceso = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.indicadorVerde} />
            <View style={styles.infoContainer}>
                <Text style={styles.nombreUsuario}>{item.nombre_usuario}</Text>
                <View style={styles.fechaContainer}>
                    <Text style={styles.iconoReloj}>🕒</Text>
                    <Text style={styles.fechaTexto}>{item.fecha_formateada}</Text>
                </View>
            </View>
            <View style={styles.tag}>
                <Text style={styles.tagText}>Ingreso</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.header}>
                <Text style={styles.titulo}>Auditoría de Accesos</Text>
                <Text style={styles.subtitulo}>Últimos inicios de sesión registrados</Text>
            </View>

            {cargando && !refrescando ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#525FE1" />
                    <Text style={styles.textoCargando}>Consultando base de datos...</Text>
                </View>
            ) : (
                <FlatList
                    data={accesos}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderAcceso}
                    contentContainerStyle={styles.listaContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refrescando} 
                            onRefresh={alRefrescar} 
                            colors={["#525FE1"]} // Android
                            tintColor="#525FE1"   // iOS
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>⚠️ Sin registros recientes.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F2F4F7' },
    header: { 
        padding: 20, 
        backgroundColor: '#FFFFFF', 
        borderBottomLeftRadius: 25, 
        borderBottomRightRadius: 25, 
        elevation: 3, 
        marginBottom: 8 
    },
    titulo: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
    subtitulo: { fontSize: 14, color: '#7f8c8d', marginTop: 4 },
    listaContainer: { paddingHorizontal: 15, paddingVertical: 10, paddingBottom: 30 },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    textoCargando: { marginTop: 10, color: '#7f8c8d' },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 12, 
        paddingVertical: 15,
        paddingHorizontal: 15,
        marginBottom: 10, 
        flexDirection: 'row', 
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    indicadorVerde: { width: 5, height: 40, backgroundColor: '#2ecc71', borderRadius: 3, marginRight: 12 },
    infoContainer: { flex: 1 },
    nombreUsuario: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 2 },
    fechaContainer: { flexDirection: 'row', alignItems: 'center' },
    iconoReloj: { fontSize: 12, marginRight: 4 },
    fechaTexto: { fontSize: 12, color: '#95a5a6' },
    tag: { backgroundColor: '#E8F8F0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    tagText: { color: '#2ecc71', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#bdc3c7', fontSize: 15 }
});