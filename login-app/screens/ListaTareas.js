import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl, ScrollView 
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from './apiConfig';
import { estilosListaTareas } from '../styles/EstilosListaTareas';

/*modulo donde se listan todas las tareas */

export default function ListaTareas({ navigation, route }) {
    
    const API_URL = BASE_URL;
    const { idUsuario = null, nombreUsuario = null, rol = null } = route.params || {};
    
    const [tareas, setTareas] = useState([]);
    const [tareasFiltradas, setTareasFiltradas] = useState([]);
    const [estadoFiltro, setEstadoFiltro] = useState('Todas');
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const cargarDatos = useCallback(async () => {
        try {
            const resTareas = await axios.get(`${API_URL}/listar-tareas`, { timeout: 6000 });
            if (resTareas.data.success && Array.isArray(resTareas.data.tareas)) {
                setTareas(resTareas.data.tareas);
                filtrarTareas(resTareas.data.tareas, estadoFiltro);
            } else {
                setTareas([]);
                setTareasFiltradas([]);
            }
        } catch (error) {
            console.error('Error al listar las tareas:', error);
            Alert.alert('Error', 'No se pudo conectar con el servidor para obtener las tareas.');
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, [API_URL, estadoFiltro]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setCargando(true);
            cargarDatos();
        });
        return unsubscribe;
    }, [navigation, cargarDatos]);

    const filtrarTareas = (todasLasTareas, estado) => {
        setEstadoFiltro(estado);
        if (estado === 'Todas') {
            setTareasFiltradas(todasLasTareas);
        } else {
            const filtradas = todasLasTareas.filter(t => t.estado.trim().toLowerCase() === estado.toLowerCase());
            setTareasFiltradas(filtradas);
        }
    };

    const botonEliminar = (idTarea) => {
        Alert.alert(
            '🚨 ¿Eliminar Tarea?',
            '¿Estás seguro de que deseas borrar de forma permanente esta tarea asignada?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, eliminar', style: 'destructive', onPress: () => eliminar(idTarea) }
            ]
        );
    };

    const eliminar = async (idTarea) => {
        try {
            const res = await axios.delete(`${API_URL}/eliminar-tarea/${idTarea}`);
            if (res.data.success) {
                Alert.alert("Éxito ✅", "Tarea eliminada correctamente.");
                cargarDatos();
            }
        } catch (error) {
            console.error("Error al eliminar la tarea:", error);
            Alert.alert("Error", "No se pudo eliminar la tarea seleccionada.");
        }
    };

    const renderTareas = ({ item }) => {
        // Normalizamos el estado para la condicional de visualización
        const estadoLimpio = item.estado ? item.estado.trim().toLowerCase() : '';

        return (
            <View style={estilosListaTareas.card}>
                <View style={estilosListaTareas.cardHeader}>
                    <Text style={estilosListaTareas.lugarTexto}>📍 Lugar: {item.lugar}</Text>
                    {rol === "Admin" && item.estado === 'Pendiente' && (
                        <TouchableOpacity 
                            onPress={() => botonEliminar(item.id_tarea)} 
                            style={{ padding: 6 }}
                        >
                            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 14 }}>Eliminar</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                <View style={estilosListaTareas.divisor} />
                
                <View style={estilosListaTareas.cardBody}>
                    <Text style={[
                        estilosListaTareas.estadoTexto, 
                        estadoLimpio === 'finalizado' ? estilosListaTareas.estadoFinalizado : 
                        estadoLimpio === 'en proceso' ? estilosListaTareas.estadoProceso : estilosListaTareas.estadoPendiente
                    ]}>
                        {item.estado}
                    </Text>
                    
                    <Text style={estilosListaTareas.descripcionTexto}>📋 Tarea: {item.tarea}</Text>
                    
                    <Text style={estilosListaTareas.usuarioTexto}>👤 Asignado por: {item.nombre_asignador }</Text>
                    <Text style={estilosListaTareas.usuarioTexto}>🛠️ Responsable: {item.nombre_responsable }</Text>
                    
                    { estadoLimpio === 'finalizado' &&(
                        <View>
                            <Text style={estilosListaTareas.descripcionTexto}>📋 Tarea: {item.nota_cierre}</Text>

                            <Text style={estilosListaTareas.fechaTexto}>📅 Fecha: {item.fecha_finalizada_formateada}</Text>
                        </View>
                    )

                    }
                    
                    {estadoLimpio === 'pendiente' && (rol === "Admin" || idUsuario === item.asignado_por || idUsuario === item.responsable) && (
                        <View style={{ flexDirection: 'row', marginTop: 15 }}>
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('AsignarTareas', { idUsuario, item })} 
                                style={estilosListaTareas.botonEditarCard}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Modificar Tarea Pendiente</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={estilosListaTareas.contenedorPrincipal}>
            <View style={estilosListaTareas.headerTop}>
                <Text style={estilosListaTareas.tituloHeader}>Gestión de Tareas</Text>
                <Text style={estilosListaTareas.operadorHeader}>👤 {nombreUsuario}</Text>
            </View>

            <Text style={estilosListaTareas.tituloSeccion}>Filtros por Estado</Text>
            
            <View style={{ height: 50, marginBottom: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilosListaTareas.contenedorFiltros}>
                    {['Todas', 'Pendiente', 'En proceso', 'Finalizado'].map((estado) => (
                        <TouchableOpacity
                            key={estado}
                            onPress={() => filtrarTareas(tareas, estado)}
                            style={[
                                estilosListaTareas.botonFiltro,
                                estadoFiltro === estado && estilosListaTareas.botonFiltroActivo
                            ]}
                        >
                            <Text style={[
                                estilosListaTareas.textoFiltro,
                                estadoFiltro === estado && estilosListaTareas.textoFiltroActivo
                            ]}>
                                {estado}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <TouchableOpacity 
                style={estilosListaTareas.botonNuevo} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AsignarTareas', { idUsuario, nombreUsuario })}
            >
                <Text style={estilosListaTareas.textoBotonNuevo}>➕ ASIGNAR NUEVA TAREA</Text>
            </TouchableOpacity>

            {cargando && !refreshing ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={tareasFiltradas}
                    keyExtractor={(item) => item.id_tarea.toString()}
                    renderItem={renderTareas}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); cargarDatos(); }} 
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text style={estilosListaTareas.emptyText}>
                            No hay tareas en estado "{estadoFiltro}" actualmente.
                        </Text>
                    }
                />
            )}
        </View>
    );
}

