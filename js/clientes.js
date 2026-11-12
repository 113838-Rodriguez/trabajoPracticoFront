const API_BASE_URL = "https://localhost:7236/api/Clientes";

const tablaClientes = document.getElementById("tablaClientes");
const formCliente = document.getElementById("formCliente");
const panelFormulario = document.getElementById("panelFormulario");
const mensaje = document.getElementById("mensaje");

let clientes = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarClientes();
    document.getElementById("btnNuevo").addEventListener("click", nuevoCliente);
    document.getElementById("btnCerrarFormulario").addEventListener("click", ocultarFormulario);
    document.getElementById("btnCancelar").addEventListener("click", ocultarFormulario);
    document.getElementById("buscarCliente").addEventListener("input", filtrarClientes);
    formCliente.addEventListener("submit", guardarCliente);
});

async function cargarClientes() {
    tablaClientes.innerHTML = '<tr><td colspan="8" class="text-center py-4">Cargando...</td></tr>';
    try {
        const respuesta = await fetch(API_BASE_URL);
        if (!respuesta.ok) throw new Error(await obtenerError(respuesta));
        clientes = await respuesta.json();
        renderizarClientes(clientes);
    } catch (error) {
        tablaClientes.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">No se pudieron cargar los clientes.</td></tr>';
        mostrarMensaje(`Error de conexión: ${error.message}. Verificá la URL de la API y CORS.`, "danger");
    }
}

function renderizarClientes(lista) {
    document.getElementById("cantidadClientes").textContent =
        `${lista.length} cliente${lista.length === 1 ? "" : "s"}`;

    if (!lista.length) {
        tablaClientes.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay clientes para mostrar.</td></tr>';
        return;
    }

    tablaClientes.innerHTML = lista.map(c => `
        <tr>
            <td>${escapar(c.clienteId)}</td>
            <td>${escapar([c.nombre, c.apellido].filter(Boolean).join(" "))}</td>
            <td>${escapar(c.razonSocial || "—")}</td>
            <td>${escapar(c.dni || "—")}</td>
            <td>${escapar(c.cuil || "—")}</td>
            <td>${escapar(c.tipoClienteDescripcion || "—")}</td>
            <td>${formatearFecha(c.fechaAlta)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline-primary btn-sm" title="Consultar / editar"
                        onclick="editarCliente(${Number(c.clienteId)})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" title="Dar de baja"
                        onclick="eliminarCliente(${Number(c.clienteId)})">
                        <i class="bi bi-person-x"></i>
                    </button>
                </div>
            </td>
        </tr>`).join("");
}

function filtrarClientes() {
    const texto = document.getElementById("buscarCliente").value.trim().toLowerCase();
    const filtrados = clientes.filter(c =>
        [c.nombre, c.apellido, c.razonSocial, c.dni, c.cuil, c.tipoClienteDescripcion]
            .some(valor => String(valor || "").toLowerCase().includes(texto))
    );
    renderizarClientes(filtrados);
}

function nuevoCliente() {
    formCliente.reset();
    document.getElementById("clienteId").value = "";
    document.getElementById("activo").checked = true;
    document.getElementById("tituloFormulario").textContent = "Registrar cliente";
    document.getElementById("estadoContainer").style.display = "none";
    document.getElementById("btnGuardar").innerHTML = '<i class="bi bi-check-lg"></i> Guardar cliente';
    panelFormulario.classList.add("visible");
    panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function editarCliente(id) {
    try {
        const respuesta = await fetch(`${API_BASE_URL}/${id}`);
        if (!respuesta.ok) throw new Error(await obtenerError(respuesta));
        const c = await respuesta.json();

        document.getElementById("clienteId").value = c.clienteId;
        document.getElementById("nombre").value = c.nombre || "";
        document.getElementById("apellido").value = c.apellido || "";
        document.getElementById("razonSocial").value = c.razonSocial || "";
        document.getElementById("dni").value = c.dni || "";
        document.getElementById("cuil").value = c.cuil || "";
        document.getElementById("tipoClienteId").value = c.tipoClienteId || "";
        document.getElementById("domicilioId").value = c.domicilioId ?? "";
        document.getElementById("activo").checked = c.activo ?? true;

        document.getElementById("tituloFormulario").textContent = `Modificar cliente #${id}`;
        document.getElementById("estadoContainer").style.display = "block";
        document.getElementById("btnGuardar").innerHTML = '<i class="bi bi-check-lg"></i> Guardar cambios';
        panelFormulario.classList.add("visible");
        panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        mostrarMensaje(`No se pudo consultar el cliente: ${error.message}`, "danger");
    }
}

async function guardarCliente(evento) {
    evento.preventDefault();

    const id = document.getElementById("clienteId").value;
    const tipoClienteId = Number(document.getElementById("tipoClienteId").value);
    const domicilioTexto = document.getElementById("domicilioId").value.trim();

    const datos = {
        nombre: document.getElementById("nombre").value.trim(),
        apellido: valorONull("apellido"),
        razonSocial: valorONull("razonSocial"),
        cuil: valorONull("cuil"),
        dni: valorONull("dni"),
        tipoClienteId: tipoClienteId,
        domicilioId: domicilioTexto ? Number(domicilioTexto) : null,
        activo: id ? document.getElementById("activo").checked : true
    };

    if (!datos.nombre || !Number.isInteger(tipoClienteId) || tipoClienteId <= 0) {
        mostrarMensaje("Completá el nombre y un ID de tipo de cliente válido.", "warning");
        return;
    }

    const boton = document.getElementById("btnGuardar");
    boton.disabled = true;

    try {
        const respuesta = await fetch(id ? `${API_BASE_URL}/${id}` : API_BASE_URL, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (!respuesta.ok) throw new Error(await obtenerError(respuesta));

        mostrarMensaje(id ? "Cliente modificado correctamente." : "Cliente creado exitosamente.", "success");
        ocultarFormulario();
        await cargarClientes();
    } catch (error) {
        mostrarMensaje(`No se pudo guardar el cliente: ${error.message}`, "danger");
    } finally {
        boton.disabled = false;
    }
}

async function eliminarCliente(id) {
    const cliente = clientes.find(c => Number(c.clienteId) === id);
    const nombre = cliente ? `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() : `#${id}`;
    if (!confirm(`¿Querés dar de baja al cliente ${nombre}?`)) return;

    try {
        const respuesta = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
        if (!respuesta.ok) throw new Error(await obtenerError(respuesta));
        mostrarMensaje("Cliente dado de baja correctamente.", "success");
        await cargarClientes();
    } catch (error) {
        mostrarMensaje(`No se pudo dar de baja el cliente: ${error.message}`, "danger");
    }
}

function ocultarFormulario() {
    panelFormulario.classList.remove("visible");
    formCliente.reset();
    document.getElementById("clienteId").value = "";
}

function valorONull(id) {
    const valor = document.getElementById(id).value.trim();
    return valor || null;
}

function formatearFecha(fecha) {
    if (!fecha) return "—";
    const partes = String(fecha).split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[caracter]));
}

async function obtenerError(respuesta) {
    try {
        const contenido = await respuesta.json();
        return contenido.message || contenido.title || `HTTP ${respuesta.status}`;
    } catch {
        return `HTTP ${respuesta.status}`;
    }
}

function mostrarMensaje(texto, tipo) {
    mensaje.className = `alert alert-${tipo}`;
    mensaje.textContent = texto;
    mensaje.classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => mensaje.classList.add("d-none"), 6000);
}
