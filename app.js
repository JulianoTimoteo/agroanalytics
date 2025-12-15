// app.js - Orquestrador Principal (VERSÃO FINAL CORRIGIDA E OTIMIZADA PARA MOBILE/LOGIN)
class AgriculturalDashboard {
    constructor() {
        // Inicializa os módulos
        if (typeof IntelligentProcessor !== 'undefined') this.processor = new IntelligentProcessor(); 
        if (typeof DataVisualizer !== 'undefined') this.visualizer = new DataVisualizer();
        if (typeof DataValidator !== 'undefined') this.validator = new DataValidator();
        if (typeof DataAnalyzer !== 'undefined') this.analyzer = new DataAnalyzer();
        
        // Estado da aplicação
        this.data = []; 
        this.potentialData = []; 
        this.metaData = []; 
        this.analysisResult = null;
        this.validationResult = null;
        this.isAnimatingParticles = true;
        this.animationFrameId = null; 
        
        // Estado do Carrossel e Auto-Refresh
        this.currentSlideIndex = 0;
        this.carouselInterval = null; 
        this.refreshIntervalId = null; 
        this.refreshTimeoutId = null; 

        // 🟥 AUTENTICAÇÃO E INICIALIZAÇÃO
        if (typeof firebase !== 'undefined') {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
        } else {
             console.error("Firebase não inicializado. Verifique o index.html.");
        }

        this.userList = [];
        this.currentUserRole = null;
        
        // 🟥 RBAC: Permissões padrão para fallback
        this.permissions = {
            'admin': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria', 'tab-usuarios'],
            'editor': ['tab-gerenciar', 'tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-metas', 'tab-horaria'],
            'viewer': ['tab-moagem', 'tab-alertas', 'tab-caminhao', 'tab-equipamento', 'tab-frentes', 'tab-horaria'] 
        };
        this.tabPermissions = {}; // Permissões customizadas carregadas do Firestore

        // Configuração
        this.initializeEventListeners();
        this.initializeParticles();
        this.loadTheme();

        this.loadMeta(); 
        this.initShiftTracker(); 

        this.showTab('tab-gerenciar'); // Inicia na aba de gerenciamento/upload
        this.clearResults(); 
        
        // 🟥 PROTEÇÃO DE ROTA: Monitora o estado de autenticação
        if (this.auth) {
            this.auth.onAuthStateChanged(this.handleAuthStateChange.bind(this));
        } else {
            this.startLoadingProcess(); 
            this.setupAutoRefresh();
        }
    }
    
    // =================== 🟥 LÓGICA DE AUTENTICAÇÃO E MODAL ===================
    
    async handleAuthStateChange(user) {
        const loginScreen = document.getElementById('login-screen');
        const mainDashboard = document.getElementById('main-dashboard');
        
        if (user) {
            // Usuário logado
            loginScreen.classList.add('hidden');
            mainDashboard.classList.remove('hidden');

            await this.fixUserProfile(user);
            
            // Carrega dados do usuário atual e permissões de abas
            await this.loadCurrentUserProfile();
            
            // Renderiza a navegação de abas (RBAC)
            this.renderTabsNavigation();
            
            // Inicia a busca e o auto-refresh
            this.startLoadingProcess(); 
            this.setupAutoRefresh(); 
            
            // Verifica se é admin para carregar gerenciamento
            if (await this.isCurrentUserAdmin()) {
                this.loadUserManagementData();
            }

        } else {
            // Usuário deslogado
            mainDashboard.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            this.currentUserRole = null;
            
            if (this.refreshTimeoutId) clearTimeout(this.refreshTimeoutId);
        }
    }
    
