import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator,
    RefreshControl, Modal, TouchableOpacity, Alert
} from 'react-native';
import axios from "axios";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from "@expo/vector-icons";
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: PANEL DE USUARIOS (CRUD)
 * Función: Listar, editar y eliminar personal activo de la posada.
 */
export default function PanelUsuarios() {
    const API_URL = BASE_URL;

    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    
    // Estados para Modales
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    
    // Estados para Edición
    const [nombreEdit, setNombreEdit] = useState('');
    const [rolEdit, setRolEdit] = useState('');

    const obtenerUsuarios = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/listausuarios`);
            if (response.data.success) {
                setUsuarios(response.data.datos);
            }
        } catch (error) {
            console.error('Error:', error);
            Alert.alert("Error", "No se pudo conectar con la base de datos.");
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    }, []);

    useEffect(() => {
        obtenerUsuarios();
    }, [obtenerUsuarios]);

    const alRefrescar = () => {
        setRefrescando(true);
        obtenerUsuarios();
    };

    // Control de Modal Eliminar
    const abrirModalEliminar = (usuario) => {
        setUsuarioSeleccionado(usuario);
        setModalEliminar(true);
    };

    // Control de Modal Editar
    const abrirModalEditar = (usuario) => {
        setUsuarioSeleccionado(usuario);
        setNombreEdit(usuario.nombre);
        setRolEdit(usuario.rol);
        setModalEditar(true);
    };

    const confirmarEliminar = async () => {
        try {
            const res = await axios.put(`${API_URL}/eliminarusuario`, { id: usuarioSeleccionado.id });
            if (res.data.success) {
                setModalEliminar(false);
                obtenerUsuarios();
            }
        } catch (_error) {
            Alert.alert("Error", "No se pudo dar de baja al usuario.");
        }
    };

    const guardarCambios = async () => {
        if (!nombreEdit.trim() || !rolEdit) {
            Alert.alert("Atención", "Todos los campos son obligatorios.");
            return;
        }
        try {
            const res = await axios.put(`${API_URL}/actualizarusuario`, {
                id: usuarioSeleccionado.id,
                nombre: nombreEdit,
                rol: rolEdit
            });
            if (res.data.success) {
                setModalEditar(false);
                obtenerUsuarios();
            }
        } catch (_error) {
            Alert.alert("Error", "Error al actualizar datos.");
        }
    };

    const renderUsuario = ({ item }) => (
        <View style={styles.containerCard}>
            <View style={styles.infoCol}>
                <Text style={styles.nombreUser}>{item.nombre}</Text>
                <View style={[styles.badge, { backgroundColor: item.rol === 'admin' ? '#EEF2FF' : '#F0FDF4' }]}>
                    <Text style={[styles.badgeText, { color: item.rol === 'admin' ? '#4F46E5' : '#16A34A' }]}>
                        {item.rol?.toUpperCase()}
                    </Text>
                </View>
            </View>
            
            <View style={styles.accionesCol}>
                <TouchableOpacity onPress={() => abrirModalEditar(item)} style={styles.btnIcon}>
                    <FontAwesome5 name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => abrirModalEliminar(item)} style={styles.btnIcon}>
                    <FontAwesome5 name="user-minus" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.header}>
                <Text style={styles.titulo}>Control de Usuarios</Text>
                <Text style={styles.subtitulo}>Administra los accesos de la posada</Text>
            </View>

            {cargando && !refrescando ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={usuarios}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUsuario}
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />}
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay usuarios activos.</Text>}
                />
            )}

            {/* Modal Eliminar */}
            <Modal visible={modalEliminar} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalChico}>
                        <FontAwesome5 name="exclamation-circle" size={40} color="#ef4444" style={{marginBottom: 10}} />
                        <Text style={styles.mTitle}>¿Dar de baja?</Text>
                        <Text style={styles.mDesc}>El usuario {usuarioSeleccionado?.nombre} ya no podrá acceder.</Text>
                        <View style={styles.mRow}>
                            <TouchableOpacity onPress={() => setModalEliminar(false)} style={styles.mBtn}>
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmarEliminar} style={[styles.mBtn, {backgroundColor: '#ef4444'}]}>
                                <Text style={{color: 'white', fontWeight: 'bold'}}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Editar */}
            <Modal visible={modalEditar} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modalGrande}>
                        <Text style={styles.mTitle}>Editar Usuario</Text>
                        
                        <Text style={styles.label}>Nombre Completo</Text>
                        <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} />

                        <Text style={styles.label}>Nivel de Acceso</Text>
                        <View style={styles.rolesRow}>
                            {['admin', 'mantenimiento'].map((r) => (
                                <TouchableOpacity 
                                    key={r}
                                    onPress={() => setRolEdit(r)}
                                    style={[styles.rolBtn, rolEdit === r && styles.rolBtnActive]}
                                >
                                    <Text style={[styles.rolBtnText, rolEdit === r && {color: 'white'}]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.mRow}>
                            <TouchableOpacity onPress={() => setModalEditar(false)} style={styles.mBtn}>
                                <Text>Cerrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={guardarCambios} style={[styles.mBtn, {backgroundColor: '#525FE1'}]}>
                                <Text style={{color: 'white', fontWeight: 'bold'}}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 25, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    subtitulo: { fontSize: 14, color: '#64748B' },
    containerCard: { 
        backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, 
        flexDirection: 'row', alignItems: 'center', elevation: 2 
    },
    infoCol: { flex: 1 },
    nombreUser: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    accionesCol: { flexDirection: 'row' },
    btnIcon: { padding: 10, marginLeft: 5, backgroundColor: '#F1F5F9', borderRadius: 10 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalChico: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center' },
    modalGrande: { width: '90%', backgroundColor: 'white', borderRadius: 24, padding: 25 },
    mTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    mDesc: { textAlign: 'center', color: '#64748B', marginBottom: 20 },
    mRow: { flexDirection: 'row', marginTop: 20 },
    mBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 12 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 8 },
    input: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 20 },
    rolesRow: { flexDirection: 'row', justifyContent: 'space-between' },
    rolBtn: { flex: 0.48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
    rolBtnActive: { backgroundColor: '#525FE1', borderColor: '#525FE1' },
    rolBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8' }
});