import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// CORREGIDO: Importación con llaves { } para evitar que BASE_URL llegue undefined
import { BASE_URL } from './apiConfig';

export default function PantallaCamara({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [escaneado, setEscaneado] = useState(false);

    // Estados de control
    const [modalVisible, setModalVisible] = useState(false);
    const [datosEquipo, setDatosEquipo] = useState(null);
    const [buscandoBD, setBuscandoBD] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Endpoint base unificado
    const API_URL = `${BASE_URL}/api/equipos`;

    // Genera la fecha de hoy automáticamente en formato "YYYY-MM-DD"
    const obtenerFechaHoyString = () => {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    };

    useEffect(() => {
        if (!permission) { requestPermission(); }
    }, [permission]);

    if (!permission) {
        return <View style={styles.containerCentrado}><ActivityIndicator size="large" color="#1a365d" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.containerCentrado}>
                <Text style={{ textAlign: 'center', marginBottom: 15, color: '#475569' }}>Necesitamos tu permiso para usar la cámara.</Text>
                <Button onPress={requestPermission} title="Conceder Permiso" color="#1a365d" />
            </View>
        );
    }

    const manejarEscaneoQr = async ({ data }) => {
        if (escaneado) return;
        setEscaneado(true);

        try {
            const objetoQR = JSON.parse(data);
            const idEquipo = objetoQR.id || objetoQR.id_simulado;
            
            if (!idEquipo) {
                Alert.alert('QR Inválido', 'Código no reconocido.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
                return;
            }

            setBuscandoBD(true);
            const respuesta = await fetch(`${API_URL}`);
            const resultadoJSON = await respuesta.json();
            
            setBuscandoBD(false);

            // CORREGIDO: Accedemos al arreglo real de filas que viaja en la propiedad '.datos'
            if (respuesta.ok && resultadoJSON.success && Array.isArray(resultadoJSON.datos)) {
                const equipoReal = resultadoJSON.datos.find(e => e.id === parseInt(idEquipo, 10));

                if (equipoReal) {
                    setDatosEquipo(equipoReal);
                    setModalVisible(true);
                } else {
                    Alert.alert('No encontrado', 'El equipo no existe en el sistema de la Posada.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
                }
            } else {
                Alert.alert('Error de Servidor', 'Estructura de datos inesperada desde el Backend.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
            }

        } catch (e) {
            setBuscandoBD(false);
            console.error('Error procesando QR:', e);
            Alert.alert('Error', 'No se pudo procesar el código o decodificar el formato JSON.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
        }
    };

    const ejecutarGuardadoEnBD = async (fechaHoyAutomatica) => {
        try {
            setGuardando(true);
            const respuesta = await fetch(`${API_URL}/${datosEquipo.id}/revision`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nueva_fecha: fechaHoyAutomatica })
            });

            if (respuesta.ok) {
                Alert.alert('Éxito 🎉', `Mantenimiento asentado con éxito para el día de hoy (${fechaHoyAutomatica}).`);
                cerrarModalYReintentar();
            } else {
                const resultado = await respuesta.json();
                Alert.alert('Error', resultado.error || 'No se pudo guardar la revisión.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error de Red', 'Sin conexión con el servidor de la posada.');
        } finally {
            setGuardando(false);
        }
    };

    const presionarBotonGuardar = () => {
        const fechaHoy = obtenerFechaHoyString();

        Alert.alert(
            'Confirmar Registro 📋',
            `¿Está seguro de realizar el cambio de fecha de revisión o mantenimiento para el día de hoy (${fechaHoy})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, guardar', onPress: () => ejecutarGuardadoEnBD(fechaHoy), style: 'default' }
            ],
            { cancelable: true }
        );
    };

    const cerrarModalYReintentar = () => {
        setModalVisible(false);
        setDatosEquipo(null);
        setEscaneado(false);
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={escaneado ? undefined : manejarEscaneoQr}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            
            <View style={styles.overlay}>
                <Text style={styles.textoGuia}>Apunta la cámara al código QR del equipo</Text>
                <View style={styles.cuadroEnfoque} />
                
                {buscandoBD && (
                    <View style={styles.cajaCargandoBD}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.txtCargandoBD}>Consultando PostgreSQL...</Text>
                    </View>
                )}
            </View>

            {datosEquipo && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={cerrarModalYReintentar}
                >
                    <View style={styles.fondoModal}>
                        <View style={styles.contenidoModal}>
                            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
                                
                                <Text style={styles.modalTitulo}>📋 Información del Activo</Text>
                                
                                <View style={styles.cajaDatosBloqueados}>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>ID:</Text> #{datosEquipo.id}</Text>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>Equipo:</Text> {datosEquipo.nombre_equipo}</Text>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>Ubicación:</Text> 📍 {datosEquipo.ubicacion}</Text>
                                    <Text style={styles.textoDetalle}>
                                        <Text style={styles.negrita}>Última Revisión Registrada:</Text> {datosEquipo.ultima_revision ? datosEquipo.ultima_revision.substring(0,10) : 'Ninguna'}
                                    </Text>
                                </View>

                                <View style={styles.divisor} />

                                <View style={styles.cajaFechaAutomatica}>
                                    <Text style={styles.labelInformativo}>📅 Fecha que se registrará hoy:</Text>
                                    <Text style={styles.textoFechaHoy}>{obtenerFechaHoyString()}</Text>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.botonAccion, { backgroundColor: '#10b981', marginTop: 20 }]} 
                                    onPress={presionarBotonGuardar}
                                    disabled={guardando}
                                >
                                    {guardando ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.textoBotonAccion}>🔄 Actualizar Última Revisión</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.botonAccion, { backgroundColor: '#ef4444', marginTop: 10 }]} 
                                    onPress={cerrarModalYReintentar}
                                    disabled={guardando}
                                >
                                    <Text style={styles.textoBotonAccion}>Cancelar</Text>
                                </TouchableOpacity>

                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    containerCentrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    textoGuia: { color: '#fff', fontSize: 15, backgroundColor: 'rgba(26, 54, 93, 0.85)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: 20, fontWeight: '500' },
    cuadroEnfoque: { width: 200, height: 200, borderWidth: 3, borderColor: '#0284c7', borderRadius: 12, marginBottom: 15 },
    cajaCargandoBD: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 10, borderRadius: 8 },
    txtCargandoBD: { color: '#fff', marginLeft: 8, fontSize: 13 },
    
    fondoModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    contenidoModal: { backgroundColor: '#fff', width: '100%', borderRadius: 14, padding: 20, alignItems: 'center', elevation: 10 },
    modalTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1a365d', marginBottom: 15 },
    cajaDatosBloqueados: { backgroundColor: '#f8fafc', width: '100%', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    textoDetalle: { fontSize: 14, color: '#334155', marginBottom: 5 },
    negrita: { fontWeight: 'bold', color: '#1e293b' },
    divisor: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginVertical: 15 },
    
    cajaFechaAutomatica: { backgroundColor: '#f0fdf4', width: '100%', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' },
    labelInformativo: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
    textoFechaHoy: { fontSize: 20, fontWeight: 'bold', color: '#15803d', letterSpacing: 0.5 },
    
    botonAccion: { width: '100%', height: 46, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    textoBotonAccion: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});