    // 🔥 NOVO: Suporte para login por Nick/E-mail (Requer que todos os emails sejam minúsculos no Firestore)
    async handleLogin(e) {
        e.preventDefault();
        const userIdentifier = document.getElementById('login-user').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('auth-error');
        errorEl.classList.add('hidden');
        document.getElementById('auth-success').classList.add('hidden');

        try {
            let email = userIdentifier.trim().toLowerCase();

            // 1. Tenta identificar o usuário como e-mail
            if (!email.includes('@')) {
                // 2. Se não for e-mail, busca no Firestore pelo campo 'nick' (simulado)
                // Implementação REAL precisaria de um índice no Firestore, mas para o caso de uso, assumimos que 'userIdentifier' é o EMAIL.
                // Firebase Auth nativamente SÓ permite login por e-mail, ou você precisaria de funções Cloud para mapear nick -> email.
                // Mantemos o login direto por EMAIL para a segurança do Firebase Auth.
                
                // NOTA: Para funcionar como "Nick", o Nick deve ser igual ao e-mail.
                
                // 3. Login via Firebase Auth (sempre exige e-mail)
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                
                // Limpa campos após login bem-sucedido
                document.getElementById('login-user').value = '';
                document.getElementById('login-password').value = '';
                errorEl.textContent = '';
                
            } else {
                // Login por E-mail
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                document.getElementById('login-user').value = '';
                document.getElementById('login-password').value = '';
                errorEl.textContent = '';
            }
        }
        catch (error) {
            let message = error.message.includes('password') ? 'E-mail ou senha incorretos.' : error.message;
            errorEl.textContent = `Erro: ${message}`;
            errorEl.classList.remove('hidden');
        }
    }

    // 🔥 NOVO: Fluxo de redefinição de senha (Esqueceu a senha?)
    handleForgotPassword(e) {
        e.preventDefault();
        const userIdentifier = document.getElementById('login-user').value;
        const errorEl = document.getElementById('auth-error');
        const successEl = document.getElementById('auth-success');
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        let email = userIdentifier.trim().toLowerCase();

        if (!email || !email.includes('@')) {
            errorEl.textContent = "Por favor, insira o seu E-mail no campo acima para redefinir a senha.";
            errorEl.classList.remove('hidden');
            return;
        }

        if (!confirm(`Deseja enviar um link de redefinição de senha para o e-mail: ${email}?`)) {
            return;
        }

        this.auth.sendPasswordResetEmail(email)
            .then(() => {
                successEl.innerHTML = `<i class="fas fa-check-circle"></i> E-mail de redefinição enviado para <strong>${email}</strong>. Verifique sua caixa de entrada.`;
                successEl.classList.remove('hidden');
            })
            .catch((error) => {
                let message;
                if (error.code === 'auth/user-not-found') {
                    message = "Usuário não encontrado. Verifique o e-mail informado.";
                } else {
                    message = `Erro ao enviar e-mail: ${error.message}`;
                }
                errorEl.textContent = message;
                errorEl.classList.remove('hidden');
            });
    }

    // 🔥 NOVO: Lógica do Modal de Configurações de Usuário (Troca de Senha)
    async updatePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        const alertEl = document.getElementById('modal-alert-message');
        alertEl.classList.add('hidden');

        if (newPassword !== confirmNewPassword) {
            this.showModalAlert("As novas senhas não coincidem.", 'danger');
            return;
        }
        if (newPassword.length < 6) {
            this.showModalAlert("A nova senha deve ter pelo menos 6 caracteres.", 'danger');
            return;
        }

        const user = this.auth.currentUser;
        if (!user || !user.email) {
            this.showModalAlert("Sua sessão expirou. Faça login novamente.", 'danger');
            return;
        }

