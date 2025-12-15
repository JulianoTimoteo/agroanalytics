// app.js - Orquestrador Principal (VERSÃO FINAL: Lendo 3 Planilhas Separadas)
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
        
        // Estado do Carrossel
        this.currentSlideIndex = 0;
        this.carouselInterval = null; 

        // Configuração
        this.initializeEventListeners();
        this.initializeParticles();
        this.loadTheme();

        this.loadMeta(); 
        this.initShiftTracker(); 

        this.showTab('tab-gerenciar'); 
        this.clearResults(); 
        
        // Inicia a busca online (Google Sheets CSV Publicado)
        this.startLoadingProcess(); 
    }
    
    // --- MÉTODOS DE CONTROLE DO CARROSSEL ---

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
    
    // --- MÉTODOS DE PERSISTÊNCIA ---
    
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
            displayEl.textContent = Utils.formatNumber(targetValue) + ' t';
        }
    }
    
    recalculateProjectionAndRender() {
        this.showLoadingAnimation(); 

        this.analysisResult = this.analyzer.analyzeAll(this.data, this.potentialData, this.metaData, this.validationResult);
        
        this.visualizer.updateDashboard(this.analysisResult);
        
        this.hideLoadingAnimation();
        
        this.initializeCarousel();
    }
    
    // --- RASTREADOR DE TURNO ---
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

    // --- FUNÇÕES DE ANIMAÇÃO DE CARREGAMENTO ---
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
    
    // Função para introduzir um pequeno atraso e liberar o thread (Yield)
    _yieldControl() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    // MÉTODO DE DEBUG PARA TIMESTAMPS
    debugTimestampInfo(data) {
        if (!data || data.length === 0) {
            console.log("=== DEBUG TIMESTAMPS: Dados vazios ===");
            return;
        }
        
        console.log("=== DEBUG TIMESTAMPS ===");
        console.log(`Total de registros: ${data.length}`);
        
        const timestamps = data
            .filter(row => row.timestamp)
            .map(row => ({
                timestamp: row.timestamp,
                formatted: row.timestamp instanceof Date ? 
                    row.timestamp.toLocaleString('pt-BR') : 
                    String(row.timestamp),
                type: typeof row.timestamp,
                isDate: row.timestamp instanceof Date,
                isValid: row.timestamp instanceof Date && !isNaN(row.timestamp.getTime())
            }));
        
        console.log(`Registros com timestamp: ${timestamps.length}`);
        
        if (timestamps.length > 0) {
            console.log("Primeiros 5 timestamps:");
            timestamps.slice(0, 5).forEach((ts, i) => {
                console.log(`${i+1}. ${ts.formatted} (Tipo: ${ts.type}, Date: ${ts.isDate}, Válido: ${ts.isValid})`);
            });
            
            const sorted = [...timestamps].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                return timeB - timeA;
            });
            
            if (sorted[0]) {
                console.log("Timestamp mais recente:", sorted[0].formatted);
                console.log("Valor raw:", sorted[0].timestamp);
            }
        } else {
            console.log("Nenhum timestamp encontrado nos dados");
        }
        console.log("======================");
    }

    // MODIFICADO: Adiciona metaData
    async processDataAsync(productionData, potentialData, metaData) {
        // DEBUG: Verifica os timestamps
        this.debugTimestampInfo(productionData);
        
        // 1. Validação
        await this._yieldControl(); 
        this.validationResult = this.validator.validateAll(productionData);
        this.renderAlerts(this.validationResult.anomalies);
        
        // 2. Análise
        await this._yieldControl(); 
        // MODIFICADO: Passa metaData
        this.analysisResult = this.analyzer.analyzeAll(productionData, potentialData, metaData, this.validationResult);
        
        // 3. Visualização
        await this._yieldControl(); 
        this.visualizer.updateDashboard(this.analysisResult);

        // 4. Finalização
        this.showAnalyticsSection(true);
        this.showTab('tab-moagem'); 
        
        this.initializeCarousel();
    }
    
    // NOVO: Controle de sub-abas (Frentes)
    showSubTab(subTabId, clickedButton) {
        // Remove 'active' de todos os sub-panes dentro de #tab-frentes
        document.querySelectorAll('#tab-frentes .tab-pane-sub').forEach(pane => {
            pane.classList.remove('active');
        });
        // Remove 'active' de todos os botões de sub-abas
        document.querySelectorAll('.tabs-nav .tab-button').forEach(button => {
            button.classList.remove('active');
        });

        const activePane = document.getElementById(subTabId);
        if (activePane) {
            activePane.classList.add('active');
        }
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
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
        
        // NOVO: Adiciona o listener para a nova função showSubTab (garantindo que o clique chame o método da classe)
        document.querySelectorAll('#tab-frentes .tabs-nav button').forEach(button => {
             const onclickAttr = button.getAttribute('onclick');
             if (onclickAttr && onclickAttr.includes('showSubTab')) {
                 // Substitui a chamada para usar o 'this' (o botão clicado) como segundo argumento
                 const newOnClick = onclickAttr.replace("showSubTab('", "window.agriculturalDashboard.showSubTab('").replace("', this)", "") + ", this)";
                 button.setAttribute('onclick', newOnClick);
             }
        });
    }
    
    showTab(tabId) {
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            pane.style.display = 'none';
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        const activePane = document.getElementById(tabId);
        if (activePane) {
            activePane.classList.add('active');
            activePane.style.display = 'block';
        }
        
        const activeBtn = document.querySelector(`.tab-button[onclick*='${tabId}']`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        if (tabId === 'tab-gerenciar' && !this.isAnimatingParticles) {
            this.isAnimatingParticles = true;
            this.initializeParticles(); 
        } else if (tabId !== 'tab-gerenciar' && this.isAnimatingParticles) {
            this.isAnimatingParticles = false;
        }
        
        if (tabId === 'tab-moagem') {
             this.showSlide(this.currentSlideIndex); 
             this.initializeCarousel();
        } else {
             this.stopCarousel();
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
                p.y += p.y;
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

    // --- FUNÇÃO CRÍTICA DE BUSCA ONLINE (CSV PUBLICADO) ---
    async fetchFilesFromCloud() {
        // --------------------------------------------------------
        // IDs das planilhas fornecidas pelo Apps Script
        // --------------------------------------------------------
        
        const SHEET_ID_PRODUCAO = "1jefysQxtcwSg5fGM-F1BSfAPljyatKwz9OBCRIOg_bo";
        const SHEET_ID_METAS = "1RWjssOEZmmLQwxzFNCrQpLlPvw1bZqT1kEAVcXp6g90";
        const SHEET_ID_POTENCIAL = "1qxhVvQAfVtE8P4EDdwBb-m3ShlWLfFq_YoToJkFKZh4";
        
        const cacheBuster = Date.now(); // Cache-Busting para garantir o dado mais fresco

        const googleSheetsUrls = {
            // Produção: ID Dedicado
            'Producao.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_PRODUCAO}/export?format=csv&gid=0&t=${cacheBuster}`,
            
            // Metas: ID Dedicado
            'Metas.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_METAS}/export?format=csv&gid=0&t=${cacheBuster}`,

            // Potencial: ID Dedicado
            'Potencial.xlsx': `https://docs.google.com/spreadsheets/d/${SHEET_ID_POTENCIAL}/export?format=csv&gid=0&t=${cacheBuster}`,
        };

        let results = [];
        let successCount = 0;
        let missingFiles = [];

        for (const [name, url] of Object.entries(googleSheetsUrls)) {
            try {
                this.showLoadingAnimation();
                
                // Fetch de TEXTO (CSV)
                const response = await fetch(url);
                
                if (!response.ok) {
                    // Se falhar a primeira tentativa, tenta com o endpoint Gviz, mais tolerante.
                    const gvizUrl = url.replace('/export?format=csv&gid=0', '/gviz/tq?tqx=out:csv&gid=0');
                    const gvizResponse = await fetch(gvizUrl);
                    
                    if (!gvizResponse.ok) {
                        throw new Error(`Falha no download - Status HTTP: ${response.status} ou ${gvizResponse.status}`);
                    }
                    var csvText = await gvizResponse.text();
                } else {
                    var csvText = await response.text(); 
                }

                // Processamento do IntelligentProcessor (que usa processCSV)
                const result = await this.processor.processCSV(csvText, name);
                
                // Se o processamento for bem-sucedido e houver dados:
                if (result && Array.isArray(result.data) && result.data.length > 0) {
                    
                    // Lógica de atribuição para os arrays corretos no app.js
                    if (result.type === 'PRODUCTION') {
                        this.data = this.data.concat(result.data); // Produção
                    } else if (result.type === 'POTENTIAL') {
                        this.potentialData = this.potentialData.concat(result.data); // Potencial
                    } else if (result.type === 'META') {
                        this.metaData = this.metaData.concat(result.data); // Metas
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
                    // Este método usa FileReader (upload local)
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

            await this.processDataAsync(this.data, this.potentialData, this.metaData);

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
    
    // NOVO: Função que orquestra o carregamento (Busca Online OU Upload Manual)
    async startLoadingProcess(event) {
        this.showLoadingAnimation();
        
        this.data = [];
        this.potentialData = [];
        this.metaData = [];
        this.clearResults();
        this.stopCarousel();
        
        let productionData = [];
        let potentialData = [];
        let metaData = [];
        let cloudMissingFiles = [];
        const fileInfoElement = document.getElementById('fileInfo');
        
        // Tenta a BUSCA ONLINE (GOOGLE SHEETS)
        const cloudResult = await this.fetchFilesFromCloud();
        
        // Atribuição de dados preenchida diretamente no fetchFilesFromCloud 
        cloudMissingFiles = cloudResult.missingFiles;

        if (this.data.length === 0 && this.potentialData.length === 0 && this.metaData.length === 0) {
            this.hideLoadingAnimation();
            this.showAnalyticsSection(false);
            
            let missingFilesString = cloudMissingFiles.join(', ');
            let errorMessage = `Falha na automação. Arquivos ausentes: ${missingFilesString}. Por favor, use a aba 'Gerenciar' para o upload manual.`;
            
            this.showError(errorMessage); 
            return;
        }

        // 2. Feedback e Visualização
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

            // Lógica de Mensagem Final
            let finalMessage = `Arquivos carregados: ${msg.join(' + ')}.`;
            let statusColor = 'var(--success)';
            if (missingFilesList.length > 0) {
                finalMessage = `Carregados: ${msg.join(' + ')}.`;
            }
            
            finalMessage += ` (Via Google Sheets)`;

            fileInfoElement.textContent = finalMessage;
            fileInfoElement.style.color = statusColor;
        }

        await this.processDataAsync(this.data, this.potentialData, this.metaData); 

        if (event && event.target) event.target.value = '';

        this.hideLoadingAnimation();
    }
    
    clearResults() {
        this.currentSlideIndex = 0;
        this.stopCarousel(); 
        
        // NOVO: Limpa o display da última pesagem
        const lastWeighingText = document.getElementById('lastWeighingText');
        if (lastWeighingText) {
             lastWeighingText.textContent = 'Última pesagem: Aguardando dados.';
        }
        
        // CORRIGIDO: Zera todos os KPIs no header (chamando o visualizer com dados zerados)
        if (this.visualizer && this.visualizer.kpisRenderer) {
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
        
        // NOVO: Limpa a nova grid de Metas
        const metasContainer = document.getElementById('frontsMetaContainer');
        if(metasContainer) metasContainer.innerHTML = '';
        
        const fleetGrid = document.getElementById('fleetStatusCardsGrid');
        if (fleetGrid) fleetGrid.innerHTML = `<p class="text-secondary" style="text-align: center;">Aguardando dados de Potencial.</p>`;

        if (this.visualizer && this.visualizer.destroyAllCharts) {
            this.visualizer.destroyAllCharts();
        }

        this.showAnalyticsSection(false);
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

    showError(message) {
        console.error(message);
        const fileInfoElement = document.getElementById('fileInfo');
        if (fileInfoElement) {
            fileInfoElement.textContent = message.split(':')[0]; 
            fileInfoElement.style.color = 'var(--danger)';
            setTimeout(() => {
                 fileInfoElement.style.color = 'var(--text-secondary)';
                 fileInfoElement.textContent = 'Aguardando arquivo...';
            }, 5000);
        } else {
            alert(message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.agriculturalDashboard = new AgriculturalDashboard(); 
});