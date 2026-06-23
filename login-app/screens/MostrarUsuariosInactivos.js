import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { FontAwesome5 } from "@expo/vector-icons";
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: BAJAS DE PERSONAL (USUARIOS INACTIVOS)
 * Función: Permite listar y reactivar el acceso de los empleados inactivos.
 */
export default function MostrarUsuariosInactivos() {
    const API_URL = BASE_URL;

    const [usuariosInactivos, setUsuariosInactivos] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [refrescando, setRefrescando] = useState(false);
    const [modalActivo, setModalActivo] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    // Obtener lista de usuarios inactivos
    const obtenerInactivos = useCallback(async (mostrarLoadingCentral = true) => {
        if (mostrarLoadingCentral) setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/usuariosinactivos`, { timeout: 6000 });
            if (response.data.success && Array.isArray(response.data.datos)) {
                setUsuariosInactivos(response.data.datos);
            }
        } catch (error) {
            console.error('Error al cargar inactivos:', error);
            Alert.alert("Error de Conexión", "No se pudo conectar con el servidor de la posada.");
        } finally {
            setLoading(false);
            setRefrescando(false);
        }
    }, [API_URL]);

    // Carga inicial al montar el componente
    useEffect(() => {
        obtenerInactivos(true);
    }, [obtenerInactivos]);

    // Manejo del Pull to Refresh
    const alRefrescar = useCallback(() => {
        setRefrescando(true);
        obtenerInactivos(false);
    }, [obtenerInactivos]);

    // Procesar la reactivación del usuario
    const ejecutarReactivacion = async (id) => {
        if (!id) return;
        try {
            const response = await axios.put(`${API_URL}/reactivarusuario`, { id }, { timeout: 5000 });
            if (response.data.success) {
                Alert.alert("Éxito", "Usuario reactivado correctamente.");
                setModalActivo(false);
                obtenerInactivos(true);
            } else {
                Alert.alert("Atención", response.data.mensaje || "No se pudo reactivar al usuario.");
            }
        } catch (error) {
            console.error('Error al reactivar:', error);
            Alert.alert("Error", "Ocurrió un problema en el servidor al intentar reactivar.");
        }
    };

    const renderUsuario = ({ item }) => (
        <View style={styles.containerCard}>
            <View style={styles.colInfo}>
                <Text style={styles.nombreTexto}>{item.nombre || 'Sin nombre'}</Text>
                <Text style={styles.textoRolValor}>{item.rol ? item.rol.toUpperCase() : 'SIN ROL'}</Text>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    setUsuarioSeleccionado(item);
                    setModalActivo(true);
                }}
                style={styles.botonAccion}
                activeOpacity={0.6}
            >
                <FontAwesome5 name="user-plus" size={18} color="#27ae60" />
                <Text style={styles.textoAccion}>Reactivar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.header}>
                <Text style={styles.titulo}>Bajas de Personal</Text>
                <Text style={styles.subtitulo}>Personal inactivo que puede ser reactivado</Text>
            </View>

            {loading && !refrescando ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size='large' color='#525FE1' />
                    <Text style={styles.textoCargando}>Buscando registros...</Text>
                </View>
            ) : (
                <FlatList
                    data={usuariosInactivos} 
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderUsuario}
                    contentContainerStyle={styles.listaContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refrescando} 
                            onRefresh={alRefrescar} 
                            colors={["#525FE1"]}
                            tintColor="#525FE1"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>⚠️ No hay usuarios inactivos registrados.</Text>
                        </View>
                    }
                />
            )}

            {/* MODAL DE CONFIRMACIÓN */}
            <Modal visible={modalActivo} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitulo}>Confirmar Operación</Text>
                        <Text style={styles.modalCuerpo}>
                            ¿Está seguro de que desea reactivar a <Text style={{fontWeight: '700'}}>{usuarioSeleccionado?.nombre}</Text>? Volverá a tener acceso al sistema.
                        </Text>
                        <View style={styles.modalBotones}>
                            <TouchableOpacity 
                                onPress={() => setModalActivo(false)} 
                                style={styles.botonCancelar}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.textoCancelar}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => ejecutarReactivacion(usuarioSeleccionado?.id)} 
                                style={styles.botonConfirmar}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.textoConfirmar}>Activar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    containerCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 15, 
        backgroundColor: '#FFFFFF', 
        marginBottom: 10, 
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    colInfo: { flex: 1 },
    nombreTexto: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 2 },
    textoRolValor: { color: '#7f8c8d', fontSize: 13, fontWeight: '500' },
    botonAccion: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
    textoAccion: { fontSize: 11, color: '#27ae60', marginTop: 4, fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#bdc3c7', fontSize: 15, textAlign: 'center' },
    
    // Estilos del Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalView: { backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, width: '85%', elevation: 10 },
    modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
    modalCuerpo: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 20 },
    modalBotones: { flexDirection: 'row', justifyContent: 'flex-end' },
    botonCancelar: { paddingVertical: 10, paddingHorizontal: 18, marginRight: 8 },
    textoCancelar: { color: '#7f8c8d', fontWeight: '600', fontSize: 15 },
    botonConfirmar: { backgroundColor: '#525FE1', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    textoConfirmar: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 }
});