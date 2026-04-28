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

// URLs públicas de apoyo para el modo específico
const URLS_CONTEXTO = [
  "https://misantla.tecnm.mx/",
  "https://misantla.tecnm.mx/pagos/",
  "https://drive.google.com/file/d/1nx54poSfildRdQmzhBdaW_fMyKfn5oZH/view?usp=sharing",
  "https://drive.google.com/file/d/1itd0d2_SjbVyr0gUWBAPSxRYmJR6J2o5/view?usp=sharing",
  "https://drive.google.com/file/d/1iIX6iNG-aCGl7dUh_UCjwBxuNmWLZV8y/view?usp=sharing",
];

// Base institucional para respuestas consistentes
const CONTEXTO_INSTITUCIONAL = `
INSTITUCIÓN:
Instituto Tecnológico Superior de Misantla.

UBICACIÓN:
Km. 1.8 Carretera a Loma del Cojolite, C.P. 93821, Misantla, Veracruz, México.

GOOGLE MAPS:
https://maps.app.goo.gl/UYednfvUfUB2Ec1C9

HORARIOS DE ATENCIÓN:
Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.
Sábados: 9:00 a.m. a 3:00 p.m.

TELÉFONOS:
Tel. principal: (235) 323-15-45
WhatsApp: 235 101 07 97

EXTENSIONES:
Dirección: 158
Control Escolar: 129 o 149
Jefes de Carrera: 134
Enfermería: 138
Caja: 129
Servicio Social: 177
Residencias: 101
División de Estudios: 166

CARRERAS DE LICENCIATURA:
1. Ingeniería Industrial
2. Ingeniería en Sistemas Computacionales
3. Ingeniería Electromecánica
4. Ingeniería Bioquímica
5. Ingeniería Civil
6. Ingeniería en Tecnologías de la Información y Comunicaciones
7. Ingeniería Ambiental
8. Ingeniería en Gestión Empresarial
9. Ingeniería Petrolera
10. Licenciatura en Gastronomía

POSGRADOS:
- Maestría en Ingeniería Industrial
- Maestría en Sistemas Computacionales
- Maestría en Ciencias de la Ingeniería
- Doctorado en Ciencias de la Ingeniería

MODALIDAD NO ESCOLARIZADA / VIRTUAL:
- Ingeniería Industrial
- Ingeniería en Sistemas Computacionales
- Ingeniería en Gestión Empresarial

ADMISIÓN:
El proceso de admisión es gratuito.
La ficha, inscripción y reinscripción son gratuitas.
Examen de admisión / evaluación diagnóstica: 3 de julio de 2026.
Publicación de resultados: 8 de julio de 2026.

REQUISITOS PRINCIPALES:
- CURP
- Certificado de bachillerato o constancia de conclusión
- Acta de nacimiento
- Carta de buena conducta
- Examen de tipo sanguíneo
- Constancia de vigencia de derechos del IMSS

CURSO PROPEDÉUTICO:
Escolarizada: del 3 al 7 de agosto de 2026.
No escolarizada / virtual: 8 de agosto de 2026.

INICIO DE CLASES:
Escolarizada: 17 de agosto de 2026.
No escolarizada / virtual: 22 de agosto de 2026.

EJEMPLOS DE COSTOS:
- Curso de Francés 60 hrs Alumno Externo (Foráneo): $933.00
- Curso de Francés 60 hrs: Gratuito
- Curso de Inglés 60 hrs Alumno Externo (Foráneo): $933.00
- Cédula para curso de idiomas: $732.00
- Curso intensivo de Inglés: $732.00
- Examen de Inglés: $622.00
- Certificado de Inglés: $368.00
- Certificado de Inglés grado Maestría: $1,037.00
- Carga académica: $118.00
- Duplicado de carga académica: $122.00
- Seguro contra accidentes y de vida: $70.00
- Expedición de credencial: $122.00
- Duplicado de credencial: $122.00
- Constancia de estudios: $61.00
- Constancia con calificaciones: $61.00
- Constancia de buena conducta: $122.00
- Constancia del Seguro Social: $94.00
- Duplicado de constancia: $61.00
- Trámite de titulación Licenciatura: $7,437.00
- Trámite de titulación Maestría: $12,191.00
- Título profesional grado Maestría: $7,802.00
- Examen profesional grado Maestría: $1,829.00
- Acta examen profesional grado Maestría: $427.00
`;

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
      '✅ *Modo específico activado*\n\nAhora puedes hacer preguntas más detalladas.\n\nPara salir de este modo escribe *menu* o *salir*.'
    );
    return;
  }

  // Salir del modo específico
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

  // Reinicio o saludo
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

    await enviarMenuPrincipal(numeroCliente);
    return;
  }

  const sesionRefrescada = obtenerSesion(numeroCliente);

  // Modo específico = usar IA sí o sí
  if (sesionRefrescada.modoEspecifico) {
    console.log("Entrando a modo específico con:", textoRecibido);
    const respuestaIA = await generarRespuestaIA(textoRecibido);
    await enviarTexto(numeroCliente, respuestaIA);
    return;
  }

  const respuestaFija = construirRespuestaFija(textoNormalizado);

  if (respuestaFija) {
    if (respuestaFija.tipo === "texto") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
    } else if (respuestaFija.tipo === "imagen") {
      await enviarImagen(numeroCliente, respuestaFija.imageUrl, respuestaFija.mensaje);
    } else if (respuestaFija.tipo === "texto_e_imagen") {
      await enviarTexto(numeroCliente, respuestaFija.mensaje);
      await enviarImagen(numeroCliente, respuestaFija.imageUrl, respuestaFija.caption || "");
    }
    return;
  }

  await enviarTexto(
    numeroCliente,
    'No encontré una respuesta fija para esa duda.\n\nEscribe *menu* para ver el menú principal o *Especifico* para hacer una consulta más detallada.'
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

async function enviarMenuPrincipal(numeroDestino) {
  await enviarLista(numeroDestino);

  await enviarTexto(
    numeroDestino,
    "También puedes responder con un número:\n" +
      "1. Horarios de atención\n" +
      "2. Dirección del tecnológico\n" +
      "3. Carreras y posgrados\n" +
      "4. Examen y requisitos\n" +
      "5. Teléfonos de contacto\n\n" +
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
        text: "Menú principal"
      },
      body: {
        text: "Selecciona una opción o responde con un número."
      },
      footer: {
        text: 'Para consultas más detalladas escribe "Especifico".'
      },
      action: {
        button: "Ver opciones",
        sections: [
          {
            title: "Información general",
            rows: [
              {
                id: "op_1_horarios",
                title: "1. Horarios de atención",
                description: "Consulta nuestros horarios"
              },
              {
                id: "op_2_direccion",
                title: "2. Dirección del tecnológico",
                description: "Ubicación y Google Maps"
              },
              {
                id: "op_3_carreras",
                title: "3. Carreras y posgrados",
                description: "Oferta educativa"
              },
              {
                id: "op_4_examen",
                title: "4. Examen y requisitos",
                description: "Proceso de admisión"
              },
              {
                id: "op_5_telefonos",
                title: "5. Teléfonos de contacto",
                description: "Números y extensiones"
              }
            ]
          }
        ]
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
    console.error("Error enviando lista:", await respuesta.text());
  }
}

function construirRespuestaFija(texto) {
  // Números
  if (texto === "1" || contieneAlgunaFrase(texto, ["horarios de atencion", "horarios de atención", "horarios", "horario", "horarios de oficina"])) {
    return {
      tipo: "texto",
      mensaje:
        "🕒 *Horarios de atención*\n\n" +
        "• Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.\n" +
        "• Sábados: 9:00 a.m. a 3:00 p.m.\n\n" +
        'Si deseas información más detallada escribe *"Especifico"*.'
    };
  }

  if (
    texto === "2" ||
    texto === "op_2_direccion" ||
    contieneAlgunaFrase(texto, [
      "direccion del tecnologico",
      "dirección del tecnológico",
      "direccion",
      "dirección",
      "ubicacion",
      "ubicación",
      "mapa",
      "google maps",
      "donde estan",
      "donde se ubican"
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "📍 *Dirección del Instituto Tecnológico Superior de Misantla*\n\n" +
        "Km. 1.8 Carretera a Loma del Cojolite\n" +
        "C.P. 93821, Misantla, Veracruz, México\n\n" +
        "*Google Maps:*\n" +
        "https://maps.app.goo.gl/UYednfvUfUB2Ec1C9\n\n" +
        "*Horarios de atención:*\n" +
        "• Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.\n" +
        "• Sábados: 9:00 a.m. a 3:00 p.m.\n\n" +
        'Si deseas información más detallada escribe *"Especifico"*.'
    };
  }

  if (
    texto === "3" ||
    texto === "op_3_carreras" ||
    contieneAlgunaFrase(texto, [
      "carreras",
      "carrera",
      "posgrados",
      "maestrias",
      "maestrías",
      "doctorado",
      "oferta educativa"
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
        'Si deseas información más detallada escribe *"Especifico"*.'
      ,
      imageUrl: URL_IMAGEN_FICHAS,
      caption: "Imagen informativa de fichas de admisión 2026"
    };
  }

  if (
    texto === "4" ||
    texto === "op_4_examen" ||
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
      "ficha",
      "fichas"
    ])
  ) {
    return {
      tipo: "texto",
      mensaje:
        "📝 *Examen y proceso de admisión*\n\n" +
        "*El proceso de admisión es gratuito.*\n" +
        "La ficha, inscripción y reinscripción son gratuitas.\n\n" +
        "*Fecha del examen / evaluación diagnóstica:*\n" +
        "• 3 de julio de 2026\n" +
        "• Se realiza en línea\n\n" +
        "*Publicación de resultados:*\n" +
        "• 8 de julio de 2026\n\n" +
        "*Requisitos principales:*\n" +
        "• CURP\n" +
        "• Certificado de bachillerato o constancia de conclusión\n" +
        "• Acta de nacimiento\n" +
        "• Carta de buena conducta\n" +
        "• Examen de tipo sanguíneo\n" +
        "• Constancia de vigencia de derechos del IMSS\n\n" +
        'Si deseas información más detallada escribe *"Especifico"*.'
    };
  }

  if (
    texto === "5" ||
    texto === "op_5_telefonos" ||
    texto === "op_1_horarios" ||
    contieneAlgunaFrase(texto, [
      "telefonos",
      "teléfonos",
      "telefonos de contacto",
      "teléfonos de contacto",
      "contacto",
      "extensiones"
    ])
  ) {
    if (texto === "op_1_horarios") {
      return {
        tipo: "texto",
        mensaje:
          "🕒 *Horarios de atención*\n\n" +
          "• Lunes a viernes: 8:00 a.m. a 2:00 p.m. y 3:00 p.m. a 5:00 p.m.\n" +
          "• Sábados: 9:00 a.m. a 3:00 p.m.\n\n" +
          'Si deseas información más detallada escribe *"Especifico"*.'
      };
    }

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
        'Si deseas información más detallada escribe *"Especifico"*.'
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
Nunca menciones Gemini.
Nunca menciones Drive, PDFs, documentos, archivos, enlaces internos, URL Context, fuentes recuperadas ni herramientas.
Responde como asistente virtual institucional del Instituto Tecnológico Superior de Misantla.
Da respuestas directas, claras, útiles y breves.
Si te preguntan por dirección, incluye también el enlace de Google Maps.
Si te preguntan por horarios, responde con los horarios exactos.
Si no existe dato confirmado, di que no cuentas con el dato confirmado y sugiere comunicarse al (235) 323-15-45 ext. 129 o 149.
No inventes datos.

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
        temperature: 0.2,
        maxOutputTokens: 500,
        tools: [{ urlContext: {} }]
      }
    });

    let texto = response.text?.trim();

    if (!texto) {
      return "No pude responder esa consulta en este momento. Intenta de nuevo o escribe *menu*.";
    }

    // Limpieza extra por si el modelo intenta hablar de fuentes o inglés
    texto = texto
      .replace(/gemini/gi, "")
      .replace(/drive/gi, "")
      .replace(/pdf/gi, "")
      .replace(/url context/gi, "")
      .replace(/source/gi, "")
      .replace(/sources/gi, "")
      .trim();

    // Si por alguna razón devuelve mucho inglés, forzar respuesta segura
    const frasesIngles = [
      "the website",
      "therefore",
      "however",
      "the address",
      "i will",
      "i do not have",
      "source",
      "retrieved"
    ];

    const pareceIngles = frasesIngles.some((frase) =>
      texto.toLowerCase().includes(frase)
    );

    if (pareceIngles) {
      return "No cuento con ese dato confirmado en este momento. Para mayor información, puedes comunicarte al (235) 323-15-45 ext. 129 o 149.";
    }

    return texto;
  } catch (error) {
    console.error("===== ERROR MODO ESPECÍFICO =====");
    console.error("Mensaje:", error?.message);
    console.error("Objeto completo:", error);
    console.error("=================================");

    return "No pude responder esa consulta en este momento. Intenta de nuevo en unos segundos o escribe *menu*.";
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