import React, { useState, useEffect, useCallback } from 'react';
import { 
    Text, StyleSheet, View, TouchableOpacity, FlatList, 
    Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { BASE_URL } from './apiConfig';

export default function Mantenimiento({ navigation, route }) {
    const API_URL = BASE_URL;
    const { idUsuario = null, nombreUsuario = 'Operador' } = route.params || {};
    
    const [gastos, setGastos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    // Alerta de mantenimiento preventivo (cada 30 días)
    const verificarAntiguedad = useCallback((datosServidor) => {
        const hoy = new Date();
        const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
        let serviciosVencidos = [];

        datosServidor.forEach(item => {
            const ultimaFecha = new Date(item.ultima_fecha);
            if ((hoy - ultimaFecha) > TREINTA_DIAS) {
                serviciosVencidos.push(item.tipo);
            }
        });

        if (serviciosVencidos.length > 0) {
            Alert.alert(
                "⚠️ Pendiente de Registro",
                `Es necesario actualizar las lecturas de: ${serviciosVencidos.join(' y ')}.`,
                [
                    { text: "Más tarde", style: "cancel" },
                    { text: "Ir a Registrar", onPress: () => navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario }) }
                ]
            );
        }
    }, [navigation, idUsuario, nombreUsuario]);

    const cargarDatos = useCallback(async () => {
        try {
            // 1. Obtener Historial (CORRECCIÓN: Eliminado objeto vacío central)
            const resGastos = await axios.get(`${API_URL}/listagastos`, { timeout: 6000 });
            if (resGastos.data.success && Array.isArray(resGastos.data.datos)) {
                setGastos(resGastos.data.datos);
            }

            // 2. Verificar fechas de forma segura (CORRECCIÓN: Eliminado objeto vacío central)
            try {
                const resFechas = await axios.get(`${API_URL}/verificarfecha`, { timeout: 4000 });
                if (resFechas.data.success && Array.isArray(resFechas.data.datos)) {
                    verificarAntiguedad(resFechas.data.datos);
                }
            } catch (e) {
                console.log("Aviso: No se pudo verificar antigüedad.");
            }

        } catch (error) {
            console.error('Error en mantenimiento:', error);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor. Verifica que esté encendido.");
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, [API_URL, verificarAntiguedad]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setCargando(true);
            cargarDatos();
        });
        return unsubscribe;
    }, [navigation, cargarDatos]);

    const generarPdfGastos = async () => {
        if (gastos.length === 0) {
            return Alert.alert('Sin registros', 'No hay registros de gastos para generar el PDF.');
        }

        setGenerandoPdf(true);
        try {
            const filas = gastos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.tipo || ''}</td>
                    <td>${item.lectura_valor || ''} ${item.tipo === 'Agua' ? 'M3' : 'KWH'}</td>
                    <td>${item.fecha_lista || ''}</td>
                    <td>${item.nombre || ''}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Reporte de Gastos</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
                        h1 { font-size: 24px; margin-bottom: 8px; color: #1f2937; }
                        p { margin: 4px 0; color: #475569; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 12px; }
                        th { background: #f8fafc; color: #0f172a; }
                        tbody tr:nth-child(even) { background: #f8fafc; }
                    </style>
                </head>
                <body>
                    <h1>Reporte de Registros de Gastos</h1>
                    <p>Generado: ${new Date().toLocaleDateString('es-VE')}</p>
                    <p>Total de registros: ${gastos.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Tipo</th>
                                <th>Lectura</th>
                                <th>Fecha</th>
                                <th>Registrado por</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir reporte de gastos' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            Alert.alert('Error', 'No se pudo generar el PDF. Intenta de nuevo.');
        } finally {
            setGenerandoPdf(false);
        }
    };

    const renderGasto = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.tipoTexto}>{item.tipo === 'Agua' ? '💧 Agua' : '⚡ Luz'}</Text>
                <Text style={styles.fechaTexto}>{item.fecha_lista}</Text>
            </View>
            <View style={styles.divisor} />
            <View style={styles.cardBody}>
                <Text style={styles.valorTexto}>
                    {item.lectura_valor} <Text style={styles.unidad}>{item.tipo === 'Agua' ? 'M3' : 'KWH'}</Text>
                </Text>
                <Text style={styles.usuarioTexto}>Registrado por: {item.nombre}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.contenedorPrincipal}>
            <View style={styles.headerTop}>
                <Text style={styles.tituloHeader}>Mantenimiento</Text>
                <Text style={styles.operadorHeader}>👤 {nombreUsuario}</Text>
            </View>

            <TouchableOpacity 
                style={styles.botonNuevo} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario })}
            >
                <Text style={styles.textoBotonNuevo}>➕ NUEVA LECTURA</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.botonNuevo, styles.botonPdf]}
                activeOpacity={0.7}
                onPress={generarPdfGastos}
                disabled={generandoPdf}
            >
                <Text style={styles.textoBotonNuevo}>
                    {generandoPdf ? 'Generando PDF...' : '📄 GENERAR PDF'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccion}>Historial de Consumo</Text>

            {cargando && !refreshing ? (
                <ActivityIndicator size="large" color="#525FE1" style={{ marginTop: 30 }} />
            ) : (
                <FlatList 
                    data={gastos}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderGasto}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); cargarDatos(); }} 
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay registros guardados.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedorPrincipal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20 },
    headerTop: { marginTop: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
    operadorHeader: { fontSize: 13, color: '#64748B', backgroundColor: '#E2E8F0', padding: 5, borderRadius: 10 },
    
    botonNuevo: { 
        backgroundColor: '#525FE1', 
        paddingVertical: 15, 
        borderRadius: 15, 
        alignItems: 'center', 
        elevation: 4,
        marginBottom: 15 // Reducido un poco para balancear con el botón de PDF
    },
    textoBotonNuevo: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    botonPdf: { backgroundColor: '#10B981', marginBottom: 25 },
    
    tituloSeccion: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', marginBottom: 15, textTransform: 'uppercase' },
    card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tipoTexto: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    fechaTexto: { fontSize: 12, color: '#94A3B8' },
    divisor: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 }, // CORRECCIÓN: Eliminada la propiedad residual 'my: 10'
    valorTexto: { fontSize: 20, fontWeight: 'bold', color: '#525FE1' },
    unidad: { fontSize: 12, color: '#94A3B8' },
    usuarioTexto: { fontSize: 11, color: '#64748B', marginTop: 5 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});