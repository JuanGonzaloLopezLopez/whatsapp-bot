import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";

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

const sesiones = new Map();

if (!tokenVerificacion || !tokenWhatsapp || !idNumeroTelefono) {
  console.error("Faltan variables en .env");
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
    textoRecibido = (mensaje.text?.body || "").trim().toLowerCase();
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

  const sesionActual = obtenerSesion(numeroCliente);
  const respuesta = construirRespuesta(textoRecibido, sesionActual);

  if (respuesta.nuevoEstado) {
    sesiones.set(numeroCliente, {
      ...sesionActual,
      estado: respuesta.nuevoEstado,
      actualizadaEn: Date.now(),
    });
  }

  if (respuesta.tipo === "texto") {
    await enviarTexto(numeroCliente, respuesta.mensaje);
  } else if (respuesta.tipo === "botones") {
    await enviarBotones(numeroCliente, respuesta.mensaje, respuesta.botones);
  }
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

function construirRespuesta(texto, sesion) {
  if (texto === "menu" || texto === "hola" || sesion.estado === "inicio") {
    return {
      tipo: "botones",
      mensaje: "Hola, soy tu asistente. Elige una opción:",
      nuevoEstado: "menu_principal",
      botones: [
        { id: "horarios", titulo: "Horarios" },
        { id: "precios", titulo: "Precios" },
        { id: "ubicacion", titulo: "Ubicación" }
      ]
    };
  }

  if (texto === "horarios") {
    return {
      tipo: "texto",
      mensaje: "Nuestro horario es de lunes a viernes de 9:00 a 18:00 y sábado de 9:00 a 14:00.",
      nuevoEstado: "menu_principal"
    };
  }

  if (texto === "precios") {
    return {
      tipo: "texto",
      mensaje: "Indícame qué producto o servicio necesitas y te preparo una cotización básica.",
      nuevoEstado: "esperando_producto"
    };
  }

  if (texto === "ubicacion") {
    return {
      tipo: "texto",
      mensaje: "Estamos en Misantla. También puedo enviarte un enlace directo a Google Maps.",
      nuevoEstado: "menu_principal"
    };
  }

  if (sesion.estado === "esperando_producto") {
    return {
      tipo: "texto",
      mensaje: `Perfecto. Recibí tu solicitud sobre: "${texto}". El siguiente paso es conectar esta consulta con una base de datos o un catálogo.`,
      nuevoEstado: "menu_principal"
    };
  }

  return {
    tipo: "texto",
    mensaje: "No entendí tu mensaje. Escribe *menu* para ver las opciones.",
    nuevoEstado: "menu_principal"
  };
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

app.listen(puerto, () => {
  console.log(`Servidor activo en http://localhost:${puerto}/webhook`);
});