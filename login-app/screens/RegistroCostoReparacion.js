import React, { useState, useEffect, useCallback } from "react";
import { View, TouchableOpacity, Text, TextInput, ScrollView, Alert, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { BASE_URL } from './apiConfig';
import axios from 'axios';
import { Picker } from "@react-native-picker/picker";
import { estiloRegistroCosto } from "../styles/EstiloRegistroCosto";

/**
 * PANTALLA: REGISTRO Y EDICIÓN DE COSTOS DE REPARACIÓN
 * Función: Asienta la estructura de costos (materiales, mano de obra, tipo de moneda) de los mantenimientos de la posada.
 */
export default function RegistroCosto({ navigation, route }) {
    const API_URL = BASE_URL;
    const { idUsuario, item } = route.params || {};

    const [habitaciones, setHabitaciones] = useState([]);
    const [selecionadaHabitacion, setSelecionadaHabitacion] = useState("");
    const [servicio, setServico] = useState("Interno");
    const [cedula, setCedula] = useState("");
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [costo, setCosto] = useState("");
    const [materiales, setMateriales] = useState("");
    const [costoFinal, setCostoFinal] = useState("");
    const [moneda, setMoneda] = useState("");
    const [cargando, setCargando] = useState(false);
    
    // Carga de datos iniciales en caso de edición
    useEffect(() => {
        if (item) {
            setSelecionadaHabitacion(item.ubicacion ? item.ubicacion.toString() : "");
            setServico(item.servicio || "Interno");
            setCedula(item.cedula || "");
            setNombre(item.nombre_contratado || ""); 
            setTelefono(item.telefono || "");
            setCosto(item.costo ? item.costo.toString() : "");
            setMateriales(item.materiales || "");
            setCostoFinal(item.costo_final ? item.costo_final.toString() : "");
            setMoneda(item.moneda || "");
        }
    }, [item]);

    // Limpiar campos específicos de contratado si cambia a servicio interno
    useEffect(() => {
        if (servicio === "Interno" && !item) {
            setCedula("");
            setNombre("");
            setTelefono("");
            setCosto("");
        }
    }, [servicio, item]);

    // Obtener habitaciones inactivas/fuera de servicio que requieren reparaciones
    const listarHabitaciones = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/listar-habitaciones-inactivas`, { timeout: 5000 });
            setHabitaciones(res.data.habitacion || []);
        } catch (error) {
            console.error('Error en listado de habitaciones inactivas:', error);
            Alert.alert("Error de Red", "No se pudo sincronizar el listado de habitaciones inactivas.");
            setHabitaciones([]);
        }
    }, [API_URL]);

    useEffect(() => {
        listarHabitaciones();
    }, [listarHabitaciones]);

    const presionarBotonGuardar = () => {
        // 1. Validaciones generales de campos obligatorios
        if (!selecionadaHabitacion || !servicio || !moneda || !materiales.trim() || !costoFinal.trim()) {
            Alert.alert('Campos Incompletos 🛑', 'Por favor complete todos los campos obligatorios.');
            return;
        }

        if (!idUsuario) {
            return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reinicia sesión.");
        }

        // 2. Validaciones específicas para personal contratado externo
        if (servicio === "Contratado") {
            if (!nombre.trim() || !cedula.trim() || !telefono.trim() || !costo.trim()) {
                Alert.alert('Campos Incompletos 🛑', 'Por favor complete todos los datos del personal contratado.');
                return;
            }
            if (nombre.trim().length < 5) {
                Alert.alert('Dato inválido 🛑', 'El nombre del contratado debe tener al menos 5 caracteres.');
                return;
            }
            if (cedula.trim().length < 7) {
                Alert.alert('Dato inválido 🛑', 'La cédula debe contar con 7 o más caracteres.');
                return;
            }
            if (telefono.trim().length !== 11) {
                Alert.alert('Dato inválido 🛑', 'El número de teléfono debe contar con exactamente 11 dígitos (Ej. 04141234567).');
                return;
            }

            const costoContratado = parseFloat(costo.replace(',', '.'));
            if (isNaN(costoContratado) || costoContratado < 0) {
                Alert.alert("Dato inválido", "Ingresa un costo de contratación válido y positivo.");
                return;
            }
        }

        // 3. Validación de costos totales
        const valorNumerico = parseFloat(costoFinal.replace(',', '.'));
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            Alert.alert("Dato inválido", "Ingresa un costo total válido y positivo.");
            return;
        }

        const textoAlerta = item && item.id_costo ? '¿Está seguro de querer actualizar este registro existente?' : '¿Está seguro de querer realizar este nuevo registro de costos?';
        
        Alert.alert(
            'Confirmar Registro 📋',
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

        const valorNumerico = parseFloat(costoFinal.replace(',', '.'));
        const costoContratado = costo ? parseFloat(costo.replace(',', '.')) : null;
                    
        try {
            const esEdicion = item && item.id_costo;
            const url = esEdicion ? `${API_URL}/editar-costo/${item.id_costo}` : `${API_URL}/registro-costo`;
            const metodo = esEdicion ? 'put' : 'post';

            const res = await axios[metodo](url, {
                ubicacion: selecionadaHabitacion.toString(),
                servicio: servicio,
                cedula: servicio === "Contratado" ? cedula.trim() : null,
                nombre: servicio === "Contratado" ? nombre.trim() : null,
                telefono: servicio === "Contratado" ? telefono.trim() : null,
                costo: servicio === "Contratado" ? costoContratado : null,
                materiales: materiales.trim(),
                costoFinal: valorNumerico,
                moneda: moneda,
                registrado_por: idUsuario
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                Alert.alert(
                    "✅ Guardado", 
                    `Estructura de costos procesada con éxito.`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Aviso", res.data.mensaje || "No se pudo guardar el registro.");
            }
        } catch (e) {
            console.error("Error al guardar costos:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor no responde. Asegúrese de que la PC del sistema central esté activa."
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView style={estiloRegistroCosto.contenedor} keyboardShouldPersistTaps="handled">
                <View style={estiloRegistroCosto.main}>
                    <Text style={estiloRegistroCosto.titulo}>Registro de Costos</Text>
                    
                    <View style={estiloRegistroCosto.card}>
                        <View>
                            <Text style={estiloRegistroCosto.label}>Lugar a realizar la reparación</Text>
                            <Picker 
                                style={estiloRegistroCosto.contenedorPiker} 
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

                        <View style={{ marginTop: 10 }}>
                            <Text style={estiloRegistroCosto.label}>Tipo de servicio</Text>
                            <Picker 
                                style={estiloRegistroCosto.contenedorPiker} 
                                selectedValue={servicio}
                                onValueChange={(itemValue) => setServico(itemValue)}
                                dropdownIconColor="#525FE1"
                            >
                                <Picker.Item label="Mantenimiento Interno" value="Interno" />
                                <Picker.Item label="Personal Contratado Externo" value="Contratado" />
                            </Picker>
                        </View>

                        {servicio === "Contratado" && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={estiloRegistroCosto.label}>Cédula del contratado</Text>
                                <TextInput 
                                    style={estiloRegistroCosto.inputText} 
                                    placeholder="Ej. 10987890"
                                    onChangeText={setCedula}
                                    value={cedula}
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                />
                            
                                <Text style={estiloRegistroCosto.label}>Nombre completo</Text>
                                <TextInput 
                                    style={estiloRegistroCosto.inputText} 
                                    placeholder="Ej. Juan Alejandro Pérez"
                                    onChangeText={setNombre}
                                    value={nombre}
                                    placeholderTextColor="#94A3B8"
                                />
                        
                                <Text style={estiloRegistroCosto.label}>Teléfono de contacto</Text>
                                <TextInput 
                                    style={estiloRegistroCosto.inputText} 
                                    placeholder="Ej. 04241234567"
                                    keyboardType="numeric" 
                                    onChangeText={setTelefono}
                                    value={telefono}
                                    maxLength={11}
                                    placeholderTextColor="#94A3B8"
                                />
                            
                                <Text style={estiloRegistroCosto.label}>Costo de la mano de obra</Text>
                                <TextInput 
                                    style={estiloRegistroCosto.inputText} 
                                    placeholder="Ej. 30"
                                    keyboardType="numeric" 
                                    onChangeText={setCosto}
                                    value={costo}
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        )}

                        <View style={{ marginTop: 10 }}>
                            <Text style={estiloRegistroCosto.label}>Lista de materiales y su costo descriptivo</Text>
                            <TextInput 
                                style={[estiloRegistroCosto.inputText, { height: 80, textAlignVertical: 'top' }]} 
                                placeholder="Ej. Tubo PVC de 1/2: 15$&#10;Teipe elétrico: 5$"
                                onChangeText={setMateriales}
                                value={materiales}
                                multiline={true}
                                numberOfLines={4}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={{ marginTop: 10 }}>
                            <Text style={estiloRegistroCosto.label}>Costo Total Ejecutado</Text>
                            <TextInput 
                                style={estiloRegistroCosto.inputText} 
                                placeholder="Ej. 50"
                                keyboardType="numeric" 
                                onChangeText={setCostoFinal}
                                value={costoFinal}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={{ marginTop: 10, marginBottom: 20 }}>
                            <Text style={estiloRegistroCosto.label}>Tipo de moneda</Text>
                            <Picker 
                                style={estiloRegistroCosto.contenedorPiker} 
                                selectedValue={moneda}
                                onValueChange={(itemValue) => setMoneda(itemValue)}
                                dropdownIconColor="#525FE1"
                            >
                                <Picker.Item label="Selecciona la divisa base" value="" />
                                <Picker.Item label="Dólares ($)" value="Dolares" />
                                <Picker.Item label="Bolívares (BsS)" value="Bolivares" />
                                <Picker.Item label="Pesos Colombianos (COP)" value="Peso Colombiano" />
                            </Picker>
                        </View>
                        
                        <TouchableOpacity 
                            style={[estiloRegistroCosto.btn, { opacity: cargando ? 0.7 : 1 }]} 
                            onPress={presionarBotonGuardar} 
                            disabled={cargando}
                            activeOpacity={0.8}
                        >
                            {cargando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={estiloRegistroCosto.btnText}>
                                    {item ? "Guardar Cambios" : "Registrar Reporte Financiero"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}