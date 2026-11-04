
const token = sessionStorage.getItem("token");

function cerrarSesion() {
    sessionStorage.removeItem("token");
    window.location.replace("../Login/login.html");
}

if (!token) {
    cerrarSesion();
} else {
    try {
        const payloadBase64 = token.split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const payload = JSON.parse(atob(payloadBase64));

        if (!payload.exp || payload.exp * 1000 <= Date.now()) {
            cerrarSesion();
        } else {
            const nombreUsuario = payload[
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
            ] ?? payload.unique_name ?? payload.name ?? "Usuario";

            const rol = payload[
                "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
            ] ?? payload.role;

            document.getElementById("usuarioActual").textContent =
                `${nombreUsuario} (${rol ?? "Sin rol"})`;

            if (rol !== "Admin") {
                document.querySelectorAll(".admin-only").forEach(elemento => {
                    elemento.classList.add("d-none");
                });
            }
        }
    } catch (error) {
        cerrarSesion();
    }
}

document.getElementById("btnLogout").addEventListener("click", cerrarSesion);
