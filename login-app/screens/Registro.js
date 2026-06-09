import React, { useState, useEffect } from 'react';
import { 
    View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, 
    Image, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios'; 
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: REGISTRO DE USUARIO
 * Función: Crear nuevos accesos escribiendo libremente preguntas y respuestas de seguridad.
 * Todo se almacena de forma estandarizada en minúsculas.
 */
export default function RegistroUsuario({ navigation }) {
    const [nombre, setNombre] = useState('');
    const [usuario, setUsuario] = useState('');
    const [clave, setClave] = useState('');
    const [rol, setRol] = useState('');

    // Estados adaptados a texto libre escrito por el usuario
    const [pregunta1, setPregunta1] = useState('');
    const [respuesta1, setRespuesta1] = useState('');
    const [pregunta2, setPregunta2] = useState('');
    const [respuesta2, setRespuesta2] = useState('');

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

    const handleRegistro = async () => {
        if (!camposCompletos) {
            return Alert.alert("Atención", "Por favor, completa todos los campos de texto.");
        }

        try {
            const url = `${BASE_URL}/crearusuario`;
            
            // TRANSFORMACIÓN: Forzamos preguntas y respuestas a minúsculas antes de la inyección en la BD
            const datosEnviar = {
                nombre: nombre.trim(),
                usuario: usuario.trim().toLowerCase(), // Almacenado homogéneo
                clave: clave,
                rol: rol,
                pregunta1: pregunta1.trim().toLowerCase(),   // 👈 Guardado en minúscula
                respuesta1: respuesta1.trim().toLowerCase(), // 👈 Guardado en minúscula
                pregunta2: pregunta2.trim().toLowerCase(),   // 👈 Guardado en minúscula
                respuesta2: respuesta2.trim().toLowerCase()  // 👈 Guardado en minúscula
            };

            const res = await axios.post(url, datosEnviar);
            
            if (res.data.success) {
                Alert.alert("Éxito", "Personal registrado correctamente.");
                navigation.goBack();
            } else {
                Alert.alert("Error", res.data.mensaje || "El usuario ya existe.");
            }
        } catch (error) {
            // Imprime el error exacto en la terminal de Metro por si acaso para depurar rápido
            console.log("Error detallado en Axios:", error.message);
            Alert.alert("Error de Conexión", "No se pudo alcanzar el servidor.");
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
                                placeholderTextColor="#cbd5e1"
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
                                placeholderTextColor="#cbd5e1"
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
                                placeholderTextColor="#cbd5e1"
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
                                placeholder="Escribe tu propia Pregunta #1" 
                                onChangeText={setPregunta1} 
                                value={pregunta1}
                                style={styles.input} 
                                placeholderTextColor="#cbd5e1"
                            />
                            <TextInput 
                                placeholder="Escribe tu Respuesta #1" 
                                onChangeText={setRespuesta1} 
                                value={respuesta1}
                                style={[styles.input, { marginTop: 8 }]} 
                                placeholderTextColor="#cbd5e1"
                            />
                        </View>

                        {/* SECCIÓN TEXTO LIBRE: PREGUNTA Y RESPUESTA #2 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Seguridad #2</Text>
                            <TextInput 
                                placeholder="Escribe tu propia Pregunta #2" 
                                onChangeText={setPregunta2} 
                                value={pregunta2}
                                style={styles.input} 
                                placeholderTextColor="#cbd5e1"
                            />
                            <TextInput 
                                placeholder="Escribe tu Respuesta #2" 
                                onChangeText={setRespuesta2} 
                                value={respuesta2}
                                style={[styles.input, { marginTop: 8 }]} 
                                placeholderTextColor="#cbd5e1"
                            />
                        </View>

                        {/* SECCIÓN: ROL */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Rol en la Posada</Text>
                            <View style={styles.rolContainer}>
                                <TouchableOpacity 
                                    style={[styles.rolOption, rol === 'mantenimiento' && styles.rolSelected]} 
                                    onPress={() => setRol('mantenimiento')}
                                >
                                    <Text style={[styles.rolText, rol === 'mantenimiento' && styles.rolTextSelected]}>Mantenimiento</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rolOption, rol === 'admin' && styles.rolSelected]} 
                                    onPress={() => setRol('admin')}
                                >
                                    <Text style={[styles.rolText, rol === 'admin' && styles.rolTextSelected]}>Administrador</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* BOTÓN PRINCIPAL */}
                        <TouchableOpacity 
                            onPress={handleRegistro} 
                            style={[styles.btn, { backgroundColor: todoValido && camposCompletos ? '#525FE1' : '#cbd5e1' }]} 
                            disabled={!todoValido || !camposCompletos}
                        >
                            <Text style={styles.btnText}>CREAR CUENTA</Text>
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
    input: { padding: 14, backgroundColor: '#f1f5f9', borderRadius: 12, fontSize: 16, color: '#1e293b' },
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