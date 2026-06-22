import { StyleSheet } from "react-native";

/**
 * ESTILOS: CÁLCULO DE CONSUMO ELÉCTRICO/AGUA
 * Uso: Interfaz para procesar lecturas de medidores y generar totales.
 */
export const estilosCalcularConsumo = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#F5F7F8',
    },
    main: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 5,
        textAlign: 'center'
    },
    subtitulo: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 25,
        textAlign: 'center'
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 22,
        // Sombra más profunda para resaltar el área de cálculo
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
        elevation: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#525FE1', // Color de marca para identificar campos de acción
        marginBottom: 8,
        marginTop: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    pickerContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    picker: {
        height: 55,
        width: '100%',
        color: '#1e293b',
    },
    // Estilo para resultados mostrados en pantalla
    resultadoBox: {
        backgroundColor: '#EEF2FF',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        alignItems: 'center'
    },
    btn: {
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
        width: '100%',
        backgroundColor: '#525FE1', // Asegurado el color principal
        elevation: 4,
        shadowColor: '#525FE1',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 4 },
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1
    }
});