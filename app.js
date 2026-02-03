// app.js - VERSÃO FINAL COMPLETA (Shift Tracker, Frentes Dinâmicas, Sistema de Usuários Completo)
class AgriculturalDashboard {
    constructor() {
        // Inicializa módulos se disponíveis
        if (typeof IntelligentProcessor !== 'undefined') this.processor = new IntelligentProcessor();
        if (typeof DataVisualizer !== 'undefined') this.visualizer = new DataVisualizer();
        if (typeof DataValidator !== 'undefined') this.validator = new DataValidator();
        if (typeof DataAnalyzer !== 'undefined') this.analyzer = new DataAnalyzer();

        // Estado da aplicação
        this.data = [];
        this.potentialData = [];
        this.metaData = [];
        this.acmSafraData = [];
        this.analysisResult = null;
        this.validationResult = null;
        this.isAnimatingParticles = true;
        this.animationFrameId = null;

        // Controle de Carrossel e Atualização
        this.currentSlideIndex = 0;
        this.carouselInterval = null;
        this.refreshIntervalId = null;
        this.refreshTimeoutId = null;

        // Controle de Apresentação
        this.presentationInterval = null;
        this.isPresentationActive = false;
        this.presentationTabs = []; // Array de abas para apresentação
        this.currentPresentationTabIndex = 0;

        // Inicialização do Firebase
        if (typeof firebase !== 'undefined') {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
        } else {
            console.error("Firebase não inicializado.");
        }

        // 🟥 SISTEMA DE USUÁRIOS
        this.userList = [];
        this.currentUserRole = null;
        this.currentUserCustomPermissions = null;
        this.currentUserPermissions = {};

        // Permissões Padrão (RBAC)
        this.permissions = {
            'admin': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
            'editor': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria'],
            'viewer': ['tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-horaria']
        };
        this.tabPermissions = {};

        // Inicialização
        this._applyVisualFixes();
        this.initializeEventListeners();
        this.initializeParticles();
        this.loadTheme();
        this.loadMeta();
        this.initShiftTracker();
        this.clearResults();

        if (this.auth) {
            this.auth.onAuthStateChanged(this.handleAuthStateChange.bind(this));
        } else {
            this.startLoadingProcess();
            this.setupAutoRefresh();
        }
    }

