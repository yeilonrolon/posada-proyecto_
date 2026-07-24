import React, { useState, useEffect, useCallback } from "react";
import { View, TouchableOpacity, Text, TextInput, ScrollView, Alert, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { BASE_URL } from './apiConfig';
import axios from 'axios';
import { Picker } from "@react-native-picker/picker";
import { estilosAsignarTareas } from "../styles/EstilosAsignarTareas";

/* Modulo para asignar tareas al de manterimiento*/


export default function AsignarTareas({ navigation, route }) {
    const API_URL = BASE_URL;
    const { idUsuario, item } = route.params || {};

    const [habitaciones, setHabitaciones] = useState([]);
    const [selecionadaHabitacion, setSelecionadaHabitacion] = useState("");
    
    const [usuarios, setUsuarios] = useState([]);
    const [seleccionadoResponsable, setSeleccionadoResponsable] = useState("");
    
    const [tarea, setTarea] = useState("");
    const [cargando, setCargando] = useState(false);
    
    //listar habitaciones
    const listarHabitaciones = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/listar-habitaciones-inactivas`, { timeout: 5000 });
            setHabitaciones(res.data.habitacion || []);
        } catch (error) {
            console.error('Error en listado de habitaciones inactivas:', error);
            Alert.alert("Error de Red", "No se pudo sincronizar el listado de habitaciones.");
            setHabitaciones([]);
        }
    }, [API_URL]);

    //listar usuarios
    const listarUsuarios = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/listar-usuarios`, { timeout: 5000 });
            setUsuarios(res.data.datos || res.data || []);
        } catch (error) {
            console.error('Error al obtener lista de usuarios:', error);
            Alert.alert("Error de Red", "No se pudo cargar la lista de empleados.");
            setUsuarios([]);
        }
    }, [API_URL]);

    
    useEffect(() => {
        listarHabitaciones();
        listarUsuarios();
    }, [listarHabitaciones, listarUsuarios]);

    //se extrae solo el numero para guardar
    useEffect(() => {
        if (item) {
            
            if (item.lugar && item.lugar.includes("Habitación N° ")) {
                const numeroHabitacion = item.lugar.replace("Habitación N° ", "").trim();
                setSelecionadaHabitacion(numeroHabitacion);
            } else if (item.lugar) {
                
                setSelecionadaHabitacion(item.lugar.toString());
            }

            setTarea(item.tarea || "");
            if (item.responsable) {
                setSeleccionadoResponsable(item.responsable.toString());
            }
        }
    }, [item, habitaciones, usuarios]); 

    const presionarBotonGuardar = () => {
        if (!selecionadaHabitacion || !tarea || !seleccionadoResponsable) {
            Alert.alert('Campos Incompletos 🛑', 'Por favor complete todos los campos obligatorios (Lugar, Responsable y Tarea).');
            return;
        }

        if (!idUsuario) {
            return Alert.alert("Error de Sesión", "No se detectó tu ID de usuario. Por favor, reinicia sesión.");
        }
         if (tarea.trim().length < 5) {
            return Alert.alert("Campo incompleto", "utilize un minimo de 5 caracteres para la tarea");
        }

        const textoAlerta = item && item.id_tarea 
            ? '¿Está seguro de querer actualizar esta tarea?' 
            : '¿Está seguro de querer asignar esta nueva tarea?';
        
        Alert.alert(
            'Confirmar Tarea 📋',
            textoAlerta,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, guardar', onPress: guardarRegistro }
            ],
            { cancelable: true }
        );
    };

    const guardarRegistro = async () => {
        setCargando(true);
        Keyboard.dismiss();
                    
        try {
            const esEdicion = item && item.id_tarea;
            const url = esEdicion ? `${API_URL}/editar-tarea/${item.id_tarea}` : `${API_URL}/asignar-tarea`;
            const metodo = esEdicion ? 'put' : 'post';
            
            const res = await axios[metodo](url, {
                lugar: Ubicacion(selecionadaHabitacion),
                tarea: tarea.trim(),
                responsable: parseInt(seleccionadoResponsable),
                asignado_por: parseInt(idUsuario)
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                Alert.alert(
                    "✅ Guardado", 
                    esEdicion ? "Tarea actualizada con éxito." : "Tarea asignada con éxito.",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Aviso", res.data.mensaje || "No se pudo procesar la tarea.");
            }
        } catch (e) {
            console.error("Error al guardar tarea:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor no responde. Asegúrese de que el sistema central esté en ejecución."
            );
        } finally {
            setCargando(false);
        }
    };

    const Ubicacion = (val) => {
        if (val === "Planta baja" || val === "Planta alta") return val;
        return `Habitación N° ${val}`;
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}>
            <ScrollView style={estilosAsignarTareas.contenedor} keyboardShouldPersistTaps="handled">
                <View style={estilosAsignarTareas.main}>
                    <Text style={estilosAsignarTareas.titulo}>{item ? "Editar Tarea" : "Asignación de Tareas"}</Text>
                    
                    <View style={estilosAsignarTareas.card}>
                        
            
                        <View>
                            <Text style={estilosAsignarTareas.label}>Lugar donde se realizará el trabajo *</Text>
                            <Picker 
                                style={estilosAsignarTareas.contenedorPiker} 
                                selectedValue={selecionadaHabitacion}
                                onValueChange={(itemValue) => setSelecionadaHabitacion(itemValue)}
                                dropdownIconColor="#525FE1"
                            >
                                <Picker.Item label="Selecciona una Ubicación" value="" />
                                <Picker.Item label="Planta baja" value="Planta baja" />
                                <Picker.Item label="Planta alta" value="Planta alta" />                    
                                {habitaciones.map((h) => (
                                    <Picker.Item  
                                        key={h.id_habitacion}
                                        label={`Habitación N° ${h.id_habitacion}`}
                                        value={h.id_habitacion.toString()}
                                    />
                                ))}
                            </Picker>
                        </View>

                        <View style={{ marginTop: 15 }}>
                            <Text style={estilosAsignarTareas.label}>Empleado Responsable *</Text>
                            <Picker 
                                style={estilosAsignarTareas.contenedorPiker} 
                                selectedValue={seleccionadoResponsable}
                                onValueChange={(itemValue) => setSeleccionadoResponsable(itemValue)}
                                dropdownIconColor="#525FE1"
                            >
                                <Picker.Item label="Selecciona al encargado" value="" />
                                {usuarios.map((responsable) => (
                                    <Picker.Item  
                                        key={responsable.id}
                                        label={`${responsable.nombre} (${responsable.usuario})`}
                                        value={responsable.id.toString()}
                                    />
                                ))}
                            </Picker>
                        </View>

                    
                        <View style={{ marginTop: 15, marginBottom: 20 }}>
                            <Text style={estilosAsignarTareas.label}>Detalle de la tarea a realizar *</Text>
                            <TextInput 
                                style={[estilosAsignarTareas.inputText, { height: 100, textAlignVertical: 'top' }]} 
                                placeholder="Describa a detalle el trabajo técnico o limpieza requerida..."
                                onChangeText={setTarea}
                                value={tarea}
                                multiline={true}
                                numberOfLines={4}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        
                    
                        <TouchableOpacity 
                            style={[estilosAsignarTareas.btn, { opacity: cargando ? 0.7 : 1 }]} 
                            onPress={presionarBotonGuardar} 
                            disabled={cargando}
                            activeOpacity={0.8}
                        >
                            {cargando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={estilosAsignarTareas.btnText}>
                                    {item ? "Actualizar Tarea" : "Asignar Tarea de Trabajo"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}