// visualizer-charts-base.js - Gráficos de Base (Rosca, Empilhado HxH e Linha HxH)
class VisualizerChartsBase {
    
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
    }

    _drawCenterText(chart, text) {
        const ctx = chart.ctx; 
        ctx.restore();
        const fontSize = (chart.height / 300).toFixed(2); 
        ctx.font = "bold " + fontSize + "em sans-serif"; 
        ctx.textBaseline = "middle"; 
        ctx.fillStyle = this.visualizer.getThemeConfig().fontColor;
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
            if (hour >= 6 && hour <= 23) return hour - 6; // 06:00 -> 0, 23:00 -> 17
            if (hour >= 0 && hour <= 5) return hour + 18; // 00:00 -> 18, 05:00 -> 23
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
        const ctx = document.getElementById('fleetChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.fleetChart) this.visualizer.charts.fleetChart.destroy();
        const total = (fleetData?.propria || 0) + (fleetData?.terceiros || 0);
        const propria = Math.round(fleetData?.propria || 0);
        const terceiros = Math.round(fleetData?.terceiros || 0);
        const percPropria = total > 0 ? Math.round((propria / total) * 100) : 0;
        const percTerceiros = total > 0 ? Math.round((terceiros / total) * 100) : 0;
        
        this.visualizer.charts.fleetChart = new Chart(ctx, {
            type: 'doughnut', 
            data: { 
                labels: [`Própria ${percPropria}%`, `Terceiros ${percTerceiros}%`], 
                datasets: [{ 
                    data: [propria, terceiros], 
                    backgroundColor: [config.proprio, config.terceiro], 
                    borderColor: config.cardColor, 
                    borderWidth: 3, 
                    hoverOffset: 10 
                }] 
            },
            plugins: [{ 
                id: 'centerText', 
                beforeDraw: (chart) => this._drawCenterText(chart, Utils.formatNumber(total) + " t") 
            }, ChartDataLabels],
            options: { 
                responsive: true,
                animation: { animateRotate: true, animateScale: false, duration: 1000 },
                maintainAspectRatio: false, 
                cutout: '65%', 
                layout: { padding: 20 }, 
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: config.fontColor, usePointStyle: true, padding: 20, font: { size: 12 } } 
                    }, 
                    datalabels: { 
                        display: (context) => {
                            const value = context.dataset.data[context.dataIndex];
                            const totalData = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (value / totalData) * 100;
                            return percentage > 5;
                        }, 
                        color: '#FFF', 
                        font: { weight: 'bold', size: 14 },
                        formatter: (value, context) => {
                            const totalData = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (value / totalData) * 100;
                            return percentage.toFixed(0) + '%';
                        }
                    } 
                } 
            }
        });
    }

    createHarvestChart(data, config) {
        const ctx = document.getElementById('harvestChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.harvestChart) this.visualizer.charts.harvestChart.destroy();
        const total = (data?.propria || 0) + (data?.terceiros || 0);
        const propria = Math.round(data?.propria || 0);
        const terceiros = Math.round(data?.terceiros || 0);
        const percPropria = total > 0 ? Math.round((propria / total) * 100) : 0;
        const percTerceiros = total > 0 ? Math.round((terceiros / total) * 100) : 0; 
        
        this.visualizer.charts.harvestChart = new Chart(ctx, {
            type: 'doughnut', 
            data: { 
                labels: [`Própria ${percPropria}%`, `Terceiros ${percTerceiros}%`], 
                datasets: [{ 
                    data: [propria, terceiros], 
                    backgroundColor: [config.proprio, config.terceiro], 
                    borderColor: config.cardColor,
                    borderWidth: 3, 
                    hoverOffset: 10 
                }] 
            },
            plugins: [{ 
                id: 'centerText', 
                beforeDraw: (chart) => this._drawCenterText(chart, Utils.formatNumber(total) + " t") 
            }, ChartDataLabels],
            options: { 
                responsive: true,
                animation: { animateRotate: true, animateScale: false, duration: 1000 },
                maintainAspectRatio: false, 
                cutout: '65%', 
                layout: { padding: 20 }, 
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: config.fontColor, usePointStyle: true, padding: 20, font: { size: 12 } } 
                    }, 
                    datalabels: { 
                        display: (context) => {
                            const value = context.dataset.data[context.dataIndex];
                            const totalData = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (value / totalData) * 100;
                            return percentage > 5;
                        }, 
                        color: '#FFF', 
                        font: { weight: 'bold', size: 14 },
                        formatter: (value, context) => {
                            const totalData = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (value / totalData) * 100;
                            return percentage.toFixed(0) + '%';
                        }
                    }
                } 
            }
        });
    }

    /**
     * CRÍTICO: Gráfico Horário de Entrega (Caminhões) com Total Acumulado.
     */
    createFleetHourlyChart(fleetHourlyData, config) {
        const ctx = document.getElementById('fleetHourlyChartInCaminhoes')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.fleetHourlyChartInCaminhoes) this.visualizer.charts.fleetHourlyChartInCaminhoes.destroy();

        const labels = fleetHourlyData.map(d => d.time);
        
        const rawDatasets = [
            {
                label: 'Própria',
                data: fleetHourlyData.map(d => Math.round(d.propria)),
                backgroundColor: config.proprio,
                borderColor: config.proprio,
                borderWidth: 1,
                stack: 'delivery',
            },
            {
                label: 'Terceiros',
                data: fleetHourlyData.map(d => Math.round(d.terceiros)),
                backgroundColor: config.terceiro,
                borderColor: config.terceiro,
                borderWidth: 1,
                stack: 'delivery',
            }
        ];

        const sorted = this._sortDataAgroTime(labels, rawDatasets);
        
        // CÁLCULO SOMA POR HORA (NÃO ACUMULADO)
        const hourlySums = sorted.datasets[0].data.map((propria, index) => {
            return propria + sorted.datasets[1].data[index];
        });
        
        // Encontra o valor máximo total da barra e adiciona uma margem (20%) para evitar compressão
        const maxTotal = Math.max(...hourlySums, 1);
        const suggestedMax = Math.ceil(maxTotal * 1.20);


        // Dataset de Rótulos (Total DA HORA)
        const totalAccumulatedDataset = {
            label: 'Total por Hora',
            data: hourlySums, // Usa a soma horária, não o acumulado
            type: 'line',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            datalabels: {
                display: (context) => context.parsed && context.parsed.y > 0, // CRÍTICO: Evita TypeError
                align: 'end', 
                anchor: 'end', 
                offset: 5,
                color: config.fontColor,
                font: { weight: 'bold', size: 12 },
                formatter: (value, context) => {
                    // Verificação de segurança: impede o crash se o valor for null/undefined
                    if (!context.parsed || context.parsed.y === null) return '';
                    return Utils.formatWeight(context.parsed.y) + ' t'; 
                }
            }
        };

        const finalDatasets = [...sorted.datasets, totalAccumulatedDataset];

        this.visualizer.charts.fleetHourlyChartInCaminhoes = new Chart(ctx, {
            type: 'bar',
            data: { labels: sorted.labels, datasets: finalDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x', 
                plugins: {
                    legend: { labels: { color: config.fontColor } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const datasetLabel = context.dataset.label || '';
                                const currentValue = context.parsed.y; 
                                return `${datasetLabel}: ${Utils.formatNumber(currentValue)}t`;
                            },
                            title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const item = fleetHourlyData.find(d => d.time === sorted.labels[index]);
                                let nextHour = (parseInt(item.time.split(':')[0]) + 1) % 24;
                                nextHour = String(nextHour).padStart(2, '0');
                                
                                let title = `Hora: ${item.time} - ${nextHour}:00`;
                                if (item.total > 0) {
                                    title += ` | Liderança: ${item.winner}`;
                                }
                                return title;
                            }
                        }
                    },
                    datalabels: { 
                         color: config.labelColor, 
                         font: { weight: 'bold', size: 10 },
                         formatter: (value, context) => {
                            // Rótulos internos (Própria/Terceiros)
                            if (context.dataset.label === 'Total por Hora') return '';
                            
                            const index = context.dataIndex;
                            const item = fleetHourlyData.find(d => d.time === sorted.labels[index]);
                            const isPropria = context.dataset.label === 'Própria';
                            
                            const currentVolume = isPropria ? item.propria : item.terceiros;
                            const totalVolume = item.total;
                            const perc = (currentVolume / totalVolume) * 100;

                            if (parseFloat(perc) < 5) return ''; 
                            
                            return `${Utils.formatNumber(currentVolume).split(',')[0]} t`;
                         },
                         display: (context) => context.dataset.label !== 'Total por Hora' && context.dataset.data[context.dataIndex] > 0, 
                         anchor: 'center', 
                         align: 'center' 
                    }
                },
                scales: {
                    x: { 
                        stacked: true, 
                        grid: { color: config.gridColor },
                        ticks: { color: config.fontColor, maxTicksLimit: 24 }
                    },
                    y: { 
                        stacked: true, 
                        beginAtZero: true, 
                        grid: { color: config.gridColor }, 
                        suggestedMax: suggestedMax, // Corrigindo a compressão no Eixo Y
                        ticks: { color: config.fontColor, callback: v => Math.round(v) }
                    }
                }
            }
        });
    }

    /**
     * NOVO: Cria o gráfico de Entrega Horária (Colheita - Própria vs Terceira).
     */
    createHarvestHourlyChart(harvestHourlyData, config) {
        const ctx = document.getElementById('harvestHourlyChartInEquipamentos')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.harvestHourlyChartInEquipamentos) this.visualizer.charts.harvestHourlyChartInEquipamentos.destroy();

        const labels = harvestHourlyData.map(d => d.time);
        
        const rawDatasets = [
            {
                label: 'Colheita Própria',
                data: harvestHourlyData.map(d => Math.round(d.propria)),
                backgroundColor: config.proprio,
                borderColor: config.proprio,
                borderWidth: 1,
                stack: 'delivery',
            },
            {
                label: 'Colheita Terceira',
                data: harvestHourlyData.map(d => Math.round(d.terceiros)),
                backgroundColor: config.terceiro,
                borderColor: config.terceiro,
                borderWidth: 1,
                stack: 'delivery',
            }
        ];

        const sorted = this._sortDataAgroTime(labels, rawDatasets);
        
        // CÁLCULO SOMA POR HORA (NÃO ACUMULADO)
        const hourlySums = sorted.datasets[0].data.map((propria, index) => {
            return propria + sorted.datasets[1].data[index];
        });
        
        // Encontra o valor máximo total da barra e adiciona uma margem (20%) para evitar compressão
        const maxTotal = Math.max(...hourlySums, 1);
        const suggestedMax = Math.ceil(maxTotal * 1.20);
        
        // Dataset de Rótulos (Total DA HORA)
        const totalAccumulatedDataset = {
            label: 'Total por Hora',
            data: hourlySums,
            type: 'line',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            datalabels: {
                display: (context) => context.parsed && context.parsed.y > 0, // CRÍTICO: Evita TypeError
                align: 'end', 
                anchor: 'end', 
                offset: 5,
                color: config.fontColor,
                font: { weight: 'bold', size: 12 },
                formatter: (value, context) => {
                     // Verificação de segurança: impede o crash se o valor for null/undefined
                    if (!context.parsed || context.parsed.y === null) return '';
                    return Utils.formatWeight(context.parsed.y) + ' t';
                }
            }
        };

        const finalDatasets = [...sorted.datasets, totalAccumulatedDataset];


        this.visualizer.charts.harvestHourlyChartInEquipamentos = new Chart(ctx, {
            type: 'bar',
            data: { labels: sorted.labels, datasets: finalDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x', 
                plugins: {
                    legend: { labels: { color: config.fontColor } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                             label: (context) => {
                                const datasetLabel = context.dataset.label || '';
                                const currentValue = context.parsed.y; 
                                return `${datasetLabel}: ${Utils.formatNumber(currentValue)}t`;
                            },
                             title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const item = harvestHourlyData.find(d => d.time === sorted.labels[index]);
                                let nextHour = (parseInt(item.time.split(':')[0]) + 1) % 24;
                                nextHour = String(nextHour).padStart(2, '0');
                                
                                let title = `Hora: ${item.time} - ${nextHour}:00`;
                                if (item.total > 0) {
                                    title += ` | Liderança: ${item.winner}`;
                                }
                                return title;
                            }
                        }
                    },
                    datalabels: { 
                         color: config.labelColor, 
                         font: { weight: 'bold', size: 10 },
                         formatter: (value, context) => {
                            // Rótulos internos (Própria/Terceiros)
                            if (context.dataset.label === 'Total por Hora') return '';
                            const index = context.dataIndex;
                            const item = harvestHourlyData.find(d => d.time === sorted.labels[index]);
                            const isPropria = context.dataset.label === 'Colheita Própria';
                            
                            const currentVolume = isPropria ? item.propria : item.terceiros;
                            const totalVolume = item.total;
                            const perc = (currentVolume / totalVolume) * 100;

                            if (parseFloat(perc) < 5) return ''; 
                            
                            return `${Utils.formatNumber(currentVolume).split(',')[0]} t`;
                         },
                         display: (context) => context.dataset.label !== 'Total por Hora' && context.dataset.data[context.dataIndex] > 0, 
                         anchor: 'center', 
                         align: 'center' 
                    }
                },
                scales: {
                    x: { 
                        stacked: true, 
                        grid: { color: config.gridColor },
                        ticks: { color: config.fontColor, maxTicksLimit: 24 }
                    },
                    y: { 
                        stacked: true, 
                        beginAtZero: true, 
                        grid: { color: config.gridColor }, 
                        suggestedMax: suggestedMax, // Corrigindo a compressão no Eixo Y
                        ticks: { color: config.fontColor, callback: v => Math.round(v) }
                    }
                }
            }
        });
    }

    createTimeChart(data, config) {
        const ctx = document.getElementById('timeChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.timeChart) this.visualizer.charts.timeChart.destroy();

        const chartData = data && data.length > 0 ? data : Array.from({length: 24}, (_, i) => {
            const hour = (i + 6) % 24;
            return {
                time: `${String(hour).padStart(2, '0')}:00`,
                viagens: 0,
                peso: 0,
                taxaAnalise: 0
            };
        });

        if (chartData.length > 0) {
            
            const rawLabels = chartData.map(d => d.time);
            
            const rawDatasets = [
                { 
                    label: 'Viagens', 
                    data: chartData.map(d => d.viagens), 
                    backgroundColor: config.primary + '33', 
                    borderColor: config.primary, 
                    borderWidth: 2, 
                    fill: true, 
                    tension: 0.4, 
                    yAxisID: 'y' 
                },
                { 
                    label: 'Análise %', 
                    data: chartData.map(d => d.taxaAnalise), 
                    borderColor: config.success, 
                    borderWidth: 2, 
                    fill: false, 
                    tension: 0.4, 
                    yAxisID: 'y1' 
                }
            ];

            const sorted = this._sortDataAgroTime(rawLabels, rawDatasets);

            this.visualizer.charts.timeChart = new Chart(ctx, {
                type: 'line', 
                data: { labels: sorted.labels, datasets: sorted.datasets },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    interaction: { mode: 'index', intersect: false }, 
                    plugins: { 
                        legend: { labels: { color: config.fontColor } }, 
                        datalabels: { display: false } 
                    }, 
                    scales: { 
                        x: { 
                            grid: { color: config.gridColor }, 
                            ticks: { color: config.fontColor, maxTicksLimit: 15 } 
                        }, 
                        y: { 
                            beginAtZero: true,
                            grid: { color: config.gridColor }, 
                            ticks: { color: config.fontColor } 
                        }, 
                        y1: { 
                            display: true, 
                            position: 'right', 
                            max: 100, 
                            grid: { drawOnChartArea: false }, 
                            ticks: { color: config.fontColor } 
                        } 
                    } 
                }
            });
        }
    }

    createFrontHourlyChart(data, config) {
        const ctx = document.getElementById('frontHourlyChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.visualizer.charts.frontHourlyChart) this.visualizer.charts.frontHourlyChart.destroy();
        
        const emptyLabels = Array.from({length: 24}, (_, i) => {
            const hour = (i + 6) % 24;
            return `${String(hour).padStart(2, '0')}:00`;
        });

        const chartData = data && data.datasets && data.datasets.length > 0 ? data : { 
            labels: emptyLabels,
            datasets: []
        };

        const sortedFronts = (chartData.datasets || []).map(d => d.label).sort((a, b) => {
            const aNum = parseInt(a.replace('Frente ', ''), 10);
            const bNum = parseInt(b.replace('Frente ', ''), 10);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
        
        const orderedDatasets = sortedFronts.map(label => {
            return chartData.datasets.find(d => d.label === label);
        }).filter(d => d);

        const sorted = this._sortDataAgroTime(chartData.labels || [], orderedDatasets || []);

        const hourlyTotals = new Array(sorted.labels.length).fill(0);
        sorted.datasets.forEach(ds => {
            ds.data.forEach((val, idx) => {
                hourlyTotals[idx] += (val || 0);
            });
        });

        const totalDataset = {
            label: 'Total',
            data: hourlyTotals.map(v => Math.round(v)),
            type: 'line',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            datalabels: {
                display: true, 
                align: 'end', 
                anchor: 'end', 
                offset: 5, 
                color: config.fontColor,
                font: { weight: 'bold', size: 12 },
                formatter: (value) => value > 0 ? Utils.formatNumber(value) + ' t' : '' 
            }
        };

        const colors = ['#00D4FF', '#7B61FF', '#FF2E63', '#00F5A0', '#FFB800', '#40800c', '#FF8C00'];
        
        const finalDatasets = sorted.datasets.map((d, i) => ({ 
            ...d, 
            data: d.data.map(v => Math.round(v)),
            backgroundColor: colors[i % colors.length] + '80', 
            borderColor: colors[i % colors.length],
            borderWidth: 1, 
            stack: 'Stack 0', 
            datalabels: { 
                display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0, 
                align: 'center', 
                anchor: 'center', 
                color: config.labelColor, 
                font: { weight: 'bold', size: 10 },
                formatter: (value) => value > 0 ? Utils.formatNumber(value) : '' 
            } 
        }));

        finalDatasets.push(totalDataset);

        this.visualizer.charts.frontHourlyChart = new Chart(ctx, {
            type: 'bar', 
            data: { labels: sorted.labels, datasets: finalDatasets },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        labels: { color: config.fontColor }, 
                        filter: i => i.text !== 'Total' 
                    }, 
                    datalabels: { display: true } 
                }, 
                scales: { 
                    x: { 
                        stacked: true, 
                        grid: { color: config.gridColor }, 
                        ticks: { color: config.fontColor, maxTicksLimit: 15 } 
                    }, 
                    y: { 
                        stacked: true, 
                        beginAtZero: true, 
                        grid: { color: config.gridColor }, 
                        ticks: { color: config.fontColor, callback: v => Math.round(v) } 
                    } 
                } 
            }
        });
    }

}
window.VisualizerChartsBase = VisualizerChartsBase;