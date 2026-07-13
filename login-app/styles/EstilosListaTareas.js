import { StyleSheet } from "react-native";

export const estilosListaTareas = StyleSheet.create({
    contenedorPrincipal: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20 },
    headerTop: { marginTop: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
    operadorHeader: { fontSize: 13, color: '#64748B', backgroundColor: '#E2E8F0', padding: 5, borderRadius: 10 },
    tituloSeccion: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase' },
    contenedorFiltros: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 },
    botonFiltro: { backgroundColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    botonFiltroActivo: { backgroundColor: '#525FE1' },
    textoFiltro: { color: '#475569', fontWeight: '600', fontSize: 14 },
    textoFiltroActivo: { color: '#FFF' },
    botonNuevo: { 
        backgroundColor: '#525FE1', 
        paddingVertical: 15, 
        borderRadius: 15, 
        alignItems: 'center', 
        elevation: 4,
        marginBottom: 20 
    },
    textoBotonNuevo: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lugarTexto: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    divisor: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    cardBody: { gap: 4 },
    estadoTexto: { fontSize: 15, fontWeight: 'bold', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', marginBottom: 5 },
    estadoPendiente: { backgroundColor: '#FEE2E2', color: '#EF4444' }, 
    estadoProceso: { backgroundColor: '#FEF3C7', color: '#D97706' },   
    estadoFinalizado: { backgroundColor: '#D1FAE5', color: '#059669' }, 
    descripcionTexto: { fontSize: 16, fontWeight: '700', color: '#000000', marginVertical: 2 },
    usuarioTexto: { fontSize: 14, color: '#334155', marginTop: 2 },
    fechaTexto: { fontSize: 13, color: '#64748B', marginTop: 4, fontStyle: 'italic' },
    botonEditarCard: { flex: 1, backgroundColor: '#525FE1', paddingVertical: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontWeight: '600' }
});