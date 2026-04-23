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

// URL directa de la imagen
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

  // Activar modo específico
  if (textoNormalizado === "especifico") {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: true,
      actualizadaEn: Date.now(),
    });

    await enviarTexto(
      numeroCliente,
      "✅ *Modo Especifico activado*\n\nAhora puedes hacer preguntas más detalladas, por ejemplo:\n• costos de trámites\n• titulación maestría\n• constancias\n• certificaciones\n• dudas específicas del proceso\n\nPara volver al menú principal escribe *menu*."
    );
    return;
  }

  // Regresar al menú y apagar modo específico
  if (
    textoNormalizado === "menu" ||
    textoNormalizado === "menú" ||
    textoNormalizado === "hola" ||
    textoNormalizado === "inicio"
  ) {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      modoEspecifico: false,
      estado: "menu_principal",
      actualizadaEn: Date.now(),
    });

    await enviarBotones(
      numeroCliente,
      "Hola, soy el asistente virtual del Instituto Tecnológico Superior de Misantla.\nSelecciona una opción:",
      [
        { id: "carreras", titulo: "Carreras" },
        { id: "examen", titulo: "Examen" },
        { id: "direccion_it", titulo: "Dirección" },
      ]
    );

    // Mandamos el cuarto botón como texto guía porque WhatsApp solo permite 3 botones interactivos
    await enviarTexto(
      numeroCliente,
      "También puedes escribir:\n*Telefonos de contacto*\n\nY si deseas recibir información más específica escribe *Especifico*."
    );
    return;
  }

  const sesionActualizada = obtenerSesion(numeroCliente);

  // Si el usuario activó "Especifico", usar Gemini
  if (sesionActualizada.modoEspecifico) {
    console.log("Entrando a Gemini con:", textoRecibido);
    const respuestaIA = await generarRespuestaIA(textoRecibido);
    await enviarTexto(numeroCliente, respuestaIA);
    return;
  }

  const respuestaFija = construirRespuestaFija(textoNormalizado);

  if (respuestaFija) {
    if (respuestaFija.tipo === "texto") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
    } else if (respuestaFija.tipo === "botones") {
      await enviarBotones(numeroCliente, respuestaFija.mensaje, respuestaFija.botones);
    } else if (respuestaFija.tipo === "imagen") {
      await enviarImagen(numeroCliente, respuestaFija.imageUrl, respuestaFija.mensaje);
    } else if (respuestaFija.tipo === "texto_e_imagen") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
      await enviarImagen(numeroCliente, respuestaFija.imageUrl, respuestaFija.caption || "");
    }
    return;
  }

  // Si no coincide en modo normal, sugerir específico
  await enviarTexto(
    numeroCliente,
    'No encontré una respuesta fija para esa duda.\n\nSi deseas recibir información más específica escribe *"Especifico"*.'
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

function construirRespuestaFija(texto) {
  // 1. Carreras
  if (
    contieneAlgunaFrase(texto, [
      "carreras",
      "carrera",
      "que carreras hay",
      "qué carreras hay",
      "carreras disponibles",
      "carreras del itsm",
      "carreras del tecnologico",
      "carreras del tecnológico",
      "posgrados",
      "maestrias",
      "maestrías",
      "doctorado"
    ])
  ) {
    return {
      tipo: "texto_e_imagen",
      mensaje:
        "📘 *Oferta educativa del ITS Misantla*\n\n" +
        "*Carreras de licenciatura:*\n" +
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
        "*Posgrados:*\n" +
        "• Maestría en Ingeniería Industrial\n" +
        "• Maestría en Sistemas Computacionales\n" +
        "• Maestría en Ciencias de la Ingeniería\n" +
        "• Doctorado en Ciencias de la Ingeniería\n\n" +
        'Si deseas recibir información más específica escribe *"Especifico"*.',
      imageUrl: URL_IMAGEN_FICHAS,
      caption: "Imagen informativa de fichas de admisión 2026"
    };
  }

  // 2. Examen
  if (
    contieneAlgunaFrase(texto, [
      "examen",
      "fecha del examen",
      "cuando es el examen",
      "cuándo es el examen",
      "evaluacion diagnostica",
      "evaluación diagnóstica",
      "admision",
      "admisión",
      "requisitos",
      "documentos",
      "inscripcion",
      "inscripción",
      "ficha",
      "fichas"
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "📝 *Proceso de admisión y examen*\n\n" +
        "*El proceso de admisión es gratuito.*\n" +
        "La ficha, inscripción y reinscripción son gratuitas.\n\n" +
        "*Fecha de evaluación diagnóstica / examen de admisión:*\n" +
        "• 3 de julio de 2026\n" +
        "• Se realiza en línea\n\n" +
        "*Publicación de resultados:*\n" +
        "• 8 de julio de 2026\n\n" +
        "*Documentos y requisitos principales:*\n" +
        "• CURP\n" +
        "• Certificado de bachillerato o constancia de conclusión\n" +
        "• Acta de nacimiento\n" +
        "• Carta de buena conducta\n" +
        "• Examen de tipo sanguíneo\n" +
        "• Constancia de vigencia de derechos del IMSS\n\n" +
        'Si deseas recibir información más específica escribe *"Especifico"*.'
    };
  }

  // 3. Dirección del tecnológico
  if (
    contieneAlgunaFrase(texto, [
      "direccion del tecnologico",
      "dirección del tecnológico",
      "direccion del instituto",
      "dirección del instituto",
      "ubicacion",
      "ubicación",
      "donde estan",
      "donde se ubican",
      "mapa",
      "domicilio"
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "📍 *Dirección del Instituto Tecnológico Superior de Misantla*\n\n" +
        "Km. 1.8 Carretera a Loma del Cojolite\n" +
        "C.P. 93821, Misantla, Veracruz, México\n\n" +
        "*Horarios de atención:*\n" +
        "• Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.\n" +
        "• Sábados: 9:00 a.m. a 3:00 p.m.\n\n" +
        "*Google Maps:*\n" +
        "https://maps.app.goo.gl/UYednfvUfUB2Ec1C9\n\n" +
        'Si deseas recibir información más específica escribe *"Especifico"*.'
    };
  }

  // 4. Teléfonos de contacto
  if (
    contieneAlgunaFrase(texto, [
      "telefonos de contacto",
      "teléfonos de contacto",
      "telefonos",
      "teléfonos",
      "contacto",
      "extensiones",
      "numero de control escolar",
      "número de control escolar",
      "telefono de direccion",
      "teléfono de dirección"
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "☎️ *Teléfonos y contactos*\n\n" +
        "• Tel. principal: (235) 323-15-45\n" +
        "• WhatsApp: 235 101 07 97\n\n" +
        "*Extensiones:*\n" +
        "• Dirección: 158\n" +
        "• Control Escolar: 129 o 149\n" +
        "• Jefes de Carrera: 134\n" +
        "• Enfermería: 138\n" +
        "• Caja: 129\n" +
        "• Servicio Social: 177\n" +
        "• Residencias: 101\n" +
        "• División de Estudios: 166\n\n" +
        'Si deseas recibir información más específica escribe *"Especifico"*.'
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
      "Solo debes orientar sobre admisión, carreras, posgrados, requisitos, trámites, costos, horarios y contacto institucional. " +
      "No inventes datos oficiales como fechas, teléfonos, requisitos o costos que no hayan sido confirmados. " +
      "Si no tienes certeza, indica que el usuario debe comunicarse al 235 323 1545 ext. 129 o 149. " +
      "No uses markdown complejo. " +
      "Puedes responder dudas más específicas como precios, constancias, titulación, certificaciones, idiomas y otros trámites.";

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
      return 'No pude generar una respuesta en este momento. Escribe *menu* o *"Especifico"* nuevamente.';
    }

    return texto;
  } catch (error) {
    console.error("Error con Gemini:", error);
    return 'En este momento no pude responder con inteligencia artificial. Intenta de nuevo o escribe *menu*.';
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