// visualizer-charts-moagem.js - Gráficos Detalhados do Carrossel (Moagem, Potencial, Rotação)
class VisualizerChartsMoagem {
    
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
    }

    /**
     * Auxiliar: Ordena os dados no ciclo Agro (06:00 - 05:59).
     */
    _sortAgroTime(labels, datasets) {
        const getAgroOrder = (timeStr) => {
            if (!timeStr) return 99;
            const parts = timeStr.split(':');
            const hour = parseInt(parts[0]);
            if (isNaN(hour)) return 99;
            if (hour >= 6 && hour <= 23) return hour - 6;
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

    _getHourlyChartOptions(config, yTitle, yMin = null, yMax = null) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000 },
            scales: {
                x: {
                    grid: { color: config.gridColor },
                    ticks: { color: config.fontColor, font: { size: 11 } }
                },
                y: {
                    beginAtZero: yMin === null,
                    min: yMin,
                    max: yMax,
                    grid: { color: config.gridColor },
                    ticks: { color: config.fontColor },
                    title: { display: true, text: yTitle, color: config.fontColor }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: config.fontColor, usePointStyle: true, padding: 15 }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: config.fontColor,
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => value > 0 ? Math.round(value) : '',
                    display: (ctx) => ctx.dataset.type !== 'line' // Não poluir as linhas de meta
                }
            }
        };
    }

    // 🔥 CORREÇÃO: Gráfico de Moagem Real
    createRealHourlyChart(labels, data, metaData, config) {
        const canvas = document.getElementById('realHourlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const rawDatasets = [
            {
                label: 'Moagem Real (t)',
                data: data,
                backgroundColor: this.baseColors.real_moagem_color,
                borderRadius: 4,
                type: 'bar',
                order: 2
            },
            {
                label: 'Meta Dinâmica',
                data: metaData,
                borderColor: this.baseColors.meta_horaria_color,
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                type: 'line',
                order: 1
            }
        ];

        const sorted = this._sortAgroTime(labels, rawDatasets);

        // Destruição de segurança movida para o orquestrador, mas validamos aqui
        if (this.visualizer.charts.realHourlyChart) {
            this.visualizer.charts.realHourlyChart.destroy();
        }

        this.visualizer.charts.realHourlyChart = new Chart(ctx, {
            data: { labels: sorted.labels, datasets: sorted.datasets },
            options: this._getHourlyChartOptions(config, 'Toneladas (t)')
        });
        
        // Força o resize para garantir que apareça no carrossel
        this.visualizer.charts.realHourlyChart.resize();
    }

    // 🔥 CORREÇÃO: Gráfico de Potencial
    createPotencialHourlyChart(labels, data, metaData, config) {
        const canvas = document.getElementById('potencialHourlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const rawDatasets = [
            {
                label: 'Potencial Estimado (t/h)',
                data: data,
                backgroundColor: 'rgba(0, 245, 160, 0.6)',
                borderColor: this.baseColors.potencial_color,
                borderWidth: 2,
                borderRadius: 4,
                type: 'bar',
                order: 2
            },
            {
                label: 'Meta Necessária',
                data: metaData,
                borderColor: this.baseColors.meta_horaria_color,
                borderWidth: 2,
                pointRadius: 4,
                fill: false,
                type: 'line',
                order: 1
            }
        ];

        const sorted = this._sortAgroTime(labels, rawDatasets);

        if (this.visualizer.charts.potencialHourlyChart) {
            this.visualizer.charts.potencialHourlyChart.destroy();
        }

        this.visualizer.charts.potencialHourlyChart = new Chart(ctx, {
            data: { labels: sorted.labels, datasets: sorted.datasets },
            options: this._getHourlyChartOptions(config, 'Capacidade (t/h)')
        });
        
        this.visualizer.charts.potencialHourlyChart.resize();
    }

    // 🔥 CORREÇÃO: Gráfico de Rotação
    createRotacaoHourlyChart(labels, data, config) {
        const canvas = document.getElementById('rotacaoHourlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Busca meta de rotação salva ou usa padrão
        const savedMeta = parseFloat(localStorage.getItem('metaRotacao') || '1100');
        const metaArray = labels.map(() => savedMeta);

        const rawDatasets = [
            {
                label: 'Rotação Real (RPM)',
                data: data,
                backgroundColor: 'rgba(255, 140, 0, 0.6)',
                borderColor: this.baseColors.rotacao_color,
                borderWidth: 2,
                borderRadius: 4,
                type: 'bar',
                order: 2
            },
            {
                label: 'Meta RPM',
                data: metaArray,
                borderColor: this.baseColors.meta_horaria_color,
                borderWidth: 3,
                pointRadius: 0,
                fill: false,
                type: 'line',
                order: 1
            }
        ];

        const sorted = this._sortAgroTime(labels, rawDatasets);

        if (this.visualizer.charts.rotacaoHourlyChart) {
            this.visualizer.charts.rotacaoHourlyChart.destroy();
        }

        this.visualizer.charts.rotacaoHourlyChart = new Chart(ctx, {
            data: { labels: sorted.labels, datasets: sorted.datasets },
            options: this._getHourlyChartOptions(config, 'Rotação (RPM)', 600, 1400)
        });
        
        this.visualizer.charts.rotacaoHourlyChart.resize();
    }

    /**
     * Auxiliar: Processa dados de potencial vindo do analysis para formato de gráfico
     */
    _processPotentialByHour(potentialData) {
        const labels = [];
        const potencial = [];
        const rotacao = [];
        
        if (Array.isArray(potentialData)) {
            potentialData.forEach(item => {
                const hora = item.HORA || item.hora || '00:00';
                labels.push(hora);
                potencial.push(parseFloat(item.POTENCIAL || item.potencial || 0));
                rotacao.push(parseFloat(item.rotacaoMoenda || item['ROTAÇÃO DA MOENDA'] || 0));
            });
        }

        return { labels, potencial, rotacao };
    }
}

// Registro global
window.VisualizerChartsMoagem = VisualizerChartsMoagem;