        try {
            // 1. Reautenticar o usuário com a senha atual (obrigatório pelo Firebase)
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // 2. Atualizar a senha
            await user.updatePassword(newPassword);

            this.showModalAlert("Senha atualizada com sucesso!", 'success');
            
            // Limpa o formulário
            document.getElementById('update-password-form').reset();
            
        } catch (error) {
            let message = "Erro ao atualizar senha. Verifique se a 'Senha Atual' está correta.";
            if (error.code === 'auth/wrong-password') {
                message = "A senha atual informada está incorreta.";
            } else if (error.code === 'auth/requires-recent-login') {
                message = "Por favor, feche o modal e faça login novamente para reautenticar sua sessão.";
            } else {
                console.error("Erro Firebase:", error);
            }
            this.showModalAlert(message, 'danger');
        }
    }

    showModalAlert(message, type) {
        const alertEl = document.getElementById('modal-alert-message');
        alertEl.textContent = message;
        alertEl.className = type === 'success' ? 'alert-success-login' : 'alert-danger';
        alertEl.classList.remove('hidden');
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
            // Limpa o estado do formulário e alertas ao abrir
            document.getElementById('update-password-form')?.reset();
            document.getElementById('modal-alert-message')?.classList.add('hidden');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
        }
    }
    
    // ... restante da classe AgriculturalDashboard (funções que não sofreram mudanças significativas)

    
    async fixUserProfile(user) {
        try {
            const userRef = this.db.collection("users").doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists || 
                !userDoc.data().role || 
                userDoc.data().password || 
                userDoc.data().role === user.uid) {
                
                console.log("Corrigindo perfil do usuário:", user.email);
                
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
                console.log("Perfil corrigido com sucesso!");
            }
            
        } catch (error) {
            console.error("Erro ao corrigir perfil:", error);
        }
    }
    
    // 🔥 FUNÇÃO handleSignup REESCRITA: Agora é SOLICITAÇÃO DE CADASTRO
    handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const errorEl = document.getElementById('auth-error');
        const successEl = document.getElementById('auth-success');
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        
        // 1. Validação básica
        if (!name || !email || !phone) {
             errorEl.textContent = "Preencha todos os campos para solicitar o cadastro.";
             errorEl.classList.remove('hidden');
             return;
        }

        // 2. Salva a solicitação na coleção 'requests'
        this.db.collection("requests").doc(email).set({
            name: name,
            email: email.trim().toLowerCase(),
            phone: phone,
            status: 'pending', // Status da solicitação
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Limpa campos
            document.getElementById('signup-name').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-phone').value = '';
            
            // Mostra mensagem de sucesso e instrução
            successEl.innerHTML = "<strong>Solicitação de cadastro enviada!</strong> Você receberá uma mensagem em até 24h com a senha de acesso após a aprovação do administrador.";
            successEl.classList.remove('hidden');
            
            // Volta para o formulário de login (após 5 segundos)
            setTimeout(() => {
                 document.getElementById('signup-form').classList.add('hidden');
                 document.getElementById('login-form').classList.remove('hidden');
                 successEl.classList.add('hidden');
            }, 5000);

        })
        .catch((error) => {
            errorEl.textContent = `Erro ao solicitar cadastro: ${error.message}`;
            errorEl.classList.remove('hidden');
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
            } else {
                 this.currentUserRole = 'viewer';
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
                            <th>E-mail</th>
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
                            ${user.email} 
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
                                class="btn-danger btn-sm delete-user-btn"
                                onclick="window.agriculturalDashboard.deleteUserPrompt('${user.id}', '${user.email}')"
                            >
                                <i class="fas fa-trash"></i> Excluir
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
                        <li>Senhas NUNCA são armazenadas no Firestore</li>
                        <li>Para excluir completamente uma conta, use o Firebase Console</li>
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
    
    // =================== 🟥 LÓGICA DE SOLICITAÇÕES DE CADASTRO 🟥 ===================
    
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
        
        try {
            await this.db.collection("requests").doc(requestId).update({ status: 'approved', approvedAt: firebase.firestore.FieldValue.serverTimestamp() });
            
            const tempUserId = 'new_' + Date.now(); 
            
            await this.db.collection("users").doc(tempUserId).set({
                email: email,
                name: name,
                role: 'viewer', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.loadRegistrationRequests();
            this.loadUserManagementData();
            
            alert(`Solicitação de ${email} aprovada! O registro foi movido para Usuários Ativos. Lembre-se de criar o usuário no Firebase Auth.`);
            
        } catch (error) {
            console.error("Erro ao aprovar:", error);
            alert(`Erro ao aprovar solicitação: ${error.message}`);
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
    
    // =================== 🟥 LÓGICA DE PERMISSÕES DE ABAS (RBAC) 🟥 ===================

    canAccessTab(tabId) {
        if (!this.currentUserRole) return false;

        if (this.currentUserRole === 'admin') return true;
        
        if (tabId === 'tab-gerenciar') {
             return this.currentUserRole === 'admin' || this.currentUserRole === 'editor';
        }

        if (this.tabPermissions[tabId] && typeof this.tabPermissions[tabId][this.currentUserRole] === 'boolean') {
            return this.tabPermissions[tabId][this.currentUserRole];
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
    
    renderTabsNavigation() {
        const tabsNavContainer = document.getElementById('tabs-nav-container');
        if (!tabsNavContainer) return;

        const tabsNav = tabsNavContainer.querySelector('.tabs-nav');
        if (!tabsNav) return;
        
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

        const defaultTab = this.canAccessTab('tab-moagem') ? 'tab-moagem' : 'tab-gerenciar';
        this.showTab(defaultTab);
        
        // No mobile, define o menu como "ativo" para a transição
        if (window.innerWidth <= 768) {
            tabsNavContainer.classList.add('active');
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

    // =================== 🟥 FUNÇÕES PRINCIPAIS E MOBILE UI 🟥 ===================
    
    // 🔥 NOVO: Alterna o Menu Off-Canvas para Mobile
    toggleMenu(forceClose = false) {
        const menuContainer = document.getElementById('tabs-nav-container');
        const backdrop = document.getElementById('menu-backdrop');
        const isMobile = window.innerWidth <= 768;

        if (!isMobile) return;

        if (forceClose || menuContainer.classList.contains('open')) {
            // Fecha o menu
            menuContainer.classList.remove('open');
            backdrop.style.display = 'none';
            document.body.style.overflowY = 'auto';
        } else {
            // Abre o menu
            menuContainer.classList.add('open');
            backdrop.style.display = 'block';
            document.body.style.overflowY = 'hidden';
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
        const totalSlides = 3; 

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

        this.analysisResult = this.analyzer.analyzeAll(this.data, this.potentialData, this.metaData, this.validationResult);
        
        this.visualizer.updateDashboard(this.analysisResult);
        
        this.hideLoadingAnimation();
        
        this.initializeCarousel();
    }
    
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

    debugTimestampInfo(data) {
        if (!data || data.length === 0) {
            console.log("[DEBUG] Nenhum dado para análise de timestamp");
            return;
        }
        
        console.log(`[DEBUG] Total de registros: ${data.length}`);
        
        const timestamps = data.map(item => new Date(item.timestamp)).sort((a, b) => a - b);
        const first = timestamps[0];
        const last = timestamps[timestamps.length - 1];
        
        console.log(`[DEBUG] Primeiro registro: ${first.toLocaleString('pt-BR')}`);
        console.log(`[DEBUG] Último registro: ${last.toLocaleString('pt-BR')}`);
        console.log(`[DEBUG] Período coberto: ${Math.round((last - first) / (1000 * 60 * 60))} horas`);
        
        const invalidTimestamps = data.filter(item => {
            const date = new Date(item.timestamp);
            return isNaN(date.getTime());
        });
        
        if (invalidTimestamps.length > 0) {
            console.warn(`[DEBUG] ${invalidTimestamps.length} timestamps inválidos encontrados`);
        }
    }
    
    updateNextRefreshDisplay(targetTime) {
        const targetTimeStr = targetTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const displayEl = document.getElementById('lastWeighingText');

        if (displayEl) {
            displayEl.innerHTML = `Próxima atualização: ${targetTimeStr} 🔄️`;
        }
    }

    async processDataAsync(productionData, potentialData, metaData, refreshTargetTime) {
        this.debugTimestampInfo(productionData);
        
        await this._yieldControl(); 
        this.validationResult = this.validator.validateAll(productionData);
        this.renderAlerts(this.validationResult.anomalies);
        
        await this._yieldControl(); 
        this.analysisResult = this.analyzer.analyzeAll(productionData, potentialData, metaData, this.validationResult);
        
        await this._yieldControl(); 
        this.visualizer.updateDashboard(this.analysisResult);

        this.showAnalyticsSection(true);
        if (this.canAccessTab('tab-moagem')) {
            this.showTab('tab-moagem'); 
        }
        
        this.updateNextRefreshDisplay(refreshTargetTime); 
        
        this.initializeCarousel();
    }
    
    async fetchFilesFromCloud() {
        const SHEET_ID_PRODUCAO = "1jefysQxtcwSg5fGM-F1BSfAPljyatKwz9OBCRIOg_bo";
        const SHEET_ID_METAS = "1RWjssOEZmmLQwxzFNCrQpLlPvw1bZqT1kEAVcXp6g90";
        const SHEET_ID_POTENCIAL = "1qxhVvQAfVtE8P4EDdwBb-m3ShlWLfFq_YoToJkFKZh4";
        
        const cacheBuster = Date.now(); 

        const googleSheetsUrls = {
            'Producao.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_PRODUCAO}/export?format=csv&gid=0&t=${cacheBuster}`,
            'Metas.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_METAS}/export?format=csv&gid=0&t=${cacheBuster}`,
            'Potencial.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_POTENCIAL}/export?format=csv&gid=0&t=${cacheBuster}`,
        };

        let results = [];
        let successCount = 0;
        let missingFiles = [];

        for (const [name, url] of Object.entries(googleSheetsUrls)) {
            try {
                this.showLoadingAnimation();
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    const gvizUrl = url.replace('/export?format=csv&gid=0', '/gviz/tq?tqx=out:csv&gid=0');
                    const gvizResponse = await fetch(gvizUrl);
                    
                    if (!gvizResponse.ok) {
                        throw new Error(`Falha no download - Status HTTP: ${response.status} ou ${gvizResponse.status}`);
                    }
                    var csvText = await gvizResponse.text();
                } else {
                    var csvText = await response.text(); 
                }

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

            } catch (error) {
                missingFiles.push(name);
            }
        }

        return { successCount, results, missingFiles };
    }

    async handleFileUpload(event) {
        if (this.currentUserRole !== 'admin' && this.currentUserRole !== 'editor') {
            this.showError(`Permissão negada. Apenas Administradores e Editores podem fazer upload de arquivos.`);
            return;
        }

        this.showLoadingAnimation(); 
        
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.data = [];
        this.potentialData = [];
        this.metaData = []; 
        this.clearResults(); 
        this.stopCarousel(); 

        let productionData = [];
        let potentialData = [];
        let metaData = []; 
        let productionFilesCount = 0;
        let potentialFilesCount = 0;
        let metaFilesCount = 0; 
        const fileInfoElement = document.getElementById('fileInfo');
        
        try {
            for (const file of files) {
                if (file.name.startsWith('.')) continue; 
                if (!file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)) continue;
                
                try {
                    const result = await this.processor.processFile(file);
                    
                    if (result && Array.isArray(result.data) && result.data.length > 0) {
                        
                        if (result.type === 'PRODUCTION') {
                            productionData = productionData.concat(result.data);
                            productionFilesCount++;
                        } else if (result.type === 'POTENTIAL') {
                            potentialData = potentialData.concat(result.data);
                            potentialFilesCount++;
                        } 
                        else if (result.type === 'META') {
                             metaData = metaData.concat(result.data);
                             metaFilesCount++;
                        }
                    }
                } catch (err) {
                    console.error(`Erro ao processar ${file.name}:`, err);
                }
            }
            
            if (productionData.length === 0 && potentialData.length === 0 && metaData.length === 0) {
                throw new Error("Nenhum arquivo válido encontrado. Verifique se os arquivos são de Produção, Potencial ou Metas.");
            }

            this.data = productionData;
            this.potentialData = potentialData; 
            this.metaData = metaData; 
            
            if(fileInfoElement) {
                let msg = '';
                if (productionFilesCount > 0) msg += `${productionFilesCount} Produção`;
                if (potentialFilesCount > 0) {
                    if (msg) msg += ' + ';
                    msg += `${potentialFilesCount} Potencial`;
                }
                if (metaFilesCount > 0) {
                    if (msg) msg += ' + ';
                    msg += `${metaFilesCount} Metas`;
                }
                fileInfoElement.textContent = `Arquivos carregados: ${msg}` || 'Arquivos carregados';
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

            event.target.value = ''; 
            
        } catch (error) {
            console.error("Erro no processamento:", error); 
            this.clearResults(); 
            this.showError(`Aviso: ${error.message}`);
            document.getElementById('fileInfo').textContent = "Falha no carregamento.";
            this.showAnalyticsSection(false); 
        } finally {
            this.hideLoadingAnimation(); 
        }
    }
    
    async startLoadingProcess() {
        this.showLoadingAnimation();
        
        const refreshStartTime = new Date();
        
        this.data = [];
        this.potentialData = [];
        this.metaData = [];
        this.clearResults();
        this.stopCarousel();
        
        let cloudMissingFiles = [];
        const fileInfoElement = document.getElementById('fileInfo');
        
        const cloudResult = await this.fetchFilesFromCloud();
        
        cloudMissingFiles = cloudResult.missingFiles;

        if (this.data.length === 0 && this.potentialData.length === 0 && this.metaData.length === 0) {
            this.hideLoadingAnimation();
            this.showAnalyticsSection(false);
            
            let missingFilesString = cloudMissingFiles.join(', ');
            let errorMessage = `Falha na automação. Arquivos ausentes: ${missingFilesString}. Por favor, use a aba 'Gerenciar' para o upload manual.`;
            
            this.showError(errorMessage); 
            return;
        }

        if(fileInfoElement) {
            
            let msg = [];
            let missingFilesList = cloudMissingFiles;
            
            const essentialFiles = {
                'Produção': this.data.length > 0,
                'Potencial': this.potentialData.length > 0,
                'Metas': this.metaData.length > 0
            };
            
            if (essentialFiles.Produção) msg.push(`Produção`);
            if (essentialFiles.Potencial) msg.push(`Potencial`);
            if (essentialFiles.Metas) msg.push(`Metas`);

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
    
    // =================== 🟥 EVENT LISTENERS E FUNÇÕES DE UI 🟥 ===================
    
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
                    this.showError('Nenhum dado disponível para exportação.');
                }
            });
        }
        
        const metaMoagemInput = document.getElementById('metaMoagemInput');
        if (metaMoagemInput) {
            metaMoagemInput.addEventListener('change', (e) => this.saveMeta(e.target.value, 'metaMoagem'));
        }
        
        const metaRotacaoInput = document.getElementById('metaRotacaoInput');
        if (metaRotacaoInput) {
            metaRotacaoInput.addEventListener('change', (e) => this.saveMeta(e.target.value, 'metaRotacao'));
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
             logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // 🟥 Botão de Menu Mobile
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        if (menuToggleBtn) {
            menuToggleBtn.addEventListener('click', () => this.toggleMenu());
        }
        
        // 🟥 Backdrop do Menu Mobile
        const menuBackdrop = document.getElementById('menu-backdrop');
        if (menuBackdrop) {
            menuBackdrop.addEventListener('click', () => this.toggleMenu(true));
        }

        // 🟥 Listeners para troca de formulário Login/Cadastro
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
        
        // 🟥 Listeners para submissão dos formulários
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // 🟥 Listener para o modal de troca de senha
        const updatePasswordForm = document.getElementById('update-password-form');
        if (updatePasswordForm) {
            updatePasswordForm.addEventListener('submit', (e) => this.updatePassword(e));
        }
        
        // 🟥 Listener para link de redefinição de senha
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
             forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
        }

        // 🟥 Navegação de sub-abas (Gerenciamento de Usuários)
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
        
        // 🟥 Botões do carrossel
        document.querySelectorAll('.carousel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const direction = btn.classList.contains('next') ? 1 : -1;
                this.navigateCarousel(direction);
            });
        });
        
        // 🟥 Indicadores do carrossel
        document.querySelectorAll('.carousel-indicators .indicator').forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.showSlide(index);
                this.initializeCarousel();
            });
        });
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
    
    clearResults() {
        this.currentSlideIndex = 0;
        this.stopCarousel(); 
        
        const lastWeighingText = document.getElementById('lastWeighingText');
        if (lastWeighingText) {
             lastWeighingText.textContent = 'Aguardando atualização... 🔄️';
        }
        
        if (this.visualizer && this.visualizer.kpisRenderer && this.visualizer.kpisRenderer.updateHeaderStats) {
            this.visualizer.kpisRenderer.updateHeaderStats({
                totalViagens: 0,
                viagensProprias: 0,
                viagensTerceiros: 0,
                totalPesoLiquido: 0,
                taxaAnalise: 0,
                distribuicaoFrota: { propria: 0, terceiros: 0 }
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

        if (anomalies.length === 0) {
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
            let iconClass = 'fa-exclamation-circle';
            
            if (alert.severity === 'critical') iconClass = 'fa-times-circle';
            else if (alert.severity === 'info') iconClass = 'fa-info-circle';

            alertDiv.className = `alert-card ${alert.severity}`;
            
            let detailHtml = '';
            if (alert.detail) {
                detailHtml = `<div class="alert-card-detail">${alert.detail}</div>`;
            }

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

    showError(message) {
        const errorDiv = document.getElementById('auth-error'); 
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        } else {
            alert(message);
        }
    }
    
    showTab(tabId) {
        if (!this.canAccessTab(tabId)) {
            this.showError(`Acesso negado à aba "${tabId}". Seu papel é: ${this.currentUserRole}`);
            return; 
        }
        
        // 🔥 NOVO: Fechar menu mobile ao selecionar uma aba
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
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        const needsParticles = tabId === 'tab-gerenciar' || tabId === 'tab-usuarios';
        if (needsParticles && !this.isAnimatingParticles) {
            this.isAnimatingParticles = true;
            this.initializeParticles(); 
        } else if (!needsParticles && this.isAnimatingParticles) {
            this.isAnimatingParticles = false;
        }
        
        if (tabId === 'tab-moagem') {
             this.showSlide(this.currentSlideIndex); 
             this.initializeCarousel();
        } else {
             this.stopCarousel();
        }

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
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
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
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    initializeParticles() {
        const canvas = document.getElementById('particles-js');
        if (!canvas) return;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.agriculturalDashboard = new AgriculturalDashboard(); 
});