import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert,ActivityIndicator, Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from './apiConfig';

export default function PantallaQR({ navigation, route }) {
  const { idUsuario, nombreUsuario } = route.params || {};
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [frecuencia, setFrecuencia] = useState('90');
  const [qrGenerado, setQrGenerado] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const qrRef = useRef(null);
  const API_URL = `${BASE_URL}/api/equipos`; 

  // 1. Registrar Activo en la Base de Datos y preparar JSON para QR
  const manejarGenerarYGuardarBD = async () => {
    if (!nombreEquipo.trim() || !ubicacion.trim() ) {
      return Alert.alert('Campos Incompletos', 'Por favor ingresa el nombre del equipo y su ubicación.');
    }
    
     if (nombreEquipo.trim().length < 6  || ubicacion.trim().length < 5 ) {
      return Alert.alert('Campos Incompletos', 'Por favor ingrese un minimo de 5 caracteres ');
    }

    Keyboard.dismiss();
    const diasFrecuencia = parseInt(frecuencia, 10);
    setCargando(true);

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEquipo.trim(),
          ubicacion: ubicacion.trim(),
          frecuencia_mantenimiento: isNaN(diasFrecuencia) ? 90 : diasFrecuencia,
          registrado_por: idUsuario
        })
      });

      const datosSrv = await respuesta.json();

      if (respuesta.status === 201 && datosSrv.equipo) {
        const equipoReal = datosSrv.equipo;
        const datosParaQR = {
          id: equipoReal.id, 
          nombre_equipo: equipoReal.nombre_equipo,
          ubicacion: equipoReal.ubicacion,
          frecuencia_mantenimiento: equipoReal.frecuencia_mantenimiento
        };

        setQrGenerado(JSON.stringify(datosParaQR));
        Alert.alert('Éxito 🎉', `Equipo registrado correctamente con el ID: ${equipoReal.id}.`);
        
        // Limpieza de campos del formulario
        setNombreEquipo('');
        setUbicacion('');
        setFrecuencia('90');
      } else {
        const mensajeError = datosSrv.error || datosSrv.mensaje || 'No se pudo registrar el activo.';
        Alert.alert('Error del Servidor', mensajeError);
      }
    } catch (error) {
      console.error('❌ Error en petición POST:', error);
      Alert.alert('Error de Red', 'No se pudo conectar con el backend de la Posada. Verifica tu red local.');
    } finally {
      setCargando(false);
    }
  };

  // 2. Exportar el gráfico del código QR como imagen a la galería
  const descargarImagenQR = async () => {
    if (!qrRef.current) {
      return Alert.alert('Error', 'No se ha detectado el gráfico del QR.');
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para guardar la etiqueta QR.');
      }

      const obtenerBase64 = () => {
        return new Promise((resolve) => {
          qrRef.current.toDataURL((data) => { resolve(data); });
        });
      };

      const dataURL = await obtenerBase64();
      if (!dataURL) {
        return Alert.alert('Error', 'No se pudieron extraer los datos gráficos.');
      }

      const archivoTemp = new FileSystem.File(FileSystem.Paths.cache, `QR_Activo_${Date.now()}.png`);
      await FileSystem.writeAsStringAsync(archivoTemp.uri, dataURL, { encoding: 'base64' });
      await MediaLibrary.saveToLibraryAsync(archivoTemp.uri);
      
      Alert.alert('¡Guardado Exitoso! 📥', 'El código QR se descargó en tu galería como imagen PNG. Está listo para imprimir.');
    } catch (error) {
      console.error('Error al descargar QR:', error);
      Alert.alert('Fallo de exportación', 'No se pudo guardar la imagen en el almacenamiento.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={styles.subtitulo}>Registrar Nuevo Activo / Equipo</Text>

        {/* FORMULARIO */}
        <View style={styles.formulario}>
          <Text style={styles.label}>Nombre del Equipo</Text>
          <TextInput
            style={styles.input}
            value={nombreEquipo}
            onChangeText={setNombreEquipo}
            placeholder="Ej. Aire Acondicionado Hab 102"
            placeholderTextColor="#94a3b8"
            editable={!cargando}
          />

          <Text style={styles.label}>Ubicación dentro de la Posada</Text>
          <TextInput
            style={styles.input}
            value={ubicacion}
            onChangeText={setUbicacion}
            placeholder="Ej. Planta Alta - Pasillo"
            placeholderTextColor="#94a3b8"
            editable={!cargando}
          />

          <Text style={styles.label}>Frecuencia de Mantenimiento (Días)</Text>
          <TextInput
            style={styles.input}
            value={frecuencia}
            onChangeText={setFrecuencia}
            keyboardType="numeric"
            placeholder="Ej. 90"
            placeholderTextColor="#94a3b8"
            editable={!cargando}
          />

          <TouchableOpacity 
            style={[styles.botonPrincipal, cargando && { backgroundColor: '#cbd5e1' }]} 
            onPress={manejarGenerarYGuardarBD} 
            disabled={cargando}
            activeOpacity={0.8}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="database-plus" size={20} color="#fff" style={styles.iconoBoton} />
                <Text style={styles.textoBoton}>Registrar y Crear QR</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* VISUALIZADOR DE QR GENERADO */}
        {qrGenerado && (
          <View style={styles.qrBox}>
            <Text style={styles.qrBoxTitulo}>Etiqueta Generada</Text>
            <View style={styles.qrContenedorGrafico}>
              <QRCode 
                value={qrGenerado} 
                size={160} 
                backgroundColor="#fff" 
                color="#0f172a"
                getRef={qrRef} 
              />
            </View>
            <Text style={styles.infoQr}>Código único sincronizado con PostgreSQL.</Text>
            
            <TouchableOpacity style={styles.botonDescargar} onPress={descargarImagenQR} activeOpacity={0.8}>
              <FontAwesome name="download" size={16} color="#fff" style={styles.iconoBoton} />
              <Text style={styles.textoBotonDescargar}>Descargar QR (PNG)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MENÚ DE ACCIONES COMPLEMENTARIAS */}
        <Text style={styles.seccionAcciones}>Opciones de Inventario</Text>
        <View style={styles.menuBotones}>
          <TouchableOpacity 
            style={[styles.botonMenu, { backgroundColor: '#ffffff', borderColor: '#3b82f6', borderWidth: 1 }]} 
            onPress={() => navigation.navigate('PantallaCamara', { nombreUsuario })}
            activeOpacity={0.7}
          >
            <FontAwesome name="camera" size={18} color="#3b82f6" style={styles.iconoBoton} />
            <Text style={[styles.textoBoton, { color: '#3b82f6' }]}>Escanear con Cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.botonMenu, { backgroundColor: '#ffffff', borderColor: '#475569', borderWidth: 1 }]} 
            onPress={() => navigation.navigate('PantallaListaQR', { idUsuario })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="clipboard-text-multiple" size={19} color="#475569" style={styles.iconoBoton} />
            <Text style={[styles.textoBoton, { color: '#475569' }]}>Ver Todos los Activos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40, alignItems: 'center' },
  subtitulo: { fontSize: 15, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, alignSelf: 'flex-start' },
  formulario: { width: '100%', backgroundColor: '#fff', padding: 18, borderRadius: 16, elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, marginBottom: 20 },
  label: { fontSize: 13, color: '#334155', marginBottom: 6, fontWeight: '600' },
  input: { width: '100%', height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, marginBottom: 16, color: '#0f172a', fontSize: 14 },
  botonPrincipal: { width: '100%', height: 48, backgroundColor: '#8b5cf6', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, elevation: 1 },
  iconoBoton: { marginRight: 8 },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '600' },
  qrBox: { alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '100%', elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, marginBottom: 20 },
  qrBoxTitulo: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  qrContenedorGrafico: { padding: 12, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  infoQr: { fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  botonDescargar: { marginTop: 14, backgroundColor: '#0f172a', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textoBotonDescargar: { color: '#fff', fontWeight: '600', fontSize: 13 },
  seccionAcciones: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10, marginBottom: 10, alignSelf: 'flex-start' },
  menuBotones: { width: '100%' },
  botonMenu: { width: '100%', height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }
});