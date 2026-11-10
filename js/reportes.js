
// ==========================================
// ELEMENTOS DEL DOM
// ==========================================
const reportSection = document.getElementById("reportSection");

const formProductos = document.getElementById("formProductos");
const formVentas = document.getElementById("formVentas");
const formEntregas = document.getElementById("formEntregas");

const reportTitle = document.getElementById("reportTitle");
const reportDescription = document.getElementById("reportDescription");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

const resultsContainer = document.getElementById("resultsContainer");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const resultCount = document.getElementById("resultCount");

const sucursalSelect = document.getElementById("sucursal");
const empleadoSelect = document.getElementById("empleado");

// ==========================================
// CONFIGURACION INICIAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("anio").value = new Date().getFullYear();

    document.getElementById("fechaReferencia").value =
        obtenerFechaActual();
    document.getElementById("fechaReferencia").min = "2020-01-01";

    cargarSucursales();
});

function obtenerFechaActual() {

    const fecha = new Date();

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

// ==========================================
// SELECCION DE REPORTES
// ==========================================
function seleccionarReporte(tipo) {
    limpiarResultados();
    ocultarFormularios();

    reportSection.classList.remove("hidden");

    switch (tipo) {
        case "productos":
            reportTitle.textContent = "Productos sin ventas";
            reportDescription.textContent =
                "Consultá los productos que no registraron ventas durante los últimos N días.";

            formProductos.classList.remove("hidden");
            break;

        case "ventas":
            reportTitle.textContent = "Ventas por empleado y sucursal";
            reportDescription.textContent =
                "Filtrá las ventas mensuales por año, sucursal y empleado.";

            formVentas.classList.remove("hidden");
            break;

        case "entregas":
            reportTitle.textContent = "Entregas atrasadas";
            reportDescription.textContent =
                "Consultá los pedidos y reposiciones atrasados según una fecha de referencia.";

            formEntregas.classList.remove("hidden");
            break;
    }

    reportSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function cerrarReporte() {

    reportSection.classList.add("hidden");

    ocultarFormularios();
    limpiarResultados();
}

function ocultarFormularios() {

    formProductos.classList.add("hidden");
    formVentas.classList.add("hidden");
    formEntregas.classList.add("hidden");
}

// ==========================================
// CONSULTA 1 - PRODUCTOS SIN VENTAS
// ==========================================
formProductos.addEventListener("submit", async (e) => {

    e.preventDefault();

    const dias = Number(document.getElementById("dias").value);

    if (!Number.isInteger(dias) || dias <= 0) {
        mostrarError("Ingresá una cantidad de días mayor a cero.");
        return;
    }

    try {

        iniciarConsulta();

        const datos = await obtenerProductosSinVentas(dias);

        const columnas = [
            { titulo: "Código", campo: "codigo" },
            { titulo: "Descripción", campo: "descripcion" },
            { titulo: "Stock actual", campo: "stockActual" },
            { titulo: "Precio unitario", campo: "precioUnitario", formato: "moneda" },
            { titulo: "Capital inmovilizado", campo: "capitalInmovilizado", formato: "moneda" }
        ];

        mostrarResultados(datos, columnas);

    }
    catch (error) {

        mostrarError(error.message);

    }
    finally {

        finalizarConsulta();

    }

});


// ==========================================
// CONSULTA 3 - SUCURSALES
// ==========================================
async function cargarSucursales() {

    try {
        const sucursales = await obtenerSucursales();

        sucursalSelect.innerHTML =
            '<option value="">Todas las sucursales</option>';

        sucursales.forEach(sucursal => {

            const option = document.createElement("option");

            option.value = sucursal.sucursalID;
            option.textContent = sucursal.descripcion;

            sucursalSelect.appendChild(option);

        });
    }
    catch (error) {
        console.error("Error al cargar sucursales:", error);
    }
}


// ==========================================
// CONSULTA 3 - EMPLEADOS POR SUCURSAL
// ==========================================
sucursalSelect.addEventListener("change", async () => {

    const sucursalID = sucursalSelect.value;

    empleadoSelect.innerHTML =
        '<option value="">Todos los empleados</option>';

    empleadoSelect.disabled = true;

    if (!sucursalID)
        return;

    try {
        const empleados = await obtenerEmpleados(sucursalID);

        empleados.forEach(empleado => {
            const option = document.createElement("option");

            option.value = empleado.empleadoID;
            option.textContent = empleado.nombre;

            empleadoSelect.appendChild(option);
        });

        empleadoSelect.disabled = false;
    }
    catch (error) {
        mostrarError(error.message);
    }

});


// ==========================================
// CONSULTA 3 - VENTAS POR EMPLEADO
// ==========================================

formVentas.addEventListener("submit", async (e) => {
    e.preventDefault();

    const anio = Number(document.getElementById("anio").value);

    const sucursalID = sucursalSelect.value;
    const empleadoId = empleadoSelect.value;

    const anioActual = new Date().getFullYear();

    if (!Number.isInteger(anio) || anio < 2000 || anio > anioActual) {
        mostrarError(`Ingresá un año entre 2000 y ${anioActual}.`);
        return;
    }

    try {
        iniciarConsulta();

        const filtros = {
            anio: anio,
            sucursalID: sucursalID,
            empleadoId: empleadoId
        };

        const datos = await obtenerVentas(filtros);

        const columnas = [
            { titulo: "Sucursal", campo: "sucursal" },
            { titulo: "Período", campo: "periodo" },
            { titulo: "Empleado", campo: "empleado" },
            { titulo: "Cantidad de facturas", campo: "cantidadFacturas" },
            { titulo: "Total de ventas", campo: "totalVentas", formato: "moneda" }
        ];

        mostrarResultados(datos, columnas);

    }
    catch (error) {

        mostrarError(error.message);

    }
    finally {

        finalizarConsulta();

    }

});


// ==========================================
// CONSULTA 5 - ENTREGAS ATRASADAS
// ==========================================

formEntregas.addEventListener("submit", async (e) => {

    e.preventDefault();

    const fecha = document.getElementById("fechaReferencia").value;

    if (!fecha) {

        mostrarError("Seleccioná una fecha de referencia.");
        return;

    }

    try {

        iniciarConsulta();

        const datos = await obtenerEntregasAtrasadas(fecha);

        const columnas = [
            { titulo: "Tipo", campo: "tipo" },
            { titulo: "N.º de orden", campo: "numeroOrden" },
            { titulo: "Cliente / Proveedor", campo: "clienteProveedor" },
            { titulo: "Estado actual", campo: "estadoActual" },
            { titulo: "Fecha estimada", campo: "fechaEntregaEstimada", formato: "fecha" },
            { titulo: "Días de atraso", campo: "diasAtraso" },
            { titulo: "Unidades pendientes", campo: "unidadesPendientes" }
        ];

        mostrarResultados(datos, columnas);

    }
    catch (error) {

        mostrarError(error.message);

    }
    finally {

        finalizarConsulta();

    }

});


// ==========================================
// MOSTRAR RESULTADOS EN DATAGRID
// ==========================================

function mostrarResultados(datos, columnas) {

    limpiarResultados();

    if (!Array.isArray(datos) || datos.length === 0) {

        mostrarError("No se encontraron resultados para los filtros seleccionados.");
        return;

    }

    // Crear encabezados

    const encabezado = document.createElement("tr");

    columnas.forEach(columna => {

        const th = document.createElement("th");

        th.textContent = columna.titulo;

        encabezado.appendChild(th);

    });

    tableHead.appendChild(encabezado);


    // Crear filas

    datos.forEach(registro => {

        const fila = document.createElement("tr");

        columnas.forEach(columna => {

            const td = document.createElement("td");

            let valor = registro[columna.campo];

            if (valor === null || valor === undefined) {
                valor = "-";
            }
            else if (columna.formato === "moneda") {

                valor = Number(valor).toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS"
                });

            }
            else if (columna.formato === "fecha") {

                const fecha = String(valor).substring(0, 10);
                const partes = fecha.split("-");

                valor = partes.length === 3
                    ? `${partes[2]}/${partes[1]}/${partes[0]}`
                    : valor;

            }

            td.textContent = valor;

            fila.appendChild(td);

        });

        tableBody.appendChild(fila);

    });

    resultCount.textContent =
        `${datos.length} registro(s) encontrado(s)`;

    resultsContainer.classList.remove("hidden");

}


// ==========================================
// CONTROL DE ESTADOS
// ==========================================

function iniciarConsulta() {

    limpiarResultados();

    errorMessage.classList.add("hidden");

    loading.classList.remove("hidden");

}

function finalizarConsulta() {

    loading.classList.add("hidden");

}

function limpiarResultados() {

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    resultsContainer.classList.add("hidden");
    errorMessage.classList.add("hidden");

    resultCount.textContent = "0 registros";

}

function mostrarError(mensaje) {

    errorMessage.textContent = mensaje;

    errorMessage.classList.remove("hidden");
}

// ==========================================
// FUNCIONES GLOBALES
// ==========================================
window.seleccionarReporte = seleccionarReporte;
window.cerrarReporte = cerrarReporte;