import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

/**
 * PANTALLA: PANEL ADMINISTRATIVO
 * Función: Menú principal con acceso a todas las gestiones del sistema.
 */
export default function Admin({ route, navigation }) {
    // 1. CORRECCIÓN: Extraemos también el 'rol' que viene desde el Login
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
                    <Text style={styles.fechaTexto}>Sesión activa: {new Date().toLocaleDateString()}</Text>
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

                {/* BOTÓN: CÁLCULO DE CONSUMO */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#9b59b6' }]} 
                    onPress={() => navigation.navigate('CalcularConsumo')} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🧮</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Cálculo de Consumo</Text>
                        <Text style={styles.textoSecundario}>Comparativa mensual</Text>
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
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#e74c3c' }]}
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
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#0b8891' }]} 
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
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#d9f312' }]} 
                    // 2. CORRECCIÓN: Añadimos ', rol' aquí para que llegue a la vista de Baños
                    onPress={() => navigation.navigate('EstadoBano', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🚽</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Historial de Estados de Baños</Text>
                        <Text style={styles.textoSecundario}>Auditoría de Estados de Baños</Text>
                    </View>
                </TouchableOpacity>

                {/* BOTÓN: HISTORIAL DE ESTADOS DE HABITACIONES */}
                <TouchableOpacity 
                    style={[styles.boton, { marginTop: 20, backgroundColor: '#12f3c6' }]} 
                    // 3. RECOMENDACIÓN: Pasamos el 'rol' también aquí por si acaso lo usas luego
                    onPress={() => navigation.navigate('Habitaciones', { idUsuario, nombreUsuario, rol })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.circuloIcono}><Text style={styles.icono}>🛏️</Text></View>
                    <View>
                        <Text style={styles.textoBoton}>Historial de Estados de Habitaciones</Text>
                        <Text style={styles.textoSecundario}>Auditoría de Estados de Habitaciones</Text>
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
        paddingBottom: 40 // Espacio extra al final para que no choque con el footer
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
        elevation: 4, // Sombra en Android
        shadowColor: '#000', // Sombra en iOS
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