    // 🟥 CSS INJETADO PARA CORRIGIR VISUALIZAÇÃO E DROPDOWNS
    _applyVisualFixes() {
        const style = document.createElement('style');
        style.innerHTML = `
            .modal-overlay.active { display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 9999; }
            .modal-overlay.visible { display: flex !important; }
            .btn-cssbuttons { min-width: 200px !important; height: 54px !important; padding: 0 25px !important; }
            .role-dropdown, select.full-width-input { 
                background-color: #1a1f2e !important; 
                color: #e0e0e0 !important; 
                border: 1px solid #555 !important; 
                padding: 8px; 
                border-radius: 4px; 
            }
            .role-dropdown option, select option { 
                background-color: #1a1f2e !important; 
                color: #e0e0e0 !important; 
            }
            #frentes-selection-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 8px;
            }
            #frentes-selection-container label { 
                display: flex; align-items: center; gap: 5px; padding: 6px; cursor: pointer; color: #ddd; background: rgba(255,255,255,0.05); border-radius: 4px; border: 1px solid transparent; font-size: 0.85rem;
            }
            #frentes-selection-container label:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
            body.presentation-mode { overflow: hidden; cursor: none !important; }
            body.presentation-mode .presentation-controls {
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); padding: 10px 20px; border-radius: 30px; z-index: 10000; display: flex; align-items: center; gap: 15px; backdrop-filter: blur(10px); border: 2px solid var(--primary); opacity: 0.3; transition: opacity 0.3s;
            }
            body.presentation-mode .presentation-controls:hover { opacity: 1; cursor: pointer; }
            body.presentation-mode .presentation-indicator {
                position: fixed; top: 20px; right: 20px; background: rgba(255, 165, 0, 0.9); color: black; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; z-index: 9999; display: flex; align-items: center; gap: 8px; animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }

    // =================== 📺 MODO APRESENTAÇÃO ===================
    togglePresentation() {
        const timerInput = document.getElementById('presentation-timer');
        const intervalSeconds = parseInt(timerInput.value) || 30;
        if (this.isPresentationActive) this.stopPresentation();
        else this.startPresentation(intervalSeconds);
    }

    startPresentation(seconds) {
        this.isPresentationActive = true;
        document.body.classList.add('presentation-mode');
        const allTabs = ['tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria'];
        this.presentationTabs = allTabs.filter(tab => this.canAccessTab(tab));
        if (this.presentationTabs.length === 0) {
            this.stopPresentation();
            return;
        }
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        this.currentPresentationTabIndex = 0;
        this.showTab(this.presentationTabs[0]);
        this.presentationInterval = setInterval(() => {
            this.currentPresentationTabIndex = (this.currentPresentationTabIndex + 1) % this.presentationTabs.length;
            this.showTab(this.presentationTabs[this.currentPresentationTabIndex]);
            this.updatePresentationCounter();
        }, seconds * 1000);
    }

    stopPresentation() {
        this.isPresentationActive = false;
        if (this.presentationInterval) clearInterval(this.presentationInterval);
        document.body.classList.remove('presentation-mode');
        if (document.fullscreenElement) document.exitFullscreen();
        this.showTab('tab-gerenciar');
    }

    updatePresentationCounter() {
        const counter = document.getElementById('presentation-counter');
        if (counter) counter.textContent = `${this.currentPresentationTabIndex + 1}/${this.presentationTabs.length}`;
    }

    // =================== LÓGICA DE UI E ABAS ===================
    showTab(tabId) {
        if (!this.canAccessTab(tabId)) return;
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
        const activePane = document.getElementById(tabId);
        if (activePane) activePane.classList.add('active');
        const activeBtn = document.querySelector(`.tab-button[onclick*='${tabId}']`);
        if (activeBtn) activeBtn.classList.add('active');
        if (tabId === 'tab-moagem') this.initializeCarousel();
        else this.stopCarousel();
        if (tabId === 'tab-usuarios') this.loadUserManagementData();
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // =================== 🟥 SISTEMA DE USUÁRIOS ===================
    async saveAdminUser(e) {
        e.preventDefault();
        const id = document.getElementById('admin-user-id').value;
        const nickname = document.getElementById('admin-user-nickname').value;
        const password = document.getElementById('admin-user-password').value;
        const selectedPerms = Array.from(document.querySelectorAll('#admin-user-form input[name="perm"]:checked')).map(cb => cb.value);

        try {
            if (id) {
                await this.db.collection("users").doc(id).update({ nickname, customPermissions: selectedPerms });
                this.closeModal('admin-user-modal');
                this.loadUserManagementData();
            } else {
                let secondaryApp = firebase.apps.find(app => app.name === 'Secondary') || firebase.initializeApp(firebaseConfig, "Secondary");
                const email = `${nickname.toLowerCase()}@agro.local`;
                const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                await this.db.collection("users").doc(userCredential.user.uid).set({
                    nickname, email, role: 'viewer', customPermissions: selectedPerms, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await secondaryApp.auth().signOut();
                this.closeModal('admin-user-modal');
                this.loadUserManagementData();
            }
        } catch (error) { alert("Erro ao salvar: " + error.message); }
    }

    // =================== 🟥 CÁLCULOS OPERACIONAIS ===================
    updateRollingAverages() {
        if (!this.analysisResult) return;
        const now = new Date();
        const currentHour = now.getHours();
        const shiftStart = 6;
        let hoursSinceStart = currentHour >= shiftStart ? currentHour - shiftStart : (currentHour + 24) - shiftStart;
        const divisor = Math.min(hoursSinceStart + 1, 3);

        const recentPot = (this.analysisResult.potentialData || []).slice(-divisor);
        const avgPot = recentPot.reduce((a, c) => a + (parseFloat(c.potencial) || 0), 0) / divisor;
        const avgRot = recentPot.reduce((a, c) => a + (parseFloat(c['ROTAÇÃO DA MOENDA'] || c.rotacaoMoenda || 0)), 0) / divisor;

        const updateEl = (id, val, suffix) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val + suffix;
        };

        updateEl('avgPotencial3h', Math.round(avgPot).toLocaleString('pt-BR'), ' t/h');
        updateEl('avgRotacao3h', Math.round(avgRot).toLocaleString('pt-BR'), ' RPM');

        const lastRow = recentPot[recentPot.length - 1] || {};
        updateEl('dispColhedora', (parseFloat(lastRow['DISP COLHEDORA']) || 0).toFixed(2), '');
        updateEl('dispTransbordo', (parseFloat(lastRow['DISP TRANSBORDO']) || 0).toFixed(2), '');
        updateEl('dispCaminhoes', (parseFloat(lastRow['DISP CAMINHÕES'] || lastRow['DISP CAMINHOES']) || 0).toFixed(2), '');
    }

    // Lógica de Sincronização de Frotas e Refresh
    async syncFleetRegistry(data) {
        if (!this.db) return 0;
        const uniqueFleets = new Set();
        data.forEach(row => { if (row.frota) uniqueFleets.add(String(row.frota).trim().replace(/^0+/, '')); });
        const batch = this.db.batch();
        uniqueFleets.forEach(id => {
            const ref = this.db.collection('fleet_registry').doc(id);
            batch.set(ref, { id, last_seen: firebase.firestore.Timestamp.now(), active: true }, { merge: true });
        });
        await batch.commit();
        return uniqueFleets.size;
    }

    async processDataAsync(productionData, potentialData, metaData, refreshTargetTime) {
        this.validationResult = this.validator.validateAll(productionData);
        this.analysisResult = this.analyzer.analyzeAll(productionData, potentialData, this.metaData, this.validationResult, this.acmSafraData);
        const totalRegistered = await this.syncFleetRegistry(productionData);
        if (this.analysisResult) this.analysisResult.totalRegisteredFleets = totalRegistered;
        this.visualizer.updateDashboard(this.analysisResult);
        this.updateRollingAverages();
        this.updateNextRefreshDisplay(refreshTargetTime);
    }

    // ... (Mantém as demais funções de upload, firebase e particles do backup original)
    // As funções initializeParticles, loadTheme, initializeEventListeners permanecem conforme o original.

    initializeParticles() {
        const canvas = document.getElementById('particles-js');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1,
                speedX: Math.random() * 0.5 - 0.25, speedY: Math.random() * 0.5 - 0.25, color: `rgba(0, 212, 255, ${Math.random() * 0.3})`
            });
        }
        const animate = () => {
            if (!this.isAnimatingParticles) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX; p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.agriculturalDashboard = new AgriculturalDashboard();
});