// visualizer-kpis.js - Renderização de KPIs do Cabeçalho e Listas Top 5
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

    updateHeaderStats(analysis) {
        const totalViagens = analysis.totalViagens || 0;
        const viagensProprias = analysis.viagensProprias || 0;
        const viagensTerceiros = analysis.viagensTerceiros || 0;
        const pesoTotal = analysis.totalPesoLiquido || 0;
        
        const pesoPropria = analysis.distribuicaoFrota?.propria || 0;
        const pesoTerceiro = analysis.distribuicaoFrota?.terceiros || 0;
        const totalPesoDist = pesoPropria + pesoTerceiro;
        
        let percPropria = 0;
        let percTerceiros = 0;
        
        if (totalPesoDist > 0) {
            percPropria = Math.round((pesoPropria / totalPesoDist) * 100);
            percTerceiros = Math.round((pesoTerceiro / totalPesoDist) * 100);
        }
        
        const winnerColor = pesoPropria >= pesoTerceiro ? this.baseColors.proprio : this.baseColors.terceiro;

        const elViagens = document.getElementById('totalViagens');
        if (elViagens) {
            elViagens.textContent = totalViagens;
            const card = document.getElementById('cardViagens') || elViagens.closest('.stat-card-mini');
            if (card) {
                card.style.borderLeft = `4px solid ${winnerColor}`;
            }
        }

        const elPeso = document.getElementById('totalPesoLiquido');
        if (elPeso) {
            elPeso.textContent = Utils.formatNumber(pesoTotal) + ' ton';
            const card = document.getElementById('cardPeso') || elPeso.closest('.stat-card-mini');
            if (card) {
                card.style.borderLeft = `4px solid ${winnerColor}`;
            }
        }

        const elViagensProprias = document.getElementById('viagensProprias');
        if (elViagensProprias) elViagensProprias.textContent = viagensProprias;

        const elViagensTerceiros = document.getElementById('viagensTerceiros');
        if (elViagensTerceiros) elViagensTerceiros.textContent = viagensTerceiros;
        
        const elPercPropria = document.getElementById('percPropria');
        if (elPercPropria) elPercPropria.textContent = `${percPropria}%`;

        const elPercTerceiros = document.getElementById('percTerceiros');
        if (elPercTerceiros) elPercTerceiros.textContent = `${percTerceiros}%`;
        
        const txAnalise = parseFloat(analysis.taxaAnalise || 0);
        const elTaxaAnalise = document.getElementById('taxaAnalise');
        if (elTaxaAnalise) {
            elTaxaAnalise.textContent = `${txAnalise.toFixed(1)}%`;
        }
        
        const analiseStat = document.getElementById('statAnalise') || document.getElementById('cardAnalise');
        if(analiseStat) {
            if (txAnalise >= 30) {
                analiseStat.style.borderLeft = `4px solid ${this.baseColors.success}`;
            } else if (txAnalise >= 25) {
                analiseStat.style.borderLeft = `4px solid ${this.baseColors.warning}`;
            } else {
                analiseStat.style.borderLeft = `4px solid ${this.baseColors.danger}`;
            }
        }
    }

    /**
     * Popula rankings de Peso (usado nas abas Caminhões/Colheita).
     */
    updateTopLists(analysis) {
        // Rankings de Peso (Abas Caminhões/Equipamentos) - USANDO MÉTODO SIMPLIFICADO CORRIGIDO
        // Top Frotas (Peso/Volume)
        this._populateRankingSimplified('topFrotasProprias', analysis.topFrotasProprias, 'toneladas', true);
        this._populateRankingSimplified('topFrotasTerceiros', analysis.topFrotasTerceiros, 'toneladas', true);
        
        // Colheita (Equipamentos)
        this._populateRankingSimplified('topEquipamentosProprios', analysis.topEquipamentosProprios, 'toneladas', false);
        this._populateRankingSimplified('topEquipamentosTerceiros', analysis.topEquipamentosTerceiros, 'toneladas', false);
        
        this._populateRankingSimplified('topTransbordos', analysis.topTransbordos, 'toneladas', false);
        this._populateOperadores('topOperadoresColheitaPropria', analysis.topOperadoresColheitaPropria);
        
        // Se a nova aba Metas existir, atualiza ela também.
        if (this.metasRenderer && analysis.metaData) {
            this.metasRenderer.updateMetasGrid(analysis.metaData);
        }
    }
    
    /**
     * Método central para renderizar listas de rankings, com Ton.Km para logística.
     * Usado para os rankings de Distância.
     */
    _populateRanking(id, data, mainKey, mainUnit, secondaryValueKey, secondaryUnit) {
        const list = document.getElementById(id); 
        if(!list) return;
        list.innerHTML = '';
        if (!data || data.length === 0) { 
            list.innerHTML = `<div class="top-list-item" style="justify-content: center;">Sem dados.</div>`; 
            return; 
        }

        data.forEach((item, index) => {
            const li = document.createElement('li'); 
            // Usa cor de ranking para a borda
            const rankColor = index === 0 ? 'var(--warning)' : 'var(--secondary)';
            li.className = 'top-list-item ranking-logistics'; 
            li.style.borderLeft = `4px solid ${rankColor}`;

            const mainValue = item[mainKey] || 0;
            const secondaryValue = item[secondaryValueKey] || 0;
            const safeCodigo = this._safeHTML(item.codigo);
            
            // Tratamento seguro para N/A antes de toFixed
            const kmMediaDisplay = mainValue ? mainValue.toFixed(1) : 'N/A';
            const tonKmDisplay = secondaryValue ? Utils.formatWeight(secondaryValue) : '0';
            
            // Estrutura aprimorada para Ton.Km (Código + Média KM vs Ton.Km)
            li.innerHTML = `
                <div class="ranking-info-group">
                    <span class="item-label item-codigo">${index + 1}º ${safeCodigo}</span>
                    <span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Média: ${kmMediaDisplay} km</span>
                </div>
                <div class="ranking-value-group">
                    <span class="item-value item-tonkm" style="font-size:0.9em; color:var(--warning); font-weight: 700; white-space: nowrap;">
                            ${tonKmDisplay} ${secondaryUnit}
                    </span>
                </div>
            `;
            list.appendChild(li);
        });
    }

    /**
     * MÉTODO CORRIGIDO E SIMPLIFICADO: Popula rankings para Frotas/Equipamentos com foco em Peso.
     * @param {string} id ID do container.
     * @param {Array} data Lista de rankings.
     * @param {string} unitLabel Unidade principal (e.g., 'toneladas').
     * @param {boolean} showDensity Mostrar Densidade Média e KM (para Frotas).
     */
    /**
 * MÉTODO CORRIGIDO: Popula rankings para Frotas/Equipamentos com foco em Peso.
 * Sem barra de rolagem desnecessária.
 */
