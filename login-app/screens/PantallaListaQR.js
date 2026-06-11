import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';

// CORREGIDO: Importación exacta usando desestructuración con llaves { } 
import { BASE_URL } from './apiConfig'; 

// Mantenemos la importación legacy que solucionó el error en Expo 54
import * as FileSystem from 'expo-file-system/legacy'; 

export default function PantallaListaQR({ navigation, route }) {
  const {idUsuario} = route.params || {};
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoFlujo, setProcesandoFlujo] = useState(false); // Estado para evitar doble envío
  
  // Estados para el Modal de Edición y QR
  const [modalVisible, setModalVisible] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [ubicacionEdit, setUbicacionEdit] = useState('');
  const [frecuenciaEdit, setFrecuenciaEdit] = useState('');

  // Referencia para capturar el gráfico del código QR dinámico
  const qrRef = useRef(null);

  // Endpoint unificado usando la constante importada
  const API_URL = `${BASE_URL}/api/equipos`;

  const obtenerEquiposBD = async () => {
    try {
      setCargando(true);
      const respuesta = await fetch(API_URL);
      const datos = await respuesta.json();
      
      // CORREGIDO: Tu backend retorna los renglones en la propiedad '.datos'
      if (respuesta.ok && datos.success) {
        setEquipos(datos.datos); 
      } else {
        Alert.alert('Error', 'No se pudieron recuperar los activos del servidor.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error de conexión', 'Verifica el backend y tu red Wi-Fi.');
    } finally {
      // Pequeño timeout por si la respuesta es instantánea, asegurando estabilidad visual
      setTimeout(() => setCargando(false), 300);
    }
  };

  useEffect(() => {
    obtenerEquiposBD();
    const ordenarRecarga = navigation.addListener('focus', () => {
      obtenerEquiposBD();
    });
    return ordenarRecarga;
  }, [navigation]);

  const abrirEditorYQR = (equipo) => {
    setIdSeleccionado(equipo.id);
    setNombreEdit(equipo.nombre_equipo);
    setUbicacionEdit(equipo.ubicacion);
    setFrecuenciaEdit(equipo.frecuencia_mantenimiento ? equipo.frecuencia_mantenimiento.toString() : '90');
    setModalVisible(true);
  };

  const ejecutarActualizacionYDescarga = async () => {
    try {
      setProcesandoFlujo(true);

      // 1. Validar primero los permisos de almacenamiento/galería
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para guardar el nuevo código QR.');
        setProcesandoFlujo(false);
        return;
      }

      // 2. Ejecutar la actualización en PostgreSQL a través de la API
      const respuesta = await fetch(`${API_URL}/${idSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEdit.trim(),
          ubicacion: ubicacionEdit.trim(),
          frecuencia_mantenimiento: parseInt(frecuenciaEdit, 10) || 90,
          registrado_por: idUsuario
        })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        Alert.alert('Error de Base de Datos', resultado.error || 'No se pudieron guardar los datos.');
        setProcesandoFlujo(false);
        return;
      }

      // 3. Si la BD se actualizó con éxito, procedemos a capturar el Base64 del QR actual
      if (!qrRef.current) {
        Alert.alert('Error de Render', 'El gráfico QR no está listo para ser exportado.');
        setProcesandoFlujo(false);
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
        Alert.alert('Error', 'No se pudieron procesar los datos gráficos del nuevo QR.');
        setProcesandoFlujo(false);
        return;
      }

      // 4. Crear el archivo PNG temporal en el caché del celular
      const nombreArchivo = `QR_Actualizado_ID${idSeleccionado}_${Date.now()}.png`;
      const rutaTemporal = `${FileSystem.cacheDirectory}${nombreArchivo}`;

      await FileSystem.writeAsStringAsync(rutaTemporal, dataURL, {
        encoding: 'base64',
      });

      // 5. Mover el archivo temporal directamente al carrete de fotos
      await MediaLibrary.saveToLibraryAsync(rutaTemporal);

      // 6. Notificar éxito, cerrar modal y refrescar la tabla del inventario
      Alert.alert(
        '¡Actualización Exitosa! 🔄📥', 
        `Los datos del activo #${idSeleccionado} se guardaron en PostgreSQL y el nuevo código QR se descargó automáticamente en tu galería para que lo imprimas.`
      );
      
      setModalVisible(false);
      obtenerEquiposBD();

    } catch (error) {
      console.error('Error en el flujo de actualización:', error);
      Alert.alert('Error General', 'Ocurrió un problema al sincronizar o guardar el QR.');
    } finally {
      setProcesandoFlujo(false);
    }
  };

  const presionarBotonGuardar = () => {
    if (!nombreEdit.trim() || !ubicacionEdit.trim()) {
      Alert.alert('Campos Incompletos 🛑', 'El nombre y la ubicación del activo no pueden estar vacíos.');
      return;
    }

    Alert.alert(
      'Confirmar Modificación 📋',
      `¿Está seguro de actualizar los datos del activo #${idSeleccionado} y descargar la nueva etiqueta QR en la galería?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, guardar', onPress: ejecutarActualizacionYDescarga, style: 'default' }
      ],
      { cancelable: true }
    );
  };

  // Cadena JSON en tiempo real para el componente QR
  const cadenaDatosQR = JSON.stringify({
    id: idSeleccionado,
    nombre_equipo: nombreEdit.trim(),
    ubicacion: ubicacionEdit.trim(),
    frecuencia_mantenimiento: parseInt(frecuenciaEdit, 10) || 90
  });

  const renderItem = ({ item }) => {
    const fechaFormateada = item.ultima_revision 
      ? new Date(item.ultima_revision).toLocaleDateString('es-VE') 
      : 'Sin revisiones';

    return (
      <TouchableOpacity style={styles.tarjeta} onPress={() => abrirEditorYQR(item)}>
        <View style={styles.infoIzquierda}>
          <Text style={styles.idBadge}>ID: #{item.id}</Text>
          <Text style={styles.itemNombre}>{item.nombre_equipo}</Text>
          <Text style={styles.itemUbicacion}>📍 {item.ubicacion}</Text>
          <Text style={styles.itemFecha}>🔧 Última revisión: {fechaFormateada}</Text>
          <Text style={styles.revisado}>{item.nombre_usuario}</Text>
        </View>
        <View style={styles.indicadorQR}>
          <Text style={styles.textoMiniQR}>⚙️ Editar / QR</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitulo}>Inventario de Equipos Registrados</Text>

      {cargando ? (
        <View style={styles.centroCarga}>
          <ActivityIndicator size="large" color="#1a365d" />
          <Text style={styles.textoCarga}>Consultando PostgreSQL...</Text>
        </View>
      ) : (
        <FlatList
          data={equipos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listaContenedor}
          ListEmptyComponent={
            <Text style={styles.listaVacia}>No hay equipos registrados en el sistema todavía.</Text>
          }
        />
      )}

      {/* MODAL INTEGRADO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !procesandoFlujo && setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              
              <Text style={styles.modalTitulo}>Gestión del Activo #{idSeleccionado}</Text>
              
              {/* Sección del QR con la referencia integrada */}
              <View style={styles.qrModalContainer}>
                {idSeleccionado && (
                  <QRCode 
                    value={cadenaDatosQR} 
                    size={160} 
                    backgroundColor="#fff" 
                    color="#1a365d" 
                    getRef={qrRef}
                  />
                )}
              </View>
              <Text style={styles.modalInstrucciones}>El QR cambia automáticamente si editas los datos de abajo.</Text>

              {/* Formulario de Edición */}
              <View style={styles.formEdicion}>
                <Text style={styles.labelModal}>Nombre del Equipo:</Text>
                <TextInput 
                  style={[styles.inputModal, procesandoFlujo && styles.inputDeshabilitado]} 
                  value={nombreEdit} 
                  onChangeText={setNombreEdit} 
                  editable={!procesandoFlujo}
                />

                <Text style={styles.labelModal}>Ubicación:</Text>
                <TextInput 
                  style={[styles.inputModal, procesandoFlujo && styles.inputDeshabilitado]} 
                  value={ubicacionEdit} 
                  onChangeText={setUbicacionEdit} 
                  editable={!procesandoFlujo}
                />

                <Text style={styles.labelModal}>Frecuencia Mantenimiento (Días):</Text>
                <TextInput 
                  style={[styles.inputModal, procesandoFlujo && styles.inputDeshabilitado]} 
                  value={frecuenciaEdit} 
                  onChangeText={setFrecuenciaEdit} 
                  keyboardType="numeric"
                  editable={!procesandoFlujo}
                />
              </View>

              {/* Botón Principal unificado con bloqueo anti-spam */}
              <TouchableOpacity 
                style={[styles.botonGuardar, procesandoFlujo && styles.botonDeshabilitado]} 
                onPress={presionarBotonGuardar}
                disabled={procesandoFlujo}
              >
                {procesandoFlujo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoBotonAccion}>💾 Guardar Cambios y Descargar QR</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.botonCerrarModal, procesandoFlujo && styles.botonDeshabilitado]} 
                onPress={() => setModalVisible(false)}
                disabled={procesandoFlujo}
              >
                <Text style={styles.textoBotonCerrar}>Volver Atrás</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 15 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 15 },
  centroCarga: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCarga: { marginTop: 10, color: '#475569', fontSize: 14 },
  listaContenedor: { paddingBottom: 20 },
  listaVacia: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 15 },
  tarjeta: { 
    backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 
  },
  infoIzquierda: { flex: 1 },
  idBadge: { backgroundColor: '#e2e8f0', color: '#334155', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  itemNombre: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 3 },
  itemUbicacion: { fontSize: 13, color: '#475569', marginBottom: 3 },
  revisado:{ fontSize: 13, color: '#475569', marginBottom: 3 },
  itemFecha: { fontSize: 12, color: '#0f766e', fontWeight: '500' },
  indicadorQR: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 6 },
  textoMiniQR: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 15 },
  contenidoModal: { backgroundColor: '#fff', width: '100%', maxHeight: '90%', borderRadius: 12, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 15 },
  qrModalContainer: { padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 5 },
  modalInstrucciones: { fontSize: 11, color: '#64748b', marginBottom: 15, textAlign: 'center' },
  formEdicion: { width: '100%', marginBottom: 15 },
  labelModal: { fontSize: 13, fontWeight: '500', color: '#334155', marginBottom: 4 },
  inputModal: { width: '100%', height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 10, marginBottom: 12, color: '#1e293b' },
  inputDeshabilitado: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  botonGuardar: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 6, width: '100%', alignItems: 'center', marginBottom: 10 },
  botonDeshabilitado: { backgroundColor: '#94a3b8' },
  textoBotonAccion: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  botonCerrarModal: { backgroundColor: '#64748b', paddingVertical: 10, borderRadius: 6, width: '100%', alignItems: 'center' },
  textoBotonCerrar: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
});