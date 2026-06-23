import React, { useState, useEffect } from 'react';
import { 
    View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, 
    Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios'; 
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: REGISTRO DE USUARIO / PERSONAL
 * Función: Crea nuevos accesos de seguridad (Administrador o Mantenimiento).
 * Las preguntas y respuestas de seguridad se normalizan automáticamente a minúsculas.
 */
export default function RegistroUsuario({ navigation }) {
    const [nombre, setNombre] = useState('');
    const [usuario, setUsuario] = useState('');
    const [clave, setClave] = useState('');
    const [rol, setRol] = useState('');

    // Preguntas y respuestas personalizadas escritas libremente por el usuario
    const [pregunta1, setPregunta1] = useState('');
    const [respuesta1, setRespuesta1] = useState('');
    const [pregunta2, setPregunta2] = useState('');
    const [respuesta2, setRespuesta2] = useState('');

    const [cargando, setCargando] = useState(false);

    // Estado de validación detallado para la contraseña
    const [validaciones, setValidaciones] = useState({
        longitud: false,
        mayuscula: false,
        minuscula: false,
        numero: false,
        especial: false,
    });

    useEffect(() => {
        setValidaciones({
            longitud: clave.length >= 6 && clave.length <= 8,
            mayuscula: /[A-Z]/.test(clave),
            minuscula: /[a-z]/.test(clave),
            numero: /\d/.test(clave),
            especial: /[!@#$%^&*(),.?":{}|<>]/.test(clave),
        });
    }, [clave]);

    const todoValido = Object.values(validaciones).every(v => v === true);

    // Validación global de campos planos para activar el botón
    const camposCompletos = 
        nombre.trim() && usuario.trim() && clave && rol && 
        pregunta1.trim() && respuesta1.trim() && 
        pregunta2.trim() && respuesta2.trim();

    const botonHabilitado = todoValido && camposCompletos && !cargando;

    const handleRegistro = async () => {
        if (!camposCompletos || !todoValido) {
            return Alert.alert("Atención", "Por favor, completa correctamente todos los campos y requisitos.");
        }

        setCargando(true);
        Keyboard.dismiss();

        try {
            const url = `${BASE_URL}/crearusuario`;
            
            // NORMALIZACIÓN: Homogeneidad estricta para evitar fallos de coincidencia de strings
            const datosEnviar = {
                nombre: nombre.trim(),
                usuario: usuario.trim().toLowerCase(),
                clave: clave,
                rol: rol,
                pregunta1: pregunta1.trim().toLowerCase(),
                respuesta1: respuesta1.trim().toLowerCase(),
                pregunta2: pregunta2.trim().toLowerCase(),
                respuesta2: respuesta2.trim().toLowerCase()
            };

            const res = await axios.post(url, datosEnviar, { timeout: 6000 });
            
            if (res.data && res.data.success) {
                Alert.alert("✅ Éxito", "Personal registrado correctamente en el sistema central.");
                navigation.goBack();
            } else {
                Alert.alert("Aviso", res.data.mensaje || "El nombre de usuario ya se encuentra registrado.");
            }
        } catch (error) {
            console.log("Error detallado en Axios:", error.message);
            Alert.alert(
                "Error de Conexión", 
                "No se pudo alcanzar el servidor local de la posada. Verifique la red."
            );
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
                    <View style={styles.topSection}>
                        <Image source={require('../assets/logo-login.jpg')} style={styles.logo} />
                        <Text style={styles.welcomeText}>Nuevo Personal</Text>
                        <Text style={styles.subText}>Asigna credenciales de acceso</Text>
                    </View>

                    <View style={styles.loginCard}>
                        {/* INPUT: NOMBRE */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre Completo</Text>
                            <TextInput 
                                placeholder="Ej. Juan Pérez" 
                                onChangeText={setNombre} 
                                value={nombre}
                                style={styles.input} 
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        {/* INPUT: USUARIO */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Usuario de Acceso</Text>
                            <TextInput 
                                placeholder="Ej. jperez_villa" 
                                onChangeText={setUsuario} 
                                value={usuario}
                                style={styles.input} 
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        {/* INPUT: CONTRASEÑA */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña (6-8 caracteres)</Text>
                            <TextInput 
                                placeholder="••••••••" 
                                secureTextEntry 
                                onChangeText={setClave} 
                                value={clave}
                                style={styles.input} 
                                maxLength={8}
                                autoCapitalize="none"
                                placeholderTextColor="#94a3b8"
                            />
                            
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
                        </View>

                        {/* SECCIÓN TEXTO LIBRE: PREGUNTA Y RESPUESTA #1 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Seguridad #1</Text>
                            <TextInput 
                                placeholder="Pregunta personalizada #1 (Ej. Nombre de tu primera mascota)" 
                                onChangeText={setPregunta1} 
                                value={pregunta1}
                                style={styles.input} 
                                placeholderTextColor="#94a3b8"
                            />
                            <TextInput 
                                placeholder="Respuesta secreta #1" 
                                onChangeText={setRespuesta1} 
                                value={respuesta1}
                                style={[styles.input, { marginTop: 8 }]} 
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* SECCIÓN TEXTO LIBRE: PREGUNTA Y RESPUESTA #2 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Seguridad #2</Text>
                            <TextInput 
                                placeholder="Pregunta personalizada #2 (Ej. Ciudad donde naciste)" 
                                onChangeText={setPregunta2} 
                                value={pregunta2}
                                style={styles.input} 
                                placeholderTextColor="#94a3b8"
                            />
                            <TextInput 
                                placeholder="Respuesta secreta #2" 
                                onChangeText={setRespuesta2} 
                                value={respuesta2}
                                style={[styles.input, { marginTop: 8 }]} 
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* SECCIÓN: ROL */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Rol en la Posada</Text>
                            <View style={styles.rolContainer}>
                                <TouchableOpacity 
                                    style={[styles.rolOption, rol === 'mantenimiento' && styles.rolSelected]} 
                                    onPress={() => setRol('mantenimiento')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.rolText, rol === 'mantenimiento' && styles.rolTextSelected]}>Mantenimiento</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rolOption, rol === 'admin' && styles.rolSelected]} 
                                    onPress={() => setRol('admin')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.rolText, rol === 'admin' && styles.rolTextSelected]}>Administrador</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* BOTÓN PRINCIPAL */}
                        <TouchableOpacity 
                            onPress={handleRegistro} 
                            style={[styles.btn, { backgroundColor: botonHabilitado ? '#525FE1' : '#cbd5e1' }]} 
                            disabled={!botonHabilitado}
                            activeOpacity={0.8}
                        >
                            {cargando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>CREAR CUENTA</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { flexGrow: 1, alignItems: 'center', padding: 20 },
    topSection: { alignItems: 'center', marginVertical: 20 },
    logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 15 },
    welcomeText: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    subText: { fontSize: 14, color: '#64748b' },
    loginCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '700' },
    input: { padding: 14, backgroundColor: '#f1f5f9', borderRadius: 12, fontSize: 15, color: '#1e293b' },
    containerValidaciones: { marginTop: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    valRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    especialRow: { marginTop: 2 },
    requisitoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    requisitoTexto: { fontSize: 11, marginLeft: 5, fontWeight: '600' },
    rolContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    rolOption: { flex: 0.48, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    rolSelected: { borderColor: '#525FE1', backgroundColor: '#525FE1' },
    rolText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
    rolTextSelected: { color: '#FFFFFF' },
    btn: { padding: 18, borderRadius: 15, marginTop: 10, alignItems: 'center', elevation: 2 },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 }
});