_populateRankingSimplified(id, data, unitLabel, showDensity = false) {
    const list = document.getElementById(id); 
    if(!list) return;
    list.innerHTML = '';
    
    // REMOVE a altura máxima fixa e o overflow-y
    list.style.maxHeight = ''; 
    list.style.overflowY = ''; 
    list.style.overflowX = 'hidden'; // Apenas para garantir que não tenha scroll horizontal

    if (!data || data.length === 0) { 
        list.innerHTML = `<div class="top-list-item" style="justify-content: center; padding: 12px;">Sem dados.</div>`; 
        return; 
    }

    data.forEach((item, index) => {
        const li = document.createElement('li'); 
        const rankColor = index === 0 ? 'var(--warning)' : 'var(--secondary)';
        li.className = 'top-list-item'; 
        li.style.borderLeft = `4px solid ${rankColor}`;

        const peso = item.peso || 0;
        const safeCodigo = this._safeHTML(item.codigo);
        const safeFrente = this._safeHTML(item.frente);
        
        let secondaryMetricHTML = '';

        if (showDensity) {
            const densidadeDisplay = (item.densidadeMedia || 0).toFixed(2);
            const kmDisplay = (item.distanciaMedia || 0).toFixed(1);
            
            secondaryMetricHTML = `
                <div style="font-size:0.8em; font-weight: 500; color: var(--text-secondary); display: flex; flex-direction: column; align-items: flex-start;">
                    <span style="font-weight: 600;">Densidade: ${densidadeDisplay}</span>
                    <span style="font-weight: 600;">Raio Médio: ${kmDisplay} km</span>
                </div>
            `;
        } else {
            secondaryMetricHTML = `<span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Fr. ${safeFrente}</span>`;
        }
        
        li.innerHTML = `
            <div class="ranking-info-group" style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
                <span class="item-label item-codigo" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${index + 1}º ${safeCodigo}</span>
                ${secondaryMetricHTML}
            </div>
            <div class="ranking-value-group" style="flex-shrink: 0;">
                <span class="item-value item-peso" style="font-size:0.9em; color:var(--primary); font-weight: 700; white-space: nowrap;">
                        ${Utils.formatWeight(peso)} t
                </span>
            </div>
        `;
        list.appendChild(li);
    });
}

