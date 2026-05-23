import { StyleSheet } from "react-native";

/**
 * ESTILOS: LISTA DE GASTOS
 * Contexto: Reportes de egresos y consumos operativos de la posada.
 */
export const estiloListaGasto = StyleSheet.create({
    listaContenedor: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        paddingBottom: 100, // Espacio extra para que el botón flotante o tab bar no tape el último item
    },
    Carta: {
        backgroundColor: '#ffffff',
        borderRadius: 12, // Un poco más redondeado para un look moderno
        padding: 16,
        marginVertical: 8,
        // Sombras para iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        // Sombra para Android
        elevation: 3,
        borderLeftWidth: 5, // Color dinámico según tipo de gasto (opcional en el componente)
        borderLeftColor: '#525FE1', 
    },
    tipoGasto: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
        textTransform: 'capitalize'
    },
    gasto: {
        fontSize: 20, // Aumentado para que el monto sea lo primero que se vea
        fontWeight: '800',
        color: '#ef4444', // Rojo para indicar salida de dinero (egreso)
        marginBottom: 8,
    },
    fecha: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
    },
    usuarioRegistro: {
        fontSize: 12,
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: 5,
    },
    noteShortDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 8
    },
    padreboton: {
        alignItems: "center",
        marginVertical: 20,
    },
    btn: {
        backgroundColor: "#525FE1",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 25,
        minWidth: 180,
        elevation: 4,
        shadowColor: '#525FE1',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 5 },
    },
    btnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5
    },
});