// visualizer-metas.js - VERSÃƒO ATUALIZADA COM CORREÃ‡Ã•ES
class VisualizerMetas {

    constructor(visualizer) {
        this.visualizer = visualizer;
        this.baseColors = visualizer.baseColors;
    }

    _safeHTML(text) {
        if (text === null || text === undefined) return 'N/A';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    
    _formatValue(key, value) {
        if (value === null || value === undefined || value === '') return 'N/A';
        
        if (key === 'maturador' || key === 'possivel_reforma') {
            const valUpper = String(value).toUpperCase().trim();
            if (valUpper === 'SIM') return `<span style="color: var(--success); font-weight: 700;">SIM</span>`;
            if (valUpper === 'NÃƒO' || valUpper === 'NAO') return `<span style="color: var(--danger); font-weight: 700;">NÃƒO</span>`;
            return this._safeHTML(value);
        }

        const numericKeys = ['raio', 'tmd', 'cd', 'potencial', 'meta', 'atr', 'vel', 'tc', 'tch', 'ton_hora', 'cm_hora', 'tempo_carre_min', 'cam', 'ciclo', 'viagens', 'tempo', 'potencial_entrega_total'];
        
        if (numericKeys.includes(key)) {
            const floatValue = parseFloat(value);
            if (isNaN(floatValue)) return this._safeHTML(value); 

            let fixedDecimals = 2;
            if (['raio', 'vel', 'atr', 'tmd', 'cd', 'ton_hora', 'tch', 'cm_hora'].includes(key)) fixedDecimals = 1; 
            if (['meta', 'viagens', 'cam', 'ciclo', 'tempo_carre_min', 'potencial_entrega_total'].includes(key)) fixedDecimals = 0; 
            
            return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: fixedDecimals, maximumFractionDigits: fixedDecimals });
        }

