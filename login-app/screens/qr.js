import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as MediaLibrary from 'expo-media-library';
import { BASE_URL } from './apiConfig';

export default function PantallaQR({ navigation, route }) {
  const {idUsuario} = route.params || {};
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [frecuencia, setFrecuencia] = useState('90');
  const [qrGenerado, setQrGenerado] = useState(null);
  
  const qrRef = useRef(null);

  // URL del endpoint unificado
  const API_URL = `${BASE_URL}/api/equipos`; 

  const manejarGenerarYGuardarBD = async () => {
    // Validamos en el cliente antes de gastar datos de red o procesar
    if (!nombreEquipo.trim() || !ubicacion.trim()) {
      Alert.alert('Error', 'Por favor llena el nombre del equipo y la ubicación.');
      return;
    }

    // Convertimos a entero de forma segura
    const diasFrecuencia = parseInt(frecuencia, 10);

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_equipo: nombreEquipo.trim(),
          ubicacion: ubicacion.trim(),
          frecuencia_mantenimiento: isNaN(diasFrecuencia) ? 90 : diasFrecuencia,
          registrado_por: idUsuario
        })
      });

      const datosSrv = await respuesta.json();

      if (respuesta.status === 201) {
        const equipoReal = datosSrv.equipo;

        // Estructura limpia para codificar dentro del código QR
        const datosParaQR = {
          id: equipoReal.id, 
          nombre_equipo: equipoReal.nombre_equipo,
          ubicacion: equipoReal.ubicacion,
          frecuencia_mantenimiento: equipoReal.frecuencia_mantenimiento
        };

        // CORREGIDO: Ahora usa correctamente la variable de estado 'setQrGenerado'
        setQrGenerado(JSON.stringify(datosParaQR));
        
        Alert.alert('Éxito 🎉', `Equipo guardado en PostgreSQL con el ID: ${equipoReal.id}. Código QR generado.`);
        
        // Limpiar los campos del formulario de manera exitosa
        setNombreEquipo('');
        setUbicacion('');
        setFrecuencia('90');
      } else {
        // Mapeo dinámico de errores desde el Backend optimizado
        const mensajeError = datosSrv.error || datosSrv.mensaje || 'No se pudo registrar el activo.';
        Alert.alert('Error del Servidor', mensajeError);
      }

    } catch (error) {
      console.error('❌ Error en petición POST:', error);
      Alert.alert('Error de Red', 'No se pudo conectar con el backend de la Posada. Verifica tu red local.');
    }
  };

  const descargarImagenQR = async () => {
    if (!qrRef.current) {
      Alert.alert('Error', 'No se ha detectado el gráfico del QR.');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Para guardar el QR en tu teléfono necesitamos acceso a la galería.');
        return;
      }

      const obtenerBase64 = () => {
        return new Promise((resolve) => {
          qrRef.current.toDataURL((data) => {
            resolve(data);
          });
        });
      };

      const dataURL = await obtenerBase64();

      if (!dataURL) {
        Alert.alert('Error', 'No se pudieron extraer los datos gráficos del código QR.');
        return;
      }

      const nombreArchivo = `QR_Activo_${Date.now()}.png`;
      const rutaTemporal = `${FileSystem.cacheDirectory}${nombreArchivo}`;

      await FileSystem.writeAsStringAsync(rutaTemporal, dataURL, {
        encoding: 'base64',
      });

      await MediaLibrary.saveToLibraryAsync(rutaTemporal);
      Alert.alert('¡Guardado Exitoso! 📥', 'El código QR se descargó en tu galería como imagen PNG. Ya lo tienes listo para imprimir.');

    } catch (error) {
      console.error('Error al descargar QR:', error);
      Alert.alert('Fallo de exportación', 'No se pudo guardar la imagen en el almacenamiento.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitulo}>Registrar Nuevo Activo / Equipo</Text>

      <View style={styles.formulario}>
        <Text style={styles.label}>Nombre del Equipo (Aire, Bomba, Tanque):</Text>
        <TextInput
          style={styles.input}
          value={nombreEquipo}
          onChangeText={setNombreEquipo}
          placeholder="Ej. Aire Acondicionado Hab 102"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Ubicación dentro de la Posada:</Text>
        <TextInput
          style={styles.input}
          value={ubicacion}
          onChangeText={setUbicacion}
          placeholder="Ej. Planta Alta - Pasillo"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Frecuencia de Mantenimiento (Días):</Text>
        <TextInput
          style={styles.input}
          value={frecuencia}
          onChangeText={setFrecuencia}
          keyboardType="numeric"
          placeholder="Ej. 90"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity style={styles.botonPrincipal} onPress={manejarGenerarYGuardarBD}>
          <Text style={styles.textoBoton}>💾 Registrar y Crear QR</Text>
        </TouchableOpacity>
      </View>

      {qrGenerado && (
        <View style={styles.qrBox}>
          <QRCode 
            value={qrGenerado} 
            size={170} 
            backgroundColor="#fff" 
            color="#1a365d"
            getRef={qrRef} 
          />
          <Text style={styles.infoQr}>QR vinculado al ID real de tu PostgreSQL.</Text>
          <TouchableOpacity style={styles.botonDescargar} onPress={descargarImagenQR}>
            <Text style={styles.textoBotonDescargar}>📥 Descargar Código QR (PNG)</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.menuBotones}>
        <TouchableOpacity 
          style={[styles.botonMenu, { backgroundColor: '#0284c7' }]} 
          onPress={() => navigation.navigate('PantallaCamara')}
        >
          <Text style={styles.textoBoton}>📷 Escanear QR (Cámara)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.botonMenu, { backgroundColor: '#0f766e' }]} 
          onPress={() => navigation.navigate('PantallaListaQR', idUsuario)}
        >
          <Text style={styles.textoBoton}>📋 Ver todos los QRs creados</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, alignItems: 'center' },
  subtitulo: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 15, alignSelf: 'flex-start' },
  formulario: { width: '100%', backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
  label: { fontSize: 14, color: '#475569', marginBottom: 5, fontWeight: '500' },
  input: { width: '100%', height: 45, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 10, marginBottom: 15, color: '#1e293b' },
  botonPrincipal: { width: '100%', height: 45, backgroundColor: '#1a365d', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '600' },
  qrBox: { alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '100%', elevation: 2, marginBottom: 20 },
  infoQr: { fontSize: 12, color: '#64748b', marginTop: 10, textAlign: 'center' },
  botonDescargar: { marginTop: 12, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  textoBotonDescargar: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  menuBotones: { width: '100%', marginTop: 10 },
  botonMenu: { width: '100%', height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 2 }
});