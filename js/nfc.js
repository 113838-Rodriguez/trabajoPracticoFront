
const API_NFC = "https://localhost:7236";

const btnLoginNFC = document.getElementById("btnLoginNFC");
const estadoNFC = document.getElementById("estadoNFC");

let intervaloNFC = null;

btnLoginNFC.addEventListener("click", async () => {
    try {
        btnLoginNFC.disabled = true;
        estadoNFC.classList.remove("d-none");
        estadoNFC.textContent = "Preparando login NFC...";

        const response = await fetch(
            `${API_NFC}/api/Auth/NFC/Iniciar`,
            { method: "POST" }
        );

        if (!response.ok) {
            throw new Error("No se pudo iniciar NFC");
        }

        const data = await response.json();

        const solicitudId = data.solicitudId;
        const clave = data.claveConsulta;

        estadoNFC.textContent =
            "Esperando autorización NFC...";

        let intentos = 0;

        intervaloNFC = setInterval(async () => {
            try {
                intentos++;

                if (intentos > 60) {
                    clearInterval(intervaloNFC);
                    intervaloNFC = null;
                    estadoNFC.textContent =
                        "La solicitud NFC expiró. Intentá nuevamente.";
                    btnLoginNFC.disabled = false;
                    return;
                }

                const estadoResponse = await fetch(
                    `${API_NFC}/api/Auth/NFC/Estado/${solicitudId}?clave=${encodeURIComponent(clave)}`
                );

                if (!estadoResponse.ok) return;

                const estado = await estadoResponse.json();

                if (estado.autorizado && estado.token) {
                    clearInterval(intervaloNFC);
                    intervaloNFC = null;

                    sessionStorage.setItem("token", estado.token);

                    window.location.href =
                        "../Principal/index.html";
                }
            } catch (error) {
                console.error("Error consultando NFC:", error);
            }
        }, 2000);

    } catch (error) {
        console.error(error);
        estadoNFC.textContent =
            "No se pudo conectar con el servidor NFC.";
        btnLoginNFC.disabled = false;
    }
});
