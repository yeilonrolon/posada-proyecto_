import { StyleSheet } from "react-native";

export const estilosLuzAgua = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: '#F8FAFC' },
    main: { flex: 1, alignItems: 'center', padding: 16, paddingTop: 30 },
    titulo: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginBottom: 5 },
    badgeOperador: { backgroundColor: '#E0E7FF', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    textoOperador: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
    
    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 25,
        elevation: 10,
    },
    label: { color: '#E0E7FF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 10 },
    
    // ESTE ES EL CAMBIO CLAVE:
    pickerContainer: {
        width: '100%',
        backgroundColor: '#F1F5F9', // Gris claro para que resalte del azul
        borderRadius: 18,
        overflow: 'hidden', // Importante para Android
        height: 55,
        justifyContent: 'center',
        marginBottom: 15,
    },
    picker: {
        width: '100%',
        color: '#1e293b', // Texto oscuro para que se lea bien
    },
    
    inputTexto: {
        width: '100%',
        height: 55,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#1e293b',
    },
    btn: {
        backgroundColor: "#1b2163",
        borderRadius: 20,
        paddingVertical: 16,
        marginTop: 30,
        alignItems: 'center'
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
    nota: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 20, paddingHorizontal: 20 }
});