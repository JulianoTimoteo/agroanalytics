// visualizer-kpis.js - VERSÃO 5.3 - CORREÇÃO DEFINITIVA DE DISPONIBILIDADE

if (typeof VisualizerKPIs === 'undefined') {
    class VisualizerKPIs {

        constructor(visualizer) {
            console.log("🚀 KPI Visualizer v5.3 Iniciado - CORREÇÃO DEFINITIVA DISPONIBILIDADE");
            
            if (typeof VisualizerMetas !== 'undefined') {
                this.metasRenderer = new VisualizerMetas(visualizer);
            }

            this.visualizer = visualizer;
            
            // CORES HARDCODED - GARANTIA ABSOLUTA
            this.COLORS = {
                GREEN: '#40800c',  // Verde
                RED: '#FF2E63',    // Vermelho
                BLUE: '#2196F3',   // Azul
                YELLOW: '#FFB800'  // Amarelo
            };

            this._injectTooltipStyles();
        }

        _injectTooltipStyles() {
            if (document.getElementById('kpi-tooltip-styles')) return;
            const style = document.createElement('style');
            style.id = 'kpi-tooltip-styles';
            style.innerHTML = `
                .info-compact-card { 
                    position: relative; 
                    overflow: visible !important; 
                    cursor: help;
                    transition: border-color 0.3s ease;
                }
                .kpi-tooltip {
                    visibility: hidden;
                    width: 220px;
                    background-color: rgba(10, 14, 23, 0.98);
                    color: #e0e0e0;
                    text-align: left;
                    border-radius: 6px;
                    padding: 8px 10px;
                    position: absolute;
                    z-index: 9999;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s, bottom 0.2s;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    font-size: 0.75rem;
                    pointer-events: none;
                    backdrop-filter: blur(4px);
                }
                .info-compact-card:hover .kpi-tooltip {
                    visibility: visible;
                    opacity: 1;
                    bottom: 120%;
                }
                .kpi-tooltip::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(10, 14, 23, 0.98) transparent transparent transparent;
                }
                .kpi-tooltip-title { 
                    font-weight: 700; 
                    margin-bottom: 5px; 
                    color: #fff; 
                    border-bottom: 1px solid rgba(255,255,255,0.1); 
                    padding-bottom: 4px;
                    font-size: 0.8rem;
                }
                .kpi-tooltip-row { margin-bottom: 3px; }
                .kpi-status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
            `;
            document.head.appendChild(style);
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
         * 🔥 FUNÇÃO MÁGICA - CONVERTE QUALQUER FORMATO PARA PORCENTAGEM
         * Aceita: 0.96, 96, "0.96", "96%", "0,96", etc.
         * Retorna: 96 (sempre como número limpo)
         */
        _normalizarParaPorcentagem(valor) {
            // Se for null/undefined, retorna 0
            if (valor === null || valor === undefined || valor === '') {
                console.log('[DISP] Valor vazio, retornando 0');
                return 0;
            }

            // Converte para string para processar
            let strValor = String(valor).trim();
            
            // Remove o símbolo % se existir
            strValor = strValor.replace('%', '');
            
            // Troca vírgula por ponto (formato BR → US)
            strValor = strValor.replace(',', '.');
            
            // Converte para número
            let numValor = parseFloat(strValor);
            
            // Se NaN, retorna 0
            if (isNaN(numValor)) {
                console.log('[DISP] Valor NaN após conversão, retornando 0');
                return 0;
            }

            // 🎯 REGRA MÁGICA: Se o valor está entre 0 e 1.1, multiplica por 100
            // Isso pega 0.96 e transforma em 96
            if (numValor > 0 && numValor <= 1.1) {
                numValor = numValor * 100;
                console.log(`[DISP] Valor detectado como fração (${valor}), convertido para ${numValor}%`);
            }

            return numValor;
        }

        updateHeaderStats(analysis) {
            if (!analysis) return;

            const stats3h = this._calculate3HourStats(analysis);

            // --- 1. ACUMULADO SAFRA ---
            this._updateCard('acumuladoSafra', {
                value: analysis.acumuladoSafra || 0,
                unit: 'ton',
                formatter: (v) => typeof Utils !== 'undefined' ? Utils.formatNumber(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                rule: 'Informativo',
                status: 'neutral',
                reason: 'Volume Total Processado',
                icon: 'fas fa-chart-line'
            });

            // --- 2. FROTA (VIAGENS) ---
            const vProp = analysis.viagensProprias || 0;
            const vTerc = analysis.viagensTerceiros || 0;
            const totalV = analysis.totalViagens || 0;
            
            const statusViagens = vProp >= vTerc ? 'success' : 'warning';
            this._updateCard('totalViagens', {
                value: totalV,
                unit: '',
                rule: 'Meta: Própria > Terceiros',
                status: statusViagens,
                reason: `Própria: ${vProp} | Terc: ${vTerc}`,
                icon: 'fas fa-route'
            });

            this._setText('viagensProprias', vProp);
            this._setText('viagensTerceiros', vTerc);

            // --- 3. TAXA DE ANÁLISE ---
            const taxaAnalise = analysis.taxaAnalise || 0;
            const roundedAnalise = Math.round(taxaAnalise);
            
            let analiseColor = 'danger';
            let analiseReason = 'Crítico (< 29%)';

            if (roundedAnalise >= 35) {
                analiseColor = 'success';
                analiseReason = 'Meta Atingida (>= 35%)';
            } else if (roundedAnalise >= 31) {
                analiseColor = 'neutral';
                analiseReason = 'Normal (31% - 34%)';
            } else if (roundedAnalise >= 29) {
                analiseColor = 'warning';
                analiseReason = 'Atenção (29% - 31%)';
            }

            this._updateCard('taxaAnalise', {
                value: taxaAnalise,
                unit: '%',
                formatter: (v) => Math.round(v),
                rule: 'Meta: 35%',
                status: analiseColor,
                reason: analiseReason,
                icon: 'fas fa-chart-bar'
            });

            // --- 4. MÉDIA POTENCIAL (3H) ---
            const pot = stats3h.potencial;
            const roundedPot = Math.round(pot);
            const potStatus = roundedPot > 600 ? 'success' : 'danger';
            
            this._updateCard('avgPotencial3h', {
                value: pot,
                unit: 't/h',
                formatter: Math.round,
                rule: 'Meta: > 600 t/h',
                status: potStatus,
                reason: potStatus === 'success' ? 'Acima da Meta' : 'Abaixo da Meta',
                icon: 'fas fa-bolt'
            });

            // --- 5. MÉDIA ROTAÇÃO (3H) ---
            const rot = stats3h.rotacao;
            const roundedRot = Math.round(rot);
            const metaRotacao = parseFloat(localStorage.getItem('metaRotacao') || '1250');
            const rotStatus = roundedRot >= metaRotacao ? 'success' : 'danger';
            
            this._updateCard('avgRotacao3h', {
                value: rot,
                unit: 'RPM',
                formatter: Math.round,
                rule: `Meta: ${metaRotacao} RPM`,
                status: rotStatus,
                reason: rotStatus === 'success' ? 'Operação Ideal' : 'Baixa Rotação',
                icon: 'fas fa-cogs'
            });

            // --- 6. MÉDIA MOAGEM (3H) ---
            const metaMoagemDia = parseFloat(localStorage.getItem('metaMoagem') || '18500');
            const metaHora = metaMoagemDia / 24;
            const moagem3h = stats3h.moagem;
            const roundedMoagem = Math.round(moagem3h);
            const roundedMetaHora = Math.round(metaHora);

            let moagemStatus = 'neutral';
            let moagemReason = 'Informativo';

            if (roundedMoagem >= roundedMetaHora) { 
                moagemStatus = 'success'; 
                moagemReason = 'Bateu Meta Horária'; 
            } else if (roundedMoagem >= (roundedMetaHora * 0.9)) { 
                moagemStatus = 'warning'; 
                moagemReason = 'Próximo da Meta'; 
            } else { 
                moagemStatus = 'danger'; 
                moagemReason = 'Abaixo da Meta'; 
            }

            this._updateCard('avgMoagem3h', {
                value: moagem3h,
                unit: 't/h',
                formatter: Math.round,
                rule: `Meta: ${roundedMetaHora} t/h`,
                status: moagemStatus,
                reason: moagemReason,
                icon: 'fas fa-industry'
            });

            // --- 7, 8, 9. DISPONIBILIDADES - USANDO FUNÇÃO MÁGICA ---
            console.log('========================================');
            console.log('🔥 PROCESSANDO DISPONIBILIDADES');
            console.log('Valores BRUTOS recebidos do stats3h:');
            console.log('- dispColhedora:', stats3h.dispColhedora);
            console.log('- dispTransbordo:', stats3h.dispTransbordo);
            console.log('- dispCaminhoes:', stats3h.dispCaminhoes);
            
            const dispColhedoraPercent = this._normalizarParaPorcentagem(stats3h.dispColhedora);
            const dispTransbordoPercent = this._normalizarParaPorcentagem(stats3h.dispTransbordo);
            const dispCaminhoesPercent = this._normalizarParaPorcentagem(stats3h.dispCaminhoes);

            console.log('Valores CONVERTIDOS:');
            console.log('- dispColhedora:', dispColhedoraPercent + '%');
            console.log('- dispTransbordo:', dispTransbordoPercent + '%');
            console.log('- dispCaminhoes:', dispCaminhoesPercent + '%');
            console.log('========================================');

            this._updateDispCard('dispColhedora', dispColhedoraPercent, 90, 'colhedora');
            this._updateDispCard('dispTransbordo', dispTransbordoPercent, 90, 'transbordo');
            this._updateDispCard('dispCaminhoes', dispCaminhoesPercent, 90, 'caminhao');
        }

        _updateDispCard(id, valorPorcentagem, meta, type) {
            console.log(`\n[DISP ${id}] Processando...`);
            console.log(`- Valor recebido: ${valorPorcentagem}`);
            console.log(`- Meta: ${meta}%`);
            
            const roundedVal = Math.round(valorPorcentagem);
            console.log(`- Valor arredondado: ${roundedVal}%`);
            
            // LÓGICA SIMPLES E CLARA
            let status = 'danger';
            let reason = 'Crítico';

            if (roundedVal >= meta) {
                status = 'success';
                reason = `Excelente (${roundedVal}%)`;
            } else if (roundedVal >= (meta - 5)) {
                status = 'warning';
                reason = `Bom (${roundedVal}%)`;
            } else if (roundedVal >= (meta - 10)) {
                status = 'warning';
                reason = `Atenção (${roundedVal}%)`;
            }

            console.log(`- Status final: ${status}`);
            console.log(`- Cor final: ${status === 'success' ? 'VERDE' : status === 'warning' ? 'AMARELO' : 'VERMELHO'}`);

            this._updateCard(id, {
                value: valorPorcentagem, 
                unit: '%',
                formatter: (v) => Math.round(v),
                rule: `Meta: ${meta}%`,
                status: status,
                reason: reason,
                icon: type === 'caminhao' ? 'fas fa-truck' : (type === 'colhedora' ? 'fas fa-tractor' : 'fas fa-exchange-alt')
            });
        }

        _calculate3HourStats(analysis) {
            const now = new Date();
            const currentHour = now.getHours();
            const result = { 
                moagem: 0, 
                potencial: 0, 
                rotacao: 0, 
                dispColhedora: 0, 
                dispTransbordo: 0, 
                dispCaminhoes: 0 
            };
            
            const getLast3 = (data) => {
                if (!Array.isArray(data)) return [];
                const res = [];
                for (let i = 1; i <= 3; i++) {
                    const targetH = (currentHour - i + 24) % 24;
                    const found = data.find(d => {
                        const h = d.hora !== undefined ? d.hora : (d.time ? parseInt(d.time.split(':')[0]) : -1);
                        return h === targetH;
                    });
                    if (found) res.push(found);
                }
                return res;
            };

            const moagemData = getLast3(analysis.analise24h);
            if (moagemData.length > 0) {
                const sum = moagemData.reduce((acc, cur) => acc + (cur.peso || 0), 0);
                result.moagem = sum / moagemData.length;
            }

            const potData = getLast3(analysis.potentialData);
            console.log('\n🔍 DADOS POTENCIAL (últimas 3h):', potData.length, 'registros');
            
            if (potData.length > 0) {
                // Função para extrair valor de disponibilidade
                const extrairDisp = (registro, nomeCampo) => {
                    // Lista de possíveis nomes de colunas
                    const possiveisNomes = [
                        nomeCampo,
                        nomeCampo.toUpperCase(),
                        nomeCampo.toLowerCase(),
                        nomeCampo.replace('disp', 'DISP '),
                        nomeCampo.replace('disp', 'DISP_'),
                        nomeCampo.replace('Caminhoes', 'CAMINHÕES'),
                        nomeCampo.replace('Caminhoes', 'Caminhões')
                    ];

                    for (const nome of possiveisNomes) {
                        if (registro[nome] !== undefined && registro[nome] !== null && registro[nome] !== '') {
                            console.log(`  ✓ Encontrado "${nome}": ${registro[nome]}`);
                            return registro[nome];
                        }
                        if (registro.raw && registro.raw[nome] !== undefined && registro.raw[nome] !== null && registro.raw[nome] !== '') {
                            console.log(`  ✓ Encontrado "raw.${nome}": ${registro.raw[nome]}`);
                            return registro.raw[nome];
                        }
                    }

                    console.log(`  ✗ Não encontrado campo para ${nomeCampo}`);
                    return 0;
                };

                // Extrai e normaliza cada disponibilidade
                const dispColhedoras = [];
                const dispTransbordos = [];
                const dispCaminhoes = [];
                const potenciais = [];
                const rotacoes = [];

                potData.forEach((registro, idx) => {
                    console.log(`\n--- Registro ${idx + 1} ---`);
                    
                    // Colhedora
                    const colhRaw = extrairDisp(registro, 'dispColhedora');
                    const colhNorm = this._normalizarParaPorcentagem(colhRaw);
                    dispColhedoras.push(colhNorm);
                    
                    // Transbordo
                    const transbRaw = extrairDisp(registro, 'dispTransbordo');
                    const transbNorm = this._normalizarParaPorcentagem(transbRaw);
                    dispTransbordos.push(transbNorm);
                    
                    // Caminhões
                    const camRaw = extrairDisp(registro, 'dispCaminhoes');
                    const camNorm = this._normalizarParaPorcentagem(camRaw);
                    dispCaminhoes.push(camNorm);

                    // Potencial e Rotação
                    potenciais.push(parseFloat(registro.potencial || 0));
                    rotacoes.push(parseFloat(registro.rotacao || 0));
                });

                // Calcula médias
                const calcMedia = (arr) => {
                    const validos = arr.filter(v => !isNaN(v) && v > 0);
                    if (validos.length === 0) return 0;
                    return validos.reduce((a, b) => a + b, 0) / validos.length;
                };

                result.dispColhedora = calcMedia(dispColhedoras);
                result.dispTransbordo = calcMedia(dispTransbordos);
                result.dispCaminhoes = calcMedia(dispCaminhoes);
                result.potencial = calcMedia(potenciais);
                result.rotacao = calcMedia(rotacoes);

                console.log('\n📊 MÉDIAS CALCULADAS (3h):');
                console.log('- Disp. Colhedora:', result.dispColhedora.toFixed(2) + '%');
                console.log('- Disp. Transbordo:', result.dispTransbordo.toFixed(2) + '%');
                console.log('- Disp. Caminhões:', result.dispCaminhoes.toFixed(2) + '%');
                console.log('- Potencial:', result.potencial.toFixed(2) + ' t/h');
                console.log('- Rotação:', result.rotacao.toFixed(2) + ' RPM');
            }

            return result;
        }

        _updateCard(elementId, options) {
            const el = document.getElementById(elementId);
            if (!el) {
                console.warn(`Elemento não encontrado: ${elementId}`);
                return;
            }

            const textVal = options.formatter ? options.formatter(options.value) : options.value;
            el.textContent = textVal + (options.unit ? ' ' + options.unit : '');

            // Limpa TODAS as classes de cor
            el.className = el.className.replace(/text-(danger|warning|success|primary|info|secondary)/g, '');
            
            // Remove qualquer estilo inline
            el.style.cssText = el.style.cssText.replace(/color[^;]+;/g, '');

            const card = el.closest('.info-compact-card') || el.closest('.analytics-card');
            if (!card) {
                console.warn(`Card não encontrado para: ${elementId}`);
                return;
            }

            // Seleção de Cor COM FORÇA
            let colorHex = this.COLORS.BLUE;
            if (options.status === 'success') colorHex = this.COLORS.GREEN;
            else if (options.status === 'warning') colorHex = this.COLORS.YELLOW;
            else if (options.status === 'danger') colorHex = this.COLORS.RED;
            else if (options.status === 'neutral') colorHex = this.COLORS.BLUE;
            
            console.log(`[COLOR] ${elementId}: status=${options.status}, color=${colorHex}, value=${options.value}`);

            // Aplica Borda com força
            card.style.borderLeft = `4px solid ${colorHex} !important`;
            card.style.borderColor = `${colorHex} !important`;
            
            // Aplica Cor do Texto COM MÁXIMA PRIORIDADE
            el.style.setProperty('color', colorHex, 'important');
            el.style.cssText += `color: ${colorHex} !important;`;

            // Remove qualquer fundo que possa interferir
            card.style.backgroundColor = 'transparent';
            el.style.backgroundColor = 'transparent';

            // Atualiza Ícone
            if (options.icon) {
                const icon = card.querySelector('.card-icon');
                if (icon) {
                    icon.className = `${options.icon} card-icon`;
                    icon.style.cssText = `color: ${colorHex} !important;`;
                }
            }

            this._injectTooltipHTML(card, options, colorHex);
        }

        _injectTooltipHTML(card, options, colorHex) {
            let tooltip = card.querySelector('.kpi-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'kpi-tooltip';
                card.appendChild(tooltip);
            }
            
            tooltip.innerHTML = `
                <div class="kpi-tooltip-title">${options.rule}</div>
                <div class="kpi-tooltip-row">
                    <span>Valor:</span>
                    <strong>${options.formatter ? options.formatter(options.value) : options.value} ${options.unit}</strong>
                </div>
                <div class="kpi-tooltip-row">
                    <span>Status:</span>
                    <span style="color: ${colorHex}; font-weight:600;">
                        <span class="kpi-status-indicator" style="background-color: ${colorHex};"></span>
                        ${options.reason}
                    </span>
                </div>
            `;
        }

        _setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        updateTopLists(analysis) {
            if (!analysis) return;

            this._populateRankingSimplified('topFrotasProprias', analysis.topFrotasProprias, 'toneladas', true, analysis.data);
            this._populateRankingSimplified('topFrotasTerceiros', analysis.topFrotasTerceiros, 'toneladas', true, analysis.data);
            this._populateRankingSimplified('topEquipamentosProprios', analysis.topEquipamentosProprios, 'toneladas', false, analysis.data);
            this._populateRankingSimplified('topEquipamentosTerceiros', analysis.topEquipamentosTerceiros, 'toneladas', false, analysis.data);
            this._populateRankingSimplified('topTransbordos', analysis.topTransbordos, 'toneladas', false, analysis.data);
            this._populateOperadores('topOperadoresColheitaPropria', analysis.topOperadoresColheitaPropria);
            
            if (this.metasRenderer && analysis.metaData) {
                this.metasRenderer.updateMetasGrid(analysis.metaData);
            }
        }

        _populateRankingSimplified(id, data, unitLabel, showDensity = false, rawData = []) {
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
                    let kmVal = parseFloat(item.distMedia || item.distancia || item.raio || item.km || 0);
                    
                    if (kmVal === 0 && rawData && rawData.length > 0) {
                        const targetCode = String(safeCodigo).split(/[\s-]/)[0].trim();
                        const matches = rawData.filter(r => {
                            const cFrota = String(r.frota || '').split(/[\s-]/)[0].trim();
                            const cEquip = String(r.equipamento || '').split(/[\s-]/)[0].trim();
                            return cFrota === targetCode || cEquip === targetCode;
                        });
                        if (matches.length > 0) {
                            const totalDist = matches.reduce((sum, r) => {
                                let d = parseFloat(r.distancia || r.raio || r.km || r.dist || r.raio_medio || r.dist_media || r.distancia_km || r.DISTANCIA || r.RAIO || 0);
                                if ((isNaN(d) || d === 0) && r.raw) {
                                    d = parseFloat(r.raw.distancia || r.raw.raio || r.raw.km || r.raw.dist || r.raw['Distância'] || r.raw['Raio'] || 0);
                                }
                                return sum + (isNaN(d) ? 0 : d);
                            }, 0);
                            kmVal = totalDist / matches.length;
                        }
                    }
                    const kmDisplay = kmVal.toFixed(1);
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
            
            const forecastValue = (analysis.projecaoMoagem && analysis.projecaoMoagem.forecast) ? analysis.projecaoMoagem.forecast : 0;
            const metaDiaria = parseFloat(localStorage.getItem('metaMoagem') || '18500');
            const diff = forecastValue - metaDiaria;
            const isAboveMeta = diff >= 0;

            const elForecastVal = document.getElementById('moagemForecast');
            const elStatusBadge = document.getElementById('moagemStatus');
            
            const activeColor = isAboveMeta ? this.COLORS.GREEN : this.COLORS.RED;
            
            if (elForecastVal) {
                elForecastVal.textContent = (typeof Utils !== 'undefined' ? Utils.formatNumber(forecastValue) : forecastValue.toLocaleString()) + ' t';
                elForecastVal.style.color = activeColor;
            }
            
            const elDiff = document.getElementById('forecastDifferenceContainer');
            if (elDiff) {
                elDiff.style.display = 'none'; 
            }
            
            if (elStatusBadge) {
                elStatusBadge.innerHTML = '';
                
                if (isAboveMeta) {
                     elStatusBadge.className = 'forecast-badge active';
                     elStatusBadge.style.backgroundColor = 'rgba(64, 128, 12, 0.1)';
                     elStatusBadge.style.color = this.COLORS.GREEN;
                     elStatusBadge.style.border = `1px solid ${this.COLORS.GREEN}`;
                     elStatusBadge.textContent = 'Bater a meta';
                } else {
                     elStatusBadge.className = 'forecast-badge danger';
                     elStatusBadge.style.backgroundColor = 'rgba(255, 46, 99, 0.1)';
                     elStatusBadge.style.color = this.COLORS.RED;
                     elStatusBadge.style.border = `1px solid ${this.COLORS.RED}`;
                     elStatusBadge.textContent = 'Abaixo da meta';
                }
            }
            
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
                 const targetValue = parseFloat(localStorage.getItem('metaMoagem') || '18500');
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