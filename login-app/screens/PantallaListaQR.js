import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, InteractionManager 
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import { BASE_URL } from './apiConfig'; 
import * as FileSystem from 'expo-file-system/legacy'; 

export default function PantallaListaQR({ navigation, route }) {
  const { idUsuario } = route.params || {};
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoFlujo, setProcesandoFlujo] = useState(false); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [ubicacionEdit, setUbicacionEdit] = useState('');
  const [frecuenciaEdit, setFrecuenciaEdit] = useState('');
  
  // ✨ NUEVO ESTADO: Guarda el historial obtenido del endpoint relacional
  const [historialActivo, setHistorialActivo] = useState([]);

  const qrRef = useRef(null);
  const API_URL = `${BASE_URL}/api/equipos`;

  const obtenerEquiposBD = async () => {
    try {
      setCargando(true);
      const respuesta = await fetch(API_URL);
      const datos = await respuesta.json();
      
      if (respuesta.ok && datos.success) {
        setEquipos(datos.datos); 
      } else {
        Alert.alert('Error', 'No se pudieron recuperar los activos del servidor.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error de conexión', 'Verifica el backend y tu red Wi-Fi.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerEquiposBD();
    const ordenarRecarga = navigation.addListener('focus', () => {
      obtenerEquiposBD();
    });
    return ordenarRecarga;
  }, [navigation]);

  const ejecutarEliminacion = async (idEquipo) => {
    try {
      setCargando(true);
      const respuesta = await fetch(`${API_URL}/${idEquipo}`, {
        method: 'DELETE',
      });
      const resultado = await respuesta.json();

      if (respuesta.ok && resultado.success) {
        Alert.alert('Eliminado 🗑️', 'El equipo ha sido removido del sistema con éxito.');
        obtenerEquiposBD(); 
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo eliminar el activo.');
        setCargando(false);
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      Alert.alert('Error de Red', 'No se pudo comunicar con el servidor.');
      setCargando(false);
    }
  };

  const presionarBotonEliminar = (equipo) => {
    Alert.alert(
      '⚠️ ELIMINAR ACTIVO',
      `¿Estás completamente seguro de eliminar el equipo "${equipo.nombre_equipo}"? Esta acción borrará permanentemente el registro en PostgreSQL.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, Eliminar', style: 'destructive', onPress: () => ejecutarEliminacion(equipo.id) }
      ],
      { cancelable: true }
    );
  };

  // 🔄 MODIFICADO: Ahora hace FETCH individual al abrir para jalar el historial
  const abrirEditorYQR = async (equipo) => {
    setIdSeleccionado(equipo.id);
    setNombreEdit(equipo.nombre_equipo);
    setUbicacionEdit(equipo.ubicacion);
    setFrecuenciaEdit(equipo.frecuencia_mantenimiento ? equipo.frecuencia_mantenimiento.toString() : '90');
    setHistorialActivo([]); // Limpiar historial anterior
    setModalVisible(true);

    try {
      const res = await fetch(`${API_URL}/${equipo.id}`);
      const JSONres = await res.json();
      if (res.ok && JSONres.success && JSONres.datos.historial) {
        setHistorialActivo(JSONres.datos.historial); // Guardamos la bitácora relacional de Postgres
      }
    } catch (err) {
      console.log('No se pudo obtener el historial para este ID:', err.message);
    }
  };

  const ejecutarActualizacionYDescarga = async () => {
    try {
      setProcesandoFlujo(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para guardar el nuevo código QR.');
        setProcesandoFlujo(false);
        return;
      }

      const respuesta = await fetch(`${API_URL}/${idSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEdit.trim(),
          ubicacion: ubicacionEdit.trim(),
          frecuencia_mantenimiento: parseInt(frecuenciaEdit, 10) || 90,
          registrado_por: idUsuario ? parseInt(idUsuario, 10) : null 
        })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        Alert.alert('Error de Base de Datos', resultado.error || 'No se pudieron guardar los datos.');
        setProcesandoFlujo(false);
        return;
      }

      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));

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

      const nombreArchivo = `QR_Actualizado_ID${idSeleccionado}_${Date.now()}.png`;
      const rutaTemporal = `${FileSystem.cacheDirectory}${nombreArchivo}`;

      await FileSystem.writeAsStringAsync(rutaTemporal, dataURL, {
        encoding: 'base64',
      });

      await MediaLibrary.saveToLibraryAsync(rutaTemporal);

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
      <View style={styles.tarjeta}>
        <TouchableOpacity style={styles.infoIzquierda} onPress={() => abrirEditorYQR(item)} activeOpacity={0.6}>
          <Text style={styles.idBadge}>ID: #{item.id}</Text>
          <Text style={styles.itemNombre}>{item.nombre_equipo}</Text>
          <Text style={styles.itemUbicacion}>📍 {item.ubicacion}</Text>
          <Text style={styles.itemFecha}>🔧 Última revisión: {fechaFormateada}</Text>
          {item.nombre_usuario && <Text style={styles.revisado}>👤 Por: {item.nombre_usuario}</Text>}
        </TouchableOpacity>

        <View style={styles.columnaAcciones}>
          <TouchableOpacity style={styles.indicadorQR} onPress={() => abrirEditorYQR(item)}>
            <Text style={styles.textoMiniQR}>⚙️ QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonEliminarTarjeta} onPress={() => presionarBotonEliminar(item)}>
            <Text style={styles.textoEliminarTarjeta}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitulo}>Inventario de Equipos Registrados</Text>

      {cargando ? (
        <View style={styles.centroCarga}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.textoCarga}>Procesando base de datos...</Text>
        </View>
      ) : (
        <FlatList
          data={equipos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listaContenedor}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.listaVacia}>No hay equipos registrados en el sistema todavía.</Text>
          }
        />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !procesandoFlujo && setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.modalTitulo}>Gestión del Activo #{idSeleccionado}</Text>
              
              <View style={styles.qrModalContainer}>
                {idSeleccionado && (
                  <QRCode 
                    value={cadenaDatosQR} 
                    size={160} 
                    backgroundColor="#fff" 
                    color="#0f172a" 
                    getRef={qrRef}
                  />
                )}
              </View>
              <Text style={styles.modalInstrucciones}>El QR cambia automáticamente si editas los datos de abajo.</Text>

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

              {/* ✨ NUEVO: SECCIÓN DE BITÁCORA HISTÓRICA DENTRO DEL SCROLLVIEW */}
              <View style={styles.seccionHistorial}>
                <Text style={styles.tituloSeccionHistorial}>📜 Historial de Revisiones / Arreglos</Text>
                {historialActivo.length === 0 ? (
                  <Text style={styles.txtHistorialVacio}>No hay mantenimientos previos registrados para este QR.</Text>
                ) : (
                  historialActivo.map((log) => (
                    <View key={log.id} style={styles.itemHistorialFila}>
                      <View style={styles.encabezadoFilaHistorial}>
                        <Text style={styles.txtHistorialResponsable}>👤 {log.responsable}</Text>
                        <Text style={styles.txtHistorialFecha}>📅 {log.fecha}</Text>
                      </View>
                      <Text style={styles.txtHistorialDetalle}>{log.detalle}</Text>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity 
                style={[styles.botonGuardar, procesandoFlujo && styles.botonDeshabilitado]} 
                onPress={presionarBotonGuardar}
                disabled={procesandoFlujo}
                activeOpacity={0.8}
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
                activeOpacity={0.7}
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
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 15 },
  subtitulo: { fontSize: 15, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 15 },
  centroCarga: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCarga: { marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: '500' },
  listaContenedor: { paddingBottom: 20 },
  listaVacia: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 14, fontWeight: '500' },
  tarjeta: { 
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2
  },
  infoIzquierda: { flex: 1, paddingRight: 10 },
  idBadge: { backgroundColor: '#e2e8f0', color: '#475569', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  itemNombre: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  itemUbicacion: { fontSize: 13, color: '#475569', marginBottom: 4, fontWeight: '500' },
  revisado: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '500' },
  itemFecha: { fontSize: 12, color: '#0f766e', fontWeight: '600' },
  columnaAcciones: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  indicadorQR: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  textoMiniQR: { fontSize: 11, color: '#3b82f6', fontWeight: '700' },
  botonEliminarTarjeta: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' },
  textoEliminarTarjeta: { fontSize: 13 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.3)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  contenidoModal: { backgroundColor: '#fff', width: '100%', maxHeight: '85%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  qrModalContainer: { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  modalInstrucciones: { fontSize: 11, color: '#64748b', marginBottom: 16, textAlign: 'center', fontWeight: '500', paddingHorizontal: 10 },
  formEdicion: { width: '100%', marginBottom: 15 },
  labelModal: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 5 },
  inputModal: { width: '100%', height: 44, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, color: '#0f172a', backgroundColor: '#f8fafc', fontSize: 14 },
  inputDeshabilitado: { backgroundColor: '#e2e8f0', color: '#94a3b8' },
  botonGuardar: { backgroundColor: '#8b5cf6', paddingVertical: 13, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 10, elevation: 1 },
  botonDeshabilitado: { backgroundColor: '#cbd5e1' },
  textoBotonAccion: { color: '#fff', fontSize: 14, fontWeight: '600' },
  botonCerrarModal: { backgroundColor: '#ffffff', paddingVertical: 12, borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#64748b' },
  textoBotonCerrar: { color: '#64748b', fontSize: 14, fontWeight: '600' },

  // ✨ NUEVOS ESTILOS PARA LA SECCIÓN DE REPARACIONES
  seccionHistorial: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 20 },
  tituloSeccionHistorial: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 10, textTransform: 'uppercase' },
  txtHistorialVacio: { fontSize: 12, color: '#64748b', textAlign: 'center', fontStyle: 'italic', paddingVertical: 8 },
  itemHistorialFila: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  encabezadoFilaHistorial: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txtHistorialResponsable: { fontSize: 12, fontWeight: '700', color: '#334155' },
  txtHistorialFecha: { fontSize: 11, color: '#64748b' },
  txtHistorialDetalle: { fontSize: 12, color: '#475569', lineHeight: 16 }
});