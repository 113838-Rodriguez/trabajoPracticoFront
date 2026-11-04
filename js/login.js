const API_URL = "https://localhost:7236";

document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";

    try {
        const response = await fetch(`${API_URL}/api/Auth/Login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombreUsuario: usuario,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            mensajeError.textContent = data.message || "Error al iniciar sesión";
            mensajeError.classList.remove("d-none");
            return;
        }

        sessionStorage.setItem("token", data.token);

        console.log("Login exitoso");

    } catch (error) {
        console.error(error);

        mensajeError.textContent = "No se pudo conectar con el servidor";
        mensajeError.classList.remove("d-none");
    }
});