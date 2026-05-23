import React, { useState } from 'react';
import { 
    View, 
    TextInput, 
    TouchableOpacity, 
    Text, 
    Alert, 
    StyleSheet, 
    Image, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from './apiConfig';

/**
 * PANTALLA: LOGIN
 * Función: Autenticación de usuarios y redirección según rol (Admin/Mantenimiento).
 */
export default function Login({ navigation }) {
    const [usuario, setUsuario] = useState('');
    const [clave, setClave] = useState('');
    const [cargando, setCargando] = useState(false);

    const API_URL = BASE_URL;

    const handleLogin = async () => {
        if (!usuario.trim() || !clave.trim()) {
            return Alert.alert("Atención", "Por favor, ingresa tu usuario y contraseña");
        }

        setCargando(true);
        try {
            const res = await axios.post(`${API_URL}/login`, { 
                usuario: usuario.trim(), 
                clave: clave 
            }, { timeout: 8000 });
            
            if (res.data.success) {
                const { id_usuario, rol, nombre } = res.data;
                
                const params = { idUsuario: id_usuario, nombreUsuario: nombre, rol: rol };
                
                if (rol && rol.toLowerCase() === 'admin') {
                    params.rol = "Admin"; 
                    navigation.replace('Admin', params);
                } else {
                    navigation.replace('MenuInferior', params);
                }
            } else {
                Alert.alert("Acceso Denegado", res.data.mensaje || "Usuario o contraseña incorrectos");
            }
        } catch (e) {
            console.error("Error Login:", e);
            Alert.alert(
                "Error de Conexión", 
                "No se pudo conectar con el servidor de la posada. Verifica que la PC esté encendida."
            );
        } finally {
            setCargando(false);
        }
    };

    // FUNCIÓN PARA RECOVERY: Aquí manejas la navegación hacia tu ruta indefinida
    const handleOlvidoContrasena = () => {
        
        navigation.navigate('RecuperacionClave');
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, width: '100%' }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                    
                    <View style={styles.topSection}>
                        <Image 
                            source={require('../assets/logo-login.jpg')} 
                            style={styles.logo} 
                            defaultSource={require('../assets/logo-login.jpg')}
                        />
                        <Text style={styles.welcomeText}>Posada Villa Montaña</Text>
                        <Text style={styles.tagline}>Sistema de Gestión Interna</Text>
                    </View>

                    <View style={styles.loginCard}>
                        {/* INPUT: USUARIO */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Usuario</Text>
                            <TextInput 
                                placeholder="Nombre de usuario" 
                                placeholderTextColor="#94a3b8"
                                onChangeText={setUsuario} 
                                style={styles.input} 
                                autoCapitalize="none"
                                autoComplete="username"
                                editable={!cargando}
                            />
                        </View>

                        {/* INPUT: CONTRASEÑA */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña</Text>
                            <TextInput 
                                placeholder="••••••••" 
                                placeholderTextColor="#94a3b8"
                                secureTextEntry 
                                onChangeText={setClave} 
                                style={styles.input} 
                                autoComplete="password"
                                editable={!cargando}
                            />
                        </View>

                        {/* 🟢 NUEVO: BOTÓN DE ¿OLVIDÓ SU CONTRASEÑA? */}
                        <TouchableOpacity 
                            onPress={handleOlvidoContrasena}
                            style={styles.olvidoContainer}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.olvidoTexto}>¿Olvidó su contraseña?</Text>
                        </TouchableOpacity>

                        {/* BOTÓN PRINCIPAL */}
                        <TouchableOpacity 
                            onPress={handleLogin} 
                            style={[styles.btn, { opacity: cargando ? 0.7 : 1 }]} 
                            activeOpacity={0.8}
                            disabled={cargando}
                        >
                            {cargando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>ENTRAR AL SISTEMA</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerVersion}>v1.0.4 - Táchira, Venezuela</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F2F4F7' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    topSection: { alignItems: 'center', marginBottom: 35 },
    logo: { width: 130, height: 130, borderRadius: 30, marginBottom: 15 },
    welcomeText: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    tagline: { fontSize: 14, color: '#64748b', marginTop: 4 },
    loginCard: { width: '88%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6, marginLeft: 4 },
    input: { width: '100%', padding: 15, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', fontSize: 16, color: '#1e293b' },
    
    // 🟢 NUEVOS ESTILOS PARA EL TEXTO AZUL LINK
    olvidoContainer: {
        alignSelf: 'flex-start',
        marginBottom: 24,
        marginLeft: 4,
    },
    olvidoTexto: {
        color: '#3b82f6', // Azul link idéntico al de tu captura
        fontSize: 14,
        fontWeight: '500',
    },

    btn: { backgroundColor: '#525FE1', padding: 18, borderRadius: 14, marginTop: 10, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1.2 },
    footerVersion: { marginTop: 30, color: '#94a3b8', fontSize: 11, fontWeight: '500' }
});