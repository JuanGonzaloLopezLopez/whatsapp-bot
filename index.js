import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

dotenv.config();

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const puerto = Number(process.env.PORT || 3000);
const tokenVerificacion = process.env.VERIFY_TOKEN;
const tokenWhatsapp = process.env.WHATSAPP_TOKEN;
const idNumeroTelefono = String(process.env.PHONE_NUMBER_ID || "").trim();
const appSecret = process.env.APP_SECRET || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "";

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || "";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
const firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

const sesiones = new Map();
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

let firebaseDb = null;

try {
  if (
    firebaseDatabaseUrl &&
    firebaseProjectId &&
    firebaseClientEmail &&
    firebasePrivateKey
  ) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey,
        }),
        databaseURL: firebaseDatabaseUrl,
      });
    }

    firebaseDb = getDatabase();
    console.log("Firebase conectado correctamente.");
  } else {
    console.warn("Firebase no está configurado completamente.");
  }
} catch (error) {
  console.error("Error conectando Firebase:", error);
}

const URL_IMAGEN_OFERTA =
  "https://drive.google.com/uc?export=view&id=1dyTu7SGPCvfUbBAjHMkFjn-ZleWQrTFW";

const URL_IMAGEN_FICHAS =
  "https://drive.google.com/uc?export=view&id=1HEHavShxvnpORxW5AbazRHzDMuTQbHUY";

const TELEFONO_BASE = "(235) 323-15-45";
const TELEFONO_VIRTUAL = "(235) 323-25-45";
const TELEFONO_BOT_LLAMADAS = "235 101 07 97";

const EXTENSIONES = {
  direccion: "158",
  controlEscolar1: "129",
  controlEscolar2: "149",
  jefesCarrera: "134",
  enfermeria: "138",
  caja: "129",
  servicioSocial: "177",
  residencias: "101",
  divisionEstudios: "166",
  vinculacion: "103",
  subdireccionAcademica: "134",
};

const CONTEXTO_INSTITUCIONAL = `
INSTITUCIÓN:
Instituto Tecnológico Superior de Misantla.

UBICACIÓN:
Km. 1.8 Carretera a Loma del Cojolite, C.P. 93850, Misantla, Veracruz, México.

GOOGLE MAPS:
https://maps.app.goo.gl/UYednfvUfUB2Ec1C9

HORARIOS DE ATENCIÓN:
Lunes a viernes: 9:00 a 14:00 y de 15:00 a 17:00 horas.
Sábados: 9:00 a 14:00 horas.

TELÉFONOS:
Tel. principal: ${TELEFONO_BASE}
Número del bot para llamadas normales rápidas: ${TELEFONO_BOT_LLAMADAS}

CORREO DIRECCIÓN GENERAL:
dir_itsmisantla@itsm.edu.mx

REDES SOCIALES Y PÁGINA OFICIAL:
- Sitio web: https://misantla.tecnm.mx/
- Facebook: https://www.facebook.com/TecnmMisantla#
- Instagram: https://www.instagram.com/tecnmmisantla/
- TikTok: https://www.tiktok.com/@tecnmmisantla

EXTENSIONES:
Dirección General: 158
Control Escolar: 129 o 149
Jefes de Carrera: 134
Enfermería: 138
Caja: 129
Servicio Social: 177
Residencias: 101
División de Estudios: 166
Vinculación: 103

OFERTA EDUCATIVA:
- Ingeniería Industrial
- Ingeniería en Sistemas Computacionales
- Ingeniería Electromecánica
- Ingeniería Bioquímica
- Ingeniería Civil
- Ingeniería en Tecnologías de la Información y Comunicaciones
- Ingeniería Ambiental
- Ingeniería en Gestión Empresarial
- Ingeniería Petrolera
- Licenciatura en Gastronomía

POSGRADOS:
- Maestría en Ingeniería Industrial
- Maestría en Sistemas Computacionales
- Maestría en Ciencias de la Ingeniería
- Doctorado en Ciencias de la Ingeniería

INFORMACIÓN GENERAL DE CARRERAS:
Ingeniería Industrial: procesos, calidad, productividad, logística, seguridad industrial y mejora continua.
Ingeniería en Sistemas Computacionales: programación, desarrollo de software, bases de datos, redes, inteligencia artificial y sistemas informáticos.
Ingeniería Electromecánica: electricidad, mecánica, mantenimiento, automatización, máquinas eléctricas y sistemas industriales.
Ingeniería Bioquímica: procesos biotecnológicos, alimentos, laboratorio, control de calidad y transformación de materias primas.
Ingeniería Civil: construcción, estructuras, obras, caminos, hidráulica, materiales y supervisión de proyectos.
Ingeniería en Tecnologías de la Información y Comunicaciones: redes, telecomunicaciones, infraestructura tecnológica, ciberseguridad, servicios digitales y desarrollo tecnológico.
Ingeniería Ambiental: gestión ambiental, tratamiento de agua, residuos, impacto ambiental, conservación y sustentabilidad.
Ingeniería en Gestión Empresarial: administración, emprendimiento, mercadotecnia, finanzas, proyectos y gestión de organizaciones.
Ingeniería Petrolera: exploración, extracción, producción, yacimientos, perforación y seguridad en procesos petroleros.
Licenciatura en Gastronomía: cocina, alimentos, bebidas, higiene, administración gastronómica, innovación culinaria y servicios gastronómicos.

ADMISIÓN:
El proceso de admisión es gratuito.
La ficha, inscripción y reinscripción son gratuitas.
Examen de admisión / evaluación diagnóstica: 3 de julio de 2026.
Publicación de resultados: 8 de julio de 2026.

REQUISITOS PARA EXAMEN / ADMISIÓN:
- CURP
- Certificado o Constancia de Bachillerato con calificaciones

PARA PAGOS:
Comunicarse con Control Escolar a la extensión 129 o 149.

EDUCACIÓN VIRTUAL TECNM:
- Teléfono: ${TELEFONO_VIRTUAL} ext. 134
- Área: Subdirección Académica
- Enlace: virtual.tecnm.mx
- Carreras disponibles:
  * Ingeniería Industrial
  * Ingeniería en Sistemas Computacionales
  * Ingeniería en Gestión Empresarial

REGRESATEC:
- Subdirección Académica: ${TELEFONO_VIRTUAL} ext. 134
- Estudios Profesionales: ${TELEFONO_BASE} ext. 166
`;

