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
let stockSucursalData = [];
let facturacionClienteData = [];
let stockMinimoData = [];

// Una instancia por gráfico: se destruye antes de dibujar resultados nuevos.
const reportCharts = { stockSucursal: null, ventas: null, facturacionCliente: null, stockMinimo: null };
const chartPalette = ["#2563eb", "#1e3a8a", "#60a5fa", "#93c5fd", "#64748b", "#0f766e", "#38bdf8", "#818cf8", "#0ea5e9", "#475569"];

document.addEventListener("DOMContentLoaded", () => {
    configurarNavegacion();
    configurarFormularios();
    configurarExportaciones();
    inicializarFechas();
    cargarSucursales();
    consultarProductos();
    consultarEntregas();
    inicializarFechasFacturacion();
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

    $("#formStockSucursal").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarStockSucursal();
    });

    $("#formFacturacionCliente").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarFacturacionCliente();
    });

    $("#formStockMinimo").addEventListener("submit", (event) => {
        event.preventDefault();
        consultarStockMinimo();
    });

    $("#sucursalVentas").addEventListener("change", cargarEmpleados);
}


function configurarExportaciones() {

    const reportes = [
        {
            boton: "exportarProductos",
            titulo: "Productos sin ventas",
            archivo: "productos_sin_ventas.pdf",
            datos: () => productosData,
            columnas: [
                "Código", "Descripción", "Stock",
                "Precio unitario", "Capital inmovilizado"
            ],
            filas: d => d.map(x => [
                x.codigo, x.descripcion, x.stockActual,
                currencyFormatter.format(x.precioUnitario),
                currencyFormatter.format(x.capitalInmovilizado)
            ]),
            resumen: () => [
                ["Productos encontrados", $("#totalProductos").textContent],
                ["Capital inmovilizado", $("#capitalInmovilizado").textContent]
            ],
            filtro: () => `Días sin ventas: ${$("#diasSinVentas").value}`
        },
        {
            boton: "exportarStockSucursal",
            titulo: "Stock por sucursal",
            archivo: "stock_por_sucursal.pdf",
            datos: () => stockSucursalData,
            columnas: [
                "Código", "Producto", "Sucursal",
                "Cantidad actual", "Stock mínimo"
            ],
            filas: d => d.map(x => [
                x.codigo, x.producto, x.sucursal,
                x.cantidadActual, x.stockMinimo
            ]),
            resumen: () => [
                ["Sucursales", $("#totalStockSucursales").textContent],
                ["Unidades disponibles", $("#unidadesStockSucursales").textContent]
            ],
            filtro: () => `Producto: ${$("#codigoProductoStock").value}`,
            grafico: "chartStockSucursal"
        },
        {
            boton: "exportarVentas",
            titulo: "Ventas por empleado",
            archivo: "ventas_por_empleado.pdf",
            datos: () => ventasData,
            columnas: [
                "Sucursal", "Período", "Empleado",
                "Facturas", "Total ventas"
            ],
            filas: d => d.map(x => [
                x.sucursal, x.periodo, x.empleado,
                x.cantidadFacturas,
                currencyFormatter.format(x.totalVentas)
            ]),
            resumen: () => [
                ["Facturas", $("#totalFacturas").textContent],
                ["Total vendido", $("#totalVentas").textContent]
            ],
            filtro: () => `Año: ${$("#anioVentas").value}`,
            grafico: "chartVentas"
        },
        {
            boton: "exportarFacturacionCliente",
            titulo: "Facturación por cliente",
            archivo: "facturacion_clientes.pdf",
            datos: () => facturacionClienteData,
            columnas: [
                "Tipo de cliente", "Facturas",
                "Total facturado", "Promedio"
            ],
            filas: d => d.map(x => [
                x.tipoCliente, x.cantidadFacturas,
                currencyFormatter.format(x.totalFacturado),
                currencyFormatter.format(x.promedioPorFactura)
            ]),
            resumen: () => [
                ["Facturas", $("#totalFacturasCliente").textContent],
                ["Total facturado", $("#totalFacturadoCliente").textContent]
            ],
            filtro: () =>
                `Período: ${$("#fechaDesdeFacturacion").value} al ${$("#fechaHastaFacturacion").value}`,
            grafico: "chartFacturacionCliente"
        },
        {
            boton: "exportarEntregas",
            titulo: "Entregas atrasadas",
            archivo: "entregas_atrasadas.pdf",
            datos: () => entregasData,
            columnas: [
                "Tipo", "Orden", "Cliente / Proveedor",
                "Estado", "Fecha estimada",
                "Días de atraso", "Unidades"
            ],
            filas: d => d.map(x => [
                x.tipo, x.numeroOrden, x.clienteProveedor,
                x.estadoActual, formatearFecha(x.fechaEntregaEstimada),
                x.diasAtraso, x.unidadesPendientes
            ]),
            resumen: () => [
                ["Entregas atrasadas", $("#totalEntregas").textContent],
                ["Unidades pendientes", $("#unidadesPendientes").textContent]
            ],
            filtro: () => `Fecha de referencia: ${$("#fechaReferencia").value}`
        },
        {
            boton: "exportarStockMinimo",
            titulo: "Productos para reposición",
            archivo: "productos_reposicion.pdf",
            datos: () => stockMinimoData,
            columnas: [
                "Sucursal", "Código", "Producto",
                "Actual", "Mínimo", "Faltante"
            ],
            filas: d => d.map(x => [
                x.sucursal, x.codigo, x.producto,
                x.cantidadActual, x.stockMinimo, x.faltanteReposicion
            ]),
            resumen: () => [
                ["Productos para reponer", $("#totalStockMinimo").textContent],
                ["Unidades faltantes", $("#totalFaltanteReposicion").textContent]
            ],
            filtro: () =>
                `Sucursal: ${$("#sucursalStockMinimo").selectedOptions[0]?.textContent || "Todas"}`,
            grafico: "chartStockMinimo"
        }
    ];

    reportes.forEach(reporte => {
        document.getElementById(reporte.boton)
            .addEventListener("click", () => generarPDF(reporte));
    });
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

function inicializarFechasFacturacion() {
    const hoy = new Date();
    const fechaHasta = [hoy.getFullYear(), String(hoy.getMonth() + 1).padStart(2, "0"), String(hoy.getDate()).padStart(2, "0")].join("-");
    const primerDiaMes = [hoy.getFullYear(), String(hoy.getMonth() + 1).padStart(2, "0"), "01"].join("-");
    $("#fechaDesdeFacturacion").value = primerDiaMes;
    $("#fechaHastaFacturacion").value = fechaHasta;
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

        const opciones = sucursales.map(s => `<option value="${escapeHTML(s.descripcion)}">${escapeHTML(s.descripcion)}</option>`).join("");
        select.innerHTML = `<option value="">Todas las sucursales</option>` +
            sucursales.map(s => `<option value="${s.sucursalID}">${escapeHTML(s.descripcion)}</option>`).join("");
        $("#sucursalStockMinimo").innerHTML = `<option value="">Todas las sucursales</option>` + opciones;
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

async function consultarVentas() {
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
        const respuesta = await apiGet(`${API_REPORT}/empleados-sucursales?${params.toString()}`);
        ventasData = Array.isArray(respuesta) ? respuesta : [];
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
    renderVentasChart(data);
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

/* REPORTE 2 - MAXI: GET /api/report/stock-sucursal/{codigoProducto} */
async function consultarStockSucursal() {
    ocultarMensaje();
    const codigo = $("#codigoProductoStock").value.trim();
    if (!codigo) {
        mostrarMensaje("Ingresá el código del producto.");
        return;
    }

    setLoading("#formStockSucursal button[type='submit']", true);
    try {
        const respuesta = await apiGet(`${API_REPORT}/stock-sucursal/${encodeURIComponent(codigo)}`);
        stockSucursalData = Array.isArray(respuesta) ? respuesta : [];
        renderStockSucursal(stockSucursalData, codigo);
    } catch (error) {
        stockSucursalData = [];
        renderStockSucursal([], codigo);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formStockSucursal button[type='submit']", false);
    }
}

function renderStockSucursal(data, codigo) {
    const tbody = $("#tablaStockSucursal");
    renderStockSucursalChart(data);
    const unidades = data.reduce((sum, item) => sum + Number(item.cantidadActual || 0), 0);
    $("#totalStockSucursales").textContent = numberFormatter.format(data.length);
    $("#unidadesStockSucursales").textContent = numberFormatter.format(unidades);
    $("#infoStockSucursal").textContent = `Código consultado: ${codigo}. ${data.length} sucursal(es) encontrada(s).`;
    $("#exportarStockSucursal").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No se encontró stock para ese código de producto.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.codigo)}</td>
            <td>${escapeHTML(item.producto)}</td>
            <td>${escapeHTML(item.sucursal)}</td>
            <td class="text-end fw-semibold">${numberFormatter.format(item.cantidadActual ?? 0)}</td>
            <td class="text-end">${numberFormatter.format(item.stockMinimo ?? 0)}</td>
        </tr>
    `).join("");
}

/* REPORTE 4 - MAXI: GET /api/report/facturacion-tipo-cliente */
async function consultarFacturacionCliente() {
    ocultarMensaje();
    const fechaDesde = $("#fechaDesdeFacturacion").value;
    const fechaHasta = $("#fechaHastaFacturacion").value;

    if (!fechaDesde || !fechaHasta) {
        mostrarMensaje("Seleccioná las dos fechas del período.");
        return;
    }
    if (fechaDesde > fechaHasta) {
        mostrarMensaje("La fecha desde no puede ser posterior a la fecha hasta.");
        return;
    }

    setLoading("#formFacturacionCliente button[type='submit']", true);
    try {
        const params = new URLSearchParams({ fechaDesde, fechaHasta });
        const respuesta = await apiGet(`${API_REPORT}/facturacion-tipo-cliente?${params.toString()}`);
        facturacionClienteData = Array.isArray(respuesta) ? respuesta : [];
        renderFacturacionCliente(facturacionClienteData, fechaDesde, fechaHasta);
    } catch (error) {
        facturacionClienteData = [];
        renderFacturacionCliente([], fechaDesde, fechaHasta);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formFacturacionCliente button[type='submit']", false);
    }
}

function renderFacturacionCliente(data, fechaDesde, fechaHasta) {
    const tbody = $("#tablaFacturacionCliente");
    renderFacturacionClienteChart(data);
    const facturas = data.reduce((sum, item) => sum + Number(item.cantidadFacturas || 0), 0);
    const total = data.reduce((sum, item) => sum + Number(item.totalFacturado || 0), 0);
    $("#totalFacturasCliente").textContent = numberFormatter.format(facturas);
    $("#totalFacturadoCliente").textContent = currencyFormatter.format(total);
    $("#infoFacturacionCliente").textContent = `Período: ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}. ${data.length} tipo(s) de cliente.`;
    $("#exportarFacturacionCliente").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No se encontraron facturas para el período seleccionado.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.tipoCliente)}</td>
            <td class="text-end">${numberFormatter.format(item.cantidadFacturas ?? 0)}</td>
            <td class="text-end fw-semibold">${currencyFormatter.format(item.totalFacturado ?? 0)}</td>
            <td class="text-end">${currencyFormatter.format(item.promedioPorFactura ?? 0)}</td>
        </tr>
    `).join("");
}

