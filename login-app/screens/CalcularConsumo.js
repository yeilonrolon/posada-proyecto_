import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Pressable, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { estilosCalcularConsumo as styles } from '../styles/EstilosCalcularConsumo';
import { BASE_URL } from './apiConfig';

export default function CalcularConsumo() {
    const API_URL = BASE_URL;

    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();

    const [tipo, setTipo] = useState('Agua');
    const [mes, setMes] = useState(mesActual);
    // ✅ Nuevo estado para manejar el año del reporte de forma dinámica y evitar errores en fin de año
    const [anioReporte, setAnioReporte] = useState(anioActual); 
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorModalMensaje, setErrorModalMensaje] = useState('');
    const [reportMode, setReportMode] = useState('Mes'); 
    const [generandoPdf, setGenerandoPdf] = useState(false);
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

    const generarPdfConsumo = async () => {
        if (!resultado) {
            return Alert.alert('Generar PDF', 'Primero genera el reporte de consumo.');
        }

        setGenerandoPdf(true);
        try {
            const titulo = `Reporte de Consumo - ${resultado.tipo}`;
            const fecha = new Date().toLocaleDateString('es-VE');
            const rows = [];

            if (resultado.type === 'Individual') {
                rows.push({ label: 'Último valor', value: `${resultado.ultimoValor}` });
            } else if (resultado.type === 'Mes') {
                rows.push({ label: 'Mes', value: `${meses[resultado.mes - 1].label} ${resultado.anio}` });
                rows.push({ label: 'Lectura inicial', value: `${resultado.lectura_inicial} ${resultado.unidad}` });
                rows.push({ label: 'Lectura final', value: `${resultado.lectura_final} ${resultado.unidad}` });
                rows.push({ label: 'Consumo total', value: `${resultado.consumo} ${resultado.unidad}` });
            } else if (resultado.type === 'Rango') {
                rows.push({ label: 'Desde', value: `${meses[resultado.desde.mes - 1].label} ${resultado.desde.anio}` });
                rows.push({ label: 'Hasta', value: `${meses[resultado.hasta.mes - 1].label} ${resultado.hasta.anio}` });
                rows.push({ label: 'Lectura inicial', value: `${resultado.lectura_inicial} ${resultado.unidad}` });
                rows.push({ label: 'Lectura final', value: `${resultado.lectura_final} ${resultado.unidad}` });
                rows.push({ label: 'Consumo total', value: `${resultado.consumo} ${resultado.unidad}` });
            }

            const rowsHtml = rows.map(row => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #d1d5db; font-weight: 600; background: #f8fafc;">${row.label}</td>
                    <td style="padding: 10px; border: 1px solid #d1d5db;">${row.value}</td>
                </tr>`).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>${titulo}</title>
                    <style>
                        :root {
                            --bg: #f8fafc;
                            --surface: #ffffff;
                            --border: #e2e8f0;
                            --text: #0f172a;
                            --muted: #475569;
                            --primary: #283593;
                            --accent: #4f46e5;
                        }
                        * { box-sizing: border-box; }
                        body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
                        .page { max-width: 820px; margin: 0 auto; padding: 24px; }
                        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 28px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
                        header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 28px; }
                        .brand strong { display: block; font-size: 24px; color: var(--primary); letter-spacing: 0.01em; }
                        .brand span { display: block; margin-top: 8px; color: var(--muted); font-size: 13px; }
                        .badge { padding: 10px 16px; background: var(--accent); color: white; border-radius: 999px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
                        .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
                        .info-block { background: #eef2ff; border-radius: 18px; padding: 18px; }
                        .info-block strong { display: block; color: var(--primary); margin-bottom: 6px; font-size: 13px; }
                        .info-block span { color: var(--text); font-size: 15px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { padding: 14px 16px; border: 1px solid var(--border); }
                        th { background: #eef2ff; color: var(--primary); font-weight: 700; text-align: left; }
                        tbody tr:nth-child(even) { background: #f8fafc; }
                        .footer { margin-top: 28px; font-size: 12px; color: var(--muted); text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <div class="card">
                            <header>
                                <div class="brand">
                                    <strong>Posada Villa Montaña C.A.</strong>
                                    <span>Reporte de consumo del recurso</span>
                                </div>
                                <div class="badge">${resultado.tipo}</div>
                            </header>

                            <div class="info-grid">
                                <div class="info-block">
                                    <strong>Fecha de generación</strong>
                                    <span>${fecha}</span>
                                </div>
                                <div class="info-block">
                                    <strong>Tipo de reporte</strong>
                                    <span>${resultado.type === 'Mes' ? 'Mensual' : resultado.type === 'Rango' ? 'Acumulado' : 'Último valor'}</span>
                                </div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        <th>Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>

                            <div class="footer">
                                Posada Villa Montaña C.A. · Sistema de mantenimiento y consumo
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir reporte de consumo' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            Alert.alert('Error', 'No se pudo generar el PDF. Intenta de nuevo.');
        } finally {
            setGenerandoPdf(false);
        }
    };

    const ejecutarCalculo = async () => {
        // Validación adaptada al año seleccionado
        if (reportMode === 'Mes' && anioReporte === anioActual && mes > mesActual) {
            mostrarError('No puedes consultar un mes que aún no ha transcurrido.');
            return;
        }

        setCargando(true);
        try {
            if (reportMode === 'Individual') {
                const res = await axios.get(`${API_URL}/ultimo-consumo/${tipo}`);
                if (res.data && res.data.success) {
                    setResultado({ type: 'Individual', tipo, ultimoValor: res.data.ultimoValor });
                    setModalVisible(true);
                } else {
                    mostrarError(res.data.mensaje || 'No se encontró un valor reciente.');
                }
            } else if (reportMode === 'Mes') {
                const res = await axios.get(`${API_URL}/calcular-consumo`, {
                    // ✅ Ahora envía el año seleccionado del Picker en vez del año actual rígido
                    params: { tipo, mes, anio: anioReporte }, 
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
                            anio: anioReporte,
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
                const res = await axios.get(`${API_URL}/consumo-acumulado`, {
                    params: {
                        tipo,
                        mes, // Este actúa como el "hasta_mes"
                        anio: anioReporte, // "hasta_anio"
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
                mostrarError('No se pudo contactar con el servidor. Verifica que el backend esté corriendo en tu red local.');
            }
        } finally {
            setCargando(false);
        }
    };

    const esMesFuturo = anioReporte === anioActual && mes > mesActual;

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
                                            key={`mes-${m.value}`}
                                            label={m.label}
                                            value={m.value}
                                            color={anioReporte === anioActual && m.value > mesActual ? '#BDC3C7' : '#2C3E50'}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            {/* ✅ Selector de año añadido para el modo mensual/rango */}
                            <Text style={styles.label}>{reportMode === 'Rango' ? 'Seleccione Año (Hasta):' : 'Seleccione Año:'}</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={anioReporte} onValueChange={(v) => setAnioReporte(v)} style={styles.picker}>
                                    <Picker.Item label={`${anioActual - 1}`} value={anioActual - 1} />
                                    <Picker.Item label={`${anioActual}`} value={anioActual} />
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
                                        <Picker.Item key={`d-${m.value}`} label={m.label} value={m.value} />
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

                <Text style={{ textAlign: 'center', color: '#95a5a6', fontSize: 12, marginTop: 15 }}>
                    * Los cálculos se basan en la diferencia entre la última lectura del periodo elegido y la del periodo anterior.
                </Text>

                {/* MODAL: RESUMEN */}
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

                            <TouchableOpacity
                                onPress={generarPdfConsumo}
                                style={[styles.btn, { backgroundColor: '#10B981', marginTop: 10, opacity: generandoPdf ? 0.7 : 1 }]}
                                disabled={generandoPdf}
                                activeOpacity={0.8}
                            >
                                {generandoPdf ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.btnText}>GENERAR PDF</Text>
                                )}
                            </TouchableOpacity>

                            <Pressable
                                onPress={() => setModalVisible(false)}
                                style={[styles.btn, { backgroundColor: '#95a5a6', marginTop: 10 }]}
                            >
                                <Text style={styles.btnText}>Cerrar</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* MODAL: ERROR */}
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

// ✅ Optimizado usando el StyleSheet oficial para ganar performance nativo
const modalStyles = StyleSheet.create({
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
});