if (!tokenVerificacion || !tokenWhatsapp || !idNumeroTelefono) {
  console.error("Faltan variables de entorno obligatorias.");
  process.exit(1);
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function claveFirebase(valor) {
  return String(valor || "").replace(/[.#$\[\]\/]/g, "_");
}

async function guardarMensaje(numero, origen, tipo, contenido, extra = {}) {
  try {
    if (!firebaseDb || !numero) return;

    const clave = claveFirebase(numero);
    const ahora = new Date().toISOString();

    const conversacionRef = firebaseDb.ref(`conversaciones/${clave}`);
    const creadoSnap = await conversacionRef.child("creadoEn").once("value");

    const actualizacion = {
      numero,
      actualizadoEn: ahora,
    };

    if (!creadoSnap.exists()) {
      actualizacion.creadoEn = ahora;
    }

    if (origen === "usuario") {
      const nuevosSnap = await conversacionRef
        .child("mensajesNuevos")
        .once("value");

      const actuales = Number(nuevosSnap.val() || 0);
      actualizacion.mensajesNuevos = actuales + 1;
    }

    await conversacionRef.update(actualizacion);

    await conversacionRef.child("mensajes").push({
      origen,
      tipo,
      contenido: String(contenido || ""),
      fecha: ahora,
      extra,
    });
  } catch (error) {
    console.error("Error guardando mensaje en Firebase:", error);
  }
}

async function leerConversacionesFirebase() {
  try {
    if (!firebaseDb) return [];

    const snapshot = await firebaseDb.ref("conversaciones").once("value");
    const data = snapshot.val() || {};

    const lista = Object.entries(data).map(([clave, conv]) => {
      const mensajesObj = conv.mensajes || {};

      const mensajes = Object.values(mensajesObj).sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

      return {
        clave,
        numero: conv.numero || "",
        creadoEn: conv.creadoEn || "",
        actualizadoEn: conv.actualizadoEn || "",
        modoHumano: Boolean(conv.modoHumano),
        tomadoPor: conv.tomadoPor || "",
        tomadoEn: conv.tomadoEn || "",
        requiereAtencion: Boolean(conv.requiereAtencion),
        mensajesNuevos: Number(conv.mensajesNuevos || 0),
        mensajes,
      };
    });

    lista.sort(
      (a, b) => new Date(b.actualizadoEn) - new Date(a.actualizadoEn)
    );

    return lista;
  } catch (error) {
    console.error("Error leyendo conversaciones de Firebase:", error);
    return [];
  }
}

async function obtenerConversacionPorClave(clave) {
  try {
    if (!firebaseDb || !clave) return null;

    const snapshot = await firebaseDb
      .ref(`conversaciones/${claveFirebase(clave)}`)
      .once("value");

    return snapshot.val();
  } catch (error) {
    console.error("Error obteniendo conversación:", error);
    return null;
  }
}

async function estaEnModoHumano(numero) {
  try {
    if (!firebaseDb || !numero) return false;

    const clave = claveFirebase(numero);
    const snapshot = await firebaseDb
      .ref(`conversaciones/${clave}/modoHumano`)
      .once("value");

    return Boolean(snapshot.val());
  } catch (error) {
    console.error("Error revisando modo humano:", error);
    return false;
  }
}

async function marcarAtencionPendiente(numero, estado) {
  try {
    if (!firebaseDb || !numero) return;

    await firebaseDb.ref(`conversaciones/${claveFirebase(numero)}`).update({
      requiereAtencion: Boolean(estado),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error marcando atención pendiente:", error);
  }
}

async function marcarLeidoFirebase(clave) {
  try {
    if (!firebaseDb || !clave) return false;

    await firebaseDb.ref(`conversaciones/${claveFirebase(clave)}`).update({
      mensajesNuevos: 0,
    });

    return true;
  } catch (error) {
    console.error("Error marcando conversación como leída:", error);
    return false;
  }
}

async function tomarChatFirebase(clave) {
  try {
    if (!firebaseDb || !clave) return false;

    await firebaseDb.ref(`conversaciones/${claveFirebase(clave)}`).update({
      modoHumano: true,
      tomadoPor: adminUser,
      tomadoEn: new Date().toISOString(),
      mensajesNuevos: 0,
      actualizadoEn: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error tomando chat:", error);
    return false;
  }
}

async function liberarChatFirebase(clave) {
  try {
    if (!firebaseDb || !clave) return false;

    await firebaseDb.ref(`conversaciones/${claveFirebase(clave)}`).update({
      modoHumano: false,
      liberadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error liberando chat:", error);
    return false;
  }
}

async function eliminarConversacionFirebase(clave) {
  try {
    if (!firebaseDb || !clave) return false;

    await firebaseDb.ref(`conversaciones/${claveFirebase(clave)}`).remove();

    return true;
  } catch (error) {
    console.error("Error eliminando conversación:", error);
    return false;
  }
}

function validarAdmin(req, res, next) {
  if (!adminPassword) {
    return res
      .status(500)
      .send("Configura ADMIN_PASSWORD en las variables de entorno de Render.");
  }

  const auth = req.headers.authorization || "";
  const [tipo, credenciales] = auth.split(" ");

  if (tipo === "Basic" && credenciales) {
    const [usuario, password] = Buffer.from(credenciales, "base64")
      .toString("utf8")
      .split(":");

    if (usuario === adminUser && password === adminPassword) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Panel del bot"');
  return res.status(401).send("Acceso requerido.");
}

app.get("/webhook", (req, res) => {
  const modo = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const reto = req.query["hub.challenge"];

  if (modo === "subscribe" && token === tokenVerificacion) {
    return res.status(200).send(reto);
  }

  return res.sendStatus(403);
});

app.get("/api/conversaciones", validarAdmin, async (req, res) => {
  const conversaciones = await leerConversacionesFirebase();
  res.json(conversaciones);
});

app.post("/api/conversaciones/:clave/leer", validarAdmin, async (req, res) => {
  const ok = await marcarLeidoFirebase(req.params.clave);

  if (!ok) {
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo marcar como leído.",
    });
  }

  return res.json({
    ok: true,
    mensaje: "Conversación marcada como leída.",
  });
});

app.delete("/api/conversaciones/:clave", validarAdmin, async (req, res) => {
  const eliminado = await eliminarConversacionFirebase(req.params.clave);

  if (!eliminado) {
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar la conversación.",
    });
  }

  return res.json({
    ok: true,
    mensaje: "Conversación eliminada correctamente.",
  });
});

app.post("/api/conversaciones/:clave/tomar", validarAdmin, async (req, res) => {
  const tomado = await tomarChatFirebase(req.params.clave);

  if (!tomado) {
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo tomar el chat.",
    });
  }

  return res.json({
    ok: true,
    mensaje: "Chat tomado correctamente.",
  });
});

app.post("/api/conversaciones/:clave/liberar", validarAdmin, async (req, res) => {
  const liberado = await liberarChatFirebase(req.params.clave);

  if (!liberado) {
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo liberar el chat.",
    });
  }

  return res.json({
    ok: true,
    mensaje: "Chat liberado correctamente.",
  });
});

app.post(
  "/api/conversaciones/:clave/mensaje",
  validarAdmin,
  upload.single("archivo"),
  async (req, res) => {
    try {
      const clave = req.params.clave;
      const texto = String(req.body?.mensaje || "").trim();
      const archivo = req.file || null;

      if (!texto && !archivo) {
        return res.status(400).json({
          ok: false,
          mensaje: "Escribe un mensaje o selecciona un archivo.",
        });
      }

      const conversacion = await obtenerConversacionPorClave(clave);

      if (!conversacion || !conversacion.numero) {
        return res.status(404).json({
          ok: false,
          mensaje: "No se encontró la conversación.",
        });
      }

      if (!conversacion.modoHumano) {
        return res.status(400).json({
          ok: false,
          mensaje: "Primero debes tomar el chat para responder manualmente.",
        });
      }

      if (archivo) {
        const resultado = await enviarArchivoWhatsApp(
          conversacion.numero,
          archivo,
          texto
        );

        if (!resultado.ok) {
          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo enviar el archivo por WhatsApp.",
          });
        }

        await guardarMensaje(
          conversacion.numero,
          "admin",
          resultado.tipo,
          texto || `Archivo enviado: ${archivo.originalname}`,
          {
            enviadoPor: adminUser,
            nombreArchivo: archivo.originalname,
            mimeType: archivo.mimetype,
            mediaId: resultado.mediaId || "",
          }
        );
      } else {
        const enviado = await enviarTextoWhatsApp(conversacion.numero, texto);

        if (!enviado) {
          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo enviar el mensaje por WhatsApp.",
          });
        }

        await guardarMensaje(conversacion.numero, "admin", "text", texto, {
          enviadoPor: adminUser,
        });
      }

      await firebaseDb.ref(`conversaciones/${claveFirebase(clave)}`).update({
        requiereAtencion: false,
        mensajesNuevos: 0,
        actualizadoEn: new Date().toISOString(),
      });

      return res.json({
        ok: true,
        mensaje: "Mensaje enviado correctamente.",
      });
    } catch (error) {
      console.error("Error enviando mensaje manual:", error);

      return res.status(500).json({
        ok: false,
        mensaje: "Ocurrió un error al enviar el mensaje.",
      });
    }
  }
);

