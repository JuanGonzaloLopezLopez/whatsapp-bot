import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

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

const sesiones = new Map();

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const URL_IMAGEN_FICHAS =
  "https://drive.google.com/uc?export=view&id=1HEHavShxvnpORxW5AbazRHzDMuTQbHUY";

if (!tokenVerificacion || !tokenWhatsapp || !idNumeroTelefono) {
  console.error("Faltan variables de entorno obligatorias.");
  process.exit(1);
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
    await enviarTexto(
      numeroCliente,
      "Por ahora solo puedo atender mensajes de texto o respuestas del menú."
    );
    return;
  }

  const textoNormalizado = normalizarTexto(textoRecibido);
  const sesionActual = obtenerSesion(numeroCliente);

  const respuestaFija = construirRespuestaFija(textoNormalizado, sesionActual);

  if (respuestaFija) {
    if (respuestaFija.nuevoEstado) {
      sesiones.set(numeroCliente, {
        ...sesionActual,
        estado: respuestaFija.nuevoEstado,
        actualizadaEn: Date.now(),
      });
    }

    if (respuestaFija.tipo === "texto") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
    } else if (respuestaFija.tipo === "botones") {
      await enviarBotones(numeroCliente, respuestaFija.mensaje, respuestaFija.botones);
    } else if (respuestaFija.tipo === "imagen") {
      await enviarImagen(numeroCliente, respuestaFija.imageUrl, respuestaFija.mensaje);
    }

    return;
  }

  const respuestaIA = await generarRespuestaIA(textoRecibido);
  await enviarTexto(numeroCliente, respuestaIA);
}

