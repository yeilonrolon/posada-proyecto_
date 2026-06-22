import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
/**
 * PANTALLA: PANEL ADMINISTRATIVO
 * Función: Menú principal con acceso a todas las gestiones del sistema.
 */
export default function Admin({ route, navigation }) {
    // Extraemos las credenciales y el rol que vienen desde el Login
    const { idUsuario, nombreUsuario, rol } = route.params || {};

    return (
        <SafeAreaView style={styles.contenedor}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* SECCIÓN DE BIENVENIDA */}
                <View style={styles.header}>
                    <Text style={styles.titulo}>Panel Administrativo</Text>
                    <Text style={styles.subtitulo}>
                        Bienvenido, <Text style={styles.nombreResaltado}>{nombreUsuario || 'Usuario'}</Text>
                    </Text>
                    <Text style={styles.fechaTexto}>Última sesión vista activa: {new Date().toLocaleDateString()}</Text>
                </View>

                {/* BOTÓN: REGISTRAR SERVICIOS (LUZ Y AGUA) */}
                <TouchableOpacity 
                    style={styles.boton} 
                    onPress={() => navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario, rol })}
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>⚡</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Registrar Servicios</Text>
                        <Text style={styles.textoSecundario}>Lecturas de Luz y Agua</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: NUEVO OPERADOR */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#2ecc71' }]} 
                    onPress={() => navigation.navigate('Registro')}
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>👤</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Nuevo Operador</Text>
                        <Text style={styles.textoSecundario}>Registrar personal nuevo</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: PANEL DE USUARIOS (ACTIVOS) */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#23ccd8' }]} 
                    onPress={() => navigation.navigate('PanelUsuarios')}
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>👥</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Panel de Usuarios</Text>
                        <Text style={styles.textoSecundario}>Editar y gestionar activos</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: USUARIOS INACTIVOS */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#e74c3c' }]} 
                    onPress={() => navigation.navigate('MostrarUsuariosInactivos')} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🚫</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Usuarios Inactivos</Text>
                        <Text style={styles.textoSecundario}>Personal dado de baja</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: HISTORIAL DE ACCESOS (AUDITORÍA) */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#f39c12' }]} 
                    onPress={() => navigation.navigate('HistorialAccesos')} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🕒</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Historial de Accesos</Text>
                        <Text style={styles.textoSecundario}>Auditoría de ingresos</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: HISTORIAL DE ESTADOS DE BAÑOS */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#4d95f3' }]} 
                    onPress={() => navigation.navigate('EstadoBano', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🚽</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Registro de Estados de Baños</Text>
                        <Text style={styles.textoSecundario}>Auditoría de Estados de Baños</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: HISTORIAL DE ESTADOS DE HABITACIONES */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#3730A3' }]} 
                    onPress={() => navigation.navigate('Habitaciones', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🛏️</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Historial de Estados de Habitaciones</Text>
                        <Text style={styles.textoSecundario}>Auditoría de Estados de Habitaciones</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: REGISTROS DE COSTOS DE REPARACIÓN */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#115E59' }]} 
                    onPress={() => navigation.navigate('CostoReparacion', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>💵</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Registros de Costos de Reparación</Text>
                        <Text style={styles.textoSecundario}>Auditoría de Costos de Reparación</Text>
                    </View>
                </TouchableOpacity>

                {/* AGREGADO - BOTÓN: CONTROL DE ACTIVOS Y CÓDIGOS QR */}

                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#8e44ad' }]} 
                    onPress={() => navigation.navigate('qr', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    {/* Cambiamos el Text por el componente de Icono FontAwesome */}
                    <View style={styles.circuloIcono}>
                        <FontAwesome name="qrcode" size={24} color="white" />
                    </View>
                    
                    <View>
                        <Text style={styles.textoBoton}>Gestión de Equipos y QR</Text>
                        <Text style={styles.textoSecundario}>Inventario, Etiquetas e Inspección</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>

            <Text style={styles.footerText}>Posada Villa Montaña - San Cristóbal, Táchira</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenedor: { 
        flex: 1, 
        backgroundColor: '#f8f9fa', 
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40 
    },
    header: { 
        marginBottom: 30,
        marginTop: 10 
    },
    titulo: { 
        fontSize: 26, 
        fontWeight: 'bold', 
        color: '#2c3e50', 
    },
    subtitulo: { 
        fontSize: 16, 
        color: '#7f8c8d',
        marginTop: 5
    },
    nombreResaltado: {
        fontWeight: 'bold',
        color: '#525FE1'
    },
    fechaTexto: {
        fontSize: 13,
        color: '#bdc3c7',
        marginTop: 2
    },
    boton: { 
        backgroundColor: '#525FE1', 
        padding: 18, 
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        elevation: 4, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    circuloIcono: {
        width: 46,
        height: 46,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    icono: { 
        fontSize: 22 
    },
    textoBoton: { 
        color: 'white', 
        fontSize: 17, 
        fontWeight: 'bold' 
    },
    textoSecundario: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13
    },
    footerText: {
        alignSelf: 'center',
        color: '#bdc3c7',
        fontSize: 11,
        marginBottom: 10,
        fontWeight: '500'
    }
});