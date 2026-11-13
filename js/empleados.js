
const API_URL = "https://localhost:7236/api/Empleados";

const token = sessionStorage.getItem("token");

if (!token) {
    window.location.replace("../Login/login.html");
} else {
    cargarEmpleados();
}

// ==========================================
// LISTAR EMPLEADOS
// ==========================================

async function cargarEmpleados() {

    const tabla = document.getElementById("tablaEmpleados");
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";

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
            throw new Error("No tenés permisos para consultar empleados.");
        }

        if (!response.ok) {
            throw new Error("No se pudieron obtener los empleados.");
        }

        const empleados = await response.json();

        tabla.innerHTML = "";

        if (empleados.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        No hay empleados registrados.
                    </td>
                </tr>
            `;
            return;
        }

        empleados.forEach(empleado => {

            const fila = document.createElement("tr");

            // DATOS DEL EMPLEADO
            const columnas = [
                empleado.empleadoId,
                empleado.nombre,
                empleado.apellido,
                empleado.dni,
                empleado.cuil,
                empleado.fechaIngreso
            ];

            columnas.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor ?? "-";
                fila.appendChild(celda);
            });

            // ==================================
            // COLUMNA ACCIONES
            // ==================================

            const acciones = document.createElement("td");

            const btnEliminar = document.createElement("button");

            btnEliminar.type = "button";
            btnEliminar.className = "btn btn-sm btn-outline-danger";

            btnEliminar.innerHTML = `
                <i class="bi bi-trash"></i> Eliminar
            `;

            btnEliminar.addEventListener("click", () => {
                eliminarEmpleado(
                    empleado.empleadoId,
                    `${empleado.nombre} ${empleado.apellido}`,
                    btnEliminar
                );
            });

            acciones.appendChild(btnEliminar);
            fila.appendChild(acciones);

            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar empleados:", error);

        mensajeError.textContent = error.message;
        mensajeError.classList.remove("d-none");
    }
}

// ==========================================
// ELIMINAR EMPLEADO
// ==========================================

async function eliminarEmpleado(id, nombreCompleto, boton) {

    const confirmar = confirm(
        `¿Estás seguro de que querés eliminar al empleado "${nombreCompleto}"?`
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
            throw new Error("No tenés permisos para eliminar empleados.");
        }

        if (response.status === 404) {
            throw new Error("El empleado no existe.");
        }

        if (!response.ok) {
            const mensaje = await response.text();

            throw new Error(
                mensaje || "No se pudo eliminar al empleado."
            );
        }

        alert("Empleado eliminado correctamente.");

        await cargarEmpleados();

    } catch (error) {
        console.error("Error al eliminar empleado:", error);

        alert(error.message);

    } finally {
        boton.disabled = false;
    }
}
