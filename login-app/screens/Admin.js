import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
// Importamos FontAwesome y MaterialCommunityIcons para tener íconos profesionales
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * PANTALLA: PANEL ADMINISTRATIVO (Diseño Profesional)
 */
export default function Admin({ route, navigation }) {
    // Extraemos las credenciales y el rol que vienen desde el Login
    const { idUsuario, nombreUsuario, rol } = route.params || {};

    // Helper para renderizar cada botón de manera limpia, ordenada y con un chevron a la derecha
    const RenderBotonAdmin = ({ titulo, subtitulo, icono, libreria: LibreriaIcono, colorAcento, onPress }) => (
        <TouchableOpacity style={styles.tarjetaBoton} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.contenedorIcono, { backgroundColor: `${colorAcento}15` }]}>
                <LibreriaIcono name={icono} size={22} color={colorAcento} />
            </View>
            <View style={styles.bloqueTexto}>
                <Text style={styles.textoPrincipal} numberOfLines={1}>{titulo}</Text>
                <Text style={styles.textoSecundario} numberOfLines={1}>{subtitulo}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#b0bec5" style={styles.flechaDerecha} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.contenedor}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* SECCIÓN DE BIENVENIDA */}
                <View style={styles.header}>
                    <Text style={styles.titulo}>Panel Administrativo</Text>
                    <Text style={styles.subtitulo}>
                        Bienvenido, <Text style={styles.nombreResaltado}>{nombreUsuario || 'Usuario'}</Text>
                    </Text>
                    <Text style={styles.fechaTexto}>Última sesión activa: {new Date().toLocaleDateString()}</Text>
                </View>

                {/* SECCIÓN: OPERACIONES CENTRALES */}
                <Text style={styles.seccionTitulo}>Operaciones Principales</Text>

                <RenderBotonAdmin 
                    titulo="Registrar Servicios"
                    subtitulo="Lecturas de Luz y Agua"
                    icono="flash"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#3b82f6" // Azul moderno
                    onPress={() => navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Gestión de Equipos y QR"
                    subtitulo="Inventario, Etiquetas e Inspección"
                    icono="qrcode"
                    libreria={FontAwesome}
                    colorAcento="#8b5cf6" // Morado tecnológico
                    onPress={() => navigation.navigate('qr', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Costos de Reparación"
                    subtitulo="Auditoría de Costos de Reparación"
                    icono="currency-usd"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#10b981" // Verde esmeralda
                    onPress={() => navigation.navigate('CostoReparacion', { idUsuario, nombreUsuario, rol })}
                />

                {/* SECCIÓN: INFRAESTRUCTURA (HABITACIONES Y BAÑOS) */}
                <Text style={styles.seccionTitulo}>Monitoreo de Planta</Text>

                <RenderBotonAdmin 
                    titulo="Estados de Habitaciones"
                    subtitulo="Auditoría de Estados de Habitaciones"
                    icono="bed"
                    libreria={FontAwesome}
                    colorAcento="#6366f1" // Índigo
                    onPress={() => navigation.navigate('Habitaciones', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Estados de Baños"
                    subtitulo="Auditoría de Estados de Baños"
                    icono="toilet"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#06b6d4" // Cian
                    onPress={() => navigation.navigate('EstadoBano', { idUsuario, nombreUsuario, rol })}
                />

                {/* SECCIÓN: CONTROL DE PERSONAL Y SEGURIDAD */}
                <Text style={styles.seccionTitulo}>Personal y Seguridad</Text>

                <RenderBotonAdmin 
                    titulo="Nuevo Operador"
                    subtitulo="Registrar personal nuevo"
                    icono="user-plus"
                    libreria={FontAwesome}
                    colorAcento="#f59e0b" // Ámbar corporativo
                    onPress={() => navigation.navigate('Registro')}
                />

                <RenderBotonAdmin 
                    titulo="Panel de Usuarios"
                    subtitulo="Editar y gestionar activos"
                    icono="users"
                    libreria={FontAwesome}
                    colorAcento="#4b5563" // Gris oscuro slate
                    onPress={() => navigation.navigate('PanelUsuarios')}
                />

                <RenderBotonAdmin 
                    titulo="Usuarios Inactivos"
                    subtitulo="Personal dado de baja"
                    icono="user-times"
                    libreria={FontAwesome}
                    colorAcento="#ef4444" // Rojo sutil
                    onPress={() => navigation.navigate('MostrarUsuariosInactivos')}
                />

                <RenderBotonAdmin 
                    titulo="Historial de Accesos"
                    subtitulo="Auditoría de ingresos al sistema"
                    icono="history"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#6b7280"
                    onPress={() => navigation.navigate('HistorialAccesos')}
                />

            </ScrollView>

            <Text style={styles.footerText}>Posada Villa Montaña - San Cristóbal, Táchira</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenedor: { 
        flex: 1, 
        backgroundColor: '#f1f5f9', // Un fondo gris azulado claro muy elegante (Slate 100)
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40 
    },
    header: { 
        marginBottom: 20,
        marginTop: 10 
    },
    titulo: { 
        fontSize: 24, 
        fontWeight: '800', 
        color: '#0f172a', // Casi negro para alta legibilidad
        letterSpacing: -0.5,
    },
    subtitulo: { 
        fontSize: 15, 
        color: '#64748b',
        marginTop: 4
    },
    nombreResaltado: {
        fontWeight: 'bold',
        color: '#3b82f6'
    },
    fechaTexto: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4
    },
    seccionTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 22,
        marginBottom: 10,
    },
    /* === EL CAMBIO PRINCIPAL: LAS TARJETAS DE LOS BOTONES === */
    tarjetaBoton: { 
        backgroundColor: '#ffffff', 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10,
        // Sombras suaves de estilo minimalista
        elevation: 2, 
        shadowColor: '#0f172a', 
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    contenedorIcono: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bloqueTexto: {
        flex: 1,
        marginLeft: 14,
        paddingRight: 10,
    },
    textoPrincipal: { 
        color: '#1e293b', 
        fontSize: 15, 
        fontWeight: '600',
    },
    textoSecundario: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
    flechaDerecha: {
        marginLeft: 'auto',
    },
    footerText: {
        alignSelf: 'center',
        color: '#94a3b8',
        fontSize: 11,
        marginBottom: 12,
        fontWeight: '600'
    }
});
