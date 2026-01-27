// visualizer-grid.js - Renderização de Grids (Frentes, Status Frota)
class VisualizerGrid {

    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
        this.getThemeConfig = visualizer.getThemeConfig.bind(visualizer);
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

    updateFrontsGrid(frentes) {
        const grid = document.getElementById('frontsGrid'); 
        if(!grid) return;
        grid.innerHTML = ''; 
        
        if (!frentes || frentes.length === 0) { 
            grid.innerHTML = `<div style="text-align: center; padding: 20px;">Nenhuma frente encontrada.</div>`; 
            return; 
        }
        
        const tierSize = Math.ceil(frentes.length / 3);
        const colors = this.getThemeConfig();

        frentes.forEach((frente, index) => {
            let statusClass = frente.status || 'active';
            const isConflict = frente.isLibConflict || frente.isHarvConflict;
            let rankColor = isConflict ? colors.danger : (index < tierSize ? colors.tier1 : (index < tierSize * 2 ? colors.tier3 : colors.tier4));
            
            const card = document.createElement('div');
            card.className = `front-card ${isConflict ? 'critical' : statusClass}`;
            card.style.setProperty('--rank-color', rankColor);
            
            let harvesterDetailHTML = '';
            frente.harvesterContribution.forEach((h, hIndex) => {
                const color = h.propriedade === 'Própria' ? this.baseColors.proprio : this.baseColors.terceiro;
                const hColor = frente.isHarvConflict ? this.baseColors.danger : color;

                harvesterDetailHTML += `
                    <div class="harvester-detail-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 2px 0;">
                        <span style="font-weight: 600; color: ${hColor};">C${hIndex + 1} - ${this._safeHTML(h.codigo)}</span>
                        <span>${h.percent}%</span>
                        <span style="font-weight: 700;">${Utils.formatNumber(h.peso)}t</span>
                    </div>
                `;
            });
            
            if (harvesterDetailHTML) {
                harvesterDetailHTML = `<div style="margin-top: 1rem; padding-top: 10px; border-top: 1px solid var(--glass-border);">
                    <div style="font-weight: 600; margin-bottom: 5px; color: var(--primary); font-size: 0.9rem;">Contribuição das Colhedoras:</div>
                    ${harvesterDetailHTML}
                </div>`;
            }

            const libStatusColor = frente.isLibConflict ? this.baseColors.danger : this.baseColors.primary;
            
            // 1. Tenta extrair o código da Fazenda da Liberação (Ex: 243301002 -> 243301)
            const liberacaoStr = String(frente.liberacao);
            const codFazendaSource = liberacaoStr.length >= 6 ? liberacaoStr.slice(0, 6) : 'N/A';

            // 2. O campo frente.codFazenda, que está vindo com a descrição, é usado para a Desc. Faz.
            const finalCodFazDisplay = this._safeHTML(codFazendaSource); 
            const finalDescFazDisplay = this._safeHTML(frente.codFazenda); 

            // --- LÓGICA DE COR PARA DENSIDADE ---
            const produtividade = parseFloat(frente.produtividade);
            let densidadeColor = colors.success; 
            if (produtividade < 65) {
                densidadeColor = colors.danger;
            }
            // --- FIM LÓGICA DE COR PARA DENSIDADE ---

            // --- LÓGICA DA BARRA DE PROGRESSO (NOVO) ---
            const metaTotal = frente.potencialTotal || 0;
            let progressHTML = '';

            if (metaTotal > 0) {
                const percent = (frente.pesoTotal / metaTotal) * 100;
                const percentDisplay = percent.toFixed(1);
                const width = Math.min(percent, 100); // Trava visualmente em 100%
                
                // Cores Dinâmicas: Vermelho -> Amarelo -> Azul -> Verde
                let barColor = '#FF2E63'; // Vermelho (< 30%)
                if (percent >= 98) barColor = '#40800c'; // Verde (Concluído)
                else if (percent >= 70) barColor = '#00D4FF'; // Azul (Reta final)
                else if (percent >= 30) barColor = '#FFB800'; // Amarelo (Meio termo)

                progressHTML = `
                    <div class="front-progress-container" style="margin-top: 12px; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: var(--text-secondary); margin-bottom: 4px;">
                            <span>Progresso Colheita</span>
                            <span style="color: ${barColor}; font-weight: bold;">${percentDisplay}%</span>
                        </div>
                        <div style="width: 100%; background: rgba(255, 255, 255, 0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${width}%; background-color: ${barColor}; height: 100%; transition: width 0.5s ease;"></div>
                        </div>
                        <div style="text-align: right; font-size: 0.75em; color: var(--text-secondary); margin-top: 2px;">
                            Meta: ${typeof Utils !== 'undefined' ? Utils.formatNumber(metaTotal) : metaTotal.toLocaleString()} t
                        </div>
                    </div>
                `;
            } else {
                // Se não tiver meta definida, mostra apenas um separador sutil
                progressHTML = `<div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);"></div>`;
            }
            // ---------------------------------------------
            
            const statsHTML = `
                <span style="font-size: 1.1em; font-weight: 700; color: ${frente.status === 'critical' ? colors.danger : colors.success};">
                    ${this._safeHTML(frente.statusText)}
                </span>
                <br>
                <span style="font-weight: 600; color: var(--text);">${this._safeHTML(frente.variedade || 'N/A')}</span>
                <br>
                <span style="font-weight: 700; color: var(--text);">${frente.viagens}</span>
                <span style="color: var(--text-secondary);">Viagens</span>
                <br>
                <span style="font-weight: 700; color: var(--text);">${Utils.formatNumber(frente.pesoTotal)}</span>
                <span style="color: var(--text-secondary);">Toneladas</span>
                <br>
                <span style="font-weight: 700; color: ${densidadeColor};">${Utils.formatNumber(frente.produtividade)}</span>
                <span style="color: var(--text-secondary);">Densidade</span>
                <br>
                <span style="color: var(--text-secondary);">Análises:</span>
                <span style="color: var(--success); font-weight: 700;">${frente.taxaAnalise}%</span>
                <span style="color: var(--text-secondary);">(${frente.analisadas}/${frente.viagens})</span>
                <br>
                <span style="color: var(--text-secondary);">Lib:</span>
                <span style="color: ${libStatusColor}; font-weight: 700;">${this._safeHTML(frente.liberacao)}</span>
                <br>
                <span style="color: var(--text-secondary);">Cod Faz:</span>
                <span style="color: var(--text); font-weight: 700;">${finalCodFazDisplay}</span>
                <br>
                <span style="color: var(--text-secondary);">Desc Faz:</span>
                <span style="color: var(--text); font-weight: 700;">${finalDescFazDisplay}</span>
            `;


            card.innerHTML = `
                <div class="snake-border top"></div>
                <div class="snake-border right"></div>
                <div class="snake-border bottom"></div>
                <div class="snake-border left"></div>
                <div class="card-content-wrapper">
                    <div class="front-header-centered">
                        <div class="front-title-large">Frente ${this._safeHTML(frente.codFrente)}</div>
                    </div>
                    
                    <div style="text-align: left; margin-top: 0.5rem; font-size: 0.9rem; color: var(--text); line-height: 1.6;">
                        ${statsHTML}
                    </div>

                    ${progressHTML} ${harvesterDetailHTML} 
                </div>
            `;
            grid.appendChild(card);
        });
    }

