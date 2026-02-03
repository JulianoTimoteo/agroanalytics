// mobile-fixes.js
// Correções específicas para mobile
class MobileOptimizer {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.menuOpen = false;
        this.init();
    }

    init() {
        // 1. Detectar mobile
        this.detectMobile();
        
        // 2. Inicializar menu mobile
        this.initMobileMenu();
        
        // 3. Corrigir gráficos para mobile
        this.fixChartsForMobile();
        
        // 4. Adicionar touch events
        this.addTouchEvents();
        
        // 5. Prevenir zoom em inputs
        this.preventInputZoom();
        
        // 6. Otimizar performance
        this.optimizePerformance();
        
        // 7. Listen para resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    detectMobile() {
        // Detecção de user agent mais confiável
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        this.isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) || (window.innerWidth <= 768);
        
        if (this.isMobile) {
            document.body.classList.add('is-mobile');
        }
    }

    initMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle-btn');
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = document.getElementById('menu-backdrop');
        
        if (!menuToggle || !menuContainer) return;
        
        // Toggle do menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
            
            // Corrige o bug de clique no desktop (que não deveria existir, mas garante)
            if (!this.isMobile && menuContainer.classList.contains('open')) {
                this.closeMobileMenu();
            }
        });
        
        // Fechar menu ao clicar no backdrop
        if (menuBackdrop) {
            menuBackdrop.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
        
        // Fechar menu ao clicar em um link
        const menuLinks = menuContainer.querySelectorAll('.tab-button');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.menuOpen) {
                    // Adiciona um pequeno delay para a transição
                    setTimeout(() => this.closeMobileMenu(), 100);
                }
                
                // No contexto do app.js, a função showTab já trata de fechar o menu, mas adicionamos o fallback aqui.
                if (window.agriculturalDashboard && window.agriculturalDashboard.showTab) {
                    const tabId = link.getAttribute('onclick').match(/showTab\('([^']+)'/)[1];
                    window.agriculturalDashboard.showTab(tabId);
                }
            });
        });
        
        // Fechar menu ao pressionar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = document.getElementById('menu-backdrop');
        const body = document.body;
        
        this.menuOpen = !this.menuOpen;
        
        if (menuContainer) {
            menuContainer.classList.toggle('open', this.menuOpen);
        }
        
        if (menuBackdrop) {
            menuBackdrop.classList.toggle('active', this.menuOpen);
            menuBackdrop.style.display = this.menuOpen ? 'block' : 'none';
        }
        
        // Previne scroll do body quando menu está aberto
        body.classList.toggle('no-scroll', this.menuOpen);
        
        // Garante que o menu do app.js seja notificado (se existir)
        if (window.agriculturalDashboard && window.agriculturalDashboard.toggleMenu) {
            // O app.js.toggleMenu original é substituído pelo método aqui para ter controle sobre o DOM
        }
    }

    closeMobileMenu() {
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = document.getElementById('menu-backdrop');
        const body = document.body;
        
        this.menuOpen = false;
        
        if (menuContainer) {
            menuContainer.classList.remove('open');
        }
        
        if (menuBackdrop) {
            menuBackdrop.classList.remove('active');
            menuBackdrop.style.display = 'none';
        }
        
        body.classList.remove('no-scroll');
    }

    fixChartsForMobile() {
        // Encontra todos os gráficos e garante que eles sejam redimensionados.
        if (!this.isMobile) return;
        
        setTimeout(() => {
            if (window.agriculturalDashboard && window.agriculturalDashboard.visualizer && window.agriculturalDashboard.visualizer.resizeCharts) {
                window.agriculturalDashboard.visualizer.resizeCharts();
            }
        }, 500);
    }

    addTouchEvents() {
        if (!this.isMobile) return;
        
        // Touch feedback para botões
        const buttons = document.querySelectorAll('button, .tab-button, .btn-primary');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('touch-active');
            }, { passive: true });
            
            button.addEventListener('touchend', () => {
                button.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    preventInputZoom() {
        if (!this.isMobile) return;
        
        // Adiciona atributo para prevenir zoom
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'none');
            input.setAttribute('spellcheck', 'false');
        });
    }

    optimizePerformance() {
        // Regras de performance já estão principalmente no CSS.
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            // Se o modo mudou (e.g., de landscape para desktop), fechar menu
            if (!this.isMobile && this.menuOpen) {
                this.closeMobileMenu();
            }
            if (this.isMobile && window.agriculturalDashboard && window.agriculturalDashboard.resizeCharts) {
                 window.agriculturalDashboard.resizeCharts();
            }
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimizer = new MobileOptimizer();
    
    // Adicionar a função de toggle do MobileOptimizer ao objeto do dashboard
    if (window.agriculturalDashboard) {
        // Redefine o toggleMenu do app.js para usar a lógica do MobileOptimizer
        window.agriculturalDashboard.toggleMenu = (forceClose) => window.mobileOptimizer.toggleMobileMenu(forceClose);
    }
});

// Adicionar ao evento de carregamento da página
window.addEventListener('load', () => {
    // Forçar resize dos gráficos após tudo carregar
    setTimeout(() => {
        if (window.mobileOptimizer) {
            window.mobileOptimizer.fixChartsForMobile();
        }
    }, 1500);
});