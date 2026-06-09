import { StyleSheet } from "react-native";

export const estiloRegistroCosto = StyleSheet.create({
    contenedor: {
        flexGrow:1,
    },
    titulo: { 
        fontSize: 26, 
        fontWeight: '800', 
        color: '#1e293b',
        marginBottom: 5 },
    main:{
        alignItems: 'center',
        paddingTop: 30,
        padding: 16
    },

    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 25,
        elevation: 10,
    },
    contenedorPiker:{
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius:10,
        marginBottom: 15
    },
    inputText:{
        width: '100%',
        
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 20,
        fontSize: 16,
    },
    btn: {
        backgroundColor: "#1b2163",
        borderRadius: 20,
        paddingVertical: 16,
        marginTop: 30,
        alignItems: 'center'
    },
    btnText: { color: '#fff', 
        fontSize: 16, 
        fontWeight: 'bold', 
        textTransform: 'uppercase' },
   
  
  label: {
        fontWeight: 'bold', 
        marginBottom: 8, 
        color: '#34495e'
    },
}

)