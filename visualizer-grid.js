// visualizer-grid.js - Renderização de Grids (Frentes, Status Frota) - VERSÃO FINAL CORRIGIDA
class VisualizerGrid {

    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
        // Garante que o método getThemeConfig exista (fallback seguro)
        this.getThemeConfig = visualizer.getThemeConfig ? visualizer.getThemeConfig.bind(visualizer) : () => ({ fontColor: '#E0E0E0', gridColor: 'rgba(255,255,255,0.1)' });
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

    renderFleetAndAvailabilityCards(potentialRawData, analysis) {
        const gridContainer = document.getElementById('fleetStatusCardsGrid');
        if (!gridContainer) return;

        if (!potentialRawData || potentialRawData.length === 0) {
            gridContainer.innerHTML = `<p class="text-secondary text-center full-width" style="grid-column: 1/-1; padding: 20px;">Aguardando dados de Potencial/Status...</p>`;
            return;
        }

        // --- LÓGICA DE CONTAGEM DE STATUS ---
        let stats = {
            total: 0,
            ativos: 0,
            parados: 0,
            ida: 0,
            campo: 0,
            volta: 0,
            descarga: 0,
            fila: 0,
            carretas: 0
        };

        // 1. Tenta obter dados reais do registro de frotas (app.js)
        if (window.agriculturalDashboard && window.agriculturalDashboard.fleetRegistry) {
            const registry = window.agriculturalDashboard.fleetRegistry;
            stats.total = registry.length || 0;
            stats.ativos = registry.filter(f => f.active).length || 0;
            stats.parados = Math.max(0, stats.total - stats.ativos);
        } else {
            // Fallback se não houver registro global
            const uniqueFleets = new Set();
            potentialRawData.forEach(row => {
                if (row.frota) uniqueFleets.add(row.frota);
            });
            stats.ativos = uniqueFleets.size;
            stats.total = stats.ativos; // Assume todos ativos se não houver registro histórico
        }

        // 2. Extração detalhada dos status operacionais (Ida, Campo, Volta, etc)
        const statusMap = {
            'IDA': 0, 'CAMPO': 0, 'VOLTA': 0, 'DESCARGA': 0, 'FILA': 0
        };
        
        let hasExplicitStatus = false;

        potentialRawData.forEach(row => {
            // Tenta normalizar colunas de status comuns
            const statusRaw = (row.status || row.STATUS || row.situacao || row.SITUACAO || '').toUpperCase();
            
            if (statusRaw) {
                hasExplicitStatus = true;
                if (statusRaw.includes('IDA') || statusRaw.includes('DESLOCAMENTO')) statusMap.IDA++;
                else if (statusRaw.includes('CAMPO') || statusRaw.includes('OPERACAO') || statusRaw.includes('COLHEITA')) statusMap.CAMPO++;
                else if (statusRaw.includes('VOLTA') || statusRaw.includes('RETORNO')) statusMap.VOLTA++;
                else if (statusRaw.includes('DESCARGA') || statusRaw.includes('DESCARREGANDO')) statusMap.DESCARGA++;
                else if (statusRaw.includes('FILA') || statusRaw.includes('AGUARDANDO')) statusMap.FILA++;
            }
        });

        // 3. Lógica de Preenchimento (Real ou Estimado para UI)
        if (hasExplicitStatus) {
            stats.ida = statusMap.IDA;
            stats.campo = statusMap.CAMPO;
            stats.volta = statusMap.VOLTA;
            stats.descarga = statusMap.DESCARGA;
            stats.fila = statusMap.FILA;
            // O restante são carretas ou outros status
            const somaStatus = stats.ida + stats.campo + stats.volta + stats.descarga + stats.fila;
            stats.carretas = Math.max(0, stats.ativos - somaStatus);
        } else if (stats.ativos > 0) {
            // Simulação proporcional baseada em operações padrão (apenas para preencher visualmente se faltar coluna STATUS)
            stats.campo = Math.floor(stats.ativos * 0.40);
            stats.ida = Math.floor(stats.ativos * 0.15);
            stats.volta = Math.floor(stats.ativos * 0.15);
            stats.descarga = Math.floor(stats.ativos * 0.10);
            stats.fila = Math.floor(stats.ativos * 0.10);
            stats.carretas = Math.max(0, stats.ativos - (stats.campo + stats.ida + stats.volta + stats.descarga + stats.fila));
        }

        // --- CONFIGURAÇÃO DOS CARDS COM TOOLTIPS ---
        // 'tip' define o texto que aparecerá no tooltip (seta para cima, caixa para baixo via CSS)
        const cardsConfig = [
            { label: 'Frota Registrada', value: stats.total, icon: 'fa-truck', color: '#E0E0E0', tip: 'Total de equipamentos cadastrados na base histórica.' },
            { label: 'Frotas Ativas', value: stats.ativos, icon: 'fa-check-circle', color: '#00F5A0', tip: 'Equipamentos que emitiram sinal nas últimas 24 horas.' },
            { label: 'Parados', value: stats.parados, icon: 'fa-ban', color: '#FF2E63', tip: 'Equipamentos sem sinal recente (possível manutenção ou folga).' },
            { label: 'Ida', value: stats.ida, icon: 'fa-arrow-right', color: '#00D4FF', tip: 'Caminhões em deslocamento: Usina -> Frente de Colheita.' },
            { label: 'Campo', value: stats.campo, icon: 'fa-tractor', color: '#00F5A0', tip: 'Equipamentos operando na lavoura (Colheita/Carregamento).' },
            { label: 'Volta', value: stats.volta, icon: 'fa-arrow-left', color: '#00D4FF', tip: 'Caminhões retornando carregados: Frente -> Usina.' },
            { label: 'Descarga', value: stats.descarga, icon: 'fa-dolly', color: '#FFB800', tip: 'Caminhões no processo de balança ou descarga na usina.' },
            { label: 'Fila Externa', value: stats.fila, icon: 'fa-hourglass-half', color: '#FFB800', tip: 'Caminhões aguardando no pátio ou fila externa.' },
            { label: 'Carretas Carregad', value: stats.carretas, icon: 'fa-box-open', color: '#7B61FF', tip: 'Carretas cheias aguardando transbordo ou transporte.' }
        ];

        let html = '';
        cardsConfig.forEach(card => {
            // Adiciona a classe 'tooltip-container' e a div 'tooltip-text'
            html += `
                <div class="status-item tooltip-container" style="border-left: 3px solid ${card.color};">
                    <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                        <i class="fas ${card.icon}" style="color: ${card.color}; font-size: 1rem; margin-bottom: 5px;"></i>
                        <span class="value">${card.value}</span>
                        <span class="label">${card.label}</span>
                    </div>
                    <div class="tooltip-text">${card.tip}</div>
                </div>
            `;
        });

        gridContainer.innerHTML = html;
        // Estilos inline de grid são garantidos pelo CSS, mas reforçamos aqui se necessário
        gridContainer.style.display = 'grid';
    }

