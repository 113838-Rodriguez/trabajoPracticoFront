const API_BASE_URL = "https://localhost:7236";
const API_REPORT = `${API_BASE_URL}/api/report`;

const $ = (selector) => document.querySelector(selector);

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-AR");

let productosData = []; 
let ventasData = [];
let entregasData = [];

document.addEventListener("DOMContentLoaded", () => {
    configurarNavegacion();
    configurarFormularios();
    configurarExportaciones();
    inicializarFechas();
    cargarSucursales();
    consultarProductos();
    consultarEntregas();
});

function configurarNavegacion() {
    document.querySelectorAll(".report-option").forEach((button) => {
        button.addEventListener("click", () => {
            const report = button.dataset.report;

            document.querySelectorAll(".report-option").forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            document.querySelectorAll(".report-panel").forEach((panel) => {
                panel.classList.toggle("active", panel.id === `panel-${report}`);
            });
        });
    });
}

function configurarFormularios() {
    $("#formProductos").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarProductos();
    });

    $("#formVentas").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarVentas();
    });

    $("#formEntregas").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarEntregas();
    });

    $("#sucursalVentas").addEventListener("change", cargarEmpleados);
}

function configurarExportaciones() {
    $("#exportarProductos").addEventListener("click", () => exportarCSV(
        "productos_sin_ventas.csv",
        ["Código", "Descripción", "Stock actual", "Precio unitario", "Capital inmovilizado"],
        productosData.map(p => [p.codigo, p.descripcion, p.stockActual, p.precioUnitario, p.capitalInmovilizado])
    ));

    $("#exportarVentas").addEventListener("click", () => exportarCSV(
        "ventas_mensuales_por_empleado.csv",
        ["Sucursal", "Período", "Empleado", "Cantidad de facturas", "Total ventas"],
        ventasData.map(v => [v.sucursal, v.periodo, v.empleado, v.cantidadFacturas, v.totalVentas])
    ));

    $("#exportarEntregas").addEventListener("click", () => exportarCSV(
        "entregas_atrasadas.csv",
        ["Tipo", "Número de orden", "Cliente/Proveedor", "Estado actual", "Fecha estimada", "Días de atraso", "Unidades pendientes"],
        entregasData.map(e => [e.tipo, e.numeroOrden, e.clienteProveedor, e.estadoActual, e.fechaEntregaEstimada, e.diasAtraso, e.unidadesPendientes])
    ));
}

function inicializarFechas() {
    const hoy = new Date();
    const fechaLocal = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0")
    ].join("-");

    $("#fechaReferencia").value = fechaLocal;
    $("#anioVentas").value = hoy.getFullYear();
}

async function apiGet(url) {
    let response;

    try {
        response = await fetch(url, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });
    } catch (error) {
        throw new Error(
            "No se pudo conectar con la API. Verificá que el proyecto ASP.NET Core esté ejecutándose, " +
            "que API_BASE_URL sea correcto y que CORS permita el origen del frontend."
        );
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof data === "object" && data !== null
            ? (data.mensaje || data.title || data.detail || "Ocurrió un error al consultar el servidor.")
            : (data || "Ocurrió un error al consultar el servidor.");

        throw new Error(message);
    }

    return data;
}

function mostrarMensaje(mensaje, tipo = "danger") {
    const alert = $("#mensajeGlobal");
    alert.className = `alert alert-${tipo} mt-3`;
    alert.textContent = mensaje;
    alert.classList.remove("d-none");
}

function ocultarMensaje() {
    $("#mensajeGlobal").classList.add("d-none");
}

function setLoading(buttonSelector, loading, text = "Consultar") {
    const button = $(buttonSelector);
    if (!button) return;

    if (loading) {
        button.dataset.originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Consultando...`;
    } else {
        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        } else {
            button.textContent = text;
        }
    }
}

/* REPORTE 1: GET /api/report/productos-sin-ventas/{dias} */
async function consultarProductos() {
    ocultarMensaje();

    const dias = Number($("#diasSinVentas").value);
    if (!Number.isInteger(dias) || dias <= 0) {
        mostrarMensaje("La cantidad de días debe ser un número entero mayor a cero.");
        return;
    }

    setLoading("#formProductos button[type='submit']", true);

    try {
        productosData = await apiGet(`${API_REPORT}/productos-sin-ventas/${dias}`);
        renderProductos(productosData, dias);
    } catch (error) {
        productosData = [];
        renderProductos([], dias);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formProductos button[type='submit']", false);
    }
}

function renderProductos(data, dias) {
    const tbody = $("#tablaProductos");
    $("#totalProductos").textContent = numberFormatter.format(data.length);

    const capital = data.reduce((sum, item) => sum + Number(item.capitalInmovilizado || 0), 0);
    $("#capitalInmovilizado").textContent = currencyFormatter.format(capital);
    $("#infoProductos").textContent = `Productos sin ventas en los últimos ${dias} días: ${data.length} resultado(s).`;

    $("#exportarProductos").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No se encontraron productos para este período.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.codigo)}</td>
            <td>${escapeHTML(item.descripcion)}</td>
            <td class="text-end">${numberFormatter.format(item.stockActual ?? 0)}</td>
            <td class="text-end">${currencyFormatter.format(item.precioUnitario ?? 0)}</td>
            <td class="text-end fw-semibold">${currencyFormatter.format(item.capitalInmovilizado ?? 0)}</td>
        </tr>
    `).join("");
}

