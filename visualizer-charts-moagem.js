// visualizer-charts-moagem.js - Gráficos Detalhados do Carrossel (Moagem, Potencial, Rotação)
class VisualizerChartsMoagem {
    
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
    }

    /**
     * Auxiliar CRÍTICO: Ordena os dados no ciclo 06:00 - 05:59.
     */
    _sortAgroTime(labels, datasets) {
        const getAgroOrder = (timeStr) => {
            if (!timeStr) return 99;
            const parts = timeStr.split(':');
            const hour = parseInt(parts[0]);
            
            if (isNaN(hour)) return 99;
            
            // 06:00 -> 0, 07:00 -> 1, ..., 23:00 -> 17
            if (hour >= 6 && hour <= 23) return hour - 6;
            
            // 00:00 -> 18, 01:00 -> 19, ..., 05:00 -> 23
            if (hour >= 0 && hour <= 5) return hour + 18;
            
            return 99;
        };

        const combined = labels.map((label, index) => ({
            label,
            originalIndex: index,
            order: getAgroOrder(label)
        }));

        combined.sort((a, b) => a.order - b.order);

        const newLabels = combined.map(c => c.label);
        const newDatasets = datasets.map(ds => {
            const newData = combined.map(c => ds.data[c.originalIndex]);
            return { ...ds, data: newData };
        });

        return { labels: newLabels, datasets: newDatasets };
    }

    /**
     * Auxiliar: Processa dados de potencial bruto por hora, garantindo listas limpas.
     */
    _processPotentialByHour(rawData) {
        const rawLabels = [];
        const potencial = [];
        const rotacao = [];
        
        const HORA_KEY = 'HORA'; 
        const POTENCIAL_KEY = 'POTENCIAL';
        const ROTACAO_KEY = 'ROTAÇÃO DA MOENDA'; 

        const uniqueHours = new Set();
        
        rawData.forEach(row => {
            const hora = row[HORA_KEY];
            if (hora && !uniqueHours.has(hora)) {
                uniqueHours.add(hora);
                rawLabels.push(hora);
                potencial.push(row[POTENCIAL_KEY] || 0); 
                rotacao.push(row[ROTACAO_KEY] || 0); 
            }
        });

        // CRÍTICO: ORDENA AQUI ANTES DE CRIAR OS GRÁFICOS
        const initialDatasets = [{ data: potencial, label: 'Potencial' }, { data: rotacao, label: 'Rotação' }];
        const sortedData = this._sortAgroTime(rawLabels, initialDatasets);
        
        // Retorna as listas de dados já ordenadas (sem o campo label)
        return { 
            labels: sortedData.labels, 
            potencial: sortedData.datasets[0].data, 
            rotacao: sortedData.datasets[1].data 
        };
    }
    
    /**
     * Auxiliar: Opções Comuns para Gráficos Horários (Base de Moagem)
     */
    _getHourlyChartOptions(config, title, suggestedMin = null, suggestedMax = null) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: config.fontColor, boxWidth: 10 } },
                tooltip: {
                    mode: 'index',
                    callbacks: {
                        label: (context) => {
                            const unit = context.dataset.label.includes('RPM') ? ' RPM' : ' t/h';
                            const value = context.parsed ? context.parsed.y : 0;
                            // Exibe o valor formatado com zero decimal
                            return `${context.dataset.label}: ${Utils.formatNumber(value, 0)}${unit}`;
                        }
                    }
                },
                datalabels: {
                    display: (context) => {
                        const value = context.parsed ? context.parsed.y : 0;
                        return context.dataset.type === 'bar' && value > 0;
                    },
                    color: config.labelColor,
                    font: { weight: 'bold', size: 10 },
                    anchor: 'end',
                    align: 'top',
                    formatter: (value, context) => {
                        const val = context.parsed ? context.parsed.y : 0;
                        // Exibe APENAS o valor inteiro formatado no datalabels
                        return val > 0 ? Utils.formatNumber(val, 0) : '';
                    }
                }
            },
            scales: {
                x: { 
                    grid: { color: config.gridColor },
                    ticks: { color: config.fontColor, maxTicksLimit: 15 } 
                },
                yPeso: { 
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    grid: { color: config.gridColor },
                    title: { display: true, text: title, color: config.fontColor, font: { weight: 'bold' } }, 
                    ticks: { 
                        color: config.fontColor,
                        // CORREÇÃO: Usa Utils.formatNumber(v, 0) para formatar o tick sem decimais, mas com separador de milhar.
                        callback: v => v > 0 ? Utils.formatNumber(v, 0) : ''
                    }
                }
            },
            categoryPercentage: 0.9,
            barPercentage: 0.7,
        };
        
        if (title.includes('RPM')) {
             options.scales.yRPM = {
                type: 'linear',
                position: 'left', 
                suggestedMin: suggestedMin || 800, 
                suggestedMax: suggestedMax || 1300,
                grid: { color: config.gridColor },
                title: { display: true, text: title, color: config.fontColor, font: { weight: 'bold' } },
                ticks: { 
                    color: config.fontColor,
                    callback: v => Math.round(v)
                }
             };
             delete options.scales.yPeso; 
        } else {
             options.scales.yPeso.suggestedMin = suggestedMin;
             options.scales.yPeso.suggestedMax = suggestedMax;
        }

        return options;
    }

    /**
     * Moagem (t/h) - Condição: Abaixo da Meta = VERMELHO, Acima/Igual = AZUL
     */
    createRealHourlyChart(labels, moagemReal, metaDinamica, config) {
        const ctx = document.getElementById('realHourlyChart')?.getContext('2d');
        if (!ctx) return;
        if (this.visualizer.charts.realHourlyChart) this.visualizer.charts.realHourlyChart.destroy();
        
        const datasets = [
            {
                label: 'Real (t/h)',
                data: moagemReal,
                // Lógica de colorização condicional
                backgroundColor: (context) => {
                    const dataIndex = context.dataIndex;
                    const value = context.dataset.data[dataIndex];
                    const metaValue = metaDinamica[dataIndex]; 
                    
                    // Se o valor for abaixo da meta horária, usa VERMELHO
                    if (value < metaValue) {
                        return this.baseColors.danger;
                    }
                    // Caso contrário, usa AZUL (real_moagem_color)
                    return this.baseColors.real_moagem_color;
                },
                type: 'bar',
                order: 2, 
                yAxisID: 'yPeso',
            },
            {
                label: 'Meta Horária',
                data: metaDinamica,
                borderColor: this.baseColors.meta_horaria_color,
                backgroundColor: 'transparent',
                borderWidth: 3,
                type: 'line', 
                fill: false, 
                tension: 0, // MUDANÇA: Linha reta
                pointRadius: 0, // MUDANÇA: Sem pontos
                order: 1,
                yAxisID: 'yPeso',
            }
        ];

        this.visualizer.charts.realHourlyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets },
            options: this._getHourlyChartOptions(config, 'Toneladas (t/h) / Meta', 0)
        });
    }

    /**
     * Potencial (t/h) - REMOVIDO: Meta Horária (sparseMeta)
     */
    createPotencialHourlyChart(labels, potencial, sparseMeta, config) {
        const ctx = document.getElementById('potencialHourlyChart')?.getContext('2d');
        if (!ctx) return;
        if (this.visualizer.charts.potencialHourlyChart) this.visualizer.charts.potencialHourlyChart.destroy();
        
        const datasets = [
            {
                label: 'Potencial (t/h)',
                data: potencial,
                backgroundColor: this.baseColors.potencial_color, 
                type: 'bar',
                order: 2, 
                yAxisID: 'yPeso',
            },
            {
                label: 'Evolução Potencial',
                data: potencial, 
                borderColor: this.baseColors.success, 
                backgroundColor: 'transparent',
                borderWidth: 3,
                type: 'line',
                fill: false,
                tension: 0.4, 
                pointRadius: 4,
                order: 1, 
                yAxisID: 'yPeso',
            }
            // Meta Horária foi removida deste gráfico conforme solicitado.
        ];

        this.visualizer.charts.potencialHourlyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets },
            // Sugerido um maximo para Potencial baseado nos seus dados (655)
            options: this._getHourlyChartOptions(config, 'Potencial (t/h)', 0, 700) 
        });
    }

    /**
     * Rotação (RPM) - Condição: Abaixo da Meta = VERMELHO, Acima/Igual = LARANJA
     */
    createRotacaoHourlyChart(labels, rotacao, config) {
        const ctx = document.getElementById('rotacaoHourlyChart')?.getContext('2d');
        if (!ctx) return;
        if (this.visualizer.charts.rotacaoHourlyChart) this.visualizer.charts.rotacaoHourlyChart.destroy();
        
        const rpmTarget = parseFloat(localStorage.getItem('metaRotacao') || 1100);
        const metaLine = labels.map(() => rpmTarget);
        
        const datasets = [
            {
                label: 'Rotação (RPM)',
                data: rotacao,
                // Lógica de colorização condicional
                backgroundColor: (context) => {
                    const dataIndex = context.dataIndex;
                    const value = context.dataset.data[dataIndex];
                    const metaValue = metaLine[dataIndex];
                    
                    // Se o valor for abaixo da meta, usa VERMELHO
                    if (value < metaValue) {
                        return this.baseColors.danger;
                    }
                    // Caso contrário, usa LARANJA (rotacao_color)
                    return this.baseColors.rotacao_color;
                },
                type: 'bar', 
                order: 2, 
                yAxisID: 'yRPM',
            },
            {
                label: 'Meta Rotação',
                data: metaLine,
                borderColor: this.baseColors.meta_horaria_color,
                backgroundColor: 'transparent',
                borderWidth: 3,
                type: 'line', 
                fill: false, 
                tension: 0, // MANTIDO: Linha reta
                pointRadius: 0, // MANTIDO: Sem pontos
                order: 1, 
                yAxisID: 'yRPM',
            }
        ];

        this.visualizer.charts.rotacaoHourlyChart = new Chart(ctx, {
            type: 'bar', 
            data: { labels: labels, datasets },
             // Sugerido um maximo para Rotação baseado nos seus dados (1280)
            options: this._getHourlyChartOptions(config, 'Rotação (RPM)', 800, 1300) 
        });
    }

}
window.VisualizerChartsMoagem = VisualizerChartsMoagem;