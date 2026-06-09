import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';


export default function PantallaPrincipal({ navigation }) {
    return (
        <View style={styles.container}>
        <Text style={styles.titulo}>Panel de Control</Text>
        <Text style={styles.subtitulo}>Posada Villa Montaña</Text>

        {/* Botón para navegar */}
        <TouchableOpacity 
            style={styles.boton}
            onPress={() => navigation.navigate('pantallaqr')} // Aquí le decimos a dónde ir
        >
            <Text style={styles.textoBoton}>Ir al Generador de QR</Text>
        </TouchableOpacity>
        </View>
    );
    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    titulo: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1a365d',
    },
    subtitulo: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 40,
    },
    boton: {
        width: '80%',
        height: 50,
        backgroundColor: '#1a365d',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
    },
    textoBoton: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    });