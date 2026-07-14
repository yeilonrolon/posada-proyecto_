import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import QRCode from 'qrcode';
import { BASE_URL } from './apiConfig';

const meses = [
    { label: 'Enero', value: 1 },
    { label: 'Febrero', value: 2 },
    { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Mayo', value: 5 },
    { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 },
    { label: 'Noviembre', value: 11 },
    { label: 'Diciembre', value: 12 }
];

const anios = [new Date().getFullYear(), new Date().getFullYear() - 1];

const obtenerMesAnio = (fechaStr) => {
    const [fecha] = fechaStr.split(' ');
    const partes = fecha.split('/');
    if (partes.length !== 3) return 'Desconocido';
    const mes = Number(partes[1]);
    const anio = Number(partes[2]);
    return isNaN(mes) || isNaN(anio) ? 'Desconocido' : `${meses[mes - 1]?.label || 'Mes'} ${anio}`;
};

const crearBarraHtml = (mes, cantidad, maximo) => {
    const porcentaje = maximo > 0 ? Math.max(4, Math.round((cantidad / maximo) * 100)) : 4;
    return `
        <div class="barra-fila">
            <div class="barra-meta">${mes}</div>
            <div class="barra-contenedor">
                <div class="barra-inner" style="width: ${porcentaje}%;"></div>
                <span>${cantidad.toFixed(2)}</span>
            </div>
        </div>`;
};

const generarPdfDesdeHtml = async (html, nombreArchivo) => {
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Compartir ${nombreArchivo}`,
    });
};

const calcularConsumoTotalRegistrado = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/listagastos`, { timeout: 8000 });
        if (!res.data.success || !Array.isArray(res.data.datos)) {
            return null;
        }

        const totales = {
            Agua: { registros: 0, minLectura: Infinity, maxLectura: -Infinity, consumo: 0 },
            Luz: { registros: 0, minLectura: Infinity, maxLectura: -Infinity, consumo: 0 }
        };

        res.data.datos.forEach((item) => {
            const tipo = String(item.tipo || '').trim();
            const lectura = Number(item.lectura_valor || 0);
            if (tipo === 'Agua' || tipo === 'Luz') {
                totales[tipo].registros += 1;
                totales[tipo].minLectura = Math.min(totales[tipo].minLectura, lectura);
                totales[tipo].maxLectura = Math.max(totales[tipo].maxLectura, lectura);
            }
        });

        ['Agua', 'Luz'].forEach((tipo) => {
            const data = totales[tipo];
            if (data.registros > 0 && data.maxLectura > -Infinity && data.minLectura < Infinity) {
                data.consumo = Number((data.maxLectura - data.minLectura).toFixed(2));
            } else {
                data.consumo = null;
            }
            if (data.minLectura === Infinity) data.minLectura = null;
            if (data.maxLectura === -Infinity) data.maxLectura = null;
        });

        return totales;
    } catch (error) {
        console.error('Error calculando consumo total registrado:', error);
        return null;
    }
};

const generarQrDataUrl = async (texto) => {
    try {
        // generar SVG primero (no requiere canvas) y usarlo como data URL
        try {
            const svg = await QRCode.toString(texto, { type: 'svg', width: 180, margin: 1 });
            if (svg) return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        } catch (errSvg) {
            // ignorar y probar PNG
        }
        // fallback: PNG data URL (requiere canvas); puede fallar en RN
        try {
            const png = await QRCode.toDataURL(texto, { margin: 1, width: 180 });
            if (png) return png;
        } catch (errPng) {
            // ambos fallaron
            console.error('Error generando QR (svg y png):', errPng?.message || errPng);
        }
        return null;
    } catch (error) {
        console.error('Error inesperado generando QR:', error);
        return null;
    }
};

