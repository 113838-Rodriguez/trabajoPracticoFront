document.addEventListener("DOMContentLoaded", () => {
    const token = sessionStorage.getItem("token");

    let rol = null;

    if (token) {
        try {
            const payload = JSON.parse(
                atob(
                    token.split(".")[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );

            console.log("Payload JWT:", payload);

            rol = payload.role ||
                  payload.Role ||
                  payload.rol ||
                  payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

        } catch (error) {
            console.error("Error al leer el token:", error);
        }
    }

    const esAdmin = String(rol).toLowerCase() === "admin";

    console.log("Rol detectado:", rol);
    console.log("¿Es Admin?:", esAdmin);

    document.querySelectorAll(".menu-admin").forEach(elemento => {
        elemento.style.setProperty(
            "display",
            esAdmin ? "flex" : "none",
            "important"
        );
    });
});