/* REPORTE 6 - MAXI: GET /api/report/stock-minimo?nombreSucursal= */
async function consultarStockMinimo() {
    ocultarMensaje();
    const nombreSucursal = $("#sucursalStockMinimo").value;
    const params = new URLSearchParams();
    if (nombreSucursal) params.set("nombreSucursal", nombreSucursal);

    setLoading("#formStockMinimo button[type='submit']", true);
    try {
        const query = params.toString();
        const respuesta = await apiGet(`${API_REPORT}/stock-minimo${query ? `?${query}` : ""}`);
        stockMinimoData = Array.isArray(respuesta) ? respuesta : [];
        renderStockMinimo(stockMinimoData, nombreSucursal);
    } catch (error) {
        stockMinimoData = [];
        renderStockMinimo([], nombreSucursal);
        mostrarMensaje(error.message);
    } finally {
        setLoading("#formStockMinimo button[type='submit']", false);
    }
}

function renderStockMinimo(data, nombreSucursal) {
    const tbody = $("#tablaStockMinimo");
    renderStockMinimoChart(data);
    const faltante = data.reduce((sum, item) => sum + Number(item.faltanteReposicion || 0), 0);
    $("#totalStockMinimo").textContent = numberFormatter.format(data.length);
    $("#totalFaltanteReposicion").textContent = numberFormatter.format(faltante);
    $("#infoStockMinimo").textContent = `${nombreSucursal ? `Sucursal: ${nombreSucursal}` : "Todas las sucursales"}. ${data.length} producto(s) requieren reposición.`;
    $("#exportarStockMinimo").disabled = data.length === 0;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No se encontraron productos por debajo del stock mínimo.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHTML(item.sucursal)}</td>
            <td>${escapeHTML(item.codigo)}</td>
            <td>${escapeHTML(item.producto)}</td>
            <td class="text-end">${numberFormatter.format(item.cantidadActual ?? 0)}</td>
            <td class="text-end">${numberFormatter.format(item.stockMinimo ?? 0)}</td>
            <td class="text-end fw-semibold"><span class="badge-atraso">${numberFormatter.format(item.faltanteReposicion ?? 0)}</span></td>
        </tr>
    `).join("");
}

/* GRÁFICOS: se alimentan exclusivamente de los DTO devueltos por la API. */
function prepararCanvas(chartKey, canvasId, emptyId, data) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (reportCharts[chartKey]) { reportCharts[chartKey].destroy(); reportCharts[chartKey] = null; }
    if (!canvas || !empty) return null;
    if (!Array.isArray(data) || data.length === 0) {
        canvas.classList.add("hidden"); empty.textContent = "No hay datos para representar con los filtros seleccionados."; empty.classList.add("visible"); return null;
    }
    if (typeof Chart === "undefined") {
        canvas.classList.add("hidden"); empty.textContent = "No se pudo cargar Chart.js. Verificá la conexión a internet."; empty.classList.add("visible"); return null;
    }
    canvas.classList.remove("hidden"); empty.classList.remove("visible");
    return canvas.getContext("2d");
}

function renderStockSucursalChart(data) {
    const ctx = prepararCanvas("stockSucursal", "chartStockSucursal", "emptyChartStockSucursal", data);
    if (!ctx) return;
    reportCharts.stockSucursal = new Chart(ctx, {
        type: "bar",
        data: { labels: data.map(x => String(x.sucursal ?? "Sucursal sin nombre")), datasets: [
            { label: "Cantidad actual", data: data.map(x => Number(x.cantidadActual ?? 0)), backgroundColor: "#2563eb", borderRadius: 5 },
            { label: "Stock mínimo", data: data.map(x => Number(x.stockMinimo ?? 0)), backgroundColor: "#93c5fd", borderRadius: 5 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${numberFormatter.format(c.parsed.y)} unidades` } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Unidades" } }, x: { grid: { display: false } } } }
    });
}

