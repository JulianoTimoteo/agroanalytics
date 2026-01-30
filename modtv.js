// modtv.js - Gerenciador de Modo Apresentação (TV/Quiosque) - INTEGRADO AO TEMA
class PresentationManager {
    constructor() {
        this.isPresentationActive = false;
        this.presentationInterval = null;
        this.presentationTabs = [];
        this.currentPresentationTabIndex = 0;
        
        this.escHandler = null;
        this.fullscreenHandler = null;
        
        this.intervalSeconds = 30;
        this.allTabs = [
            'tab-moagem', 
            'tab-alertas', 
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
                this.intervalSeconds = parseInt(e.target.value) || 30;
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
        const dashboard = window.agriculturalDashboard;
        
        // Filtra abas baseadas nas permissões do usuário logado
        this.presentationTabs = this.allTabs.filter(tabId => {
            return !dashboard || !dashboard.canAccessTab || dashboard.canAccessTab(tabId);
        });

        if (this.presentationTabs.length === 0) {
            alert("Sem permissão para as abas da apresentação.");
            return;
        }

        this.isPresentationActive = true;
        
        // Ativa a classe no body (O CSS cuidará do visual do tema)
        document.body.classList.add('presentation-mode');
        
        this.enterFullscreen();
        this.createIndicator();

        this.currentPresentationTabIndex = 0;
        this.showCurrentSlide();
        this.restartInterval();
        this.setupListeners();
        this.updateButtonUI(true);
    }

    createIndicator() {
        if (document.getElementById('tv-indicator')) return;
        const indicator = document.createElement('div');
        indicator.className = 'presentation-indicator';
        indicator.id = 'tv-indicator';
        indicator.innerHTML = `<i class="fas fa-tv"></i> MODO APRESENTAÇÃO ATIVO`;
        document.body.appendChild(indicator);
    }

    stopPresentation() {
        this.isPresentationActive = false;
        if (this.presentationInterval) clearInterval(this.presentationInterval);
        
        document.body.classList.remove('presentation-mode');
        const indicator = document.getElementById('tv-indicator');
        if (indicator) indicator.remove();
        
        this.exitFullscreen();
        this.removeListeners();
        this.updateButtonUI(false);
        
        if (window.agriculturalDashboard) window.agriculturalDashboard.showTab('tab-moagem');
    }

    showCurrentSlide() {
        const dashboard = window.agriculturalDashboard;
        const tabId = this.presentationTabs[this.currentPresentationTabIndex];
        if (dashboard && dashboard.showTab) {
            dashboard.showTab(tabId);
        }
    }

    nextSlide() {
        this.currentPresentationTabIndex = (this.currentPresentationTabIndex + 1) % this.presentationTabs.length;
        this.showCurrentSlide();
    }

    restartInterval() {
        if (this.presentationInterval) clearInterval(this.presentationInterval);
        this.presentationInterval = setInterval(() => this.nextSlide(), this.intervalSeconds * 1000);
    }

    setupListeners() {
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.stopPresentation();
            if (e.key === 'ArrowRight') { this.nextSlide(); this.restartInterval(); }
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
        if (elem.requestFullscreen) elem.requestFullscreen();
    }

    exitFullscreen() {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    }

    updateButtonUI(active) {
        const btn = document.querySelector('.presentation-controls .btn-primary');
        if (btn) {
            btn.innerHTML = active ? '<i class="fas fa-stop"></i> PARAR TV' : '<i class="fas fa-play"></i> INICIAR TV';
            btn.style.backgroundColor = active ? 'var(--danger)' : 'var(--primary)';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.presentationManager = new PresentationManager();
});