        return this._safeHTML(value);
    }
    
    _getDisplayTitle(key) {
        const map = {
            'cod_fazenda': 'Cod. Fazenda',
            'desc_fazenda': 'Desc. Fazenda',
            'proprietario': 'ProprietÃ¡rio',
            'colheitabilidade': 'Colheitabilidade',
            'raio': 'Raio MÃ©dio (Km)',
            'tmd': 'TMD',
            'cd': 'Qtd. Colhedora',
            'potencial_entrega_total': 'Potencial Total (t)',
            'meta': 'Meta (t)',
            'atr': 'ATR',
            'maturador': 'Maturador',
            'possivel_reforma': 'PossÃ­vel Reforma',
            'vel': 'Velocidade (Km/h)',
            'tc': 'TC',
            'tch': 'TCH (t/ha)',
            'ton_hora': 'Ton/Hora',
            'cm_hora': 'CM (CaminhÃµes/h)',
            'tempo_carre_min': 'Tempo Carreg. (min)',
            'cam': 'Cam. Total no Ciclo',
            'ciclo': 'Ciclo Total (min)',
            'viagens': 'Viagens Estimadas',
            'tempo': 'Tempo MÃ©dio Carreg.',
            'previsao_mudanca': 'PREVISÃƒO MUDANÃ‡A',
            'liberacao_ativa': 'LiberaÃ§Ã£o Ativa'
        };
        return map[key] || this._safeHTML(key.toUpperCase());
    }
    
    updateMetasGrid(metaDataMap) {
        const container = document.getElementById('tab-metas');
        if (!container) return;
        container.innerHTML = ''; 
        
        if (!metaDataMap || metaDataMap.size === 0) {
            container.innerHTML = `
                <div class="analytics-row">
                <div class="analytics-card glass-card full-width" style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning);"></i>
                    <h3>Aguardando Arquivo de Metas</h3>
                    <p style="color: var(--text-secondary); margin-top: 10px;">Carregue uma planilha Metas.xlsx na aba Gerenciar.</p>
                </div>
                </div>
            `;
            return;
        }

        let htmlContent = `
            <div class="analytics-row">
                <div class="analytics-card glass-card full-width hover-zoom-card">
                    <div class="card-header">
                        <h3><i class="fas fa-bullseye"></i> Planejamento de Metas por Frente</h3>
                    </div>
                    <div class="fronts-grid">`;
        
        metaDataMap.forEach((cardData, frente) => {
            const keysToRender = [
                'proprietario', 'colheitabilidade',
                'raio', 'potencial_entrega_total', 'vel', 'tc', 'tch', 'ton_hora', 'cm_hora', 
                'tempo_carre_min', 'cam', 'ciclo', 'viagens', 'tempo', 'previsao_mudanca',
                'maturador', 'possivel_reforma'
            ];
            
            const metaValue = parseFloat(cardData.meta) || 0;
            const rankColor = metaValue >= 100 ? this.baseColors.success : this.baseColors.warning;
            
            let detailHtml = '';
            for (const key of keysToRender) {
                if (cardData[key] === null || cardData[key] === undefined || cardData[key] === '') continue;
                const title = this._getDisplayTitle(key);
                const valueDisplay = this._formatValue(key, cardData[key]);

                detailHtml += `
                    <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                        <span class="stat-lbl" style="font-weight: 500; font-size: 0.8rem; text-align: left; max-width: 60%;">${title}:</span>
                        <span class="stat-val" style="font-size: 0.85rem; color: var(--text);">${valueDisplay}</span>
                    </div>
                `;
            }

            // Obter valores corretos
            const codFazenda = cardData.cod_fazenda || 'N/A';  // Este Ã© o valor da coluna F.A (ex: 219201)
            const descFazenda = cardData.desc_fazenda || 'N/A'; // Este Ã© o nome da fazenda (ex: FAZENDA PAULICEIA)

            htmlContent += `
                <div class="front-card" style="--rank-color: ${rankColor};">
                    <div class="card-content-wrapper">
                        <div class="front-header-centered">
                            <span class="front-title-large">Frente ${this._safeHTML(frente)}</span>
                            <div style="background: linear-gradient(135deg, ${rankColor}15, ${rankColor}30); padding: 12px 20px; border-radius: 12px; margin: 10px 0; border-left: 4px solid ${rankColor};">
                                <div style="text-align: center;">
                                    <span style="font-size: 1.8rem; font-weight: 900; color: ${rankColor}; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                        ${this._formatValue('meta', cardData.meta)} t
                                    </span>
                                    <div style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                                        Meta Frente
                                    </div>
                                </div>
                            </div>
                            <span class="front-variety-highlight" style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-top: 5px;">
                                ${this._safeHTML(descFazenda)}
                            </span>
                        </div>

                        <div class="front-stats-grid-simple" style="margin-top: 15px;">
                            <div class="stat-box" style="text-align: center;">
                                <span class="stat-val" style="color: var(--primary); font-size: 1.2rem;">${this._formatValue('tmd', cardData.tmd)}</span>
                                <span class="stat-lbl">TMD</span>
                            </div>
                            <div class="stat-box" style="text-align: center;">
                                <span class="stat-val" style="font-size: 1.2rem;">${this._formatValue('atr', cardData.atr)}</span>
                                <span class="stat-lbl">ATR</span>
                            </div>
                            <div class="stat-box" style="text-align: center;">
                                <span class="stat-val" style="font-size: 1.2rem;">${this._formatValue('cd', cardData.cd)}</span>
                                <span class="stat-lbl">Qtd. Colhedora</span>
                            </div>
                        </div>

                        <div class="front-analysis-row" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; padding-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                                <span class="stat-lbl" style="font-weight: 500; font-size: 0.8rem; text-align: left; max-width: 60%;">Cod. Fazenda:</span>
                                <span class="stat-val" style="font-size: 0.85rem; color: var(--text);">${this._safeHTML(codFazenda)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                                <span class="stat-lbl" style="font-weight: 500; font-size: 0.8rem; text-align: left; max-width: 60%;">Desc. Fazenda:</span>
                                <span class="stat-val" style="font-size: 0.85rem; color: var(--text);">${this._safeHTML(descFazenda)}</span>
                            </div>
                            ${detailHtml}
                            <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                                <span class="stat-lbl" style="font-weight: 700; font-size: 0.8rem; text-align: left;">LiberaÃ§Ã£o Ativa:</span>
                                <span class="stat-val" style="font-size: 0.85rem; color: var(--primary);">${this._formatValue('liberacao_ativa', cardData.liberacao_ativa)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        htmlContent += `</div></div></div>`;
        container.innerHTML = htmlContent;
    }
}

if (typeof window !== 'undefined') window.VisualizerMetas = VisualizerMetas;