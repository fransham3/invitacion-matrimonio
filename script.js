/* ============ CONFIGURACIÓN (edita estos datos) ============ */
const CONFIG = {
  // Fecha y hora de la boda (año, mes[0-11], día, hora, minutos)
  fecha: new Date(2026, 10, 28, 16, 30),

  // Dirección tal como la buscarías en Google Maps
  direccionMapa: "Mauricio Rugendas 5409, Macul, Santiago, Chile",

  // OPCIONAL: pega aquí el enlace exacto de Google Maps (o coordenadas como "-33.4890,-70.5950").
  // Si lo dejas vacío, se usa la dirección de arriba.
  enlaceMapa: "-33.5045347,-70.6105457",

  // Enlace de subida de fotos (solicitud de archivos de Dropbox)
  enlaceFotos: "https://www.dropbox.com/request/8ezo1gzh5eyu3jvb5s85"
};
/* ============================================================ */

/* Contraseña de acceso: aquí NO está la contraseña, solo su "huella" (hash).
   Para cambiarla, abre generar-hash.html en tu computador y pega los dos valores nuevos. */
const ACCESO = {
  sal: "9f1a54384e296dbd1650c2d1cd34e8c8",
  iteraciones: 200000,
  hash: "68bcd770ab2c5f54f5d6e2b16067113ee7eaffbb47612221e694ecaa4d57a0c4"
};


const audio = document.getElementById("audio");
const btnMusica = document.getElementById("btn-musica");
const btnAbrir = document.getElementById("btn-abrir");

function actualizarBoton(sonando){
  btnMusica.setAttribute("aria-pressed", String(sonando));
  btnMusica.setAttribute("aria-label", sonando ? "Desactivar música" : "Activar música");
}

async function reproducir(){
  try { await audio.play(); actualizarBoton(true); }
  catch { actualizarBoton(false); } // el navegador bloqueó la reproducción
}

btnMusica.addEventListener("click", () => {
  if (audio.paused) reproducir();
  else { audio.pause(); actualizarBoton(false); }
});

// Los navegadores exigen un toque del usuario para reproducir audio
btnAbrir.addEventListener("click", reproducir);

// Enlaces
const mapa = CONFIG.enlaceMapa.trim();
document.getElementById("btn-mapa").href = mapa.startsWith("http")
  ? mapa
  : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapa || CONFIG.direccionMapa);
document.getElementById("btn-fotos").href = CONFIG.enlaceFotos;

// Cuenta regresiva
const el = id => document.getElementById(id);
function cuenta(){
  let s = Math.max(0, Math.floor((CONFIG.fecha - new Date()) / 1000));
  el("c-dias").textContent  = Math.floor(s / 86400);
  el("c-horas").textContent = Math.floor(s % 86400 / 3600);
  el("c-min").textContent   = Math.floor(s % 3600 / 60);
  el("c-seg").textContent   = s % 60;
}
cuenta();
setInterval(cuenta, 1000);

// Aparición suave al hacer scroll
if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("js");
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); observador.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll("main section").forEach(seccion => {
    [...seccion.children].forEach((hijo, i) => {
      hijo.classList.add("revela");
      hijo.style.setProperty("--retraso", (i * 0.12) + "s");
      observador.observe(hijo);
    });
  });
}

// ---------- Acceso con contraseña ----------
const acceso = document.getElementById("acceso");
const contenido = document.getElementById("contenido");
const formAcceso = document.getElementById("form-acceso");
const campoClave = document.getElementById("clave");
const errorAcceso = document.getElementById("acceso-error");

// Se ignoran mayúsculas y espacios a los lados (los celulares suelen poner la primera letra en mayúscula)
const normalizar = t => t.trim().toLowerCase().normalize("NFC");
const hexABytes = h => Uint8Array.from(h.match(/../g), b => parseInt(b, 16));
const bytesAHex = b => [...b].map(x => x.toString(16).padStart(2, "0")).join("");

async function derivar(clave) {
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalizar(clave)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexABytes(ACCESO.sal), iterations: ACCESO.iteraciones },
    llave, 256
  );
  return bytesAHex(new Uint8Array(bits));
}

function desbloquear() {
  acceso.hidden = true;
  contenido.hidden = false;
  window.scrollTo(0, 0);
}

// Si ya la ingresó en esta pestaña, no se la pedimos de nuevo
try { if (sessionStorage.getItem("invitacion-ok") === "1") desbloquear(); } catch {}

formAcceso.addEventListener("submit", async e => {
  e.preventDefault();
  errorAcceso.textContent = "";
  if (!(window.crypto && crypto.subtle)) {
    errorAcceso.textContent = "Abre la invitación desde el enlace seguro (https) que te enviamos.";
    return;
  }
  const boton = formAcceso.querySelector("button[type=submit]");
  boton.disabled = true;
  try {
    if (await derivar(campoClave.value) === ACCESO.hash) {
      try { sessionStorage.setItem("invitacion-ok", "1"); } catch {}
      desbloquear();
      return;
    }
    errorAcceso.textContent = "Contraseña incorrecta. Revisa el mensaje de la invitación e inténtalo de nuevo.";
    campoClave.select();
  } finally {
    boton.disabled = false;
  }
});
