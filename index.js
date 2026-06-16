import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
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

const puerto = Number(process.env.PORT || 3000);
const tokenVerificacion = process.env.VERIFY_TOKEN;
const tokenWhatsapp = process.env.WHATSAPP_TOKEN;
const idNumeroTelefono = process.env.PHONE_NUMBER_ID;
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
  "https://drive.google.com/uc?export=view&id=1-qvuauPg0j_IrR0Z22qJXIdwZUgTlBBy";

const URL_IMAGEN_FICHAS =
  "https://drive.google.com/uc?export=view&id=1dyTu7SGPCvfUbBAjHMkFjn-ZleWQrTFW";

const TELEFONO_BASE = "(235) 323-15-45";
const TELEFONO_VIRTUAL = "(235) 323-25-45";

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
WhatsApp: 235 101 07 97

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

CARRERAS DE LICENCIATURA:
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

// Easter eggs discretos
const _e1 = "Q2hhcmxpZSBDaGFybGllIEtpcmt5IPCfl6PvuI/wn5Sl";
const _v1 =
  "aHR0cHM6Ly9kcml2ZS5nb29nbGUuY29tL3VjP2V4cG9ydD1kb3dubG9hZCZpZD0xekxMT1NaRU5RNnlzTEZac2J3ZEJ2V09DclN6bGlyX2k=";

const _e2 = "UXVpZXJlcyB2ZW5pciBhIG1pIGlzbGE/";
const _e3 = "UXVpZXJlcyB2ZW5pciBhIG1pIGZpZXN0YT8=";
const _v2 =
  "aHR0cHM6Ly9kcml2ZS5nb29nbGUuY29tL3VjP2V4cG9ydD1kb3dubG9hZCZpZD0xRGtucGRGUWxMdkM1TE5Kd3h3ZkRUNEVRZ09PdTN0YkM=";

const _e4 = "V2UgYXJlIENoYXJsaWUgS2lyayAg8J+Xo++4j/CflKU=";
const _e5 = "V2UgYXJlIENoYXJsaWUgS2lyaw==";
const _v3 =
  "aHR0cHM6Ly9kcml2ZS5nb29nbGUuY29tL3VjP2V4cG9ydD1kb3dubG9hZCZpZD0xdzBmOGlNWGdQblMwUmdmcEVTRy1RU0xyVDZwelNWU3o=";

function _x(valor) {
  return Buffer.from(valor, "base64").toString("utf8");
}

