// visualizer-kpis.js - Renderização de KPIs do Cabeçalho e Listas Top 5 (VERSÃO FINAL CORRIGIDA)

if (typeof VisualizerKPIs === 'undefined') {
    class VisualizerKPIs {

        constructor(visualizer) {
            // Inicializa o módulo VisualizerMetas se existir
            if (typeof VisualizerMetas !== 'undefined') {
                this.metasRenderer = new VisualizerMetas(visualizer);
            }

            this.visualizer = visualizer;
            this.baseColors = visualizer.baseColors;
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

        /**
         * Atualiza os cards principais do topo (Acumulado Safra, Viagens, Análises)
         */
        updateHeaderStats(analysis) {
            if (!analysis) return;

            // 1. ATUALIZAÇÃO DO NOVO CARD: ACUMULADO SAFRA
            const acumuladoSafra = analysis.acumuladoSafra || 0;
            const elAcumuladoSafra = document.getElementById('acumuladoSafra');
            
            if (elAcumuladoSafra) {
                const valorFormatado = typeof Utils !== 'undefined' && Utils.formatNumber 
                    ? Utils.formatNumber(acumuladoSafra) 
                    : acumuladoSafra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                
                elAcumuladoSafra.textContent = valorFormatado + ' ton';
                
                const card = document.getElementById('cardAcumuladoSafra');
                if (card) {
                    card.style.borderLeft = `4px solid ${this.baseColors.success}`;
                }
            }

            // 2. ATUALIZAÇÃO DE VIAGENS
            const totalViagens = analysis.totalViagens || 0;
            const viagensProprias = analysis.viagensProprias || 0;
            const viagensTerceiros = analysis.viagensTerceiros || 0;

            const elTotalViagens = document.getElementById('totalViagens');
            if (elTotalViagens) elTotalViagens.textContent = totalViagens;

            const elViagensProprias = document.getElementById('viagensProprias');
            if (elViagensProprias) elViagensProprias.textContent = viagensProprias;

            const elViagensTerceiros = document.getElementById('viagensTerceiros');
            if (elViagensTerceiros) elViagensTerceiros.textContent = viagensTerceiros;

            // 3. ATUALIZAÇÃO DE TAXA DE ANÁLISE
            const taxaAnalise = analysis.taxaAnalise || 0;
            const elTaxaAnalise = document.getElementById('taxaAnalise');
            
            if (elTaxaAnalise) {
                elTaxaAnalise.textContent = Math.round(taxaAnalise) + '%';
                elTaxaAnalise.style.color = taxaAnalise < 30 ? this.baseColors.danger : this.baseColors.success;
            }
            
            const analiseStat = document.getElementById('statAnalise');
            if(analiseStat) {
                if (taxaAnalise >= 30) {
                    analiseStat.style.borderLeft = `4px solid ${this.baseColors.success}`;
                } else if (taxaAnalise >= 25) {
                    analiseStat.style.borderLeft = `4px solid ${this.baseColors.warning}`;
                } else {
                    analiseStat.style.borderLeft = `4px solid ${this.baseColors.danger}`;
                }
            }
        }

        /**
         * Atualiza todas as listas de "Top 5"
         */
        updateTopLists(analysis) {
            if (!analysis) return;

            // Top Frotas (Peso/Volume)
            this._populateRankingSimplified('topFrotasProprias', analysis.topFrotasProprias, 'toneladas', true);
            this._populateRankingSimplified('topFrotasTerceiros', analysis.topFrotasTerceiros, 'toneladas', true);
            
            // Colheita (Equipamentos)
            this._populateRankingSimplified('topEquipamentosProprios', analysis.topEquipamentosProprios, 'toneladas', false);
            this._populateRankingSimplified('topEquipamentosTerceiros', analysis.topEquipamentosTerceiros, 'toneladas', false);
            
            // Outros
            this._populateRankingSimplified('topTransbordos', analysis.topTransbordos, 'toneladas', false);
            this._populateOperadores('topOperadoresColheitaPropria', analysis.topOperadoresColheitaPropria);
            
            // Metas
            if (this.metasRenderer && analysis.metaData) {
                this.metasRenderer.updateMetasGrid(analysis.metaData);
            }
        }

        /**
         * Método central para renderizar listas de rankings simplificados
         */
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

                const peso = item.value || item.peso || 0; // Correção: aceita .value ou .peso
                const safeCodigo = this._safeHTML(item.name || item.codigo);
                
                let secondaryMetricHTML = '';

                if (showDensity) {
                    const densidadeDisplay = (item.distMedia || item.densidadeMedia || 0).toFixed(2); // distMedia é usado como densidade em alguns contextos do ranking module
                    const kmDisplay = (item.distMedia || 0).toFixed(1);
                    
                    // Ajuste conforme o que vem do DataAnalyzerRankings (lá usa distMedia)
                    secondaryMetricHTML = `
                        <div style="font-size:0.8em; font-weight: 500; color: var(--text-secondary); display: flex; flex-direction: column; align-items: flex-start;">
                            <span style="font-weight: 600;">Dist. Média: ${kmDisplay} km</span>
                        </div>
                    `;
                } else {
                    // Se tiver frente, mostra
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

        /**
         * Método específico para operadores
         */
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
        
        /**
         * Renderiza o gráfico de barra de distribuição PROPRIA vs FORNECEDOR.
         */
        updateOwnerDistributionBar(analysis) {
            const data = analysis.ownerTypeData || {};
            const container = document.getElementById('ownerDistributionBarContainer');
            
            if (!container) return;

            const propriaTons = data.propria || 0;
            const fornecedorTons = data.fornecedor || 0;
            const total = data.total || 0;
            const propriaPercent = data.propriaPercent || 0;
            const fornecedorPercent = data.fornecedorPercent || 0;
            
            if (total === 0) {
                container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">Sem dados de Tipo Proprietário (F.A.).</p>`;
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
            
            // Adiciona a barra de progresso do acumulado do dia
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