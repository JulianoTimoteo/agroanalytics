// visualizer-grid.js - Renderização de Grids (Frentes, Status Frota) - VERSÃO FINAL CORRIGIDA
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
                        <span style="font-weight: 700;">${typeof Utils !== 'undefined' ? Utils.formatNumber(h.peso) : Math.round(h.peso)}t</span>
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
            
            const liberacaoStr = String(frente.liberacao);
            const codFazendaSource = liberacaoStr.length >= 6 ? liberacaoStr.slice(0, 6) : 'N/A';

            const finalCodFazDisplay = this._safeHTML(codFazendaSource); 
            const finalDescFazDisplay = this._safeHTML(frente.codFazenda); 

            const produtividade = parseFloat(frente.produtividade);
            let densidadeColor = colors.success; 
            if (produtividade < 65) {
                densidadeColor = colors.danger;
            }

            const metaTotal = frente.potencialTotal || 0;
            let progressHTML = '';

            if (metaTotal > 0) {
                const percent = (frente.pesoTotal / metaTotal) * 100;
                const percentDisplay = percent.toFixed(1);
                const width = Math.min(percent, 100); 
                
                let barColor = '#FF2E63'; 
                if (percent >= 98) barColor = '#40800c'; 
                else if (percent >= 70) barColor = '#00D4FF'; 
                else if (percent >= 30) barColor = '#FFB800'; 

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
                progressHTML = `<div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);"></div>`;
            }
            
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
                <span style="font-weight: 700; color: var(--text);">${typeof Utils !== 'undefined' ? Utils.formatNumber(frente.pesoTotal) : Math.round(frente.pesoTotal)}</span>
                <span style="color: var(--text-secondary);">Toneladas</span>
                <br>
                <span style="font-weight: 700; color: ${densidadeColor};">${typeof Utils !== 'undefined' ? Utils.formatNumber(frente.produtividade) : Math.round(frente.produtividade)}</span>
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

    _getCurrentHourData(rawData, analysis) {
        if (!rawData || rawData.length === 0) return null;
        let referenceHour = new Date().getHours();
        if (analysis && analysis.lastExitTimestamp instanceof Date) {
            referenceHour = analysis.lastExitTimestamp.getHours();
        }
        const targetHourStr = String(referenceHour).padStart(2, '0') + ':00';
        const bestMatch = rawData.find(row => {
            const rowHora = String(row.hora || row.HORA || '').trim();
            return rowHora.startsWith(targetHourStr);
        });
        return bestMatch || rawData[rawData.length - 1];
    }

    renderFleetAndAvailabilityCards(potentialData, analysis) {
        // 1. Atualiza os cards de Disponibilidade no topo (Informativo)
        const lastRow = this._getCurrentHourData(potentialData, analysis);
        
        if (lastRow) {
            const dispColh = parseFloat(lastRow.dispColhedora) || 0;
            const dispTrans = parseFloat(lastRow.dispTransbordo) || 0;
            const dispCam = parseFloat(lastRow.dispCaminhoes) || 0;

            const elColh = document.getElementById('dispColhedora');
            const elTrans = document.getElementById('dispTransbordo');
            const elCam = document.getElementById('dispCaminhoes');

            if (elColh) elColh.textContent = dispColh.toFixed(2);
            if (elTrans) elTrans.textContent = dispTrans.toFixed(2);
            if (elCam) elCam.textContent = dispCam.toFixed(2);
        }

        // 2. Renderiza o grid de Status da Frota (Logística)
        const grid = document.getElementById('fleetStatusCardsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!lastRow || Object.keys(lastRow).length === 0) {
            grid.innerHTML = `<p class="text-secondary" style="text-align: center;">Aguardando dados de status.</p>`;
            return;
        }

        const ida = Math.round(lastRow['Caminhões  Ida'] || lastRow.caminhoesIda || 0);
        const campo = Math.round(lastRow['Caminhões  Campo'] || lastRow.caminhoesCampo || 0);
        const volta = Math.round(lastRow['Caminhões  Volta'] || lastRow.caminhoesVolta || 0);
        const descarga = Math.round(lastRow['Caminhões  Descarga'] || lastRow.caminhoesDescarga || 0);
        const filaExterna = Math.round(lastRow['Caminhões Fila externa'] || lastRow.filaExterna || 0);
        const carretasCarregadas = Math.round(lastRow['CARRETAS CARREGADAS'] || lastRow.carretasCarregadas || 0);
        
        const frotasAtivas = ida + campo + volta + descarga + filaExterna;
        let totalRegistered = analysis && analysis.totalRegisteredFleets ? analysis.totalRegisteredFleets : frotasAtivas;
        if (frotasAtivas > totalRegistered) totalRegistered = frotasAtivas;
        const parados = Math.max(0, totalRegistered - frotasAtivas);

        let htmlCards = `
            <div class="status-item card total-fleet-card" style="border-left: 5px solid var(--primary); background: rgba(0, 212, 255, 0.1);">
                <i class="fas fa-layer-group" style="color: var(--primary); font-size: 1.6rem;"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="value" style="font-weight: bold; font-size: 1.4rem;">${totalRegistered}</span>
                    <span class="label text-secondary" style="font-size: 0.75rem;">Frota Registrada</span>
                </div>
            </div>
            <div class="status-item card" style="border-left: 5px solid var(--success);">
                <i class="fas fa-tractor" style="color: var(--success); font-size: 1.3rem;"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="value" style="font-weight: bold; font-size: 1.2rem;">${frotasAtivas}</span>
                    <span class="label text-secondary" style="font-size: 0.7rem;">Frotas Ativas</span>
                </div>
            </div>
            <div class="status-item card" style="border-left: 5px solid var(--danger);">
                <i class="fas fa-stop-circle" style="color: var(--danger); font-size: 1.3rem;"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="value" style="font-weight: bold; font-size: 1.2rem;">${parados}</span>
                    <span class="label text-secondary" style="font-size: 0.7rem;">Parados</span>
                </div>
            </div>
        `;

        const detailCards = [
            { title: 'Ida', icon: 'fa-sign-in-alt', value: ida, color: 'var(--warning)' },
            { title: 'Campo', icon: 'fa-warehouse', value: campo, color: 'var(--primary)' }, 
            { title: 'Volta', icon: 'fa-sign-out-alt', value: volta, color: 'var(--secondary)' },
            { title: 'Descarga', icon: 'fa-truck-loading', value: descarga, color: 'var(--success)' }, 
            { title: 'Fila Externa', icon: 'fa-ellipsis-h', value: filaExterna, color: 'var(--accent)' },
            { title: 'Carretas Carregadas', icon: 'fa-box', value: carretasCarregadas, color: 'var(--proprio-color)' },
        ];

        detailCards.forEach(item => {
            htmlCards += `
                <div class="status-item card" style="border-left: 5px solid ${item.color};">
                    <i class="fas ${item.icon}" style="color: ${item.color}; font-size: 1.3rem;"></i>
                    <span class="value" style="font-weight: bold; font-size: 1.2rem;">${item.value}</span>
                    <span class="label text-secondary" style="font-size: 0.7rem;">${item.title}</span>
                </div>
            `;
        });

        grid.innerHTML = htmlCards;
    }
}

if (typeof window !== 'undefined') window.VisualizerGrid = VisualizerGrid;