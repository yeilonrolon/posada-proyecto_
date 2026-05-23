import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { estilosCalcularConsumo as styles } from '../styles/EstilosCalcularConsumo';
import { BASE_URL } from './apiConfig';
/**
 * PANTALLA: CÁLCULO DE CONSUMO
 * Función: Obtiene la diferencia de lecturas entre el mes actual y el anterior.
 */
export default function CalcularConsumo() {
    // Configuración de red (Asegúrate de que tu Linux Lite mantenga esta IP)
    const API_URL = BASE_URL;

    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();

    const [tipo, setTipo] = useState('Agua');
    const [mes, setMes] = useState(mesActual); 
    const [cargando, setCargando] = useState(false);

    const meses = [
        { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
        { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
        { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
        { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
    ];

    const ejecutarCalculo = async () => {
        // Validación de seguridad antes de disparar Axios
        if (mes > mesActual) {
            Alert.alert("Error", "No puedes consultar un mes que aún no ha transcurrido.");
            return;
        }

        setCargando(true);
        try {
            const res = await axios.get(`${API_URL}/calcular-consumo`, {
                params: {
                    tipo: tipo,
                    mes: mes,
                    anio: anioActual
                },
                timeout: 5000 // Si el servidor no responde en 5 seg, abortar
            });
            
            if (res.data.success) {
                const unidad = tipo === 'Agua' ? 'M3' : 'KWH';
                Alert.alert(
                    "📊 Reporte de Consumo", 
                    `Servicio: ${tipo}\n` +
                    `Mes: ${meses[mes-1].label}\n` +
                    `--------------------------\n` +
                    `Lectura Inicial: ${res.data.lectura_inicial} ${unidad}\n` +
                    `Lectura Final: ${res.data.lectura_final} ${unidad}\n` +
                    `--------------------------\n` +
                    `TOTAL CONSUMIDO: ${res.data.consumo} ${unidad}`,
                    [{ text: "Entendido", style: "default" }]
                );
            } else {
                // Caso donde no hay datos en la BD para ese mes
                Alert.alert("Sin Registros", res.data.mensaje || "No se encontraron lecturas para el periodo seleccionado.");
            }
        } catch (error) {
            console.error("Error de red:", error);
            Alert.alert(
                "Error de Conexión", 
                "No se pudo contactar con el servidor. Verifica:\n1. Que la PC esté encendida.\n2. Que el servidor Node esté corriendo.\n3. Que el celular esté en el mismo WiFi."
            );
        } finally {
            setCargando(false);
        }
    };

    const esMesFuturo = mes > mesActual;

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
            <View style={styles.main}>
                <Text style={styles.titulo}>Consumo de la Posada</Text>
                
                <View style={styles.card}>
                    <Text style={styles.label}>Seleccione Recurso:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker 
                            selectedValue={tipo} 
                            onValueChange={(itemValue) => setTipo(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="💧 Agua Potable" value="Agua" />
                            <Picker.Item label="⚡ Electricidad" value="Luz" />
                        </Picker>
                    </View>

                    <Text style={styles.label}>Seleccione Mes:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={mes}
                            onValueChange={(itemValue) => setMes(itemValue)}
                            style={styles.picker}
                            dropdownIconColor="#525FE1"
                        >
                            {meses.map((m) => (
                                <Picker.Item 
                                    key={m.value} 
                                    label={m.label} 
                                    value={m.value}
                                    color={m.value > mesActual ? '#BDC3C7' : '#2C3E50'}
                                />
                            ))}
                        </Picker>
                    </View>

                    <TouchableOpacity 
                        onPress={ejecutarCalculo} 
                        style={[
                            styles.btn, 
                            { backgroundColor: esMesFuturo ? '#BDC3C7' : '#525FE1' }
                        ]}
                        disabled={cargando || esMesFuturo}
                        activeOpacity={0.8}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>
                                {esMesFuturo ? 'MES NO DISPONIBLE' : 'GENERAR REPORTE'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Nota informativa para el operador */}
                <Text style={{ textAlign: 'center', color: '#95a5a6', fontSize: 12, marginTop: 15 }}>
                    * Los cálculos se basan en la diferencia entre la última lectura del mes elegido y la última del mes anterior.
                </Text>
            </View>
        </ScrollView>
    );
}