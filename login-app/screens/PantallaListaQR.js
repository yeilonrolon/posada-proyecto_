import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from './apiConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
const API_URL = `${BASE_URL}/api/equipos`;

export default function PantallaListaQR() {
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Estados para modal de edición
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [procesandoFlujo, setProcesandoFlujo] = useState(false);

  // Estados para el Historial
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const qrRef = useRef(null);

  const obtenerEquipos = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        setEquipos(data.datos);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los equipos.');
      }
    } catch (error) {
      console.error('Error al obtener equipos:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    obtenerEquipos();
  }, []);

  const alRefrescar = () => {
    setRefrescando(true);
    obtenerEquipos();
  };

  // Carga del equipo + su historial al presionar Editar
  const abrirModalEditar = async (item) => {
    setIdSeleccionado(item.id);
    setNombreEquipo(item.nombre_equipo || '');
    setUbicacion(item.ubicacion || '');
    setFrecuencia(String(item.frecuencia_mantenimiento || '90'));
    setModalEditarVisible(true);

    setCargandoHistorial(true);
    setHistorial([]);

    try {
      const res = await fetch(`${API_URL}/${item.id}`);
      const data = await res.json();

      if (data.success && data.datos && Array.isArray(data.datos.historial)) {
        setHistorial(data.datos.historial);
      } else {
        setHistorial([]);
      }
    } catch (error) {
      console.error('Error al obtener historial:', error);
      setHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const obtenerBase64 = () => {
    return new Promise((resolve) => {
      if (qrRef.current) {
        qrRef.current.toDataURL((data) => {
          resolve(data);
        });
      } else {
        resolve(null);
      }
    });
  };

  const guardarYDescargarQR = async () => {
    if (!nombreEquipo.trim() || !ubicacion.trim()) {
      Alert.alert('Atención', 'El nombre y la ubicación son requeridos.');
      return;
    }

    setProcesandoFlujo(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la galería para guardar el nuevo QR.');
        setProcesandoFlujo(false);
        return;
      }

      const res = await fetch(`${API_URL}/${idSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEquipo,
          ubicacion: ubicacion,
          frecuencia_mantenimiento: parseInt(frecuencia, 10) || 90,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar datos en el servidor.');
      }

      const dataURL = await obtenerBase64();

      if (!dataURL) {
        Alert.alert('Advertencia', 'Los datos se guardaron pero no se pudo generar la imagen del QR.');
        setProcesandoFlujo(false);
        setModalEditarVisible(false);
        obtenerEquipos();
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}QR_Actualizado_ID${idSeleccionado}_${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(fileUri, dataURL, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await MediaLibrary.saveToLibraryAsync(fileUri);

      Alert.alert(
        '¡Éxito! 🔄',
        `Equipo #${idSeleccionado} actualizado en la base de datos y nuevo código QR guardado en la galería.`
      );

      setModalEditarVisible(false);
      obtenerEquipos();
    } catch (error) {
      console.error('Error en el flujo de actualización:', error);
      Alert.alert('Error', error.message || 'Ocurrió un problema durante la operación.');
    } finally {
      setProcesandoFlujo(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardId}>ID: #{item.id}</Text>
        <Text style={styles.cardTitle}>{item.nombre_equipo}</Text>
        <Text style={styles.cardText}>📍 Ubicación: {item.ubicacion}</Text>
        <Text style={styles.cardText}>⏱ Frecuencia: {item.frecuencia_mantenimiento} días</Text>
      </View>

      <TouchableOpacity
        style={styles.botonEditar}
        onPress={() => abrirModalEditar(item)}
      >
        <Text style={styles.textoBotonEditar}>Editar / QR</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Lista de Equipos Registrados</Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={equipos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />
          }
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay equipos registrados actualmente.</Text>
          }
        />
      )}

      {/* MODAL DE EDICIÓN, HISTORIAL Y REGENERACIÓN DE QR */}
      <Modal
        visible={modalEditarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !procesandoFlujo && setModalEditarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitulo}>Editar Activo #{idSeleccionado}</Text>

              <Text style={styles.label}>Nombre del Equipo:</Text>
              <TextInput
                style={styles.input}
                value={nombreEquipo}
                onChangeText={setNombreEquipo}
                placeholder="Ej. Aire Acondicionado 01"
              />

              <Text style={styles.label}>Ubicación:</Text>
              <TextInput
                style={styles.input}
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholder="Ej. Habitación 102"
              />

              <Text style={styles.label}>Frecuencia de Mantenimiento (días):</Text>
              <TextInput
                style={styles.input}
                value={frecuencia}
                onChangeText={setFrecuencia}
                keyboardType="numeric"
                placeholder="90"
              />

              {/* SECCIÓN HISTORIAL DE MANTENIMIENTOS */}
              <View style={styles.historialContainer}>
                <Text style={styles.seccionTitulo}>📋 Historial de Mantenimientos</Text>
                {cargandoHistorial ? (
                  <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
                ) : historial.length > 0 ? (
                  historial.map((mant, index) => (
                    <View key={mant.id || index} style={styles.historialCard}>
                      <Text style={styles.historialFecha}>
                        📅 {mant.fecha || 'Sin fecha'}
                      </Text>
                      <Text style={styles.historialTexto}>
                        📝 <Text style={{ fontWeight: '600' }}>Detalle:</Text> {mant.detalle || 'Sin observaciones'}
                      </Text>
                      {mant.responsable && (
                        <Text style={styles.historialTecnico}>👤 Responsable: {mant.responsable}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.historialVacio}>No hay mantenimientos registrados previos.</Text>
                )}
              </View>

              {/* Render del QR */}
              <View style={styles.qrContainer}>
                <Text style={styles.qrSubtitulo}>Vista previa del nuevo QR:</Text>
                <QRCode
                  value={JSON.stringify({
                    id: idSeleccionado,
                    nombre: nombreEquipo,
                    ubicacion: ubicacion,
                  })}
                  size={160}
                  getRef={(c) => (qrRef.current = c)}
                />
              </View>

              <TouchableOpacity
                style={[styles.botonGuardar, procesandoFlujo && styles.botonDeshabilitado]}
                onPress={guardarYDescargarQR}
                disabled={procesandoFlujo}
              >
                {procesandoFlujo ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.textoBotonGuardar}>Guardar y Descargar QR</Text>
                )}
              </TouchableOpacity>

              {!procesandoFlujo && (
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalEditarVisible(false)}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A1D1E',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardId: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
  },
  cardText: {
    fontSize: 13,
    color: '#666',
  },
  botonEditar: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  textoBotonEditar: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  vacio: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  historialContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seccionTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  historialCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    elevation: 1,
  },
  historialFecha: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  historialTexto: {
    fontSize: 13,
    color: '#1E293B',
  },
  historialTecnico: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  historialVacio: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 6,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
  },
  qrSubtitulo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  botonGuardar: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  textoBotonGuardar: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  botonCancelar: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotonCancelar: {
    color: '#DC3545',
    fontWeight: '600',
  },
});