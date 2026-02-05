/**
 * MOBILE REVOLUTION JAVASCRIPT
 * Sistema completo de otimização mobile com:
 * - Suporte a rotação inteligente
 * - Gestos touch avançados (pinch, swipe, pan)
 * - Modo fullscreen para gráficos
 * - Performance otimizada
 * - Pull to refresh
 */

class MobileRevolution {
    constructor() {
        this.isMobile = this.detectMobile();
        this.orientation = this.getOrientation();
        this.menuOpen = false;
        this.fullscreenChart = null;
        this.touchStartY = 0;
        this.pullRefreshThreshold = 80;
        this.isPulling = false;
        this.orientationTimeout = null; // Adicionado para controle do Toast
        
        // Configurações de gestos
        this.gestureConfig = {
            swipeThreshold: 50,
            swipeVelocity: 0.3,
            pinchThreshold: 0.1,
            longPressDuration: 500
        };

        this.init();
    }

    init() {
        // Inicializa listeners mesmo em desktop para redimensionamento responsivo
        // if (!this.isMobile) return; // Removido para garantir funcionamento híbrido

        console.log('🚀 Mobile Revolution iniciado');

        // 1. Setup inicial e injeção de estilos
        this.setupMobileEnvironment();
        this._injectOrientationStyles(); // Migrado do app.js
        this._createOrientationToast();  // Migrado do app.js
        
        // 2. Detectar orientação
        this.handleOrientationChange();
        
        // 3. Inicializar menu mobile
        this.initMobileMenu();
        
        // 4. Configurar gráficos mobile
        this.setupMobileCharts();
        
        // 5. Adicionar controles de zoom
        this.addChartZoomControls();
        
        // 6. Configurar pull to refresh
        this.setupPullToRefresh();
        
        // 7. Otimizar performance
        this.optimizePerformance();
        
        // 8. Listeners de eventos
        this.attachEventListeners();
        
        // 9. Toast system
        this.initToastSystem();

        // 10. Skeleton loaders
        this.initSkeletonLoaders();

        // Verificação inicial de orientação
        setTimeout(() => this.checkOrientation(), 1000);
    }

    // ==========================================
    // DETECÇÃO E CONFIGURAÇÃO
    // ==========================================
    
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        const isMobileScreen = window.innerWidth <= 768;
        
