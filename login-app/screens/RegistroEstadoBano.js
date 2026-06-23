import React, { useState, useEffect, useCallback } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, Keyboard } from "react-native";
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { BASE_URL } from './apiConfig';
import { estiloRegistroBano } from "../styles/EstilosRegistroBano";

/**
 * PANTALLA: REGISTRO / EDICIÓN DE ESTADO DE BAÑOS
 * Función: Permite reportar o actualizar averías y estados operativos de los baños de cada habitación.
 */
export default function RegistroEstadoBano({ navigation, route }) {
    const API_URL = BASE_URL;
    const { idUsuario, item } = route.params || {};

    const [habitaciones, setHabitaciones] = useState([]);
    const [selecionadaHabitacion, setSelecionadaHabitacion] = useState("");
    const [observacion, setObservacion] = useState("");
    const [estado, setEstado] = useState("Activo");
    const [problemas, setProblemas] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Cargar datos si se pasa un item para edición
    useEffect(() => {
        if (item) {
            // Fallback en caso de que venga mapeado como id_habitacion o num_habitacion
            const idHab = item.id_habitacion || item.num_habitacion || "";
            setSelecionadaHabitacion(idHab.toString());
            setEstado(item.estado || "Activo");
            setObservacion(item.observaciones || "");
            if (item.observaciones && item.observaciones.trim() !== "") {
                setProblemas(true);
            }
        }
    }, [item]);

    // Obtener la lista de habitaciones disponibles
    const listarHabitaciones = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/listar-habitaciones`, { timeout: 5000 });
            if (res.data && Array.isArray(res.data.habitacion)) {
                setHabitaciones(res.data.habitacion);
            }
        } catch (error) {
            console.error('Error en listado de habitaciones:', error);
            Alert.alert("Error de Red", "No se pudo sincronizar la lista de habitaciones de la posada.");
            setHabitaciones([]);
        }
    }, [API_URL]);

    useEffect(() => {
        listarHabitaciones();
    }, [listarHabitaciones]);

    // Actualizar el estado global de la habitación de forma síncrona
    const estadoHabitacion = async (idHab, nuevoEstado) => {
        try {
            const res = await axios.put(`${API_URL}/estado-habitacion`, {
                estado: nuevoEstado,
                habitacion: idHab
            }, { timeout: 5000 });
            
            if (res.data && res.data.success) {
                console.log("Estado de la habitación modificado correctamente en PostgreSQL");
            } else {
                console.warn("El servidor procesó la solicitud pero no confirmó la modificación del estado.");
            }
        } catch (e) {
            console.error("Error al modificar el estado general de la habitación:", e);
            throw e; // Lanza el error para que sea capturado por el manejador principal
        }
    };

    // Registrar o editar el reporte técnico
    const guardarRegistro = async () => {
        if (problemas && !observacion.trim()) {
            return Alert.alert("Campo vacío", "Por favor, ingresa los detalles o la observación de la situación.");
        }
        if (!selecionadaHabitacion) {
            return Alert.alert("Campo vacío", "Por favor, selecciona una habitación.");
        }
        if (!idUsuario) {
            return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reinicia sesión.");
        }

        setCargando(true);
        Keyboard.dismiss();

        try {
            const esEdicion = item && item.id_estado;
            const url = esEdicion ? `${API_URL}/editar-estado/${item.id_estado}` : `${API_URL}/estado-bano`;
            const metodo = esEdicion ? 'put' : 'post';

            const res = await axios[metodo](url, {
                habitacion: selecionadaHabitacion,
                estado: estado,
                observacion: observacion.trim(),
                registrado_por: idUsuario
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                // Ejecutamos la actualización del estado maestro de la habitación
                await estadoHabitacion(selecionadaHabitacion, estado);

                Alert.alert(
                    "✅ Guardado", 
                    `Informe de la Habitación N° ${selecionadaHabitacion} asentado con éxito.`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Aviso", res.data.mensaje || "No se pudo guardar el registro.");
            }
        } catch (e) {
            console.error("Error global al guardar:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor local de la posada no responde. Verifica la conexión a la red WiFi interna."
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <ScrollView style={estiloRegistroBano.contenedor} keyboardShouldPersistTaps="handled">
            <View style={estiloRegistroBano.main}>
                <Text style={estiloRegistroBano.titulo}>Estado de Baños</Text>
                
                <View style={estiloRegistroBano.card}>
                    <Text style={estiloRegistroBano.label}>Habitación:</Text>
                    <View style={estiloRegistroBano.contenedorPiker}>
                        <Picker 
                            selectedValue={selecionadaHabitacion.toString()}
                            onValueChange={(itemValue) => setSelecionadaHabitacion(itemValue)}
                            dropdownIconColor="#525FE1"
                        >
                            <Picker.Item label="Selecciona una habitación" value="" />
                            {habitaciones.map((h) => (
                                <Picker.Item  
                                    key={h.id_habitacion}
                                    label={`Habitación N° ${h.id_habitacion}`}
                                    value={h.id_habitacion.toString()}
                                />
                            ))}
                        </Picker>
                    </View>
                    
                    <Text style={estiloRegistroBano.label}>Estado del Servicio:</Text>
                    <View style={estiloRegistroBano.contenedorPiker}>
                        <Picker 
                            selectedValue={estado}
                            onValueChange={(itemValue) => setEstado(itemValue)}
                            dropdownIconColor="#525FE1"
                        >
                            <Picker.Item label="Activo / Operativo" value="Activo" />
                            <Picker.Item label="Inactivo / Fuera de Servicio" value="Inactivo" />
                        </Picker>
                    </View>

                    <View style={estiloRegistroBano.problemasRow}>
                        <Switch 
                            value={problemas} 
                            onValueChange={(value) => {
                                setProblemas(value); 
                                if (!value) setObservacion(''); 
                            }} 
                            trackColor={{ false: "#CBD5E1", true: "#bbf7d0" }}
                            thumbColor={problemas ? "#10b981" : "#94A3B8"}
                        />
                        <Text style={estiloRegistroBano.textoLabel}>¿Presenta novedades o averías?</Text>
                    </View>

                    {problemas && (
                        <View style={{ marginTop: 5 }}>
                            <Text style={estiloRegistroBano.label}>Descripción de la situación:</Text>
                            <TextInput
                                placeholder="Ej. Detalle de botes de agua, grifería dañada o falta de insumos..."
                                placeholderTextColor="#94A3B8"
                                keyboardType="default" 
                                value={observacion}
                                onChangeText={setObservacion}
                                multiline={true}
                                numberOfLines={4}
                                style={estiloRegistroBano.inputText}
                            />
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[estiloRegistroBano.btn, { opacity: cargando ? 0.7 : 1, marginTop: 25 }]} 
                        onPress={guardarRegistro} 
                        disabled={cargando}
                        activeOpacity={0.8}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={estiloRegistroBano.btnText}>Enviar Reporte</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </View>
        </ScrollView>
    );
}