/**
 * Método corrigido para operadores sem barra de rolagem
 */
_populateOperadores(id, data) {
    const list = document.getElementById(id); 
    if(!list) return;
    list.innerHTML = '';
    
    // REMOVE as configurações de altura máxima
    list.style.maxHeight = ''; 
    list.style.overflowY = '';
    list.style.overflowX = 'hidden';

    if (!data || data.length === 0) { 
        list.innerHTML = `<div class="top-list-item" style="justify-content: center; padding: 12px;">Sem dados.</div>`; 
        return; 
    }

    data.forEach((item, index) => {
        const li = document.createElement('li'); 
        li.className = 'top-list-item';
        
        const safeFrente = this._safeHTML(item.frente);
        const safeCodigoCompleto = this._safeHTML(item.codigo);
        
        li.innerHTML = `
            <div class="ranking-info-group" style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
                <span class="item-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${index + 1}º ${safeCodigoCompleto}</span>
                <span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Frente: ${safeFrente}</span>
            </div>
            <div class="ranking-value-group" style="flex-shrink: 0;">
                <span class="item-value">${Utils.formatWeight(item.peso)} t</span>
            </div>
        `;
        list.appendChild(li);
    });
}


    _populateOperadores(id, data) {
        const list = document.getElementById(id); 
        if(!list) return;
        list.innerHTML = '';
        
        // CRÍTICO: Define altura máxima para garantir que os cards fiquem contidos no modal.
        list.style.maxHeight = '350px'; 
        list.style.overflowY = 'auto'; // Reabilita o scroll interno se o conteúdo for grande
        
        if (!data || data.length === 0) { 
            // CORREÇÃO: Removendo barras de rolagem desnecessárias e garantindo alinhamento
            list.innerHTML = `<div class="top-list-item" style="justify-content: center; overflow: hidden;">Sem dados.</div>`; 
            list.style.overflowY = 'hidden'; // Evita a barra de rolagem quando vazio
            return; 
        }

        data.forEach((item, index) => {
            const li = document.createElement('li'); 
            li.className = 'top-list-item';
            
            const safeFrente = this._safeHTML(item.frente);
            const safeCodigoCompleto = this._safeHTML(item.codigo); // Contém "CÓDIGO - NOME"
            
            // CONCATENAÇÃO NO DISPLAY: 1º CÓDIGO - NOME | Fr. XX
            li.innerHTML = `
                <div class="ranking-info-group" style="display: flex; flex-direction: column; align-items: flex-start;">
                    <span class="item-label">${index + 1}º ${safeCodigoCompleto}</span>
                    <span class="text-secondary" style="font-size:0.8em; font-weight: 500;">Frente: ${safeFrente}</span>
                </div>
                <div class="ranking-value-group">
                    <span class="item-value">${Utils.formatWeight(item.peso)} t</span>
                </div>
            `;
            list.appendChild(li);
        });
    }
    
    /**
     * NOVO: Renderiza o gráfico de barra de distribuição PROPRIA vs FORNECEDOR.
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
            // Esta é a mensagem que indica que a coluna Tipo Proprietario (F.A.) está vazia no seu CSV
            container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">Sem dados de Tipo Proprietário (F.A.).</p>`;
            return;
        }

        const html = `
            <div class="owner-distribution-labels">
                <span style="color: var(--proprio-color);">
                    ${propriaPercent.toFixed(1)}% (${Utils.formatNumber(propriaTons)} t)
                </span>
                <span style="color: var(--terceiro-color);">
                    (${Utils.formatNumber(fornecedorTons)} t) ${fornecedorPercent.toFixed(1)}%
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
        
        // NOVO: Adiciona a barra de progresso do acumulado do dia (pedida pelo usuário)
        const acumuladoDiaEl = document.getElementById('acumuladoDiaProgressContainer');
        if (acumuladoDiaEl) {
             const targetValue = parseFloat(localStorage.getItem('metaMoagem') || '25000');
             const percentDia = Math.min((total / targetValue) * 100, 100).toFixed(0);
             
             acumuladoDiaEl.innerHTML = `
                 <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 15px;">
                     ${percentDia}% da Meta (${Utils.formatNumber(targetValue)} t)
                 </div>
                 <div class="progress-container" style="height: 12px; margin-top: 5px;">
                     <div class="progress-bar" style="width: ${percentDia}%; background: linear-gradient(90deg, var(--proprio-color), var(--terceiro-color));"></div>
                 </div>
               `;
        }
    }

}
if (typeof VisualizerKPIs === 'undefined') {
    window.VisualizerKPIs = VisualizerKPIs;
}