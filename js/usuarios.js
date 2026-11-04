
const API_URL = "https://localhost:7236/api/Usuarios";

const token = sessionStorage.getItem("token");

if (!token) {
    window.location.replace("../Login/login.html");
} else {
    cargarUsuarios();
}

async function cargarUsuarios() {
    const tabla = document.getElementById("tablaUsuarios");
    const mensajeError = document.getElementById("mensajeError");

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
            mensajeError.textContent = "No tenés permisos para administrar usuarios.";
            mensajeError.classList.remove("d-none");
            return;
        }

        if (!response.ok) {
            throw new Error("No se pudieron obtener los usuarios");
        }

        const usuarios = await response.json();

        tabla.innerHTML = "";

        usuarios.forEach(usuario => {
            const fila = document.createElement("tr");

            const columnas = [
                usuario.usuarioId,
                usuario.nombreUsuario,
                usuario.rol,
                usuario.activo ? "Activo" : "Inactivo"
            ];

            columnas.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            const acciones = document.createElement("td");
            acciones.textContent = "Pendiente";
            fila.appendChild(acciones);

            tabla.appendChild(fila);
        });

    } catch (error) {
        mensajeError.textContent = error.message;
        mensajeError.classList.remove("d-none");
    }
}
