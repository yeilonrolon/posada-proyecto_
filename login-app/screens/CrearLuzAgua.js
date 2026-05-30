import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { estilosLuzAgua } from '../styles/EstilosLuzAgua';
import { BASE_URL } from './apiConfig';
import CalcularConsumo from './CalcularConsumo'

/**
 * PANTALLA: REGISTRO DE LUZ Y AGUA
 * Función: Permite a los operadores ingresar las lecturas de los medidores.
 */
export default function CrearLuzAgua({ navigation, route }) {
    // URL del servidor en tu Linux Lite
    const API_URL = BASE_URL;

    const { idUsuario, nombreUsuario } = route.params || {};
    const [tipo, setTipo] = useState('Agua');
    const [valor, setValor] = useState('');
    const [cargando, setCargando] = useState(false);

    const verficar = async () => {
        // Validaciones preventivas
        if (!valor.trim()) {
            return Alert.alert("Campo vacío", "Por favor, ingresa el valor de la lectura.");
        }

        const valorNumerico = parseFloat(valor.replace(',', '.')); // Soporta comas decimales
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            return Alert.alert("Dato inválido", "Ingresa un número válido y positivo.");
        }

        if (!idUsuario) {
            return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reincia sesión.");
        }

        

        try{
            const res = await axios.get(`${API_URL}/ultimo-consumo/${tipo}`)

            const ultimoValor = res.data.ultimoValor

            if(parseFloat(valor) <= ultimoValor){
                return Alert.alert("Valor invalido"
                    ,`El valor registrado ${valor} debe ser mayor al ultimo valor registrado`);
            }
            await guardarRegistro();

        } catch(error){
            Alert.alert("Error","No se pudo validar el registro");
            console.log('Error, detalles:', error)
            
        }
    }

    const guardarRegistro = async () => {
        setCargando(true);
        Keyboard.dismiss(); // Oculta el teclado al procesar

        try {
            const res = await axios.post(`${API_URL}/registrogasto`, {
                tipo: tipo,
                lectura_valor: valor,
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
                "El servidor no responde. Verifica que la PC esté encendida y en la misma red WiFi."
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <ScrollView 
            contentContainerStyle={estilosLuzAgua.scrollContainer}
            keyboardShouldPersistTaps="handled" // Permite tocar el botón aunque el teclado esté abierto
        >
            <View style={estilosLuzAgua.main}>
                <Text style={estilosLuzAgua.titulo}>Nueva Lectura</Text>
                
                {/* Indicador de Operador */}
                <View style={{backgroundColor: '#E8F0FE', padding: 10, borderRadius: 10, marginBottom: 20}}>
                    <Text style={{color: '#525FE1', fontWeight: '600', textAlign: 'center'}}>
                        👤 Operador: {nombreUsuario || 'No identificado'}
                    </Text>
                </View>
                
                <View style={estilosLuzAgua.card}>
                    <Text style={styles.labelInterno}>Tipo de Recurso:</Text>
                    <View style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 15}}>
                        <Picker 
                            selectedValue={tipo} 
                            onValueChange={(v) => setTipo(v)} 
                            style={estilosLuzAgua.picker}
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
                        onPress={verficar} 
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

const styles = {
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
    }
};