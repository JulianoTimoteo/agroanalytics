// modtv.js - Gerenciador de Modo Apresentação (TV/Quiosque) - VERSÃO MINIMALISTA
class PresentationManager {
    constructor() {
        this.isPresentationActive = false;
        this.presentationInterval = null;
        this.presentationTabs = [];
        this.currentPresentationTabIndex = 0;
        
        this.escHandler = null;
        this.fullscreenHandler = null;
        
        this.intervalSeconds = 20; // Padrão 20 segundos por slide
        // Abas para apresentação (sem alertas e usuários)
        this.allTabs = [
            'tab-moagem', 
            'tab-caminhao', 
            'tab-equipamento', 
            'tab-frentes', 
            'tab-metas',
            'tab-horaria'
        ];
        
        this.initialize();
    }
    
    initialize() {
        const timerInput = document.getElementById('presentation-timer');
        if (timerInput) {
            timerInput.addEventListener('change', (e) => {
                this.intervalSeconds = parseInt(e.target.value) || 20;
                if (this.isPresentationActive) this.restartInterval();
            });
        }
        
        const btn = document.querySelector('.presentation-controls .btn-primary');
        if (btn) {
            btn.addEventListener('click', () => this.togglePresentation());
        }
    }
    
    togglePresentation() {
        this.isPresentationActive ? this.stopPresentation() : this.startPresentation();
    }

    startPresentation() {
        if (this.isPresentationActive) return;
        this.isPresentationActive = true;
        
        // 1. Apenas adiciona a classe - CSS cuida do resto
        document.body.classList.add('presentation-mode');
        
        // 2. Entra em tela cheia (sem mudar cores)
        this.enterFullscreen();
        
        // 3. Atualiza botão
        this.updateButtonUI(true);
        
        // 4. Configura listeners
        this.setupListeners();
        
        // 5. Define abas para apresentação
        if (window.agriculturalDashboard && window.agriculturalDashboard.canAccessTab) {
            this.presentationTabs = this.allTabs.filter(tab => window.agriculturalDashboard.canAccessTab(tab));
        } else {
            this.presentationTabs = [...this.allTabs];
        }
        
        if (this.presentationTabs.length === 0) {
            alert("Nenhuma aba disponível para apresentação.");
            this.stopPresentation();
            return;
        }

        this.currentPresentationTabIndex = 0;
        this.showCurrentTab();
        this.restartInterval();
    }

    stopPresentation() {
        if (!this.isPresentationActive) return;
        this.isPresentationActive = false;
        
        // 1. Remove apenas a classe
        document.body.classList.remove('presentation-mode');
        
        // 2. Sai do modo tela cheia
        this.exitFullscreen();
        
        // 3. Atualiza botão
        this.updateButtonUI(false);
        
        // 4. Remove listeners
        this.removeListeners();
        
        // 5. Limpa intervalo
        if (this.presentationInterval) {
            clearInterval(this.presentationInterval);
            this.presentationInterval = null;
        }
    }
    
    restartInterval() {
        if (this.presentationInterval) clearInterval(this.presentationInterval);
        this.presentationInterval = setInterval(() => {
            this.nextSlide();
        }, this.intervalSeconds * 1000);
    }

    nextSlide() {
        this.currentPresentationTabIndex++;
        if (this.currentPresentationTabIndex >= this.presentationTabs.length) {
            this.currentPresentationTabIndex = 0;
        }
        this.showCurrentTab();
    }

    showCurrentTab() {
        const tabId = this.presentationTabs[this.currentPresentationTabIndex];
        if (window.agriculturalDashboard && window.agriculturalDashboard.showTab) {
            window.agriculturalDashboard.showTab(tabId);
        }
    }

    setupListeners() {
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.stopPresentation();
            if (e.key === 'ArrowRight') { this.nextSlide(); this.restartInterval(); }
            if (e.key === 'ArrowLeft') { 
                this.currentPresentationTabIndex = this.currentPresentationTabIndex > 0 ? 
                    this.currentPresentationTabIndex - 1 : this.presentationTabs.length - 1;
                this.showCurrentTab();
                this.restartInterval();
            }
        };
        document.addEventListener('keydown', this.escHandler);
        
        this.fullscreenHandler = () => {
            if (!document.fullscreenElement && this.isPresentationActive) this.stopPresentation();
        };
        document.addEventListener('fullscreenchange', this.fullscreenHandler);
    }

    removeListeners() {
        document.removeEventListener('keydown', this.escHandler);
        document.removeEventListener('fullscreenchange', this.fullscreenHandler);
    }

    enterFullscreen() {
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
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    updateButtonUI(active) {
        const btn = document.querySelector('.presentation-controls .btn-primary');
        if (btn) {
            btn.innerHTML = active ? 
                '<i class="fas fa-stop"></i> SAIR MODO TV' : 
                '<i class="fas fa-tv"></i> MODO TV';
            btn.style.backgroundColor = active ? 'var(--danger)' : 'var(--primary)';
        }
    }
}

// Inicializa
document.addEventListener('DOMContentLoaded', () => {
    window.presentationManager = new PresentationManager();
});