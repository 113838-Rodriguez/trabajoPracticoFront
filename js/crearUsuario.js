
const API_URL = "https://localhost:7236/api";
const token = sessionStorage.getItem("token");

const form = document.getElementById("formCrearUsuario");
const selectRol = document.getElementById("rolId");
const selectEmpleado = document.getElementById("empleadoId");
const mensaje = document.getElementById("mensaje");

// ========================================
// MOSTRAR MENSAJES
// ========================================

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo} mt-3`;
}

// ========================================
// VERIFICAR AUTENTICACIÓN
// ========================================

if (!token) {
    mostrarMensaje("No hay una sesión activa. Iniciá sesión nuevamente.", "danger");
    form.querySelector('button[type="submit"]').disabled = true;
}

// ========================================
// CARGAR ROLES
// ========================================

async function cargarRoles() {
    try {
        const response = await fetch(`${API_URL}/Roles`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("No se pudieron cargar los roles");
        }

        const roles = await response.json();

        selectRol.innerHTML =
            '<option value="">Seleccione un rol</option>';

        roles.forEach(rol => {
            const option = document.createElement("option");

            option.value = rol.rolId;
            option.textContent = rol.nombre;

            selectRol.appendChild(option);
        });

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

// ========================================
// CARGAR EMPLEADOS
// ========================================

async function cargarEmpleados() {
    try {
        const response = await fetch(`${API_URL}/Empleados`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("No se pudieron cargar los empleados");
        }

        const empleados = await response.json();

        selectEmpleado.innerHTML =
            '<option value="">Sin empleado asociado</option>';

        empleados.forEach(empleado => {
            const option = document.createElement("option");

            option.value = empleado.empleadoId;
            option.textContent =
                `${empleado.nombre} ${empleado.apellido}`;

            selectEmpleado.appendChild(option);
        });

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    }
}

// ========================================
// CREAR USUARIO
// ========================================

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nombreUsuario =
        document.getElementById("nombreUsuario").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmarPassword =
        document.getElementById("confirmarPassword").value;

    const rolId = Number(selectRol.value);

    const empleadoId = selectEmpleado.value
        ? Number(selectEmpleado.value)
        : null;

    // Validaciones
    if (!nombreUsuario) {
        mostrarMensaje("Ingresá un nombre de usuario", "danger");
        return;
    }

    if (!password) {
        mostrarMensaje("Ingresá una contraseña", "danger");
        return;
    }

    if (password !== confirmarPassword) {
        mostrarMensaje("Las contraseñas no coinciden", "danger");
        return;
    }

    if (!selectRol.value) {
        mostrarMensaje("Seleccioná un rol", "danger");
        return;
    }

    // DTO que espera el backend
    const usuario = {
        nombreUsuario,
        password,
        rolId,
        empleadoId
    };

    const boton = form.querySelector('button[type="submit"]');

    try {
        boton.disabled = true;
        boton.textContent = "Creando usuario...";

        const response = await fetch(`${API_URL}/Usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(usuario)
        });

        const resultado = await response.text();

        if (!response.ok) {
            throw new Error(resultado || "No se pudo crear el usuario");
        }

        mostrarMensaje("Usuario creado correctamente", "success");
        form.reset();

    } catch (error) {
        mostrarMensaje(error.message, "danger");

    } finally {
        boton.disabled = false;
        boton.textContent = "Crear usuario";
    }
});

// ========================================
// INICIALIZAR
// ========================================

if (token) {
    cargarRoles();
    cargarEmpleados();
}
