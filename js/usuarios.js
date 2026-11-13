
const API_URL = "https://localhost:7236/api/Usuarios";

const token = sessionStorage.getItem("token");

if (!token) {
    window.location.replace("../Login/login.html");
} else {
    cargarUsuarios();
}

// ==========================================
// LISTAR USUARIOS
// ==========================================

async function cargarUsuarios() {
    const tabla = document.getElementById("tablaUsuarios");
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.classList.add("d-none");
    tabla.innerHTML = "";

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.replace("../Login/login.html");
            return;
        }

        if (response.status === 403) {
            throw new Error("No tenés permisos para administrar usuarios.");
        }

        if (!response.ok) {
            throw new Error("No se pudieron obtener los usuarios");
        }

        const usuarios = await response.json();

        if (usuarios.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="text-center text-muted py-4">
                        No hay usuarios registrados.
                    </td>
                </tr>
            `;
            return;
        }

        usuarios.forEach(usuario => {
            const fila = document.createElement("tr");

            // DATOS DEL USUARIO
            const columnas = [
                usuario.usuarioId,
                usuario.nombreUsuario,
                usuario.rol
            ];

            columnas.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor ?? "";
                fila.appendChild(celda);
            });

            // ESTADO
            const celdaEstado = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = usuario.activo
                ? "badge bg-success-subtle text-success"
                : "badge bg-danger-subtle text-danger";

            badge.textContent = usuario.activo
                ? "Activo"
                : "Inactivo";

            celdaEstado.appendChild(badge);
            fila.appendChild(celdaEstado);

            // ACCIONES
            const acciones = document.createElement("td");

            const btnEliminar = document.createElement("button");
            btnEliminar.type = "button";

            btnEliminar.className =
                "btn btn-sm btn-outline-danger";

            btnEliminar.innerHTML = `
                <i class="bi bi-person-x"></i>
                Dar de baja
            `;

            // No permitir dar de baja usuarios inactivos
            if (!usuario.activo) {
                btnEliminar.disabled = true;
            }

            btnEliminar.addEventListener("click", () => {
                eliminarUsuario(
                    usuario.usuarioId,
                    usuario.nombreUsuario,
                    btnEliminar
                );
            });

            acciones.appendChild(btnEliminar);
            fila.appendChild(acciones);

            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar usuarios:", error);

        mensajeError.textContent = error.message;
        mensajeError.classList.remove("d-none");
    }
}

// ==========================================
// ELIMINAR / DESACTIVAR USUARIO
// ==========================================

async function eliminarUsuario(id, nombreUsuario, boton) {

    const confirmar = confirm(
        `¿Estás seguro de que querés dar de baja al usuario "${nombreUsuario}"?`
    );

    if (!confirmar) {
        return;
    }

    boton.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.replace("../Login/login.html");
            return;
        }

        if (response.status === 403) {
            throw new Error("No tenés permisos para eliminar usuarios.");
        }

        if (!response.ok) {
            const error = await response.text();

            throw new Error(
                error || "No se pudo dar de baja al usuario."
            );
        }

        alert("Usuario desactivado correctamente.");

        // Actualizar listado
        await cargarUsuarios();

    } catch (error) {
        console.error("Error al eliminar usuario:", error);

        alert(error.message);

        boton.disabled = false;
    }
}