    /**
     * Retorna a linha do potencial que corresponde à hora atual (ou a hora mais próxima anterior).
     */
    _getCurrentHourData(rawData) {
        if (!rawData || rawData.length === 0) return null;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const currentMinutesOfDay = currentHour * 60 + currentMinute;

        let bestMatch = null;
        let minDiff = Infinity;

        const HORA_KEY = 'HORA';

        for (const row of rawData) {
            const horaStr = row[HORA_KEY];
            
            if (typeof horaStr !== 'string' || !horaStr) continue;

            const parts = horaStr.split(':');
            if (parts.length < 2) continue;
            
            let dataHour = parseInt(parts[0]);
            let dataMinute = parseInt(parts[1]);
            
            if (isNaN(dataHour) || isNaN(dataMinute)) continue;

            let dataMinutesOfDay = dataHour * 60 + dataMinute;
            
            let diff = currentMinutesOfDay - dataMinutesOfDay;

            if (diff < 0) {
                continue; 
            }
            
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = row;
            }
        }
        
        if (!bestMatch) {
            return rawData[rawData.length - 1];
        }

        return bestMatch;
    }


    /**
     * Renderiza o Status da Frota.
     */
    renderFleetAndAvailabilityCards(rawData, analysis) {
        const gridFrota = document.getElementById('fleetStatusCardsGrid');

        if (!gridFrota || !rawData || rawData.length === 0) {
            if (gridFrota) gridFrota.innerHTML = `<p class="text-secondary" style="text-align: center;">Aguardando dados.</p>`;
            return;
        }

        const lastRow = this._getCurrentHourData(rawData);
        
        if (!lastRow || Object.keys(lastRow).length === 0) {
            if (gridFrota) gridFrota.innerHTML = `<p class="text-secondary" style="text-align: center;">Dados de status da frota da hora atual não encontrados.</p>`;
            return;
        }
        
        // CORREÇÃO: Usando Math.round para garantir que os valores sejam inteiros
        const parados = Math.round(lastRow['Caminhões  PARADO'] || 0); 
        const ida = Math.round(lastRow['Caminhões  Ida'] || 0);
        const campo = Math.round(lastRow['Caminhões  Campo'] || 0);
        const volta = Math.round(lastRow['Caminhões  Volta'] || 0);
        const descarga = Math.round(lastRow['Caminhões  Descarga'] || 0);
        const filaExterna = Math.round(lastRow['Caminhões Fila externa'] || 0);
        const carretasCarregadas = Math.round(lastRow['CARRETAS CARREGADAS'] || 0);
        
        const totalFrotaMovel = parados + ida + campo + volta + descarga + filaExterna;

        const cardData = [
            { title: 'Parados', icon: 'fa-stop-circle', value: parados, color: 'var(--danger)' },
            { title: 'Ida', icon: 'fa-sign-in-alt', value: ida, color: 'var(--warning)' },
            { title: 'Campo', icon: 'fa-warehouse', value: campo, color: 'var(--primary)' }, 
            { title: 'Volta', icon: 'fa-sign-out-alt', value: volta, color: 'var(--secondary)' },
            { title: 'Descarga', icon: 'fa-truck-loading', value: descarga, color: 'var(--success)' }, 
            { title: 'Fila Externa', icon: 'fa-ellipsis-h', value: filaExterna, color: 'var(--accent)' },
            { title: 'Carretas Carregadas', icon: 'fa-box', value: carretasCarregadas, color: 'var(--proprio-color)' },
        ];
        
        // O valor 'frotaMotrizDistinta' é mais preciso se disponível, senão usa o calculado a partir do Potencial.
        const frotaTotalDisplay = analysis.frotaMotrizDistinta || totalFrotaMovel;

        let htmlFrota = `
            <div class="status-item card total-fleet-card" style="border-left: 5px solid var(--primary); background: rgba(0, 212, 255, 0.1);">
                <i class="fas fa-balance-scale" style="color: var(--primary); font-size: 1.6rem;"></i>
                <span class="value" style="font-weight: bold; font-size: 1.4rem;">${Utils.formatWeight(frotaTotalDisplay)}</span>
                <span class="label text-secondary" style="font-size: 0.75rem;">Frota Móvel Total</span>
            </div>
        `;

        cardData.forEach(item => {
            // CORREÇÃO: Usa Math.round(item.value) para garantir que seja um número inteiro antes de converter para string simples.
            const formattedValue = String(Math.round(item.value)); 
            const cardColor = item.color;
            
            htmlFrota += `
                <div class="status-item card" style="border-left: 5px solid ${cardColor};">
                    <i class="fas ${item.icon}" style="color: ${cardColor}; font-size: 1.3rem;"></i>
                    <span class="value" style="font-weight: bold; font-size: 1.2rem;">${formattedValue}</span>
                    <span class="label text-secondary" style="font-size: 0.7rem;">${item.title}</span>
                </div>
            `;
        });
        
        gridFrota.innerHTML = htmlFrota;
    }
}
if (typeof VisualizerGrid === 'undefined') {
    window.VisualizerGrid = VisualizerGrid;
}