/* REPORTE 3: sucursales, empleados y ventas mensuales */
async function cargarSucursales() {
    try {
        const sucursales = await apiGet(`${API_REPORT}/sucursales`);
        const select = $("#sucursalVentas");

        select.innerHTML = `<option value="">Todas las sucursales</option>` +
            sucursales.map(s => `<option value="${s.sucursalID}">${escapeHTML(s.descripcion)}</option>`).join("");
    } catch (error) {
        mostrarMensaje(`No se pudieron cargar las sucursales: ${error.message}`);
    }
}

async function cargarEmpleados() {
    const sucursalID = $("#sucursalVentas").value;
    const select = $("#empleadoVentas");

    select.innerHTML = `<option value="">Todos los empleados</option>`;
    select.disabled = !sucursalID;

    if (!sucursalID) return;

    try {
        const empleados = await apiGet(`${API_REPORT}/empleados/${encodeURIComponent(sucursalID)}`);
        select.innerHTML = `<option value="">Todos los empleados</option>` +
            empleados.map(e => `<option value="${e.empleadoID}">${escapeHTML(e.nombre)}</option>`).join("");
        select.disabled = false;
    } catch (error) {
        mostrarMensaje(`No se pudieron cargar los empleados: ${error.message}`);
    }
}

Ventas porasync function consultarVentas() {
    ocultarMensaje();

    const anio = Number($("#anioVentas").value);
    const sucursalID = $("#sucursalVentas").value;
    const empleadoId = $("#empleadoVentas").value;
    const anioActual = new Date().getFullYear();

    if (!Number.isInteger(anio) || anio < 2000 || anio > anioActual) {
        mostrarMensaje(`Ingresá un año entre 2000 y ${anioActual}.`);
        return;
    }

    const params = new URLSearchParams({ anio: String(anio) });
    if (sucursalID) params.append("sucursalID", sucursalID);
    if (empleadoId) params.append("empleadoId", empleadoId);

    setLoading("#formVentas button[type='submit']", true);

    try {
        ventasData = await apiGet(`${API_REPORT}/empleados-sucursales?${params.toString()}`);
        renderVentas(ventasData, anio);
    } catch (error) {
        ventasData = [];
        renderVentas([], anio);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formVentas button[type='submit']", false);
    }
}

function renderVentas(data, anio) {
    const tbody = $("#tablaVentas");
    const facturas = data.reduce((sum, item) => sum + Number(item.cantidadFacturas || 0), 0);
    const total = data.reduce((sum, item) => sum + Number(item.totalVentas || 0), 0);

    $("#totalFacturas").textContent = numberFormatter.format(facturas);
    $("#totalVentas").textContent = currencyFormatter.format(total);
    $("#infoVentas").textContent = `Resultados correspondientes al año ${anio}: ${data.length} registro(s).`;
    $("#exportarVentas").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No se encontraron ventas con los filtros seleccionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.sucursal)}</td>
            <td>${escapeHTML(item.periodo)}</td>
            <td>${escapeHTML(item.empleado)}</td>
            <td class="text-end">${numberFormatter.format(item.cantidadFacturas ?? 0)}</td>
            <td class="text-end fw-semibold">${currencyFormatter.format(item.totalVentas ?? 0)}</td>
        </tr>
    `).join("");
}

/* REPORTE 5: GET /api/report/entregas-atrasadas?fechaReferencia= */
async function consultarEntregas() {
    ocultarMensaje();

    const fecha = $("#fechaReferencia").value;
    if (!fecha) {
        mostrarMensaje("Seleccioná una fecha de referencia.");
        return;
    }

    setLoading("#formEntregas button[type='submit']", true);

    try {
        const params = new URLSearchParams({ fechaReferencia: fecha });
        entregasData = await apiGet(`${API_REPORT}/entregas-atrasadas?${params.toString()}`);
        renderEntregas(entregasData, fecha);
    } catch (error) {
        entregasData = [];
        renderEntregas([], fecha);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formEntregas button[type='submit']", false);
    }
}

function renderEntregas(data, fecha) {
    const tbody = $("#tablaEntregas");
    const unidades = data.reduce((sum, item) => sum + Number(item.unidadesPendientes || 0), 0);

    $("#totalEntregas").textContent = numberFormatter.format(data.length);
    $("#unidadesPendientes").textContent = numberFormatter.format(unidades);
    $("#infoEntregas").textContent = `Fecha de referencia: ${formatearFecha(fecha)}. ${data.length} resultado(s).`;
    $("#exportarEntregas").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No se encontraron entregas atrasadas para esa fecha.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.tipo)}</td>
            <td>${escapeHTML(item.numeroOrden)}</td>
            <td>${escapeHTML(item.clienteProveedor)}</td>
            <td><span class="badge-estado">${escapeHTML(item.estadoActual)}</span></td>
            <td>${formatearFecha(item.fechaEntregaEstimada)}</td>
            <td class="text-end"><span class="badge-atraso">${numberFormatter.format(item.diasAtraso ?? 0)} días</span></td>
            <td class="text-end fw-semibold">${numberFormatter.format(item.unidadesPendientes ?? 0)}</td>
        </tr>
    `).join("");
}

/* UTILIDADES */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatearFecha(value) {
    if (!value) return "—";
    // DateOnly suele llegar como YYYY-MM-DD. Se evita el desfase de zona horaria.
    const datePart = String(value).substring(0, 10);
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return escapeHTML(value);
    return `${day}/${month}/${year}`;
}

function exportarCSV(filename, headers, rows) {
    if (!rows.length) return;

    const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [headers, ...rows]
        .map(row => row.map(csvCell).join(";"))
        .join("\r\n");

    // BOM para que Excel reconozca correctamente caracteres como ñ y tildes.
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}