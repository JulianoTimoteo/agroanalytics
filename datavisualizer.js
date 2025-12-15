// datavisualizer.js - CORE DO VISUALIZER (ORQUESTRAÇÃO E TEMA)
class DataVisualizer {
    constructor() {
        this.charts = {};
        this.baseColors = {
            primary: '#00D4FF', 
            secondary: '#7B61FF', 
            accent: '#FF2E63', 
            success: '#40800c',
            warning: '#FFB800', 
            danger: '#FF2E63',  
            proprio: '#40800c',
            terceiro: '#FF8C00',
            tier1: '#00F5A0', 
            tier2: '#00D4FF', 
            tier3: '#FFB800', 
            tier4: '#FF2E63',
            // Cores específicas (Moagem/Potencial)
            potencial_color: '#00F5A0',
            rotacao_color: '#FF8C00',
            real_moagem_color: '#00D4FF',
            meta_horaria_color: '#FF2E63' 
        };
        
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
        
        // Inicializa Submódulos de Visualização
        this.kpisRenderer = new VisualizerKPIs(this);
        this.chartsBaseRenderer = new VisualizerChartsBase(this);
        this.chartsMoagemRenderer = new VisualizerChartsMoagem(this);
        this.gridRenderer = new VisualizerGrid(this);
        this.metasRenderer = new VisualizerMetas(this); // NOVO: Inicializa o renderizador de Metas
    }

