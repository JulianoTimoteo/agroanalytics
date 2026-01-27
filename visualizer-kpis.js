// visualizer-kpis.js - VERSÃO FINAL: SEM REDUNDÂNCIA NO BADGE (LIMPEZA TOTAL)

if (typeof VisualizerKPIs === 'undefined') {
    class VisualizerKPIs {

        constructor(visualizer) {
            if (typeof VisualizerMetas !== 'undefined') {
                this.metasRenderer = new VisualizerMetas(visualizer);
            }

            this.visualizer = visualizer;
            this.baseColors = visualizer.baseColors;
            
            // Definição de Cores
            this.COLOR_GREEN = '#40800c';
            this.COLOR_RED = '#FF2E63';
            this.COLOR_BLUE = '#2196F3';
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

        updateHeaderStats(analysis) {
            if (!analysis) return;

            // --- 1. ACUMULADO SAFRA ---
            const acumuladoSafra = analysis.acumuladoSafra || 0;
            const elAcumuladoSafra = document.getElementById('acumuladoSafra');
            
            if (elAcumuladoSafra) {
                const valorFormatado = typeof Utils !== 'undefined' && Utils.formatNumber 
                    ? Utils.formatNumber(acumuladoSafra) 
                    : acumuladoSafra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                
                elAcumuladoSafra.textContent = valorFormatado + ' ton';
                
                const card = document.getElementById('cardAcumuladoSafra');
                if (card) {
                    card.style.borderLeft = `4px solid ${this.COLOR_GREEN}`;
                }
            }

            // --- 2. FROTA (VIAGENS) ---
            const totalViagens = analysis.totalViagens || 0;
            const viagensProprias = analysis.viagensProprias || 0;
            const viagensTerceiros = analysis.viagensTerceiros || 0;

            const elTotalViagens = document.getElementById('totalViagens');
            if (elTotalViagens) {
                elTotalViagens.textContent = totalViagens;
                
                // Regra de Cor da Borda: Própria > Terceiros = Verde, senão Vermelho
                const cardFrota = elTotalViagens.closest('.analytics-card');
                if (cardFrota) {
                    if (viagensProprias > viagensTerceiros) {
                        cardFrota.style.borderLeft = `4px solid ${this.COLOR_GREEN}`;
                    } else {
                        cardFrota.style.borderLeft = `4px solid ${this.COLOR_RED}`;
                    }
                }
            }

            const elViagensProprias = document.getElementById('viagensProprias');
            if (elViagensProprias) elViagensProprias.textContent = viagensProprias;

            const elViagensTerceiros = document.getElementById('viagensTerceiros');
            if (elViagensTerceiros) elViagensTerceiros.textContent = viagensTerceiros;

            // --- 3. TAXA DE ANÁLISE ---
            const taxaAnalise = analysis.taxaAnalise || 0;
            const elTaxaAnalise = document.getElementById('taxaAnalise');
            
            // Regra de Cor: <31% Vermelho, 31-34% Azul, >34% Verde
            let analiseColor = this.COLOR_RED;
            if (taxaAnalise > 34) analiseColor = this.COLOR_GREEN;
            else if (taxaAnalise >= 31) analiseColor = this.COLOR_BLUE;

            if (elTaxaAnalise) {
                elTaxaAnalise.textContent = Math.round(taxaAnalise) + '%';
                elTaxaAnalise.style.color = analiseColor;
            }
            
            const analiseStat = document.getElementById('statAnalise');
            if(analiseStat) {
                analiseStat.style.borderLeft = `4px solid ${analiseColor}`;
            }
        }

        updateTopLists(analysis) {
            if (!analysis) return;

            this._populateRankingSimplified('topFrotasProprias', analysis.topFrotasProprias, 'toneladas', true);
            this._populateRankingSimplified('topFrotasTerceiros', analysis.topFrotasTerceiros, 'toneladas', true);
            this._populateRankingSimplified('topEquipamentosProprios', analysis.topEquipamentosProprios, 'toneladas', false);
            this._populateRankingSimplified('topEquipamentosTerceiros', analysis.topEquipamentosTerceiros, 'toneladas', false);
            this._populateRankingSimplified('topTransbordos', analysis.topTransbordos, 'toneladas', false);
            this._populateOperadores('topOperadoresColheitaPropria', analysis.topOperadoresColheitaPropria);
            
            if (this.metasRenderer && analysis.metaData) {
                this.metasRenderer.updateMetasGrid(analysis.metaData);
            }
        }

        _populateRankingSimplified(id, data, unitLabel, showDensity = false) {
            const list = document.getElementById(id); 
            if(!list) return;
            
            list.innerHTML = '';
            list.style.maxHeight = ''; 
            list.style.overflowY = ''; 
            list.style.overflowX = 'hidden'; 

            if (!data || data.length === 0) { 
                list.innerHTML = `<div class="top-list-item" style="justify-content: center; padding: 12px;">Sem dados.</div>`; 
                return; 
            }

            data.forEach((item, index) => {
                const li = document.createElement('li'); 
                const rankColor = index === 0 ? 'var(--warning)' : 'var(--secondary)';
                li.className = 'top-list-item'; 
                li.style.borderLeft = `4px solid ${rankColor}`;

                const peso = item.value || item.peso || 0;
                const safeCodigo = this._safeHTML(item.name || item.codigo);
                
                let secondaryMetricHTML = '';

                if (showDensity) {
                    const kmDisplay = (item.distMedia || 0).toFixed(1);
                    secondaryMetricHTML = `
                        <div style="font-size:0.8em; font-weight: 500; color: var(--text-secondary); display: flex; flex-direction: column; align-items: flex-start;">
                            <span style="font-weight: 600;">Dist. Média: ${kmDisplay} km</span>
                        </div>
                    `;
                } else {
                    if (item.frente) {
                         const safeFrente = this._safeHTML(item.frente);
                         secondaryMetricHTML = `<span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Fr. ${safeFrente}</span>`;
                    }
                }
                
                li.innerHTML = `
                    <div class="ranking-info-group" style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
                        <span class="item-label item-codigo" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${index + 1}º ${safeCodigo}</span>
                        ${secondaryMetricHTML}
                    </div>
                    <div class="ranking-value-group" style="flex-shrink: 0;">
                        <span class="item-value item-peso" style="font-size:0.9em; color:var(--primary); font-weight: 700; white-space: nowrap;">
                                ${typeof Utils !== 'undefined' ? Utils.formatWeight(peso) : peso.toLocaleString()} t
                        </span>
                    </div>
                `;
                list.appendChild(li);
            });
        }

        _populateOperadores(id, data) {
            const list = document.getElementById(id); 
            if(!list) return;
            
            list.innerHTML = '';
            list.style.maxHeight = '350px'; 
            list.style.overflowY = 'auto'; 
            list.style.overflowX = 'hidden';

            if (!data || data.length === 0) { 
                list.innerHTML = `<div class="top-list-item" style="justify-content: center; overflow: hidden;">Sem dados.</div>`; 
                list.style.overflowY = 'hidden';
                return; 
            }

            data.forEach((item, index) => {
                const li = document.createElement('li'); 
                li.className = 'top-list-item';
                
                const safeFrente = item.frente ? this._safeHTML(item.frente) : 'N/A';
                const safeCodigoCompleto = this._safeHTML(item.name || item.codigo);
                const peso = item.value || item.peso || 0;
                
                li.innerHTML = `
                    <div class="ranking-info-group" style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span class="item-label">${index + 1}º ${safeCodigoCompleto}</span>
                        <span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Frente: ${safeFrente}</span>
                    </div>
                    <div class="ranking-value-group">
                        <span class="item-value">${typeof Utils !== 'undefined' ? Utils.formatWeight(peso) : peso.toLocaleString()} t</span>
                    </div>
                `;
                list.appendChild(li);
            });
        }
        
        updateOwnerDistributionBar(analysis) {
            const container = document.getElementById('ownerDistributionBarContainer');
            
            // Fallback: Se ownerTypeData estiver vazio, usa distribuicaoFrota
            let data = analysis.ownerTypeData || {};
            if (!data.total || data.total === 0) {
                const distFrota = analysis.distribuicaoFrota || { propria: 0, terceiros: 0 };
                const totalFrota = distFrota.propria + distFrota.terceiros;
                if (totalFrota > 0) {
                    data = {
                        propria: distFrota.propria,
                        fornecedor: distFrota.terceiros,
                        total: totalFrota,
                        propriaPercent: (distFrota.propria / totalFrota) * 100,
                        fornecedorPercent: (distFrota.terceiros / totalFrota) * 100
                    };
                }
            }
            
            // --- ATUALIZAÇÃO DA PROJEÇÃO (SEM REDUNDÂNCIA) ---
            const forecastValue = (analysis.projecaoMoagem && analysis.projecaoMoagem.forecast) ? analysis.projecaoMoagem.forecast : 0;
            const metaDiaria = parseFloat(localStorage.getItem('metaMoagem') || '25000');
            const diff = forecastValue - metaDiaria;
            const isAboveMeta = diff >= 0;

            const elForecastVal = document.getElementById('moagemForecast');
            const elStatusBadge = document.getElementById('moagemStatus');
            
            const activeColor = isAboveMeta ? this.COLOR_GREEN : this.COLOR_RED;
            
            // 1. Valor Principal da Previsão
            if (elForecastVal) {
                elForecastVal.textContent = (typeof Utils !== 'undefined' ? Utils.formatNumber(forecastValue) : forecastValue.toLocaleString()) + ' t';
                elForecastVal.style.color = activeColor;
            }
            
            // 2. Remover elemento de diferença (redundante)
            const elDiff = document.getElementById('forecastDifferenceContainer');
            if (elDiff) {
                elDiff.style.display = 'none'; // Oculta completamente a linha redundante
            }
            
            // 3. Badge (STATUS SIMPLES) - Limpa tudo antes de escrever
            if (elStatusBadge) {
                // 🔥 LIMPEZA CRÍTICA: Remove qualquer HTML antigo
                elStatusBadge.innerHTML = '';
                
                if (isAboveMeta) {
                     elStatusBadge.className = 'forecast-badge active';
                     elStatusBadge.style.backgroundColor = 'rgba(64, 128, 12, 0.1)';
                     elStatusBadge.style.color = this.COLOR_GREEN;
                     elStatusBadge.style.border = `1px solid ${this.COLOR_GREEN}`;
                     elStatusBadge.textContent = 'Bater a meta';
                } else {
                     elStatusBadge.className = 'forecast-badge danger';
                     elStatusBadge.style.backgroundColor = 'rgba(255, 46, 99, 0.1)';
                     elStatusBadge.style.color = this.COLOR_RED;
                     elStatusBadge.style.border = `1px solid ${this.COLOR_RED}`;
                     elStatusBadge.textContent = 'Abaixo da meta';
                }
            }
            // --- FIM DA LÓGICA DE PROJEÇÃO ---
            
            if (!container) return;
            
            const propriaTons = data.propria || 0;
            const fornecedorTons = data.fornecedor || 0;
            const total = data.total || 0;
            const propriaPercent = data.propriaPercent || 0;
            const fornecedorPercent = data.fornecedorPercent || 0;
            
            if (total === 0) {
                container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">Aguardando dados...</p>`;
                return;
            }

            const html = `
                <div class="owner-distribution-labels">
                    <span style="color: var(--proprio-color);">
                        ${propriaPercent.toFixed(1)}% (${typeof Utils !== 'undefined' ? Utils.formatNumber(propriaTons) : propriaTons.toLocaleString()} t)
                    </span>
                    <span style="color: var(--terceiro-color);">
                        (${typeof Utils !== 'undefined' ? Utils.formatNumber(fornecedorTons) : fornecedorTons.toLocaleString()} t) ${fornecedorPercent.toFixed(1)}%
                    </span>
                </div>
                <div class="owner-distribution-bar">
                    <div class="owner-segment propria" style="width: ${propriaPercent}%;">
                        ${propriaPercent > 10 ? 'PRÓPRIA' : ''}
                    </div>
                    <div class="owner-segment fornecedor" style="width: ${fornecedorPercent}%;">
                        ${fornecedorPercent > 10 ? 'FORNECEDOR' : ''}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            const acumuladoDiaEl = document.getElementById('acumuladoDiaProgressContainer');
            if (acumuladoDiaEl) {
                 const targetValue = parseFloat(localStorage.getItem('metaMoagem') || '25000');
                 const percentDia = targetValue > 0 ? Math.min((total / targetValue) * 100, 100).toFixed(0) : 0;
                 
                 acumuladoDiaEl.innerHTML = `
                      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 15px;">
                          ${percentDia}% da Meta (${typeof Utils !== 'undefined' ? Utils.formatNumber(targetValue) : targetValue.toLocaleString()} t)
                      </div>
                      <div class="progress-container" style="height: 12px; margin-top: 5px;">
                          <div class="progress-bar" style="width: ${percentDia}%; background: linear-gradient(90deg, var(--proprio-color), var(--terceiro-color));"></div>
                      </div>
                    `;
            }
        }
    }

    window.VisualizerKPIs = VisualizerKPIs;
}