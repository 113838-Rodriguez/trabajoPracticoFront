
const API_URL = "http://localhost:5000/api/Producto"; // entorno Agus usa [http:] 
// const API_URL = "https://localhost:7236/api/Producto"; // entorno Fabri usa [https:]

let codigoOriginalEdicion = null;

// INICIALIZACION

document.addEventListener("DOMContentLoaded", () => {

    cargarProductos();

    document.getElementById("formBuscarProducto")
        .addEventListener("submit", buscarProducto);

    // LIMPIAR BUSQUEDA
    document.getElementById("btnMostrarTodos")
        .addEventListener("click", () => {

            document.getElementById("codigoBusqueda").value = "";
            cargarProductos();
        });

    // CAMBIO DE FILTRO
    document.getElementById("filtroEstado")
        .addEventListener("change", () => {

            document.getElementById("codigoBusqueda").value = "";
            cargarProductos();
        });
});



// BUSQUEDA POR CODIGO
async function buscarProducto(event) {

    event.preventDefault();

    const codigo = document.getElementById("codigoBusqueda")
        .value.trim();

    if (codigo === "") {
        await cargarProductos();
        return;
    }

    await cargarProductos(codigo);
}


// CONSULTAR PRODUCTOS
async function cargarProductos(codigo = null) {

    const tabla = document.getElementById("tablaProductos");
    const mensajeError = document.getElementById("mensajeError");
    const total = document.getElementById("totalProductos");

    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";

    tabla.replaceChildren();
    mostrarFilaMensaje(tabla, "Cargando productos...");
    total.textContent = "";

    // Construir URL según la consulta
    const traerInactivos =
        document.getElementById("filtroEstado").value === "true";

    // Construir la URL
    const parametros = new URLSearchParams({
        traerInactivos: traerInactivos
    });

    if (codigo && codigo.trim() !== "") {
        parametros.append("codigoParcial", codigo.trim());
    }

    const url = `${API_URL}?${parametros.toString()}`;

    try {
        const token = sessionStorage.getItem("token");

        const headers = {};

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers: headers
        });

        // PRODUCTO NO ENCONTRADO
        if (response.status === 404 && codigo) {

            tabla.replaceChildren();

            mostrarFilaMensaje(
                tabla,
                "No se encontró un producto activo con ese código."
            );

            total.textContent = "0 productos encontrados";
            return;
        }

        if (response.status === 401) {
            throw new Error("La sesión no es válida o ha expirado.");
        }

        if (response.status === 403) {
            throw new Error("No tenés permisos para consultar productos.");
        }

        if (!response.ok) {
            throw new Error("No se pudieron obtener los productos.");
        }


        const data = await response.json();

        const productos = Array.isArray(data) ? data : [data];

        // Filtrar el estado seleccionado
        const productosFiltrados = productos.filter(
            p => p.activo === !traerInactivos
        );

        mostrarProductos(productosFiltrados);


    } catch (error) {

        console.error(error);

        mensajeError.textContent = error.message;
        mensajeError.classList.remove("d-none");

        tabla.replaceChildren();
        mostrarFilaMensaje(tabla, "No se pudo cargar el listado.");

        total.textContent = "";
    }
}


// MOSTRAR PRODUCTOS EN TABLA
function mostrarProductos(productos) {

    const tabla = document.getElementById("tablaProductos");
    const total = document.getElementById("totalProductos");

    tabla.replaceChildren();

    if (productos.length === 0) {

        const traerInactivos =
            document.getElementById("filtroEstado").value === "true";

        const mensaje = traerInactivos
            ? "No se encontraron productos inactivos."
            : "No se encontraron productos activos.";

        mostrarFilaMensaje(tabla, mensaje);

        total.textContent = "0 productos encontrados";
        return;
    }

    productos.forEach(producto => {

        const fila = document.createElement("tr");

        agregarCelda(fila, producto.codigo);
        agregarCelda(fila, producto.descripcion);
        agregarCelda(fila, producto.marca ?? "-");

        agregarCelda(
            fila,
            producto.categoriaProductoDescripcion
        );

        agregarCelda(
            fila,
            producto.tipoProductoDescripcion
        );

        // ESTADO
        const celdaEstado = document.createElement("td");
        const estado = document.createElement("span");

        estado.textContent = producto.activo
            ? "Activo"
            : "Inactivo";

        estado.className = producto.activo
            ? "estado-producto estado-activo"
            : "estado-producto estado-inactivo";

        celdaEstado.appendChild(estado);
        fila.appendChild(celdaEstado);



        // COLUMNA ACCIONES
        const celdaAcciones = document.createElement("td");

        if (producto.activo) {

            // BOTON EDITAR
            const btnEditar = document.createElement("button");

            btnEditar.type = "button";
            btnEditar.className = "btn btn-outline-primary btn-sm me-2";
            btnEditar.textContent = "Editar";

            btnEditar.setAttribute("data-bs-toggle", "modal");
            btnEditar.setAttribute("data-bs-target", "#modalNuevoProducto");
            btnEditar.dataset.codigo = producto.codigo;

            celdaAcciones.appendChild(btnEditar);

            // BOTON DAR DE BAJA
            const btnBaja = document.createElement("button");

            btnBaja.type = "button";
            btnBaja.className = "btn btn-outline-danger btn-sm";
            btnBaja.textContent = "Borrar";

            btnBaja.addEventListener("click", () => {
                darDeBajaProducto(producto.codigo);
            });

            celdaAcciones.appendChild(btnBaja);

        } else {

            // BOTON REACTIVAR
            const btnReactivar = document.createElement("button");

            btnReactivar.type = "button";
            btnReactivar.className = "btn btn-outline-success btn-sm";
            btnReactivar.textContent = "Reactivar";

            btnReactivar.addEventListener("click", () => {
                reactivarProducto(producto.codigo);
            });

            celdaAcciones.appendChild(btnReactivar);
        }

        fila.appendChild(celdaAcciones);

        tabla.appendChild(fila);
    });

    total.textContent =
        `${productos.length} productos encontrados`;
}


