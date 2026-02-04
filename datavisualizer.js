// datavisualizer.js - VERSÃO FINAL BLINDADA
// Este arquivo orquestra todos os submódulos de visualização.

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
            potencial_color: '#00F5A0',
            rotacao_color: '#FF8C00',
            real_moagem_color: '#00D4FF',
            meta_horaria_color: '#FF2E63' 
        };
        
        // Registra plugins do Chart.js se existirem
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            try {
                Chart.register(ChartDataLabels);
            } catch (e) {
                console.warn("[DataVisualizer] ChartDataLabels já registrado ou erro:", e);
            }
        }
        
        // Inicializa Submódulos com verificação de segurança
        // Se um arquivo falhar, não quebra todo o visualizador
        try {
            this.kpisRenderer = (typeof VisualizerKPIs !== 'undefined') ? new VisualizerKPIs(this) : null;
            this.chartsBaseRenderer = (typeof VisualizerChartsBase !== 'undefined') ? new VisualizerChartsBase(this) : null;
            this.chartsMoagemRenderer = (typeof VisualizerChartsMoagem !== 'undefined') ? new VisualizerChartsMoagem(this) : null;
            this.gridRenderer = (typeof VisualizerGrid !== 'undefined') ? new VisualizerGrid(this) : null;
            this.metasRenderer = (typeof VisualizerMetas !== 'undefined') ? new VisualizerMetas(this) : null;
        } catch (e) {
            console.error("[DataVisualizer] Erro ao inicializar submódulos:", e);
        }
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
        
        try {
            this.destroyAllCharts();

            this._updateLastWeighingDisplay(analysis.lastExitTimestamp, analysis.data);
            
            if(this.kpisRenderer) {
                this.kpisRenderer.updateHeaderStats(analysis);
                this.kpisRenderer.updateTopLists(analysis);
            }
            
            if (this.gridRenderer && analysis.frentes) {
                this.gridRenderer.updateFrontsGrid(analysis.frentes);
            }
            
            if (this.metasRenderer && analysis.metaData) {
                this.metasRenderer.updateMetasGrid(analysis.metaData);
            }
            
            if (this.chartsBaseRenderer) {
                this.chartsBaseRenderer.createFleetChart(analysis.distribuicaoFrota, theme);
                this.chartsBaseRenderer.createHarvestChart(analysis.equipmentDistribution, theme); 
                this.chartsBaseRenderer.createTimeChart(analysis.analise24h, theme);
                this.chartsBaseRenderer.createFleetHourlyChart(analysis.fleetHourly, theme); 
                
                const hourlyData = analysis.analyzeFrontHourly ? analysis.analyzeFrontHourly(analysis.data) : { labels: [], datasets: [] };
                this.chartsBaseRenderer.createFrontHourlyChart(hourlyData, theme);
            }
            
            this.updateMoagemTab(analysis, theme);

        } catch (error) {
            console.error("❌ [Visualizer] Erro na renderização:", error);
        }
    }
    
    _updateLastWeighingDisplay(timestamp, data = null) {
        const displayEl = document.getElementById('lastWeighingText');
        if (!displayEl) return;
        
        if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
            const dateStr = timestamp.toLocaleDateString('pt-BR');
            const timeStr = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            displayEl.textContent = `Última pesagem: ${dateStr} às ${timeStr}`;
            return;
        }
        displayEl.textContent = 'Última pesagem: N/A';
    }

    updateMoagemTab(analysis, config) {
        const totalWeight = analysis ? analysis.totalPesoLiquido : 0;
        const target = parseFloat(localStorage.getItem('metaMoagem') || '0'); 
        const percent = target > 0 ? Math.min((totalWeight / target) * 100, 100).toFixed(0) : 0;
        
        const moagemAcumulado = document.getElementById('moagemAcumulado');
        const moagemProgressBar = document.getElementById('moagemProgressBar');
        const moagemPerc = document.getElementById('moagemPerc');

        if(moagemAcumulado) moagemAcumulado.textContent = Utils.formatNumber(totalWeight) + " t";
        if(moagemProgressBar) moagemProgressBar.style.width = percent + "%";
        if(moagemPerc) moagemPerc.textContent = percent + "%";
        
        if(this.kpisRenderer) this.kpisRenderer.updateOwnerDistributionBar(analysis);
        
        // --- PROJEÇÃO ---
        const projection = analysis.projecaoMoagem || { forecast: 0, status: 'Calculando...' };
        const moagemForecastEl = document.getElementById('moagemForecast');
        const moagemStatusEl = document.getElementById('moagemStatus');
        
        if (moagemForecastEl) {
            moagemForecastEl.textContent = Utils.formatNumber(projection.forecast) + " t";
            moagemForecastEl.style.color = projection.status.includes('Bateu') ? this.baseColors.success : this.baseColors.danger;
        }
        
        if (moagemStatusEl) {
            const diffTons = Math.abs(projection.forecastDifference || 0);
            const diffPerc = target > 0 ? (diffTons / target * 100).toFixed(1) : "0.0";
            let statusHTML = `<div style="line-height: 1.2;">${projection.status}</div>`;
            if (!projection.status.includes('Consolidado') && target > 0) {
                statusHTML += `<div style="font-size: 0.85em; opacity: 0.9; margin-top: 4px; font-weight: normal;">${diffPerc}% (${Utils.formatNumber(diffTons)} t)</div>`;
            }
            moagemStatusEl.innerHTML = statusHTML;
            let statusClass = 'forecast-badge warning';
            if (projection.status.includes('Consolidado') || projection.status.includes('Bateu')) statusClass = 'forecast-badge success';
            else if (projection.status.includes('Abaixo')) statusClass = 'forecast-badge danger';
            moagemStatusEl.className = statusClass;
        }

        // --- GRÁFICOS DO CARROSSEL ---
        if (this.chartsMoagemRenderer) {
            const hourlyData = analysis.analise24h || []; 
            const realLabels = hourlyData.map(d => d.time); 
            const moagemReal = hourlyData.map(d => d.peso); 
            const metaDinamicaFull = analysis.requiredHourlyRates || realLabels.map(() => 0); 

            // Processa potencial se disponível
            let potData = { labels: [], potencial: [], rotacao: [] };
            if (this.chartsMoagemRenderer._processPotentialByHour) {
                potData = this.chartsMoagemRenderer._processPotentialByHour(analysis.potentialRawData);
            }
            
            const sparseMeta = potData.labels.map(label => {
                const index = realLabels.indexOf(label);
                return index !== -1 ? metaDinamicaFull[index] : 0;
            });

            this.chartsMoagemRenderer.createRealHourlyChart(realLabels, moagemReal, metaDinamicaFull, config);
            this.chartsMoagemRenderer.createPotencialHourlyChart(potData.labels, potData.potencial, sparseMeta, config);
            this.chartsMoagemRenderer.createRotacaoHourlyChart(potData.labels, potData.rotacao, config); 
        }

        if (this.gridRenderer) {
            this.gridRenderer.renderFleetAndAvailabilityCards(analysis.potentialRawData, analysis);
        }
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
                    });
                }
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels.color = theme.fontColor;
                }
                chart.update('none');
            }
        });
    }
}

// Garante a exportação global
if (typeof window !== 'undefined') {
    window.DataVisualizer = DataVisualizer;
    console.log("✅ DataVisualizer registrado no window com sucesso.");
}