import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: ESCÁNER DE CÓDIGOS QR
 * Función: Identifica equipos de la posada por QR y asienta la fecha de revisión técnica.
 */
export default function PantallaCamara({ navigation, route }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [escaneado, setEscaneado] = useState(false);
    const isFocused = useIsFocused(); 
    const { nombreUsuario: nombreDesdeRuta } = route?.params || {};

    // Estados de control
    const [modalVisible, setModalVisible] = useState(false);
    const [datosEquipo, setDatosEquipo] = useState(null);
    const [buscandoBD, setBuscandoBD] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    // Almacenamos tanto el nombre legible (para la interfaz) como el alias (para la API)
    const [nombreVisible, setNombreVisible] = useState(nombreDesdeRuta || 'Operario Técnico'); 
    // Almacena la descripción del trabajo técnico obligatorio
    const [detalleRevision, setDetalleRevision] = useState('');

    const API_URL = `${BASE_URL}/api/equipos`;

    const obtenerFechaHoyString = () => {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    };

    // Efecto coordinado con Login.js usando useIsFocused
    useEffect(() => {
        const cargarDatosSesion = async () => {
            try {
                const nombre = await AsyncStorage.getItem('nombreUsuario');
                const nombreFinal = nombreDesdeRuta || nombre || 'Operario Técnico';
                
                if (nombreFinal) setNombreVisible(nombreFinal);
            } catch (error) {
                console.error("Error cargando sesión en la cámara:", error);
            }
        };

        if (isFocused) {
            cargarDatosSesion();
        }
    }, [isFocused, nombreDesdeRuta]);

    useEffect(() => {
        if (!permission) { requestPermission(); }
    }, [permission, requestPermission]);

    const cerrarModalYReintentar = useCallback(() => {
        setModalVisible(false);
        setDatosEquipo(null);
        setEscaneado(false);
        setDetalleRevision('');
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

        let idEquipo = null;
        const contenidoQR = data ? data.trim() : '';

        try {
            if (contenidoQR.startsWith('{') && contenidoQR.endsWith('}')) {
                const objetoQR = JSON.parse(contenidoQR);
                idEquipo = objetoQR.id || objetoQR.id_simulado || objetoQR.id_equipo;
            } else {
                idEquipo = contenidoQR;
            }

            idEquipo = idEquipo ? parseInt(idEquipo, 10) : null;
            
            if (!idEquipo || isNaN(idEquipo)) {
                Alert.alert(
                    'QR No Reconocido 🔎', 
                    'El formato del código QR escaneado no contiene un identificador numérico válido.', 
                    [{ text: 'Reintentar', onPress: () => setEscaneado(false) }]
                );
                return;
            }

            setBuscandoBD(true);
            const respuesta = await fetch(`${API_URL}/${idEquipo}`, { timeout: 5000 });
            const resultadoJSON = await respuesta.json();
            setBuscandoBD(false);

            if (respuesta.ok && resultadoJSON.success && resultadoJSON.datos) {
                setDatosEquipo(resultadoJSON.datos);
                setModalVisible(true);
            } else {
                Alert.alert(
                    'No registrado ❌', 
                    `El equipo con el ID #${idEquipo} no existe en el sistema de la posada.`, 
                    [{ text: 'Ok', onPress: () => setEscaneado(false) }]
                );
            }

        } catch {
            setBuscandoBD(false);
            Alert.alert(
                'Error de Lectura', 
                'No se pudo conectar o interpretar el código QR.', 
                [{ text: 'Ok', onPress: () => setEscaneado(false) }]
            );
        }
    };

    const ejecutarGuardadoEnBD = async (fechaHoyAutomatica) => {
    try {
        setGuardando(true);

        const nombreDesdeStorage = await AsyncStorage.getItem('nombreUsuario');
        const nombreTecnicoParaGuardar = String(
            nombreVisible || nombreDesdeRuta || nombreDesdeStorage || 'Operario Técnico'
        ).trim();

        if (nombreTecnicoParaGuardar) {
            setNombreVisible(nombreTecnicoParaGuardar);
        }

        const urlCompleta = `${API_URL}/${datosEquipo.id}/revision`;

        console.log('📤 Enviando revisión con responsable:', nombreTecnicoParaGuardar);

        const respuesta = await fetch(urlCompleta, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nueva_fecha: fechaHoyAutomatica,
                detalle: detalleRevision.trim(),
                nombre_tecnico: nombreTecnicoParaGuardar,
                nombre: nombreTecnicoParaGuardar,
                nombreUsuario: nombreTecnicoParaGuardar
            })
        });

        if (respuesta.ok) {
            Alert.alert('Éxito 🎉', `Mantenimiento asentado con éxito por ${nombreVisible}.`);
            cerrarModalYReintentar();
        } else {
            const resultado = await respuesta.json();
            Alert.alert('Error', resultado.error || 'No se pudo guardar la revisión.');
        }
    } catch (error) {
        console.error(error);
        Alert.alert('Error de Red', 'Sin conexión con el servidor.');
    } finally {
        setGuardando(false);
    }
};

    const presionarBotonGuardar = () => {
        if (!detalleRevision.trim()) {
            Alert.alert(
                'Campo Obligatorio 🛑',
                'Debes escribir obligatoriamente el trabajo o revisión que realizaste para poder guardar.'
            );
            return;
        }

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
                <Text style={styles.badgeUsuario}>Sesión: {nombreVisible}</Text>

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
                                    <Text style={styles.textoDetalle}><Text style={styles.negrita}>Técnico Evaluador:</Text> 👤 {nombreVisible}</Text>
                                </View>

                                <View style={styles.divisor} />

                                <View style={styles.cajaFechaAutomatica}>
                                    <Text style={styles.labelInformativo}>📅 Fecha de asentamiento:</Text>
                                    <Text style={styles.textoFechaHoy}>{obtenerFechaHoyString()}</Text>
                                </View>

                                <View style={styles.cajaEntradaDetalle}>
                                    <Text style={styles.labelInput}>¿Qué trabajo se realizó en el equipo? 🛠️</Text>
                                    <TextInput
                                        style={[styles.inputTextoArea, guardando && styles.inputDeshabilitado]}
                                        placeholder="Ej: Limpieza de filtros, ajuste de cableado y revisión de arranque..."
                                        placeholderTextColor="#94a3b8"
                                        multiline={true}
                                        numberOfLines={3}
                                        value={detalleRevision}
                                        onChangeText={setDetalleRevision}
                                        editable={!guardando}
                                    />
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
    badgeUsuario: { position: 'absolute', top: 50, backgroundColor: 'rgba(16, 185, 129, 0.9)', color: '#fff', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
    fondoModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    contenidoModal: { backgroundColor: '#fff', width: '90%', maxHeight: '85%', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
    modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15, textAlign: 'center' },
    cajaDatosBloqueados: { backgroundColor: '#f8fafc', width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    textoDetalle: { fontSize: 14, color: '#334155', marginBottom: 6 },
    negrita: { fontWeight: 'bold', color: '#1e293b' },
    divisor: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginVertical: 15 },
    cajaFechaAutomatica: { backgroundColor: '#f0fdf4', width: '100%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', marginBottom: 15 },
    labelInformativo: { fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
    textoFechaHoy: { fontSize: 22, fontWeight: 'bold', color: '#15803d', letterSpacing: 0.5 },
    cajaEntradaDetalle: { width: '100%', marginTop: 5 },
    labelInput: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
    inputTextoArea: { width: '100%', minHeight: 75, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 13, color: '#0f172a', textAlignVertical: 'top' },
    inputDeshabilitado: { backgroundColor: '#e2e8f0', color: '#94a3b8' },
    botonAccion: { width: '100%', height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    textoBotonAccion: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});