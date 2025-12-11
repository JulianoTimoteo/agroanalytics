// app.js - Orquestrador Principal (Inteligente e Robusto)
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
        
        // CORREÇÃO CRÍTICA: Inicia a busca online
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

    // MODIFICADO: Adiciona metaData
    async processDataAsync(productionData, potentialData, metaData) {
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
        document.querySelectorAll('#tab-frentes .tabs-nav button').forEach(button => {
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

    // --- FUNÇÃO CRÍTICA DE BUSCA ONLINE (CLOUDFLARE WORKER) ---
    async fetchFilesFromCloud() {
        // --------------------------------------------------------
        // MODO: CLOUDFLARE WORKER (Proxy CORS)
        // --------------------------------------------------------
        
        // URL DO SEU WORKER ATIVO
        const WORKER_URL = 'https://agroanalytics.jtsdowload.workers.dev/?url='; 

        // LINKS DE COMPARTILHAMENTO DO ONEDRIVE/SHAREPOINT (SEUS LINKS REAIS)
        const oneDriveUrls = {
            'Producao.xlsx': 'https://pitaa-my.sharepoint.com/:x:/g/personal/julianotimoteo_usinapitangueiras_com_br/IQAu-XZTf4dTRo4MTEsfTdPIAYD-5OHLTgUF68gW-_nRbI4?e=iuayIE',
            'Potencial.xlsx': 'https://pitaa-my.sharepoint.com/:x:/g/personal/julianotimoteo_usinapitangueiras_com_br/IQBsDulvntQ8RZ_EoXDpQ-VnAVobVEHoi6wL2iE-4I5r6kY?e=l8Kml4',
            'Metas.xlsx': 'https://pitaa-my.sharepoint.com/:x:/g/personal/julianotimoteo_usinapitangueiras_com_br/IQDPsvHp5stzS5_S9YNmawxeATWu1T8c6-7ZfPe5EaMLtuI?e=uGSaa1'
        };

        let results = [];
        let successCount = 0;
        let missingFiles = [];

        for (const [name, oneDriveUrl] of Object.entries(oneDriveUrls)) {
            try {
                this.showLoadingAnimation();
                
                // CONSTRUÇÃO DA URL: Worker URL + Link do OneDrive (codificado)
                const proxyUrl = WORKER_URL + encodeURIComponent(oneDriveUrl);
                
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    throw new Error(`Status HTTP ${response.status} ao acessar o Worker.`);
                }
                
                // Leitura do conteúdo binário (Excel)
                const data = await response.arrayBuffer(); 

                // Processamento do IntelligentProcessor (que aceita ArrayBuffer)
                const result = await this.processor.processFile(data, name);
                
                if (result && Array.isArray(result.data) && result.data.length > 0) {
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
                    // NOTE: This processFile call is for local file upload (FileReader), not the Worker.
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
        
        // 1. Tenta a BUSCA ONLINE (CLOUDFLARE WORKER)
        const cloudResult = await this.fetchFilesFromCloud();
        
        cloudResult.results.forEach(res => {
             if (res.type === 'PRODUCTION') productionData = productionData.concat(res.data);
             else if (res.type === 'POTENTIAL') potentialData = potentialData.concat(res.data);
             else if (res.type === 'META') metaData = metaData.concat(res.data);
        });
        cloudMissingFiles = cloudResult.missingFiles;

        if (productionData.length === 0 && potentialData.length === 0 && metaData.length === 0) {
            this.hideLoadingAnimation();
            this.showAnalyticsSection(false);
            throw new Error("Nenhum arquivo válido encontrado. Verifique se os arquivos são de Produção, Potencial ou Metas.");
        }

        this.data = productionData;
        this.potentialData = potentialData;
        this.metaData = metaData;

        // 2. Feedback e Visualização
        if(fileInfoElement) {
            
            let msg = [];
            let missingFilesList = cloudMissingFiles;
            
            const essentialFiles = {
                'Produção': productionData.length > 0,
                'Potencial': potentialData.length > 0,
                'Metas': metaData.length > 0
            };
            
            if (essentialFiles.Produção) msg.push(`Produção`);
            if (essentialFiles.Potencial) msg.push(`Potencial`);
            if (essentialFiles.Metas) msg.push(`Metas`);

            // Lógica de Mensagem Final
            let finalMessage = `Arquivos carregados: ${msg.join(' + ')}.`;
            let statusColor = 'var(--success)';
            if (missingFilesList.length > 0 && missingFilesList.length < 3) {
                finalMessage += ` Aviso: Falta(m) o(s) arquivo(s) essenciais: ${missingFilesList.join(', ')}.`;
                statusColor = 'var(--warning)';
            } else if (missingFilesList.length === 3) {
                 finalMessage = `Aviso: Nenhum arquivo essencial foi carregado.`;
                 statusColor = 'var(--danger)';
            }
            
            finalMessage += ` (Via Cloudflare Worker)`;

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