if (!tokenVerificacion || !tokenWhatsapp || !idNumeroTelefono) {
  console.error("Faltan variables de entorno obligatorias.");
  process.exit(1);
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

    const lista = Object.values(data).map((conv) => {
      const mensajesObj = conv.mensajes || {};

      const mensajes = Object.values(mensajesObj).sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

      return {
        numero: conv.numero || "",
        creadoEn: conv.creadoEn || "",
        actualizadoEn: conv.actualizadoEn || "",
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

app.get("/panel", validarAdmin, (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Panel de conversaciones</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f0f2f5;
      color: #111827;
    }

    header {
      background: #075e54;
      color: white;
      padding: 14px 20px;
      font-size: 20px;
      font-weight: bold;
    }

    .contenedor {
      display: grid;
      grid-template-columns: 340px 1fr;
      height: calc(100vh - 56px);
    }

    .lista {
      background: white;
      border-right: 1px solid #ddd;
      overflow-y: auto;
    }

    .buscador {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .buscador input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      outline: none;
    }

    .contacto {
      padding: 13px 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }

    .contacto:hover {
      background: #f5f5f5;
    }

    .contacto.activo {
      background: #e7f3ef;
    }

    .numero {
      font-weight: bold;
      margin-bottom: 5px;
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

    .chat {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-header {
      background: white;
      padding: 14px 18px;
      border-bottom: 1px solid #ddd;
      font-weight: bold;
    }

    .mensajes {
      flex: 1;
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

    .acciones {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
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

    .acciones button:hover {
      background: #064c44;
    }

    @media (max-width: 800px) {
      .contenedor {
        grid-template-columns: 1fr;
      }

      .lista {
        height: 40vh;
        border-right: none;
        border-bottom: 1px solid #ddd;
      }

      .chat {
        height: calc(60vh - 56px);
      }
    }
  </style>
</head>
<body>
  <header>Panel de conversaciones del bot</header>

  <div class="contenedor">
    <section class="lista">
      <div class="buscador">
        <input id="buscar" type="text" placeholder="Buscar número..." />
      </div>

      <div class="acciones">
        <button onclick="cargarConversaciones()">Actualizar</button>
      </div>

      <div id="contactos"></div>
    </section>

    <section class="chat">
      <div id="chatHeader" class="chat-header">Selecciona una conversación</div>
      <div id="mensajes" class="mensajes">
        <div class="vacio">Aquí aparecerán los mensajes recibidos y enviados por el bot.</div>
      </div>
    </section>
  </div>

  <script>
    let conversaciones = [];
    let seleccionado = null;

    const contactosDiv = document.getElementById("contactos");
    const mensajesDiv = document.getElementById("mensajes");
    const chatHeader = document.getElementById("chatHeader");
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

    async function cargarConversaciones() {
      try {
        const res = await fetch("/api/conversaciones");
        conversaciones = await res.json();

        renderContactos();

        if (seleccionado) {
          const actual = conversaciones.find(c => c.numero === seleccionado);
          if (actual) renderMensajes(actual);
        }
      } catch (error) {
        console.error(error);
        contactosDiv.innerHTML = '<div class="vacio">No se pudieron cargar las conversaciones.</div>';
      }
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
        div.className = "contacto" + (conv.numero === seleccionado ? " activo" : "");

        const numero = document.createElement("div");
        numero.className = "numero";
        numero.textContent = conv.numero;

        const ultimoDiv = document.createElement("div");
        ultimoDiv.className = "ultimo";
        ultimoDiv.textContent = ultimo
          ? (ultimo.origen === "bot" ? "Bot: " : "Usuario: ") + limpiarTexto(ultimo.contenido)
          : "Sin mensajes";

        const fecha = document.createElement("div");
        fecha.className = "fecha";
        fecha.textContent = fechaBonita(conv.actualizadoEn);

        div.appendChild(numero);
        div.appendChild(ultimoDiv);
        div.appendChild(fecha);

        div.addEventListener("click", () => {
          seleccionado = conv.numero;
          renderContactos();
          renderMensajes(conv);
        });

        contactosDiv.appendChild(div);
      });
    }

    function renderMensajes(conv) {
      chatHeader.textContent = "Conversación con " + conv.numero;
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
        burbuja.className = "burbuja " + (msg.origen === "bot" ? "bot" : "usuario");

        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = msg.origen === "bot" ? "Bot" : "Usuario";

        const contenido = document.createElement("div");

        if (msg.tipo === "image" && msg.extra?.imageUrl) {
          contenido.textContent = limpiarTexto(msg.contenido) + "\\n" + msg.extra.imageUrl;
        } else if (msg.tipo === "video" && msg.extra?.videoUrl) {
          contenido.textContent = limpiarTexto(msg.contenido) + "\\n" + msg.extra.videoUrl;
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

  if (tipo === "text") {
    textoRecibido = (mensaje.text?.body || "").trim();
  } else if (tipo === "interactive") {
    textoRecibido =
      mensaje.interactive?.button_reply?.id ||
      mensaje.interactive?.list_reply?.id ||
      "";
  } else {
    await guardarMensaje(
      numeroCliente,
      "usuario",
      tipo,
      `Mensaje recibido de tipo: ${tipo}`
    );

    await enviarTexto(
      numeroCliente,
      "⚠️ *Por ahora solo puedo atender mensajes de texto o respuestas del menú.*"
    );
    return;
  }

  await guardarMensaje(numeroCliente, "usuario", tipo, textoRecibido);

  const exacto = (textoRecibido || "").trim();
  const mapaSecreto = {
    [_x(_e1)]: _x(_v1),
    [_x(_e2)]: _x(_v2),
    [_x(_e3)]: _x(_v2),
    [_x(_e4)]: _x(_v3),
    [_x(_e5)]: _x(_v3),
  };

  if (Object.prototype.hasOwnProperty.call(mapaSecreto, exacto)) {
    await enviarVideo(numeroCliente, mapaSecreto[exacto]);
    return;
  }

  const textoNormalizado = normalizarTexto(textoRecibido);
  const sesionActual = obtenerSesion(numeroCliente);

  if (textoNormalizado === "especifico") {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: true,
      actualizadaEn: Date.now(),
    });

    await enviarTexto(
      numeroCliente,
      "✅ *Modo específico activado*\n\n" +
        "Ahora puedes hacer preguntas más detalladas.\n\n" +
        "📝 *Para salir de este modo escribe* *menu* *o* *salir*."
    );
    return;
  }

  if (textoNormalizado === "salir") {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: false,
      estado: "menu_principal",
      actualizadaEn: Date.now(),
    });

    await enviarMenuPrincipal(numeroCliente);
    return;
  }

  const sesionRefrescada = obtenerSesion(numeroCliente);

  if (sesionRefrescada.modoEspecifico) {
    const respuestaIA = await generarRespuestaIA(textoRecibido);
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
    } else if (respuestaFija.tipo === "texto_e_imagen") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
      await enviarImagen(
        numeroCliente,
        respuestaFija.imageUrl,
        respuestaFija.caption || ""
      );
    }
    return;
  }

  await enviarTexto(
    numeroCliente,
    "❓ *No encontré una respuesta fija para esa duda.*\n\n" +
      'Escribe *menu* para ver el menú principal o *Especifico* para hacer una consulta más detallada.'
  );
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
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneAlgunaFrase(texto, frases) {
  return frases.some((frase) => texto.includes(frase));
}

function esSaludoOInicio(texto) {
  const frasesSaludo = [
    "menu",
    "menú",
    "inicio",
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
    "informes"
  ];

  return frasesSaludo.some((frase) => texto.includes(frase));
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

async function enviarMenuPrincipal(numeroDestino) {
  await enviarLista(numeroDestino);

  await enviarTexto(
    numeroDestino,
    "📌 *También puedes escribir directamente una opción del menú.*\n\n" +
      'Si deseas información más detallada escribe *"Especifico"*.'
  );
}

async function enviarLista(numeroDestino) {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

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
        text: 'Para consultas más detalladas escribe "Especifico".',
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
                title: "Educación Virtual TECNM",
                description: "Modalidad virtual y carreras",
              },
              {
                id: "op_btn_regresatec",
                title: "RegresaTec",
                description: "Información y contacto",
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
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
      imageUrl: URL_IMAGEN_FICHAS,
      caption: "📝 Fichas de admisión",
    };
  }

  if (
    texto === "op_btn_oferta" ||
    contieneAlgunaFrase(texto, [
      "oferta educativa",
      "carreras",
      "carrera",
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
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
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
        '✨ *Si deseas información más detallada escribe "Especifico".*',
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
        "📲 *WhatsApp:* 235 101 07 97\n" +
        "📧 *Correo Dirección General:*\n" +
        "dir_itsmisantla@itsm.edu.mx\n\n" +
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
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
      "direccion",
      "dirección",
      "mapa",
      "google maps",
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
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
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
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
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
        '✨ Si deseas información más detallada escribe *"Especifico"*.',
    };
  }

  if (
    contieneAlgunaFrase(texto, [
      "direccion general",
      "telefono de direccion",
      "teléfono de dirección",
      "numero de direccion",
      "número de dirección",
      "extension de direccion",
      "extensión de dirección",
    ])
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
    return "En este momento no puedo responder esa consulta. Intenta más tarde o escribe *menu*.";
  }

  const prompt = `
Responde SOLO en español.
Nunca respondas en inglés.
Nunca menciones que eres una IA.
Nunca menciones nombres de modelos.
Nunca menciones documentos, archivos, enlaces internos, fuentes recuperadas ni herramientas.
Responde como asistente virtual institucional del Instituto Tecnológico Superior de Misantla.
Da respuestas directas, claras, útiles y breves.
Si te preguntan por dirección, incluye también el enlace de Google Maps.
Si te preguntan por horarios, responde con los horarios exactos.
Si te preguntan por algún departamento o por servicios escolares, incluye el teléfono completo y la extensión correspondiente.
Si preguntan por pagos, responde que deben comunicarse con Control Escolar al teléfono ${TELEFONO_BASE}, extensiones ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}.
Si preguntan por Educación Virtual TECNM, incluye el teléfono ${TELEFONO_VIRTUAL} ext. ${EXTENSIONES.subdireccionAcademica}, el enlace virtual.tecnm.mx y las carreras disponibles.
Si preguntan por RegresaTec, incluye Subdirección Académica ${TELEFONO_VIRTUAL} ext. ${EXTENSIONES.subdireccionAcademica} y Estudios Profesionales ${TELEFONO_BASE} ext. ${EXTENSIONES.divisionEstudios}.
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
      return `No cuento con ese dato confirmado en este momento. Para mayor información, puedes comunicarte al ${TELEFONO_BASE} ext. ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}.`;
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
      return `No cuento con ese dato confirmado en este momento. Para mayor información, puedes comunicarte al ${TELEFONO_BASE} ext. ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}.`;
    }

    return texto;
  } catch (error) {
    console.error("===== ERROR MODO ESPECÍFICO =====");
    console.error("Mensaje:", error?.message);
    console.error("Objeto completo:", error);
    console.error("=================================");

    return `No pude responder esa consulta en este momento. Intenta de nuevo en unos segundos o comunícate al ${TELEFONO_BASE} ext. ${EXTENSIONES.controlEscolar1} o ${EXTENSIONES.controlEscolar2}.`;
  }
}

async function enviarTexto(numeroDestino, texto) {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

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
    return;
  }

  await guardarMensaje(numeroDestino, "bot", "text", texto);
}

async function enviarImagen(numeroDestino, imageUrl, caption = "") {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

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

  await guardarMensaje(numeroDestino, "bot", "image", caption || "Imagen enviada", {
    imageUrl,
  });
}

async function enviarVideo(numeroDestino, videoUrl, caption = "") {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "video",
    video: {
      link: videoUrl,
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
    const detalle = await respuesta.text();
    console.error("Error enviando video:", detalle);
    await enviarTexto(numeroDestino, videoUrl);
    return;
  }

  await guardarMensaje(numeroDestino, "bot", "video", caption || "Video enviado", {
    videoUrl,
  });
}

app.listen(puerto, () => {
  console.log(`Servidor activo en http://localhost:${puerto}/webhook`);
});