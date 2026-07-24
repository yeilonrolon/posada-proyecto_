import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator,
    RefreshControl, Modal, TouchableOpacity, Alert, ScrollView
} from 'react-native';
import axios from "axios";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from "@expo/vector-icons";
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: PANEL DE USUARIOS (CRUD)
 * Función: Listar, editar y dar de baja al personal activo de la posada.
 */
export default function PanelUsuarios() {
    const API_URL = BASE_URL;

    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);

    // Área de preguntas para mostrar a la hora de editar el usuario
    const [pregunta1, setPregunta1] = useState('');
    const [pregunta2, setPregunta2] = useState('');
    const [cargandoPreguntas, setCargandoPreguntas] = useState(false);
    const [respuesta1, setRespuesta1] = useState('');
    const [respuesta2, setRespuesta2] = useState('');
    
    // Estados para Modales
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    
    // Estados para Edición
    const [nombreEdit, setNombreEdit] = useState('');
    const [rolEdit, setRolEdit] = useState('');

    const obtenerUsuarios = useCallback(async (mostrarLoadingCentral = true) => {
        if (mostrarLoadingCentral) setCargando(true);
        try {
            const response = await axios.get(`${API_URL}/listausuarios`, { timeout: 6000 });
            if (response.data.success && Array.isArray(response.data.datos)) {
                setUsuarios(response.data.datos);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            Alert.alert("Error", "No se pudo conectar con la base de datos de la posada.");
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    }, [API_URL]);

    useEffect(() => {
        obtenerUsuarios(true);
    }, [obtenerUsuarios]);

    const alRefrescar = useCallback(() => {
        setRefrescando(true);
        obtenerUsuarios(false);
    }, [obtenerUsuarios]);

    // Control de Modal Eliminar
    const abrirModalEliminar = (usuario) => {
        setUsuarioSeleccionado(usuario);
        setModalEliminar(true);
    };

    // Control de Modal Editar
    const abrirModalEditar = async (usuario) => {
        const username = usuario.usuario || usuario.nombre || '';

        setUsuarioSeleccionado(usuario);
        setNombreEdit(usuario.nombre || '');
        setRolEdit(usuario.rol || '');
        setPregunta1(usuario.pregunta1 || '');
        setRespuesta1(usuario.respuesta1 || '');
        setPregunta2(usuario.pregunta2 || '');
        setRespuesta2(usuario.respuesta2 || '');
        setCargandoPreguntas(true);
        setModalEditar(true);

        try {
            const res = await axios.post(`${API_URL}/recuperar-preguntas`, { usuario: username }, { timeout: 5000 });
            if (res.data.success) {
                setPregunta1(res.data.pregunta1 || usuario.pregunta1 || '');
                setRespuesta1(res.data.respuesta1 || usuario.respuesta1 || '');
                setPregunta2(res.data.pregunta2 || usuario.pregunta2 || '');
                setRespuesta2(res.data.respuesta2 || usuario.respuesta2 || '');
            }
        } catch (error) {
            console.error('Error cargando preguntas de seguridad:', error);
        } finally {
            setCargandoPreguntas(false);
        }
    };

    const confirmarEliminar = async () => {
        try {
            const res = await axios.put(`${API_URL}/eliminarusuario`, { id: usuarioSeleccionado.id }, { timeout: 5000 });
            if (res.data.success) {
                setModalEliminar(false);
                obtenerUsuarios(true);
                Alert.alert("Éxito", "Usuario dado de baja correctamente.");
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            Alert.alert("Error", "No se pudo dar de baja al usuario.");
        }
    };

    const guardarCambios = async () => {
        if (!nombreEdit.trim() || !rolEdit.trim() || !pregunta1.trim() || !respuesta1.trim() || !pregunta2.trim() || !respuesta2.trim()) {
            Alert.alert("Atención", "Todos los campos son obligatorios.");
            return;
        }
        if (nombreEdit.trim().length < 4) {
            Alert.alert("Atención", "Ingrese un minimo de 4 caracteres para el nombre");
            return;
        }
        try {
            const res = await axios.put(`${API_URL}/actualizarusuario`, {
                id: usuarioSeleccionado.id,
                nombre: nombreEdit.trim(),
                rol: rolEdit,
                pregunta1: pregunta1.trim().toLowerCase(),
                respuesta1: respuesta1.trim().toLowerCase(),
                pregunta2: pregunta2.trim().toLowerCase(),
                respuesta2: respuesta2.trim().toLowerCase()
            }, { timeout: 5000 });

            if (res.data.success) {
                setModalEditar(false);
                obtenerUsuarios(true);
                Alert.alert("Éxito", "Datos de usuario actualizados.");
            }
        } catch (error) {
            console.error('Error al actualizar datos:', error);
            Alert.alert("Error", "Error al actualizar datos en el servidor.");
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
                <TouchableOpacity onPress={() => abrirModalEditar(item)} style={styles.btnIcon} activeOpacity={0.6}>
                    <FontAwesome5 name="edit" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => abrirModalEliminar(item)} style={styles.btnIcon} activeOpacity={0.6}>
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
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={alRefrescar} colors={["#525FE1"]} />}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay usuarios activos.</Text>}
                />
            )}

            {/* Modal Eliminar */}
            <Modal visible={modalEliminar} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalChico}>
                        <FontAwesome5 name="exclamation-circle" size={40} color="#ef4444" style={{ marginBottom: 12 }} />
                        <Text style={[styles.mTitle, { fontSize: 18, textAlign: 'center' }]}>¿Dar de baja?</Text>
                        <Text style={styles.mDesc}>El usuario <Text style={{ fontWeight: '700', color: '#1E293B' }}>{usuarioSeleccionado?.nombre}</Text> ya no podrá acceder al sistema.</Text>
                        <View style={styles.mRow}>
                            <TouchableOpacity onPress={() => setModalEliminar(false)} style={styles.mBtn}>
                                <Text style={{ fontWeight: '600', color: '#64748B' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmarEliminar} style={[styles.mBtn, { backgroundColor: '#ef4444', marginLeft: 10 }]}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Editar */}
            <Modal visible={modalEditar} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modalGrande}>
                        <Text style={[styles.mTitle, { fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 15 }]}>Editar Usuario</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 15 }}>
                            <Text style={styles.label}>Nombre Completo</Text>
                            <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} placeholder="Ej. Juan Pérez" />

                            <Text style={styles.label}>Nivel de Acceso</Text>
                            <View style={styles.rolesRow}>
                                {['admin', 'mantenimiento'].map((r) => (
                                    <TouchableOpacity 
                                        key={r}
                                        onPress={() => setRolEdit(r)}
                                        style={[styles.rolBtn, rolEdit === r && styles.rolBtnActive]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.rolBtnText, rolEdit === r && { color: 'white' }]}>
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.preguntasContainer}>
                                <Text style={[styles.label, { color: '#1E293B', marginBottom: 12, fontSize: 14 }]}>⚙️ Preguntas de seguridad</Text>
                                
                                {cargandoPreguntas ? (
                                    <ActivityIndicator size="small" color="#525FE1" style={{ marginVertical: 15 }} />
                                ) : (
                                    <View>
                                        <Text style={styles.preguntaTextTitle}>Pregunta #1:</Text>
                                        <TextInput
                                            style={styles.inputModal}
                                            value={pregunta1}
                                            onChangeText={setPregunta1}
                                            placeholder="¿Nombre de tu primera mascota?"
                                            placeholderTextColor="#94A3B8"
                                        />
                                        <Text style={styles.preguntaTextTitle}>Respuesta #1:</Text>
                                        <TextInput
                                            style={styles.inputModal}
                                            value={respuesta1}
                                            onChangeText={setRespuesta1}
                                            placeholder="Respuesta 1"
                                            placeholderTextColor="#94A3B8"
                                        />
                                        <Text style={[styles.preguntaTextTitle, { marginTop: 8 }]}>Pregunta #2:</Text>
                                        <TextInput
                                            style={styles.inputModal}
                                            value={pregunta2}
                                            onChangeText={setPregunta2}
                                            placeholder="¿Ciudad de nacimiento de tu madre?"
                                            placeholderTextColor="#94A3B8"
                                        />
                                        <Text style={styles.preguntaTextTitle}>Respuesta #2:</Text>
                                        <TextInput
                                            style={styles.inputModal}
                                            value={respuesta2}
                                            onChangeText={setRespuesta2}
                                            placeholder="Respuesta 2"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View style={[styles.mRow, { marginTop: 10 }]}>
                            <TouchableOpacity onPress={() => setModalEditar(false)} style={styles.mBtn}>
                                <Text style={{ fontWeight: '600', color: '#64748B' }}>Cerrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={guardarCambios} style={[styles.mBtn, { backgroundColor: '#525FE1', marginLeft: 10 }]}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar</Text>
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
    subtitulo: { fontSize: 14, color: '#64748B', marginTop: 2 },
    containerCard: { 
        backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, 
        flexDirection: 'row', alignItems: 'center', elevation: 2 
    },
    infoCol: { flex: 1 },
    nombreUser: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    accionesCol: { flexDirection: 'row' },
    btnIcon: { padding: 10, marginLeft: 8, backgroundColor: '#F1F5F9', borderRadius: 10 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalChico: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
    modalGrande: { width: '90%', maxHeight: '85%', backgroundColor: 'white', borderRadius: 24, padding: 25, elevation: 5 },
    mTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    mDesc: { textAlign: 'center', color: '#64748B', marginTop: 8, marginBottom: 20, fontSize: 14, lineHeight: 20 },
    mRow: { flexDirection: 'row', justifyContent: 'space-between' },
    mBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#F1F5F9' },
    label: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 8 },
    input: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 15, color: '#1E293B' },
    rolesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    rolBtn: { flex: 0.48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
    rolBtnActive: { backgroundColor: '#525FE1', borderColor: '#525FE1' },
    rolBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    preguntasContainer: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    preguntaTextTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
    inputModal: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 10, color: '#1E293B' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8' }
});