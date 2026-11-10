
const API_URL = "https://localhost:7236/api/Empleados";

const form = document.getElementById("formCrearEmpleado");
const mensaje = document.getElementById("mensaje");
const btnGuardar = document.getElementById("btnGuardar");

// Verificar que exista una sesión
const token = sessionStorage.getItem("token");


const API_PUESTOS = "https://localhost:7236/api/Puestos";
const API_SUCURSALES = "https://localhost:7236/api/Sucursales";
async function cargarPuestos() {

    const selectPuestos = document.getElementById("puestoId");
    const token = sessionStorage.getItem("token");

    selectPuestos.disabled = true;

    try {
        const response = await fetch(API_PUESTOS, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("No se pudieron cargar los puestos");
        }

        const puestos = await response.json();

        selectPuestos.innerHTML =
            '<option value="">Seleccione un puesto</option>';

        puestos.forEach(puesto => {

            const option = document.createElement("option");

            option.value = puesto.puestoId;
            option.textContent = puesto.descripcion;

            selectPuestos.appendChild(option);
        });

        selectPuestos.disabled = puestos.length === 0;

    } catch (error) {

        console.error("Error al cargar puestos:", error);

        selectPuestos.innerHTML =
            '<option value="">Error al cargar puestos</option>';

        selectPuestos.disabled = true;
    }
}


async function cargarSucursales() {

    const selectSucursales = document.getElementById("sucursalId");
    const token = sessionStorage.getItem("token");

    selectSucursales.disabled = true;

    try {
        const response = await fetch(API_SUCURSALES, {
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

        if (!response.ok) {
            throw new Error("No se pudieron cargar las sucursales");
        }

        const sucursales = await response.json();

        selectSucursales.innerHTML =
            '<option value="">Seleccione una sucursal</option>';

        sucursales.forEach(sucursal => {

            const option = document.createElement("option");

            option.value = sucursal.sucursalId;
            option.textContent = sucursal.descripcion;

            selectSucursales.appendChild(option);
        });

        selectSucursales.disabled = sucursales.length === 0;

    } catch (error) {

        console.error("Error al cargar sucursales:", error);

        selectSucursales.innerHTML =
            '<option value="">Error al cargar sucursales</option>';

        selectSucursales.disabled = true;
    }
}


if (!token) {
    window.location.replace("../Login/login.html");
}

// Evento para guardar empleado
form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.replace("../Login/login.html");
        return;
    }

    // Obtener datos del formulario
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const dni = document.getElementById("dni").value.trim();
    const cuil = document.getElementById("cuil").value.trim();
    const fechaIngreso = document.getElementById("fechaIngreso").value;

    const puestoId = Number(
        document.getElementById("puestoId").value
    );

    const sucursalId = Number(
        document.getElementById("sucursalId").value
    );

   

    // Construir objeto para enviar al backend
    const empleado = {
        nombre: nombre,
        apellido: apellido,
        dni: dni,
        cuil: cuil === "" ? null : cuil,
        fechaIngreso: fechaIngreso,
        puestoId: puestoId,
        sucursalId: sucursalId,
        domicilioId: null
    };

    // Ocultar mensajes anteriores
    mensaje.className = "alert d-none";

    // Deshabilitar botón mientras guarda
    btnGuardar.disabled = true;

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(empleado)
        });

        // Token inválido o vencido
        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.replace("../Login/login.html");
            return;
        }

        // Usuario sin permisos
        if (response.status === 403) {
            throw new Error(
                "No tenés permisos para crear empleados"
            );
        }

        // Error del backend
        if (!response.ok) {
            const error = await response.text();

            throw new Error(
                error || "No se pudo registrar el empleado"
            );
        }

        // Obtener respuesta del backend
        const resultado = await response.json();

        // Mostrar mensaje de éxito
        mensaje.textContent =
            `Empleado creado correctamente. ID: ${resultado.empleadoId}`;

        mensaje.className = "alert alert-success";

        // Limpiar formulario
        form.reset();

    } catch (error) {

        console.error("Error al crear empleado:", error);

        mensaje.textContent = error.message;
        mensaje.className = "alert alert-danger";

    } finally {

        btnGuardar.disabled = false;

    }
});
cargarPuestos();
cargarSucursales();