function renderVentasChart(data) {
    const ctx = prepararCanvas("ventas", "chartVentas", "emptyChartVentas", data);
    if (!ctx) return;
    // Se conserva la granularidad del DTO: empleado + sucursal + período.
    const labels = data.map(x => `${x.empleado ?? "Empleado"} · ${x.sucursal ?? "Sucursal"} · ${x.periodo ?? "Período"}`);
    reportCharts.ventas = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Total vendido", data: data.map(x => Number(x.totalVentas ?? 0)), backgroundColor: "#2563eb", borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => currencyFormatter.format(c.parsed.x) } } }, scales: { x: { beginAtZero: true, title: { display: true, text: "Total vendido (ARS)" }, ticks: { callback: value => currencyFormatter.format(value), maxTicksLimit: 7 } }, y: { grid: { display: false } } } }
    });
}

function renderFacturacionClienteChart(data) {
    const ctx = prepararCanvas("facturacionCliente", "chartFacturacionCliente", "emptyChartFacturacionCliente", data);
    if (!ctx) return;
    reportCharts.facturacionCliente = new Chart(ctx, {
        type: "doughnut",
        data: { labels: data.map(x => String(x.tipoCliente ?? "Sin tipo")), datasets: [{ data: data.map(x => Number(x.totalFacturado ?? 0)), backgroundColor: chartPalette, borderColor: "#ffffff", borderWidth: 2, hoverOffset: 7 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: c => { const total = c.dataset.data.reduce((sum, value) => sum + Number(value || 0), 0); const amount = Number(c.parsed || 0); const pct = total > 0 ? amount / total * 100 : 0; return `${c.label}: ${currencyFormatter.format(amount)} (${pct.toFixed(1)}%)`; } } } } }
    });
}