export default function GeneradorPDF() {
    const [tipo, setTipo] = useState('Agua');
    const [modoConsumo, setModoConsumo] = useState('Mes');
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [generando, setGenerando] = useState(false);

    const mostrarError = (mensaje) => {
        Alert.alert('Generador de PDF', mensaje);
    };

    const generarPdfConsumo = async () => {
        setGenerando(true);
        try {
            if (modoConsumo === 'Mes') {
                const res = await axios.get(`${BASE_URL}/calcular-consumo`, {
                    params: { tipo, mes, anio },
                    timeout: 8000
                });
                if (!res.data.success) {
                    mostrarError(res.data.mensaje || 'No hay datos para el mes seleccionado.');
                    return;
                }

                const unidad = tipo === 'Agua' ? 'M3' : 'KWH';
                const html = `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8" />
                        <title>Consumo ${tipo}</title>
                        <style>
                            body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 24px; color: #1f2937; }
                            .page { max-width: 820px; margin: 0 auto; }
                            .card { background: white; border-radius: 20px; padding: 28px; box-shadow: 0 18px 34px rgba(15,23,42,0.08); }
                            h1 { margin: 0 0 14px; font-size: 24px; color: #1f2937; }
                            .subtitle { color: #4b5563; margin-bottom: 22px; }
                            .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
                            .info { background: #eef2ff; border-radius: 16px; padding: 18px; }
                            .info strong { display: block; font-size: 12px; color: #4338ca; margin-bottom: 6px; }
                            .info span { font-size: 15px; color: #111827; }
                            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                            th, td { border: 1px solid #e5e7eb; padding: 12px 14px; text-align: left; }
                            th { background: #eef2ff; color: #1d4ed8; }
                            .footer { margin-top: 32px; font-size: 12px; color: #6b7280; text-align: center; }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <div class="card">
                                <h1>Reporte de Consumo - ${tipo}</h1>
                                <p class="subtitle">Mes: ${meses[mes - 1].label} ${anio}</p>
                                <div class="info-grid">
                                    <div class="info"><strong>Consumo total</strong><span>${res.data.consumo.toFixed(2)} ${unidad}</span></div>
                                    <div class="info"><strong>Lectura inicial</strong><span>${res.data.lectura_inicial} ${unidad}</span></div>
                                    <div class="info"><strong>Lectura final</strong><span>${res.data.lectura_final} ${unidad}</span></div>
                                </div>
                                <table>
                                    <thead>
                                        <tr><th>Concepto</th><th>Detalle</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>Recurso</td><td>${tipo}</td></tr>
                                        <tr><td>Mes</td><td>${meses[mes - 1].label} ${anio}</td></tr>
                                        <tr><td>Fecha del informe</td><td>${new Date().toLocaleDateString('es-VE')}</td></tr>
                                    </tbody>
                                </table>
                                <div class="footer">Posada Villa Montaña · Reporte de consumo</div>
                            </div>
                        </div>
                    </body>
                    </html>`;

                await generarPdfDesdeHtml(html, `Consumo-${tipo}`);
                return;
            }

            const res = await axios.get(`${BASE_URL}/listagastos`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos) || res.data.datos.length === 0) {
                mostrarError('No se encontraron registros de consumo para generar el PDF de todos los meses.');
                return;
            }

            const registros = res.data.datos.filter(item => item.tipo === tipo);
            if (registros.length === 0) {
                mostrarError(`No hay registros de ${tipo} para generar el PDF de todos los meses.`);
                return;
            }

            const consumosPorMes = registros.reduce((acc, item) => {
                const clave = obtenerMesAnio(item.fecha_lista);
                const lectura = Number(item.lectura_valor) || 0;
                acc[clave] = (acc[clave] || 0) + lectura;
                return acc;
            }, {});

            const mesesOrdenados = Object.keys(consumosPorMes).sort((a, b) => {
                const [mesA, anioA] = a.split(' ');
                const [mesB, anioB] = b.split(' ');
                const idxA = meses.findIndex(m => m.label === mesA);
                const idxB = meses.findIndex(m => m.label === mesB);
                const yearA = Number(anioA);
                const yearB = Number(anioB);
                if (yearA !== yearB) return yearA - yearB;
                return idxA - idxB;
            });

            const totalMax = Math.max(...Object.values(consumosPorMes));
            const barras = mesesOrdenados.map((mesNombre) => crearBarraHtml(mesNombre, consumosPorMes[mesNombre], totalMax)).join('');
            const unidad = tipo === 'Agua' ? 'M3' : 'KWH';
            const mesMayor = mesesOrdenados.reduce((prev, actual) => consumosPorMes[actual] > consumosPorMes[prev] ? actual : prev, mesesOrdenados[0]);

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Consumo Total ${tipo}</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        .card { background: #fff; border-radius: 24px; padding: 28px; box-shadow: 0 20px 45px rgba(15,23,42,0.08); }
                        h1 { margin: 0 0 10px; font-size: 26px; color: #1f2937; }
                        p { margin: 0 0 20px; color: #475569; }
                        .destacado { padding: 18px; background: #eef2ff; border-radius: 18px; margin-bottom: 24px; }
                        .destacado strong { color: #1d4ed8; display: block; margin-bottom: 6px; }
                        .barra-fila { display: grid; grid-template-columns: 160px 1fr; gap: 12px; align-items: center; margin-bottom: 14px; }
                        .barra-meta { color: #0f172a; font-weight: 700; }
                        .barra-contenedor { position: relative; background: #e2e8f0; border-radius: 999px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
                        .barra-inner { height: 14px; background: #2563eb; border-radius: 999px; min-width: 4%; }
                        .barra-contenedor span { color: #1f2937; font-size: 12px; font-weight: 700; }
                        .footer { margin-top: 32px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <div class="card">
                            <h1>Consumo histórico - ${tipo}</h1>
                            <p>Los totales mensuales se agrupan por mes disponible en los registros del sistema.</p>
                            <div class="destacado">
                                <strong>Mes con mayor consumo:</strong>
                                <span>${mesMayor} · ${consumosPorMes[mesMayor].toFixed(2)} ${unidad}</span>
                            </div>
                            ${barras}
                            <div class="footer">Posada Villa Montaña · Análisis de consumo histórico</div>
                        </div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, `Consumo-Todos-${tipo}`);
        } catch (error) {
            console.error('Error generando PDF de consumo:', error);
            mostrarError('No se pudo generar el PDF. Verifica la conexión con el backend y vuelve a intentar.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfInventarioQR = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/equipos`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos)) {
                mostrarError('No se pudieron obtener los equipos registrados.');
                return;
            }

            const equipos = res.data.datos;
            if (equipos.length === 0) {
                mostrarError('No hay equipos QR registrados en el sistema.');
                return;
            }

            const equiposConHistorial = await Promise.all(equipos.map(async (equipo) => {
                // obtener historial y generar qrDataUrl (usamos generarQrDataUrl que prefiere SVG)
                let historial = [];
                try {
                    const respuesta = await axios.get(`${BASE_URL}/api/equipos/${equipo.id}`, { timeout: 8000 });
                    if (respuesta.data.success && respuesta.data.datos) {
                        historial = respuesta.data.datos.historial || [];
                    }
                } catch (err) {
                    // ignorar error de historial
                }

                const qrTexto = JSON.stringify({ id: equipo.id, nombre_equipo: equipo.nombre_equipo, ubicacion: equipo.ubicacion, frecuencia_mantenimiento: equipo.frecuencia_mantenimiento });
                let qrDataUrl = null;
                try {
                    qrDataUrl = await generarQrDataUrl(qrTexto);
                } catch (err) {
                    qrDataUrl = null;
                }

                return { ...equipo, historial, qrDataUrl };
            }));

            const secciones = equiposConHistorial.map((equipo) => {
                const qrTexto = JSON.stringify({
                    id: equipo.id,
                    nombre_equipo: equipo.nombre_equipo,
                    ubicacion: equipo.ubicacion,
                    frecuencia_mantenimiento: equipo.frecuencia_mantenimiento
                });
                const historialHtml = equipo.historial.length === 0
                    ? '<tr><td colspan="2" style="padding: 10px;">Sin historial registrado.</td></tr>'
                    : equipo.historial.map(h => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #d1d5db;">${h.fecha}</td>
                            <td style="padding: 10px; border: 1px solid #d1d5db;">${h.detalle}</td>
                        </tr>`).join('');

                const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='12'>QR no disponible</text></svg>`;
                const qrImg = equipo.qrDataUrl
                    ? `<img src="${equipo.qrDataUrl}" alt="QR" style="width:120px;height:120px;display:block;margin-bottom:12px;object-fit:contain;border-radius:6px;" />`
                    : `<img src="data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}" alt="QR-placeholder" style="width:120px;height:120px;display:block;margin-bottom:12px;object-fit:contain;border-radius:6px;" />`;

                return `
                    <div class="equipo-card">
                        <h2>${equipo.nombre_equipo} (ID ${equipo.id})</h2>
                        ${qrImg}
                        <p><strong>Ubicación:</strong> ${equipo.ubicacion}</p>
                        <p><strong>Última revisión:</strong> ${equipo.ultima_revision ? new Date(equipo.ultima_revision).toLocaleDateString('es-VE') : 'No registrada'}</p>
                        <p><strong>Frecuencia de mantenimiento:</strong> ${equipo.frecuencia_mantenimiento || 'No registrada'} días</p>
                        <h3>Historial</h3>
                        <table>
                            <thead>
                                <tr><th>Fecha</th><th>Detalle</th></tr>
                            </thead>
                            <tbody>
                                ${historialHtml}
                            </tbody>
                        </table>
                    </div>`;
            }).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Inventario QR</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 6px; color: #1f2937; }
                        p.lead { margin: 0 0 22px; color: #475569; }
                        .equipo-card { background: #fff; border-radius: 18px; padding: 22px; margin-bottom: 20px; box-shadow: 0 18px 40px rgba(15,23,42,0.05); }
                        .equipo-card { page-break-inside: avoid; break-inside: avoid; }
                        img { max-width: 160px; max-height: 160px; }
                        h2 { margin: 0 0 10px; font-size: 20px; color: #1e293b; }
                        p { margin: 4px 0; line-height: 1.55; }
                        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                        th, td { border: 1px solid #d1d5db; padding: 10px 12px; }
                        th { background: #eef2ff; text-align: left; }
                        .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Inventario de Equipos QR</h1>
                        <p class="lead">Listado de equipos registrados en el sistema con su historial de mantenimiento.</p>
                        ${secciones}
                        <div class="footer">Posada Villa Montaña · Inventario de activos QR</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Inventario-QR');
        } catch (error) {
            console.error('Error generando PDF de inventario QR:', error);
            mostrarError('No se pudo generar el PDF del inventario. Intenta de nuevo más tarde.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfAccesos = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/historial-accesos`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos) || res.data.datos.length === 0) {
                mostrarError('No hay registros de accesos para generar el PDF.');
                return;
            }

            const filas = res.data.datos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nombre_usuario}</td>
                    <td>${item.fecha_formateada}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Historial de Accesos</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 14px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Historial de Accesos</h1>
                        <p>Listado de ingresos a la aplicación registrados en el sistema.</p>
                        <table>
                            <thead>
                                <tr><th>#</th><th>Usuario</th><th>Fecha</th></tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                        <div class="footer">Posada Villa Montaña · Informe de accesos</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Historial-Accesos');
        } catch (error) {
            console.error('Error generando PDF de accesos:', error);
            mostrarError('No se pudo generar el PDF de historial de accesos.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfBanios = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/listabano`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos) || res.data.datos.length === 0) {
                mostrarError('No hay registros de baños para generar el PDF.');
                return;
            }

            const filas = res.data.datos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.num_habitacion}</td>
                    <td>${item.estado}</td>
                    <td>${item.observaciones || 'N/A'}</td>
                    <td>${item.fecha_lista}</td>
                    <td>${item.nombre || 'Desconocido'}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Registro de Baños</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 14px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Registro de Baños</h1>
                        <p>Listado de estados de baños y observaciones registradas.</p>
                        <table>
                            <thead>
                                <tr><th>#</th><th>Hab.</th><th>Estado</th><th>Observación</th><th>Fecha</th><th>Usuario</th></tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                        <div class="footer">Posada Villa Montaña · Registro de baños</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Registro-Baños');
        } catch (error) {
            console.error('Error generando PDF de baños:', error);
            mostrarError('No se pudo generar el PDF del registro de baños.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfHabitaciones = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/listar-habitaciones`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.habitacion) || res.data.habitacion.length === 0) {
                mostrarError('No hay información de habitaciones para generar el PDF.');
                return;
            }

            const filas = res.data.habitacion.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.id_habitacion}</td>
                    <td>${item.estado}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Estado de Habitaciones</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 14px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Estado de Habitaciones</h1>
                        <p>Listado de habitaciones y su estado actual registrado en el sistema.</p>
                        <table>
                            <thead>
                                <tr><th>#</th><th>Habitación</th><th>Estado</th></tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                        <div class="footer">Posada Villa Montaña · Estado de Habitaciones</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Estado-Habitaciones');
        } catch (error) {
            console.error('Error generando PDF de habitaciones:', error);
            mostrarError('No se pudo generar el PDF de habitaciones.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfTareas = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/listar-tareas`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.tareas) || res.data.tareas.length === 0) {
                mostrarError('No hay tareas registradas para generar el PDF.');
                return;
            }

            const tareasList = res.data.tareas;
            const agrupar = { pendiente: [], enproceso: [], finalizado: [], otros: [] };
            tareasList.forEach(t => {
                const s = (t.estado || '').toString().trim().toLowerCase();
                if (s.includes('pend')) agrupar.pendiente.push(t);
                else if (s.includes('proce')) agrupar.enproceso.push(t);
                else if (s.includes('final') || s.includes('comp')) agrupar.finalizado.push(t);
                else agrupar.otros.push(t);
            });

            const renderRows = (arr) => arr.length === 0 ? '<tr><td colspan="6" style="padding:10px">Sin registros.</td></tr>' : arr.map((it, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${it.id_tarea}</td>
                    <td>${it.lugar || ''}</td>
                    <td>${it.tarea || ''}</td>
                    <td>${it.nombre_responsable || it.responsable || 'N/A'}</td>
                    <td>${it.fecha_asignacion_formateada || ''}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Historial de Tareas</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        .section { background: #fff; border-radius: 20px; padding: 18px; box-shadow: 0 12px 30px rgba(15,23,42,0.04); margin-bottom: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th, td { border: 1px solid #d1d5db; padding: 10px 12px; }
                        th { background: #eef2ff; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Historial de Tareas</h1>
                        <div class="section">
                            <h2>Pendientes</h2>
                            <table>
                                <thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead>
                                <tbody>${renderRows(agrupar.pendiente)}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>En Proceso</h2>
                            <table>
                                <thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead>
                                <tbody>${renderRows(agrupar.enproceso)}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Finalizadas</h2>
                            <table>
                                <thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead>
                                <tbody>${renderRows(agrupar.finalizado)}</tbody>
                            </table>
                        </div>
                        ${agrupar.otros.length ? `<div class="section"><h2>Otros</h2><table><thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead><tbody>${renderRows(agrupar.otros)}</tbody></table></div>` : ''}
                        <div style="margin-top:18px;font-size:12px;color:#6b7280;text-align:center">Posada Villa Montaña · Historial de tareas</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Historial-Tareas');
        } catch (error) {
            console.error('Error generando PDF de tareas:', error);
            mostrarError('No se pudo generar el PDF de tareas. Intenta de nuevo más tarde.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfUsuariosActivos = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/listausuarios`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos) || res.data.datos.length === 0) {
                mostrarError('No hay usuarios activos para generar el PDF.');
                return;
            }

            const filas = res.data.datos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nombre}</td>
                    <td>${item.usuario}</td>
                    <td>${item.rol}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Usuarios Activos</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 14px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Usuarios Activos</h1>
                        <p>Listado de usuarios activos registrados en el sistema. Campos sensibles no se incluyen.</p>
                        <table>
                            <thead>
                                <tr><th>#</th><th>Nombre</th><th>Usuario</th><th>Rol</th></tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                        <div class="footer">Posada Villa Montaña · Usuarios Activos</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Usuarios-Activos');
        } catch (error) {
            console.error('Error generando PDF de usuarios activos:', error);
            mostrarError('No se pudo generar el PDF de usuarios activos.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfUsuariosInactivos = async () => {
        setGenerando(true);
        try {
            const res = await axios.get(`${BASE_URL}/usuariosinactivos`, { timeout: 8000 });
            if (!res.data.success || !Array.isArray(res.data.datos) || res.data.datos.length === 0) {
                mostrarError('No hay usuarios inactivos para generar el PDF.');
                return;
            }

            const filas = res.data.datos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nombre}</td>
                    <td>${item.usuario}</td>
                    <td>${item.rol}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Usuarios Inactivos</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px 14px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Usuarios Inactivos</h1>
                        <p>Listado de usuarios inactivos. No se incluyen contraseñas ni respuestas de seguridad.</p>
                        <table>
                            <thead>
                                <tr><th>#</th><th>Nombre</th><th>Usuario</th><th>Rol</th></tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                        <div class="footer">Posada Villa Montaña · Usuarios Inactivos</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Usuarios-Inactivos');
        } catch (error) {
            console.error('Error generando PDF de usuarios inactivos:', error);
            mostrarError('No se pudo generar el PDF de usuarios inactivos.');
        } finally {
            setGenerando(false);
        }
    };

    const generarPdfTodoSistema = async () => {
        setGenerando(true);
        try {
            const [consumoAguaResp, consumoLuzResp, accesosResp, banosResp, habitacionesResp, usuariosActivosResp, usuariosInactivosResp, equiposResp, tareasResp] = await Promise.all([
                axios.get(`${BASE_URL}/calcular-consumo`, { params: { tipo: 'Agua', mes, anio }, timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/calcular-consumo`, { params: { tipo: 'Luz', mes, anio }, timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/historial-accesos`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/listabano`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/listar-habitaciones`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/listausuarios`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/usuariosinactivos`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/api/equipos`, { timeout: 8000 }).catch(() => null),
                axios.get(`${BASE_URL}/listar-tareas`, { timeout: 8000 }).catch(() => null),
            ]);

            const equipos = (equiposResp?.data?.success && Array.isArray(equiposResp.data.datos)) ? equiposResp.data.datos : [];
            const equiposConHistorial = await Promise.all(equipos.map(async (equipo) => {
                try {
                    const respuesta = await axios.get(`${BASE_URL}/api/equipos/${equipo.id}`, { timeout: 8000 });
                    if (respuesta.data.success && respuesta.data.datos) {
                        const qrTexto = JSON.stringify({ id: equipo.id, nombre_equipo: equipo.nombre_equipo, ubicacion: equipo.ubicacion });
                        const qrDataUrl = await generarQrDataUrl(qrTexto);
                        return { ...equipo, historial: respuesta.data.datos.historial || [], qrDataUrl };
                    }
                } catch (err) {
                    console.log('Historial equipo fallido:', equipo.id, err.message);
                }
                const qrTexto = JSON.stringify({ id: equipo.id, nombre_equipo: equipo.nombre_equipo, ubicacion: equipo.ubicacion });
                const qrDataUrl = await generarQrDataUrl(qrTexto);
                return { ...equipo, historial: [], qrDataUrl };
            }));

            const consumoTotalRegistrado = await calcularConsumoTotalRegistrado();
            const totals = [
                { title: 'Consumo Agua', result: consumoAguaResp?.data, totalRegistrado: consumoTotalRegistrado?.Agua },
                { title: 'Consumo Luz', result: consumoLuzResp?.data, totalRegistrado: consumoTotalRegistrado?.Luz }
            ];

            const datosConsumo = totals.map(({ title, result, totalRegistrado }) => {
                if (result?.success) {
                    return `<tr><td>${title}</td><td>${result.consumo.toFixed(2)}</td><td>${result.lectura_inicial}</td><td>${result.lectura_final}</td></tr>`;
                }

                if (totalRegistrado) {
                    if (totalRegistrado.consumo !== null) {
                        return `<tr><td>${title}</td><td>${totalRegistrado.consumo.toFixed(2)}</td><td>${totalRegistrado.minLectura ?? 'N/A'}</td><td>${totalRegistrado.maxLectura ?? 'N/A'}</td></tr>`;
                    }
                    return `<tr><td>${title}</td><td colspan="3">Registros insuficientes para calcular el consumo</td></tr>`;
                }

                return `<tr><td>${title}</td><td colspan="3">No disponible</td></tr>`;
            }).join('');

            const listaAccesos = (accesosResp?.data?.success && Array.isArray(accesosResp.data.datos)) ? accesosResp.data.datos : [];
            const filasAccesos = listaAccesos.map((item, index) => `<tr><td>${index + 1}</td><td>${item.nombre_usuario}</td><td>${item.fecha_formateada}</td></tr>`).join('') || '<tr><td colspan="3">No hay accesos registrados.</td></tr>';

            const registrosBanos = (banosResp?.data?.success && Array.isArray(banosResp.data.datos)) ? banosResp.data.datos : [];
            const filasBanos = registrosBanos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.num_habitacion}</td>
                    <td>${item.estado}</td>
                    <td>${item.observaciones || 'N/A'}</td>
                    <td>${item.fecha_lista}</td>
                    <td>${item.nombre || 'Desconocido'}</td>
                </tr>
            `).join('') || '<tr><td colspan="6">No hay registros de baños.</td></tr>';

            const habitaciones = (habitacionesResp?.data?.success && Array.isArray(habitacionesResp.data.habitacion)) ? habitacionesResp.data.habitacion : [];
            const filasHabitaciones = habitaciones.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.id_habitacion}</td>
                    <td>${item.estado}</td>
                </tr>
            `).join('') || '<tr><td colspan="3">No hay habitaciones registradas.</td></tr>';

            const usuariosActivos = (usuariosActivosResp?.data?.success && Array.isArray(usuariosActivosResp.data.datos)) ? usuariosActivosResp.data.datos : [];
            const filasUsuariosActivos = usuariosActivos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nombre}</td>
                    <td>${item.usuario}</td>
                    <td>${item.rol}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No hay usuarios activos registrados.</td></tr>';

            const usuariosInactivos = (usuariosInactivosResp?.data?.success && Array.isArray(usuariosInactivosResp.data.datos)) ? usuariosInactivosResp.data.datos : [];
            const filasUsuariosInactivos = usuariosInactivos.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nombre}</td>
                    <td>${item.usuario}</td>
                    <td>${item.rol}</td>
                </tr>
            `).join('') || '<tr><td colspan="4">No hay usuarios inactivos registrados.</td></tr>';

            const tareas = (tareasResp?.data?.success && Array.isArray(tareasResp.data.tareas)) ? tareasResp.data.tareas : [];

            const htmlEquipos = equiposConHistorial.map((equipo) => {
                const qrImg = equipo.qrDataUrl
                    ? `<img src="${equipo.qrDataUrl}" alt="QR" style="width: 120px; height: 120px; display: block; margin-bottom: 16px;" />`
                    : '<p>No se pudo generar el QR.</p>';
                const historial = equipo.historial.length === 0
                    ? '<tr><td colspan="2" style="padding: 10px; border: 1px solid #d1d5db;">Sin historial registrado.</td></tr>'
                    : equipo.historial.map(h => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #d1d5db;">${h.fecha}</td>
                            <td style="padding: 10px; border: 1px solid #d1d5db;">${h.detalle}</td>
                        </tr>`).join('');
                return `
                    <div class="equipo-card">
                        <h3>${equipo.nombre_equipo} (ID ${equipo.id})</h3>
                        ${qrImg}
                        <p><strong>Ubicación:</strong> ${equipo.ubicacion}</p>
                        <table>
                            <thead><tr><th>Fecha</th><th>Detalle</th></tr></thead>
                            <tbody>${historial}</tbody>
                        </table>
                    </div>`;
            }).join('');

            // construir sección tareas para el PDF completo
            const tareasAgrupadas = { pendiente: [], enproceso: [], finalizado: [], otros: [] };
            tareas.forEach(t => {
                const s = (t.estado || '').toString().trim().toLowerCase();
                if (s.includes('pend')) tareasAgrupadas.pendiente.push(t);
                else if (s.includes('proce')) tareasAgrupadas.enproceso.push(t);
                else if (s.includes('final') || s.includes('comp')) tareasAgrupadas.finalizado.push(t);
                else tareasAgrupadas.otros.push(t);
            });

            const renderTaskRows = (arr) => arr.length === 0 ? '<tr><td colspan="6">Sin registros.</td></tr>' : arr.map((it, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${it.id_tarea}</td>
                    <td>${it.lugar || ''}</td>
                    <td>${it.tarea || ''}</td>
                    <td>${it.nombre_responsable || it.responsable || 'N/A'}</td>
                    <td>${it.fecha_asignacion_formateada || ''}</td>
                </tr>
            `).join('');

            const htmlTareas = `
                <div class="section">
                    <h2>Historial de Tareas</h2>
                    <h3>Pendientes</h3>
                    <table><thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead><tbody>${renderTaskRows(tareasAgrupadas.pendiente)}</tbody></table>
                    <h3>En Proceso</h3>
                    <table><thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead><tbody>${renderTaskRows(tareasAgrupadas.enproceso)}</tbody></table>
                    <h3>Finalizadas</h3>
                    <table><thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead><tbody>${renderTaskRows(tareasAgrupadas.finalizado)}</tbody></table>
                    ${tareasAgrupadas.otros.length ? `<h3>Otros</h3><table><thead><tr><th>#</th><th>ID</th><th>Lugar</th><th>Tarea</th><th>Responsable</th><th>Asignada</th></tr></thead><tbody>${renderTaskRows(tareasAgrupadas.otros)}</tbody></table>` : ''}
                </div>
            `;

            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <title>Reporte Completo del Sistema</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #111827; }
                        .page { max-width: 820px; margin: 0 auto; }
                        h1, h2, h3 { color: #111827; }
                        h1 { margin-bottom: 6px; font-size: 28px; }
                        .section { background: #fff; border-radius: 20px; padding: 22px; box-shadow: 0 20px 40px rgba(15,23,42,0.05); margin-bottom: 20px; }
                        .equipo-card { page-break-inside: avoid; break-inside: avoid; }
                        img { max-width: 160px; max-height: 160px; }
                        .section + .section { margin-top: 16px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th, td { border: 1px solid #d1d5db; padding: 10px 12px; }
                        th { background: #eef2ff; }
                        .footer { margin-top: 18px; font-size: 12px; color: #6b7280; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <h1>Reporte Completo del Sistema</h1>
                        <div class="section">
                            <h2>Resumen de consumo</h2>
                            <table>
                                <thead><tr><th>Reporte</th><th>Consumo</th><th>Inicial</th><th>Final</th></tr></thead>
                                <tbody>${datosConsumo}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Historial de accesos</h2>
                            <table>
                                <thead><tr><th>#</th><th>Usuario</th><th>Fecha</th></tr></thead>
                                <tbody>${filasAccesos}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Registro de baños</h2>
                            <table>
                                <thead><tr><th>#</th><th>Hab.</th><th>Estado</th><th>Observación</th><th>Fecha</th><th>Usuario</th></tr></thead>
                                <tbody>${filasBanos}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Estado de habitaciones</h2>
                            <table>
                                <thead><tr><th>#</th><th>Habitación</th><th>Estado</th></tr></thead>
                                <tbody>${filasHabitaciones}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Usuarios activos</h2>
                            <table>
                                <thead><tr><th>#</th><th>Nombre</th><th>Usuario</th><th>Rol</th></tr></thead>
                                <tbody>${filasUsuariosActivos}</tbody>
                            </table>
                        </div>
                        <div class="section">
                            <h2>Usuarios inactivos</h2>
                            <table>
                                <thead><tr><th>#</th><th>Nombre</th><th>Usuario</th><th>Rol</th></tr></thead>
                                <tbody>${filasUsuariosInactivos}</tbody>
                            </table>
                        </div>
                        ${htmlTareas}
                        <div class="section">
                            <h2>Inventario de equipos QR</h2>
                            ${htmlEquipos || '<p>No hay equipos QR registrados.</p>'}
                        </div>
                        <div class="footer">Posada Villa Montaña · Reporte completo del sistema</div>
                    </div>
                </body>
                </html>`;

            await generarPdfDesdeHtml(html, 'Reporte-Completo');
        } catch (error) {
            console.error('Error generando PDF completo:', error);
            mostrarError('No se pudo generar el PDF completo. Revisa tu conexión y vuelve a intentar.');
        } finally {
            setGenerando(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.header}>Generador de PDF</Text>
                <Text style={styles.subtitulo}>Seleccione la opción de reporte que desea generar.</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Consumo de Agua o Luz</Text>
                    <View style={styles.pickerWrapper}>
                        <Text style={styles.label}>Recurso</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={tipo} onValueChange={setTipo} style={styles.picker}>
                                <Picker.Item label="Agua" value="Agua" />
                                <Picker.Item label="Luz" value="Luz" />
                            </Picker>
                        </View>
                    </View>
                    <View style={styles.pickerWrapper}>
                        <Text style={styles.label}>Tipo de reporte</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={modoConsumo} onValueChange={setModoConsumo} style={styles.picker}>
                                <Picker.Item label="Mes" value="Mes" />
                                <Picker.Item label="Todos los meses" value="Todos" />
                            </Picker>
                        </View>
                    </View>
                    {modoConsumo === 'Mes' && (
                        <>
                            <View style={styles.pickerWrapper}>
                                <Text style={styles.label}>Mes</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={mes} onValueChange={setMes} style={styles.picker}>
                                        {meses.map((m) => (
                                            <Picker.Item key={m.value} label={m.label} value={m.value} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={styles.pickerWrapper}>
                                <Text style={styles.label}>Año</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={anio} onValueChange={setAnio} style={styles.picker}>
                                        {anios.map((a) => (
                                            <Picker.Item key={a} label={`${a}`} value={a} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        </>
                    )}
                    <TouchableOpacity style={styles.button} onPress={generarPdfConsumo} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Consumo</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inventario de Equipos QR</Text>
                    <Text style={styles.sectionText}>Genera un PDF con el inventario completo, datos del equipo y su historial de mantenimiento.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfInventarioQR} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Equipos QR</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Historial de Accesos</Text>
                    <Text style={styles.sectionText}>Genera un PDF con todos los ingresos registrados en la aplicación.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfAccesos} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Accesos</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Registro de Baños</Text>
                    <Text style={styles.sectionText}>Genera un PDF con el historial de estados de baños y observaciones registradas.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfBanios} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Baños</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estado de Habitaciones</Text>
                    <Text style={styles.sectionText}>Genera un PDF con el estado actual de las habitaciones.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfHabitaciones} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Habitaciones</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Historial de Tareas</Text>
                    <Text style={styles.sectionText}>Genera un PDF con el historial de tareas clasificadas por estado.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfTareas} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Tareas</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Usuarios Registrados</Text>
                    <Text style={styles.sectionText}>Genera un PDF con los usuarios activos del sistema sin incluir datos confidenciales.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfUsuariosActivos} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Usuarios Activos</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Usuarios Inactivos</Text>
                    <Text style={styles.sectionText}>Genera un PDF con los usuarios inactivos sin incluir contraseñas ni preguntas de seguridad.</Text>
                    <TouchableOpacity style={styles.buttonAlt} onPress={generarPdfUsuariosInactivos} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF de Usuarios Inactivos</Text>}
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, styles.sectionFinal]}>
                    <Text style={styles.sectionTitle}>Generar PDF de Todo el Sistema</Text>
                    <Text style={styles.sectionText}>Crea un único PDF que combine consumo, inventario QR, accesos, habitaciones, usuarios y registro de baños.</Text>
                    <TouchableOpacity style={styles.buttonDanger} onPress={generarPdfTodoSistema} disabled={generando} activeOpacity={0.8}>
                        {generando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generar PDF Completo</Text>}
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    content: { padding: 20, paddingBottom: 40 },
    header: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
    subtitulo: { fontSize: 14, color: '#475569', marginBottom: 20 },
    section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, elevation: 3 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    sectionText: { color: '#64748b', marginBottom: 14, lineHeight: 20 },
    pickerWrapper: { marginBottom: 14 },
    label: { color: '#334155', fontSize: 13, marginBottom: 6, fontWeight: '600' },
    pickerContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    picker: { width: '100%', color: '#111827' },
    button: { backgroundColor: '#525fe1', paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    buttonAlt: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    buttonDanger: { backgroundColor: '#ef4444', paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    sectionFinal: { borderColor: '#f87171', borderWidth: 1 },
});
