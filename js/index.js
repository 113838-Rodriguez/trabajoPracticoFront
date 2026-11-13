const API_BASE_URL = "https://localhost:7236";

const token = sessionStorage.getItem("token");

function cerrarSesion() {
    sessionStorage.removeItem("token");
    window.location.replace("../Login/login.html");
}

let esAdmin = false;

if (!token) {
    cerrarSesion();
} else {
    try {
        const payloadBase64 = token.split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const payload = JSON.parse(atob(payloadBase64));

        if (!payload.exp || payload.exp * 1000 <= Date.now()) {
            cerrarSesion();
        } else {
            const nombreUsuario = payload[
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
            ] ?? payload.unique_name ?? payload.name ?? "Usuario";

            const rol = payload[
                "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
            ] ?? payload.role;

            document.getElementById("usuarioActual").textContent =
                `${nombreUsuario} (${rol ?? "Sin rol"})`;

            esAdmin = rol === "Admin";

            if (!esAdmin) {
                document.querySelectorAll(".admin-only").forEach(elemento => {
                    elemento.classList.add("d-none");
                });
            }
        }
    } catch (error) {
        cerrarSesion();
    }
}

document.getElementById("btnLogout").addEventListener("click", cerrarSesion);


/* ============================================================
   DASHBOARD
   ============================================================ */

const moneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
});
const numero = new Intl.NumberFormat("es-AR");

const paleta = ["#2563eb", "#1e3a8a", "#60a5fa", "#93c5fd", "#64748b", "#0f766e", "#38bdf8", "#818cf8"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

let chartVentas = null;
let chartTipoCliente = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnActualizar").addEventListener("click", cargarDashboard);
    cargarDashboard();
});

function fechaISO(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

async function apiGet(ruta) {
    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
        headers: { "Accept": "application/json" }
    });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return respuesta.json();
}

async function cargarDashboard() {
    const alerta = document.getElementById("dashboardAlert");
    alerta.classList.add("d-none");

    const hoy = new Date();
    const anio = hoy.getFullYear();

    // Cada consulta es independiente: si una falla, el resto se muestra igual.
    const tareas = [
        cargarProductos(),
        cargarClientes(),
        cargarStockBajo(),
        cargarEntregas(fechaISO(hoy))
    ];

    if (esAdmin) {
        tareas.push(cargarVentas(anio));
        tareas.push(cargarTipoCliente(`${anio}-01-01`, fechaISO(hoy)));
    }

    const resultados = await Promise.allSettled(tareas);
    const fallaron = resultados.filter(r => r.status === "rejected").length;

    if (fallaron > 0) {
        alerta.textContent =
            `No se pudieron cargar ${fallaron} sección(es). Verificá que la API esté corriendo en ${API_BASE_URL}.`;
        alerta.classList.remove("d-none");
    }
}


/* ---------- TARJETAS ---------- */

async function cargarProductos() {
    try {
        const productos = await apiGet("/api/Producto");
        document.getElementById("statProductos").textContent = numero.format(productos.length);
    } catch (e) {
        document.getElementById("statProductos").textContent = "—";
        throw e;
    }
}

async function cargarClientes() {
    try {
        const clientes = await apiGet("/api/Clientes");
        const activos = clientes.filter(c => c.estaActivo !== false).length;
        document.getElementById("statClientes").textContent = numero.format(activos);
    } catch (e) {
        document.getElementById("statClientes").textContent = "—";
        throw e;
    }
}


/* ---------- STOCK BAJO ---------- */

async function cargarStockBajo() {
    const tbody = document.getElementById("tablaStockBajo");
    try {
        const datos = await apiGet("/api/report/stock-minimo");
        document.getElementById("statStockBajo").textContent = numero.format(datos.length);

        if (!datos.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay productos bajo el mínimo 🎉</td></tr>';
            return;
        }

        const top = [...datos]
            .sort((a, b) => (b.faltanteReposicion ?? 0) - (a.faltanteReposicion ?? 0))
            .slice(0, 6);

        tbody.innerHTML = top.map(x => `
            <tr>
                <td>${escapar(x.producto)}<div class="text-muted small">${escapar(x.codigo)}</div></td>
                <td>${escapar(x.sucursal)}</td>
                <td class="text-end"><span class="badge text-bg-danger">${numero.format(x.cantidadActual ?? 0)}</span></td>
                <td class="text-end">${numero.format(x.stockMinimo ?? 0)}</td>
            </tr>
        `).join("");
    } catch (e) {
        document.getElementById("statStockBajo").textContent = "—";
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">No se pudo cargar.</td></tr>';
        throw e;
    }
}


/* ---------- ENTREGAS ATRASADAS ---------- */