function renderStockMinimoChart(data) {
    const ordered = [...data].sort((a, b) => Number(b.faltanteReposicion ?? 0) - Number(a.faltanteReposicion ?? 0)).slice(0, 10);
    const ctx = prepararCanvas("stockMinimo", "chartStockMinimo", "emptyChartStockMinimo", ordered);
    if (!ctx) return;
    const labels = ordered.map(x => `${x.producto ?? "Producto"} · ${x.sucursal ?? "Sucursal"}`);
    reportCharts.stockMinimo = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Faltante para reposición", data: ordered.map(x => Number(x.faltanteReposicion ?? 0)), backgroundColor: "#2563eb", borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${numberFormatter.format(c.parsed.x)} unidades faltantes` } } }, scales: { x: { beginAtZero: true, title: { display: true, text: "Unidades faltantes" }, ticks: { precision: 0 } }, y: { grid: { display: false } } } }
    });
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


function generarPDF(reporte) {
    const datos = reporte.datos();

    if (!datos.length) {
        mostrarMensaje("No hay datos para exportar.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();
        const azul = [30, 58, 138];
        const margen = 14;

        // Encabezado
        doc.setFillColor(...azul);
        doc.rect(0, 0, ancho, 29, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19);
        doc.text("FERRETERIA TRONKA", margen, 14);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("REPORTE DE GESTION", margen, 21);

        // Título y fecha
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(reporte.titulo, margen, 40);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);

        const fecha = new Date().toLocaleString("es-AR");
        doc.text(`Generado: ${fecha}`, margen, 47);
        doc.text(reporte.filtro(), margen, 53);

        // Indicadores
        const resumen = reporte.resumen();

        resumen.forEach(([etiqueta, valor], index) => {
            const x = margen + index * 85;

            doc.setFillColor(239, 246, 255);
            doc.roundedRect(x, 60, 80, 22, 3, 3, "F");

            doc.setTextColor(71, 85, 105);
            doc.setFontSize(9);
            doc.text(etiqueta, x + 5, 68);

            doc.setTextColor(...azul);
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text(String(valor), x + 5, 77);
        });

        let posicionTabla = 92;

        // Gráfico existente de Chart.js
        if (reporte.grafico) {
            const canvas = document.getElementById(reporte.grafico);

            if (canvas && window.Chart?.getChart(canvas)) {
                const imagen = canvas.toDataURL("image/png");

                // Mantener proporción del gráfico
                const anchoGrafico = 160;
                const altoGrafico = Math.min(
                    78,
                    anchoGrafico * canvas.height / canvas.width
                );

                doc.addImage(
                    imagen, "PNG", margen, 88,
                    anchoGrafico, altoGrafico
                );

                posicionTabla = 88 + altoGrafico + 10;
            }
        }

        // Tabla
        doc.autoTable({
            startY: posicionTabla,
            head: [reporte.columnas],
            body: reporte.filas(datos),
            theme: "striped",
            margin: {
                left: margen,
                right: margen,
                top: 15,
                bottom: 17
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: "linebreak"
            },
            headStyles: {
                fillColor: azul,
                textColor: 255,
                fontStyle: "bold"
            },
            alternateRowStyles: {
                fillColor: [241, 245, 249]
            },
            didDrawPage: () => {
                const pagina = doc.internal.getNumberOfPages();

                doc.setFontSize(8);
                doc.setTextColor(120, 130, 145);
                doc.text(
                    "Ferreteria Tronka - Reporte de gestion",
                    margen,
                    alto - 9
                );
                doc.text(
                    `Pagina ${pagina}`,
                    ancho - margen,
                    alto - 9,
                    { align: "right" }
                );
            }
        });

        doc.save(reporte.archivo);

    } catch (error) {
        console.error("Error al generar PDF:", error);
        mostrarMensaje("No se pudo generar el archivo PDF.");
    }
}