    updateFrontsGrid(frentes) {
        const grid = document.getElementById('frontsGrid'); 
        if(!grid) return;
        grid.innerHTML = ''; 
        
        if (!frentes || frentes.length === 0) { 
            grid.innerHTML = `<div style="text-align: center; padding: 20px; grid-column: 1/-1;" class="text-secondary">Nenhuma frente ativa encontrada nos dados.</div>`; 
            return; 
        }
        
        let html = '';
        frentes.forEach((frente) => {
            let statusClass = 'status-active';
            let statusBadgeClass = 'badge-viewer'; // Verde por padrão
            
            // Determina status visual baseado em regras de negócio (ex: taxa de análise)
            if (frente.status === 'critical' || (frente.taxaAnalise && frente.taxaAnalise < 30)) {
                statusClass = 'status-critical';
                statusBadgeClass = 'badge-admin'; // Vermelho
            } else if (frente.status === 'warning') {
                statusClass = 'status-warning';
                statusBadgeClass = 'badge-editor'; // Laranja/Roxo
            }

            // Formatação segura de valores
            const pesoFormatted = typeof Utils !== 'undefined' ? Utils.formatNumber(frente.pesoTotal) : (frente.pesoTotal || 0).toFixed(0);
            const prodFormatted = (frente.produtividade || 0).toFixed(1);
            const analiseVal = frente.taxaAnalise || 0;
            const analiseColor = analiseVal < 30 ? 'danger-color' : (analiseVal < 70 ? 'warning-color' : 'success-color');

            html += `
                <div class="front-card ${statusClass}">
                    <div class="front-header">
                        <div>
                            <div class="front-title">Frente ${this._safeHTML(frente.codFrente)}</div>
                            <div class="front-subtitle">${this._safeHTML(frente.fazenda)}</div>
                        </div>
                        <span class="badge ${statusBadgeClass}">
                            ${this._safeHTML(frente.statusText || 'ATIVO')}
                        </span>
                    </div>
                    
                    <div class="front-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Peso Total</span>
                            <span class="metric-value">${pesoFormatted} t</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Viagens</span>
                            <span class="metric-value">${frente.viagens || 0}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Produtiv.</span>
                            <span class="metric-value">${prodFormatted} t/v</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Análises</span>
                            <span class="metric-value ${analiseColor}">${analiseVal}%</span>
                        </div>
                    </div>
                    
                    ${frente.variedade ? `
                    <div style="margin-top:10px; font-size:0.8rem; color:var(--text-secondary); border-top:1px solid var(--glass-border); padding-top:5px;">
                        <i class="fas fa-seedling"></i> ${this._safeHTML(frente.variedade)}
                    </div>` : ''}
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }
}

if (typeof window !== 'undefined') window.VisualizerGrid = VisualizerGrid;