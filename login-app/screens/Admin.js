import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

// ✅ Helper extraído fuera del componente para evitar re-creación y parpadeos en los renders
const RenderBotonAdmin = ({ titulo, subtitulo, icono, libreria: LibreriaIcono, colorAcento, onPress }) => {
    return (
        <TouchableOpacity style={styles.tarjetaBoton} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.contenedorIcono, { backgroundColor: `${colorAcento}15` }]}>
                <LibreriaIcono name={icono} size={22} color={colorAcento} />
            </View>
            <View style={styles.bloqueTexto}>
                <Text style={styles.textoPrincipal} numberOfLines={1}>{titulo}</Text>
                <Text style={styles.textoSecundario} numberOfLines={2}>{subtitulo}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#b0bec5" style={styles.flechaDerecha} />
        </TouchableOpacity>
    );
};

const ResumenIndicador = ({ titulo, valor, detalle, color, etiqueta }) => (
    <View style={styles.cardResumen}>
        <View style={[styles.barraColor, { backgroundColor: color }]} />
        <View style={styles.contenidoResumen}>
            <Text style={styles.valorResumen}>{valor}</Text>
            <Text style={styles.tituloResumen}>{titulo}</Text>
            {etiqueta ? (
                <View style={[styles.badgeResumen, { backgroundColor: `${color}15` }]}>
                    <Text style={[styles.badgeTexto, { color }]}>{etiqueta}</Text>
                </View>
            ) : null}
            <Text style={styles.detalleResumen}>{detalle}</Text>
        </View>
    </View>
);

const obtenerNivelConsumo = (valor, tipo = 'Agua') => {
    if (tipo === 'Luz') {
        if (valor > 50) return 'alto';
        if (valor >= 25) return 'medio';
        return 'normal';
    }

    if (valor > 24) return 'alto';
    if (valor >= 12) return 'medio';
    return 'normal';
};

const formatearNivel = (nivel) => `${nivel.charAt(0).toUpperCase()}${nivel.slice(1)}`;

const obtenerRangosResumen = () => 'Agua: <12 · 12-24 · >24\nLuz: <25 · 25-50 · >50';

const obtenerTextoEstado = (valor, tipo) => {
    const nivel = obtenerNivelConsumo(valor, tipo);
    return `${valor.toFixed(1)} · ${formatearNivel(nivel)}`;
};

const prioridadNivel = {
    normal: 0,
    medio: 1,
    alto: 2,
};