async function cargarEntregas(fechaReferencia) {
    const tbody = document.getElementById("tablaEntregas");
    try {
        const datos = await apiGet(`/api/report/entregas-atrasadas?fechaReferencia=${fechaReferencia}`);

        if (!datos.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay entregas atrasadas 🎉</td></tr>';
            return;
        }

        const top = [...datos]
            .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0))
            .slice(0, 6);

        tbody.innerHTML = top.map(x => `
            <tr>
                <td>${escapar(x.tipo)}</td>
                <td>#${escapar(String(x.numeroOrden))}</td>
                <td>${escapar(x.clienteProveedor)}</td>
                <td class="text-end"><span class="badge text-bg-warning">${numero.format(x.diasAtraso ?? 0)} días</span></td>
            </tr>
        `).join("");
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">No se pudo cargar.</td></tr>';
        throw e;
    }
}


/* ---------- VENTAS POR MES ---------- */

// Intenta sacar año y mes del campo "periodo" (acepta 2026-03, 03/2026, 2026-03-01, etc.)
function parsearPeriodo(periodo) {
    const s = String(periodo ?? "");
    let m = s.match(/(\d{4})\D+(\d{1,2})/);
    if (m) return { anio: +m[1], mes: +m[2] };
    m = s.match(/(\d{1,2})\D+(\d{4})/);
    if (m) return { anio: +m[2], mes: +m[1] };
    return null;
}

async function cargarVentas(anio) {
    const msg = document.getElementById("msgVentas");
    document.getElementById("anioVentas").textContent = `(${anio})`;
    msg.classList.add("d-none");

    try {
        const datos = await apiGet(`/api/report/empleados-sucursales?anio=${anio}`);

        // Agrupar el total por período
        const porPeriodo = new Map();
        datos.forEach(x => {
            const clave = x.periodo ?? "Sin período";
            porPeriodo.set(clave, (porPeriodo.get(clave) ?? 0) + Number(x.totalVentas ?? 0));
        });

        const periodos = [...porPeriodo.keys()].map(p => ({
            texto: p,
            total: porPeriodo.get(p),
            fecha: parsearPeriodo(p)
        }));

        // Ordenar cronológicamente si se pudo interpretar el período
        if (periodos.every(p => p.fecha)) {
            periodos.sort((a, b) => (a.fecha.anio * 100 + a.fecha.mes) - (b.fecha.anio * 100 + b.fecha.mes));
        }

        const etiquetas = periodos.map(p =>
            p.fecha ? `${MESES[p.fecha.mes - 1] ?? p.fecha.mes} ${p.fecha.anio}` : p.texto);

        // Tarjeta "Ventas del mes": el mes actual, o el último período disponible
        const ahora = new Date();
        const delMes = periodos.find(p =>
            p.fecha && p.fecha.anio === ahora.getFullYear() && p.fecha.mes === ahora.getMonth() + 1);
        const referencia = delMes ?? periodos[periodos.length - 1];

        if (referencia) {
            document.getElementById("statVentas").textContent = moneda.format(referencia.total);
            document.getElementById("statVentasSub").textContent =
                delMes ? "Mes en curso" : `Último período: ${referencia.texto}`;
        } else {
            document.getElementById("statVentas").textContent = moneda.format(0);
            document.getElementById("statVentasSub").textContent = "Sin ventas registradas";
        }

        if (chartVentas) chartVentas.destroy();

        if (!periodos.length) {
            msg.textContent = "Todavía no hay ventas registradas este año.";
            msg.classList.remove("d-none");
            return;
        }

        chartVentas = new Chart(document.getElementById("chartVentas"), {
            type: "bar",
            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Total vendido",
                    data: periodos.map(p => p.total),
                    backgroundColor: "#2563eb",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => moneda.format(ctx.parsed.y) } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => moneda.format(v) } }
                }
            }
        });
    } catch (e) {
        document.getElementById("statVentas").textContent = "—";
        msg.textContent = "No se pudieron cargar las ventas.";
        msg.classList.remove("d-none");
        throw e;
    }
}


/* ---------- FACTURACIÓN POR TIPO DE CLIENTE ---------- */

async function cargarTipoCliente(desde, hasta) {
    const msg = document.getElementById("msgTipoCliente");
    msg.classList.add("d-none");

    try {
        const datos = await apiGet(`/api/report/facturacion-tipo-cliente?fechaDesde=${desde}&fechaHasta=${hasta}`);

        if (chartTipoCliente) chartTipoCliente.destroy();

        if (!datos.length) {
            msg.textContent = "No hay facturación en el período.";
            msg.classList.remove("d-none");
            return;
        }

        chartTipoCliente = new Chart(document.getElementById("chartTipoCliente"), {
            type: "doughnut",
            data: {
                labels: datos.map(x => x.tipoCliente),
                datasets: [{
                    data: datos.map(x => Number(x.totalFacturado ?? 0)),
                    backgroundColor: paleta
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${moneda.format(ctx.parsed)}` } }
                }
            }
        });
    } catch (e) {
        msg.textContent = "No se pudo cargar la facturación.";
        msg.classList.remove("d-none");
        throw e;
    }
}
