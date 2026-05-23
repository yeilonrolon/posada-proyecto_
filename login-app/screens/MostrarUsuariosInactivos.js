import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, Modal 
} from 'react-native';
// CORRECCIÓN: Uso correcto de SafeAreaView de la librería externa
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { FontAwesome5 } from "@expo/vector-icons";
import { BASE_URL } from './apiConfig';

export default function MostrarUsuariosInactivos() {
    // IMPORTANTE: Tu backend corre en el 3001 según el código original
    const API_URL = BASE_URL;

    // Verificamos que el estado esté bien definido
    const [usuariosInactivos, setUsuariosInactivos] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [refrescando, setRefrescando] = useState(false);
    const [modalActivo, setModalActivo] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    const obtenerInactivos = useCallback(async () => {
        if (!refrescando) setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/usuariosinactivos`, { timeout: 6000 });
            if (response.data.success) {
                // Seteamos los datos asegurándonos de que sea un array
                setUsuariosInactivos(response.data.datos || []);
            }
        } catch (error) {
            console.error('Error al cargar:', error);
            Alert.alert("Error", "No se pudo conectar con el servidor de la posada.");
        } finally {
            setLoading(false);
            setRefrescando(false);
        }
    }, [refrescando]);

    useEffect(() => {
        obtenerInactivos();
    }, [obtenerInactivos]);

    const alRefrescar = () => {
        setRefrescando(true);
        obtenerInactivos();
    };

    const ejecutarReactivacion = async (id) => {
        if (!id) return;
        try {
            const response = await axios.put(`${API_URL}/reactivarusuario`, { id });
            if (response.data.success) {
                Alert.alert("Éxito", "Usuario reactivado correctamente.");
                setModalActivo(false);
                obtenerInactivos();
            }
        } catch (error) {
            Alert.alert("Error", "No se pudo reactivar al usuario.");
        }
    };

    const renderUsuario = ({ item }) => (
        <View style={styles.containerCard}>
            <View style={styles.colInfo}>
                <Text style={styles.nombreTexto}>{item.nombre || 'Sin nombre'}</Text>
                <Text style={styles.textoRolValor}>{item.rol?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    setUsuarioSeleccionado(item);
                    setModalActivo(true);
                }}
                style={styles.botonAccion}
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
            </View>

            {loading && !refrescando ? (
                <ActivityIndicator size='large' color='#525FE1' style={{marginTop: 20}} />
            ) : (
                <FlatList
                    // CORRECCIÓN: Aquí es donde daba el error. 
                    // Debe coincidir con el nombre del useState arriba.
                    data={usuariosInactivos} 
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUsuario}
                    refreshControl={
                        <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No hay usuarios inactivos.</Text>
                    }
                />
            )}

            {/* MODAL DE CONFIRMACIÓN */}
            <Modal visible={modalActivo} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitulo}>Confirmar</Text>
                        <Text>¿Reactivar a {usuarioSeleccionado?.nombre}?</Text>
                        <View style={styles.modalBotones}>
                            <TouchableOpacity onPress={() => setModalActivo(false)} style={styles.botonCancelar}>
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => ejecutarReactivacion(usuarioSeleccionado?.id)} 
                                style={styles.botonConfirmar}
                            >
                                <Text style={{color: '#fff'}}>Activar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Estilos básicos (puedes mantener los tuyos, solo ajusté los necesarios)
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: '#fff' },
    titulo: { fontSize: 22, fontWeight: 'bold' },
    containerCard: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', margin: 10, borderRadius: 10 },
    colInfo: { flex: 1 },
    nombreTexto: { fontSize: 16, fontWeight: 'bold' },
    textoRolValor: { color: 'gray' },
    botonAccion: { alignItems: 'center' },
    textoAccion: { fontSize: 10, color: '#27ae60' },
    emptyText: { textAlign: 'center', marginTop: 50 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalView: { backgroundColor: '#fff', padding: 20, borderRadius: 20, width: '80%' },
    modalBotones: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' },
    botonCancelar: { padding: 10 },
    botonConfirmar: { backgroundColor: '#525FE1', padding: 10, borderRadius: 10 }
});