// visualizer-charts-base.js - Gráficos de Base (Rosca, Empilhado HxH e Linha HxH) - INTEGRAL E CORRIGIDO
class VisualizerChartsBase {
    
    constructor(visualizer) {
        this.visualizer = visualizer;
        // Fallback de cores caso o orquestrador tenha problemas na inicialização
        this.baseColors = visualizer.baseColors || {
            proprio: '#40800c',
            terceiro: '#FF8C00',
            primary: '#00D4FF'
        };
    }

    _drawCenterText(chart, text) {
        const ctx = chart.ctx; 
        ctx.restore();
        const fontSize = (chart.height / 300).toFixed(2); 
        ctx.font = "bold " + fontSize + "em sans-serif"; 
        ctx.textBaseline = "middle"; 
        
        // Tenta pegar a cor do tema atual de forma segura
        const themeConfig = this.visualizer.getThemeConfig ? this.visualizer.getThemeConfig() : { fontColor: '#888' };
        ctx.fillStyle = themeConfig.fontColor;
        
        const textX = Math.round((chart.width - ctx.measureText(text).width) / 2);
        const textY = chart.height / 2;
        ctx.fillText(text, textX, textY); 
        ctx.save();
    }
    
    _sortDataAgroTime(labels, datasets) {
        const getOrder = (timeStr) => {
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
            order: getOrder(label)
        }));

        combined.sort((a, b) => a.order - b.order);

        const newLabels = combined.map(c => c.label);
        const newDatasets = datasets.map(ds => {
            const newData = combined.map(c => ds.data[c.originalIndex]);
            return { ...ds, data: newData };
        });

        return { labels: newLabels, datasets: newDatasets };
    }

    createFleetChart(fleetData, config) {
        const canvas = document.getElementById('fleetChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (this.visualizer.charts.fleetChart) this.visualizer.charts.fleetChart.destroy();
        
        const propria = Math.round(fleetData?.propria || 0);
        const terceiros = Math.round(fleetData?.terceiros || 0);
        const total = propria + terceiros;
        
        if (total === 0) return;

        const percPropria = Math.round((propria / total) * 100);
        const percTerceiros = Math.round((terceiros / total) * 100);
        
        this.visualizer.charts.fleetChart = new Chart(ctx, {
            type: 'doughnut', 
            data: { 
                labels: [`Própria ${percPropria}%`, `Terceiros ${percTerceiros}%`], 
                datasets: [{ 
                    data: [propria, terceiros], 
                    backgroundColor: [config.proprio || '#40800c', config.terceiro || '#FF8C00'], 
                    borderColor: config.cardColor, 
                    borderWidth: 3, 
                    hoverOffset: 10 
                }] 
            },
            plugins: [{ 
                id: 'centerText', 
                beforeDraw: (chart) => this._drawCenterText(chart, (typeof Utils !== 'undefined' ? Utils.formatNumber(total) : total) + " t") 
            }, ChartDataLabels],
            options: { 
                responsive: true,
                maintainAspectRatio: false, 
                cutout: '65%', 
                layout: { padding: 20 }, 
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: config.fontColor, usePointStyle: true, padding: 20 } 
                    }, 
                    datalabels: { 
                        display: (ctx) => (ctx.dataset.data[ctx.dataIndex] / total) > 0.05, 
                        color: '#FFF', 
                        font: { weight: 'bold', size: 14 },
                        formatter: (value) => Math.round((value / total) * 100) + '%'
                    } 
                } 
            }
        });
    }

    createHarvestChart(data, config) {
        const canvas = document.getElementById('harvestChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (this.visualizer.charts.harvestChart) this.visualizer.charts.harvestChart.destroy();
        
        const propria = Math.round(data?.propria || 0);
        const terceiros = Math.round(data?.terceiros || 0);
        const total = propria + terceiros;

        if (total === 0) return;

        this.visualizer.charts.harvestChart = new Chart(ctx, {
            type: 'pie', 
            data: { 
                labels: [`Própria`, `Terceiros`], 
                datasets: [{ 
                    data: [propria, terceiros], 
                    backgroundColor: [config.proprio || '#40800c', config.terceiro || '#FF8C00'], 
                    borderColor: config.cardColor,
                    borderWidth: 3, 
                    hoverOffset: 10 
                }] 
            },
            plugins: [ChartDataLabels],
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 20 }, 
                plugins: { 
                    legend: { position: 'bottom', labels: { color: config.fontColor, usePointStyle: true, padding: 20 } }, 
                    datalabels: { 
                        color: '#FFF', 
                        font: { weight: 'bold', size: 14 },
                        formatter: (value) => total > 0 ? Math.round((value / total) * 100) + '%' : ''
                    } 
                } 
            }
        });
    }

    createFleetHourlyChart(fleetHourlyData, config) {
        const canvas = document.getElementById('fleetHourlyChartInCaminhoes');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (this.visualizer.charts.fleetHourlyChartInCaminhoes) this.visualizer.charts.fleetHourlyChartInCaminhoes.destroy();

        const labels = fleetHourlyData.map(d => d.time);
        const rawDatasets = [
            {
                label: 'Própria',
                data: fleetHourlyData.map(d => Math.round(d.propria || 0)),
                backgroundColor: config.proprio || '#40800c',
                stack: 'delivery',
            },
            {
                label: 'Terceiros',
                data: fleetHourlyData.map(d => Math.round(d.terceiros || 0)),
                backgroundColor: config.terceiro || '#FF8C00',
                stack: 'delivery',
            }
        ];

        const sorted = this._sortDataAgroTime(labels, rawDatasets);
        const hourlySums = sorted.labels.map((_, i) => sorted.datasets[0].data[i] + sorted.datasets[1].data[i]);

        const totalDataset = {
            label: 'Total',
            data: hourlySums,
            type: 'line',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            datalabels: {
                // BLINDAGEM: Verifica se o ponto existe no Chart.js antes de tentar ler .y
                display: (ctx) => ctx.parsed && ctx.parsed.y > 0,
                align: 'end', anchor: 'end', offset: 5,
                color: config.fontColor,
                font: { weight: 'bold', size: 12 },
                formatter: (value) => value > 0 ? (typeof Utils !== 'undefined' ? Utils.formatNumber(value).split(',')[0] : value) + ' t' : ''
            }
        };

        this.visualizer.charts.fleetHourlyChartInCaminhoes = new Chart(ctx, {
            type: 'bar',
            data: { labels: sorted.labels, datasets: [...sorted.datasets, totalDataset] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: config.fontColor }, filter: i => i.text !== 'Total' },
                    datalabels: { 
                        display: (ctx) => ctx.dataset.label !== 'Total' && ctx.dataset.data[ctx.dataIndex] > 0,
                        color: '#FFF', font: { size: 10, weight: 'bold' }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { color: config.gridColor }, ticks: { color: config.fontColor } },
                    y: { stacked: true, beginAtZero: true, grid: { color: config.gridColor }, ticks: { color: config.fontColor } }
                }
            }
        });
    }

    createTimeChart(hourlyData, config) {
        const canvas = document.getElementById('timeChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (this.visualizer.charts.timeChart) this.visualizer.charts.timeChart.destroy();

        const rawLabels = hourlyData.map(d => d.time);
        const rawDatasets = [
            { 
                label: 'Viagens', 
                data: hourlyData.map(d => d.viagens), 
                backgroundColor: config.primary + '33', 
                borderColor: config.primary, 
                fill: true, tension: 0.4, yAxisID: 'y' 
            },
            { 
                label: 'Análise %', 
                data: hourlyData.map(d => d.taxaAnalise), 
                borderColor: config.success, 
                fill: false, tension: 0.4, yAxisID: 'y1' 
            }
        ];

        const sorted = this._sortDataAgroTime(rawLabels, rawDatasets);

        this.visualizer.charts.timeChart = new Chart(ctx, {
            type: 'line', 
            data: { labels: sorted.labels, datasets: sorted.datasets },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { 
                    legend: { labels: { color: config.fontColor } }, 
                    datalabels: { display: false } 
                }, 
                scales: { 
                    x: { grid: { color: config.gridColor }, ticks: { color: config.fontColor } }, 
                    y: { beginAtZero: true, grid: { color: config.gridColor }, ticks: { color: config.fontColor } }, 
                    y1: { position: 'right', max: 100, grid: { drawOnChartArea: false }, ticks: { color: config.fontColor } } 
                } 
            }
        });
    }

    createFrontHourlyChart(data, config) {
        const canvas = document.getElementById('frontHourlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.visualizer.charts.frontHourlyChart) this.visualizer.charts.frontHourlyChart.destroy();
        
        const sorted = this._sortDataAgroTime(data.labels || [], data.datasets || []);
        const hourlyTotals = new Array(sorted.labels.length).fill(0);
        sorted.datasets.forEach(ds => ds.data.forEach((v, i) => hourlyTotals[i] += (v || 0)));

        const colors = ['#00D4FF', '#7B61FF', '#FF2E63', '#00F5A0', '#FFB800', '#40800c', '#FF8C00'];
        const finalDatasets = sorted.datasets.map((d, i) => ({ 
            ...d, 
            backgroundColor: colors[i % colors.length] + '80', 
            borderColor: colors[i % colors.length],
            stack: 'Stack 0', 
            datalabels: { 
                display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 50, 
                color: '#FFF',
                font: { size: 10, weight: 'bold' }
            } 
        }));

        finalDatasets.push({
            label: 'Total', data: hourlyTotals, type: 'line', borderColor: 'transparent', pointRadius: 0,
            datalabels: { 
                display: (ctx) => ctx.parsed && ctx.parsed.y > 0, 
                align: 'end', anchor: 'end', 
                color: config.fontColor, 
                font: { weight: 'bold' },
                formatter: (val) => Math.round(val) + ' t'
            }
        });

        this.visualizer.charts.frontHourlyChart = new Chart(ctx, {
            type: 'bar', 
            data: { labels: sorted.labels, datasets: finalDatasets },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { 
                    legend: { labels: { color: config.fontColor }, filter: i => i.text !== 'Total' },
                    datalabels: { display: true }
                }, 
                scales: { 
                    x: { stacked: true, grid: { color: config.gridColor }, ticks: { color: config.fontColor } }, 
                    y: { stacked: true, beginAtZero: true, grid: { color: config.gridColor }, ticks: { color: config.fontColor } } 
                } 
            } 
        });
    }
}

if (typeof window !== 'undefined') window.VisualizerChartsBase = VisualizerChartsBase;