        return isMobileUA || isMobileScreen;
    }

    getOrientation() {
        if (window.innerWidth > window.innerHeight) {
            return 'landscape';
        }
        return 'portrait';
    }

    setupMobileEnvironment() {
        document.body.classList.add('mobile-optimized');
        
        // Previne zoom duplo-toque
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Previne zoom em inputs
        this.preventInputZoom();

        // Adiciona meta tags dinamicamente se necessário
        this.ensureViewportMeta();
    }

    preventInputZoom() {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.style.fontSize = '16px'; // Previne zoom no iOS
            });
        });
    }

    ensureViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            document.head.appendChild(viewport);
        }
    }

    // ==========================================
    // LÓGICA DE VISUALIZAÇÃO E TOAST (MIGRADO)
    // ==========================================

    _createOrientationToast() {
        if (!document.getElementById('orientation-toast')) {
            const toast = document.createElement('div');
            toast.id = 'orientation-toast';
            toast.innerHTML = '<i class="fas fa-sync-alt"></i> Gire para ver melhor os gráficos';
            document.body.appendChild(toast);
        }
    }

    _injectOrientationStyles() {
        if (document.getElementById('mobile-rev-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'mobile-rev-styles';
        style.innerHTML = `
            #orientation-toast {
                position: fixed; 
                top: 20px; 
                left: 50%;
                transform: translateX(-50%) translateY(-150%);
                background-color: #0A0E17; 
                border: 1px solid #00D4FF; 
                color: #00D4FF;
                padding: 12px 24px; 
                border-radius: 50px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.8);
                z-index: 10000; 
                display: flex; 
                align-items: center; 
                gap: 12px;
                font-weight: 600; 
                font-size: 0.95rem; 
                opacity: 0;
                transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: none; 
                white-space: nowrap;
            }
            #orientation-toast.show { 
                transform: translateX(-50%) translateY(0);
                opacity: 1; 
            }
            #orientation-toast i { 
                font-size: 1.2rem; 
                animation: icon-wobble 2s infinite ease-in-out; 
            }
            @keyframes icon-wobble { 
                0%, 100% { transform: rotate(0deg); } 
                25% { transform: rotate(-15deg); } 
                75% { transform: rotate(15deg); } 
            }
        `;
        document.head.appendChild(style);
    }

    checkOrientation() {
        const toast = document.getElementById('orientation-toast');
        if (!toast) return;

        const isMobile = window.innerWidth <= 768;
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Tenta detectar a aba ativa (compatível com app.js)
        const activeTab = document.querySelector('.tab-pane.active');
        const isChartsTab = activeTab && activeTab.id === 'tab-moagem';

        // Mostra o aviso se: for mobile, estiver em pé (portrait) e na aba de gráficos
        if (isMobile && isPortrait && isChartsTab) {
            toast.classList.add('show');
            
            if (this.orientationTimeout) clearTimeout(this.orientationTimeout);
            
            this.orientationTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3500);
        } else {
            toast.classList.remove('show');
            if (this.orientationTimeout) clearTimeout(this.orientationTimeout);
        }
    }

    // ==========================================
    // ORIENTAÇÃO E ROTAÇÃO
    // ==========================================
    
    handleOrientationChange() {
        const updateOrientation = () => {
            const newOrientation = this.getOrientation();
            
            if (newOrientation !== this.orientation) {
                this.orientation = newOrientation;
                document.body.setAttribute('data-orientation', newOrientation);
                
                // Fecha menu se aberto
                if (this.menuOpen) this.closeMobileMenu();

                // Redimensiona gráficos
                this.resizeChartsForOrientation();
            }
            
            // Verifica se precisa mostrar o toast
            this.checkOrientation();
        };

        // Listeners de orientação
        window.addEventListener('orientationchange', updateOrientation);
        window.addEventListener('resize', () => {
            setTimeout(updateOrientation, 100);
        });

        // Executa uma vez no início
        updateOrientation();
    }

    resizeChartsForOrientation() {
        setTimeout(() => {
            if (window.agriculturalDashboard && 
                window.agriculturalDashboard.visualizer && 
                window.agriculturalDashboard.visualizer.resizeCharts) {
                window.agriculturalDashboard.visualizer.resizeCharts();
            }

            // Atualiza container de gráficos manualmente se necessário
            const chartContainers = document.querySelectorAll('.chart-container');
            chartContainers.forEach(container => {
                const canvas = container.querySelector('canvas');
                if (canvas && canvas.chart) {
                    canvas.chart.resize();
                }
            });
        }, 300);
    }

    // ==========================================
    // MENU MOBILE
    // ==========================================
    
    initMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle-btn');
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = this.createMenuBackdrop();
        
        if (!menuToggle || !menuContainer) return;

        // Toggle do menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
        });

        // Fechar ao clicar no backdrop
        if (menuBackdrop) {
            menuBackdrop.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Fechar ao clicar em um item do menu
        const menuLinks = menuContainer.querySelectorAll('.tab-button');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(() => this.closeMobileMenu(), 150);
            });
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuOpen) {
                this.closeMobileMenu();
            }
        });

        // Swipe para fechar
        this.addSwipeToCloseMenu(menuContainer);
    }

    createMenuBackdrop() {
        let backdrop = document.getElementById('menu-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'menu-backdrop';
            backdrop.className = 'menu-backdrop';
            document.body.appendChild(backdrop);
        }
        return backdrop;
    }

    toggleMobileMenu() {
        if (this.menuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = document.getElementById('menu-backdrop');
        
        this.menuOpen = true;
        
        if (menuContainer) {
            menuContainer.classList.add('open');
        }
        
        if (menuBackdrop) {
            menuBackdrop.classList.add('active');
            menuBackdrop.style.display = 'block';
        }
        
        document.body.classList.add('no-scroll');
    }

    closeMobileMenu() {
        const menuContainer = document.querySelector('.tabs-nav-container');
        const menuBackdrop = document.getElementById('menu-backdrop');
        
        this.menuOpen = false;
        
        if (menuContainer) {
            menuContainer.classList.remove('open');
        }
        
        if (menuBackdrop) {
            menuBackdrop.classList.remove('active');
            setTimeout(() => {
                menuBackdrop.style.display = 'none';
            }, 300);
        }
        
        document.body.classList.remove('no-scroll');
    }

    addSwipeToCloseMenu(menuContainer) {
        let startX = 0;
        let currentX = 0;
        
        menuContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        menuContainer.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            if (diff < -50) { // Swipe para esquerda
                menuContainer.style.transform = `translateX(${diff}px)`;
            }
        }, { passive: true });

        menuContainer.addEventListener('touchend', () => {
            const diff = currentX - startX;
            
            if (diff < -100) {
                this.closeMobileMenu();
            }
            
            menuContainer.style.transform = '';
            startX = 0;
            currentX = 0;
        }, { passive: true });
    }

    // ==========================================
    // GRÁFICOS MOBILE
    // ==========================================
    
    setupMobileCharts() {
        // Aguarda o dashboard estar pronto
        const checkDashboard = setInterval(() => {
            if (window.agriculturalDashboard) {
                clearInterval(checkDashboard);
                this.enhanceChartsForMobile();
            }
        }, 500);

        setTimeout(() => clearInterval(checkDashboard), 10000);
    }

    enhanceChartsForMobile() {
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach((container, index) => {
            // Adiciona wrapper se não existir
            if (!container.parentElement.classList.contains('chart-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'chart-wrapper';
                container.parentNode.insertBefore(wrapper, container);
                wrapper.appendChild(container);
            }

            // Adiciona controles mobile
            this.addMobileChartControls(container, index);
            
            // Configura gestos
            this.addChartGestures(container);
        });
    }

    addMobileChartControls(container, index) {
        const wrapper = container.closest('.chart-wrapper');
        if (!wrapper || wrapper.querySelector('.chart-controls-mobile')) return;

        const controls = document.createElement('div');
        controls.className = 'chart-controls-mobile';
        controls.innerHTML = `
            <button class="chart-btn-mobile chart-fullscreen-btn" data-chart-index="${index}" title="Tela cheia">
                <i class="fas fa-expand"></i>
            </button>
            <button class="chart-btn-mobile chart-info-btn" data-chart-index="${index}" title="Informações">
                <i class="fas fa-info"></i>
            </button>
        `;

        wrapper.appendChild(controls);

        // Event listeners
        const fullscreenBtn = controls.querySelector('.chart-fullscreen-btn');
        fullscreenBtn.addEventListener('click', () => {
            this.openChartFullscreen(container);
        });

        const infoBtn = controls.querySelector('.chart-info-btn');
        infoBtn.addEventListener('click', () => {
            this.showChartInfo(container);
        });
    }

    addChartGestures(container) {
        let scale = 1;
        let lastScale = 1;
        let startDistance = 0;

        // Pinch to zoom
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                startDistance = this.getDistance(e.touches[0], e.touches[1]);
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
                scale = lastScale * (currentDistance / startDistance);
                scale = Math.min(Math.max(scale, 0.5), 3); // Limita entre 0.5x e 3x
                
                container.style.transform = `scale(${scale})`;
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                lastScale = scale;
            }
        }, { passive: true });
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ==========================================
    // MODO FULLSCREEN
    // ==========================================
    
    openChartFullscreen(container) {
        const canvas = container.querySelector('canvas');
        if (!canvas) return;

        // Cria overlay
        const overlay = this.createFullscreenOverlay();
        
        // Clona o canvas
        const clonedCanvas = canvas.cloneNode(true);
        const chartData = canvas.chart ? canvas.chart.data : null;
        
        overlay.querySelector('.chart-fullscreen-content').appendChild(clonedCanvas);

        // Recria o gráfico no canvas clonado
        if (chartData && window.Chart) {
            const ctx = clonedCanvas.getContext('2d');
            const config = canvas.chart.config;
            
            new Chart(ctx, {
                ...config,
                options: {
                    ...config.options,
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        document.body.appendChild(overlay);
        document.body.classList.add('fullscreen-chart');
        
        setTimeout(() => overlay.classList.add('active'), 50);

        this.fullscreenChart = overlay;
    }

    createFullscreenOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'chart-fullscreen-overlay';
        overlay.innerHTML = `
            <div class="chart-fullscreen-header">
                <div class="chart-fullscreen-title">
                    <i class="fas fa-chart-bar"></i>
                    Visualização Ampliada
                </div>
                <button class="chart-fullscreen-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chart-fullscreen-content"></div>
        `;

        // Botão de fechar
        const closeBtn = overlay.querySelector('.chart-fullscreen-close');
        closeBtn.addEventListener('click', () => {
            this.closeChartFullscreen();
        });

        // Swipe down para fechar
        this.addSwipeToCloseFullscreen(overlay);

        return overlay;
    }

    closeChartFullscreen() {
        if (!this.fullscreenChart) return;

        this.fullscreenChart.classList.remove('active');
        
        setTimeout(() => {
            if (this.fullscreenChart && this.fullscreenChart.parentNode) {
                this.fullscreenChart.remove();
            }
            document.body.classList.remove('fullscreen-chart');
            this.fullscreenChart = null;
        }, 300);
    }

    addSwipeToCloseFullscreen(overlay) {
        let startY = 0;
        let currentY = 0;
        
        const header = overlay.querySelector('.chart-fullscreen-header');
        
        header.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        header.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0) {
                overlay.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: true });

        header.addEventListener('touchend', () => {
            const diff = currentY - startY;
            
            if (diff > 100) {
                this.closeChartFullscreen();
            }
            
            overlay.style.transform = '';
            startY = 0;
            currentY = 0;
        }, { passive: true });
    }

    showChartInfo(container) {
        const canvas = container.querySelector('canvas');
        if (!canvas || !canvas.chart) return;

        const chart = canvas.chart;
        const totalDatasets = chart.data.datasets.length;
        const visibleDatasets = chart.data.datasets.filter(d => !d.hidden).length;

        this.showToast(
            `📊 ${visibleDatasets}/${totalDatasets} séries visíveis\nToque nas legendas para mostrar/ocultar`,
            'info',
            3000
        );
    }

    // ==========================================
    // ZOOM E PAN
    // ==========================================
    
    addChartZoomControls() {
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            if (container.querySelector('.chart-zoom-controls')) return;

            const controls = document.createElement('div');
            controls.className = 'chart-zoom-controls';
            controls.innerHTML = `
                <button class="zoom-btn zoom-in" title="Aumentar zoom">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="zoom-btn zoom-reset" title="Resetar zoom">
                    <i class="fas fa-compress"></i>
                </button>
                <button class="zoom-btn zoom-out" title="Diminuir zoom">
                    <i class="fas fa-minus"></i>
                </button>
            `;

            container.appendChild(controls);

            // Event listeners
            const zoomIn = controls.querySelector('.zoom-in');
            const zoomOut = controls.querySelector('.zoom-out');
            const zoomReset = controls.querySelector('.zoom-reset');

            zoomIn.addEventListener('click', () => this.zoomChart(container, 1.2));
            zoomOut.addEventListener('click', () => this.zoomChart(container, 0.8));
            zoomReset.addEventListener('click', () => this.resetChartZoom(container));
        });
    }

    zoomChart(container, factor) {
        const currentScale = parseFloat(container.dataset.zoomScale || '1');
        const newScale = Math.min(Math.max(currentScale * factor, 0.5), 3);
        
        container.dataset.zoomScale = newScale;
        container.style.transform = `scale(${newScale})`;
        container.style.transformOrigin = 'center center';
    }

    resetChartZoom(container) {
        container.dataset.zoomScale = '1';
        container.style.transform = 'scale(1)';
    }

    // ==========================================
    // PULL TO REFRESH
    // ==========================================
    
    setupPullToRefresh() {
        const container = document.querySelector('.container');
        if (!container) return;

        // Cria indicador
        const indicator = document.createElement('div');
        indicator.className = 'pull-refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Puxe para atualizar';
        document.body.appendChild(indicator);

        let startY = 0;
        let pulling = false;

        container.addEventListener('touchstart', (e) => {
            if (container.scrollTop === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!pulling) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0 && diff < this.pullRefreshThreshold * 1.5) {
                indicator.style.transform = `translateX(-50%) translateY(${diff / 2}px)`;
                
                if (diff > this.pullRefreshThreshold) {
                    indicator.classList.add('active');
                    indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Solte para atualizar';
                } else {
                    indicator.classList.remove('active');
                    indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Puxe para atualizar';
                }
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (!pulling) return;

            const currentY = e.changedTouches[0].clientY;
            const diff = currentY - startY;

            if (diff > this.pullRefreshThreshold) {
                this.triggerRefresh();
            }

            indicator.style.transform = 'translateX(-50%) translateY(-100%)';
            indicator.classList.remove('active');
            pulling = false;
            startY = 0;
        }, { passive: true });
    }

    triggerRefresh() {
        this.showToast('🔄 Atualizando dados...', 'info', 2000);

        // Aciona refresh do dashboard se disponível
        setTimeout(() => {
            if (window.agriculturalDashboard && window.agriculturalDashboard.processData) {
                const data = window.agriculturalDashboard.analyzer.productionData;
                if (data) {
                    window.agriculturalDashboard.processData(data);
                    this.showToast('✅ Dados atualizados!', 'success', 2000);
                } else {
                    this.showToast('ℹ️ Carregue uma planilha primeiro', 'info', 2000);
                }
            }
        }, 500);
    }

    // ==========================================
    // TOAST SYSTEM
    // ==========================================
    
    initToastSystem() {
        if (document.querySelector('.toast-container')) return;

        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);

        this.toastContainer = container;
    }

    showToast(message, type = 'info', duration = 3000) {
        if (!this.toastContainer) this.initToastSystem();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info} toast-icon"></i>
            <div class="toast-message">${message}</div>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ==========================================
    // SKELETON LOADERS
    // ==========================================
    
    initSkeletonLoaders() {
        // Implementação para loaders de esqueleto durante carregamento
        this.showSkeletonLoading = (container) => {
            if (!container) return;

            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-loader';
            skeleton.style.width = '100%';
            skeleton.style.height = '200px';
            
            container.innerHTML = '';
            container.appendChild(skeleton);
        };

        this.hideSkeletonLoading = (container) => {
            if (!container) return;
            const skeleton = container.querySelector('.skeleton-loader');
            if (skeleton) skeleton.remove();
        };
    }

    // ==========================================
    // OTIMIZAÇÃO DE PERFORMANCE
    // ==========================================
    
    optimizePerformance() {
        // Lazy loading para imagens
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Debounce de scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            document.body.classList.add('scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.body.classList.remove('scrolling');
            }, 150);
        }, { passive: true });

        // Reduz repaints
        document.querySelectorAll('.animate-gpu').forEach(el => {
            el.style.willChange = 'transform';
        });
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    
    attachEventListeners() {
        // Resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleOrientationChange();
            }, 250);
        });

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 App em segundo plano');
            } else {
                console.log('📱 App em primeiro plano');
                this.resizeChartsForOrientation();
            }
        });

        // Online/Offline
        window.addEventListener('online', () => {
            this.showToast('✅ Conexão restaurada', 'success', 2000);
        });

        window.addEventListener('offline', () => {
            this.showToast('⚠️ Sem conexão', 'warning', 3000);
        });
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    
    vibrate(pattern = [10]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    enableFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

let mobileRevolution;

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileRevolution);
} else {
    initMobileRevolution();
}

function initMobileRevolution() {
    mobileRevolution = new MobileRevolution();
    window.mobileRevolution = mobileRevolution;
    
    console.log('🚀 Mobile Revolution carregado com sucesso!');
}

// Exporta para uso global
window.MobileRevolution = MobileRevolution;