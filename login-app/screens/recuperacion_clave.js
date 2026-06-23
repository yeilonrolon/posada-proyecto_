import React, { useState, useEffect } from 'react';
import { 
    View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, 
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: RECUPERACIÓN DE CONTRASEÑA
 * Flujo lógico secuencial de 3 pasos integrado en una sola tarjeta visual.
 */
export default function RecuperacionClave({ navigation }) {
    const [paso, setPaso] = useState(1); 
    const [cargando, setCargando] = useState(false);

    // --- ESTADOS PASO 1: Identificación ---
    const [usuario, setUsuario] = useState('');

    // --- ESTADOS PASO 2: Preguntas de Seguridad ---
    const [idUsuario, setIdUsuario] = useState(null);
    const [pregunta1, setPregunta1] = useState('');
    const [pregunta2, setPregunta2] = useState('');
    const [respuesta1, setRespuesta1] = useState('');
    const [respuesta2, setRespuesta2] = useState('');

    // --- ESTADOS PASO 3: Nueva Contraseña ---
    const [nuevaClave, setNuevaClave] = useState('');
    const [confirmarClave, setConfirmarClave] = useState('');
    const [validaciones, setValidaciones] = useState({
        longitud: false,
        mayuscula: false,
        minuscula: false,
        numero: false,
        especial: false,
    });

    // Validación reactiva de la nueva contraseña
    useEffect(() => {
        setValidaciones({
            longitud: nuevaClave.length >= 6 && nuevaClave.length <= 8,
            mayuscula: /[A-Z]/.test(nuevaClave),
            minuscula: /[a-z]/.test(nuevaClave),
            numero: /\d/.test(nuevaClave),
            especial: /[!@#$%^&*(),.?":{}|<>]/.test(nuevaClave),
        });
    }, [nuevaClave]);

    const todoValido = Object.values(validaciones).every(v => v === true);

    // --- FUNCIONES DE FLUJO ---

    // 1. Verificar existencia del usuario
    const verificarUsuario = async () => {
        if (!usuario.trim()) {
            return Alert.alert("Atención", "Por favor, ingresa tu usuario.");
        }

        Keyboard.dismiss();
        setCargando(true);
        try {
            const res = await axios.post(`${BASE_URL}/verificar-usuario-recuperacion`, {
                usuario: usuario.trim().toLowerCase()
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                const { id, pregunta1, pregunta2 } = res.data.datos;
                
                setIdUsuario(id);
                setPregunta1(pregunta1);
                setPregunta2(pregunta2);
                setPaso(2); 
            } else {
                Alert.alert("Aviso", res.data.mensaje || "El usuario ingresado no existe.");
            }
        } catch (error) {
            console.log("Error verificando usuario:", error.message);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor local.");
        } finally {
            setCargando(false);
        }
    };

    // 2. Validar respuestas de seguridad
    const verificarRespuestas = async () => {
        if (!respuesta1.trim() || !respuesta2.trim()) {
            return Alert.alert("Atención", "Por favor, responde ambas preguntas.");
        }

        Keyboard.dismiss();
        setCargando(true);
        try {
            const res = await axios.post(`${BASE_URL}/verificar-respuestas`, {
                id: idUsuario,
                respuesta1: respuesta1.trim().toLowerCase(),
                respuesta2: respuesta2.trim().toLowerCase()
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                setPaso(3);
            } else {
                Alert.alert("Validación Fallida", res.data.mensaje || "Respuestas incorrectas.");
            }
        } catch (error) {
            console.log("Error verificando respuestas:", error.message);
            Alert.alert("Error de Red", "Ocurrió un problema al validar las respuestas.");
        } finally {
            setCargando(false);
        }
    };

    // 3. Modificación final de contraseña
    const cambiarContrasena = async () => {
        if (!nuevaClave || !confirmarClave) {
            return Alert.alert("Atención", "Completa ambos campos de contraseña.");
        }
        if (!todoValido) {
            return Alert.alert("Atención", "La contraseña no cumple con los requisitos mínimos.");
        }
        if (nuevaClave !== confirmarClave) {
            return Alert.alert("Atención", "Las contraseñas no coinciden.");
        }

        Keyboard.dismiss();
        setCargando(true);
        try {
            const res = await axios.post(`${BASE_URL}/actualizar-clave-recuperacion`, {
                id: idUsuario,
                nuevaClave: nuevaClave
            }, { timeout: 6000 });

            if (res.data && res.data.success) {
                Alert.alert("¡Éxito!", "Tu contraseña ha sido cambiada correctamente.", [
                    { text: "OK", onPress: () => navigation.replace('Login') }
                ]);
            } else {
                Alert.alert("Error", res.data.mensaje || "No se pudo actualizar la contraseña.");
            }
        } catch (error) {
            console.log("Error actualizando clave:", error.message);
            Alert.alert("Error de Red", "No se guardaron los cambios en la base de datos.");
        } finally {
            setCargando(false);
        }
    };

    const Requisito = ({ cumplido, texto }) => (
        <View style={styles.requisitoItem}>
            <Text style={{ fontSize: 10 }}>{cumplido ? '✅' : '⚪'}</Text>
            <Text style={[styles.requisitoTexto, { color: cumplido ? '#2ecc71' : '#94a3b8' }]}>
                {texto}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.mainContainer}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        
                        {/* ================= PASO 1: INGRESO DE USUARIO ================= */}
                        {paso === 1 && (
                            <View>
                                <Text style={styles.tituloSeccion}>IDENTIFICACIÓN</Text>
                                <Text style={styles.subSeccion}>Ingresa tu usuario de acceso para buscar tu cuenta en el sistema.</Text>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Usuario</Text>
                                    <TextInput 
                                        placeholder="Ejemplo: jperez_villa" 
                                        placeholderTextColor="#94a3b8"
                                        onChangeText={setUsuario}
                                        value={usuario}
                                        style={styles.input}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!cargando}
                                    />
                                </View>

                                <TouchableOpacity 
                                    onPress={verificarUsuario}
                                    style={[styles.btn, !usuario.trim() && styles.btnDesactivado]}
                                    disabled={cargando || !usuario.trim()}
                                    activeOpacity={0.8}
                                >
                                    {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VERIFICAR CUENTA</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ================= PASO 2: PREGUNTAS DE SEGURIDAD ================= */}
                        {paso === 2 && (
                            <View>
                                <Text style={styles.tituloSeccion}>Preguntas de Seguridad</Text>
                                <Text style={styles.subSeccion}>Responde las preguntas asignadas a tu cuenta tal y como las registraste.</Text>

                                {/* Pregunta 1 */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.labelPregunta}>1. {pregunta1 || "Cargando pregunta..."}</Text>
                                    <TextInput 
                                        placeholder="Tu respuesta aquí" 
                                        placeholderTextColor="#94a3b8"
                                        onChangeText={setRespuesta1}
                                        value={respuesta1}
                                        style={styles.input}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!cargando}
                                    />
                                </View>

                                {/* Pregunta 2 */}
                                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                                    <Text style={styles.labelPregunta}>2. {pregunta2 || "Cargando pregunta..."}</Text>
                                    <TextInput 
                                        placeholder="Tu respuesta aquí" 
                                        placeholderTextColor="#94a3b8"
                                        onChangeText={setRespuesta2}
                                        value={respuesta2}
                                        style={styles.input}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!cargando}
                                    />
                                </View>

                                <TouchableOpacity 
                                    onPress={verificarRespuestas}
                                    style={[styles.btn, (!respuesta1.trim() || !respuesta2.trim()) && styles.btnDesactivado]}
                                    disabled={cargando || !respuesta1.trim() || !respuesta2.trim()}
                                    activeOpacity={0.8}
                                >
                                    {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDAR RESPUESTAS</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ================= PASO 3: NUEVA CONTRASEÑA ================= */}
                        {paso === 3 && (
                            <View>
                                <Text style={styles.tituloSeccion}>Nueva Contraseña</Text>
                                <Text style={styles.subSeccion}>Crea una clave segura respetando las validaciones del sistema.</Text>

                                {/* Input: Nueva Clave */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Contraseña Nueva</Text>
                                    <TextInput 
                                        placeholder="••••••••" 
                                        placeholderTextColor="#94a3b8"
                                        secureTextEntry
                                        onChangeText={setNuevaClave}
                                        value={nuevaClave}
                                        style={styles.input}
                                        maxLength={8}
                                        autoCapitalize="none"
                                        editable={!cargando}
                                    />
                                </View>

                                {/* Input: Confirmar Clave */}
                                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                                    <Text style={styles.label}>Confirmar Contraseña</Text>
                                    <TextInput 
                                        placeholder="••••••••" 
                                        placeholderTextColor="#94a3b8"
                                        secureTextEntry
                                        onChangeText={setConfirmarClave}
                                        value={confirmarClave}
                                        style={styles.input}
                                        maxLength={8}
                                        autoCapitalize="none"
                                        editable={!cargando}
                                    />
                                </View>

                                {/* Panel de Requisitos */}
                                <View style={styles.containerValidaciones}>
                                    <View style={styles.valRow}>
                                        <Requisito cumplido={validaciones.longitud} texto="6-8 caracteres" />
                                        <Requisito cumplido={validaciones.mayuscula} texto="Mayúscula" />
                                    </View>
                                    <View style={styles.valRow}>
                                        <Requisito cumplido={validaciones.minuscula} texto="Minúscula" />
                                        <Requisito cumplido={validaciones.numero} texto="Número" />
                                    </View>
                                    <View style={styles.especialRow}>
                                        <Requisito cumplido={validaciones.especial} texto="Especial ($, #, @, *)" />
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    onPress={cambiarContrasena}
                                    style={[styles.btn, (!todoValido || nuevaClave !== confirmarClave) && styles.btnDesactivado]}
                                    disabled={cargando || !todoValido || nuevaClave !== confirmarClave}
                                    activeOpacity={0.8}
                                >
                                    {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>REESTABLECER CONTRASEÑA</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F2F4F7' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
    tituloSeccion: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
    subSeccion: { fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 18 },
    inputGroup: { width: '100%' },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    labelPregunta: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
    input: { width: '100%', padding: 14, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', fontSize: 16, color: '#1e293b' },
    btn: { backgroundColor: '#525FE1', padding: 16, borderRadius: 12, marginTop: 22, alignItems: 'center' },
    btnDesactivado: { backgroundColor: '#cbd5e1' },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.8 },
    containerValidaciones: { marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    valRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    especialRow: { marginTop: 2 },
    requisitoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    requisitoTexto: { fontSize: 11, marginLeft: 5, fontWeight: '600' }
});