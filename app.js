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
            /* Força o modal a aparecer quando ativo */
            .modal-overlay.active { display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 9999; }
            .modal-overlay.visible { display: flex !important; }
            
            /* Correção de botões */
            .btn-cssbuttons { min-width: 200px !important; height: 54px !important; padding: 0 25px !important; }
            
            /* 🔥 CORREÇÃO DE CORES DOS DROPDOWNS (Fundo Escuro) */
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
            
            /* Estilo para os checkboxes de frente no modal */
            #frentes-selection-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 8px;
            }
            #frentes-selection-container label { 
                display: flex; 
                align-items: center; 
                gap: 5px; 
                padding: 6px; 
                cursor: pointer; 
                color: #ddd; 
                background: rgba(255,255,255,0.05); 
                border-radius: 4px; 
                border: 1px solid transparent;
                font-size: 0.85rem;
            }
            #frentes-selection-container label:hover { 
                background: rgba(255,255,255,0.1); 
                border-color: rgba(255,255,255,0.2); 
            }
            
            /* Estilos para o modo apresentação */
            body.presentation-mode {
                overflow: hidden;
                cursor: none !important;
            }
            body.presentation-mode .presentation-controls {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 10px 20px;
                border-radius: 30px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 15px;
                backdrop-filter: blur(10px);
                border: 2px solid var(--primary);
                opacity: 0.3;
                transition: opacity 0.3s;
            }
            body.presentation-mode .presentation-controls:hover {
                opacity: 1;
                cursor: pointer;
            }
            body.presentation-mode .presentation-controls .btn-primary {
                background: var(--primary);
                color: white;
                border: none;
                padding: 8px 20px;
                border-radius: 20px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            body.presentation-mode .presentation-controls .btn-primary:hover {
                background: var(--primary-light);
            }
            body.presentation-mode .presentation-timer-container {
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
            }
            body.presentation-mode .presentation-timer-container input {
                width: 60px;
                background: rgba(255,255,255,0.1);
                border: 1px solid var(--primary);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                text-align: center;
            }
            body.presentation-mode #tabs-nav-container,
            body.presentation-mode .header-controls,
            body.presentation-mode .menu-toggle-btn,
            body.presentation-mode .btn-export,
            body.presentation-mode .shift-tracker {
                display: none !important;
            }
            body.presentation-mode .tab-content {
                padding: 0;
                margin: 0;
                height: 100vh;
                overflow: hidden;
            }
            body.presentation-mode .tab-pane {
                height: 100vh;
                overflow: auto;
                padding: 20px;
            }
            body.presentation-mode .presentation-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 165, 0, 0.9);
                color: black;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 0.9rem;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 0.8; }
                50% { opacity: 1; }
                100% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }

    // =================== 📺 MODO APRESENTAÇÃO ===================

    togglePresentation() {
        const timerInput = document.getElementById('presentation-timer');
        const intervalSeconds = parseInt(timerInput.value) || 30;
        
        if (this.isPresentationActive) {
            this.stopPresentation();
        } else {
            this.startPresentation(intervalSeconds);
        }
    }

    startPresentation(seconds) {
        this.isPresentationActive = true;
        document.body.classList.add('presentation-mode');
        
        // Configura abas para apresentação (filtra apenas as que o usuário tem acesso)
        const allTabs = [
            'tab-moagem', 
            'tab-alertas', 
            'tab-caminhao', 
            'tab-equipamento', 
            'tab-frentes', 
            'tab-metas',
            'tab-horaria'
        ];
        
        this.presentationTabs = allTabs.filter(tab => this.canAccessTab(tab));
        
        if (this.presentationTabs.length === 0) {
            alert("Nenhuma aba disponível para apresentação!");
            this.stopPresentation();
            return;
        }
        
        // Cria indicador de apresentação
        const indicator = document.createElement('div');
        indicator.className = 'presentation-indicator';
        indicator.innerHTML = `
            <i class="fas fa-tv"></i>
            MODO APRESENTAÇÃO
            <span id="presentation-counter" style="margin-left: 10px; background: white; color: black; padding: 2px 8px; border-radius: 10px;">1/${this.presentationTabs.length}</span>
        `;
        document.body.appendChild(indicator);
        
        // Entra em tela cheia se disponível
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(e => {
                console.log("Tela cheia não suportada:", e);
            });
        }

        this.currentPresentationTabIndex = 0;
        this.showTab(this.presentationTabs[this.currentPresentationTabIndex]);
        this.updatePresentationCounter();

        this.presentationInterval = setInterval(() => {
            this.currentPresentationTabIndex = (this.currentPresentationTabIndex + 1) % this.presentationTabs.length;
            this.showTab(this.presentationTabs[this.currentPresentationTabIndex]);
            this.updatePresentationCounter();
        }, seconds * 1000);

        // Listener para sair com ESC
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.stopPresentation();
            }
        };
        document.addEventListener('keydown', this.escHandler);

        // Listener para sair quando sai da tela cheia
        this.fullscreenHandler = () => {
            if (!document.fullscreenElement) {
                this.stopPresentation();
            }
        };
        document.addEventListener('fullscreenchange', this.fullscreenHandler);

        const btn = document.querySelector('.presentation-controls .btn-primary');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-stop"></i> PARAR APRESENTAÇÃO';
            btn.style.background = 'var(--danger)';
        }
        
        // Esconde cursor após 3 segundos
        this.cursorTimeout = setTimeout(() => {
            if (this.isPresentationActive) {
                document.body.style.cursor = 'none';
            }
        }, 3000);
    }

    stopPresentation() {
        this.isPresentationActive = false;
        
        // Limpa intervalos
        if (this.presentationInterval) {
            clearInterval(this.presentationInterval);
            this.presentationInterval = null;
        }
        
        if (this.cursorTimeout) {
            clearTimeout(this.cursorTimeout);
            this.cursorTimeout = null;
        }
        
        // Remove classes e elementos
        document.body.classList.remove('presentation-mode');
        document.body.style.cursor = '';
        
        const indicator = document.querySelector('.presentation-indicator');
        if (indicator) indicator.remove();
        
        // Remove event listeners
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        if (this.fullscreenHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenHandler);
        }
        
        // Sai da tela cheia
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log("Erro ao sair da tela cheia:", e));
        }

        // Restaura botão
        const btn = document.querySelector('.presentation-controls .btn-primary');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> INICIAR APRESENTAÇÃO';
            btn.style.background = '';
        }
        
        // Volta para aba de gerenciar ou primeira disponível
        if (this.canAccessTab('tab-gerenciar')) {
            this.showTab('tab-gerenciar');
        } else if (this.presentationTabs.length > 0) {
            this.showTab(this.presentationTabs[0]);
        }
        
        this.presentationTabs = [];
    }

    updatePresentationCounter() {
        const counter = document.getElementById('presentation-counter');
        if (counter) {
            counter.textContent = `${this.currentPresentationTabIndex + 1}/${this.presentationTabs.length}`;
        }
    }

    // =================== LÓGICA DE UI E ABAS ===================

    showTab(tabId) {
        if (!this.canAccessTab(tabId)) {
            alert(`Acesso negado à aba "${tabId}".`);
            return; 
        }

        if (window.innerWidth <= 768 && !this.isPresentationActive) {
            this.toggleMenu(true);
        }

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            pane.style.display = 'none';
        });

        document.querySelectorAll('.tabs-nav .tab-button').forEach(button => {
            button.classList.remove('active');
        });

        const activePane = document.getElementById(tabId);
        if (activePane) {
            activePane.classList.add('active');
            activePane.style.display = 'block';
        }
        
        const activeBtn = document.querySelector(`.tabs-nav .tab-button[onclick*='${tabId}']`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Em modo apresentação, maximiza visualização
        if (this.isPresentationActive && activePane) {
            activePane.style.height = 'calc(100vh - 40px)';
            activePane.style.overflow = 'auto';
        }
        
        const needsParticles = (tabId === 'tab-gerenciar' || tabId === 'tab-usuarios') && !this.isPresentationActive;
        if (needsParticles && !this.isAnimatingParticles) {
            this.isAnimatingParticles = true;
            this.initializeParticles(); 
        } else if (!needsParticles && this.isAnimatingParticles) {
            this.isAnimatingParticles = false;
        }
        
        if (tabId === 'tab-moagem') {
             setTimeout(() => {
                 this.showSlide(this.currentSlideIndex); 
                 if (!this.isPresentationActive) {
                     this.initializeCarousel();
                 }
             }, 50);
        } else {
             this.stopCarousel();
        }

        // Se entrar na aba usuários, carrega a tabela principal
        if (tabId === 'tab-usuarios') {
            this.isCurrentUserAdmin().then(isAdmin => {
                if (isAdmin) {
                    this.showSubTab('subtab-gerenciar-acesso', document.querySelector('#tab-usuarios .sub-tabs-nav .tab-button'));
                    this.loadUserManagementData();
                } else {
                    this.showUserAccessMessage();
                }
            });
        }
    }

    showSubTab(subTabId, clickedButton) {
        document.querySelectorAll('#tab-usuarios .tab-pane-sub').forEach(pane => {
            pane.classList.remove('active');
        });
        document.querySelectorAll('#tab-usuarios .sub-tabs-nav .tab-button').forEach(button => {
            button.classList.remove('active');
        });

        const activePane = document.getElementById(subTabId);
        if (activePane) {
            activePane.classList.add('active');
        }
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
        
        if (subTabId === 'subtab-gerenciar-acesso') {
            this.loadUserManagementData();
        } else if (subTabId === 'subtab-solicitacoes') {
            this.loadRegistrationRequests();
        } else if (subTabId === 'subtab-permissoes-abas') {
            this.loadTabPermissionsPanel();
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active'); 
            modal.classList.add('visible');
            modal.style.display = 'flex';
        } else {
            console.error(`Modal ${modalId} não encontrado.`);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.classList.remove('visible');
            modal.style.display = 'none';
        }
    }

    // =================== 🟥 SISTEMA COMPLETO DE USUÁRIOS ===================

    // Modal de Edição de Usuário com Permissões
    openUserModal(userId = null) {
        let modal = document.getElementById('admin-user-modal');
        let form = document.getElementById('admin-user-form');
        
        if (!modal) {
            modal = document.getElementById('user-settings-modal');
            if (!modal) return;
        }

        if (form) form.reset();
        
        // Limpa as permissões antigas do HTML estático se existirem
        const staticPerms = document.querySelector('.permissions-container');
        if (staticPerms) staticPerms.style.display = 'none';

        const idInput = document.getElementById('admin-user-id');
        if (idInput) idInput.value = userId || '';
        
        const permsContainerId = 'admin-user-perms-container';
        let permsContainer = document.getElementById(permsContainerId);
        
        if (!permsContainer && form) {
            permsContainer = document.createElement('div');
            permsContainer.id = permsContainerId;
            permsContainer.className = 'permissions-grid';
            permsContainer.style.marginTop = '15px';
            permsContainer.style.borderTop = '1px solid var(--glass-border)';
            permsContainer.style.paddingTop = '10px';
            
            const title = document.createElement('h4');
            title.textContent = "Permissões de Acesso (Abas):";
            title.style.marginBottom = '10px';
            title.style.fontSize = '0.9rem';
            title.style.color = 'var(--text-secondary)';
            permsContainer.appendChild(title);

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            grid.style.gap = '8px';

            const allTabs = [
                { id: 'tab-gerenciar', label: 'Gerenciar' },
                { id: 'tab-moagem', label: 'Moagem' },
                { id: 'tab-alertas', label: 'Alertas' },
                { id: 'tab-caminhao', label: 'Caminhões' },
                { id: 'tab-equipamento', label: 'Colheita' },
                { id: 'tab-frentes', label: 'Frentes' },
                { id: 'tab-metas', label: 'Metas' },
                { id: 'tab-horaria', label: 'Entrega HxH' },
                { id: 'tab-usuarios', label: 'Usuários' }
            ];

            allTabs.forEach(tab => {
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '5px';
                label.style.fontSize = '0.85rem';
                
                const box = document.createElement('input');
                box.type = 'checkbox';
                box.name = 'perm';
                box.value = tab.id;
                box.id = `perm-chk-${tab.id}`;

                label.appendChild(box);
                label.appendChild(document.createTextNode(tab.label));
                grid.appendChild(label);
            });
            permsContainer.appendChild(grid);
            
            const btns = form.querySelector('.modal-buttons') || form.querySelector('button[type="submit"]');
            form.insertBefore(permsContainer, btns);
        }

        if (userId && this.userList.length > 0) {
            const user = this.userList.find(u => u.id === userId);
            if (user) {
                const nicknameInput = document.getElementById('admin-user-nickname');
                if (nicknameInput) nicknameInput.value = user.nickname || user.email.split('@')[0];
                
                const passInput = document.getElementById('admin-user-password');
                if (passInput) passInput.placeholder = "Senha (Deixe em branco para manter)";

                let activePerms = [];
                if (user.customPermissions && Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
                    activePerms = user.customPermissions;
                } else {
                    activePerms = this.permissions[user.role] || [];
                }

                if (permsContainer) {
                    const checkboxes = permsContainer.querySelectorAll('input[name="perm"]');
                    checkboxes.forEach(cb => {
                        cb.checked = activePerms.includes(cb.value);
                    });
                }
            }
        } else {
            const passInput = document.getElementById('admin-user-password');
            if (passInput) passInput.placeholder = "Senha (Obrigatório para novo)";
            if (permsContainer) {
                const checkboxes = permsContainer.querySelectorAll('input[name="perm"]');
                checkboxes.forEach(cb => cb.checked = false);
            }
        }
        this.openModal('admin-user-modal');
    }

    async saveAdminUser(e) {
        e.preventDefault();
        const id = document.getElementById('admin-user-id').value;
        const nickname = document.getElementById('admin-user-nickname').value;
        const password = document.getElementById('admin-user-password').value;
        
        const checkboxes = document.querySelectorAll('#admin-user-form input[name="perm"]:checked');
        const selectedPerms = Array.from(checkboxes).map(cb => cb.value);

        if (!nickname) {
            alert("O campo Apelido é obrigatório.");
            return;
        }

        try {
            if (id) {
                // MODO EDIÇÃO (Sem alterações necessárias aqui)
                const updateData = {
                    nickname: nickname,
                    customPermissions: selectedPerms, 
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await this.db.collection("users").doc(id).update(updateData);
                alert("Usuário e permissões atualizados com sucesso!");
                this.closeModal('admin-user-modal');
                this.loadUserManagementData(); 
            } else {
                // MODO CRIAÇÃO DIRETA
                if (!password || password.length < 6) {
                    alert("A senha é obrigatória para novos usuários (mínimo 6 caracteres).");
                    return;
                }

                const email = nickname.includes('@') ? nickname.toLowerCase() : `${nickname.toLowerCase()}@agro.local`;
                
                // --- CORREÇÃO AQUI: Verifica se o App 'Secondary' já existe ---
                let secondaryApp;
                if (!firebase.apps.find(app => app.name === 'Secondary')) {
                    secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
                } else {
                    secondaryApp = firebase.app("Secondary");
                }
                // -------------------------------------------------------------

                const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                const newUid = userCredential.user.uid;

                await this.db.collection("users").doc(newUid).set({
                    nickname: nickname,
                    email: email,
                    role: 'viewer',
                    customPermissions: selectedPerms,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Faz logout na instância secundária para não afetar o Admin logado
                await secondaryApp.auth().signOut();
                
                // Opcional: NÃO delete o app aqui se você pretende criar mais usuários 
                // na mesma sessão, ou use um bloco try/catch para segurança.

                alert(`Usuário ${nickname} criado com sucesso!`);
                this.closeModal('admin-user-modal');
                this.loadUserManagementData();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    }

    async loadUserManagementData() {
        const container = document.getElementById('user-management-container');
        if (!container || !this.db) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loader"></div>
                <p>Carregando usuários ativos...</p>
            </div>
        `;
        
        try {
            const isAdmin = await this.isCurrentUserAdmin();
            
            if (!isAdmin) {
                this.showUserAccessMessage();
                return;
            }
            
            const snapshot = await this.db.collection("users").get();
            this.userList = [];
            
            snapshot.forEach(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const safeData = { ...data };
                    if (safeData.password) {
                        delete safeData.password;
                    }
                    
                    this.userList.push({ 
                        id: doc.id, 
                        ...safeData,
                        role: data.role || 'viewer'
                    });
                }
            });
            
            this.renderUserTable(container);
            this.loadRegistrationRequests();
            this.loadTabPermissionsPanel();

        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            
            let errorMessage = "Erro ao carregar dados de usuários.";
            if (error.code === 'permission-denied') {
                errorMessage = `
                    <div class="alert-danger" style="padding: 1rem; border-radius: 8px;">
                        <strong><i class="fas fa-ban"></i> Permissão Negada</strong>
                        <p>Você não tem permissão para acessar esta funcionalidade.</p>
                        <p>Seu papel atual: <strong>${this.currentUserRole || 'Não definido'}</strong></p>
                    </div>
                `;
            }
            
            container.innerHTML = errorMessage;
        }
    }

    renderUserTable(container) {
        if (this.userList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <i class="fas fa-users-slash" style="font-size: 3rem; color: var(--text-secondary);"></i>
                    <h3>Nenhum usuário cadastrado</h3>
                    <p>Os usuários ativos aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        const currentUser = this.auth.currentUser;
        
        let html = `
            <div class="admin-header" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">
                        <i class="fas fa-users-cog"></i> Usuários Ativos
                    </h3>
                    <span class="badge badge-admin" style="font-size: 0.9rem;">
                        <i class="fas fa-crown"></i> Administrador
                    </span>
                </div>
                <p class="text-secondary" style="margin-top: 0.5rem;">
                    Total de usuários ativos: <strong>${this.userList.length}</strong>
                </p>
            </div>
            
            <div class="table-responsive" style="overflow-x: auto; max-height: 500px;">
                <table class="user-table">
                    <thead>
                        <tr>
                            <th>Identificador/E-mail</th>
                            <th>Papel</th>
                            <th>Data Criação</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        this.userList.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return dateB - dateA;
        });

        this.userList.forEach(user => {
            const isCurrentUser = currentUser && currentUser.uid === user.id;
            const creationDate = user.createdAt ? 
                (user.createdAt.toDate ? 
                 user.createdAt.toDate().toLocaleDateString('pt-BR') : 
                 new Date(user.createdAt).toLocaleDateString('pt-BR')) : 
                'N/A';
            
            let roleColor = '';
            let roleIcon = '';
            switch(user.role) {
                case 'admin':
                    roleColor = 'badge-admin';
                    roleIcon = 'fa-crown';
                    break;
                case 'editor':
                    roleColor = 'badge-editor';
                    roleIcon = 'fa-edit';
                    break;
                case 'viewer':
                default:
                    roleColor = 'badge-viewer';
                    roleIcon = 'fa-eye';
                    break;
            }
            
            html += `
                <tr class="${isCurrentUser ? 'current-user-row' : ''}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${user.nickname || user.email} 
                            ${isCurrentUser ? 
                                '<span class="badge badge-primary" style="font-size: 0.7rem;">Você</span>' : 
                                ''
                            }
                        </div>
                    </td>
                    <td>
                        <div class="role-selector">
                            <span class="badge ${roleColor}" style="margin-right: 0.5rem;">
                                <i class="fas ${roleIcon}"></i> ${user.role}
                            </span>
                            ${!isCurrentUser ? `
                                <select 
                                    class="role-dropdown" 
                                    data-user-id="${user.id}"
                                    onchange="window.agriculturalDashboard.updateUserRole('${user.id}', this.value)"
                                >
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                                    <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                                </select>
                            ` : `
                                <span class="text-muted" style="font-size: 0.9rem;">
                                    (seu papel)
                                </span>
                            `}
                        </div>
                    </td>
                    <td>
                        <small class="text-muted">${creationDate}</small>
                    </td>
                    <td>
                        ${!isCurrentUser ? `
                            <button 
                                class="btn-primary btn-sm"
                                onclick="window.agriculturalDashboard.openUserModal('${user.id}')"
                                style="margin-right: 5px;"
                            >
                                <i class="fas fa-edit"></i> Permissões
                            </button>
                            <button 
                                class="btn-danger btn-sm delete-user-btn"
                                onclick="window.agriculturalDashboard.deleteUserPrompt('${user.id}', '${user.email || user.nickname}')"
                            >
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <span class="text-muted" style="font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i> Não disponível
                            </span>
                        `}
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="admin-footer" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                <div class="alert-info" style="padding: 1rem; border-radius: 8px; background: rgba(0, 212, 255, 0.1);">
                    <strong><i class="fas fa-info-circle"></i> Informações importantes:</strong>
                    <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
                        <li><strong>Admin:</strong> Acesso completo ao sistema</li>
                        <li><strong>Editor:</strong> Pode editar dados e fazer uploads</li>
                        <li><strong>Viewer:</strong> Apenas visualização dos dados</li>
                        <li>Use "Editar" para configurar permissões específicas por usuário.</li>
                    </ul>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async updateUserRole(userId, newRole) {
        try {
            const isAdmin = await this.isCurrentUserAdmin();
            if (!isAdmin) {
                alert("Apenas administradores podem alterar papéis de usuários.");
                return;
            }
            
            const currentUser = this.auth.currentUser;
            if (currentUser && currentUser.uid === userId) {
                alert("Não é possível alterar seu próprio papel por esta interface.");
                return;
            }
            
            if (confirm(`Alterar papel para "${newRole}"?`)) {
                await this.db.collection("users").doc(userId).update({ 
                    role: newRole,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                this.loadUserManagementData();
                this.renderTabsNavigation(); 
            }
        } catch (error) {
            console.error("Erro ao atualizar papel:", error);
            alert(`Erro: ${error.message}`);
        }
    }

    deleteUserPrompt(userId, userEmail) {
        this.isCurrentUserAdmin().then(isAdmin => {
            if (!isAdmin) {
                alert("Apenas administradores podem excluir usuários.");
                return;
            }
            
            const currentUser = this.auth.currentUser;
            if (currentUser && currentUser.uid === userId) {
                alert("Não é possível excluir a si mesmo.");
                return;
            }
            
            if (confirm(`Excluir usuário ${userEmail}?\n\nIsso remove apenas do Firestore, não da autenticação.`)) {
                this.deleteUser(userId, userEmail);
            }
        });
    }

    async deleteUser(userId, userEmail) {
        try {
            await this.db.collection("users").doc(userId).delete();
            
            alert(`Usuário ${userEmail} removido do sistema.`);
            
            this.loadUserManagementData();
            
        } catch (error) {
            console.error("Erro ao excluir usuário:", error);
            alert(`Erro: ${error.message}`);
        }
    }
    
    showUserAccessMessage() {
        const container = document.getElementById('user-management-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="access-message" style="text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 4rem; color: var(--warning); margin-bottom: 1rem;">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Acesso Restrito</h3>
                <p>Esta funcionalidade está disponível apenas para administradores.</p>
                <p>Seu papel atual: <strong>${this.currentUserRole || 'Não definido'}</strong></p>
            </div>
        `;
    }
    
    // =================== 🟥 LÓGICA DE SOLICITAÇÕES ===================
    
    async loadRegistrationRequests() {
        const container = document.getElementById('registration-requests-container');
        if (!container || !this.db) return;

        try {
            const snapshot = await this.db.collection("requests")
                                        .where("status", "==", "pending")
                                        .orderBy("requestedAt", "asc")
                                        .get();
            const requests = [];
            snapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));

            const countEl = document.getElementById('requests-count');
            if(countEl) countEl.textContent = requests.length;
            
            const bellIcon = document.querySelector('.fa-bell');
            if (bellIcon) {
                if (requests.length > 0) {
                     bellIcon.style.color = 'var(--danger)';
                     bellIcon.classList.add('fa-shake');
                } else {
                     bellIcon.style.color = '';
                     bellIcon.classList.remove('fa-shake');
                }
            }

            if (requests.length === 0) {
                container.innerHTML = `<p style="text-align: center; padding: 2rem;">Nenhuma solicitação pendente.</p>`;
                return;
            }

            let html = `<div class="table-responsive"><table class="user-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone/WhatsApp</th><th>Solicitado em</th><th>Ações</th></tr></thead><tbody>`;
            
            requests.forEach(req => {
                const requestedAt = req.requestedAt ? 
                    (req.requestedAt.toDate ? req.requestedAt.toDate().toLocaleDateString('pt-BR') : new Date(req.requestedAt).toLocaleDateString('pt-BR')) : 
                    'N/A';
                
                html += `
                    <tr>
                        <td>${req.name}</td>
                        <td>${req.email}</td>
                        <td>
                            <a href="https://wa.me/${req.phone.replace(/\D/g, '')}" target="_blank" style="color: var(--whatsapp-color); text-decoration: none;">
                                <i class="fab fa-whatsapp"></i> ${req.phone}
                            </a>
                        </td>
                        <td><small class="text-muted">${requestedAt}</small></td>
                        <td>
                            <button class="btn-primary" style="background: var(--success); padding: 5px 10px;"
                                onclick="window.agriculturalDashboard.approveRequest('${req.id}', '${req.email}', '${req.name}')">
                                <i class="fas fa-check"></i> Aprovar
                            </button>
                            <button class="btn-danger" style="margin-left: 0.5rem;"
                                onclick="window.agriculturalDashboard.rejectRequest('${req.id}', '${req.email}')">
                                <i class="fas fa-times"></i> Recusar
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            container.innerHTML = html;

        } catch (error) {
            console.error("Erro ao carregar solicitações:", error);
            container.innerHTML = `<p class="alert-danger" style="padding: 1rem;">Erro ao carregar solicitações.</p>`;
        }
    }

    async approveRequest(requestId, email, name) {
        if (!confirm(`Aprovar cadastro para ${email}?\n\nVocê deverá criar o usuário no Firebase Authentication e fornecer a senha manualmente ao solicitante.`)) return;
        
        const SENHA_PADRAO = 'a123456@';
        
        try {
            const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
            const secondaryAuth = secondaryApp.auth();

            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, SENHA_PADRAO);
            const newUid = userCredential.user.uid;

            await this.db.collection('users').doc(newUid).set({
                email: email,
                nickname: email.split('@')[0],
                name: name,
                role: 'viewer', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await this.db.collection("requests").doc(requestId).update({ 
                status: 'approved', 
                authUid: newUid,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp() 
            });

            await secondaryAuth.signOut();
            await secondaryApp.delete();

            alert(`Sucesso! Usuário criado.\nEmail: ${email}\nSenha: ${SENHA_PADRAO}\n\nEnvie estes dados ao usuário.`);
            
            this.loadRegistrationRequests();
            this.loadUserManagementData();

        } catch (error) {
            console.error("Erro na aprovação:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("Erro: Este e-mail já possui um cadastro no sistema.");
            } else {
                alert(`Erro ao criar usuário: ${error.message}`);
            }
            
            try {
                const app = firebase.app("SecondaryApp");
                if(app) await app.delete();
            } catch(e) {}
        }
    }

    async rejectRequest(requestId, email) {
        if (!confirm(`Recusar cadastro para ${email}? A solicitação será removida.`)) return;

        try {
            await this.db.collection("requests").doc(requestId).update({ status: 'rejected', rejectedAt: firebase.firestore.FieldValue.serverTimestamp() });
            this.loadRegistrationRequests();
            alert(`Solicitação de ${email} recusada.`);
        } catch (error) {
            console.error("Erro ao recusar:", error);
            alert(`Erro ao recusar solicitação: ${error.message}`);
        }
    }
    
    // =================== 🟥 PERMISSÕES DE ABAS (RBAC) ===================

    canAccessTab(tabId) {
        if (!this.currentUserRole) return false;

        if (this.currentUserRole === 'admin') return true;
        
        if (tabId === 'tab-gerenciar') {
             return this.currentUserRole === 'admin' || this.currentUserRole === 'editor';
        }

        if (this.currentUserCustomPermissions && Array.isArray(this.currentUserCustomPermissions)) {
            return this.currentUserCustomPermissions.includes(tabId);
        }

        return this.permissions[this.currentUserRole] && this.permissions[this.currentUserRole].includes(tabId);
    }
    
    async loadTabPermissions() {
        try {
            const doc = await this.db.collection('config').doc('tabPermissions').get();
            if (doc.exists) {
                this.tabPermissions = doc.data().permissions || {};
            }
        } catch (e) {
            console.error("Erro ao carregar permissões de abas:", e);
        }
    }
    
    async loadTabPermissionsPanel() {
        const container = document.getElementById('tab-permissions-container');
        if (!container) return;
        
        if (this.currentUserRole !== 'admin') {
            container.innerHTML = `<p class="alert-danger" style="padding: 1rem;">Somente administradores podem configurar permissões de abas.</p>`;
            return;
        }

        const tabs = [
            { id: 'tab-moagem', title: 'Moagem' },
            { id: 'tab-alertas', title: 'Alertas' },
            { id: 'tab-caminhao', title: 'Caminhões' },
            { id: 'tab-equipamento', title: 'Colheita' },
            { id: 'tab-frentes', title: 'Frentes' },
            { id: 'tab-metas', title: 'Metas' },
            { id: 'tab-horaria', title: 'Entrega HxH' },
            { id: 'tab-gerenciar', title: 'Gerenciar' } 
        ];
        
        const roles = ['editor', 'viewer']; 

        let html = `<p style="margin-bottom: 1.5rem;">Marque as abas que os papéis de <strong>Editor</strong> e <strong>Viewer</strong> podem acessar. O papel <strong>Admin</strong> sempre tem acesso total.</p>`;
        html += `<div class="table-responsive"><table class="user-table" style="min-width: 600px;"><thead><tr><th>Aba</th><th>Padrão</th><th>Editor</th><th>Viewer</th></tr></thead><tbody>`;

        tabs.forEach(tab => {
            const getAccess = (role) => {
                if (this.tabPermissions[tab.id] && typeof this.tabPermissions[tab.id][role] === 'boolean') {
                    return this.tabPermissions[tab.id][role];
                }
                return this.permissions[role].includes(tab.id);
            };
            
            const editorAccess = getAccess('editor');
            const viewerAccess = getAccess('viewer');
            
            const defaultEditor = this.permissions['editor'].includes(tab.id) ? '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : '<i class="fas fa-times-circle" style="color: var(--danger);"></i>';
            const defaultViewer = this.permissions['viewer'].includes(tab.id) ? '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : '<i class="fas fa-times-circle" style="color: var(--danger);"></i>';
            
            html += `
                <tr>
                    <td><strong>${tab.title}</strong></td>
                    <td>
                        <span style="font-size: 0.8rem;">E: ${defaultEditor} | V: ${defaultViewer}</span>
                    </td>
                    <td>
                        <input type="checkbox" id="perm-${tab.id}-editor" 
                            ${editorAccess ? 'checked' : ''} 
                            onchange="window.agriculturalDashboard.updateTabPermission('${tab.id}', 'editor', this.checked)">
                    </td>
                    <td>
                        <input type="checkbox" id="perm-${tab.id}-viewer" 
                            ${viewerAccess ? 'checked' : ''}
                            onchange="window.agriculturalDashboard.updateTabPermission('${tab.id}', 'viewer', this.checked)">
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        html += `<button class="btn-primary" style="margin-top: 1.5rem; float: right;" onclick="window.agriculturalDashboard.saveTabPermissionsToCloud()"><i class="fas fa-save"></i> Salvar Configuração</button>`;

        container.innerHTML = html;
    }

    updateTabPermission(tabId, role, isChecked) {
        if (!this.tabPermissions[tabId]) {
            this.tabPermissions[tabId] = {};
        }
        this.tabPermissions[tabId][role] = isChecked;
        
        const btn = document.querySelector('#subtab-permissoes-abas .btn-primary');
        if (btn) {
             btn.style.background = 'var(--warning)';
             btn.textContent = 'Salvar Pendente...';
        }
    }

    async saveTabPermissionsToCloud() {
        try {
            await this.db.collection('config').doc('tabPermissions').set({ 
                permissions: this.tabPermissions,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            await this.loadTabPermissions();
            this.renderTabsNavigation(); 
            
            alert("Permissões de abas salvas com sucesso!");
            
            const btn = document.querySelector('#subtab-permissoes-abas .btn-primary');
            if (btn) {
                 btn.style.background = 'var(--success)';
                 btn.textContent = 'Configuração Salva!';
                 setTimeout(() => {
                     this.loadTabPermissionsPanel(); 
                 }, 1000);
            }
            
        } catch (error) {
            console.error("Erro ao salvar permissões:", error);
            alert(`Erro ao salvar permissões: ${error.message}`);
        }
    }

    renderTabsNavigation() {
        const tabsNavContainer = document.getElementById('tabs-nav-container');
        if (!tabsNavContainer) return;
        const tabsNav = tabsNavContainer.querySelector('.tabs-nav');
        
        const allTabs = [
            { id: 'tab-gerenciar', icon: 'fas fa-cogs', title: 'Gerenciar' },
            { id: 'tab-moagem', icon: 'fas fa-industry', title: 'Moagem' },
            { id: 'tab-alertas', icon: 'fas fa-exclamation-triangle', title: 'Alertas' },
            { id: 'tab-caminhao', icon: 'fas fa-truck', title: 'Caminhões' },
            { id: 'tab-equipamento', icon: 'fas fa-tractor', title: 'Colheita' },
            { id: 'tab-frentes', icon: 'fas fa-map-marked-alt', title: 'Frentes' },
            { id: 'tab-metas', icon: 'fas fa-bullseye', title: 'Metas' },
            { id: 'tab-horaria', icon: 'fas fa-clock', title: 'Entrega HxH' },
            { id: 'tab-usuarios', icon: 'fas fa-user-lock', title: 'Usuários' }
        ];

        tabsNav.innerHTML = allTabs.filter(tab => this.canAccessTab(tab.id)).map(tab => {
            return `
                <button class="tab-button ${tab.id === 'tab-usuarios' ? 'admin-tab' : ''}" onclick="window.agriculturalDashboard.showTab('${tab.id}')">
                    <i class="${tab.icon}"></i> ${tab.title}
                </button>
            `;
        }).join('');
    }

    // =================== AUTENTICAÇÃO E PERFIL ===================
    
    async handleAuthStateChange(user) {
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('hidden');

            await this.fixUserProfile(user);
            await this.loadCurrentUserProfile();
            this.renderTabsNavigation();
            
            const initialTab = this.canAccessTab('tab-gerenciar') ? 'tab-gerenciar' : 'tab-moagem';
            this.showTab(initialTab);

            this.startLoadingProcess(); 
            this.setupAutoRefresh(); 
            
            if (await this.isCurrentUserAdmin()) {
                this.loadUserManagementData();
            }

        } else {
            document.getElementById('main-dashboard').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            this.currentUserRole = null;
            this.currentUserCustomPermissions = null;
            
            if (this.refreshTimeoutId) clearTimeout(this.refreshTimeoutId);
            if (this.isPresentationActive) {
                this.stopPresentation();
            }
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        const userIdentifier = document.getElementById('login-user').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('auth-error');
        if (errorEl) errorEl.classList.add('hidden');
        document.getElementById('auth-success').classList.add('hidden');

        try {
            let email = userIdentifier.trim().toLowerCase();
            if (!email.includes('@')) {
                email += "@agro.local";
            }
            
            await this.auth.signInWithEmailAndPassword(email, password);
            
            document.getElementById('login-user').value = '';
            document.getElementById('login-password').value = '';
            if (errorEl) errorEl.textContent = '';
        }
        catch (error) {
            if (errorEl) {
                let message = error.message.includes('password') ? 'E-mail ou senha incorretos.' : error.message;
                errorEl.textContent = `Erro: ${message}`;
                errorEl.classList.remove('hidden');
            }
        }
    }

    handleForgotPassword(e) {
        e.preventDefault();
        const userIdentifier = document.getElementById('login-user').value;
        const errorEl = document.getElementById('auth-error');
        const successEl = document.getElementById('auth-success');
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        let email = userIdentifier.trim().toLowerCase();

        if (!email || !email.includes('@')) {
            if (errorEl) {
                errorEl.textContent = "Por favor, insira o seu E-mail no campo acima para redefinir a senha.";
                errorEl.classList.remove('hidden');
            }
            return;
        }

        if (!confirm(`Deseja enviar um link de redefinição de senha para o e-mail: ${email}?`)) {
            return;
        }

        this.auth.sendPasswordResetEmail(email)
            .then(() => {
                if (successEl) {
                    successEl.innerHTML = `<i class="fas fa-check-circle"></i> E-mail de redefinição enviado para <strong>${email}</strong>. Verifique sua caixa de entrada.`;
                    successEl.classList.remove('hidden');
                }
            })
            .catch((error) => {
                let message;
                if (error.code === 'auth/user-not-found') {
                    message = "Usuário não encontrado. Verifique o e-mail informado.";
                } else {
                    message = `Erro ao enviar e-mail: ${error.message}`;
                }
                if (errorEl) {
                    errorEl.textContent = message;
                    errorEl.classList.remove('hidden');
                }
            });
    }

    async fixUserProfile(user) {
        try {
            const userRef = this.db.collection("users").doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists || 
                !userDoc.data().role || 
                userDoc.data().password || 
                userDoc.data().role === user.uid) {
                
                const updateData = {
                    email: user.email,
                    role: userDoc.exists && userDoc.data().role && 
                          userDoc.data().role !== user.uid ? 
                          userDoc.data().role : 'viewer', 
                    createdAt: userDoc.exists && userDoc.data().createdAt ? 
                               userDoc.data().createdAt : 
                               firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (userDoc.exists && userDoc.data().password) {
                    await userRef.update({
                        password: firebase.firestore.FieldValue.delete()
                    });
                }
                
                await userRef.set(updateData, { merge: true });
            }
            
        } catch (error) {
            console.error("Erro ao corrigir perfil:", error);
        }
    }
    
    handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const errorEl = document.getElementById('auth-error');
        const successEl = document.getElementById('auth-success');
        if(errorEl) errorEl.classList.add('hidden');
        if(successEl) successEl.classList.add('hidden');
        
        if (!name || !email || !phone) {
             if(errorEl) {
                 errorEl.textContent = "Preencha todos os campos para solicitar o cadastro.";
                 errorEl.classList.remove('hidden');
             }
             return;
        }

        this.db.collection("requests").doc(email).set({
            name: name,
            email: email.trim().toLowerCase(),
            phone: phone,
            status: 'pending', 
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            document.getElementById('signup-name').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-phone').value = '';
            
            if(successEl) {
                successEl.innerHTML = "<strong>Solicitação de cadastro enviada!</strong> Você receberá uma mensagem em até 24h com a senha de acesso após a aprovação do administrador.";
                successEl.classList.remove('hidden');
            }
            
            setTimeout(() => {
                 document.getElementById('signup-form').classList.add('hidden');
                 document.getElementById('login-form').classList.remove('hidden');
                 if(successEl) successEl.classList.add('hidden');
            }, 5000);

        })
        .catch((error) => {
            if(errorEl) {
                errorEl.textContent = `Erro ao solicitar cadastro: ${error.message}`;
                errorEl.classList.remove('hidden');
            }
        });
    }

    handleLogout() {
        if (confirm("Tem certeza que deseja sair?")) {
            this.auth.signOut()
                .then(() => {
                    console.log("Usuário deslogado com sucesso");
                })
                .catch((error) => {
                    console.error("Erro ao deslogar:", error);
                });
        }
    }
    
    async isCurrentUserAdmin() {
        try {
            const user = this.auth.currentUser;
            if (!user) return false;
            
            const userDoc = await this.db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUserRole = userData.role;
                return userData.role === 'admin';
            }
            this.currentUserRole = 'viewer'; 
            return false;
        } catch (error) {
            console.error("Erro ao verificar permissões:", error);
            this.currentUserRole = 'viewer';
            return false;
        }
    }
    
    async loadCurrentUserProfile() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const userDoc = await this.db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUserRole = userData.role;
                this.currentUserCustomPermissions = userData.customPermissions || null;
            } else {
                 this.currentUserRole = 'viewer';
                 this.currentUserCustomPermissions = null;
            }
            
            await this.loadTabPermissions();
            
            const currentUserEmailEl = document.getElementById('current-user-email');
            if (currentUserEmailEl) {
                currentUserEmailEl.textContent = user.email;
            }
            
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
        }
    }

    toggleMenu(forceClose = false) {
        const menuContainer = document.getElementById('tabs-nav-container');
        const backdrop = document.getElementById('menu-backdrop');
        const isMobile = window.innerWidth <= 768;

        if (!menuContainer || !backdrop) return;

        if (!isMobile || this.isPresentationActive) {
            menuContainer.classList.remove('open');
            backdrop.classList.remove('active');
            document.body.style.overflowY = 'auto'; 
            return;
        }

        if (forceClose || menuContainer.classList.contains('open')) {
            menuContainer.classList.remove('open');
            backdrop.classList.remove('active');
            backdrop.style.display = 'none'; 
            document.body.style.overflowY = 'auto'; 
            document.body.classList.remove('no-scroll'); 

        } else {
            menuContainer.classList.add('open');
            backdrop.classList.add('active');
            backdrop.style.display = 'block'; 
            document.body.style.overflowY = 'hidden'; 
            document.body.classList.add('no-scroll');
        }
    }
    
    setupAutoRefresh() {
        if (this.refreshTimeoutId) clearTimeout(this.refreshTimeoutId);
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        let targetHour = currentHour;
        let targetMinutes = 0;
        
        if (currentMinutes < 30) {
            targetMinutes = 30;
        } else {
            targetHour = currentHour + 1;
            targetMinutes = 0;
            if (targetHour === 24) targetHour = 0;
        }

        let nextFixedTime = new Date();
        nextFixedTime.setHours(targetHour);
        nextFixedTime.setMinutes(targetMinutes);
        nextFixedTime.setSeconds(0);
        nextFixedTime.setMilliseconds(0);

        if (nextFixedTime.getTime() <= now.getTime()) {
            nextFixedTime = new Date(nextFixedTime.getTime() + 24 * 3600 * 1000);
        }

        const delayMs = nextFixedTime.getTime() - now.getTime();
        
        this.refreshTimeoutId = setTimeout(() => {
            this.startLoadingProcess();
            this.setupAutoRefresh();
        }, delayMs);
        
        this.updateNextRefreshDisplay(nextFixedTime);
    }
    
    initializeCarousel() {
        this.stopCarousel(); 
        this.carouselInterval = setInterval(() => {
            this.navigateCarousel(1); 
        }, 20000); 

        this.showSlide(this.currentSlideIndex);
    }
    
    stopCarousel() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
            this.carouselInterval = null;
        }
    }
    
    navigateCarousel(direction) {
        const slides = document.querySelectorAll('.carousel-slide');
        if (slides.length === 0) return;
        
        let newIndex = this.currentSlideIndex + direction;
        
        if (newIndex >= slides.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = slides.length - 1;
        }

        this.showSlide(newIndex);
        this.initializeCarousel();
    }

    showSlide(index) {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.carousel-indicators .indicator');
        
        if (slides.length === 0 || index < 0 || index >= slides.length) return;

        slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        
        indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        this.currentSlideIndex = index;
        
        const chartIds = ['realHourlyChart', 'potencialHourlyChart', 'rotacaoHourlyChart'];
        const activeChartId = chartIds[index];
        
        if (this.visualizer && this.visualizer.charts[activeChartId]) {
            this.visualizer.charts[activeChartId].resize();
        }
    }
    
    loadMeta() {
        const metas = {
            'metaMoagem': '25000',
            'metaRotacao': '1100'
        };
        
        Object.keys(metas).forEach(key => {
            const savedMeta = localStorage.getItem(key);
            const input = document.getElementById(key + 'Input');
            
            if (input) {
                if (savedMeta && !isNaN(parseFloat(savedMeta))) {
                    input.value = savedMeta;
                } else {
                    input.value = metas[key];
                }
            }
        });
        
        localStorage.removeItem('metaColheita');
        this.updateMoagemTargetDisplay();
    }

    saveMeta(newValue, key) {
        if (newValue && !isNaN(parseFloat(newValue))) {
            localStorage.setItem(key, newValue);
        }
        
        if (key === 'metaMoagem') {
            this.updateMoagemTargetDisplay(); 
            if (this.data.length > 0) {
                 this.recalculateProjectionAndRender();
            } else if (this.analysisResult) {
                 this.visualizer.updateDashboard(this.analysisResult);
            }
        }
        
        if (key === 'metaRotacao' && this.analysisResult) {
            this.visualizer.updateDashboard(this.analysisResult);
        }
    }
    
    updateMoagemTargetDisplay() {
        const targetValue = parseFloat(localStorage.getItem('metaMoagem') || '25000');
        const displayEl = document.getElementById('moagemTargetDisplay');
        if (displayEl) {
            if (typeof Utils !== 'undefined' && Utils.formatNumber) {
                displayEl.textContent = Utils.formatNumber(targetValue) + ' t';
            } else {
                displayEl.textContent = targetValue.toLocaleString('pt-BR') + ' t';
            }
        }
    }
    
    recalculateProjectionAndRender() {
        this.showLoadingAnimation(); 

        this.analysisResult = this.analyzer.analyzeAll(this.data, this.potentialData, this.metaData, this.validationResult, this.acmSafraData);
        
        this.visualizer.updateDashboard(this.analysisResult);
        
        this.hideLoadingAnimation();
        
        this.initializeCarousel();
    }
    
    // 🟥 SHIFT TRACKER RESTAURADO (COM LÓGICA MATEMÁTICA)
    initShiftTracker() {
        const updateShift = () => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            let shiftName = '';
            let progress = 0;
            let cssClass = '';
            
            const startA = 7 * 60 + 45; 
            const startB = 16 * 60;        
            const startC = 23 * 60 + 40; 

            if (currentMinutes >= startA && currentMinutes < startB) {
                shiftName = 'Turno A (Manhã)';
                cssClass = 'turno-a';
                const totalDuration = startB - startA; 
                const elapsed = currentMinutes - startA;
                progress = (elapsed / totalDuration) * 100;
            }
            else if (currentMinutes >= startB && currentMinutes < startC) {
                shiftName = 'Turno B (Tarde)';
                cssClass = 'turno-b';
                const totalDuration = startC - startB; 
                const elapsed = currentMinutes - startB;
                progress = (elapsed / totalDuration) * 100;
            }
            else {
                shiftName = 'Turno C (Noite)';
                cssClass = 'turno-c';
                
                const totalDuration = (24 * 60 - startC) + startA; 
                
                let elapsed = 0;
                if (currentMinutes >= startC) {
                    elapsed = currentMinutes - startC;
                } else {
                    elapsed = (24 * 60 - startC) + currentMinutes;
                }
                progress = (elapsed / totalDuration) * 100;
            }

            const fillEl = document.getElementById('shiftProgressFill');
            const nameEl = document.getElementById('shiftName');
            const timeEl = document.getElementById('shiftTimeRemaining');

            if (fillEl && nameEl && timeEl) {
                fillEl.classList.remove('turno-a', 'turno-b', 'turno-c');
                fillEl.classList.add(cssClass);
                
                fillEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
                nameEl.textContent = shiftName;
                timeEl.textContent = `${progress.toFixed(1)}%`;
            }
        };

        updateShift();
        setInterval(updateShift, 10000); 
    }

    showLoadingAnimation() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoadingAnimation() {
        setTimeout(() => { 
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        }, 2000); 
    }
    
    _yieldControl() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    updateNextRefreshDisplay(targetTime) {
        const targetTimeStr = targetTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const displayEl = document.getElementById('refreshStatusText'); 

        if (displayEl) {
            displayEl.innerHTML = `Próxima atualização: ${targetTimeStr} 🔄️`;
        }
    }

    // --- NOVA LÓGICA DE FROTAS (SYNC COM FIREBASE) ---
    async syncFleetRegistry(data) {
        if (!this.db) {
            console.warn("Firestore não disponível para sincronização de frotas.");
            return 0;
        }

        const NOW = new Date();
        const CUTOFF_TIME = new Date(NOW.getTime() - (72 * 60 * 60 * 1000)); // 72 horas atrás
        const collectionRef = this.db.collection('fleet_registry');
        
        // 1. Identificar Frotas Únicas na importação atual
        // Usa o campo 'frota' mapeado pelo IntelligentProcessor
        const uniqueFleetsInImport = new Set();
        data.forEach(row => {
            if (row.frota) {
                // Remove zeros à esquerda e espaços para padronizar ID
                const cleanFrota = String(row.frota).trim().replace(/^0+/, '');
                if(cleanFrota.length > 0) uniqueFleetsInImport.add(cleanFrota);
            }
        });

        if (uniqueFleetsInImport.size === 0) return 0;

        try {
            console.log(`[FleetSync] Sincronizando ${uniqueFleetsInImport.size} frotas ativas...`);

            // 2. Atualizar 'last_seen' em Lote (Batch Write)
            const fleetsArray = Array.from(uniqueFleetsInImport);
            const chunkSize = 400; // Limite seguro para batch do Firestore
            
            for (let i = 0; i < fleetsArray.length; i += chunkSize) {
                const chunk = fleetsArray.slice(i, i + chunkSize);
                const batch = this.db.batch();
                
                chunk.forEach(frotaId => {
                    const docRef = collectionRef.doc(frotaId);
                    batch.set(docRef, {
                        id: frotaId,
                        last_seen: firebase.firestore.Timestamp.fromDate(NOW),
                        active: true
                    }, { merge: true });
                });

                await batch.commit();
            }

            // 3. Contar Frotas Válidas (Last Seen <= 72h)
            // Executa query no banco para pegar o total real de frotas ativas
            const snapshot = await collectionRef
                .where('last_seen', '>=', firebase.firestore.Timestamp.fromDate(CUTOFF_TIME))
                .get();
            
            const totalRegistered = snapshot.size;
            console.log(`[FleetSync] Total Registrado (72h): ${totalRegistered}`);
            
            return totalRegistered;

        } catch (e) {
            console.error("[FleetSync] Erro ao sincronizar frotas:", e);
            // Em caso de erro, retorna o fallback (frotas atuais)
            return uniqueFleetsInImport.size; 
        }
    }

    async processDataAsync(productionData, potentialData, metaData, refreshTargetTime) {
        await this._yieldControl(); 
        this.validationResult = this.validator.validateAll(productionData);
        this.renderAlerts(this.validationResult.anomalies);
        
        await this._yieldControl(); 
        this.analysisResult = this.analyzer.analyzeAll(productionData, potentialData, this.metaData, this.validationResult, this.acmSafraData);
        
        // --- INÍCIO DA SINCRONIZAÇÃO DE FROTAS ---
        await this._yieldControl();
        // Sincroniza com Firebase e obtém o total registrado nas últimas 72h
        const totalRegistered = await this.syncFleetRegistry(productionData);
        
        // Injeta o total no objeto de análise para que o VisualizerGrid possa usar
        if (this.analysisResult) {
            this.analysisResult.totalRegisteredFleets = totalRegistered;
        }
        // --- FIM DA SINCRONIZAÇÃO DE FROTAS ---

        await this._yieldControl(); 
        this.visualizer.updateDashboard(this.analysisResult);

        this.showAnalyticsSection(true);
        if (this.canAccessTab('tab-moagem')) {
            this.showTab('tab-moagem'); 
        }
        
        this.updateNextRefreshDisplay(refreshTargetTime); 
        
        this.initializeCarousel();
    }
    
    // =================== FETCH E UPLOAD ===================

    async fetchFilesFromCloud() {
        const cacheBuster = Date.now(); 
        const googleSheetsUrls = {
            'Producao.xlsx': `https://docs.google.com/spreadsheets/d/e/2PACX-1vTxQGupaac6UXLCR1CHPP6B5goadSCpYlhX1tN5DHHHdXpS9hgFYMbgVXrmbrYP-jcoirOQ0N4oi5ze/pub?output=csv&t=${cacheBuster}`,
            'Metas.xlsx': `https://docs.google.com/spreadsheets/d/e/2PACX-1vQNEyAUSGlaGXiM2ph5B8ti0OEIBhbtTjE3qOcWhmtJAAatW3G6_HFkFu94oZApjofbDWyL3s7YSAVm/pub?output=csv&t=${cacheBuster}`,
            'Potencial.xlsx': `https://docs.google.com/spreadsheets/d/e/2PACX-1vRO00gvJ9bi5lAsVOvNO2E4jXPSyDzVnjCOAqFeG9mB_KAD8BtyGmPMd8bQIANyo_Fj_Ve3mGgqgejI/pub?output=csv&t=${cacheBuster}`,
            'AcmSafra.xlsx': `https://docs.google.com/spreadsheets/d/e/2PACX-1vQHEqli7vcRkApksm7zj7wZAMYG6vWxkc3OaTVyCXZpnUOEsYhzErGYFSOwbkeHNrxAjaoF-GrNY1h7/pub?output=csv&t=${cacheBuster}`
        };

        let results = [];
        let successCount = 0;
        let missingFiles = [];

        for (const [name, url] of Object.entries(googleSheetsUrls)) {
            try {
                this.showLoadingAnimation();
                
                const response = await fetch(url);
                
                let csvText;
                if (!response.ok) {
                   throw new Error(`Falha no download - Status HTTP: ${response.status}`);
                } else {
                    csvText = await response.text(); 
                }

                if (name.includes('AcmSafra')) {
                    // Correção específica: Processar CSV do Acumulado Safra
                    if (typeof XLSX !== 'undefined') {
                        // O Google Sheets publica como CSV, então lemos como string/csv
                        const wb = XLSX.read(csvText, { type: 'string' });
                        const sheet = wb.Sheets[wb.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet);
                        this.acmSafraData = json; 
                        successCount++;
                    }
                } else {
                    const result = await this.processor.processCSV(csvText, name);
                    
                    if (result && Array.isArray(result.data) && result.data.length > 0) {
                        
                        if (result.type === 'PRODUCTION') {
                            this.data = this.data.concat(result.data); 
                        } else if (result.type === 'POTENTIAL') {
                            this.potentialData = this.potentialData.concat(result.data); 
                        } else if (result.type === 'META') {
                            this.metaData = this.metaData.concat(result.data); 
                        }
                        
                        results.push(result);
                        successCount++;
                    } else {
                         missingFiles.push(name + ' (Vazio/Inválido)');
                    }
                }

            } catch (error) {
                console.error(`Erro ao baixar ${name}:`, error);
                missingFiles.push(name);
            }
        }

        return { successCount, results, missingFiles };
    }

    async handleFileUpload(event) {
        if (this.currentUserRole !== 'admin' && this.currentUserRole !== 'editor') {
            alert(`Permissão negada. Apenas Administradores e Editores podem fazer upload de arquivos.`);
            return;
        }

        this.showLoadingAnimation(); 
        
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.data = [];
        this.potentialData = [];
        this.metaData = []; 
        this.acmSafraData = []; 
        
        this.clearResults(); 
        this.stopCarousel(); 

        this.startLoadingProcess(); 
    }
    
    async startLoadingProcess() {
        this.showLoadingAnimation();
        
        this.data = [];
        this.potentialData = [];
        this.metaData = [];
        this.acmSafraData = [];
        this.clearResults();
        this.stopCarousel();
        
        let cloudMissingFiles = [];
        const fileInfoElement = document.getElementById('fileInfo');
        
        // CHAMA A FUNÇÃO FETCH ATUALIZADA
        const cloudResult = await this.fetchFilesFromCloud();
        
        cloudMissingFiles = cloudResult.missingFiles;

        if (this.data.length === 0 && this.potentialData.length === 0 && this.metaData.length === 0 && this.acmSafraData.length === 0) {
            this.hideLoadingAnimation();
            this.showAnalyticsSection(false);
            
            let missingFilesString = cloudMissingFiles.join(', ');
            let errorMessage = `Falha na automação. Arquivos ausentes: ${missingFilesString}. Por favor, use a aba 'Gerenciar' para o upload manual.`;
            
            alert(errorMessage); 
            return;
        }

        if(fileInfoElement) {
            
            let msg = [];
            let missingFilesList = cloudMissingFiles;
            
            const essentialFiles = {
                'Produção': this.data.length > 0,
                'Potencial': this.potentialData.length > 0,
                'Metas': this.metaData.length > 0,
                'AcmSafra': this.acmSafraData.length > 0
            };
            
            if (essentialFiles.Produção) msg.push(`Produção`);
            if (essentialFiles.Potencial) msg.push(`Potencial`);
            if (essentialFiles.Metas) msg.push(`Metas`);
            if (essentialFiles.AcmSafra) msg.push(`AcmSafra`);

            let finalMessage = `Arquivos carregados: ${msg.join(' + ')}.`;
            let statusColor = 'var(--success)';
            if (missingFilesList.length > 0) {
                finalMessage = `Carregados: ${msg.join(' + ')}.`;
            }
            
            finalMessage += ` (Via Google Sheets)`;

            fileInfoElement.textContent = finalMessage;
            fileInfoElement.style.color = statusColor;
        }

        const now = new Date();
        let targetTime = new Date(now);
        
        if (now.getMinutes() < 30) {
            targetTime.setMinutes(30);
        } else {
            targetTime.setHours(now.getHours() + 1);
            targetTime.setMinutes(0);
        }
        targetTime.setSeconds(0);
        targetTime.setMilliseconds(0);

        await this.processDataAsync(this.data, this.potentialData, this.metaData, targetTime); 

        this.hideLoadingAnimation();
    }
    
    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        const dropzoneCard = document.getElementById('dropzoneCard'); 
        if (dropzoneCard) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzoneCard.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            dropzoneCard.addEventListener('dragenter', () => {
                dropzoneCard.classList.add('hover');
            }, false);
            
            dropzoneCard.addEventListener('dragleave', () => {
                dropzoneCard.classList.remove('hover');
            }, false);

            dropzoneCard.addEventListener('drop', (e) => {
                dropzoneCard.classList.remove('hover');
                
                let files = [];
                if (e.dataTransfer.items) {
                    for (let i = 0; i < e.dataTransfer.items.length; i++) {
                        const item = e.dataTransfer.items[i];
                        if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (file) files.push(file);
                        }
                    }
                } else if (e.dataTransfer.files.length > 0) {
                    files = Array.from(e.dataTransfer.files);
                }
                
                if (files.length > 0) {
                    const eventMock = { target: { files: files } };
                    this.handleFileUpload(eventMock);
                }
            }, false);
        }

        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const chartIds = ['realHourlyChart', 'potencialHourlyChart', 'rotacaoHourlyChart'];
                const activeChartId = chartIds[this.currentSlideIndex];

                if(this.visualizer && this.visualizer.charts[activeChartId]) {
                    this.visualizer.exportChart(activeChartId);
                } else {
                    alert('Nenhum dado disponível para exportação.');
                }
            });
        }
        
        const metaMoagemInput = document.getElementById('metaMoagemInput');
        if (metaMoagemInput) {
            metaMoagemInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); 
                }
            });
            metaMoagemInput.addEventListener('change', (e) => {
                e.preventDefault();
                this.saveMeta(e.target.value, 'metaMoagem');
            });
        }
        
        const metaRotacaoInput = document.getElementById('metaRotacaoInput');
        if (metaRotacaoInput) {
            metaRotacaoInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); 
                }
            });
            metaRotacaoInput.addEventListener('change', (e) => {
                e.preventDefault();
                this.saveMeta(e.target.value, 'metaRotacao');
            });
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
             logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        if (menuToggleBtn) {
            menuToggleBtn.addEventListener('click', () => this.toggleMenu());
        }
        
        const menuBackdrop = document.getElementById('menu-backdrop');
        if (menuBackdrop) {
            menuBackdrop.addEventListener('click', () => this.toggleMenu(true));
        }

        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (showSignupLink && loginForm && signupForm) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('auth-error').classList.add('hidden');
                document.getElementById('auth-success').classList.add('hidden');
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            });
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('auth-error').classList.add('hidden');
                document.getElementById('auth-success').classList.add('hidden');
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            });
        }
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        const adminUserForm = document.getElementById('admin-user-form');
        if (adminUserForm) {
            adminUserForm.addEventListener('submit', (e) => this.saveAdminUser(e));
        }
        
        document.querySelectorAll('#tab-usuarios .sub-tabs-nav button').forEach(button => {
             const onclickAttr = button.getAttribute('onclick');
             if (onclickAttr && onclickAttr.includes('showSubTab')) {
                 button.addEventListener('click', (e) => {
                     e.preventDefault();
                     const subTabId = onclickAttr.match(/showSubTab\('([^']+)'/)[1];
                     this.showSubTab(subTabId, button);
                 });
             }
         });
         
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.toggleMenu(true);
            }
        });
        
        const carouselNavBtns = document.querySelectorAll('.carousel-nav');
        if (carouselNavBtns) {
             carouselNavBtns.forEach(btn => {
                 btn.removeAttribute('onclick');
                 btn.addEventListener('click', (e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     const direction = btn.classList.contains('prev-btn') ? -1 : 1;
                     this.navigateCarousel(direction);
                 });
             });
        }
        
        // Adicionar event listener para o botão de captura de tela
        const screenshotBtn = document.getElementById('screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => this.captureScreenshot());
        }
        
        // Adicionar event listener para o botão de apresentação
        const presentationBtn = document.querySelector('.presentation-controls .btn-primary');
        if (presentationBtn) {
            presentationBtn.addEventListener('click', () => this.togglePresentation());
        }
        
        // Adicionar event listener para cliques durante apresentação (para mostrar controles)
        document.addEventListener('click', (e) => {
            if (this.isPresentationActive) {
                const controls = document.querySelector('.presentation-controls');
                if (controls) {
                    controls.style.opacity = '1';
                    setTimeout(() => {
                        if (this.isPresentationActive) {
                            controls.style.opacity = '0.3';
                        }
                    }, 3000);
                }
            }
        });
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = document.getElementById('theme-icon');
        if (icon) icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        if (this.analysisResult) {
             this.visualizer.updateDashboard(this.analysisResult);
        }
        
        const icon = document.getElementById('theme-icon');
        if (icon) icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    initializeParticles() {
        const canvas = document.getElementById('particles-js');
        if (!canvas) return;

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        const ctx = canvas.getContext('2d');
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        });
        resizeCanvas();

        const particles = [];
        const particleCount = 40;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedX: Math.random() * 0.5 - 0.25,
                speedY: Math.random() * 0.5 - 0.25,
                color: `rgba(0, 212, 255, ${Math.random() * 0.3})`
            });
        }

        const animate = () => {
            if (!this.isAnimatingParticles || this.isPresentationActive) { 
                this.animationFrameId = null; 
                return; 
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            this.animationFrameId = requestAnimationFrame(animate); 
        };
        this.animationFrameId = requestAnimationFrame(animate); 
    }
    
    clearResults() {
        this.currentSlideIndex = 0;
        this.stopCarousel(); 
        
        const lastWeighingText = document.getElementById('lastWeighingText');
        if (lastWeighingText) lastWeighingText.textContent = 'Aguardando atualização... 🔄️';
        
        if (this.visualizer && this.visualizer.kpisRenderer && this.visualizer.kpisRenderer.updateHeaderStats) {
            this.visualizer.kpisRenderer.updateHeaderStats({
                totalViagens: 0, viagensProprias: 0, viagensTerceiros: 0, totalPesoLiquido: 0, taxaAnalise: 0,
                distribuicaoFrota: { propria: 0, terceiros: 0 }, acumuladoSafra: 0
            });
        }
        
        const moagemAcumulado = document.getElementById('moagemAcumulado');
        if(moagemAcumulado) moagemAcumulado.textContent = '0 t';
        const moagemProgressBar = document.getElementById('moagemProgressBar');
        if(moagemProgressBar) moagemProgressBar.style.width = '0%';
        const moagemPerc = document.getElementById('moagemPerc');
        if(moagemPerc) moagemPerc.textContent = '0%';
        
        const moagemForecastEl = document.getElementById('moagemForecast');
        const moagemStatusEl = document.getElementById('moagemStatus');
        const forecastDifferenceContainer = document.getElementById('forecastDifferenceContainer');
        
        if (moagemForecastEl) moagemForecastEl.textContent = '0 t';
        if (forecastDifferenceContainer) forecastDifferenceContainer.textContent = '';
        if (moagemStatusEl) {
            moagemStatusEl.textContent = 'Calculando...';
            moagemStatusEl.className = 'forecast-badge';
        }

        ['topFrotasProprias', 'topFrotasTerceiros', 'topEquipamentosProprios', 'topEquipamentosTerceiros', 'topTransbordos', 'topOperadoresColheitaPropria'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = `<div class="top-list-item" style="justify-content: center;">Sem dados.</div>`;
        });
        
        const alerts = document.getElementById('alertsContainer');
        if(alerts) alerts.innerHTML = `
                <div class="alert-card active">
                    <i class="fas fa-info-circle" style="color: var(--primary);"></i>
                    <div>
                        <div class="alert-title">Aguardando Dados</div>
                        <div class="alert-message">Carregue um arquivo na aba 'Gerenciar'.</div>
                    </div>
                </div>
            `;
        
        const frontsGrid = document.getElementById('frontsGrid');
        if(frontsGrid) frontsGrid.innerHTML = '';
        
        const metasContainer = document.getElementById('frontsMetaContainer');
        if(metasContainer) metasContainer.innerHTML = '';
        
        const fleetGrid = document.getElementById('fleetStatusCardsGrid');
        if (fleetGrid) fleetGrid.innerHTML = `<p class="text-secondary" style="text-align: center;">Aguardando dados de Potencial.</p>`;

        if (this.visualizer && this.visualizer.destroyAllCharts) {
            this.visualizer.destroyAllCharts();
        }

        this.showAnalyticsSection(false);
    }
    
    showAnalyticsSection(enable) {
        const analyticalContent = document.getElementById('analyticalContent');
        if (analyticalContent) {
            if (enable) {
                analyticalContent.classList.remove('analytical-disabled');
                analyticalContent.classList.add('analytical-enabled');
            } else {
                analyticalContent.classList.remove('analytical-enabled');
                analyticalContent.classList.add('analytical-disabled');
            }
        }
    }
    
    renderAlerts(anomalies) {
        const alertsContainer = document.getElementById('alertsContainer');
        alertsContainer.innerHTML = '';

        if (!anomalies || anomalies.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert-card active">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <div>
                        <div class="alert-title">Dados Validados!</div>
                        <div class="alert-message">Nenhuma anomalia crítica encontrada.</div>
                    </div>
                </div>
            `;
            return;
        }

        anomalies.forEach(alert => {
            const alertDiv = document.createElement('div');
            let iconClass = alert.severity === 'critical' ? 'fa-times-circle' : 'fa-info-circle';
            alertDiv.className = `alert-card ${alert.severity}`;
            let detailHtml = alert.detail ? `<div class="alert-card-detail">${alert.detail}</div>` : '';

            alertDiv.innerHTML = `
                <div class="alert-content">
                    <div>
                        <i class="fas ${iconClass}"></i>
                        <div>
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                    </div>
                    ${detailHtml}
                </div>
            `;
            alertsContainer.appendChild(alertDiv);
        });
    }

    // =================== 📸 CAPTURA DE TELA OTIMIZADA ===================
    
    async captureScreenshot() {
        const activeTab = document.querySelector('.tab-pane.active');
        if (!activeTab) {
            alert("Nenhuma aba ativa para capturar.");
            return;
        }

        const exportBtn = document.querySelector('.btn-export');
        const originalBtnText = exportBtn ? exportBtn.innerHTML : '';
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            exportBtn.disabled = true;
        }

        const particles = document.getElementById('particles-js');
        const headerControls = document.querySelector('.header-controls');
        const menuToggle = document.querySelector('.menu-toggle-btn');
        
        const originalDisplay = [];
        [particles, headerControls, menuToggle].forEach(el => {
            if (el) {
                originalDisplay.push({ element: el, display: el.style.display });
                el.style.display = 'none';
            }
        });

        document.body.classList.add('snapshot-mode');
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const bgColor = isDark ? '#050A14' : '#F5F7FA';

            const canvas = await html2canvas(activeTab, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: bgColor,
                logging: false,
                imageTimeout: 0,
                onclone: (clonedDoc) => {
                    clonedDoc.querySelectorAll('.header-controls, .btn-cssbuttons, #particles-js, .menu-toggle-btn')
                        .forEach(el => el.style.display = 'none');
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Erro ao gerar imagem.");

                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    alert("Captura copiada para a área de transferência!");
                } catch (e) {
                    console.warn("Clipboard falhou, iniciando download.");
                    const link = document.createElement('a');
                    const now = new Date();
                    const timestamp = now.toLocaleDateString('pt-BR').replace(/\//g, '-') + 
                                     '_' + now.toLocaleTimeString('pt-BR').replace(/:/g, '-');
                    
                    let elementName = 'dashboard';
                    if (activeTab.id) {
                        elementName = activeTab.id.replace('tab-', '').toUpperCase();
                    }
                    
                    link.download = `DASHBOARD_${elementName}_${timestamp}.png`;
                    link.href = URL.createObjectURL(blob);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                    alert("Captura salva com sucesso!");
                }
            }, 'image/png');

        } catch (error) {
            console.error("Erro no snapshot:", error);
            alert("Erro ao capturar tela: " + error.message);
        } finally {
            document.body.classList.remove('snapshot-mode');
            originalDisplay.forEach(item => {
                if (item.element) {
                    item.element.style.display = item.display;
                }
            });
            if (exportBtn) {
                exportBtn.innerHTML = originalBtnText || '<i class="fas fa-camera"></i> Ações';
                exportBtn.disabled = false;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.agriculturalDashboard = new AgriculturalDashboard(); 
});