// =============================================
// CONFIGURACIÓN
// =============================================
const API = "https://localhost:7236/api";
const URL_CLIENTES = `${API}/Clientes`;
const URL_TIPOS = `${URL_CLIENTES}/tipo`;
const URL_PROVINCIAS = `${API}/provincias`;

let modalCliente;

// =============================================
// HTTP
// =============================================
function obtenerHeaders() {
    const token = sessionStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };

    // No enviar "Bearer null" cuando la API no requiere autenticación.
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

async function peticion(url, opciones = {}) {
    let respuesta;

    try {
        respuesta = await fetch(url, {
            ...opciones,
            headers: {
                ...obtenerHeaders(),
                ...(opciones.headers || {})
            }
        });
    } catch (error) {
        throw new Error("No se pudo conectar con la API. Verificá que el backend esté iniciado y que la URL/HTTPS sea correcta.");
    }

    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
        try { datos = JSON.parse(texto); }
        catch { datos = texto; }
    }

    if (!respuesta.ok) {
        const mensaje = datos?.message || datos?.title || datos ||
            `Error HTTP ${respuesta.status}`;
        throw new Error(typeof mensaje === "string" ? mensaje : JSON.stringify(mensaje));
    }

    return datos;
}

// =============================================
// UTILIDADES DE INTERFAZ
// =============================================
function elemento(id) {
    const control = document.getElementById(id);
    if (!control) throw new Error(`No se encontró el elemento #${id} en el HTML.`);
    return control;
}