app.get("/panel", validarAdmin, (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Panel de conversaciones</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    * { box-sizing: border-box; }

    html, body {
      height: 100%;
      margin: 0;
      overflow: hidden;
      font-family: Arial, sans-serif;
      background: #f0f2f5;
      color: #111827;
    }

    header {
      height: 56px;
      background: #075e54;
      color: white;
      padding: 14px 20px;
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
    }

    .contenedor {
      display: grid;
      grid-template-columns: 350px 1fr;
      height: calc(100vh - 56px);
      min-height: 0;
    }

    .lista {
      background: white;
      border-right: 1px solid #ddd;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .lista-superior {
      flex-shrink: 0;
      background: white;
      border-bottom: 1px solid #eee;
    }

    .buscador { padding: 12px; }

    .buscador input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      outline: none;
    }

    .acciones {
      padding: 0 12px 12px 12px;
      display: flex;
      gap: 8px;
    }

    .acciones button {
      border: none;
      background: #075e54;
      color: white;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }

    .acciones button:hover { background: #064c44; }

    #contactos {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .contacto {
      padding: 13px 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      position: relative;
    }

    .contacto:hover { background: #f5f5f5; }
    .contacto.activo { background: #e7f3ef; }

    .contacto.requiere {
      background: #dcfce7;
      border-left: 5px solid #16a34a;
    }

    .contacto.requiere.activo { background: #bbf7d0; }

    .numero {
      font-weight: bold;
      margin-bottom: 5px;
      padding-right: 35px;
    }

    .ultimo {
      color: #555;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fecha {
      color: #888;
      font-size: 11px;
      margin-top: 5px;
    }

    .contador {
      position: absolute;
      top: 12px;
      right: 12px;
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      border-radius: 999px;
      background: #16a34a;
      color: white;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .estado-humano {
      display: inline-block;
      background: #f97316;
      color: white;
      font-size: 11px;
      padding: 3px 7px;
      border-radius: 999px;
      margin-top: 6px;
    }

    .estado-atencion {
      display: inline-block;
      background: #16a34a;
      color: white;
      font-size: 11px;
      padding: 3px 7px;
      border-radius: 999px;
      margin-top: 6px;
      margin-left: 4px;
    }

    .chat {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #efeae2;
    }

    .chat-header {
      flex-shrink: 0;
      background: white;
      padding: 12px 18px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .chat-title { font-weight: bold; }

    .chat-subtitle {
      margin-top: 4px;
      font-size: 12px;
      color: #666;
    }

    .chat-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .btn {
      border: none;
      color: white;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }

    .btn-tomar { background: #0f766e; }
    .btn-tomar:hover { background: #115e59; }

    .btn-liberar { background: #2563eb; }
    .btn-liberar:hover { background: #1d4ed8; }

    .btn-eliminar { background: #dc2626; }
    .btn-eliminar:hover { background: #b91c1c; }

    .btn-enviar { background: #075e54; }
    .btn-enviar:hover { background: #064c44; }

    .mensajes {
      flex: 1;
      min-height: 0;
      padding: 18px;
      overflow-y: auto;
      background: #efeae2;
    }

    .burbuja {
      max-width: 75%;
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    }

    .usuario {
      background: #ffffff;
      margin-right: auto;
    }

    .bot {
      background: #dcf8c6;
      margin-left: auto;
    }

    .admin {
      background: #dbeafe;
      margin-left: auto;
    }

    .meta {
      font-size: 11px;
      color: #666;
      margin-top: 6px;
      text-align: right;
    }

    .vacio {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
      padding: 20px;
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 999px;
      background: #e5e7eb;
      margin-bottom: 6px;
      color: #374151;
    }

    .respuesta {
      flex-shrink: 0;
      background: white;
      border-top: 1px solid #ddd;
      padding: 10px;
      display: none;
      gap: 8px;
      align-items: center;
    }

    .respuesta textarea {
      flex: 1;
      resize: none;
      height: 54px;
      max-height: 90px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      outline: none;
      font-family: Arial, sans-serif;
    }

    .respuesta textarea:disabled {
      background: #f3f4f6;
      color: #777;
    }

    .archivo-zona {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 160px;
      max-width: 220px;
    }

    .archivo-label {
      background: #e5e7eb;
      color: #111827;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      font-size: 13px;
    }

    .archivo-label:hover { background: #d1d5db; }

    .archivo-label.deshabilitado {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #archivoManual { display: none; }

    #nombreArchivo {
      font-size: 11px;
      color: #555;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 210px;
    }

    @media (max-width: 850px) {
      .contenedor { grid-template-columns: 1fr; }

      .lista {
        height: 35vh;
        border-right: none;
        border-bottom: 1px solid #ddd;
      }

      .chat { height: calc(65vh - 56px); }
      .burbuja { max-width: 90%; }

      .chat-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .chat-actions { justify-content: flex-start; }

      .respuesta {
        align-items: stretch;
        flex-direction: column;
      }

      .archivo-zona {
        max-width: none;
        width: 100%;
      }

      #nombreArchivo { max-width: none; }
    }
  </style>
</head>
<body>
  <header>Panel de conversaciones del bot</header>

  <div class="contenedor">
    <section class="lista">
      <div class="lista-superior">
        <div class="buscador">
          <input id="buscar" type="text" placeholder="Buscar número..." />
        </div>

        <div class="acciones">
          <button onclick="cargarConversaciones()">Actualizar</button>
        </div>
      </div>

      <div id="contactos"></div>
    </section>

    <section class="chat">
      <div class="chat-header">
        <div>
          <div id="chatHeaderTitle" class="chat-title">Selecciona una conversación</div>
          <div id="chatHeaderSubtitle" class="chat-subtitle"></div>
        </div>

        <div class="chat-actions">
          <button id="btnTomar" class="btn btn-tomar" onclick="tomarSeleccionado()" style="display:none;">Tomar chat</button>
          <button id="btnLiberar" class="btn btn-liberar" onclick="liberarSeleccionado()" style="display:none;">Liberar chatbot</button>
          <button id="btnEliminar" class="btn btn-eliminar" onclick="eliminarSeleccionado()" style="display:none;">Eliminar chat</button>
        </div>
      </div>

      <div id="mensajes" class="mensajes">
        <div class="vacio">Aquí aparecerán los mensajes recibidos y enviados por el bot.</div>
      </div>

      <div id="respuestaBox" class="respuesta">
        <textarea id="mensajeManual" placeholder="Toma el chat para responder manualmente..." disabled></textarea>

        <div class="archivo-zona">
          <label id="archivoLabel" class="archivo-label deshabilitado" for="archivoManual">Adjuntar archivo</label>
          <input
            id="archivoManual"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            disabled
          />
          <div id="nombreArchivo">Sin archivo</div>
        </div>

        <button id="btnEnviarManual" class="btn btn-enviar" onclick="enviarMensajeManual()" disabled>Enviar</button>
      </div>
    </section>
  </div>

  <script>
    let conversaciones = [];
    let seleccionado = null;

    const contactosDiv = document.getElementById("contactos");
    const mensajesDiv = document.getElementById("mensajes");
    const chatHeaderTitle = document.getElementById("chatHeaderTitle");
    const chatHeaderSubtitle = document.getElementById("chatHeaderSubtitle");

    const btnTomar = document.getElementById("btnTomar");
    const btnLiberar = document.getElementById("btnLiberar");
    const btnEliminar = document.getElementById("btnEliminar");
    const respuestaBox = document.getElementById("respuestaBox");
    const mensajeManual = document.getElementById("mensajeManual");
    const btnEnviarManual = document.getElementById("btnEnviarManual");
    const archivoManual = document.getElementById("archivoManual");
    const nombreArchivo = document.getElementById("nombreArchivo");
    const archivoLabel = document.getElementById("archivoLabel");

    const buscarInput = document.getElementById("buscar");

    function fechaBonita(valor) {
      try {
        if (!valor) return "";
        return new Date(valor).toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short"
        });
      } catch {
        return "";
      }
    }

    function limpiarTexto(texto) {
      if (!texto) return "";
      return String(texto);
    }

    function conversacionActual() {
      if (!seleccionado) return null;
      return conversaciones.find(c => c.numero === seleccionado) || null;
    }

    async function cargarConversaciones() {
      try {
        const res = await fetch("/api/conversaciones");
        conversaciones = await res.json();

        renderContactos();

        if (seleccionado) {
          const actual = conversacionActual();
          if (actual) {
            renderMensajes(actual);
            if (actual.mensajesNuevos > 0) {
              await marcarComoLeido(actual);
            }
          } else {
            limpiarSeleccion();
          }
        }
      } catch (error) {
        console.error(error);
        contactosDiv.innerHTML = '<div class="vacio">No se pudieron cargar las conversaciones.</div>';
      }
    }

    function limpiarSeleccion() {
      seleccionado = null;
      chatHeaderTitle.textContent = "Selecciona una conversación";
      chatHeaderSubtitle.textContent = "";
      btnTomar.style.display = "none";
      btnLiberar.style.display = "none";
      btnEliminar.style.display = "none";
      respuestaBox.style.display = "none";
      mensajeManual.value = "";
      archivoManual.value = "";
      nombreArchivo.textContent = "Sin archivo";
      mensajesDiv.innerHTML = '<div class="vacio">Aquí aparecerán los mensajes recibidos y enviados por el bot.</div>';
    }

    function renderContactos() {
      const filtro = buscarInput.value.trim().toLowerCase();
      contactosDiv.innerHTML = "";

      const filtradas = conversaciones.filter(c =>
        String(c.numero || "").toLowerCase().includes(filtro)
      );

      if (filtradas.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "vacio";
        vacio.textContent = "No hay conversaciones guardadas todavía.";
        contactosDiv.appendChild(vacio);
        return;
      }

      filtradas.forEach(conv => {
        const ultimo = conv.mensajes?.[conv.mensajes.length - 1];

        const div = document.createElement("div");
        div.className =
          "contacto" +
          (conv.numero === seleccionado ? " activo" : "") +
          (conv.requiereAtencion ? " requiere" : "");

        const numero = document.createElement("div");
        numero.className = "numero";
        numero.textContent = conv.numero;

        const ultimoDiv = document.createElement("div");
        ultimoDiv.className = "ultimo";

        let origen = "Usuario: ";
        if (ultimo?.origen === "bot") origen = "Bot: ";
        if (ultimo?.origen === "admin") origen = "Admin: ";

        ultimoDiv.textContent = ultimo
          ? origen + limpiarTexto(ultimo.contenido)
          : "Sin mensajes";

        const fecha = document.createElement("div");
        fecha.className = "fecha";
        fecha.textContent = fechaBonita(conv.actualizadoEn);

        div.appendChild(numero);
        div.appendChild(ultimoDiv);
        div.appendChild(fecha);

        if (conv.mensajesNuevos > 0) {
          const contador = document.createElement("div");
          contador.className = "contador";
          contador.textContent = conv.mensajesNuevos > 99 ? "99+" : conv.mensajesNuevos;
          div.appendChild(contador);
        }

        if (conv.modoHumano) {
          const estado = document.createElement("div");
          estado.className = "estado-humano";
          estado.textContent = "Atendido por persona";
          div.appendChild(estado);
        }

        if (conv.requiereAtencion) {
          const atencion = document.createElement("div");
          atencion.className = "estado-atencion";
          atencion.textContent = "Solicitó atención";
          div.appendChild(atencion);
        }

        div.addEventListener("click", async () => {
          seleccionado = conv.numero;
          renderContactos();
          renderMensajes(conv);
          await marcarComoLeido(conv);
        });

        contactosDiv.appendChild(div);
      });
    }

    async function marcarComoLeido(conv) {
      if (!conv || !conv.clave) return;

      try {
        await fetch("/api/conversaciones/" + encodeURIComponent(conv.clave) + "/leer", {
          method: "POST"
        });

        conv.mensajesNuevos = 0;
        renderContactos();
      } catch (error) {
        console.error(error);
      }
    }

    function renderMensajes(conv) {
      chatHeaderTitle.textContent = "Conversación con " + conv.numero;

      if (conv.modoHumano) {
        chatHeaderSubtitle.textContent = "Modo humano activo. El bot no responderá en esta conversación.";
      } else if (conv.requiereAtencion) {
        chatHeaderSubtitle.textContent = "El usuario solicitó atención de una persona.";
      } else {
        chatHeaderSubtitle.textContent = "Chatbot activo. El bot responderá automáticamente.";
      }

      btnEliminar.style.display = "inline-block";
      btnTomar.style.display = conv.modoHumano ? "none" : "inline-block";
      btnLiberar.style.display = conv.modoHumano ? "inline-block" : "none";

      respuestaBox.style.display = "flex";
      mensajeManual.disabled = !conv.modoHumano;
      btnEnviarManual.disabled = !conv.modoHumano;
      archivoManual.disabled = !conv.modoHumano;

      if (conv.modoHumano) {
        archivoLabel.classList.remove("deshabilitado");
      } else {
        archivoLabel.classList.add("deshabilitado");
      }

      mensajeManual.placeholder = conv.modoHumano
        ? "Escribir mensaje..."
        : "Toma el chat para responder manualmente...";

      mensajesDiv.innerHTML = "";

      if (!conv.mensajes || conv.mensajes.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "vacio";
        vacio.textContent = "Esta conversación no tiene mensajes.";
        mensajesDiv.appendChild(vacio);
        return;
      }

      conv.mensajes.forEach(msg => {
        const burbuja = document.createElement("div");

        let clase = "usuario";
        let etiqueta = "Usuario";

        if (msg.origen === "bot") {
          clase = "bot";
          etiqueta = "Bot";
        }

        if (msg.origen === "admin") {
          clase = "admin";
          etiqueta = "Administrador";
        }

        burbuja.className = "burbuja " + clase;

        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = etiqueta;

        const contenido = document.createElement("div");

        if (msg.tipo === "image" && msg.extra?.nombreArchivo) {
          contenido.textContent = limpiarTexto(msg.contenido) + "\\nImagen: " + msg.extra.nombreArchivo;
        } else if (msg.tipo === "document" && msg.extra?.nombreArchivo) {
          contenido.textContent = limpiarTexto(msg.contenido) + "\\nDocumento: " + msg.extra.nombreArchivo;
        } else if (msg.tipo === "image" && msg.extra?.imageUrl) {
          contenido.textContent = limpiarTexto(msg.contenido) + "\\n" + msg.extra.imageUrl;
        } else {
          contenido.textContent = limpiarTexto(msg.contenido);
        }

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = fechaBonita(msg.fecha) + " · " + msg.tipo;

        burbuja.appendChild(badge);
        burbuja.appendChild(contenido);
        burbuja.appendChild(meta);

        mensajesDiv.appendChild(burbuja);
      });

      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    }

    async function tomarSeleccionado() {
      const conv = conversacionActual();
      if (!conv) return;

      try {
        const res = await fetch("/api/conversaciones/" + encodeURIComponent(conv.clave) + "/tomar", {
          method: "POST"
        });

        if (!res.ok) {
          alert("No se pudo tomar el chat.");
          return;
        }

        await cargarConversaciones();
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al tomar el chat.");
      }
    }

    async function liberarSeleccionado() {
      const conv = conversacionActual();
      if (!conv) return;

      const confirmar = confirm("¿Deseas liberar el chatbot para esta conversación?");
      if (!confirmar) return;

      try {
        const res = await fetch("/api/conversaciones/" + encodeURIComponent(conv.clave) + "/liberar", {
          method: "POST"
        });

        if (!res.ok) {
          alert("No se pudo liberar el chatbot.");
          return;
        }

        await cargarConversaciones();
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al liberar el chatbot.");
      }
    }

    async function eliminarSeleccionado() {
      const conv = conversacionActual();
      if (!conv) return;

      const confirmar = confirm("¿Seguro que deseas eliminar este chat? Esta acción no se puede deshacer.");
      if (!confirmar) return;

      try {
        const res = await fetch("/api/conversaciones/" + encodeURIComponent(conv.clave), {
          method: "DELETE"
        });

        if (!res.ok) {
          alert("No se pudo eliminar el chat.");
          return;
        }

        limpiarSeleccion();
        await cargarConversaciones();
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al eliminar el chat.");
      }
    }

    async function enviarMensajeManual() {
      const conv = conversacionActual();
      if (!conv) return;

      const texto = mensajeManual.value.trim();
      const archivo = archivoManual.files[0] || null;

      if (!texto && !archivo) {
        alert("Escribe un mensaje o selecciona un archivo.");
        return;
      }

      try {
        btnEnviarManual.disabled = true;

        const formData = new FormData();
        formData.append("mensaje", texto);

        if (archivo) {
          formData.append("archivo", archivo);
        }

        const res = await fetch("/api/conversaciones/" + encodeURIComponent(conv.clave) + "/mensaje", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          alert(data.mensaje || "No se pudo enviar el mensaje.");
          return;
        }

        mensajeManual.value = "";
        archivoManual.value = "";
        nombreArchivo.textContent = "Sin archivo";
        await cargarConversaciones();
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al enviar el mensaje.");
      } finally {
        const actualizado = conversacionActual();
        btnEnviarManual.disabled = !(actualizado && actualizado.modoHumano);
      }
    }

    mensajeManual.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarMensajeManual();
      }
    });

    archivoManual.addEventListener("change", () => {
      const archivo = archivoManual.files[0];

      if (!archivo) {
        nombreArchivo.textContent = "Sin archivo";
        return;
      }

      const mb = archivo.size / 1024 / 1024;

      if (mb > 15) {
        alert("El archivo supera el límite de 15 MB.");
        archivoManual.value = "";
        nombreArchivo.textContent = "Sin archivo";
        return;
      }

      nombreArchivo.textContent = archivo.name;
    });

    buscarInput.addEventListener("input", renderContactos);

    cargarConversaciones();
    setInterval(cargarConversaciones, 5000);
  </script>
</body>
</html>
  `);
});

function firmaValida(req) {
  if (!appSecret) return true;

  const firma = req.get("X-Hub-Signature-256");
  if (!firma || !firma.startsWith("sha256=")) return false;

  const firmaEsperada =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(firma),
    Buffer.from(firmaEsperada)
  );
}

app.post("/webhook", async (req, res) => {
  try {
    if (!firmaValida(req)) {
      return res.sendStatus(403);
    }

    const entradas = req.body?.entry || [];

    for (const entrada of entradas) {
      const cambios = entrada?.changes || [];

      for (const cambio of cambios) {
        const valor = cambio?.value;

        const phoneNumberIdEntrante = String(
          valor?.metadata?.phone_number_id || ""
        ).trim();

        if (phoneNumberIdEntrante && phoneNumberIdEntrante !== idNumeroTelefono) {
          console.log(
            `Mensaje ignorado. Llegó para ${phoneNumberIdEntrante}, pero el bot configurado usa ${idNumeroTelefono}`
          );
          continue;
        }

        const mensajes = valor?.messages || [];

        for (const mensaje of mensajes) {
          await procesarMensajeEntrante(mensaje);
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(200);
  }
});

async function procesarMensajeEntrante(mensaje) {
  const numeroCliente = mensaje.from;
  const tipo = mensaje.type;

  if (!numeroCliente) return;

  let textoRecibido = "";
  const vieneDeLista = tipo === "interactive";

  if (tipo === "text") {
    textoRecibido = (mensaje.text?.body || "").trim();
  } else if (tipo === "interactive") {
    textoRecibido =
      mensaje.interactive?.button_reply?.id ||
      mensaje.interactive?.list_reply?.id ||
      "";
  } else if (tipo === "audio") {
    await guardarMensaje(numeroCliente, "usuario", "audio", "Audio recibido");

    if (await estaEnModoHumano(numeroCliente)) {
      return;
    }

    await enviarTexto(
      numeroCliente,
      "🎧 *No se cuenta con la capacidad de responder audios.*\n\n" +
        "Por favor, escribe tu consulta en texto o selecciona una opción del menú."
    );

    await enviarMenuPrincipal(numeroCliente);
    return;
  } else {
    await guardarMensaje(
      numeroCliente,
      "usuario",
      tipo,
      `Mensaje recibido de tipo: ${tipo}`
    );

    if (await estaEnModoHumano(numeroCliente)) {
      return;
    }

    await enviarTexto(
      numeroCliente,
      "⚠️ *Por ahora solo puedo atender mensajes de texto o respuestas del menú.*"
    );

    await enviarMenuPrincipal(numeroCliente);
    return;
  }

  await guardarMensaje(numeroCliente, "usuario", tipo, textoRecibido);

  if (await estaEnModoHumano(numeroCliente)) {
    return;
  }

  const textoNormalizado = normalizarTexto(textoRecibido);
  const sesionActual = obtenerSesion(numeroCliente);

  if (
    textoNormalizado === "especifico" ||
    textoNormalizado === "op_btn_especifico"
  ) {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: true,
      actualizadaEn: Date.now(),
    });

    await enviarTexto(
      numeroCliente,
      "✅ *Modo específico activado*\n\n" +
        "Ahora puedes hacer preguntas más detalladas.\n\n" +
        "📝 Para salir de este modo escribe *menu*, *inicio* o *salir*."
    );
    return;
  }

  if (
    textoNormalizado === "salir" ||
    textoNormalizado === "menu" ||
    textoNormalizado === "menú" ||
    textoNormalizado === "inicio"
  ) {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: false,
      estado: "menu_principal",
      actualizadaEn: Date.now(),
    });

    await enviarMenuPrincipal(numeroCliente);
    return;
  }

  if (detectarSolicitudHumana(textoNormalizado)) {
    await marcarAtencionPendiente(numeroCliente, true);
    await enviarTexto(numeroCliente, mensajeAsistenciaReal());
    return;
  }

  const sesionRefrescada = obtenerSesion(numeroCliente);

  if (sesionRefrescada.modoEspecifico) {
    if (esConsultaDemasiadoAmbigua(textoNormalizado)) {
      await marcarAtencionPendiente(numeroCliente, true);
      await enviarTexto(numeroCliente, mensajeAsistenciaReal());
      return;
    }

    const respuestaIA = await generarRespuestaIA(textoRecibido);

    if (esRespuestaSinDato(respuestaIA)) {
      await marcarAtencionPendiente(numeroCliente, true);
      await enviarTexto(numeroCliente, mensajeAsistenciaReal());
      return;
    }

    await enviarTexto(numeroCliente, respuestaIA);
    return;
  }

  if (esSaludoOInicio(textoNormalizado)) {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: false,
      estado: "menu_principal",
      actualizadaEn: Date.now(),
    });

    await enviarMenuPrincipal(numeroCliente);
    return;
  }

  const respuestaFija = construirRespuestaFija(textoNormalizado);

  if (respuestaFija) {
    if (respuestaFija.tipo === "texto") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);

      if (vieneDeLista) {
        await esperar(800);
        await enviarMenuPrincipal(numeroCliente);
      }
    } else if (respuestaFija.tipo === "texto_e_imagen") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);

      await esperar(800);

      await enviarImagen(
        numeroCliente,
        respuestaFija.imageUrl,
        respuestaFija.caption || ""
      );

      if (vieneDeLista) {
        await esperar(2500);
        await enviarMenuPrincipal(numeroCliente);
      }
    }

    return;
  }

  await enviarTexto(
    numeroCliente,
    "❓ *No encontré una respuesta fija para esa duda.*\n\n" +
      'Escribe *menu* para ver el menú principal o selecciona *Especifico* para hacer una consulta más detallada.'
  );

  if (vieneDeLista) {
    await esperar(800);
    await enviarMenuPrincipal(numeroCliente);
  }
}

function obtenerSesion(numeroCliente) {
  const sesion = sesiones.get(numeroCliente);

  if (!sesion) {
    return {
      estado: "inicio",
      modoEspecifico: false,
      actualizadaEn: Date.now(),
    };
  }

  return sesion;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textoPlano(texto) {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneAlgunaFrase(texto, frases) {
  const base = textoPlano(texto);

  return frases.some((frase) => {
    const limpia = textoPlano(frase);
    return base.includes(limpia);
  });
}

function solicitaTelefonoOExtension(texto) {
  return contieneAlgunaFrase(texto, [
    "telefono",
    "teléfono",
    "numero",
    "número",
    "num",
    "núm",
    "extension",
    "extensión",
    "ext",
    "contacto",
    "llamar",
    "llamada",
  ]);
}

function detectarSolicitudHumana(texto) {
  const frases = [
    "quiero hablar con alguien real",
    "quiero hablar con una persona",
    "necesito hablar con alguien",
    "necesito hablar con una persona",
    "quiero hablar con un asesor",
    "necesito un asesor",
    "quiero hablar con un representante",
    "necesito un representante",
    "representante real",
    "pasame con alguien",
    "pásame con alguien",
    "pasame con una persona",
    "pásame con una persona",
    "pasame con un asesor",
    "pásame con un asesor",
    "pasame con un representante",
    "pásame con un representante",
    "quiero atencion real",
    "quiero atención real",
    "necesito atencion real",
    "necesito atención real",
    "atencion personalizada",
    "atención personalizada",
    "asistencia real",
    "humano",
    "persona real",
    "asesor real",
    "no me respondes",
    "no respondes",
    "no entiendes",
    "no me entiendes",
    "no me ayudas",
    "no sirve",
    "no me sirve",
    "esto no sirve",
    "pesimo",
    "pésimo",
    "mala atencion",
    "mala atención",
    "necesito que responda a mis preguntas",
    "necesito que respondas a mis preguntas",
    "quiero que respondan mis preguntas",
    "no contestas mi pregunta",
    "no contesta mi pregunta",
    "no responde mi duda",
    "no resuelve mi duda",
    "me urge hablar con alguien",
    "comunicarme con alguien",
    "comunicarme con una persona",
  ];

  return contieneAlgunaFrase(texto, frases);
}

function esConsultaDemasiadoAmbigua(texto) {
  const consulta = textoPlano(texto);

  const consultasAmbiguas = [
    "",
    "?",
    "??",
    "???",
    "ayuda",
    "ayudame",
    "ayúdame",
    "informacion",
    "información",
    "info",
    "quiero informacion",
    "quiero información",
    "necesito informacion",
    "necesito información",
    "duda",
    "pregunta",
    "tengo una duda",
    "tengo una pregunta",
    "no se",
    "no sé",
    "nose",
    "dime",
    "que hago",
    "qué hago",
    "como le hago",
    "cómo le hago",
    "explicame",
    "explícame",
  ].map(textoPlano);

  return consultasAmbiguas.includes(consulta);
}

function esRespuestaSinDato(respuesta) {
  const texto = textoPlano(respuesta || "");

  const frases = [
    "no cuento con ese dato",
    "no cuento con informacion",
    "no cuento con información",
    "no tengo informacion",
    "no tengo información",
    "no pude responder",
    "no puedo responder",
    "no encontre",
    "no encontré",
    "no se encontro",
    "no se encontró",
    "no puedo confirmar",
    "no dispongo",
    "no hay informacion",
    "no hay información",
    "intenta mas tarde",
    "intenta más tarde",
  ];

  return contieneAlgunaFrase(texto, frases);
}

function mensajeAsistenciaReal() {
  return (
    "🙋 *Atención con representante real*\n\n" +
    "Tu solicitud fue registrada. En unos minutos un representante real podrá atenderte por este mismo chat.\n\n" +
    "📞 *Si necesitas una respuesta más rápida*, puedes realizar una llamada normal al número del bot:\n\n" +
    `*${TELEFONO_BOT_LLAMADAS}*\n\n` +
    "Importante: para una respuesta rápida, realiza una *llamada normal*, no mensaje por WhatsApp."
  );
}

function esSaludoOInicio(texto) {
  const frasesSaludo = [
    "hola",
    "ola",
    "holaa",
    "holi",
    "holis",
    "buenos dias",
    "buen día",
    "buen dia",
    "buenas tardes",
    "buenas noches",
    "que tal",
    "qué tal",
    "una pregunta",
    "una duda",
    "disculpe",
    "disculpa",
    "oye",
    "oiga",
    "informacion",
    "información",
    "quiero informacion",
    "quiero información",
    "me podrias ayudar",
    "me podrías ayudar",
    "ayuda",
    "necesito informacion",
    "necesito información",
    "tengo una duda",
    "tengo una pregunta",
    "quisiera informacion",
    "quisiera información",
    "quisiera informes",
    "quiero informes",
    "me puede ayudar",
    "me puedes ayudar",
    "puede ayudarme",
    "puedes ayudarme",
    "quiero preguntar",
    "quiero hacer una pregunta",
    "tengo dudas",
    "tengo una consulta",
    "necesito ayuda",
    "informes",
  ];

  return contieneAlgunaFrase(texto, frasesSaludo);
}

function mensajeTelefonoConExtension(
  departamento,
  telefono,
  extension,
  extras = ""
) {
  let mensaje =
    `☎️ *${departamento}*\n\n` +
    `• *Teléfono:* ${telefono}\n` +
    `• *Extensión:* ${extension}`;

  if (extras) {
    mensaje += `\n${extras}`;
  }

  return mensaje;
}

function mensajeHorarios() {
  return (
    "🕒 *HORARIOS DE ATENCIÓN*\n\n" +
    "• *Lunes a viernes:* 9:00 a 14:00 y de 15:00 a 17:00 horas\n" +
    "• *Sábados:* 9:00 a 14:00 horas\n\n" +
    "📍 *Ubicación:* Km. 1.8 Carretera a Loma del Cojolite, Misantla, Veracruz.\n\n" +
    "✨ Si deseas información más detallada selecciona *Especifico* en el menú."
  );
}

function detectarCarrera(texto) {
  const t = textoPlano(texto);

  if (contieneAlgunaFrase(t, ["industrial", "ing industrial", "ingenieria industrial", "ingeneria industrial"])) {
    return "industrial";
  }

  if (
    contieneAlgunaFrase(t, [
      "sistemas computacionales",
      "sistemas",
      "sistema",
      "ing sistemas",
      "ing en sistemas",
      "ing sistemas computacionales",
      "ingenieria en sistemas",
      "ingeneria en sistemas",
      "isc",
      "computacionales",
      "computacion",
      "programacion",
      "software",
    ])
  ) {
    return "sistemas";
  }

  if (
    contieneAlgunaFrase(t, [
      "electromecanica",
      "electro mecanica",
      "electromecanico",
      "electromecan",
      "ing electromecanica",
      "ingenieria electromecanica",
      "mecanica electrica",
    ])
  ) {
    return "electromecanica";
  }

  if (
    contieneAlgunaFrase(t, [
      "bioquimica",
      "bio quimica",
      "bioquim",
      "biokimica",
      "ing bioquimica",
      "ingenieria bioquimica",
      "quimica",
    ])
  ) {
    return "bioquimica";
  }

  if (
    contieneAlgunaFrase(t, [
      "civil",
      "ing civil",
      "ingenieria civil",
      "ingeneria civil",
      "construccion",
      "estructuras",
    ])
  ) {
    return "civil";
  }

  if (
    contieneAlgunaFrase(t, [
      "tecnologias de la informacion",
      "tecnologia de la informacion",
      "tecnologias informacion",
      "tecnologia informacion",
      "informacion y comunicaciones",
      "informacion y comunicacion",
      "tics",
      "tic",
      "itics",
      "itc",
      "telecomunicaciones",
      "comunicaciones",
    ])
  ) {
    return "tic";
  }

  if (
    contieneAlgunaFrase(t, [
      "ambiental",
      "ing ambiental",
      "ingenieria ambiental",
      "medio ambiente",
      "ambiente",
      "sustentabilidad",
    ])
  ) {
    return "ambiental";
  }

  if (
    contieneAlgunaFrase(t, [
      "gestion empresarial",
      "gestión empresarial",
      "ing gestion",
      "ing en gestion",
      "ingenieria en gestion",
      "ingeneria en gestion",
      "empresarial",
      "administracion",
      "administración",
      "ige",
    ])
  ) {
    return "gestion";
  }

  if (
    contieneAlgunaFrase(t, [
      "petrolera",
      "petroleo",
      "petróleo",
      "ing petrolera",
      "ingenieria petrolera",
      "ingeneria petrolera",
      "yacimientos",
      "perforacion",
    ])
  ) {
    return "petrolera";
  }

  if (
    contieneAlgunaFrase(t, [
      "gastronomia",
      "gastronomía",
      "gastronom",
      "lic gastronomia",
      "licenciatura en gastronomia",
      "cocina",
      "alimentos y bebidas",
    ])
  ) {
    return "gastronomia";
  }

  return null;
}

function mensajeCarrera(claveCarrera) {
  const carreras = {
    industrial: {
      nombre: "Ingeniería Industrial",
      emoji: "🏭",
      descripcion:
        "forma profesionistas capaces de mejorar procesos productivos, optimizar recursos, analizar sistemas de trabajo y aplicar herramientas de calidad, logística, seguridad industrial y mejora continua.",
      areas:
        "procesos industriales, control de calidad, productividad, logística, administración de operaciones, seguridad e higiene y mejora continua.",
    },
    sistemas: {
      nombre: "Ingeniería en Sistemas Computacionales",
      emoji: "💻",
      descripcion:
        "se enfoca en el desarrollo de soluciones tecnológicas mediante programación, bases de datos, redes, desarrollo web, aplicaciones, inteligencia artificial y administración de sistemas informáticos.",
      areas:
        "programación, desarrollo de software, bases de datos, redes, inteligencia artificial, aplicaciones móviles, sistemas web y soporte tecnológico.",
    },
    electromecanica: {
      nombre: "Ingeniería Electromecánica",
      emoji: "⚙️",
      descripcion:
        "integra conocimientos de electricidad, mecánica, mantenimiento, automatización y sistemas industriales para diseñar, operar y conservar equipos electromecánicos.",
      areas:
        "mantenimiento industrial, máquinas eléctricas, automatización, diseño mecánico, instalaciones eléctricas y sistemas de control.",
    },
    bioquimica: {
      nombre: "Ingeniería Bioquímica",
      emoji: "🧪",
      descripcion:
        "se orienta al análisis, diseño y control de procesos relacionados con alimentos, biotecnología, laboratorio, transformación de materias primas y control de calidad.",
      areas:
        "biotecnología, procesos alimentarios, laboratorio, control de calidad, microbiología, química aplicada y producción industrial.",
    },
    civil: {
      nombre: "Ingeniería Civil",
      emoji: "🏗️",
      descripcion:
        "prepara profesionistas para participar en la planeación, diseño, construcción, supervisión y mantenimiento de obras de infraestructura.",
      areas:
        "estructuras, construcción, hidráulica, vías terrestres, materiales, topografía, costos y supervisión de obra.",
    },
    tic: {
      nombre: "Ingeniería en Tecnologías de la Información y Comunicaciones",
      emoji: "🌐",
      descripcion:
        "se enfoca en el uso, administración e integración de tecnologías digitales, redes, telecomunicaciones, servicios informáticos y seguridad tecnológica.",
      areas:
        "redes, telecomunicaciones, ciberseguridad, infraestructura tecnológica, servicios digitales, desarrollo web y administración de tecnologías.",
    },
    ambiental: {
      nombre: "Ingeniería Ambiental",
      emoji: "🌱",
      descripcion:
        "forma profesionistas capaces de analizar, prevenir y atender problemas ambientales mediante soluciones sustentables y gestión responsable de recursos.",
      areas:
        "tratamiento de agua, residuos, impacto ambiental, legislación ambiental, conservación, gestión ambiental y sustentabilidad.",
    },
    gestion: {
      nombre: "Ingeniería en Gestión Empresarial",
      emoji: "📊",
      descripcion:
        "combina conocimientos de administración, innovación, emprendimiento, finanzas, mercadotecnia y gestión de proyectos para mejorar organizaciones.",
      areas:
        "administración, emprendimiento, finanzas, mercadotecnia, recursos humanos, proyectos, innovación y gestión organizacional.",
    },
    petrolera: {
      nombre: "Ingeniería Petrolera",
      emoji: "🛢️",
      descripcion:
        "se relaciona con actividades de exploración, producción, perforación y aprovechamiento de hidrocarburos, considerando seguridad y eficiencia en procesos petroleros.",
      areas:
        "yacimientos, perforación, producción petrolera, seguridad industrial, geología aplicada y procesos de extracción.",
    },
    gastronomia: {
      nombre: "Licenciatura en Gastronomía",
      emoji: "🍽️",
      descripcion:
        "forma profesionistas en preparación de alimentos y bebidas, técnicas culinarias, higiene, administración gastronómica e innovación en servicios alimentarios.",
      areas:
        "cocina, repostería, alimentos y bebidas, higiene, administración de restaurantes, costos, servicio y creatividad culinaria.",
    },
  };

  const carrera = carreras[claveCarrera];

  if (!carrera) return null;

  return (
    `${carrera.emoji} *${carrera.nombre.toUpperCase()}*\n\n` +
    `📌 *Descripción general*\n` +
    `Esta carrera ${carrera.descripcion}\n\n` +
    `📚 *Áreas que se trabajan*\n` +
    `${carrera.areas}\n\n` +
    `☎️ *Más información académica*\n` +
    `• Jefes de Carrera: ${TELEFONO_BASE} ext. ${EXTENSIONES.jefesCarrera}\n\n` +
    `✨ Si deseas información más detallada sobre esta carrera, selecciona *Especifico* en el menú.`
  );
}

async function enviarMenuPrincipal(numeroDestino) {
  await enviarLista(numeroDestino);
}

async function enviarLista(numeroDestino) {
  const url = `https://graph.facebook.com/v25.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "📋 Menú principal",
      },
      body: {
        text: "Selecciona una opción:",
      },
      footer: {
        text: "Elige Especifico para hacer preguntas más detalladas.",
      },
      action: {
        button: "Ver opciones",
        sections: [
          {
            title: "Información general",
            rows: [
              {
                id: "op_btn_fichas",
                title: "Fichas de admisión",
                description: "Fichas, examen y requisitos",
              },
              {
                id: "op_btn_oferta",
                title: "Oferta educativa",
                description: "Carreras y postgrados",
              },
              {
                id: "op_btn_redes",
                title: "Redes sociales",
                description: "Sitio web y redes oficiales",
              },
              {
                id: "op_btn_telefonos",
                title: "Teléfonos y extensiones",
                description: "Departamentos y extensiones",
              },
              {
                id: "op_btn_ubicacion",
                title: "Ubicación del Instituto",
                description: "Dirección y horarios",
              },
              {
                id: "op_btn_virtual",
                title: "Educación Virtual",
                description: "Modalidad virtual TECNM",
              },
              {
                id: "op_btn_regresatec",
                title: "RegresaTec",
                description: "Información y contacto",
              },
              {
                id: "op_btn_especifico",
                title: "Especifico",
                description: "Activa preguntas detalladas",
              },
            ],
          },
        ],
      },
    },
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    console.error("Error enviando lista:", await respuesta.text());
    return;
  }

  await guardarMensaje(
    numeroDestino,
    "bot",
    "interactive",
    "Menú principal enviado"
  );
}

function construirRespuestaFija(texto) {
  if (
    texto === "op_btn_fichas" ||
    contieneAlgunaFrase(texto, [
      "fichas de admision",
      "fichas de admisión",
      "fichas",
      "ficha",
      "inscripciones",
      "inscripcion",
      "inscripción",
    ])
  ) {
    return {
      tipo: "texto_e_imagen",
      mensaje:
        "📝 *FICHAS DE ADMISIÓN*\n\n" +
        "✅ *El proceso de admisión es gratuito.*\n" +
        "La ficha, inscripción y reinscripción son gratuitas.\n\n" +
        "📅 *Examen de admisión / evaluación diagnóstica*\n" +
        "• 3 de julio de 2026\n" +
        "• Se realiza en línea\n\n" +
        "📢 *Publicación de resultados*\n" +
        "• 8 de julio de 2026\n\n" +
        "📄 *Requisitos para el examen*\n" +
        "• CURP\n" +
        "• Certificado o Constancia de Bachillerato con calificaciones\n\n" +
        '✨ Si deseas información más detallada selecciona *Especifico* en el menú.',
      imageUrl: URL_IMAGEN_FICHAS,
      caption: "📝 Fichas de admisión",
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "horario",
      "horarios",
      "orario",
      "orarios",
      "horario de atencion",
      "horarios de atencion",
      "hora de atencion",
      "horas de atencion",
      "a que hora atienden",
      "que hora atienden",
      "en que horario atienden",
      "cuando atienden",
      "dias de atencion",
      "días de atención",
      "atienden los sabados",
      "atienden sabado",
      "sabados atienden",
      "sabado atienden",
      "abren",
      "cierran",
      "a que hora abren",
      "a que hora cierran",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeHorarios(),
    };
  }

  const carreraDetectada = detectarCarrera(texto);

  if (carreraDetectada) {
    return {
      tipo: "texto",
      mensaje: mensajeCarrera(carreraDetectada),
    };
  }

  if (
    texto === "op_btn_oferta" ||
    contieneAlgunaFrase(texto, [
      "oferta educativa",
      "oferta academica",
      "oferta académica",
      "carreras",
      "carrera",
      "que carreras tienen",
      "que carreras ofrecen",
      "ingenierias",
      "ingenierías",
      "ingenieria",
      "ingeneria",
      "postgrados",
      "posgrados",
      "maestrias",
      "maestrías",
      "doctorado",
    ])
  ) {
    return {
      tipo: "texto_e_imagen",
      mensaje:
        "🎓 *OFERTA EDUCATIVA DEL INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA*\n\n" +
        "📚 *Carreras que se ofrecen*\n" +
        "• Ingeniería Industrial\n" +
        "• Ingeniería en Sistemas Computacionales\n" +
        "• Ingeniería Electromecánica\n" +
        "• Ingeniería Bioquímica\n" +
        "• Ingeniería Civil\n" +
        "• Ingeniería en Tecnologías de la Información y Comunicaciones\n" +
        "• Ingeniería Ambiental\n" +
        "• Ingeniería en Gestión Empresarial\n" +
        "• Ingeniería Petrolera\n" +
        "• Licenciatura en Gastronomía\n\n" +
        "🏛️ *Postgrados*\n" +
        "• Maestría en Ingeniería Industrial\n" +
        "• Maestría en Sistemas Computacionales\n" +
        "• Maestría en Ciencias de la Ingeniería\n" +
        "• Doctorado en Ciencias de la Ingeniería\n\n" +
        '✨ Puedes pedir información de una carrera escribiendo, por ejemplo: *info de ing. industrial* o *información de sistemas*.',
      imageUrl: URL_IMAGEN_OFERTA,
      caption: "🎓 Oferta educativa del Instituto Tecnológico Superior de Misantla",
    };
  }

  if (
    texto === "op_btn_redes" ||
    contieneAlgunaFrase(texto, [
      "redes sociales",
      "redes",
      "pagina oficial",
      "página oficial",
      "facebook",
      "instagram",
      "tiktok",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "🌐 *REDES SOCIALES Y PÁGINA OFICIAL*\n\n" +
        "🔹 *Sitio web oficial*\n" +
        "https://misantla.tecnm.mx/\n\n" +
        "📘 *Facebook*\n" +
        "https://www.facebook.com/TecnmMisantla#\n\n" +
        "📷 *Instagram*\n" +
        "https://www.instagram.com/tecnmmisantla/\n\n" +
        "🎵 *TikTok*\n" +
        "https://www.tiktok.com/@tecnmmisantla\n\n" +
        "✨ Si deseas información más detallada selecciona *Especifico* en el menú.",
    };
  }

  if (
    texto === "op_btn_telefonos" ||
    contieneAlgunaFrase(texto, [
      "telefonos y extensiones",
      "teléfonos y extensiones",
      "telefonos",
      "teléfonos",
      "extensiones",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "☎️ *TELÉFONOS Y EXTENSIONES*\n\n" +
        `• *Tel. principal:* ${TELEFONO_BASE}\n` +
        "• *Extensiones:*\n" +
        `   - Dirección General: ext. ${EXTENSIONES.direccion}\n` +
        `   - Control Escolar: ext. ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}\n` +
        `   - Jefes de Carrera: ext. ${EXTENSIONES.jefesCarrera}\n` +
        `   - Enfermería: ext. ${EXTENSIONES.enfermeria}\n` +
        `   - Caja: ext. ${EXTENSIONES.caja}\n` +
        `   - Servicio Social: ext. ${EXTENSIONES.servicioSocial}\n` +
        `   - Residencias: ext. ${EXTENSIONES.residencias}\n` +
        `   - División de Estudios: ext. ${EXTENSIONES.divisionEstudios}\n` +
        `   - Vinculación: ext. ${EXTENSIONES.vinculacion}\n\n` +
        `📞 *Número del bot para llamada normal:* ${TELEFONO_BOT_LLAMADAS}\n` +
        "📧 *Correo Dirección General:*\n" +
        "dir_itsmisantla@itsm.edu.mx\n\n" +
        "✨ Si deseas información más detallada selecciona *Especifico* en el menú.",
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "direccion general",
      "dirección general",
      "telefono de direccion",
      "teléfono de dirección",
      "telefono de direccion general",
      "teléfono de dirección general",
      "numero de direccion",
      "número de dirección",
      "numero de direccion general",
      "número de dirección general",
      "extension de direccion",
      "extensión de dirección",
      "extension de direccion general",
      "extensión de dirección general",
      "contacto de direccion",
      "contacto de dirección",
    ]) ||
    (contieneAlgunaFrase(texto, ["direccion", "dirección"]) &&
      solicitaTelefonoOExtension(texto))
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Dirección General",
        TELEFONO_BASE,
        EXTENSIONES.direccion,
        "• Correo: dir_itsmisantla@itsm.edu.mx"
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "control escolar",
      "servicios escolares",
      "telefono de control escolar",
      "teléfono de control escolar",
      "numero de control escolar",
      "número de control escolar",
      "telefono de servicios escolares",
      "teléfono de servicios escolares",
      "numero de servicios escolares",
      "número de servicios escolares",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "☎️ *CONTROL ESCOLAR / SERVICIOS ESCOLARES*\n\n" +
        `• *Teléfono:* ${TELEFONO_BASE}\n` +
        `• *Extensiones:* ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}`,
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "jefes de carrera",
      "jefe de carrera",
      "jefatura",
      "coordinacion academica",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Jefes de Carrera",
        TELEFONO_BASE,
        EXTENSIONES.jefesCarrera
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "enfermeria",
      "enfermería",
      "telefono de enfermeria",
      "teléfono de enfermería",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Enfermería",
        TELEFONO_BASE,
        EXTENSIONES.enfermeria
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, ["caja", "telefono de caja", "teléfono de caja"])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Caja",
        TELEFONO_BASE,
        EXTENSIONES.caja
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "servicio social",
      "telefono de servicio social",
      "teléfono de servicio social",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Servicio Social",
        TELEFONO_BASE,
        EXTENSIONES.servicioSocial
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "residencias",
      "residencia profesional",
      "telefono de residencias",
      "teléfono de residencias",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Residencias",
        TELEFONO_BASE,
        EXTENSIONES.residencias
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "division de estudios",
      "división de estudios",
      "telefono de division de estudios",
      "teléfono de división de estudios",
      "estudios profesionales",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "División de Estudios / Estudios Profesionales",
        TELEFONO_BASE,
        EXTENSIONES.divisionEstudios
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "vinculacion",
      "vinculación",
      "telefono de vinculacion",
      "teléfono de vinculación",
      "numero de vinculacion",
      "número de vinculación",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Vinculación",
        TELEFONO_BASE,
        EXTENSIONES.vinculacion
      ),
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "subdireccion academica",
      "subdirección académica",
      "telefono de subdireccion academica",
      "teléfono de subdirección académica",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje: mensajeTelefonoConExtension(
        "Subdirección Académica",
        TELEFONO_VIRTUAL,
        EXTENSIONES.subdireccionAcademica
      ),
    };
  }

  if (
    texto === "op_btn_ubicacion" ||
    contieneAlgunaFrase(texto, [
      "ubicacion del itsm",
      "ubicación del itsm",
      "ubicacion del instituto",
      "ubicación del instituto",
      "ubicacion",
      "ubicación",
      "donde esta",
      "dónde está",
      "donde queda",
      "dónde queda",
      "donde se ubica",
      "dónde se ubica",
      "como llegar",
      "cómo llegar",
      "mapa",
      "google maps",
      "direccion del instituto",
      "dirección del instituto",
      "direccion del tecnologico",
      "dirección del tecnológico",
      "direccion del tec",
      "dirección del tec",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "📍 *UBICACIÓN DEL INSTITUTO TECNOLÓGICO SUPERIOR DE MISANTLA*\n\n" +
        "• *Dirección:* Km. 1.8 Carretera a Loma del Cojolite\n" +
        "• *C.P.:* 93850\n" +
        "• *Ciudad:* Misantla, Veracruz, México\n\n" +
        "🗺️ *Google Maps*\n" +
        "https://maps.app.goo.gl/UYednfvUfUB2Ec1C9\n\n" +
        "🕒 *Horarios de atención*\n" +
        "• Lunes a viernes: 9:00 a 14:00 y de 15:00 a 17:00 horas\n" +
        "• Sábados: 9:00 a 14:00 horas\n\n" +
        "✨ Si deseas información más detallada selecciona *Especifico* en el menú.",
    };
  }

  if (
    texto === "op_btn_virtual" ||
    contieneAlgunaFrase(texto, [
      "educacion virtual tecnm",
      "educación virtual tecnm",
      "educacion virtual",
      "educación virtual",
      "virtual tecnm",
      "modalidad virtual",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "💻 *EDUCACIÓN VIRTUAL TECNM*\n\n" +
        "☎️ *Contacto*\n" +
        `• Teléfono: ${TELEFONO_VIRTUAL}\n` +
        `• Extensión: ${EXTENSIONES.subdireccionAcademica}\n` +
        "• Área: Subdirección Académica\n\n" +
        "🌐 *Enlace*\n" +
        "• virtual.tecnm.mx\n\n" +
        "📚 *Carreras disponibles en esta modalidad*\n" +
        "• Ingeniería Industrial\n" +
        "• Ingeniería en Sistemas Computacionales\n" +
        "• Ingeniería en Gestión Empresarial\n\n" +
        "✨ Si deseas información más detallada selecciona *Especifico* en el menú.",
    };
  }

  if (
    texto === "op_btn_regresatec" ||
    contieneAlgunaFrase(texto, ["regresatec", "regresa tec", "regresa"])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "🔁 *REGRESATEC*\n\n" +
        "☎️ *Contactos*\n" +
        `• Subdirección Académica: ${TELEFONO_VIRTUAL} ext. ${EXTENSIONES.subdireccionAcademica}\n` +
        `• Estudios Profesionales: ${TELEFONO_BASE} ext. ${EXTENSIONES.divisionEstudios}\n\n` +
        "✨ Si deseas información más detallada selecciona *Especifico* en el menú.",
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "pagos",
      "precios",
      "costos",
      "tramites",
      "trámites",
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "💳 *PAGOS*\n\n" +
        `Para pagos, favor de comunicarte con *Control Escolar* al teléfono ${TELEFONO_BASE} con extensión *${EXTENSIONES.controlEscolar1}* o *${EXTENSIONES.controlEscolar2}*.`,
    };
  }

  return null;
}

async function generarRespuestaIA(textoUsuario) {
  if (!ai) {
    return "No pude responder esa consulta en este momento.";
  }

  const prompt = `
Responde SOLO en español.
Nunca respondas en inglés.
Nunca menciones que eres una IA.
Nunca menciones nombres de modelos.
Nunca menciones documentos, archivos, enlaces internos, fuentes recuperadas ni herramientas.
Responde como asistente virtual institucional del Instituto Tecnológico Superior de Misantla.
Da respuestas directas, claras, útiles y breves.
Tolera abreviaturas como "info", "ing", "ing.", "sist", "tec", y faltas de ortografía comunes como "ingeneria" o falta de acentos.

Si preguntan por horarios, responde:
Lunes a viernes: 9:00 a 14:00 y de 15:00 a 17:00 horas.
Sábados: 9:00 a 14:00 horas.

Si preguntan por una carrera específica, responde con una descripción general, áreas que se trabajan y el contacto de Jefes de Carrera: ${TELEFONO_BASE} ext. ${EXTENSIONES.jefesCarrera}.
Si te preguntan por dirección institucional, ubicación o cómo llegar, incluye también el enlace de Google Maps.
Si te preguntan por número, teléfono, extensión o contacto de Dirección General, responde con el teléfono ${TELEFONO_BASE}, extensión ${EXTENSIONES.direccion}, y el correo dir_itsmisantla@itsm.edu.mx.
No confundas "número de dirección" o "teléfono de dirección" con ubicación física.
Si te preguntan por algún departamento o por servicios escolares, incluye el teléfono completo y la extensión correspondiente.
Si preguntan por pagos, responde que deben comunicarse con Control Escolar al teléfono ${TELEFONO_BASE}, extensiones ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}.
Si preguntan por Educación Virtual TECNM, incluye el teléfono ${TELEFONO_VIRTUAL} ext. ${EXTENSIONES.subdireccionAcademica}, el enlace virtual.tecnm.mx y las carreras disponibles.
Si preguntan por RegresaTec, incluye Subdirección Académica ${TELEFONO_VIRTUAL} ext. ${EXTENSIONES.subdireccionAcademica} y Estudios Profesionales ${TELEFONO_BASE} ext. ${EXTENSIONES.divisionEstudios}.
Si el usuario muestra molestia, frustración o solicita hablar con una persona, responde que su solicitud fue registrada, que en unos minutos será atendido por un representante real y que, si necesita una respuesta más rápida, puede realizar una llamada normal al ${TELEFONO_BOT_LLAMADAS}. No digas que escriba por WhatsApp a ese número.
No inventes datos.
No envíes al usuario al menú salvo que realmente no tengas respuesta.

DATOS INSTITUCIONALES CONFIRMADOS:
${CONTEXTO_INSTITUCIONAL}

CONSULTA DEL USUARIO:
${textoUsuario}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
      config: {
        temperature: 0.15,
        maxOutputTokens: 450,
      },
    });

    let texto = response.text?.trim();

    if (!texto) {
      return "No cuento con ese dato confirmado en este momento.";
    }

    texto = texto
      .replace(/gemini/gi, "")
      .replace(/drive/gi, "")
      .replace(/pdf/gi, "")
      .replace(/url context/gi, "")
      .replace(/source/gi, "")
      .replace(/sources/gi, "")
      .replace(/menu principal/gi, "")
      .trim();

    const frasesIngles = [
      "the website",
      "therefore",
      "however",
      "the address",
      "i will",
      "i do not have",
      "source",
      "retrieved",
      "mentions",
      "highly probable",
    ];

    const pareceIngles = frasesIngles.some((frase) =>
      texto.toLowerCase().includes(frase)
    );

    if (pareceIngles) {
      return "No cuento con ese dato confirmado en este momento.";
    }

    return texto;
  } catch (error) {
    console.error("===== ERROR MODO ESPECÍFICO =====");
    console.error("Mensaje:", error?.message);
    console.error("Objeto completo:", error);
    console.error("=================================");

    return "No pude responder esa consulta en este momento.";
  }
}

async function subirMediaWhatsApp(archivo) {
  const url = `https://graph.facebook.com/v25.0/${idNumeroTelefono}/media`;

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");

  const blob = new Blob([archivo.buffer], {
    type: archivo.mimetype,
  });

  formData.append("file", blob, archivo.originalname);

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
    },
    body: formData,
  });

  if (!respuesta.ok) {
    console.error("Error subiendo media:", await respuesta.text());
    return null;
  }

  const data = await respuesta.json();
  return data.id || null;
}

async function enviarArchivoWhatsApp(numeroDestino, archivo, caption = "") {
  try {
    const mediaId = await subirMediaWhatsApp(archivo);

    if (!mediaId) {
      return {
        ok: false,
        tipo: "",
        mediaId: "",
      };
    }

    const esImagen = archivo.mimetype.startsWith("image/");
    const tipo = esImagen ? "image" : "document";

    const url = `https://graph.facebook.com/v25.0/${idNumeroTelefono}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: tipo,
      [tipo]: esImagen
        ? {
            id: mediaId,
            caption,
          }
        : {
            id: mediaId,
            caption,
            filename: archivo.originalname,
          },
    };

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenWhatsapp}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!respuesta.ok) {
      console.error("Error enviando archivo:", await respuesta.text());
      return {
        ok: false,
        tipo,
        mediaId,
      };
    }

    return {
      ok: true,
      tipo,
      mediaId,
    };
  } catch (error) {
    console.error("Error enviando archivo:", error);

    return {
      ok: false,
      tipo: "",
      mediaId: "",
    };
  }
}

async function enviarTextoWhatsApp(numeroDestino, texto) {
  const url = `https://graph.facebook.com/v25.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "text",
    text: {
      body: texto,
    },
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    console.error("Error enviando texto:", await respuesta.text());
    return false;
  }

  return true;
}

async function enviarTexto(numeroDestino, texto) {
  const enviado = await enviarTextoWhatsApp(numeroDestino, texto);

  if (!enviado) return;

  await guardarMensaje(numeroDestino, "bot", "text", texto);
}

async function enviarImagen(numeroDestino, imageUrl, caption = "") {
  const url = `https://graph.facebook.com/v25.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "image",
    image: {
      link: imageUrl,
      caption,
    },
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    console.error("Error enviando imagen:", await respuesta.text());
    return;
  }

  await guardarMensaje(
    numeroDestino,
    "bot",
    "image",
    caption || "Imagen enviada",
    { imageUrl }
  );
}

app.listen(puerto, () => {
  console.log(`Servidor activo en http://localhost:${puerto}/webhook`);
});