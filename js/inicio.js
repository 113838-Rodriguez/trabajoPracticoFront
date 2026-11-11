document.addEventListener('DOMContentLoaded', () => {

    // 1. CIERRE AUTOMÁTICO DEL MENÚ EN CELULARES AL HACER CLIC EN UN ENLACE
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const navbarCollapse = document.getElementById('navbarInicio');
            
            // Si el menú colapsable existe y está abierto (.show)
            if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                // Obtenemos o creamos la instancia del menú colapsable de Bootstrap
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
                bsCollapse.hide();
            }
        });
    });

    // 2. VERIFICACIÓN OPCIONAL DE SESIÓN ACTIVA
    const token = sessionStorage.getItem('token');
    const btnLoginNav = document.querySelector('.navbar a[href*="login.html"]');

    if (token && btnLoginNav) {
        btnLoginNav.innerHTML = '<i class="bi bi-speedometer2 me-1"></i> Ir al Panel';
        btnLoginNav.setAttribute('href', '../Principal/index.html');
        btnLoginNav.classList.remove('btn-outline-light');
        btnLoginNav.classList.add('btn-light', 'text-primary', 'fw-bold');
    }

});