function mostrarMensaje(texto, tipo = "info") {
    const contenedor = document.getElementById("mensaje");
    if (!contenedor) return;

    contenedor.replaceChildren();
    const alerta = document.createElement("div");
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.setAttribute("role", "alert");
    alerta.textContent = texto;

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "btn-close";
    cerrar.setAttribute("data-bs-dismiss", "alert");
    cerrar.setAttribute("aria-label", "Cerrar");

    alerta.appendChild(cerrar);
    contenedor.appendChild(alerta);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function llenarSelect(select, items, idPropiedad, textoPropiedad, placeholder, deduplicarDescripcion = false) {
    select.replaceChildren(new Option(placeholder, ""));
    const vistos = new Set();

    items.forEach(item => {
        const id = item[idPropiedad];
        const descripcion = String(item[textoPropiedad] ?? "").trim();
        const clave = deduplicarDescripcion
            ? descripcion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
            : String(id);

        if (!descripcion || vistos.has(clave)) return;
        vistos.add(clave);
        select.add(new Option(descripcion, id));
    });
}

function limpiarSelect(id, placeholder) {
    const select = elemento(id);
    select.replaceChildren(new Option(placeholder, ""));
    select.value = "";
    // Los combos permanecen habilitados; se muestran sin opciones hasta elegir el nivel anterior.
    select.disabled = false;
}


// =============================================
// NORMALIZAR TEXTOS PARA EVITAR DUPLICADOS
// =============================================
function normalizarTexto(texto) {
    return String(texto ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ");
}

// =============================================
// ELIMINAR ELEMENTOS DUPLICADOS
// =============================================
function eliminarDuplicados(lista, propiedad = "descripcion") {
    const valoresUnicos = new Set();

    return lista.filter(item => {
        const valor = normalizarTexto(item[propiedad]);

        if (!valor || valoresUnicos.has(valor)) {
            return false;
        }

        valoresUnicos.add(valor);
        return true;
    });
}

// =============================================
// COMBOS: TIPOS Y UBICACIONES
// =============================================
async function cargarTiposClientes(seleccionado = "") {
    const tipos = await peticion(URL_TIPOS);

    if (!Array.isArray(tipos)) {
        throw new Error("La API de tipos de cliente no devolvió una lista.");
    }

    llenarSelect(
        elemento("tipoClienteId"),
        eliminarDuplicados(tipos),
        "tipoClienteId",
        "descripcion",
        "Seleccione un tipo de cliente"
    );

    elemento("tipoClienteId").value = seleccionado ?? "";
}

// =============================================
// PROVINCIAS
// =============================================
async function cargarProvincias(seleccionada = "") {
    const provincias = await peticion(URL_PROVINCIAS);

    if (!Array.isArray(provincias)) {
        throw new Error("La API de provincias no devolvió una lista.");
    }

    const provinciasUnicas = eliminarDuplicados(provincias);

    llenarSelect(
        elemento("provinciaId"),
        provinciasUnicas,
        "provinciaId",
        "descripcion",
        "Seleccione provincia"
    );

    elemento("provinciaId").value = seleccionada ?? "";
}

// =============================================
// CIUDADES
// =============================================
async function cargarCiudades(provinciaId, seleccionada = "") {
    limpiarSelect("ciudadId", "Seleccione ciudad");
    limpiarSelect("barrioId", "Seleccione barrio");

    if (!provinciaId) return;

    const ciudades = await peticion(
        `${URL_PROVINCIAS}/${encodeURIComponent(provinciaId)}/ciudades`
    );

    if (!Array.isArray(ciudades)) {
        throw new Error("La API de ciudades no devolvió una lista.");
    }

    const ciudadesUnicas = eliminarDuplicados(ciudades);

    llenarSelect(
        elemento("ciudadId"),
        ciudadesUnicas,
        "ciudadId",
        "descripcion",
        "Seleccione ciudad"
    );

    elemento("ciudadId").value = seleccionada ?? "";
}

// =============================================
// BARRIOS
// =============================================
async function cargarBarrios(ciudadId, seleccionado = "") {
    limpiarSelect("barrioId", "Seleccione barrio");

    if (!ciudadId) return;

    const barrios = await peticion(
        `${URL_PROVINCIAS}/ciudades/${encodeURIComponent(ciudadId)}/barrios`
    );

    if (!Array.isArray(barrios)) {
        throw new Error("La API de barrios no devolvió una lista.");
    }

    const barriosUnicos = eliminarDuplicados(barrios);

    llenarSelect(
        elemento("barrioId"),
        barriosUnicos,
        "barrioId",
        "descripcion",
        "Seleccione barrio"
    );

    elemento("barrioId").value = seleccionado ?? "";
}


// =============================================
// FORMULARIO
// =============================================
function limpiarFormulario() {
    elemento("formCliente").reset();
    elemento("clienteId").value = "";
    limpiarSelect("ciudadId", "Seleccione ciudad");
    limpiarSelect("barrioId", "Seleccione barrio");
    elemento("formCliente").classList.remove("was-validated");
}

async function nuevoCliente() {
    limpiarFormulario();
    elemento("tituloModal").textContent = "Registrar cliente";
    elemento("btnGuardar").innerHTML = '<i class="bi bi-save"></i> Guardar cliente';
    elemento("btnGuardar").disabled = true;

    try {
        await Promise.all([cargarTiposClientes(), cargarProvincias()]);
        elemento("btnGuardar").disabled = false;
        modalCliente.show();
    } catch (error) {
        elemento("btnGuardar").disabled = false;
        mostrarMensaje(error.message, "danger");
    }
}

function construirDomicilio() {
    const provinciaId = elemento("provinciaId").value;
    const ciudadId = elemento("ciudadId").value;
    const barrioValor = elemento("barrioId").value;

    const calle = elemento("calle").value.trim();
    const numero = elemento("numero").value.trim();
    const piso = elemento("piso").value.trim();
    const departamento = elemento("departamento").value.trim();

    const tieneDatos = Boolean(
        provinciaId || ciudadId || barrioValor || calle || numero || piso || departamento
    );

    if (!tieneDatos) return null;

    return {
        calle: calle || null,
        numero: numero || null,
        piso: piso || null,
        departamento: departamento || null,
        barrioId: barrioValor ? Number(barrioValor) : null
    };
}

function construirCliente() {
    const tipoClienteId = Number(elemento("tipoClienteId").value);

    const cliente = {
        nombre: elemento("nombre").value.trim(),
        apellido: elemento("apellido").value.trim() || null,
        razonSocial: elemento("razonSocial").value.trim() || null,
        dni: elemento("dni").value.trim() || null,
        cuil: elemento("cuil").value.trim() || null,
        tipoClienteId,
        domicilio: construirDomicilio()
    };

    if (cliente.nombre.length < 2) {
        modalCliente.hide();
        throw new Error("El nombre debe tener al menos 2 caracteres.");
    }
    if (!Number.isInteger(tipoClienteId) || tipoClienteId <= 0) {
        modalCliente.hide();    
        throw new Error("Seleccioná un tipo de cliente válido.");
    }
    if (cliente.dni && !/^\d{7,8}$/.test(cliente.dni)) {
        modalCliente.hide();
        throw new Error("El DNI debe contener entre 7 y 8 números.");
    }
    if (cliente.cuil && !/^\d{2}-?\d{8}-?\d$/.test(cliente.cuil)) {
        throw new Error("El CUIL debe tener el formato 20-12345678-9 o 20123456789.");
    }

    return cliente;
}

async function guardarCliente(evento) {
    evento.preventDefault();

    const form = elemento("formCliente");
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const boton = elemento("btnGuardar");
    const id = elemento("clienteId").value;

    try {
        const cliente = construirCliente();
        boton.disabled = true;

        if (id) {
            await peticion(`${URL_CLIENTES}/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: JSON.stringify(cliente)
            });
            mostrarMensaje("Cliente modificado correctamente.", "success");
        } else {
            await peticion(URL_CLIENTES, {
                method: "POST",
                body: JSON.stringify(cliente)
            });
            mostrarMensaje("Cliente registrado correctamente.", "success");
        }

        modalCliente.hide();
        limpiarFormulario();
        await cargarClientes();
    } catch (error) {
        mostrarMensaje(error.message, "danger");
    } finally {
        boton.disabled = false;
    }
}

// =============================================
// TABLA DE CLIENTES
// =============================================
function nombreCliente(cliente) {
    return cliente.razonSocial ||
        `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() ||
        "Sin nombre";
}

function agregarCelda(fila, valor) {
    const celda = document.createElement("td");
    celda.textContent = valor ?? "-";
    fila.appendChild(celda);
}

async function cargarClientes() {
    const tabla = elemento("tablaClientes");
    tabla.innerHTML = '<tr><td colspan="6" class="text-center">Cargando clientes...</td></tr>';

    try {
        const clientes = await peticion(URL_CLIENTES);
        tabla.replaceChildren();

        if (!Array.isArray(clientes) || clientes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const fila = document.createElement("tr");
            agregarCelda(fila, nombreCliente(cliente));
            agregarCelda(fila, cliente.dni);
            agregarCelda(fila, cliente.cuil);
            agregarCelda(fila, cliente.tipoClienteDescripcion);
            agregarCelda(fila, cliente.fechaAlta);

            const acciones = document.createElement("td");
            const editar = document.createElement("button");
            editar.type = "button";
            editar.className = "btn btn-sm btn-warning me-1";
            editar.title = "Editar cliente";
            editar.innerHTML = '<i class="bi bi-pencil"></i>';
            editar.addEventListener("click", () => editarCliente(cliente.clienteId));

            const eliminar = document.createElement("button");
            eliminar.type = "button";
            eliminar.className = "btn btn-sm btn-danger";
            eliminar.title = "Dar de baja";
            eliminar.innerHTML = '<i class="bi bi-trash"></i>';
            eliminar.addEventListener("click", () => eliminarCliente(cliente.clienteId));

            acciones.append(editar, eliminar);
            fila.appendChild(acciones);
            tabla.appendChild(fila);
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-danger">No se pudieron cargar los clientes.</td></tr>';
        mostrarMensaje(error.message, "danger");
    }
}

async function cargarInactivos() {
    const tabla = elemento("tablaInactivos");

    try {
        const clientes = await peticion(`${URL_CLIENTES}/inactivos`);
        tabla.replaceChildren();

        if (!Array.isArray(clientes) || clientes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center">No hay clientes dados de baja.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const fila = document.createElement("tr");
            agregarCelda(fila, nombreCliente(cliente));
            agregarCelda(fila, cliente.dni);
            agregarCelda(fila, cliente.tipoClienteDescripcion);

            const acciones = document.createElement("td");
            const reactivar = document.createElement("button");
            reactivar.type = "button";
            reactivar.className = "btn btn-sm btn-success";
            reactivar.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Reactivar';
            reactivar.disabled = !cliente.dni;
            reactivar.addEventListener("click", () => reactivarCliente(cliente.dni));
            acciones.appendChild(reactivar);
            fila.appendChild(acciones);
            tabla.appendChild(fila);
        });
    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

// =============================================
// EDICIÓN
// =============================================
async function editarCliente(id) {
    try {
        // Limpiar el formulario antes de cargar los datos
        limpiarFormulario();

        // Obtener cliente por ID
        const cliente = await peticion(
            `${URL_CLIENTES}/${encodeURIComponent(id)}`
        );

        // Cargar datos personales
        elemento("clienteId").value = cliente.clienteId;
        elemento("nombre").value = cliente.nombre ?? "";
        elemento("apellido").value = cliente.apellido ?? "";
        elemento("razonSocial").value = cliente.razonSocial ?? "";
        elemento("dni").value = cliente.dni ?? "";
        elemento("cuil").value = cliente.cuil ?? "";

        // Cargar listas y seleccionar el tipo de cliente
        await Promise.all([
            cargarTiposClientes(cliente.tipoClienteId),
            cargarProvincias(cliente.domicilio?.provinciaId ?? "")
        ]);

        // Cargar domicilio si existe
        if (cliente.domicilio) {
            await cargarDomicilio(cliente.domicilio);
        }

        // Configurar modal para edición
        elemento("tituloModal").textContent = "Modificar cliente";
        elemento("btnGuardar").innerHTML =
            '<i class="bi bi-save"></i> Guardar cambios';

        modalCliente.show();

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}


// ==========================================
// CARGAR DOMICILIO DEL CLIENTE
// ==========================================

async function cargarDomicilio(domicilio) {

    const campos = {
        calle: domicilio.calle,
        numero: domicilio.numero,
        piso: domicilio.piso,
        departamento: domicilio.departamento
    };

    Object.entries(campos).forEach(([id, valor]) => {
        elemento(id).value = valor ?? "";
    });

    // Cargar ciudades y barrios respetando sus dependencias
    await cargarCiudades(
        domicilio.provinciaId,
        domicilio.ciudadId
    );

    await cargarBarrios(
        domicilio.ciudadId,
        domicilio.barrioId
    );
}

// =============================================
// BAJA Y REACTIVACIÓN
// =============================================
async function eliminarCliente(id) {
    if (!confirm("¿Está seguro de que desea dar de baja este cliente?")) return;

    try {
        await peticion(`${URL_CLIENTES}/${encodeURIComponent(id)}`, { method: "DELETE" });
        mostrarMensaje("Cliente dado de baja correctamente.", "success");
        await cargarClientes();
        await cargarInactivos();
    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

async function reactivarCliente(dni) {
    if (!confirm(`¿Desea reactivar al cliente con DNI ${dni}?`)) return;

    try {
        await peticion(`${URL_CLIENTES}/reactivar`, {
            method: "POST",
            body: JSON.stringify({ dni })
        });
        mostrarMensaje("Cliente reactivado correctamente.", "success");
        await cargarClientes();
        await cargarInactivos();
    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

// =============================================
// INICIALIZACIÓN Y EVENTOS
// =============================================
document.addEventListener("DOMContentLoaded", async () => {
    const modalElement = elemento("modalCliente");
    modalCliente = bootstrap.Modal.getOrCreateInstance(modalElement);

    elemento("btnNuevo").addEventListener("click", nuevoCliente);
    elemento("formCliente").addEventListener("submit", guardarCliente);

    elemento("provinciaId").addEventListener("change", async event => {
        try { await cargarCiudades(event.target.value); }
        catch (error) { mostrarMensaje(error.message, "danger"); }
    });

    elemento("ciudadId").addEventListener("change", async event => {
        try { await cargarBarrios(event.target.value); }
        catch (error) { mostrarMensaje(error.message, "danger"); }
    });

    const tabInactivos = document.querySelector('[data-bs-target="#inactivos"]');
    if (tabInactivos) tabInactivos.addEventListener("shown.bs.tab", cargarInactivos);

    // btnLogout es opcional: esta pantalla no lo incluye en su HTML.
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem("token");
            window.location.replace("../Login/login.html");
        });
    }

    await cargarClientes();
});