function obtenerSesion(numeroCliente) {
  const sesion = sesiones.get(numeroCliente);

  if (!sesion) {
    return {
      estado: "inicio",
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

function construirRespuestaFija(texto, sesion) {
  if (texto === "hola" || texto === "menu" || texto === "menú" || sesion.estado === "inicio") {
    return {
      tipo: "botones",
      mensaje:
        "Hola, soy el asistente virtual del Instituto Tecnológico Superior de Misantla. Elige una opción o escribe tu duda.",
      nuevoEstado: "menu_principal",
      botones: [
        { id: "carreras", titulo: "Carreras" },
        { id: "examen", titulo: "Examen" },
        { id: "requisitos", titulo: "Requisitos" },
      ],
    };
  }

  if (contieneAlgunaFrase(texto, ["carreras", "que carreras hay", "qué carreras hay", "carreras disponibles", "cuantas carreras hay", "cuántas carreras hay"])) {
    return {
      tipo: "texto",
      mensaje:
        "Actualmente hay 10 carreras disponibles.\n\n" +
        "Modalidad escolarizada:\n" +
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
        "Modalidad no escolarizada/virtual:\n" +
        "• Ingeniería Industrial\n" +
        "• Ingeniería en Sistemas Computacionales\n" +
        "• Ingeniería en Gestión Empresarial\n\n" +
        "Además, se anuncian 3 maestrías y 1 doctorado."
    };
  }

  if (contieneAlgunaFrase(texto, ["modalidades", "modalidad", "escolarizada", "virtual", "no escolarizada"])) {
    return {
      tipo: "texto",
      mensaje:
        "Hay dos modalidades de ingreso:\n" +
        "• Escolarizada\n" +
        "• No escolarizada / virtual\n\n" +
        "La modalidad no escolarizada/virtual ofrece:\n" +
        "• Ingeniería Industrial\n" +
        "• Ingeniería en Sistemas Computacionales\n" +
        "• Ingeniería en Gestión Empresarial"
    };
  }

  if (contieneAlgunaFrase(texto, ["examen", "cuando es el examen", "cuándo es el examen", "fecha del examen", "admision", "admisión"])) {
    return {
      tipo: "texto",
      mensaje:
        "El examen de admisión está programado para el 3 de julio de 2026 y se realizará en línea."
    };
  }

  if (contieneAlgunaFrase(texto, ["resultados", "cuando salen resultados", "cuándo salen resultados"])) {
    return {
      tipo: "texto",
      mensaje:
        "La publicación de resultados será el 8 de julio de 2026 en la página oficial:\nhttps://misantla.tecnm.mx/"
    };
  }

  if (contieneAlgunaFrase(texto, ["ficha", "fichas", "costo de ficha", "inscripcion", "inscripción", "reinscripcion", "reinscripción"])) {
    return {
      tipo: "texto",
      mensaje:
        "La ficha, el proceso de admisión, la inscripción y la reinscripción son gratuitos."
    };
  }

  if (contieneAlgunaFrase(texto, ["requisitos", "documentos", "que piden", "qué piden", "papeles"])) {
    return {
      tipo: "texto",
      mensaje:
        "Requisitos principales:\n" +
        "• CURP\n" +
        "• Certificado de estudios de bachillerato o constancia de conclusión\n" +
        "• Acta de nacimiento\n" +
        "• Carta de buena conducta\n" +
        "• Examen de tipo sanguíneo\n" +
        "• Constancia de vigencia de derechos del IMSS\n\n" +
        "En la imagen informativa también se menciona certificado o constancia de bachillerato con calificaciones."
    };
  }

  if (contieneAlgunaFrase(texto, ["horario", "horarios", "atencion", "atención"])) {
    return {
      tipo: "texto",
      mensaje:
        "Horarios de atención:\n" +
        "• Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.\n" +
        "• Sábados: 9:00 a.m. a 3:00 p.m."
    };
  }

  if (contieneAlgunaFrase(texto, ["telefono", "teléfono", "telefonos", "teléfonos", "contacto", "extensiones"])) {
    return {
      tipo: "texto",
      mensaje:
        "Contacto:\n" +
        "• Tel. (235) 323-15-45\n" +
        "• Ext. 129 y 149\n" +
        "• WhatsApp: 235 101 07 97\n\n" +
        "Extensiones adicionales:\n" +
        "• Dirección: 158\n" +
        "• Control Escolar: 129 o 149\n" +
        "• Jefes de Carrera: 134\n" +
        "• Enfermería: 138\n" +
        "• Caja: 129\n" +
        "• Servicio Social: 177\n" +
        "• Residencias: 101\n" +
        "• División de Estudios: 166"
    };
  }

  if (contieneAlgunaFrase(texto, ["ubicacion", "ubicación", "direccion", "dirección", "donde estan", "donde se ubican", "mapa"])) {
    return {
      tipo: "texto",
      mensaje:
        "Ubicación:\n" +
        "Km. 1.8 Carretera a Loma del Cojolite,\n" +
        "C.P. 93821 Misantla, Veracruz, México.\n\n" +
        "Google Maps:\n" +
        "https://maps.app.goo.gl/UYednfvUfUB2Ec1C9"
    };
  }

  if (contieneAlgunaFrase(texto, ["convocatoria", "imagen", "fichas 2026", "admision 2026", "admisión 2026"])) {
    return {
      tipo: "imagen",
      imageUrl: URL_IMAGEN_FICHAS,
      mensaje: "Te comparto la imagen informativa de fichas de admisión 2026.",
    };
  }

  if (contieneAlgunaFrase(texto, ["curso propedeutico", "curso propedéutico", "propedeutico", "propedéutico"])) {
    return {
      tipo: "texto",
      mensaje:
        "Curso propedéutico:\n" +
        "• Modalidad escolarizada: del 3 al 7 de agosto de 2026\n" +
        "• Modalidad no escolarizada/virtual: 8 de agosto de 2026"
    };
  }

  if (contieneAlgunaFrase(texto, ["inicio de clases", "cuando inician clases", "cuándo inician clases"])) {
    return {
      tipo: "texto",
      mensaje:
        "Inicio de clases:\n" +
        "• Escolarizada: 17 de agosto de 2026\n" +
        "• No escolarizada/virtual: 22 de agosto de 2026"
    };
  }

  if (contieneAlgunaFrase(texto, ["registro en el sistema", "nip", "numero de control", "número de control"])) {
    return {
      tipo: "texto",
      mensaje:
        "Registro en el sistema:\n" +
        "• Escolarizada: del 1 al 4 de septiembre de 2026\n" +
        "• No escolarizada/virtual: 5 de septiembre de 2026\n\n" +
        "Después se entrega la carga académica, número de control y NIP."
    };
  }

  if (contieneAlgunaFrase(texto, ["idiomas", "ingles", "inglés", "frances", "francés", "curso de ingles", "curso de inglés"])) {
    return {
      tipo: "texto",
      mensaje:
        "Pagos de idiomas y cursos:\n" +
        "• Curso de Francés 60 hrs Alumno Externo (Foráneo): $933.00\n" +
        "• Curso de Francés 60 hrs: Gratuito\n" +
        "• Curso de Inglés 60 hrs Alumno Externo (Foráneo): $933.00\n" +
        "• Cédula para curso de idiomas: $732.00\n" +
        "• Curso intensivo de Inglés: $732.00\n" +
        "• Examen de Inglés: $622.00\n" +
        "• Certificado de Inglés: $368.00\n" +
        "• Certificado de Inglés grado Maestría: $1,037.00"
    };
  }

  if (contieneAlgunaFrase(texto, ["constancia", "credencial", "seguro", "carga academica", "carga académica", "tramite", "trámite"])) {
    return {
      tipo: "texto",
      mensaje:
        "Algunos trámites escolares:\n" +
        "• Carga académica: $118.00\n" +
        "• Duplicado de carga académica: $122.00\n" +
        "• Seguro contra accidentes y de vida: $70.00\n" +
        "• Expedición de credencial: $122.00\n" +
        "• Duplicado de credencial: $122.00\n" +
        "• Constancia de estudios: $61.00\n" +
        "• Constancia con calificaciones: $61.00\n" +
        "• Constancia de buena conducta: $122.00\n\n" +
        "Si deseas, escribe el nombre exacto del trámite."
    };
  }

  return null;
}

async function generarRespuestaIA(textoUsuario) {
  if (!ai) {
    return "En este momento el asistente inteligente no está disponible. Escribe *menu* para ver las opciones.";
  }

  try {
    const promptSistema =
      "Eres un asistente virtual del Instituto Tecnológico Superior de Misantla. " +
      "Responde en español, de forma breve, clara y amable. " +
      "Solo debes orientar sobre admisión, carreras, requisitos, horarios, trámites y contacto institucional. " +
      "No inventes datos oficiales como fechas, costos, carreras, requisitos, ubicaciones o teléfonos. " +
      "Si no sabes algo con certeza, di que no tienes el dato confirmado y sugiere comunicarse al 235 323 1545 ext. 129 o 149. " +
      "No uses markdown complejo ni respuestas demasiado largas.";

    const respuesta = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `${promptSistema}\n\n` +
                `Pregunta del usuario: ${textoUsuario}`
            }
          ]
        }
      ]
    });

    const texto = respuesta.text?.trim();

    if (!texto) {
      return "No pude generar una respuesta en este momento. Escribe *menu* para ver las opciones.";
    }

    return texto;
  } catch (error) {
    console.error("Error con Gemini:", error);
    return "En este momento no pude responder con inteligencia artificial. Escribe *menu* para ver las opciones.";
  }
}

async function enviarTexto(numeroDestino, texto) {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "text",
    text: {
      body: texto
    }
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!respuesta.ok) {
    console.error("Error enviando texto:", await respuesta.text());
  }
}

async function enviarBotones(numeroDestino, texto, botones) {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: texto
      },
      action: {
        buttons: botones.slice(0, 3).map((boton) => ({
          type: "reply",
          reply: {
            id: boton.id,
            title: boton.titulo
          }
        }))
      }
    }
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!respuesta.ok) {
    console.error("Error enviando botones:", await respuesta.text());
  }
}

async function enviarImagen(numeroDestino, imageUrl, caption = "") {
  const url = `https://graph.facebook.com/v22.0/${idNumeroTelefono}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: numeroDestino,
    type: "image",
    image: {
      link: imageUrl,
      caption
    }
  };

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWhatsapp}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!respuesta.ok) {
    console.error("Error enviando imagen:", await respuesta.text());
  }
}

app.listen(puerto, () => {
  console.log(`Servidor activo en http://localhost:${puerto}/webhook`);
});