    getThemeConfig() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return { 
            fontColor: isDark ? '#FFFFFF' : '#333333', 
            gridColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', 
            cardColor: isDark ? '#1e1e24' : '#ffffff', 
            labelColor: isDark ? '#FFFFFF' : '#000000', 
            ...this.baseColors 
        };
    }

    _safeHTML(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    updateDashboard(analysis) {
        if (!analysis) {
            console.warn('[VISUALIZER] Análise vazia ou inválida');
            return;
        }
        
        const theme = this.getThemeConfig();
        
        // Atualiza o display da última pesagem
        this._updateLastWeighingDisplay(analysis.lastExitTimestamp, analysis.data);
        
        // --- DELEGAÇÃO ---
        this.kpisRenderer.updateHeaderStats(analysis);
        this.kpisRenderer.updateTopLists(analysis);
        
        if (analysis.frentes) {
            this.gridRenderer.updateFrontsGrid(analysis.frentes);
        }
        
        // Atualiza a grid de Metas se houver dados
        if (analysis.metaData) {
            this.metasRenderer.updateMetasGrid(analysis.metaData);
        }
        
        this.chartsBaseRenderer.createFleetChart(analysis.distribuicaoFrota, theme);
        this.chartsBaseRenderer.createHarvestChart(analysis.equipmentDistribution, theme); 
        this.chartsBaseRenderer.createTimeChart(analysis.analise24h, theme);
        this.chartsBaseRenderer.createFleetHourlyChart(analysis.fleetHourly, theme); 
        
        const hourlyData = analysis.analyzeFrontHourly ? analysis.analyzeFrontHourly(analysis.data) : { labels: [], datasets: [] };
        this.chartsBaseRenderer.createFrontHourlyChart(hourlyData, theme);
        
        this.updateMoagemTab(analysis, theme);
    }
    
    /**
     * @description Atualiza o display discreto da última pesagem de saída.
     * CORRIGIDO: Adicionado fallback para buscar timestamp dos dados
     */
    _updateLastWeighingDisplay(timestamp, data = null) {
        const displayEl = document.getElementById('lastWeighingText');
        if (!displayEl) return;
        
        // Tenta primeiro com o timestamp direto da análise
        if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
            const dateStr = timestamp.toLocaleDateString('pt-BR');
            const timeStr = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            displayEl.textContent = `Última pesagem: ${dateStr} às ${timeStr}`;
            return;
        }
        
        // Fallback 1: Busca nos dados fornecidos
        if (data && Array.isArray(data) && data.length > 0) {
            let latest = null;
            
            for (const row of data) {
                if (row.timestamp && row.timestamp instanceof Date && !isNaN(row.timestamp.getTime())) {
                    if (!latest || row.timestamp > latest) {
                        latest = row.timestamp;
                    }
                }
            }
            
            if (latest) {
                const dateStr = latest.toLocaleDateString('pt-BR');
                const timeStr = latest.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                displayEl.textContent = `Última pesagem: ${dateStr} às ${timeStr}`;
                return;
            }
        }
        
        // Fallback 2: Busca nos dados globais do dashboard
        if (window.agriculturalDashboard && window.agriculturalDashboard.data && window.agriculturalDashboard.data.length > 0) {
            let latest = null;
            const dashboardData = window.agriculturalDashboard.data;
            
            for (const row of dashboardData) {
                if (row.timestamp && row.timestamp instanceof Date && !isNaN(row.timestamp.getTime())) {
                    if (!latest || row.timestamp > latest) {
                        latest = row.timestamp;
                    }
                }
            }
            
            if (latest) {
                const dateStr = latest.toLocaleDateString('pt-BR');
                const timeStr = latest.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                displayEl.textContent = `Última pesagem: ${dateStr} às ${timeStr}`;
                return;
            }
        }
        
        // Fallback final
        displayEl.textContent = 'Última pesagem: N/A';
    }

    // O método de Moagem é complexo e usa vários submódulos, mantido aqui para orquestração
    updateMoagemTab(analysis, config) {
        const totalWeight = analysis ? analysis.totalPesoLiquido : 0;
        const target = parseFloat(localStorage.getItem('metaMoagem') || '25000'); 
        const percent = Math.min((totalWeight / target) * 100, 100).toFixed(0);
        
        // --- ATUALIZAÇÃO DOS KPIS MOAGEM/META ---
        document.getElementById('moagemAcumulado').textContent = Utils.formatNumber(totalWeight) + " t";
        document.getElementById('moagemProgressBar').style.width = percent + "%";
        document.getElementById('moagemPerc').textContent = percent + "%";
        
        // --- BARRA DE DISTRIBUIÇÃO DO PROPRIETÁRIO ---
        this.kpisRenderer.updateOwnerDistributionBar(analysis);
        
        // --- PROJEÇÃO ---
        const projection = analysis.projecaoMoagem || { 
             forecast: 0, 
             rhythm: 0, 
             rhythmSum: 0, 
             fixedRhythm: 0, 
             fixedSum: 0, 
             hoursPassed: 0, 
             status: 'Calculando...',
             requiredRhythm: 0,
             forecastDifference: 0 
        };
        
        const moagemForecastEl = document.getElementById('moagemForecast');
        const moagemStatusEl = document.getElementById('moagemStatus');
        
        // 1. Previsão 24h e Diferença
        const diff = projection.forecastDifference;
        const formattedDiff = (diff >= 0 ? '+' : '') + Utils.formatNumber(Math.abs(diff)) + ' t';
        const colorDiff = diff >= 0 ? this.baseColors.success : this.baseColors.danger;
        
        if (moagemForecastEl) moagemForecastEl.textContent = Utils.formatNumber(projection.forecast) + " t";

        const diffContainer = document.getElementById('forecastDifferenceContainer');
        if (diffContainer) {
             diffContainer.textContent = formattedDiff;
             diffContainer.style.color = colorDiff;
        }

        // 2. RITMO ATUAL (Média Horária)
        const fixedRhythm = analysis.projecaoMoagem.fixedRhythm || 0;
        const fixedSum = analysis.projecaoMoagem.fixedSum || 0;
        const weightsList = analysis.projecaoMoagem.weightsUsed || [];
        
        // Formata a lista de pesos para exibição
        const weightsDisplay = weightsList.map(w => Utils.formatNumber(w) + ' t').join(' + ');

        const ritmoAtualFormulaContainer = document.getElementById('ritmoAtualFormulaContainer');
        if (ritmoAtualFormulaContainer) {
            if (fixedRhythm > 0) {
                // Exibição do Ritmo Escalonado (x10) e a Média Real
                ritmoAtualFormulaContainer.innerHTML = `
                    <div style="font-size: 0.9rem; color: var(--text); font-weight: 600; margin-top: 10px;">
                        Pesos das 3h Agregadas: 
                        <span style="font-weight: bold; color: var(--warning);">${weightsDisplay}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text); font-weight: 600; margin-top: 5px;">
                        Soma (Correta): 
                        <span style="font-weight: bold; color: var(--warning);">${Utils.formatNumber(fixedSum)} t</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text); font-weight: 600; margin-top: 5px;">
                        Ritmo Médio (Fixado):
                        <span style="font-weight: bold; color: var(--primary);">${Utils.formatNumber(fixedRhythm)} t/h</span>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 5px;">
                        Fórmula: Soma dos pesos acima / 3 = Média
                    </div>
                `;
            } else {
                ritmoAtualFormulaContainer.innerHTML = ''; 
            }
        }

        // 3. TENDÊNCIA (STATUS) 
        let statusClass = 'status-badge warning';
        if (projection.status === 'Consolidado (24h)') statusClass = 'forecast-badge success';
        else if (projection.status === 'Bater a meta') statusClass = 'forecast-badge active'; 
        else if (projection.status === 'Abaixo da meta') statusClass = 'forecast-badge critical'; 
        
        if (moagemForecastEl) {
            moagemForecastEl.style.color = (projection.status === 'Bater a meta' || projection.status === 'Consolidado (24h)') 
                ? this.baseColors.success : this.baseColors.danger;
        }

        if (moagemStatusEl) {
             moagemStatusEl.textContent = projection.status;
             moagemStatusEl.className = statusClass;
             moagemStatusEl.classList.add('forecast-badge'); 
        }

        // --- CRIAÇÃO DOS TRÊS GRÁFICOS DO CARROSSEL ---
        
        // 1. Production Data (Full 24-hour set)
        const hourlyData = analysis.analise24h || []; 
        const realLabels = hourlyData.map(d => d.time); 
        const moagemReal = hourlyData.map(d => d.peso); 
        const metaDinamicaFull = analysis.requiredHourlyRates || realLabels.map(() => 0); 

        // 2. Potential Data (Sparse set for Potencial/Rotation charts)
        const { labels: potentialLabels, potencial, rotacao } = this.chartsMoagemRenderer._processPotentialByHour(analysis.potentialRawData);
        
        // 3. Align Meta Dinâmica to sparse labels for Potential chart
        const sparseMeta = potentialLabels.map(label => {
            const index = realLabels.indexOf(label);
            return index !== -1 ? metaDinamicaFull[index] : 0;
        });

        // 4. Create Real Hourly Chart (Uses full 24-hour real data)
        this.chartsMoagemRenderer.createRealHourlyChart(realLabels, moagemReal, metaDinamicaFull, config);

        // 5. Create Potential and Rotation Charts (Uses sparse data and aligned meta)
        this.chartsMoagemRenderer.createPotencialHourlyChart(potentialLabels, potencial, sparseMeta, config);
        this.chartsMoagemRenderer.createRotacaoHourlyChart(potentialLabels, rotacao, config); 

        // --- RENDERIZA O STATUS DA FROTA ---
        this.gridRenderer.renderFleetAndAvailabilityCards(analysis.potentialRawData, analysis);
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    exportChart(chartId) {
        if (this.charts[chartId]) {
            const a = document.createElement('a');
            a.href = this.charts[chartId].toBase64Image();
            a.download = chartId + '.png';
            a.click();
        }
    }

    updateTheme() {
        const theme = this.getThemeConfig();
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.grid) scale.grid.color = theme.gridColor;
                        if (scale.ticks) scale.ticks.color = theme.fontColor;
                        if (scale.title) scale.title.color = theme.fontColor; 
                    });
                }
                
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels.color = theme.fontColor;
                }
                
                if (chart.options.plugins && chart.options.plugins.datalabels) {
                    if (chart.config.type === 'bar' && chart.data.datasets) {
                        chart.data.datasets.forEach(dataset => {
                            if (dataset.datalabels) {
                                dataset.datalabels.color = theme.labelColor;
                            }
                        });
                    }
                    const totalDataset = chart.data.datasets.find(d => d.label === 'Total');
                    if(totalDataset && totalDataset.datalabels) {
                        totalDataset.datalabels.color = theme.fontColor;
                    }
                }
                
                chart.update('none');
            }
        });
    }
}

if (typeof DataVisualizer === 'undefined') {
    window.DataVisualizer = DataVisualizer;
}