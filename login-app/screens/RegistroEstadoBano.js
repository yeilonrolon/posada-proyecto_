import React, { useState,useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity,ScrollView, Switch, Alert,ActivityIndicator, Keyboard } from "react-native";
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { BASE_URL } from './apiConfig';
import { estiloRegistroBano } from "../styles/EstilosRegistroBano";

export default function RegistroEstadoBano ({navigation, route}){

    const API_URL = BASE_URL;

    const {idUsuario} = route.params || {};
    const [habitaciones, setHabitaciones] = useState([]);
    const [selecionadaHabitacion, setSelecionadaHabitacion] = useState("");
    const [observacion, setObservacion] = useState("");
    const [estado, setEstado] = useState("Activo");
    const [problemas, setProblemas] = useState(false);
    const [cargando, setCargando] = useState(false);

    

    const listarHabitaciones = async () =>{
        try{
            const res = await axios.get(`${API_URL}/listar-habitaciones`);
            setHabitaciones(res.data.habitacion|| [])
        }
        catch(error){
            console.error('Error en listdao de habitaciones:', error);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor. Verifica que esté encendido.");
            setHabitaciones([])
        }
    }

    const estadoHabitacion = async () =>{
        try{
            const res = await axios.put(`${API_URL}/estado-habitacion`,{
                estado:estado,
                habitacion:selecionadaHabitacion
            }, { timeout: 6000 });
            if(res.data && res.data.success){
                console.log("Estado modificado correctamente")

            }else{
                console.log("No se pudo modificar")
            }
        }
        catch(e){
            console.error("Error al modificar el estado:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor no responde. Verifica que la PC esté encendida y en la misma red WiFi. "
            );
        }
    };

    const guardarRegistro = async () => {
        if(problemas && observacion == ''){
            return Alert.alert("Campo vacío", "Por favor, ingresa la observacion");
        }
        if(selecionadaHabitacion == ""){
            return Alert.alert("Campo vacío", "Por favor, Selecione un Habitacion");
        }
        setCargando(true);
        Keyboard.dismiss(); // Oculta el teclado al procesar
        if (!idUsuario) {
                    return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reincia sesión.");
            }
        try {
            const res = await axios.post(`${API_URL}/estado-bano`, {
                habitacion: selecionadaHabitacion,
                estado: estado,
                observacion: observacion,
                registrado_por: idUsuario
            }, { timeout: 6000 });


            if (res.data.success) {
                await estadoHabitacion()
                Alert.alert(
                    "✅ Guardado", 
                    `Informe guardado correctamente`,
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Aviso", res.data.mensaje || "No se pudo guardar el registro.");
            }
        } catch (e) {
            console.error("Error al guardar:", e);
            Alert.alert(
                "Error de Conexión", 
                "El servidor no responde. Verifica que la PC esté encendida y en la misma red WiFi. "
            );
        } finally {
            setCargando(false);
        }
    };
    useEffect(() => {
            listarHabitaciones()
        }, [listarHabitaciones]);

    return(

        <ScrollView style={estiloRegistroBano.contenedor}>
            <View style={estiloRegistroBano.main}>
                <Text style={estiloRegistroBano.titulo}>Estado de Baños</Text>
                <View style={estiloRegistroBano.card}>
                    <Text style={estiloRegistroBano.label}>Habitacion: </Text>
                    <View style={estiloRegistroBano.contenedorPiker}>
                        
                        <Picker 
                        selectedValue={selecionadaHabitacion}
                        onValueChange={(itemValue) => setSelecionadaHabitacion(itemValue)}>
                        <Picker.item label="Seleciona un habitacion" value=""/>
                        
                            {habitaciones.map((h) => (
                                <Picker.Item  
                                key={h.id_habitacion}
                                label={`Habitacion N° ${h.id_habitacion}`}
                                value={h.id_habitacion}
                                />
                            ))}
                            
                        </Picker>
                    </View>
                    
                    <Text style={estiloRegistroBano.label}>Estado:</Text>
                    <View style={estiloRegistroBano.contenedorPiker}>
                        
                        <Picker selectedValue={estado}
                        onValueChange={(item) => setEstado(item)}
                        >
                            <Picker.Item label="Activo" value="Activo"/>
                            <Picker.Item label="Inactivo" value="Inactivo"/>
                        </Picker>
                    </View>
                    <View style={estiloRegistroBano.problemasRow}>
                        <Switch value={problemas} onValueChange={(value) => {setProblemas(value); if(!value) setObservacion('') }} />
                        <Text style={estiloRegistroBano.textoLabel}>Detalles de la situacion</Text>
                    </View>
                    {problemas && (
                        <View>
                            <TextInput
                            placeholder="Describa la situcion"
                            keyboardType="default" 
                            value={observacion}
                            onChangeText={setObservacion}
                            multiline={true}
                            numberOfLines={4}
                            style={estiloRegistroBano.inputText}/>
                        </View>
                    )}
                    <TouchableOpacity style={[estiloRegistroBano.btn,{ opacity: cargando ? 0.7 : 1 }]} onPress={guardarRegistro} disabled={cargando}
                        activeOpacity={0.8}>
                        {cargando ? (
                                <ActivityIndicator color="#fff" />
                        ) : (
                                <Text style={estiloRegistroBano.btnText}>Enviar</Text>
                                    )}
                    </TouchableOpacity>

                </View>
        </View>
        </ScrollView>
    )


}