export default function Admin({ route, navigation }) {
    // Extraemos las credenciales y el rol que vienen desde el Login
    const { idUsuario, nombreUsuario, rol } = route.params || {};

    const [resumenData, setResumenData] = useState({
        consumoAgua: 0,
        consumoLuz: 0,
        tareasPendientes: 0,
        cargando: true,
    });
    const [alertaLeidaKey, setAlertaLeidaKey] = useState('');
    const [animandoSalida, setAnimandoSalida] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const ultimaAlertaRef = useRef('');
    const ultimaCondicionRef = useRef('');

    const enviarNotificacion = useCallback(async (titulo, cuerpo) => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permiso de notificaciones no concedido');
                return;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: titulo,
                    body: cuerpo,
                    sound: true,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error al enviar notificación:', error);
        }
    }, []);

    const cargarResumen = useCallback(async () => {
        try {
            const fecha = new Date();
            const mes = fecha.getMonth() + 1;
            const anio = fecha.getFullYear();

            const [respuestaAgua, respuestaLuz, respuestaTareas] = await Promise.allSettled([
                axios.get(`${BASE_URL}/calcular-consumo`, {
                    params: { tipo: 'Agua', mes, anio },
                    timeout: 6000,
                }),
                axios.get(`${BASE_URL}/calcular-consumo`, {
                    params: { tipo: 'Luz', mes, anio },
                    timeout: 6000,
                }),
                axios.get(`${BASE_URL}/listar-tareas`, { timeout: 6000 }),
            ]);

            const consumoAgua = respuestaAgua.status === 'fulfilled' && respuestaAgua.value?.data?.success
                ? Number(respuestaAgua.value.data.consumo || 0)
                : 0;

            const consumoLuz = respuestaLuz.status === 'fulfilled' && respuestaLuz.value?.data?.success
                ? Number(respuestaLuz.value.data.consumo || 0)
                : 0;

            const tareasPendientes = respuestaTareas.status === 'fulfilled'
                ? (respuestaTareas.value?.data?.tareas || []).filter((tarea) =>
                    String(tarea.estado || '').trim().toLowerCase() === 'pendiente'
                ).length
                : 0;

            const nivelAgua = obtenerNivelConsumo(consumoAgua, 'Agua');
            const nivelLuz = obtenerNivelConsumo(consumoLuz, 'Luz');
            const consumoTotal = Number((consumoAgua + consumoLuz).toFixed(2));

            setResumenData({
                consumoAgua,
                consumoLuz,
                tareasPendientes,
                nivelAgua,
                nivelLuz,
                cargando: false,
            });

            const consumoPriorizado = [
                { recurso: 'Agua', valor: consumoAgua, nivel: nivelAgua },
                { recurso: 'Luz', valor: consumoLuz, nivel: nivelLuz },
            ]
                .filter((item) => item.nivel !== 'normal')
                .sort((a, b) => prioridadNivel[b.nivel] - prioridadNivel[a.nivel])[0];

            const alerta = tareasPendientes > 0
                ? {
                    titulo: 'Mantenimiento pendiente',
                    cuerpo: `Tienes ${tareasPendientes} tareas por revisar`,
                    tipo: 'tareas',
                    valor: tareasPendientes,
                }
                : consumoPriorizado
                    ? {
                        titulo: `Consumo ${consumoPriorizado.nivel}`,
                        cuerpo: `El consumo de ${consumoPriorizado.recurso.toLowerCase()} del mes está ${consumoPriorizado.nivel} (${consumoPriorizado.valor.toFixed(1)})`,
                        tipo: 'consumo',
                        recurso: consumoPriorizado.recurso,
                        nivel: consumoPriorizado.nivel,
                        valor: consumoPriorizado.valor,
                    }
                    : null;

            if (alerta) {
                const clave = `${alerta.tipo}:${alerta.recurso || ''}:${alerta.nivel || ''}:${alerta.valor}`;
                if (ultimaAlertaRef.current !== clave) {
                    ultimaAlertaRef.current = clave;
                    Alert.alert(alerta.titulo, alerta.cuerpo);
                    await enviarNotificacion(alerta.titulo, alerta.cuerpo);
                }
            } else {
                ultimaAlertaRef.current = '';
            }
        } catch (error) {
            console.error('Error al cargar resumen del dashboard:', error);
            setResumenData((prev) => ({ ...prev, cargando: false }));
        }
    }, [enviarNotificacion]);

    useEffect(() => {
        cargarResumen();
    }, [cargarResumen]);

    useFocusEffect(
        useCallback(() => {
            cargarResumen();
        }, [cargarResumen])
    );

    const consumoTotal = Number((resumenData.consumoAgua + resumenData.consumoLuz).toFixed(2));
    const nivelAgua = obtenerNivelConsumo(resumenData.consumoAgua, 'Agua');
    const nivelLuz = obtenerNivelConsumo(resumenData.consumoLuz, 'Luz');
    const consumoPriorizado = [
        { recurso: 'Agua', valor: resumenData.consumoAgua, nivel: nivelAgua },
        { recurso: 'Luz', valor: resumenData.consumoLuz, nivel: nivelLuz },
    ]
        .filter((item) => item.nivel !== 'normal')
        .sort((a, b) => prioridadNivel[b.nivel] - prioridadNivel[a.nivel])[0];

    const estadoGeneral = resumenData.tareasPendientes > 0
        ? {
            titulo: 'Mantenimiento pendiente',
            cuerpo: `Hay ${resumenData.tareasPendientes} tareas por revisar`,
            destino: 'ListaTareas',
            boton: 'Ver tareas',
            tipo: 'tareas',
            valor: resumenData.tareasPendientes,
        }
        : consumoPriorizado
            ? {
                titulo: `Consumo ${consumoPriorizado.nivel}`,
                cuerpo: `El consumo de ${consumoPriorizado.recurso.toLowerCase()} del mes está ${consumoPriorizado.nivel} (${consumoPriorizado.valor.toFixed(1)})`,
                destino: 'CrearLuzAgua',
                boton: 'Registrar consumo',
                tipo: 'consumo',
                recurso: consumoPriorizado.recurso,
                nivel: consumoPriorizado.nivel,
                valor: consumoPriorizado.valor,
            }
            : null;
    const claveAlerta = estadoGeneral ? `${estadoGeneral.tipo}:${estadoGeneral.recurso || ''}:${estadoGeneral.nivel || ''}:${estadoGeneral.valor}` : '';
    const mostrarAlerta = Boolean(estadoGeneral && alertaLeidaKey !== claveAlerta);
    const showNotificationIcon = Boolean(estadoGeneral && alertaLeidaKey !== claveAlerta);

    const manejarAccionAlerta = () => {
        if (!estadoGeneral) return;
        if (estadoGeneral.destino === 'ListaTareas') {
            navigation.navigate('ListaTareas', { idUsuario, nombreUsuario, rol });
        } else {
            navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario, rol });
        }
    };

    const manejarLeido = () => {
        if (claveAlerta) {
            setAnimandoSalida(true);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: -8,
                    duration: 180,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setAlertaLeidaKey(claveAlerta);
                setAnimandoSalida(false);
                fadeAnim.setValue(1);
                translateY.setValue(0);
            });
        }
    };

    useEffect(() => {
        if (!estadoGeneral) {
            if (ultimaCondicionRef.current) {
                ultimaCondicionRef.current = '';
                setAlertaLeidaKey('');
            }
            return;
        }

        const claveActual = `${estadoGeneral.tipo}:${estadoGeneral.recurso || ''}:${estadoGeneral.nivel || ''}:${estadoGeneral.valor}`;
        if (ultimaCondicionRef.current !== claveActual) {
            ultimaCondicionRef.current = claveActual;
            setAlertaLeidaKey('');
        }
    }, [estadoGeneral?.tipo, estadoGeneral?.recurso, estadoGeneral?.nivel, estadoGeneral?.valor]);

    return (
        <SafeAreaView style={styles.contenedor}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* SECCIÓN DE BIENVENIDA */}
                <View style={styles.header}>
                    <View style={styles.headerTop}> 
                        <View style={styles.headerTexto}>
                            <Text style={styles.titulo}>Panel Administrativo</Text>
                            <Text style={styles.subtitulo}>
                                Bienvenido, <Text style={styles.nombreResaltado}>{nombreUsuario || 'Usuario'}</Text>
                            </Text>
                            <Text style={styles.fechaTexto}>Sesión activa: {new Date().toLocaleDateString()}</Text>
                        </View>
                    </View>
                </View>

                {mostrarAlerta && estadoGeneral && (
                    <Animated.View style={[styles.bannerAlerta, { opacity: fadeAnim, transform: [{ translateY }] }]}> 
                        <View style={styles.bannerHeader}>
                            <View style={styles.bannerTitleRow}>
                                <View style={[styles.iconoNotificacion, styles.iconoNotificacionBanner]}>
                                    <Ionicons name="notifications" size={16} color="#ffffff" />
                                </View>
                                <Text style={styles.bannerTitulo}>{estadoGeneral.titulo}</Text>
                            </View>
                        </View>
                        <Text style={styles.bannerCuerpo}>{estadoGeneral.cuerpo}</Text>
                        <View style={styles.bannerAcciones}>
                            <TouchableOpacity style={styles.botonAccion} onPress={manejarAccionAlerta}>
                                <Text style={styles.textoBotonAccion}>{estadoGeneral.boton}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.botonLeido} onPress={manejarLeido}>
                                <Text style={styles.textoBotonLeido}>Leído</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* SECCIÓN: RESUMEN GENERAL */}
                <View style={styles.resumenGeneral}>
                    <View style={styles.resumenEncabezado}>
                        <Text style={styles.resumenTitulo}>Resumen de estado general</Text>
                        <Text style={styles.resumenSubtitulo}>Vista rápida del estado operativo de la posada</Text>
                    </View>

                    <View style={styles.resumenGrid}>
                        <ResumenIndicador
                            titulo="Estado del mes"
                            valor={resumenData.cargando ? '...' : formatearNivel(consumoPriorizado?.nivel || 'normal')}
                            detalle={
                                consumoPriorizado
                                    ? `${consumoPriorizado.recurso}: ${consumoPriorizado.valor.toFixed(1)} · ${formatearNivel(consumoPriorizado.nivel)}`
                                    : 'Agua y luz estables'
                            }
                            etiqueta={consumoPriorizado ? 'Atención' : 'Estable'}
                            color={consumoPriorizado ? '#ef4444' : '#10b981'}
                        />
                        <ResumenIndicador
                            titulo="Mantenimiento"
                            valor={resumenData.cargando ? '...' : `${resumenData.tareasPendientes}`}
                            detalle={resumenData.tareasPendientes > 0 ? 'Tareas pendientes' : 'Sin pendientes'}
                            color={resumenData.tareasPendientes > 0 ? '#f59e0b' : '#10b981'}
                        />
                        <ResumenIndicador
                            titulo="Agua / Luz"
                            valor={resumenData.cargando ? '...' : `${resumenData.consumoAgua.toFixed(1)} / ${resumenData.consumoLuz.toFixed(1)}`}
                            detalle={
                                resumenData.cargando
                                    ? 'Cargando consumo...'
                                    : `${obtenerTextoEstado(resumenData.consumoAgua, 'Agua')}\n${obtenerTextoEstado(resumenData.consumoLuz, 'Luz')}`
                            }
                            etiqueta="Consumo"
                            color="#3b82f6"
                        />
                    </View>

                </View>

                {/* SECCIÓN: OPERACIONES CENTRALES */}
                <Text style={styles.seccionTitulo}>Operaciones Principales</Text>

                <RenderBotonAdmin 
                    titulo="Registrar Servicios"
                    subtitulo="Lecturas de Luz y Agua"
                    icono="flash"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#3b82f6"
                    onPress={() => navigation.navigate('CrearLuzAgua', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Gestión de Equipos y QR"
                    subtitulo="Inventario, Etiquetas e Inspección"
                    icono="qrcode"
                    libreria={FontAwesome}
                    colorAcento="#8b5cf6"
                    onPress={() => navigation.navigate('qr', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Generador de PDF"
                    subtitulo="Crear reportes PDF del sistema"
                    icono="file-pdf-o"
                    libreria={FontAwesome}
                    colorAcento="#ef4444"
                    onPress={() => navigation.navigate('GeneradorPDF', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Costos de Reparación"
                    subtitulo="Auditoría de Costos de Reparación"
                    icono="currency-usd"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#10b981"
                    onPress={() => navigation.navigate('CostoReparacion', { idUsuario, nombreUsuario, rol })}
                />
                <RenderBotonAdmin 
                    titulo="Control de Tareas"
                    subtitulo="Verificar asignaciones y estados"
                    icono="clipboard-text-clock"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#f97316" // Color naranja llamativo para testing
                    onPress={() => navigation.navigate('ListaTareas', { idUsuario, nombreUsuario, rol })} 
                />

                {/* SECCIÓN: INFRAESTRUCTURA (HABITACIONES Y BAÑOS) */}
                <Text style={styles.seccionTitulo}>Monitoreo de Planta</Text>

                <RenderBotonAdmin 
                    titulo="Estados de Habitaciones"
                    subtitulo="Auditoría de Estados de Habitaciones"
                    icono="bed"
                    libreria={FontAwesome}
                    colorAcento="#6366f1"
                    onPress={() => navigation.navigate('Habitaciones', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Estados de Baños"
                    subtitulo="Auditoría de Estados de Baños"
                    icono="toilet"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#06b6d4"
                    onPress={() => navigation.navigate('EstadoBano', { idUsuario, nombreUsuario, rol })}
                />

                {/* SECCIÓN: CONTROL DE PERSONAL Y SEGURIDAD */}
                <Text style={styles.seccionTitulo}>Personal y Seguridad</Text>

                <RenderBotonAdmin 
                    titulo="Nuevo Operador"
                    subtitulo="Registrar personal nuevo"
                    icono="user-plus"
                    libreria={FontAwesome}
                    colorAcento="#f59e0b"
                    // ✅ Parámetros añadidos para mantener la trazabilidad de quién registra
                    onPress={() => navigation.navigate('Registro', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Panel de Usuarios"
                    subtitulo="Editar y gestionar activos"
                    icono="users"
                    libreria={FontAwesome}
                    colorAcento="#4b5563"
                    // ✅ Parámetros añadidos
                    onPress={() => navigation.navigate('PanelUsuarios', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Usuarios Inactivos"
                    subtitulo="Personal dado de baja"
                    icono="user-times"
                    libreria={FontAwesome}
                    colorAcento="#ef4444"
                    // ✅ Parámetros añadidos
                    onPress={() => navigation.navigate('MostrarUsuariosInactivos', { idUsuario, nombreUsuario, rol })}
                />

                <RenderBotonAdmin 
                    titulo="Historial de Accesos"
                    subtitulo="Auditoría de ingresos al sistema"
                    icono="history"
                    libreria={MaterialCommunityIcons}
                    colorAcento="#6b7280"
                    // ✅ Parámetros añadidos
                    onPress={() => navigation.navigate('HistorialAccesos', { idUsuario, nombreUsuario, rol })}
                />

            </ScrollView>

            <Text style={styles.footerText}>Posada Villa Montaña - San Cristóbal, Táchira</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenedor: { 
        flex: 1, 
        backgroundColor: '#f1f5f9', 
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40 
    },
    header: { 
        marginBottom: 12,
        marginTop: 10 
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerTexto: {
        flex: 1,
    },
    iconoNotificacion: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconoNotificacionBanner: {
        marginRight: 8,
    },
    bannerAlerta: {
        backgroundColor: '#ffffff',
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    bannerHeader: {
        marginBottom: 4,
    },
    bannerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerTitulo: {
        color: '#111827',
        fontWeight: '700',
        fontSize: 14,
    },
    bannerCuerpo: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 4,
    },
    bannerAcciones: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    botonAccion: {
        backgroundColor: '#2563eb',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    textoBotonAccion: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    botonLeido: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    textoBotonLeido: {
        color: '#475569',
        fontWeight: '700',
        fontSize: 12,
    },
    titulo: { 
        fontSize: 24, 
        fontWeight: '800', 
        color: '#0f172a', 
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
    resumenGeneral: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    resumenEncabezado: {
        marginBottom: 10,
    },
    resumenTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    resumenSubtitulo: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    resumenGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cardResumen: {
        flexBasis: '31%',
        minWidth: 100,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    barraColor: {
        width: 36,
        height: 4,
        borderRadius: 999,
        marginBottom: 8,
    },
    contenidoResumen: {
        alignItems: 'flex-start',
    },
    valorResumen: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    tituloResumen: {
        fontSize: 12,
        color: '#334155',
        marginTop: 2,
        fontWeight: '600',
    },
    detalleResumen: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 6,
        lineHeight: 14,
    },
    badgeResumen: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
    },
    badgeTexto: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tarjetaBoton: { 
        backgroundColor: '#ffffff', 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10,
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