import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
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
    const [resultado, setResultado] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorModalMensaje, setErrorModalMensaje] = useState('');
    const [reportMode, setReportMode] = useState('Mes'); // 'Individual' | 'Mes' | 'Rango'
    const [desdeMes, setDesdeMes] = useState(1);
    const [desdeAnio, setDesdeAnio] = useState(anioActual);

    const meses = [
        { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
        { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
        { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
        { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
    ];

    const mostrarError = (mensaje) => {
        setErrorModalMensaje(mensaje);
        setErrorModalVisible(true);
    };

    const ejecutarCalculo = async () => {
        // Validaciones básicas
        if (reportMode === 'Mes' && mes > mesActual) {
            mostrarError('No puedes consultar un mes que aún no ha transcurrido.');
            return;
        }

        setCargando(true);
        try {
            if (reportMode === 'Individual') {
                // Llama al endpoint que devuelve el último valor
                const res = await axios.get(`${API_URL}/ultimo-consumo/${tipo}`);
                if (res.data && res.data.success) {
                    setResultado({ type: 'Individual', tipo, ultimoValor: res.data.ultimoValor });
                    setModalVisible(true);
                } else {
                    mostrarError(res.data.mensaje || 'No se encontró un valor reciente.');
                }
            } else if (reportMode === 'Mes') {
                const res = await axios.get(`${API_URL}/calcular-consumo`, {
                    params: { tipo, mes, anio: anioActual },
                    timeout: 5000
                });
                if (res.data.success) {
                    if (typeof res.data.consumo === 'number' && res.data.consumo < 0) {
                        mostrarError('No se puede mostrar consumo negativo. Verifica que los registros de lectura sean correctos.');
                    } else {
                        const unidad = tipo === 'Agua' ? 'M3' : 'KWH';
                        setResultado({
                            type: 'Mes',
                            tipo,
                            mes,
                            anio: anioActual,
                            lectura_inicial: res.data.lectura_inicial,
                            lectura_final: res.data.lectura_final,
                            consumo: res.data.consumo,
                            unidad
                        });
                        setModalVisible(true);
                    }
                } else {
                    mostrarError(res.data.mensaje || 'No se encontraron lecturas para el periodo seleccionado.');
                }
            } else if (reportMode === 'Rango') {
                // usamos el endpoint consumo-acumulado
                const res = await axios.get(`${API_URL}/consumo-acumulado`, {
                    params: {
                        tipo,
                        mes,
                        anio: anioActual,
                        desde_mes: desdeMes,
                        desde_anio: desdeAnio
                    },
                    timeout: 5000
                });
                if (res.data.success) {
                    if (typeof res.data.consumo === 'number' && res.data.consumo < 0) {
                        mostrarError('El consumo acumulado no puede ser negativo. Revisa el rango seleccionado y los registros de lecturas.');
                    } else {
                        const unidad = tipo === 'Agua' ? 'M3' : 'KWH';
                        setResultado({
                            type: 'Rango',
                            tipo,
                            desde: res.data.desde,
                            hasta: res.data.hasta,
                            lectura_inicial: res.data.lectura_inicial,
                            lectura_final: res.data.lectura_final,
                            consumo: res.data.consumo,
                            unidad
                        });
                        setModalVisible(true);
                    }
                } else {
                    mostrarError(res.data.mensaje || 'No hay datos para el rango solicitado.');
                }
            }
        } catch (error) {
            const mensajeFromServer = error?.response?.data?.mensaje || error?.response?.data?.error;
            if (mensajeFromServer) {
                mostrarError(mensajeFromServer);
            } else if (error?.response?.status === 400) {
                mostrarError('No hay registros para el mes seleccionado. Elige otro mes o registra primero las lecturas necesarias.');
            } else {
                mostrarError('No se pudo contactar con el servidor. Verifica que la PC esté encendida, que el backend esté corriendo y que el celular esté en el mismo WiFi.');
            }
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
                    <Text style={styles.label}>Tipo de Reporte:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={reportMode}
                            onValueChange={(v) => setReportMode(v)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Individual (Último valor)" value="Individual" />
                            <Picker.Item label="Mes" value="Mes" />
                            <Picker.Item label="Rango (Acumulado)" value="Rango" />
                        </Picker>
                    </View>

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

                    {reportMode !== 'Individual' && (
                        <>
                            <Text style={styles.label}>{reportMode === 'Rango' ? 'Seleccione Mes (Hasta):' : 'Seleccione Mes:'}</Text>
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
                        </>
                    )}

                    {reportMode === 'Rango' && (
                        <>
                            <Text style={[styles.label, { marginTop: 8 }]}>Desde Mes:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={desdeMes}
                                    onValueChange={(v) => setDesdeMes(v)}
                                    style={styles.picker}
                                >
                                    {meses.map((m) => (
                                        <Picker.Item key={`d${m.value}`} label={m.label} value={m.value} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={[styles.label, { marginTop: 8 }]}>Desde Año:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={desdeAnio} onValueChange={(v) => setDesdeAnio(v)} style={styles.picker}>
                                    <Picker.Item label={`${anioActual - 1}`} value={anioActual - 1} />
                                    <Picker.Item label={`${anioActual}`} value={anioActual} />
                                </Picker>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        onPress={ejecutarCalculo}
                        style={[styles.btn, { backgroundColor: esMesFuturo ? '#BDC3C7' : '#525FE1' }]}
                        disabled={cargando || (reportMode === 'Mes' && esMesFuturo)}
                        activeOpacity={0.8}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>GENERAR REPORTE</Text>
                        )}
                    </TouchableOpacity>
                </View>


                {/* Nota informativa para el operador */}
                <Text style={{ textAlign: 'center', color: '#95a5a6', fontSize: 12, marginTop: 15 }}>
                    * Los cálculos se basan en la diferencia entre la última lectura del mes elegido y la última del mes anterior.
                </Text>

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={modalStyles.overlay}>
                        <View style={modalStyles.content}>
                            <Text style={modalStyles.title}>Resumen de Consumo</Text>
                            {resultado && resultado.type === 'Individual' && (
                                <>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Servicio:</Text>
                                        <Text style={modalStyles.value}>{resultado.tipo}</Text>
                                    </View>
                                    <View style={[modalStyles.row, { marginTop: 12 }]}>
                                        <Text style={modalStyles.label}>Último valor:</Text>
                                        <Text style={modalStyles.value}>{resultado.ultimoValor}</Text>
                                    </View>
                                </>
                            )}

                            {resultado && resultado.type === 'Mes' && (
                                <>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Servicio:</Text>
                                        <Text style={modalStyles.value}>{resultado.tipo}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Mes:</Text>
                                        <Text style={modalStyles.value}>{meses[resultado.mes - 1].label} {resultado.anio}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Lectura Inicial:</Text>
                                        <Text style={modalStyles.value}>{resultado.lectura_inicial} {resultado.unidad}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Lectura Final:</Text>
                                        <Text style={modalStyles.value}>{resultado.lectura_final} {resultado.unidad}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Consumo Total:</Text>
                                        <Text style={modalStyles.value}>{resultado.consumo} {resultado.unidad}</Text>
                                    </View>
                                </>
                            )}

                            {resultado && resultado.type === 'Rango' && (
                                <>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Servicio:</Text>
                                        <Text style={modalStyles.value}>{resultado.tipo}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Desde:</Text>
                                        <Text style={modalStyles.value}>{meses[resultado.desde.mes - 1].label} {resultado.desde.anio}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Hasta:</Text>
                                        <Text style={modalStyles.value}>{meses[resultado.hasta.mes - 1].label} {resultado.hasta.anio}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Lectura Inicial:</Text>
                                        <Text style={modalStyles.value}>{resultado.lectura_inicial} {resultado.unidad}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Lectura Final:</Text>
                                        <Text style={modalStyles.value}>{resultado.lectura_final} {resultado.unidad}</Text>
                                    </View>
                                    <View style={modalStyles.row}>
                                        <Text style={modalStyles.label}>Consumo Total:</Text>
                                        <Text style={modalStyles.value}>{resultado.consumo} {resultado.unidad}</Text>
                                    </View>
                                </>
                            )}

                            <Pressable
                                onPress={() => setModalVisible(false)}
                                style={[styles.btn, { backgroundColor: '#95a5a6', marginTop: 10 }]}
                            >
                                <Text style={styles.btnText}>Cerrar</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={errorModalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setErrorModalVisible(false)}
                >
                    <View style={modalStyles.overlay}>
                        <View style={modalStyles.content}>
                            <Text style={modalStyles.title}>Atención</Text>
                            <Text style={modalStyles.message}>{errorModalMensaje}</Text>
                            <Pressable
                                onPress={() => setErrorModalVisible(false)}
                                style={[styles.btn, { backgroundColor: '#95a5a6', marginTop: 18 }]}
                            >
                                <Text style={styles.btnText}>Cerrar</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );
}

const modalStyles = {
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    content: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 12
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 16,
        textAlign: 'center'
    },
    message: {
        fontSize: 15,
        color: '#2C3E50',
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 12
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495E'
    },
    value: {
        fontSize: 14,
        color: '#2C3E50',
        maxWidth: '60%',
        textAlign: 'right'
    }
};