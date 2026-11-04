const token = sessionStorage.getItem("token");

if (!token) {
    window.location.replace("../Login/login.html");
} else {
    try {
        const payload = JSON.parse(
            atob(
                token.split(".")[1]
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );

        const rol =
            payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
            || payload.role;

        const expirado = !payload.exp ||
            Date.now() >= payload.exp * 1000;

        if (expirado) {
            sessionStorage.removeItem("token");
            window.location.replace("../Login/login.html");
        } else if (rol !== "Admin") {
            window.location.replace("../Principal/index.html");
        }

    } catch (error) {
        sessionStorage.removeItem("token");
        window.location.replace("../Login/login.html");
    }
}
