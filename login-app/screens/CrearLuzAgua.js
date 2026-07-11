import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Keyboard, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { estilosLuzAgua } from '../styles/EstilosLuzAgua';
import { BASE_URL } from './apiConfig';
import CalcularConsumo from './CalcularConsumo';

/**
 * PANTALLA: REGISTRO DE LUZ Y AGUA
 * Función: Permite a los operadores ingresar las lecturas de los medidores.
 */
export default function CrearLuzAgua({ navigation, route }) {
    const API_URL = BASE_URL;

    const { idUsuario, nombreUsuario } = route.params || {};
    const [tipo, setTipo] = useState('Agua');
    const [valor, setValor] = useState('');
    const [cargando, setCargando] = useState(false);

    const verificar = async () => {
        if (!valor.trim()) {
            return Alert.alert("Campo vacío", "Por favor, ingresa el valor de la lectura.");
        }

        // Corrección: Reemplaza comas por puntos para soportar decimales correctamente
        const valorNumerico = parseFloat(valor.replace(',', '.')); 
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            return Alert.alert("Dato inválido", "Ingresa un número válido y positivo.");
        }

        if (!idUsuario) {
            return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reinicia sesión.");
        }

        setCargando(true);
        try {
            const res = await axios.get(`${API_URL}/ultimo-consumo/${tipo}`);
            const ultimoValor = parseFloat(res.data.ultimoValor) || 0;

            // Corrección: Usamos valorNumerico (ya sanitizado) para la comparación lógica
            if (valorNumerico <= ultimoValor) {
                setCargando(false);
                return Alert.alert(
                    "Valor inválido",
                    `El valor registrado (${valorNumerico}) debe ser mayor al último valor registrado (${ultimoValor}).`
                );
            }

            const salto = valorNumerico - ultimoValor;
            const ratio = ultimoValor > 0 ? valorNumerico / ultimoValor : 1;
            if (ultimoValor > 0 && (ratio >= 2.0 || salto >= 300)) {
                setCargando(false);
                return Alert.alert(
                    "⚠️ Lectura inusual",
                    `Se detecta un salto grande desde ${ultimoValor} hasta ${valorNumerico}. Verifica la lectura antes de guardar.`,
                    [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Continuar", onPress: () => guardarRegistro(valorNumerico) }
                    ]
                );
            }
            
            // Si pasa la validación, procede a guardar
            await guardarRegistro(valorNumerico);

        } catch (error) {
            setCargando(false);
            Alert.alert("Error", "No se pudo validar el registro con el servidor.");
            console.log('Error, detalles:', error);
        }
    };

    const guardarRegistro = async (valorConfirmado) => {
        Keyboard.dismiss(); // Oculta el teclado al procesar

        try {
            const res = await axios.post(`${API_URL}/registrogasto`, {
                tipo: tipo,
                lectura_valor: valorConfirmado, // Enviamos el valor numérico limpio
                registrado_por: idUsuario
            }, { timeout: 6000 });

            if (res.data.success) {
                Alert.alert(
                    "✅ Guardado", 
                    `Lectura de ${tipo} registrada exitosamente por ${nombreUsuario}.`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Aviso", res.data.mensaje || "No se pudo guardar el registro.");
            }
        } catch (e) {
            console.error("Error al guardar:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor no responde. Verifica la conexión de red."
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <ScrollView 
            contentContainerStyle={estilosLuzAgua.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            <View style={estilosLuzAgua.main}>
                <Text style={estilosLuzAgua.titulo}>Nueva Lectura</Text>
                
                {/* Indicador de Operador */}
                <View style={styles.contenedorOperador}>
                    <Text style={styles.textoOperador}>
                        👤 Operador: {nombreUsuario || 'No identificado'}
                    </Text>
                </View>
                
                <View style={estilosLuzAgua.card}>
                    <Text style={styles.labelInterno}>Tipo de Recurso:</Text>
                    <View style={styles.contenedorPicker}>
                        <Picker 
                            selectedValue={tipo} 
                            onValueChange={(v) => setTipo(v)} 
                            style={estilosLuzAgua.picker}
                            enabled={!cargando}
                        >
                            <Picker.Item label="💧 Agua (Tanque/M3)" value="Agua" />
                            <Picker.Item label="⚡ Luz (Contador/KWH)" value="Luz" />
                        </Picker>
                    </View>

                    <Text style={styles.labelInterno}>Lectura Actual del Medidor:</Text>
                    <TextInput 
                        placeholder="Ej: 1250.50" 
                        placeholderTextColor="#999"
                        keyboardType="numeric" 
                        value={valor}
                        onChangeText={setValor} 
                        style={estilosLuzAgua.inputTexto} 
                        editable={!cargando}
                    />

                    <TouchableOpacity 
                        onPress={verificar} 
                        style={[estilosLuzAgua.btn, { opacity: cargando ? 0.7 : 1 }]}
                        disabled={cargando}
                        activeOpacity={0.8}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={estilosLuzAgua.btnText}>CONFIRMAR REGISTRO</Text>
                        )}
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.nota}>
                    Nota: Asegúrese de que el valor sea el que indica el medidor físico en este momento.
                </Text>
            </View>
            <View>
                <CalcularConsumo />
            </View>
        </ScrollView>
    );
}

// Corrección: Definición formal con StyleSheet.create para optimizar rendimiento y tipado
const styles = StyleSheet.create({
    labelInterno: {
        fontWeight: 'bold', 
        marginBottom: 8, 
        color: '#34495e'
    },
    nota: {
        marginTop: 20, 
        textAlign: 'center', 
        fontSize: 12, 
        color: '#95a5a6', 
        fontStyle: 'italic'
    },
    contenedorOperador: {
        backgroundColor: '#E8F0FE', 
        padding: 10, 
        borderRadius: 10, 
        marginBottom: 20
    },
    textoOperador: {
        color: '#525FE1', 
        fontWeight: '600', 
        textAlign: 'center'
    },
    contenedorPicker: {
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 10, 
        marginBottom: 15
    }
});