import React, {useState, useEffect, useCallback} from "react";
import { View, TouchableOpacity, Text, TextInput, ScrollView, Alert, Keyboard } from "react-native";
import { BASE_URL } from './apiConfig';
import axios from 'axios';
import { Picker } from "@react-native-picker/picker";
import { estiloRegistroCosto } from "../styles/EstiloRegistroCosto";
export default function RegistroCosto({navigation,route}){
    const API_URL = BASE_URL;
    const {idUsuario, item} = route.params || {};
    const [habitaciones, setHabitaciones] = useState([]);
    const [selecionadaHabitacion, setSelecionadaHabitacion] = useState("");
    const [servicio, setServico] = useState("Interno");
    const [cedula,setCedula] = useState("");
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("")
    const [costo, setCosto] = useState("");
    const [materiales, setMateriales] = useState("");
    const [costoFinal, setCostoFinal] = useState("");
    const [moneda,setMoneda] = useState("");
    const [cargando, setCargando] = useState(false);
    
    useEffect(() => {
        if (item) {
            setSelecionadaHabitacion(item.ubicacion);
            setServico(item.servicio || "Interno");
            setCedula(item.cedula || "");
            setNombre(item.nombre_contratado || ""); 
            setTelefono(item.telefono || "");
            setCosto(item.costo || "");
            setMateriales(item.materiales );
            setCostoFinal(item.costo_final ? item.costo_final.toString() : "");
            setMoneda(item.moneda);
        }
    }, [item]);

    const listarHabitaciones = useCallback(async () =>{
        try{
            const res = await axios.get(`${API_URL}/listar-habitaciones-inactivas`);
            setHabitaciones(res.data.habitacion|| [])
        }
        catch(error){
            console.error('Error en listado de habitaciones:', error);
            Alert.alert("Error de Red", "No se pudo conectar con el servidor. Verifica que esté encendido.");
            setHabitaciones([])
        }
    })
    const presionarBotonGuardar = () => {
    if (!selecionadaHabitacion || !servicio || !moneda || !materiales.trim()) {
      Alert.alert('Campos Incompletos 🛑', 'Por favor complete todos los campos');
      return;
    }
    if(servicio == "Contratado"){
        if(!nombre.trim() || !cedula.trim() || !telefono.trim() || !costo.trim()){
            Alert.alert('Campos Incompletos 🛑', 'Por favor complete todos los campos');
        return;
    }
    if (!idUsuario) {
                setCargando(false)
                return Alert.alert("Error de Sesión", "No se detectó el ID del usuario. Por favor, reincia sesión.");
            }
    const valorNumerico = parseFloat(costoFinal.replace(',', '.')); // Soporta comas decimales
    if (isNaN(valorNumerico) || valorNumerico < 0) {
                    return Alert.alert("Dato inválido", "Ingresa un número válido y positivo.");
                    }
    const costoContratado = parseFloat(costo.replace(',', '.')); // Soporta comas decimales
    if (isNaN(costoContratado) || costoContratado < 0 && servicio === "contratado") {
                    return Alert.alert("Dato inválido", "Ingresa un número válido y positivo.");
                    }
    }
    const textoAlerta = item && item.id_costo  ? '¿Está seguro de querer actualizar este registro existente?' : '¿Está seguro de querer realizar este nuevo registro?';
    Alert.alert(
      'Confirmar Registro 📋',
      textoAlerta,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, guardar',
          onPress: guardarRegistro,
          style: 'default'
        }
      ],
      { cancelable: true }
    );
  };

  const guardarRegistro = async () => {
        setCargando(true);
        Keyboard.dismiss(); // Oculta el teclado al procesar
        const valorNumerico = parseFloat(costoFinal.replace(',', '.'));
        const costoContratado = costo ? parseFloat(costo.replace(',', '.')) : null;
                    
        try {
            const funcion = item && item.id_costo;
            const url = funcion ? `${API_URL}/editar-costo/${item.id_costo}` : `${API_URL}/registro-costo`;
            const metodo = funcion ? 'put' : 'post';

            const res = await axios[metodo](url, {
                ubicacion: ubicacionString(selecionadaHabitacion),
                servicio: servicio,
                cedula: cedula?.trim() || null,
                nombre: nombre?.trim() || null,
                telefono: telefono?.trim() || null,
                costo: costoContratado?.trim() || null,
                materiales: materiales,
                costoFinal: valorNumerico,
                moneda: moneda,
                registrado_por: idUsuario
            }, { timeout: 6000 });


            if (res.data.success) {
                
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
            
    const ubicacionString = (val) => {
        return val ? val.toString() : "";
    };

    return(
    <ScrollView style={estiloRegistroCosto.contenedor}>
        <View style={estiloRegistroCosto.main}>
            <Text style={estiloRegistroCosto.titulo}>Registro de costos</Text>
        <View style={estiloRegistroCosto.card}>
            <View>
                <Text style={estiloRegistroCosto.label}>Lugar a realizar la reparacion</Text>
                <Picker style={estiloRegistroCosto.contenedorPiker} selectedValue={selecionadaHabitacion}
                onValueChange={(item) => setSelecionadaHabitacion(item)}
                >
                    <Picker.Item label="Seleciona una Ubicacion" value=""/>
                    <Picker.Item label="Planta baja" value="Planta baja"/>
                    <Picker.Item label="Planta alta" value="Planta alta"/>                    
                        {habitaciones.map((h) => (
                        <Picker.Item  
                        key={h.id_habitacion}
                        label={`Habitacion N° ${h.id_habitacion}`}
                         value={h.id_habitacion}
                        />
                         ))}
                </Picker>
            </View>
            <View>
                <Text style={estiloRegistroCosto.label}>Tipo de servicio, interno o contratado</Text>
                <Picker style={estiloRegistroCosto.contenedorPiker} selectedValue={servicio}
                onValueChange={(item) => setServico(item)}
                >
                    <Picker.Item label="Interno" value="Interno"/>
                    <Picker.Item label="Se contrato" value="Contratado"/>
                </Picker>

            </View>
            {servicio === "Contratado" ? (
                <View>
                    <Text style={estiloRegistroCosto.label}>cedula de contratado</Text>
                    <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. 10987890"
                    onChangeText={setCedula}
                    value={cedula}
                    placeholderTextColor="#cbd5e1"
                    />
                
                    <Text style={estiloRegistroCosto.label}>nombre</Text>
                    <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. Juan Alejandro Perez Molina"
                    onChangeText={setNombre}
                    value={nombre}
                    multiline={true}
                    numberOfLines={4}/>
               
                    <Text style={estiloRegistroCosto.label}>telefono</Text>
                    <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. 04223451234"
                    keyboardType="numeric" 
                    onChangeText={setTelefono}
                    value={telefono}
                    />
                
                    <Text style={estiloRegistroCosto.label}>costo de contratarlo</Text>
                    <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. 30 dolares"
                    keyboardType="numeric" 
                    onChangeText={setCosto}
                    value={costo}
                    />

                </View>
           ) : null}
            <View>
                <Text style={estiloRegistroCosto.label}>lista de materiales y su costo</Text>
                <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. pintura: 30 dolares"
               
                onChangeText={setMateriales}
                value={materiales}
                multiline={true}
                numberOfLines={4}
                />

            </View>
            <View>
                <Text style={estiloRegistroCosto.label}>Costo total</Text>
                <TextInput style={estiloRegistroCosto.inputText} placeholder="Ej. 60 dolares"
                keyboardType="numeric" 
                onChangeText={setCostoFinal}
                value={costoFinal}
                />
            </View>
            <View>
                <Text style={estiloRegistroCosto.label}>Tipo de moneda usada</Text>
                <Picker style={estiloRegistroCosto.contenedorPiker} selectedValue={moneda}
                onValueChange={(item) => setMoneda(item)}
                >
                    <Picker.Item label="Seleciona el tipo de moneda" value=""/>
                    <Picker.Item label="Bolivares" value="Bolivares"/>
                    <Picker.Item label="Dolares" value="Dolares"/>
                    <Picker.Item label="Peso Colombiano" value="Peso Colombiano"/>
                </Picker>

            </View>
            
            <TouchableOpacity style={[estiloRegistroCosto.btn,{ opacity: cargando ? 0.7 : 1 }]} onPress={presionarBotonGuardar} disabled={cargando}>
                <Text style={estiloRegistroCosto.btnText}>{item ? "Guardar Cambios" : "Registrar reporte"}</Text>
            </TouchableOpacity>
            
        </View>



        </View>
        </ScrollView>
        )
};