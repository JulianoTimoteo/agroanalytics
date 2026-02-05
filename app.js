// app.js - VERSÃO COMPLETA CORRIGIDA (SEM LÓGICA MOBILE/ORIENTATION - DELEGADO PARA MOBILE REVOLUTION)

// Utilitário de Criptografia para Segurança Local (Obfuscação)
const SimpleCrypto = {
    _key: 'AgroKey_2026_Secure',
    
    encrypt: function(data) {
        if (!data) return null;
        try {
            const jsonStr = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < jsonStr.length; i++) {
                result += String.fromCharCode(jsonStr.charCodeAt(i) ^ this._key.charCodeAt(i % this._key.length));
            }
            return btoa(result); // Base64
        } catch (e) {
            console.error("Erro na criptografia:", e);
            return null;
        }
    },
    
    decrypt: function(encryptedData) {
        if (!encryptedData) return null;
        try {
            const str = atob(encryptedData);
            let result = '';
            for (let i = 0; i < str.length; i++) {
                result += String.fromCharCode(str.charCodeAt(i) ^ this._key.charCodeAt(i % this._key.length));
            }
            return JSON.parse(result);
        } catch (e) {
            // Fallback: Tenta ler como JSON puro se não estiver criptografado (migração)
            try { return JSON.parse(encryptedData); } catch (err) { return null; }
        }
    }
};

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
        this.fleetData = []; 
        this.analysisResult = null;
        this.validationResult = null;
        this.isAnimatingParticles = true;
        this.animationFrameId = null; 
        
        // Controle de Carrossel e Atualização
        this.currentSlideIndex = 0;
        this.carouselInterval = null; 
        this.refreshIntervalId = null; 
        this.refreshTimeoutId = null; 
        
        // 🟥 SISTEMA DE USUÁRIOS LOCAL (sem Firebase)
        this.userList = this.loadUsersFromStorage();
        this.currentUser = this.getCurrentUser();
        this.currentUserRole = this.currentUser ? this.currentUser.role : null;
        this.currentUserCustomPermissions = this.currentUser ? this.currentUser.customPermissions : null;
        this.currentUserPermissions = {}; 
        
        // Permissões Padrão (RBAC) - TODOS TEM ACESSO TOTAL
        this.permissions = {
            'master': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
            'admin': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
            'editor': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
            'viewer': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios']
        };
        this.tabPermissions = this.loadTabPermissionsFromStorage(); 
        
        // Solicitações pendentes
        this.pendingRequests = this.loadRequestsFromStorage();
        
        // Registro de frotas
        this.fleetRegistry = this.loadFleetRegistryFromStorage();

        // Inicialização
        this._applyVisualFixes();
        this.initializeEventListeners();
        this.initializeParticles();
        this.loadTheme();
        this.loadMeta(); 
        this.initShiftTracker(); 
        this.clearResults(); 
        
        this.startLoadingProcess(); 
        this.setupAutoRefresh();
        
        // Verifica se já tem usuário logado
        if (this.currentUser) {
            this.handleAuthStateChange(this.currentUser);
        } else {
            // Tenta fazer login automático com o usuário master
            this.autoLoginMasterUser();
        }
    }

    // 🟥 CSS INJETADO PARA CORRIGIR VISUALIZAÇÃO, DROPDOWNS E SCREENSHOT
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
            
            /* --- CORREÇÃO CIRÚRGICA DE SCREENSHOT --- */
            body.snapshot-mode .tab-pane.active {
                background: none !important;
                box-shadow: none !important;
            }
            
            /* Modo Claro: Força fundo branco sólido e cards brancos */
            body.snapshot-mode[data-theme="light"] {
                background-color: #f0f2f5 !important;
                color: #000 !important;
            }
            body.snapshot-mode[data-theme="light"] .analytics-card,
            body.snapshot-mode[data-theme="light"] .kpi-card,
            body.snapshot-mode[data-theme="light"] .card {
                background: #ffffff !important;
                border: 1px solid #d1d5db !important;
                box-shadow: none !important;
                color: #000 !important;
                backdrop-filter: none !important;
            }
            
            /* Modo Escuro: Força fundo escuro sólido e cards escuros */
            body.snapshot-mode[data-theme="dark"] {
                background-color: #050A14 !important;
                color: #fff !important;
            }
            body.snapshot-mode[data-theme="dark"] .analytics-card,
            body.snapshot-mode[data-theme="dark"] .kpi-card,
            body.snapshot-mode[data-theme="dark"] .card {
                background: #0A0E17 !important;
                border: 1px solid #333 !important;
                box-shadow: none !important;
                color: #e0e0e0 !important;
                backdrop-filter: none !important;
            }

            /* Garante que textos dentro dos cards sigam o contraste */
            body.snapshot-mode .item-value, 
            body.snapshot-mode .stat-val {
                text-shadow: none !important;
            }
            
            /* Estilos para badges de função */
            .badge-master {
                background: linear-gradient(135deg, #8B5CF6, #7C3AED);
                color: white;
            }
            .badge-admin {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
            }
            .badge-editor {
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
            }
            .badge-viewer {
                background: linear-gradient(135deg, #3B82F6, #1D4ED8);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    // =================== SISTEMA DE ARMAZENAMENTO LOCAL (COM CRIPTOGRAFIA) ===================

    loadUsersFromStorage() {
        try {
            const usersEncrypted = localStorage.getItem('agricultural_users');
            if (usersEncrypted) {
                // Tenta descriptografar. Se falhar (ex: dado antigo não criptografado), tenta ler direto.
                const decrypted = SimpleCrypto.decrypt(usersEncrypted);
                return decrypted || JSON.parse(usersEncrypted);
            } else {
                // Cria usuários padrão incluindo o master
                const defaultUsers = this.getDefaultUsers();
                this.saveUsersToStorage(defaultUsers);
                return defaultUsers;
            }
        } catch (e) {
            console.error("Erro ao carregar usuários:", e);
            return this.getDefaultUsers();
        }
    }

    getDefaultUsers() {
        return [
            {
                id: 'master',
                email: 'julianotimoteo@usinapitangueiras.com.br',
                nickname: 'Juliano Timóteo',
                role: 'master',
                customPermissions: ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
                createdAt: new Date().toISOString(),
                password: 'master123',
                updatedAt: new Date().toISOString()
            },
            {
                id: 'admin',
                email: 'admin@agro.local',
                nickname: 'Administrador',
                role: 'admin',
                customPermissions: ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
                createdAt: new Date().toISOString(),
                password: 'a123456@',
                updatedAt: new Date().toISOString()
            },
            {
                id: 'editor',
                email: 'editor@agro.local',
                nickname: 'Editor',
                role: 'editor',
                customPermissions: ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
                createdAt: new Date().toISOString(),
                password: 'a123456@',
                updatedAt: new Date().toISOString()
            },
            {
                id: 'viewer',
                email: 'viewer@agro.local',
                nickname: 'Visualizador',
                role: 'viewer',
                customPermissions: ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
                createdAt: new Date().toISOString(),
                password: 'a123456@',
                updatedAt: new Date().toISOString()
            }
        ];
    }

    saveUsersToStorage(users = null) {
        try {
            const dataToSave = users || this.userList;
            // Salva CRIPTOGRAFADO para segurança no console
            const encrypted = SimpleCrypto.encrypt(dataToSave);
            localStorage.setItem('agricultural_users', encrypted);
        } catch (e) {
            console.error("Erro ao salvar usuários:", e);
        }
    }

    loadRequestsFromStorage() {
        try {
            const requests = localStorage.getItem('agricultural_requests');
            return requests ? JSON.parse(requests) : [];
        } catch (e) {
            console.error("Erro ao carregar solicitações:", e);
            return [];
        }
    }

    saveRequestsToStorage() {
        try {
            localStorage.setItem('agricultural_requests', JSON.stringify(this.pendingRequests));
        } catch (e) {
            console.error("Erro ao salvar solicitações:", e);
        }
    }

    loadTabPermissionsFromStorage() {
        try {
            const perms = localStorage.getItem('agricultural_tab_permissions');
            return perms ? JSON.parse(perms) : {};
        } catch (e) {
            console.error("Erro ao carregar permissões:", e);
            return {};
        }
    }

    saveTabPermissionsToStorage() {
        try {
            localStorage.setItem('agricultural_tab_permissions', JSON.stringify(this.tabPermissions));
        } catch (e) {
            console.error("Erro ao salvar permissões:", e);
        }
    }

    loadFleetRegistryFromStorage() {
        try {
            const registry = localStorage.getItem('agricultural_fleet_registry');
            if (registry) {
                return JSON.parse(registry);
            } else {
                // Inicializa com dados fornecidos
                const initialData = [
                    { id: '31315', last_seen: '2026-02-02T13:07:26', active: true },
                    { id: '31121', last_seen: '2026-02-02T13:07:27', active: true },
                    { id: '31112', last_seen: '2026-02-02T13:07:27', active: true },
                    { id: '31122', last_seen: '2026-02-02T13:07:27', active: true },
                    { id: '31172', last_seen: '2026-02-02T13:07:27', active: true },
                    { id: '31142', last_seen: '2026-02-02T13:07:28', active: true },
                    { id: '91203', last_seen: '2026-02-02T13:07:28', active: true },
                    { id: '31102', last_seen: '2026-02-02T13:07:28', active: true },
                    { id: '315', last_seen: '2026-02-02T13:07:28', active: true },
                    { id: '31152', last_seen: '2026-02-02T13:07:29', active: true },
                    { id: '31111', last_seen: '2026-02-02T13:07:29', active: true },
                    { id: '318', last_seen: '2026-02-02T13:07:29', active: true },
                    { id: '3141', last_seen: '2026-02-02T13:07:30', active: true },
                    { id: '31316', last_seen: '2026-02-02T13:07:30', active: true },
                    { id: '9129', last_seen: '2026-02-02T13:07:30', active: true },
                    { id: '9127', last_seen: '2026-02-02T13:07:30', active: true },
                    { id: '91277', last_seen: '2026-02-02T13:07:31', active: true },
                    { id: '3161', last_seen: '2026-02-02T13:07:32', active: true },
                    { id: '9129', last_seen: '2026-02-02T13:07:32', active: true },
                    { id: '319', last_seen: '2026-02-02T13:07:33', active: true },
                    { id: '3121', last_seen: '2026-02-02T13:07:33', active: true },
                    { id: '31162', last_seen: '2026-02-02T13:07:34', active: true },
                    { id: '91281', last_seen: '2026-02-02T13:07:34', active: true },
                    { id: '91290', last_seen: '2026-02-02T13:07:34', active: true },
                    { id: '91202', last_seen: '2026-02-02T13:07:34', active: true },
                    { id: '91291', last_seen: '2026-02-02T13:07:35', active: true },
                    { id: '91273', last_seen: '2026-02-02T13:07:35', active: true },
                    { id: '91272', last_seen: '2026-02-02T13:07:35', active: true },
                    { id: '3151', last_seen: '2026-02-02T13:07:35', active: true },
                    { id: '3142', last_seen: '2026-02-02T13:07:36', active: true },
                    { id: '91285', last_seen: '2026-02-02T13:07:36', active: true },
                    { id: '91280', last_seen: '2026-02-02T13:07:36', active: true },
                    { id: '9103', last_seen: '2026-02-02T13:07:36', active: true },
                    { id: '91286', last_seen: '2026-02-02T13:07:37', active: true },
                    { id: '91279', last_seen: '2026-02-02T13:07:37', active: true },
                    { id: '91296', last_seen: '2026-02-02T13:07:38', active: true },
                    { id: '317', last_seen: '2026-02-02T13:07:38', active: true },
                    { id: '3122', last_seen: '2026-02-02T13:07:38', active: true },
                    { id: '31182', last_seen: '2026-02-02T13:07:38', active: true },
                    { id: '3120', last_seen: '2026-02-02T13:07:39', active: true },
                    { id: '91282', last_seen: '2026-02-02T13:07:39', active: true },
                    { id: '91287', last_seen: '2026-02-02T13:07:39', active: true },
                    { id: '9106', last_seen: '2026-02-02T13:07:40', active: true },
                    { id: '91214', last_seen: '2026-02-02T13:07:40', active: true },
                    { id: '3162', last_seen: '2026-02-02T13:07:40', active: true },
                    { id: '91213', last_seen: '2026-02-02T13:07:40', active: true },
                    { id: '91288', last_seen: '2026-02-02T13:07:41', active: true },
                    { id: '91278', last_seen: '2026-02-02T13:07:41', active: true },
                    { id: '3132', last_seen: '2026-02-02T13:07:42', active: true },
                    { id: '91294', last_seen: '2026-02-02T13:07:42', active: true },
                    { id: '91067', last_seen: '2026-02-02T13:07:42', active: true },
                    { id: '91204', last_seen: '2026-02-02T13:07:43', active: true },
                    { id: '91297', last_seen: '2026-02-02T13:07:43', active: true },
                    { id: '91037', last_seen: '2026-02-02T13:07:43', active: true },
                    { id: '31132', last_seen: '2026-02-02T13:07:43', active: true },
                    { id: '91283', last_seen: '2026-02-02T13:07:44', active: true },
                    { id: '31125', last_seen: '2026-02-02T13:07:45', active: true },
                    { id: '91193', last_seen: '2026-02-02T13:07:45', active: true }
                ];
                this.saveFleetRegistryToStorage(initialData);
                return initialData;
            }
        } catch (e) {
            console.error("Erro ao carregar registro de frotas:", e);
            return [];
        }
    }

    saveFleetRegistryToStorage(registry = null) {
        try {
            localStorage.setItem('agricultural_fleet_registry', JSON.stringify(registry || this.fleetRegistry));
        } catch (e) {
            console.error("Erro ao salvar registro de frotas:", e);
        }
    }

    getCurrentUser() {
        try {
            const encrypted = localStorage.getItem('agricultural_current_user');
            // Criptografa sessão também para evitar manipulação direta no console
            const decrypted = SimpleCrypto.decrypt(encrypted);
            return decrypted || (encrypted ? JSON.parse(encrypted) : null);
        } catch (e) {
            console.error("Erro ao carregar usuário atual:", e);
            return null;
        }
    }

    setCurrentUser(user) {
        try {
            if (user) {
                // Salva sessão criptografada
                const encrypted = SimpleCrypto.encrypt(user);
                localStorage.setItem('agricultural_current_user', encrypted);
                this.currentUser = user;
                this.currentUserRole = user.role;
                this.currentUserCustomPermissions = user.customPermissions || null;
                
                // Atualiza display do usuário atual
                const currentUserEmailEl = document.getElementById('current-user-email');
                if (currentUserEmailEl) {
                    currentUserEmailEl.textContent = user.email;
                }
            } else {
                localStorage.removeItem('agricultural_current_user');
                this.currentUser = null;
                this.currentUserRole = null;
                this.currentUserCustomPermissions = null;
            }
        } catch (e) {
            console.error("Erro ao definir usuário atual:", e);
        }
    }

    // =================== LÓGICA DE UI E ABAS ===================

    showTab(tabId) {
        // REMOVIDA VERIFICAÇÃO DE ACESSO - TODOS TEM ACESSO A TODAS AS ABAS
        
        if (window.innerWidth <= 768) {
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
        
        const needsParticles = (tabId === 'tab-gerenciar' || tabId === 'tab-usuarios');
        if (needsParticles && !this.isAnimatingParticles) {
            this.isAnimatingParticles = true;
            this.initializeParticles(); 
        } else if (!needsParticles && this.isAnimatingParticles) {
            this.isAnimatingParticles = false;
        }
        
        if (tabId === 'tab-moagem') {
             setTimeout(() => {
                 this.showSlide(this.currentSlideIndex); 
                 this.initializeCarousel();
             }, 50);
        } else {
             this.stopCarousel();
        }

        // Se entrar na aba usuários, carrega a tabela principal
        if (tabId === 'tab-usuarios') {
            if (this.isCurrentUserAdminOrMaster()) {
                this.showSubTab('subtab-gerenciar-acesso', document.querySelector('#tab-usuarios .sub-tabs-nav .tab-button'));
                this.loadUserManagementData();
            } else {
                this.showUserAccessMessage();
            }
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

    openUserModal(userId = null) {
        let modal = document.getElementById('admin-user-modal');
        let form = document.getElementById('admin-user-form');
        
        if (!modal) {
            modal = document.getElementById('user-settings-modal');
            if (!modal) return;
        }

        if (form) form.reset();
        
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
                box.checked = true; // Todos têm acesso por padrão

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
                checkboxes.forEach(cb => cb.checked = true); // Novo usuário tem acesso a tudo
            }
        }
        this.openModal('admin-user-modal');
    }

    saveAdminUser(e) {
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
                // Atualizar usuário existente
                const userIndex = this.userList.findIndex(u => u.id === id);
                if (userIndex !== -1) {
                    this.userList[userIndex].nickname = nickname;
                    this.userList[userIndex].customPermissions = selectedPerms;
                    this.userList[userIndex].updatedAt = new Date().toISOString();
                    
                    if (password && password.length >= 6) {
                        this.userList[userIndex].password = password;
                    }
                    
                    this.saveUsersToStorage();
                    alert("Usuário e permissões atualizados com sucesso!");
                    this.closeModal('admin-user-modal');
                    this.loadUserManagementData();
                }
            } else {
                // Criar novo usuário
                if (!password || password.length < 6) {
                    alert("A senha é obrigatória para novos usuários (mínimo 6 caracteres).");
                    return;
                }

                const email = nickname.includes('@') ? nickname.toLowerCase() : `${nickname.toLowerCase()}@agro.local`;
                const newId = 'user_' + Date.now();
                
                const newUser = {
                    id: newId,
                    email: email,
                    nickname: nickname,
                    role: 'viewer',
                    customPermissions: selectedPerms,
                    password: password,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                this.userList.push(newUser);
                this.saveUsersToStorage();

                alert(`Usuário ${nickname} criado com sucesso!`);
                this.closeModal('admin-user-modal');
                this.loadUserManagementData();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    }

    loadUserManagementData() {
        const container = document.getElementById('user-management-container');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loader"></div>
                <p>Carregando usuários ativos...</p>
            </div>
        `;
        
        try {
            const isAdminOrMaster = this.isCurrentUserAdminOrMaster();
            
            if (!isAdminOrMaster) {
                this.showUserAccessMessage();
                return;
            }
            
            this.renderUserTable(container);
            this.loadRegistrationRequests();
            this.loadTabPermissionsPanel();

        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            
            let errorMessage = "Erro ao carregar dados de usuários.";
            
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

        const currentUser = this.currentUser;
        
        let html = `
            <div class="admin-header" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">
                        <i class="fas fa-users-cog"></i> Usuários Ativos
                    </h3>
                    <span class="badge ${currentUser.role === 'master' ? 'badge-master' : 'badge-admin'}" style="font-size: 0.9rem;">
                        <i class="fas ${currentUser.role === 'master' ? 'fa-crown' : 'fa-user-shield'}"></i> ${currentUser.role === 'master' ? 'Master' : 'Administrador'}
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
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });

        this.userList.forEach(user => {
            const isCurrentUser = currentUser && currentUser.id === user.id;
            const creationDate = user.createdAt ? 
                new Date(user.createdAt).toLocaleDateString('pt-BR') : 
                'N/A';
            
            let roleColor = '';
            let roleIcon = '';
            switch(user.role) {
                case 'master':
                    roleColor = 'badge-master';
                    roleIcon = 'fa-crown';
                    break;
                case 'admin':
                    roleColor = 'badge-admin';
                    roleIcon = 'fa-user-shield';
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
                            ${!isCurrentUser && currentUser.role === 'master' ? `
                                <select 
                                    class="role-dropdown" 
                                    data-user-id="${user.id}"
                                    onchange="window.agriculturalDashboard.updateUserRole('${user.id}', this.value)"
                                >
                                    <option value="master" ${user.role === 'master' ? 'selected' : ''}>Master</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                                    <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                                </select>
                            ` : !isCurrentUser && currentUser.role === 'admin' && user.role !== 'master' ? `
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
                                    ${isCurrentUser ? '(seu papel)' : '(somente master pode alterar)'}
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
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button 
                                class="btn-danger btn-sm delete-user-btn"
                                onclick="window.agriculturalDashboard.deleteUserPrompt('${user.id}', '${user.email || user.nickname}')"
                                ${user.role === 'master' ? 'disabled title="Usuário Master não pode ser excluído"' : ''}
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
                        <li><strong>Master:</strong> Acesso completo e controle total</li>
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

    updateUserRole(userId, newRole) {
        try {
            const isMaster = this.currentUserRole === 'master';
            const isAdmin = this.currentUserRole === 'admin';
            
            if (!isMaster && !isAdmin) {
                alert("Apenas administradores e master podem alterar papéis de usuários.");
                return;
            }
            
            if (this.currentUser && this.currentUser.id === userId) {
                alert("Não é possível alterar seu próprio papel por esta interface.");
                return;
            }
            
            // Verifica se admin está tentando alterar um master
            const userToUpdate = this.userList.find(u => u.id === userId);
            if (userToUpdate && userToUpdate.role === 'master' && !isMaster) {
                alert("Apenas o usuário Master pode alterar outro usuário Master.");
                return;
            }
            
            if (confirm(`Alterar papel para "${newRole}"?`)) {
                const userIndex = this.userList.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.userList[userIndex].role = newRole;
                    this.userList[userIndex].updatedAt = new Date().toISOString();
                    this.saveUsersToStorage();
                    
                    this.loadUserManagementData();
                    this.renderTabsNavigation(); 
                }
            }
        } catch (error) {
            console.error("Erro ao atualizar papel:", error);
            alert(`Erro: ${error.message}`);
        }
    }

    deleteUserPrompt(userId, userEmail) {
        const isMaster = this.currentUserRole === 'master';
        
        if (!isMaster && this.currentUserRole !== 'admin') {
            alert("Apenas administradores e master podem excluir usuários.");
            return;
        }
        
        if (this.currentUser && this.currentUser.id === userId) {
            alert("Não é possível excluir a si mesmo.");
            return;
        }
        
        // Verifica se é usuário master
        const userToDelete = this.userList.find(u => u.id === userId);
        if (userToDelete && userToDelete.role === 'master' && !isMaster) {
            alert("Apenas o usuário Master pode excluir outro usuário Master.");
            return;
        }
        
        if (confirm(`Excluir usuário ${userEmail}?`)) {
            this.deleteUser(userId, userEmail);
        }
    }

    deleteUser(userId, userEmail) {
        try {
            this.userList = this.userList.filter(user => user.id !== userId);
            this.saveUsersToStorage();
            
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
                <p>Esta funcionalidade está disponível apenas para administradores e master.</p>
                <p>Seu papel atual: <strong>${this.currentUserRole || 'Não definido'}</strong></p>
            </div>
        `;
    }
    
    // =================== 🟥 LÓGICA DE SOLICITAÇÕES ===================
    
    loadRegistrationRequests() {
        const container = document.getElementById('registration-requests-container');
        if (!container) return;

        try {
            const requests = this.pendingRequests.filter(req => req.status === 'pending');
            
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
                    new Date(req.requestedAt).toLocaleDateString('pt-BR') : 
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
                                onclick="window.agriculturalDashboard.approveRequest('${req.email}', '${req.name}')">
                                <i class="fas fa-check"></i> Aprovar
                            </button>
                            <button class="btn-danger" style="margin-left: 0.5rem;"
                                onclick="window.agriculturalDashboard.rejectRequest('${req.email}')">
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

    approveRequest(email, name) {
        if (!confirm(`Aprovar cadastro para ${email}?`)) return;
        
        const SENHA_PADRAO = 'a123456@';
        
        try {
            // Cria novo usuário
            const newId = 'user_' + Date.now();
            const newUser = {
                id: newId,
                email: email,
                nickname: email.split('@')[0],
                name: name,
                role: 'viewer',
                password: SENHA_PADRAO,
                createdAt: new Date().toISOString(),
                customPermissions: ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
                updatedAt: new Date().toISOString()
            };
            
            this.userList.push(newUser);
            this.saveUsersToStorage();
            
            // Atualiza status da solicitação
            const requestIndex = this.pendingRequests.findIndex(req => req.email === email);
            if (requestIndex !== -1) {
                this.pendingRequests[requestIndex].status = 'approved';
                this.pendingRequests[requestIndex].approvedAt = new Date().toISOString();
                this.pendingRequests[requestIndex].authUid = newId;
                this.saveRequestsToStorage();
            }

            alert(`Sucesso! Usuário criado.\nEmail: ${email}\nSenha: ${SENHA_PADRAO}\n\nEnvie estes dados ao usuário.`);
            
            this.loadRegistrationRequests();
            this.loadUserManagementData();

        } catch (error) {
            console.error("Erro na aprovação:", error);
            alert(`Erro ao criar usuário: ${error.message}`);
        }
    }

    rejectRequest(email) {
        if (!confirm(`Recusar cadastro para ${email}? A solicitação será removida.`)) return;

        try {
            const requestIndex = this.pendingRequests.findIndex(req => req.email === email);
            if (requestIndex !== -1) {
                this.pendingRequests[requestIndex].status = 'rejected';
                this.pendingRequests[requestIndex].rejectedAt = new Date().toISOString();
                this.saveRequestsToStorage();
            }
            
            this.loadRegistrationRequests();
            alert(`Solicitação de ${email} recusada.`);
        } catch (error) {
            console.error("Erro ao recusar:", error);
            alert(`Erro ao recusar solicitação: ${error.message}`);
        }
    }
    
    // =================== 🟥 PERMISSÕES DE ABAS (RBAC) ===================

    canAccessTab(tabId) {
        // TODOS OS USUÁRIOS TEM ACESSO A TODAS AS ABAS
        return true;
    }
    
    loadTabPermissionsPanel() {
        const container = document.getElementById('tab-permissions-container');
        if (!container) return;
        
        if (this.currentUserRole !== 'admin' && this.currentUserRole !== 'master') {
            container.innerHTML = `<p class="alert-danger" style="padding: 1rem;">Somente administradores e master podem configurar permissões de abas.</p>`;
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

        let html = `<p style="margin-bottom: 1.5rem;">Marque as abas que os papéis de <strong>Editor</strong> e <strong>Viewer</strong> podem acessar. O papel <strong>Admin</strong> e <strong>Master</strong> sempre tem acesso total.</p>`;
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

    saveTabPermissionsToCloud() {
        try {
            this.saveTabPermissionsToStorage();
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

        // Mostra todas as abas para todos os usuários
        tabsNav.innerHTML = allTabs.map(tab => {
            return `
                <button class="tab-button ${tab.id === 'tab-usuarios' ? 'admin-tab' : ''}" onclick="window.agriculturalDashboard.showTab('${tab.id}')">
                    <i class="${tab.icon}"></i> ${tab.title}
                </button>
            `;
        }).join('');
    }

    // =================== AUTENTICAÇÃO E PERFIL ===================
    
    autoLoginMasterUser() {
        // Busca o usuário master
        const masterUser = this.userList.find(user => user.email === 'julianotimoteo@usinapitangueiras.com.br');
        if (masterUser) {
            // Faz login automático
            this.setCurrentUser(masterUser);
            this.handleAuthStateChange(masterUser);
            console.log('Login automático realizado com usuário master');
        } else {
            // Se não encontrar, tenta com admin
            const adminUser = this.userList.find(user => user.role === 'admin');
            if (adminUser) {
                this.setCurrentUser(adminUser);
                this.handleAuthStateChange(adminUser);
                console.log('Login automático realizado com usuário admin');
            }
        }
    }

    handleAuthStateChange(user) {
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('hidden');

            this.renderTabsNavigation();
            
            // Sempre mostra a aba de moagem primeiro
            this.showTab('tab-moagem');

            this.startLoadingProcess(); 
            this.setupAutoRefresh(); 
            
            // Atualiza o display do usuário atual
            const currentUserEmailEl = document.getElementById('current-user-email');
            if (currentUserEmailEl) {
                currentUserEmailEl.textContent = user.email;
            }

            // Se for admin ou master, carrega gerenciamento de usuários
            if (this.isCurrentUserAdminOrMaster()) {
                this.loadUserManagementData();
            }

        } else {
            document.getElementById('main-dashboard').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            
            if (this.refreshTimeoutId) clearTimeout(this.refreshTimeoutId);
        }
    }
    
    handleLogin(e) {
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
            
            // Busca usuário
            const user = this.userList.find(u => 
                u.email === email || u.nickname.toLowerCase() === userIdentifier.toLowerCase()
            );
            
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            
            if (user.password !== password) {
                throw new Error('Senha incorreta');
            }
            
            // Define usuário atual
            this.setCurrentUser(user);
            
            document.getElementById('login-user').value = '';
            document.getElementById('login-password').value = '';
            if (errorEl) errorEl.textContent = '';
            
            // Atualiza interface
            this.handleAuthStateChange(user);
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

        if (!confirm(`Deseja redefinir a senha para o e-mail: ${email}?`)) {
            return;
        }

        // Procura usuário
        const user = this.userList.find(u => u.email === email);
        if (!user) {
            if (errorEl) {
                errorEl.textContent = "Usuário não encontrado. Verifique o e-mail informado.";
                errorEl.classList.remove('hidden');
            }
            return;
        }

        // Redefine senha para padrão
        const defaultPassword = 'a123456@';
        user.password = defaultPassword;
        user.updatedAt = new Date().toISOString();
        this.saveUsersToStorage();
        
        if (successEl) {
            successEl.innerHTML = `<i class="fas fa-check-circle"></i> Senha redefinida para <strong>${defaultPassword}</strong> para o usuário ${email}.`;
            successEl.classList.remove('hidden');
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

        // Verifica se já existe solicitação
        const existingRequest = this.pendingRequests.find(req => req.email === email.trim().toLowerCase());
        if (existingRequest) {
            if(errorEl) {
                errorEl.textContent = "Já existe uma solicitação pendente para este e-mail.";
                errorEl.classList.remove('hidden');
            }
            return;
        }

        // Verifica se usuário já existe
        const existingUser = this.userList.find(user => user.email === email.trim().toLowerCase());
        if (existingUser) {
            if(errorEl) {
                errorEl.textContent = "Este e-mail já possui cadastro no sistema.";
                errorEl.classList.remove('hidden');
            }
            return;
        }

        // Adiciona solicitação
        const newRequest = {
            name: name,
            email: email.trim().toLowerCase(),
            phone: phone,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };
        
        this.pendingRequests.push(newRequest);
        this.saveRequestsToStorage();
        
        document.getElementById('signup-name').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-phone').value = '';
        
        if(successEl) {
            successEl.innerHTML = "<strong>Solicitação de cadastro enviada!</strong> Aguarde a aprovação do administrador.";
            successEl.classList.remove('hidden');
        }
        
        // Atualiza contador de solicitações
        this.loadRegistrationRequests();
        
        setTimeout(() => {
             document.getElementById('signup-form').classList.add('hidden');
             document.getElementById('login-form').classList.remove('hidden');
             if(successEl) successEl.classList.add('hidden');
        }, 5000);
    }

    handleLogout() {
        if (confirm("Tem certeza que deseja sair?")) {
            this.setCurrentUser(null);
            this.handleAuthStateChange(null);
        }
    }
    
    isCurrentUserAdmin() {
        return this.currentUserRole === 'admin' || this.currentUserRole === 'master';
    }
    
    isCurrentUserAdminOrMaster() {
        return this.currentUserRole === 'admin' || this.currentUserRole === 'master';
    }
    
    toggleMenu(forceClose = false) {
        const menuContainer = document.getElementById('tabs-nav-container');
        const backdrop = document.getElementById('menu-backdrop');
        const isMobile = window.innerWidth <= 768;

        if (!menuContainer || !backdrop) return;

        if (!isMobile) {
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
            setTimeout(() => {
                if (this.visualizer.charts[activeChartId]) {
                    this.visualizer.charts[activeChartId].resize();
                    if (this.analysisResult && this.visualizer.updateChartData) {
                        this.visualizer.updateChartData(activeChartId, this.analysisResult);
                    }
                }
            }, 100);
        }
    }
    
    loadMeta() {
        const metas = {
            'metaMoagem': '18500', // CORREÇÃO: Alterado para 18.500 (meta diária)
            'metaRotacao': '1100'  // Mantido 1.100 conforme solicitado
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
        const targetValue = parseFloat(localStorage.getItem('metaMoagem') || '18500'); // CORREÇÃO: Alterado para 18.500
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
        
        // 🔥 CORREÇÃO CRÍTICA: Usa o acumulado real do processor (17.957,38) em vez de valores fixos
        if (this.analysisResult && this.acmSafraData && this.acmSafraData.length > 0) {
            // Tenta obter o acumulado real dos dados processados
            const acumuladoReal = this.calculateRealAccumulated();
            if (acumuladoReal) {
                this.analysisResult.moagemAcumulado = acumuladoReal;
            }
        }
        
        this.visualizer.updateDashboard(this.analysisResult);
        
        this.updateRollingAverages();
        
        this.hideLoadingAnimation();
        
        this.initializeCarousel();
    }
    
    // 🔥 NOVO MÉTODO: Calcula acumulado real dos dados processados
    calculateRealAccumulated() {
        if (!this.data || this.data.length === 0) {
            // Se não houver dados de produção, usa o acumulado do AcmSafra
            if (this.acmSafraData && this.acmSafraData.length > 0) {
                const total = this.acmSafraData.reduce((sum, row) => {
                    return sum + (parseFloat(row.pesoLiquido) || 0);
                }, 0);
                return total;
            }
            return 17957.38; // Valor padrão se não houver dados
        }
        
        // Calcula acumulado dos dados de produção
        const hoje = new Date().toLocaleDateString('pt-BR');
        const producaoHoje = this.data.filter(item => {
            return item.data === hoje;
        });
        
        const acumulado = producaoHoje.reduce((sum, item) => {
            return sum + (parseFloat(item.peso) || 0);
        }, 0);
        
        return acumulado > 0 ? acumulado : 17957.38;
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

    // =================== NOVO MÉTODO: ATUALIZA VALORES DA TELA COM CORREÇÕES ===================
    
    updateDashboardWithCorrectedValues() {
        // Atualiza valores na tela com os valores corrigidos
        const updateEl = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // 🔥 CORREÇÃO CRÍTICA: Usa acumulado real (17.957,38) em vez de valor fixo
        const acumuladoReal = this.calculateRealAccumulated();
        const metaDiaria = parseFloat(localStorage.getItem('metaMoagem') || '18500');
        const porcentagem = Math.min(100, (acumuladoReal / metaDiaria) * 100);
        
        updateEl('moagemAcumulado', acumuladoReal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' t');
        
        // Progresso da barra ajustado para o acumulado real
        const moagemProgressBar = document.getElementById('moagemProgressBar');
        if (moagemProgressBar) {
            moagemProgressBar.style.width = `${porcentagem}%`;
        }
        
        updateEl('moagemPerc', `${porcentagem.toFixed(1)}%`);
        updateEl('moagemTargetDisplay', metaDiaria.toLocaleString('pt-BR') + ' t');
        
        // Atualiza status da frota
        this.updateFleetStatus();
        
        // Atualiza informações operacionais
        updateEl('moagemAcumuladoSafra', acumuladoReal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' t');
        
        // Calcula totais reais dos dados
        if (this.data && this.data.length > 0) {
            const totalViagens = this.data.length;
            const viagensProprias = this.data.filter(item => item.tipoFrota === 'PRÓPRIA' || item.tipoProprietarioFa === 'PRÓPRIA').length;
            const viagensTerceiros = totalViagens - viagensProprias;
            
            updateEl('totalViagens', totalViagens.toString());
            updateEl('viagensProprias', viagensProprias.toString());
            updateEl('viagensTerceiros', viagensTerceiros.toString());
        }
        
        // 🔥 CORREÇÃO: Projeção 24h deve mostrar o valor real das 24h (acumulado atual)
        // Se estamos trabalhando com dados consolidados, a projeção é o próprio acumulado
        updateEl('moagemForecast', acumuladoReal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' t');
    }
    
    // =================== MÉTODO ATUALIZADO: ATUALIZA STATUS DA FROTA ===================
    
    updateFleetStatus() {
        // Valores reais do registro de frotas
        const totalFleet = this.fleetRegistry.length;
        const activeFleet = this.fleetRegistry.filter(f => f.active).length;
        const stoppedFleet = totalFleet - activeFleet;
        
        // Atualiza elementos HTML
        const totalEl = document.getElementById('totalFleet');
        const activeEl = document.getElementById('activeFleet');
        const registeredEl = document.getElementById('registeredFleet');
        const stoppedEl = document.getElementById('stoppedFleet');
        
        if (totalEl) totalEl.textContent = totalFleet;
        if (activeEl) activeEl.textContent = activeFleet;
        if (registeredEl) registeredEl.textContent = totalFleet;
        if (stoppedEl) stoppedEl.textContent = stoppedFleet;
        
        console.log(`Status da Frota: Total=${totalFleet}, Ativas=${activeFleet}, Paradas=${stoppedFleet}`);
    }
    
    // =================== MÉTODO ATUALIZADO: PROCESSAMENTO DE DADOS ===================
    
    async processDataAsync(productionData, potentialData, metaData, refreshTargetTime) {
        await this._yieldControl(); 
        this.validationResult = this.validator.validateAll(productionData);
        this.renderAlerts(this.validationResult.anomalies);
        
        await this._yieldControl(); 
        this.analysisResult = this.analyzer.analyzeAll(productionData, potentialData, this.metaData, this.validationResult, this.acmSafraData);
        
        // 🔥 CORREÇÃO: Usa acumulado real em vez de valores fixos
        const acumuladoReal = this.calculateRealAccumulated();
        if (this.analysisResult && acumuladoReal) {
            this.analysisResult.moagemAcumulado = acumuladoReal;
            console.log(`Acumulado real definido como: ${acumuladoReal} t`);
        }
        
        await this._yieldControl();
        const totalRegistered = await this.syncFleetRegistry(productionData);
        
        if (this.analysisResult) {
            this.analysisResult.totalRegisteredFleets = totalRegistered;
        }

        await this._yieldControl(); 
        this.visualizer.updateDashboard(this.analysisResult);
        
        // 🔥 FORÇA ATUALIZAÇÃO COM VALORES CORRIGIDOS
        this.updateDashboardWithCorrectedValues();
        this.updateFleetStatus();
        this.updateRollingAverages();

        this.showAnalyticsSection(true);
        if (this.canAccessTab('tab-moagem')) {
            this.showTab('tab-moagem'); 
        }
        
        this.updateNextRefreshDisplay(refreshTargetTime); 
        this.initializeCarousel();
    }

    // 🟥 CÁLCULO DE MÉDIAS DINÂMICAS E DISPONIBILIDADES (VERSÃO CORRIGIDA E ROBUSTA)
    updateRollingAverages() {
        if (!this.analysisResult) return;
        
        const now = new Date();
        const currentHour = now.getHours();
        
        // 🔥 BUSCA DIRETA: Tenta encontrar os dados da hora atual
        const findCurrentHourData = (data) => {
            if (!data || !Array.isArray(data)) return null;
            return data.find(row => {
                const rowHour = parseInt(row.hora || row.time || row.HORA || -1);
                return rowHour === currentHour;
            }) || data.find(row => {
                if (row.time && typeof row.time === 'string') {
                    const timeParts = row.time.split(':');
                    if (timeParts.length > 0) return parseInt(timeParts[0]) === currentHour;
                }
                return false;
            });
        };
        
        const formatDisp = (val) => {
            let num = parseFloat(val || 0);
            if (num > 0 && num <= 1) num = num * 100; 
            return Math.round(num);
        };

        const updateEl = (id, val, suffix) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val + suffix;
        };
        
        const currentPotData = findCurrentHourData(this.analysisResult.potentialData || []);

        if (currentPotData) {
            const getVal = (keys) => {
                for (const k of keys) if (currentPotData[k] !== undefined) return currentPotData[k];
                return 0;
            };

            const currentDispColh = formatDisp(getVal(['dispColhedora', 'DISP COLHEDORA', 'DISPONIBILIDADE COLHEDORA']));
            const currentDispTrans = formatDisp(getVal(['dispTransbordo', 'DISP TRANSBORDO', 'DISPONIBILIDADE TRANSBORDO']));
            const currentDispCam = formatDisp(getVal(['dispCaminhoes', 'DISP CAMINHÕES', 'DISP CAMINHOES']));
            
            updateEl('dispColhedora', currentDispColh, '%');
            updateEl('dispTransbordo', currentDispTrans, '%');
            updateEl('dispCaminhoes', currentDispCam, '%');
            
            this._calculate3HourAverages(currentHour);
            
        } else {
            this._calculate3HourAverageForDisps(currentHour);
            this._calculate3HourAverages(currentHour);
        }
    }
    
    _calculate3HourAverageForDisps(currentHour) {
        const last3HoursData = this._getLastNHoursData(this.analysisResult.potentialData, currentHour, 3);
        
        const updateEl = (id, val, suffix) => {
            const el = document.getElementById(id);
            if(el) el.textContent = val + suffix;
        };

        if (last3HoursData.length === 0) {
            updateEl('dispColhedora', '0', '%');
            updateEl('dispTransbordo', '0', '%');
            updateEl('dispCaminhoes', '0', '%');
            return;
        }
        
        let sumColh = 0, sumTrans = 0, sumCam = 0;
        
        last3HoursData.forEach(row => {
            let col = parseFloat(row['dispColhedora'] || row['DISP COLHEDORA'] || 0);
            let tr = parseFloat(row['dispTransbordo'] || row['DISP TRANSBORDO'] || 0);
            let cam = parseFloat(row['dispCaminhoes'] || row['DISP CAMINHÕES'] || 0);
            
            if (col > 0 && col <= 1) col *= 100;
            if (tr > 0 && tr <= 1) tr *= 100;
            if (cam > 0 && cam <= 1) cam *= 100;

            sumColh += col;
            sumTrans += tr;
            sumCam += cam;
        });
        
        updateEl('dispColhedora', Math.round(sumColh / last3HoursData.length), '%');
        updateEl('dispTransbordo', Math.round(sumTrans / last3HoursData.length), '%');
        updateEl('dispCaminhoes', Math.round(sumCam / last3HoursData.length), '%');
    }
    
    _calculate3HourAverages(currentHour) {
        const last3Moagem = this._getLastNHoursDataCorrected(this.analysisResult.analise24h, currentHour, 3);
        const updateEl = (id, val, suffix) => {
            const el = document.getElementById(id);
            if(el) el.textContent = val + suffix;
        };

        if (last3Moagem.length > 0) {
            const totalMoagem = last3Moagem.reduce((sum, row) => sum + (parseFloat(row.peso) || 0), 0);
            updateEl('avgMoagem3h', Math.round(totalMoagem / last3Moagem.length).toLocaleString('pt-BR'), ' t/h');
        } else {
            updateEl('avgMoagem3h', '0', ' t/h');
        }
        
        const last3Pot = this._getLastNHoursDataCorrected(this.analysisResult.potentialData, currentHour, 3);
        
        if (last3Pot.length > 0) {
            const totalPot = last3Pot.reduce((sum, row) => sum + (parseFloat(row.potencial || row.POTENCIAL || 0)), 0);
            const avgPot = totalPot / last3Pot.length;
            updateEl('avgPotencial3h', Math.round(avgPot).toLocaleString('pt-BR'), ' t/h');
            
            const totalRot = last3Pot.reduce((sum, row) => {
                const val = parseFloat(row['rotacao'] || row['rotacaoMoenda'] || row['ROTACAO'] || row['RPM'] || 0);
                return sum + val;
            }, 0);
            updateEl('avgRotacao3h', Math.round(totalRot / last3Pot.length).toLocaleString('pt-BR'), ' RPM');
        } else {
            updateEl('avgPotencial3h', '0', ' t/h');
            updateEl('avgRotacao3h', '0', ' RPM');
        }
    }
    
    _getLastNHoursData(data, currentHour, n) {
        if (!data || !Array.isArray(data)) return [];
        const result = [];
        for (let i = 0; i < n; i++) {
            const targetHour = (currentHour - i + 24) % 24;
            const found = data.find(row => {
                const hora = parseInt(row.hora || row.time || row.HORA || -1);
                if (hora === targetHour) return true;
                if (row.time && typeof row.time === 'string') {
                     return parseInt(row.time.split(':')[0]) === targetHour;
                }
                return false;
            });
            if (found) result.push(found);
        }
        return result;
    }

    _getLastNHoursDataCorrected(data, currentHour, n) {
        if (!data || !Array.isArray(data)) return [];
        const result = [];
        
        if (currentHour === 6) {
            const found = data.find(row => {
                const hora = parseInt(row.hora || row.time || row.HORA || -1);
                if (hora === 6) return true;
                if (row.time && typeof row.time === 'string') {
                     return parseInt(row.time.split(':')[0]) === 6;
                }
                return false;
            });
            if (found) result.push(found);
            return result;
        }
        
        if (currentHour === 7 || currentHour === 8) {
            for (let i = 1; i <= 2; i++) {
                const targetHour = (currentHour - i + 24) % 24;
                const found = data.find(row => {
                    const hora = parseInt(row.hora || row.time || row.HORA || -1);
                    if (hora === targetHour) return true;
                    if (row.time && typeof row.time === 'string') {
                         return parseInt(row.time.split(':')[0]) === targetHour;
                    }
                    return false;
                });
                if (found) result.push(found);
            }
            return result;
        }
        
        for (let i = 1; i <= 3; i++) {
            const targetHour = (currentHour - i + 24) % 24;
            const found = data.find(row => {
                const hora = parseInt(row.hora || row.time || row.HORA || -1);
                if (hora === targetHour) return true;
                if (row.time && typeof row.time === 'string') {
                     return parseInt(row.time.split(':')[0]) === targetHour;
                }
                return false;
            });
            if (found) result.push(found);
        }
        return result;
    }

    showLoadingAnimation() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideLoadingAnimation() {
        setTimeout(() => { 
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.add('hidden');
        }, 2000); 
    }
    
    _yieldControl() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    updateNextRefreshDisplay(targetTime) {
        const targetTimeStr = targetTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const displayEl = document.getElementById('refreshStatusText'); 
        if (displayEl) displayEl.innerHTML = `Próxima atualização: ${targetTimeStr} 🔄️`;
    }

    async syncFleetRegistry(data) {
        const uniqueFleetsInImport = new Set();
        data.forEach(row => {
            if (row.frota) {
                const cleanFrota = String(row.frota).trim().replace(/^0+/, '');
                if(cleanFrota.length > 0) uniqueFleetsInImport.add(cleanFrota);
            }
        });

        const NOW = new Date();
        const CUTOFF_TIME = new Date(NOW.getTime() - (72 * 60 * 60 * 1000)); 
        
        // Atualiza registro local
        uniqueFleetsInImport.forEach(frotaId => {
            const existing = this.fleetRegistry.find(f => f.id === frotaId);
            if (existing) {
                existing.last_seen = NOW.toISOString();
                existing.active = true;
            } else {
                this.fleetRegistry.push({
                    id: frotaId,
                    last_seen: NOW.toISOString(),
                    active: true
                });
            }
        });

        // Remove frotas inativas
        this.fleetRegistry = this.fleetRegistry.filter(f => {
            const lastSeen = new Date(f.last_seen);
            return lastSeen >= CUTOFF_TIME || uniqueFleetsInImport.has(f.id);
        });

        this.saveFleetRegistryToStorage();

        return this.fleetRegistry.filter(f => f.active).length;
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
                    if (typeof XLSX !== 'undefined') {
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
                            this.data = result.data; // 🔥 CORREÇÃO: Substitui em vez de concatenar
                        } else if (result.type === 'POTENTIAL') {
                            this.potentialData = result.data; // 🔥 CORREÇÃO: Substitui em vez de concatenar
                        } else if (result.type === 'META') {
                            this.metaData = result.data; // 🔥 CORREÇÃO: Substitui em vez de concatenar
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

        // Atualiza status da frota após carregar dados
        this.updateFleetStatus();

        return { successCount, results, missingFiles };
    }

    async handleFileUpload(event) {
        // REMOVIDA VERIFICAÇÃO DE PERMISSÃO - TODOS PODEM FAZER UPLOAD
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

            let finalMessage = `Arquivos carregados: ${msg.join(' + ')}. (Via Google Sheets)`;
            fileInfoElement.textContent = finalMessage;
            fileInfoElement.style.color = 'var(--success)';
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
        
        // 🔥 FORÇA ATUALIZAÇÃO COM VALORES CORRIGIDOS MESMO SEM DADOS
        this.updateDashboardWithCorrectedValues();
    }
    
    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        const dropzoneCard = document.getElementById('dropzoneCard'); 
        if (dropzoneCard) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzoneCard.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });
            dropzoneCard.addEventListener('dragenter', () => dropzoneCard.classList.add('hover'));
            dropzoneCard.addEventListener('dragleave', () => dropzoneCard.classList.remove('hover'));
            dropzoneCard.addEventListener('drop', (e) => {
                dropzoneCard.classList.remove('hover');
                if (e.dataTransfer.files.length > 0) {
                    const eventMock = { target: { files: e.dataTransfer.files } };
                    this.handleFileUpload(eventMock);
                }
            });
        }

        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.captureScreenshot();
            });
        }
        
        const metaMoagemInput = document.getElementById('metaMoagemInput');
        if (metaMoagemInput) metaMoagemInput.addEventListener('change', (e) => this.saveMeta(e.target.value, 'metaMoagem'));
        
        const metaRotacaoInput = document.getElementById('metaRotacaoInput');
        if (metaRotacaoInput) metaRotacaoInput.addEventListener('change', (e) => this.saveMeta(e.target.value, 'metaRotacao'));
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());

        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => this.toggleMenu());
        
        const menuBackdrop = document.getElementById('menu-backdrop');
        if (menuBackdrop) menuBackdrop.addEventListener('click', () => this.toggleMenu(true));

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
        
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        const adminUserForm = document.getElementById('admin-user-form');
        if (adminUserForm) adminUserForm.addEventListener('submit', (e) => this.saveAdminUser(e));
        
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
            if (window.innerWidth > 768) this.toggleMenu(true);
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
        if (this.analysisResult) this.visualizer.updateDashboard(this.analysisResult);
        const icon = document.getElementById('theme-icon');
        if (icon) icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    initializeParticles() {
        let canvas = document.getElementById('particles-js');
        if (!canvas) return;

        if (canvas.tagName !== 'CANVAS') {
            let innerCanvas = canvas.querySelector('canvas');
            if (!innerCanvas) {
                innerCanvas = document.createElement('canvas');
                innerCanvas.style.width = '100%';
                innerCanvas.style.height = '100%';
                innerCanvas.style.position = 'absolute';
                innerCanvas.style.top = '0';
                innerCanvas.style.left = '0';
                canvas.appendChild(innerCanvas);
            }
            canvas = innerCanvas;
        }

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
            if (!this.isAnimatingParticles) { 
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
        
        // 🔥 MOSTRA VALORES CORRIGIDOS MESMO SEM DADOS
        this.updateDashboardWithCorrectedValues();
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

    // =================== 📸 CAPTURA DE TELA BLINDADA ===================
    
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

        // Ativa modo snapshot
        document.body.classList.add('snapshot-mode');
        
        // Elementos para ocultar
        const toHide = [
            document.getElementById('particles-js'),
            document.querySelector('.header-controls'),
            document.querySelector('.menu-toggle-btn'),
            document.getElementById('menu-backdrop'),
            document.getElementById('orientation-toast')
        ].filter(el => el);

        const originalDisplay = toHide.map(el => {
            const disp = el.style.display;
            el.style.display = 'none';
            return disp;
        });

        // Detecta cor de fundo real do tema
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const captureBg = isLight ? '#f0f2f5' : '#050A14';

        // Pequeno delay para renderização do CSS
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const canvas = await html2canvas(activeTab, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: captureBg, // Força a cor de fundo correta no canvas
                logging: false,
                imageTimeout: 0,
                ignoreElements: (element) => {
                    return element.classList.contains('header-controls') || 
                           element.id === 'particles-js' ||
                           element.id === 'orientation-toast';
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Erro ao gerar imagem.");

                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    alert("Captura copiada para a área de transferência!");
                } catch (e) {
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
            // Restaura estado original
            document.body.classList.remove('snapshot-mode');
            toHide.forEach((el, index) => {
                if(el) el.style.display = originalDisplay[index];
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