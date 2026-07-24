import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform 
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from './apiConfig';
import { estilosMisTareasAsignadas } from '../styles/EstilosMisTareasAsignadas';

/*modulo donde se revisan las tareas que debe realizar el de manterimiento */

export default function MisTareasAsignadas({ route }) {
    const API_URL = BASE_URL;
    
    const { idUsuario , nombreUsuario  } = route.params || {};
    
    const [tareas, setTareas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Estados para el control del Modal de Finalización
    const [modalVisible, setModalVisible] = useState(false);
    const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
    const [notaCierre, setNotaCierre] = useState('');
    const [guardandoCambio, setGuardandoCambio] = useState(false);


    
    const cargarMisTareas = useCallback(async () => {
        if (!idUsuario) {
            Alert.alert("Error de Sesión", "No se encontró el ID del empleado.");
            setCargando(false);
            return;
        }
        try {
            
            const res = await axios.get(`${API_URL}/mis-tareas/${idUsuario}`, { timeout: 6000 });
            
            if (res.data.success) {
                
                const tareasActivas = res.data.tareas.filter(
                    t => t.estado.trim().toLowerCase() !== 'finalizado'
                );
                setTareas(tareasActivas);
            }
        } catch (error) {
            console.error('Error al cargar tareas específicas:', error);
            Alert.alert('Error de Red', 'No se pudieron sincronizar tus tareas.');
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, [API_URL, idUsuario]);

    
    useEffect(() => {
        cargarMisTareas();
    }, [cargarMisTareas]);


    const comenzarTarea = async (idTarea) => {
        try {
            const res = await axios.put(`${API_URL}/cambiar-estado-tarea/${idTarea}`, {
                nuevoEstado: 'En proceso'
            });
            if (res.data.success) {
                Alert.alert('¡Acción Registrada! 💪', 'La tarea ahora está en proceso.');
                cargarMisTareas(); // Recargamos para actualizar el badge visual instantáneamente
            }
        } catch (error) {
            console.error('Error al comenzar tarea:', error);
            Alert.alert('Error', 'No se pudo actualizar el estado.');
        }
    };

    
    const prepararFinalizar = (item) => {
        setTareaSeleccionada(item);
        setNotaCierre('');
        setModalVisible(true);
    };


    const guardarFinalizarTarea = async () => {
        if (!notaCierre.trim()) {
            Alert.alert('Nota Requerida ⚠️', 'Por favor escribe el resumen del trabajo técnico realizado.');
            return;
        }
        if (notaCierre.trim().length < 5) {
            Alert.alert('Nota Requerida ⚠️', 'Por favor escribe el resumen del trabajo técnico realizado completo.');
            return;
        }

        setGuardandoCambio(true);
        try {
            const res = await axios.put(`${API_URL}/cambiar-estado-tarea/${tareaSeleccionada.id_tarea}`, {
                nuevoEstado: 'Finalizado',
                nota_cierre: notaCierre.trim()
            });

            if (res.data.success) {
                setModalVisible(false);
                Alert.alert('Trabajo Concluido ✅', 'La tarea ha sido guardada con éxito.');
                
                //se usa filter para un filtrado mas rapido
                setTareas(prevTareas => 
                    prevTareas.filter(t => t.id_tarea !== tareaSeleccionada.id_tarea)
                );
            }
        } catch (error) {
            console.error('Error al finalizar la tarea en el servidor:', error);
            Alert.alert('Error', 'Hubo un problema al procesar el cierre en la base de datos.');
        } finally {
            setGuardandoCambio(false);
        }
    };

    // Diseño de tarjeta (Card) para cada elemento de la lista
    const renderItem = ({ item }) => {
        const estado = item.estado ? item.estado.trim().toLowerCase() : '';

        return (
            
            <View style={estilosMisTareasAsignadas.card}>
                <View style={estilosMisTareasAsignadas.cardHeader}>
                    <Text style={estilosMisTareasAsignadas.lugarTexto}>📍 Ubicación: {item.lugar}</Text>
                    <Text style={[
                        estilosMisTareasAsignadas.badge,
                        estado === 'en proceso' ? estilosMisTareasAsignadas.badgeProceso : estilosMisTareasAsignadas.badgePendiente
                    ]}>
                        {item.estado}
                    </Text>
                </View>
                
                <View style={estilosMisTareasAsignadas.divisor} />
                
                <View style={estilosMisTareasAsignadas.cardBody}>
                    <Text style={estilosMisTareasAsignadas.descripcionTexto}>🛠️ Instrucción: {item.tarea}</Text>
                    <Text style={estilosMisTareasAsignadas.usuarioTexto}>👤 Asignado por: {item.nombre_asignador}</Text>
                    <Text style={estilosMisTareasAsignadas.fechaTexto}>📅 Asignación: {item.fecha_asignacion_formateada}</Text>

                    
                    <View style={{ marginTop: 15 }}>
                        {estado === 'pendiente' && (
                            <TouchableOpacity 
                                style={[estilosMisTareasAsignadas.botonAccion, { backgroundColor: '#3B82F6' }]} 
                                onPress={() => comenzarTarea(item.id_tarea)}
                            >
                                <Text style={estilosMisTareasAsignadas.textoBoton}>📥 Aceptar y Empezar Tarea</Text>
                            </TouchableOpacity>
                        )}

                        {estado === 'en proceso' && (
                            <TouchableOpacity 
                                style={[estilosMisTareasAsignadas.botonAccion, { backgroundColor: '#10B981' }]} 
                                onPress={() => prepararFinalizar(item)}
                            >
                                <Text style={estilosMisTareasAsignadas.textoBoton}>✅ Finalizar Trabajo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={estilosMisTareasAsignadas.contenedorPrincipal}>
            <View style={estilosMisTareasAsignadas.headerTop}>
                <Text style={estilosMisTareasAsignadas.tituloHeader}>Mis Trabajos Asignados</Text>
                <Text style={estilosMisTareasAsignadas.operadorHeader}>{nombreUsuario}</Text>
            </View>
            <Text style={estilosMisTareasAsignadas.tituloSeccion}>Mis tareas</Text>
            {cargando ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={tareas}
                    keyExtractor={(item) => item.id_tarea.toString()}
                    renderItem={renderItem}
                    // Soporte nativo para arrastrar hacia abajo y refrescar la lista
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarMisTareas(); }} />
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text style={estilosMisTareasAsignadas.emptyText}>Excelente, no tienes trabajos pendientes por realizar. 👍</Text>
                    }
                />
            )}

            
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilosMisTareasAsignadas.modalCentrado}>
                    <View style={estilosMisTareasAsignadas.contenidoModal}>
                        <Text style={estilosMisTareasAsignadas.modalTitulo}>📝 Reporte de Cierre</Text>
                        <Text style={estilosMisTareasAsignadas.modalSub}>Escribe un breve informe técnico de lo solucionado:</Text>
                        
                        <TextInput 
                            style={estilosMisTareasAsignadas.inputNota}
                            placeholder="Ej: Se reparó el corto circuito en el tomacorriente y se validó el voltaje..."
                            placeholderTextColor="#94A3B8"
                            multiline={true}
                            numberOfLines={4}
                            value={notaCierre}
                            onChangeText={setNotaCierre}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 15, width: '100%' }}>
                            <TouchableOpacity 
                                style={[estilosMisTareasAsignadas.botonModal, { backgroundColor: '#94A3B8', flex: 1 }]} 
                                onPress={() => setModalVisible(false)}
                                disabled={guardandoCambio}
                            >
                                <Text style={estilosMisTareasAsignadas.textoBoton}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[estilosMisTareasAsignadas.botonModal, { backgroundColor: '#10B981', flex: 1 }]} 
                                onPress={guardarFinalizarTarea}
                                disabled={guardandoCambio}
                            >
                                {guardandoCambio ? <ActivityIndicator color="#fff"/> : <Text style={estilosMisTareasAsignadas.textoBoton}>Enviar Cierre</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

