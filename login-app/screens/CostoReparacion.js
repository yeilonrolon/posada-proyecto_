import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl, Modal,ScrollView 
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

export default function CostoReparacion({ navigation, route }) {
    
    const API_URL = BASE_URL;
    const { idUsuario, nombreUsuario, rol } = route.params || {};
    
    const [habitaciones, setHabitaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    

    const detalles = (item) => {
    setItemSeleccionado(item);
    setModalVisible(true);
    };

    const cargarDatos = useCallback(async () => {
        try {
            // 1. Obtener Historial
            const resCostos = await axios.get(`${API_URL}/listar-costo-reparacion`,  { timeout: 6000 });
            if (resCostos.data.success) {
                setHabitaciones(resCostos.data.habitacion);
            }
            
        } catch (error) {
            console.error('Error en Listar los costos extras:', error);
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
    const botonEliminar = (idCosto) => {
        Alert.alert(
            '🚨 ¿Eliminar Registro?',
            'Esta acción no se puede deshacer. ¿Estás seguro de que deseas borrar este reporte de costos?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, eliminar', style: 'destructive', onPress: () => eliminar(idCosto) }
            ]
        );
    };

    const eliminar = async (idCosto) => {
        try {
            const res = await axios.delete(`${API_URL}/eliminar-costo/${idCosto}`);
            if (res.data.success) {
                Alert.alert("Éxito ✅", "Registro eliminado correctamente.");
                cargarDatos();
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            Alert.alert("Error", "No se pudo eliminar el registro.");
        }
    };

    const renderCostos = ({ item }) => (
        <View style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={styles.habitacionTexto}> Ubicación: {item.ubicacion}</Text>
                {rol == "Admin" && (
                <TouchableOpacity 
                    onPress={() => botonEliminar(item.id_costo)} 
                    style={{ padding: 6 }}
                >
                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 14 }}>Eliminar</Text>
                </TouchableOpacity>
                )}
            </View>
            
            <View style={styles.divisor} />
            
            <View style={styles.cardBody}>
                <Text style={styles.estadoTexto}>{item.servicio} </Text>
                
                {item.servicio === 'Contratado' && item.nombre_contratado ? (
                    <View style={{ marginTop: 4, marginBottom: 4 }}>
                        <Text style={styles.estadoTexto}>Contratado: {item.nombre_contratado}</Text>
                        {item.telefono ? <Text style={styles.usuarioTexto}>📞 {item.telefono}</Text> : null}
                    </View>
                ) : null}
                <Text style={styles.usuarioTexto}>Materiales: {item.materiales}</Text>
                <Text style={styles.usuarioTexto}>Costo total: {item.costo_final}</Text>
                <Text style={styles.usuarioTexto}>Registrado por: {item.registrado_por}</Text>
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
                    
                    <TouchableOpacity 
                        onPress={() => detalles(item)} 
                        activeOpacity={0.8}
                        style={{flex: 1,backgroundColor: '#E2E8F0', paddingVertical: 10,borderRadius: 6,alignItems: 'center',justifyContent: 'center'}}>
                        <Text style={{ color: '#334155', fontWeight: '600', fontSize: 14 }}>Detalles</Text>
                    </TouchableOpacity>
                    
                    {rol == "Admin" && (
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('RegistroCosto', { idUsuario, item })} 
                        style={{flex: 1,backgroundColor: '#525FE1', paddingVertical: 10,borderRadius: 6,alignItems: 'center',justifyContent: 'center'}}>
                        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Editar</Text>
                    </TouchableOpacity>
                    )}
                    
                </View>
            </View>
        </View>
    );

    return (
        
        <View style={styles.contenedorPrincipal}>
            <View style={styles.headerTop}>
                <Text style={styles.tituloHeader}>Registro de costos extras</Text>
                <Text style={styles.operadorHeader}>👤 {nombreUsuario || 'Operador'}</Text>
            </View>


            <Text style={styles.tituloSeccion}>Informacion Costos extras</Text>
            <TouchableOpacity 
                            style={styles.botonNuevo} 
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('RegistroCosto', { idUsuario, nombreUsuario })}
                        >
                            <Text style={styles.textoBotonNuevo}>➕ NUEVO COSTO EXTRA</Text>
            </TouchableOpacity>
            {cargando && !refreshing ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={habitaciones}
                    keyExtractor={(item) => item.id_costo.toString()}
                    renderItem={renderCostos}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarDatos(); }} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay registros guardados.</Text>}
                />
            )}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalCentrado}>
                    <View style={styles.contenidoModal}>
                        <ScrollView 
                            style={{ width: '100%' }} 
                            contentContainerStyle={{ paddingBottom: 10 }}
                            showsVerticalScrollIndicator={true}
                        >
                            <Text style={styles.modalTitulo}>📋 Detalles del Reporte</Text>
                            
                            {itemSeleccionado && (
                                <View style={{ marginVertical: 15, width: '100%' }}>
                                    <Text style={styles.detalleText}>Planta o Habitación: {itemSeleccionado.ubicacion}</Text>
                                    <Text style={styles.detalleText}>Tipo de Servicio: {itemSeleccionado.servicio}</Text>
                                    
                                    {itemSeleccionado.servicio === 'Contratado' && (
                                        <View style={styles.contratado}>
                                            <Text style={styles.detalleText}>👤 Nombre: {itemSeleccionado.nombre_contratado}</Text>
                                            <Text style={styles.detalleText}>Cédula: {itemSeleccionado.cedula}</Text>
                                            <Text style={styles.detalleText}>Teléfono: {itemSeleccionado.telefono}</Text>
                                            <Text style={styles.detalleText}>Costo de Contratación: {itemSeleccionado.costo} {itemSeleccionado.moneda}</Text>
                                        </View>
                                    )}

                                    <Text style={styles.detalleText}>Lista de materiales: {itemSeleccionado.materiales}</Text>
                                    <Text style={styles.detalleText}>Costo total: {itemSeleccionado.costo_final} {itemSeleccionado.moneda}</Text>
                                    <Text style={styles.detalleText}>fecha de registro: {itemSeleccionado.fecha_lista}</Text>
                                    <Text style={styles.detalleText}>Auditoría (Revisado por): {itemSeleccionado.registrado_por}</Text>
                                </View>
                            )}

                            
                            <TouchableOpacity 
                                style={styles.botonCerrarModal} 
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.textoBotonCerrar}>Volver Atrás</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    usuarioTexto: { fontSize: 15, color: '#000000', marginTop: 10 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
    fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 15 },
    modalCentrado: {flex: 1,justifyContent: 'center',alignItems: 'center',backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    contenidoModal: { backgroundColor: '#fff', width: '100%', maxHeight: '90%', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 5 },
    modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 15 },
    detalleText: {fontSize: 16,fontWeight: '700',color: '#000000',marginTop: 8},
    contratado:{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    botonCerrarModal: { backgroundColor: '#757ee1', paddingVertical: 10, borderRadius: 6, width: '100%', alignItems: 'center' }
});