// FUNCIONES AUXILIARES
function agregarCelda(fila, valor) {

    const celda = document.createElement("td");
    celda.textContent = valor ?? "-";
    fila.appendChild(celda);
}

function mostrarFilaMensaje(tabla, mensaje) {

    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 7;
    celda.className = "text-center text-muted py-4";
    celda.textContent = mensaje;

    fila.appendChild(celda);
    tabla.appendChild(fila);
}


document.addEventListener("DOMContentLoaded", () => {

    // Preparar el formulario cada vez que se abre el modal
    document.getElementById("modalNuevoProducto")
        .addEventListener("show.bs.modal", prepararFormularioProducto);

    document.getElementById("formNuevoProducto")
        .addEventListener("submit", guardarProducto);

});



async function prepararFormularioProducto(event) {

    const botonOrigen = event.relatedTarget;

    // Si el boton tiene un codigo, estamos editando
    codigoOriginalEdicion = botonOrigen?.dataset.codigo ?? null;

    const esEdicion = codigoOriginalEdicion !== null;

    const formulario = document.getElementById("formNuevoProducto");
    const error = document.getElementById("errorAltaProducto");
    const btnGuardar = document.getElementById("btnGuardarNuevoProducto");

    const selectCategoria = document.getElementById("nuevaCategoria");
    const selectTipo = document.getElementById("nuevoTipo");

    // Limpiar el formulario anterior
    formulario.reset();
    error.classList.add("d-none");
    error.textContent = "";
    btnGuardar.disabled = true;

    // Adaptar el modal segun la operacion
    document.getElementById("tituloNuevoProducto").textContent =
        esEdicion ? "Editar producto" : "Nuevo producto";

    btnGuardar.textContent =
        esEdicion ? "Guardar cambios" : "Guardar producto";

    selectCategoria.replaceChildren(
        new Option("Cargando categorías...", "")
    );

    selectTipo.replaceChildren(
        new Option("Cargando tipos...", "")
    );

    try {

        const token = sessionStorage.getItem("token");
        const headers = {};

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        // Cargar categorias y tipos
        const [respuestaCategorias, respuestaTipos] = await Promise.all([
            fetch(`${API_URL}/categorias`, { headers }),
            fetch(`${API_URL}/tipos`, { headers })
        ]);

        if (!respuestaCategorias.ok || !respuestaTipos.ok) {
            throw new Error("No se pudieron cargar las categorías o tipos.");
        }

        const categorias = await respuestaCategorias.json();
        const tipos = await respuestaTipos.json();

        if (categorias.length === 0 || tipos.length === 0) {
            throw new Error("No hay categorías o tipos disponibles.");
        }

        cargarOpciones(selectCategoria, categorias);
        cargarOpciones(selectTipo, tipos);

        // Si estamos editando, recuperar los datos actuales
        if (esEdicion) {

            const response = await fetch(
                `${API_URL}/codigo/${encodeURIComponent(codigoOriginalEdicion)}`,
                { headers }
            );

            if (response.status === 404) {
                throw new Error("El producto ya no se encuentra disponible.");
            }

            if (!response.ok) {
                throw new Error("No se pudo obtener el producto.");
            }

            const producto = await response.json();

            // Completar el formulario
            document.getElementById("nuevoCodigo").value =
                producto.codigo;

            document.getElementById("nuevaDescripcion").value =
                producto.descripcion;

            document.getElementById("nuevaMarca").value =
                producto.marca ?? "";

            // Admitir ambas variantes de nombre JSON para los IDs
            selectCategoria.value = String(
                producto.categoriaProductoID ??
                producto.categoriaProductoId ?? ""
            );

            selectTipo.value = String(
                producto.tipoProductoID ??
                producto.tipoProductoId ?? ""
            );

            if (!selectCategoria.value || !selectTipo.value) {
                throw new Error(
                    "La categoría o el tipo del producto no está disponible."
                );
            }
        }

        btnGuardar.disabled = false;

    } catch (e) {

        console.error(e);
        error.textContent = e.message;
        error.classList.remove("d-none");
    }
}



