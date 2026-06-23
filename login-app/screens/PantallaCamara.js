import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native'; 
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: ESCÁNER DE CÓDIGOS QR
 * Función: Identifica equipos de la posada por QR y asienta la fecha de revisión técnica.
 */
export default function PantallaCamara({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [escaneado, setEscaneado] = useState(false);
    const isFocused = useIsFocused(); 

    // Estados de control
    const [modalVisible, setModalVisible] = useState(false);
    const [datosEquipo, setDatosEquipo] = useState(null);
    const [buscandoBD, setBuscandoBD] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const API_URL = `${BASE_URL}/api/equipos`;

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

    const cerrarModalYReintentar = useCallback(() => {
        setModalVisible(false);
        setDatosEquipo(null);
        setEscaneado(false);
    }, []);

    if (!permission) {
        return <View style={styles.containerCentrado}><ActivityIndicator size="large" color="#525FE1" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.containerCentrado}>
                <Text style={styles.txtPermiso}>Necesitamos tu permiso para usar la cámara y escanear los equipos.</Text>
                <Button onPress={requestPermission} title="Conceder Permiso" color="#525FE1" />
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
                Alert.alert('QR Inválido', 'El formato del código no es reconocido por el sistema.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
                return;
            }

            setBuscandoBD(true);
            
            // OPTIMIZACIÓN: Se consulta directamente el endpoint por ID en lugar de traer todo el array completo
            const respuesta = await fetch(`${API_URL}/${idEquipo}`, { timeout: 5000 });
            const resultadoJSON = await respuesta.json();
            
            setBuscandoBD(false);

            if (respuesta.ok && resultadoJSON.success && resultadoJSON.datos) {
                setDatosEquipo(resultadoJSON.datos);
                setModalVisible(true);
            } else {
                Alert.alert('No encontrado', 'El activo no se encuentra registrado en el sistema.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
            }

        } catch (e) {
            setBuscandoBD(false);
            console.error('Error procesando QR:', e);
            Alert.alert('Error', 'No se pudo leer el código. Asegúrese de que sea un QR válido de la Posada.', [{ text: 'Ok', onPress: () => setEscaneado(false) }]);
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
            `¿Está seguro de actualizar la última fecha de revisión para el día de hoy (${fechaHoy})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, guardar', onPress: () => ejecutarGuardadoEnBD(fechaHoy) }
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            {isFocused ? (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={escaneado ? undefined : manejarEscaneoQr}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
            ) : (
                <View style={styles.containerCentrado}>
                    <ActivityIndicator size="large" color="#525FE1" />
                </View>
            )}
            
            <View style={styles.overlay}>
                <Text style={styles.textoGuia}>Apunta la cámara al código QR del equipo</Text>
                <View style={styles.cuadroEnfoque} />
                
                {buscandoBD && (
                    <View style={styles.cajaCargandoBD}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.txtCargandoBD}>Consultando base de datos...</Text>
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
                            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                                
                                <Text style={styles.modalTitulo}>📋 Información del Activo</Text>
                                
                                <View style={styles.cajaDatosBloqueados}>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>ID Equipo:</Text> #{datosEquipo.id}</Text>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>Nombre:</Text> {datosEquipo.nombre_equipo}</Text>
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>Ubicación:</Text> 📍 {datosEquipo.ubicacion}</Text>
                                    <Text style={styles.textoDetalle}>
                                        <Text style={styles.negrita}>Última Revisión:</Text> {datosEquipo.ultima_revision ? datosEquipo.ultima_revision.substring(0, 10) : 'Ninguna registrada'}
                                    </Text>
                                </View>

                                <View style={styles.divisor} />

                                <View style={styles.cajaFechaAutomatica}>
                                    <Text style={styles.labelInformativo}>📅 Fecha de asentamiento:</Text>
                                    <Text style={styles.textoFechaHoy}>{obtenerFechaHoyString()}</Text>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.botonAccion, { backgroundColor: '#10b981', marginTop: 20 }]} 
                                    onPress={presionarBotonGuardar}
                                    disabled={guardando}
                                    activeOpacity={0.8}
                                >
                                    {guardando ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.textoBotonAccion}>🔄 Guardar Revisión</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.botonAccion, { backgroundColor: '#ef4444', marginTop: 10 }]} 
                                    onPress={cerrarModalYReintentar}
                                    disabled={guardando}
                                    activeOpacity={0.8}
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
    txtPermiso: { textAlign: 'center', marginBottom: 15, color: '#475569', fontSize: 15 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    textoGuia: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(30, 41, 59, 0.85)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 25, fontWeight: '600' },
    cuadroEnfoque: { width: 220, height: 220, borderWidth: 3, borderColor: '#525FE1', borderRadius: 16, marginBottom: 25 },
    cajaCargandoBD: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
    txtCargandoBD: { color: '#fff', marginLeft: 8, fontSize: 13, fontWeight: '500' },
    
    // Modal Estilos
    fondoModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    contenidoModal: { backgroundColor: '#fff', width: '90%', maxHeight: '80%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
    modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15, textAlign: 'center' },
    cajaDatosBloqueados: { backgroundColor: '#f8fafc', width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    textoDetalle: { fontSize: 14, color: '#334155', marginBottom: 6 },
    negrita: { fontWeight: 'bold', color: '#1e293b' },
    divisor: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginVertical: 15 },
    
    cajaFechaAutomatica: { backgroundColor: '#f0fdf4', width: '100%', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' },
    labelInformativo: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
    textoFechaHoy: { fontSize: 22, fontWeight: 'bold', color: '#15803d', letterSpacing: 0.5 },
    
    botonAccion: { width: '100%', height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    textoBotonAccion: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});