// RELLENAR UN SELECT CON LAS OPCIONES DE LA API
function cargarOpciones(select, opciones) {

    select.replaceChildren(
        new Option("Seleccione una opción", "")
    );

    opciones.forEach(opcion => {

        select.appendChild(
            new Option(opcion.descripcion, opcion.id)
        );

    });
}

async function guardarProducto(event) {

    event.preventDefault();

    const error = document.getElementById("errorAltaProducto");
    const btnGuardar = document.getElementById("btnGuardarNuevoProducto");

    error.classList.add("d-none");
    error.textContent = "";

    // Construir el ProductoRequestDTO
    const producto = {

        codigo: document.getElementById("nuevoCodigo")
            .value.trim(),

        descripcion: document.getElementById("nuevaDescripcion")
            .value.trim(),

        marca: document.getElementById("nuevaMarca")
            .value.trim() || null,

        categoriaProductoId: Number(
            document.getElementById("nuevaCategoria").value
        ),

        tipoProductoId: Number(
            document.getElementById("nuevoTipo").value
        )
    };

    if (!producto.codigo || !producto.descripcion ||
        !producto.categoriaProductoId || !producto.tipoProductoId) {

        error.textContent = "Completá todos los campos obligatorios.";
        error.classList.remove("d-none");
        return;
    }

    // Determinar si es alta o modificacion
    const esEdicion = codigoOriginalEdicion !== null;

    const url = esEdicion
        ? `${API_URL}/codigo/${encodeURIComponent(codigoOriginalEdicion)}`
        : API_URL;

    const metodo = esEdicion ? "PUT" : "POST";

    btnGuardar.disabled = true;

    try {

        const token = sessionStorage.getItem("token");

        const headers = {
            "Content-Type": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {

            method: metodo,
            headers: headers,
            body: JSON.stringify(producto)
        });

        if (response.status === 409) {
            throw new Error(
                "Ya existe otro producto con ese código."
            );
        }

        if (response.status === 400) {
            throw new Error(
                "Los datos ingresados no son válidos."
            );
        }

        if (response.status === 404) {
            throw new Error(
                "El producto que intentás modificar no existe o está inactivo."
            );
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "No tenés autorización para realizar esta operación."
            );
        }

        if (!response.ok) {
            throw new Error(
                "Ocurrió un error al guardar el producto."
            );
        }

        // Operacion exitosa: cerrar el modal
        const modal = bootstrap.Modal.getInstance(
            document.getElementById("modalNuevoProducto")
        );

        modal.hide();

        // Volver al listado de productos activos
        document.getElementById("filtroEstado").value = "false";
        document.getElementById("codigoBusqueda").value = "";

        await cargarProductos();

        // Mostrar confirmacion
        const mensajeExito = document.getElementById("mensajeExito");

        mensajeExito.textContent = esEdicion
            ? "Producto modificado correctamente."
            : "Producto registrado correctamente.";

        mensajeExito.classList.remove("d-none");

    } catch (e) {

        console.error(e);

        error.textContent = e.message;
        error.classList.remove("d-none");

    } finally {

        btnGuardar.disabled = false;
    }
}


async function darDeBajaProducto(codigo) {

    const confirmar = confirm(
        `¿Seguro que querés dar de baja el producto ${codigo}?`
    );

    if (!confirmar) return;

    await cambiarEstadoProducto(
        codigo,
        "DELETE",
        `${API_URL}/codigo/${encodeURIComponent(codigo)}`,
        "Producto dado de baja correctamente."
    );
}


async function reactivarProducto(codigo) {

    const confirmar = confirm(
        `¿Querés reactivar el producto ${codigo}?`
    );

    if (!confirmar) return;

    await cambiarEstadoProducto(
        codigo,
        "PATCH",
        `${API_URL}/codigo/${encodeURIComponent(codigo)}`,
        "Producto reactivado correctamente."
    );
}


async function cambiarEstadoProducto(codigo, metodo, url, mensaje) {

    const mensajeError = document.getElementById("mensajeError");
    const mensajeExito = document.getElementById("mensajeExito");

    mensajeError.classList.add("d-none");
    mensajeExito.classList.add("d-none");

    try {

        const token = sessionStorage.getItem("token");
        const headers = {};

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: metodo,
            headers: headers
        });

        if (response.status === 404) {
            throw new Error(
                "El producto no existe o ya cambió de estado."
            );
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "No tenés autorización para realizar esta operación."
            );
        }

        if (!response.ok) {
            throw new Error(
                "No se pudo actualizar el estado del producto."
            );
        }

        // Actualizar el listado conservando los filtros
        const codigoBusqueda = document
            .getElementById("codigoBusqueda").value.trim();

        await cargarProductos(codigoBusqueda || null);

        mensajeExito.textContent = mensaje;
        mensajeExito.classList.remove("d-none");

    } catch (error) {

        console.error(error);

        mensajeError.textContent = error.message;
        mensajeError.classList.remove("d-none");
    }
}





