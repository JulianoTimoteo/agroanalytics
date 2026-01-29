/**
 * ============================================================================
 * 🧠 AGRO INTELLIGENCE CHATBOX - V10.1 CONTENTEDITABLE EDITION
 * ============================================================================
 * SOLUÇÃO PARA INPUT TRAVADO:
 * ✅ Usa ContentEditable DIV em vez de <input>
 * ✅ Impossível de bloquear por listeners externos
 * ✅ Captura agressiva de eventos com useCapture
 */

(function() {
    'use strict';
    
    const INSTANCE_KEY = '_AgroIntelligenceV10_Instance';
    
    if (window[INSTANCE_KEY]) {
        console.log('⚠️ AgroIntelligence já está rodando.');
        return;
    }

    class AgroIntelligenceV10 {
        constructor() {
            this.version = '10.1';
            this.isOpen = false;
            this.context = { lastFront: null };
            
            this.fmtNumber = new Intl.NumberFormat('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            
            this.fmtInt = new Intl.NumberFormat('pt-BR', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
            });

            this._injectStyles();
            this._renderUI();
            this._setupEvents();
            this._initFirebase();

            console.log(`✅ AgroIntelligence V${this.version} - ContentEditable Mode`);
        }

        _initFirebase() {
            this.firebase = window.firebase;
            this.db = null;
            
            if (this.firebase && this.firebase.firestore) {
                try {
                    this.db = this.firebase.firestore();
                } catch(e) {}
            }
        }

        async _saveToFirebase(question, answer, frontNumber = null) {
            if (!this.db) return;
            
            try {
                await this.db.collection('agro_chat_logs').add({
                    question: question,
                    answer: answer.substring(0, 500),
                    front: frontNumber,
                    timestamp: new Date(),
                    version: this.version
                });
            } catch(e) {}
        }

        _getGlobalData() {
            return window.agriculturalDashboard?.analysisResult || null;
        }

        _parseNumber(val) {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            
            let str = String(val).trim().replace(/\s/g, '');
            
            if (str.includes(',') && str.includes('.')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else if (str.includes(',')) {
                str = str.replace(',', '.');
            }
            
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        }

        _deepDiveFront(frontNumber) {
            const globalData = this._getGlobalData();
            if (!globalData) return null;

            const frontStr = String(frontNumber).trim();

            let metaInfo = {
                meta: 0, cod_fazenda: 'N/D', desc_fazenda: 'Não identificada',
                liberacao_ativa: 'N/D', tmd: 0, atr: 0, cd: 0, raio: 0,
                potencial_entrega_total: 0, maturador: 'Não', 
                possivel_reforma: 'Não', proprietario: 'N/D'
            };

            if (globalData.metaData && globalData.metaData instanceof Map) {
                for (let [key, value] of globalData.metaData) {
                    const keyClean = String(key).replace(/\D/g, '');
                    if (keyClean === frontStr) {
                        metaInfo = { ...metaInfo, ...value };
                        break;
                    }
                }
            }

            if (metaInfo.meta === 0 && globalData.frentes) {
                const frontObj = globalData.frentes.find(f => 
                    String(f.codFrente).replace(/\D/g, '') === frontStr
                );
                if (frontObj) {
                    metaInfo.meta = this._parseNumber(frontObj.meta);
                    metaInfo.cod_fazenda = frontObj.codFazenda || 'N/D';
                    metaInfo.desc_fazenda = frontObj.descFazenda || frontObj.fazenda || 'N/D';
                    metaInfo.liberacao_ativa = frontObj.liberacao || 'N/D';
                }
            }

            const rawData = (globalData.data || []).filter(row => {
                const rowFront = String(row.frente || '').replace(/\D/g, '');
                return rowFront === frontStr;
            });

            if (rawData.length === 0 && metaInfo.meta === 0) return null;

            const totalPeso = rawData.reduce((sum, row) => 
                sum + this._parseNumber(row.peso), 0
            );

            const totalViagens = rawData.length;
            const densidade = totalViagens > 0 ? totalPeso / totalViagens : 0;

            const viagensAnalisadas = rawData.filter(row => {
                const val = String(row.analisado || '').toUpperCase();
                return val.includes('SIM') || val.includes('S') || val === 'TRUE' || val === '1';
            }).length;

            const taxaAnalise = totalViagens > 0 ? 
                (viagensAnalisadas / totalViagens) * 100 : 0;

            const colhedorasMap = new Map();
            
            rawData.forEach(row => {
                let eqCode = row.equipamento || row.colhedora || row.equipamentos || '';
                eqCode = String(eqCode)
                    .toUpperCase()
                    .replace(/COLHEDORA|COLH\.|COLH/g, '')
                    .trim();
                
                if (!eqCode || eqCode === 'N/D') return;

                const peso = this._parseNumber(row.peso);
                
                if (!colhedorasMap.has(eqCode)) {
                    colhedorasMap.set(eqCode, 0);
                }
                colhedorasMap.set(eqCode, colhedorasMap.get(eqCode) + peso);
            });

            const colhedoras = Array.from(colhedorasMap.entries())
                .map(([code, peso]) => ({
                    codigo: code,
                    peso: peso,
                    percentual: totalPeso > 0 ? (peso / totalPeso) * 100 : 0
                }))
                .sort((a, b) => b.peso - a.peso);

            const metaValue = this._parseNumber(metaInfo.meta);
            const progresso = metaValue > 0 ? (totalPeso / metaValue) * 100 : 0;
            const gap = totalPeso - metaValue;

            let status = 'Em andamento';
            let statusColor = '#FFB800';
            
            if (progresso >= 100) {
                status = '🎉 META BATIDA! Parabéns!';
                statusColor = '#40800c';
            } else if (progresso >= 80) {
                status = 'Próximo da meta';
                statusColor = '#00D4FF';
            } else if (progresso < 50) {
                status = 'Início de colheita';
                statusColor = '#FF8C00';
            }

            return {
                numero: frontStr,
                fazenda: metaInfo.desc_fazenda,
                codFazenda: metaInfo.cod_fazenda,
                liberacao: metaInfo.liberacao_ativa,
                proprietario: metaInfo.proprietario,
                meta: metaValue,
                tmd: this._parseNumber(metaInfo.tmd),
                atr: this._parseNumber(metaInfo.atr),
                qtdColhedoras: this._parseNumber(metaInfo.cd),
                raio: this._parseNumber(metaInfo.raio),
                potencial: this._parseNumber(metaInfo.potencial_entrega_total),
                maturador: metaInfo.maturador,
                possivelReforma: metaInfo.possivel_reforma,
                realizado: totalPeso,
                viagens: totalViagens,
                densidade: densidade,
                analisesQtd: viagensAnalisadas,
                analisesPerc: taxaAnalise,
                progresso: progresso,
                gap: gap,
                status: status,
                statusColor: statusColor,
                colhedoras: colhedoras
            };
        }

        async processCommand(userInput) {
            const text = userInput.trim();
            if (!text) return;

            this._appendMessage(text, 'user');
            await new Promise(r => setTimeout(r, 400));

            const globalData = this._getGlobalData();
            if (!globalData) {
                this._appendMessage("⚠️ Aguardando dados...", 'bot');
                return;
            }

            const lower = text.toLowerCase();
            const frontMatch = text.match(/(\d+)/);
            let targetFront = frontMatch ? frontMatch[1] : null;

            if (!targetFront && this.context.lastFront) {
                if (lower.includes('ela') || lower.includes('meta') || 
                    lower.includes('resumo') || lower.includes('status')) {
                    targetFront = this.context.lastFront;
                }
            }

            if (targetFront) {
                this.context.lastFront = targetFront;
                const analysis = this._deepDiveFront(targetFront);
                
                if (!analysis) {
                    this._appendMessage(
                        `❌ Frente ${targetFront} não encontrada.`, 
                        'bot'
                    );
                    return;
                }

                const report = this._generateFrontReport(analysis);
                this._appendMessage(report, 'bot');
                await this._saveToFirebase(text, `Análise Frente ${targetFront}`, targetFront);
                return;
            }

            if (lower.includes('projeção') || lower.includes('projecao') || 
                lower.includes('usina') || lower.includes('total')) {
                const projection = this._generateGlobalProjection();
                this._appendMessage(projection, 'bot');
                await this._saveToFirebase(text, 'Projeção Geral');
                return;
            }

            if (lower.includes('boletim') || lower.includes('resumo') || 
                lower.includes('geral')) {
                const summary = this._generateBoletim();
                this._appendMessage(summary, 'bot');
                await this._saveToFirebase(text, 'Boletim Geral');
                return;
            }

            if (lower.includes('frentes') || lower.includes('lista')) {
                const list = this._listActiveFronts();
                this._appendMessage(list, 'bot');
                return;
            }

            this._appendMessage(`
                🤖 <strong>Comandos:</strong><br><br>
                📌 <strong>"Frente 13"</strong><br>
                📊 <strong>"Projeção"</strong><br>
                📋 <strong>"Boletim"</strong><br>
                📝 <strong>"Frentes"</strong>
            `, 'bot');
        }

        _generateFrontReport(data) {
            let statusIcon = data.progresso >= 100 ? '🎉' : 
                            data.progresso >= 80 ? '⚡' : '🔄';

            let colhedorasHtml = '';
            data.colhedoras.forEach((col, idx) => {
                colhedorasHtml += `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(255,255,255,0.1);">
                        <span>C${idx+1} - <strong>${col.codigo}</strong></span>
                        <span style="color:#00D4FF;">${col.percentual.toFixed(1)}% (${this.fmtNumber.format(col.peso)}t)</span>
                    </div>
                `;
            });

            return `
                <div style="background:rgba(0,212,255,0.05); padding:15px; border-left:4px solid ${data.statusColor}; border-radius:8px;">
                    <div style="font-size:1.3rem; font-weight:bold; color:#fff; margin-bottom:10px;">
                        ${statusIcon} Frente ${data.numero}
                    </div>
                    
                    <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:6px; margin-bottom:12px;">
                        <div style="font-size:0.85rem; color:#aaa; margin-bottom:8px;">
                            <strong style="color:#00D4FF;">Fazenda:</strong> ${data.fazenda}
                        </div>
                        <div style="font-size:0.85rem; color:#aaa; margin-bottom:8px;">
                            <strong style="color:#00D4FF;">Proprietário:</strong> ${data.proprietario}
                        </div>
                        <div style="font-size:0.85rem; color:#aaa;">
                            <strong style="color:#00D4FF;">Liberação:</strong> ${data.liberacao}
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; text-align:center;">
                            <div style="font-size:1.5rem; font-weight:bold; color:#40800c;">
                                ${this.fmtNumber.format(data.realizado)}t
                            </div>
                            <div style="font-size:0.75rem; color:#aaa;">Colhido</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; text-align:center;">
                            <div style="font-size:1.5rem; font-weight:bold; color:#FFB800;">
                                ${this.fmtNumber.format(data.meta)}t
                            </div>
                            <div style="font-size:0.75rem; color:#aaa;">Meta</div>
                        </div>
                    </div>

                    <div style="background:${data.statusColor}20; padding:12px; border-radius:6px; margin-bottom:12px; text-align:center;">
                        <div style="font-size:1.2rem; font-weight:bold; color:${data.statusColor};">
                            ${data.progresso.toFixed(1)}% Concluído
                        </div>
                        <div style="font-size:0.8rem; color:#ccc; margin-top:5px;">
                            ${data.status}
                        </div>
                        ${data.gap > 0 ? 
                            `<div style="font-size:0.75rem; color:#40800c; margin-top:5px;">
                                +${this.fmtNumber.format(data.gap)}t acima da meta
                            </div>` : 
                            data.gap < 0 ?
                            `<div style="font-size:0.75rem; color:#FF8C00; margin-top:5px;">
                                Faltam ${this.fmtNumber.format(Math.abs(data.gap))}t
                            </div>` : ''
                        }
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; font-size:0.8rem;">
                        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; text-align:center;">
                            <div style="color:#00D4FF; font-weight:bold;">${data.viagens}</div>
                            <div style="color:#aaa; font-size:0.7rem;">Viagens</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; text-align:center;">
                            <div style="color:#00D4FF; font-weight:bold;">${this.fmtNumber.format(data.densidade)}t</div>
                            <div style="color:#aaa; font-size:0.7rem;">Densidade</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; text-align:center;">
                            <div style="color:#00D4FF; font-weight:bold;">${data.analisesPerc.toFixed(0)}%</div>
                            <div style="color:#aaa; font-size:0.7rem;">Análises</div>
                        </div>
                    </div>

                    ${data.colhedoras.length > 0 ? `
                        <div style="margin-top:15px;">
                            <div style="font-size:0.9rem; color:#00D4FF; font-weight:bold; margin-bottom:8px;">
                                🚜 Contribuição das Colhedoras:
                            </div>
                            ${colhedorasHtml}
                        </div>
                    ` : ''}

                    <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.75rem; color:#888;">
                        <div><strong>TMD:</strong> ${this.fmtNumber.format(data.tmd)} | <strong>ATR:</strong> ${this.fmtNumber.format(data.atr)}</div>
                        <div><strong>Raio:</strong> ${this.fmtNumber.format(data.raio)}km | <strong>Potencial:</strong> ${this.fmtInt.format(data.potencial)}t</div>
                    </div>
                </div>
            `;
        }

        _generateGlobalProjection() {
            const data = this._getGlobalData();
            if (!data) return 'Sem dados.';

            const totalReal = data.totalPesoLiquido || 0;
            const meta = this._parseNumber(localStorage.getItem('metaMoagem')) || 25000;

            const now = new Date();
            let hoursElapsed = now.getHours() - 6;
            if (hoursElapsed < 0) hoursElapsed += 24;
            hoursElapsed += now.getMinutes() / 60;

            const fluxo = hoursElapsed > 0.1 ? totalReal / hoursElapsed : 0;
            const hoursRemaining = 24 - hoursElapsed;
            const projecao = totalReal + (fluxo * hoursRemaining);

            const statusColor = projecao >= meta ? '#40800c' : '#FF2E63';
            const statusText = projecao >= meta ? '✅ Baterá a meta!' : '⚠️ Abaixo';

            return `
                <div style="background:rgba(0,212,255,0.05); padding:15px; border-left:4px solid #00D4FF; border-radius:8px;">
                    <div style="font-size:1.2rem; font-weight:bold; color:#fff; margin-bottom:12px;">
                        🏭 Projeção da Usina
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px;">
                            <div style="font-size:0.75rem; color:#aaa;">Realizado</div>
                            <div style="font-size:1.3rem; font-weight:bold; color:#00D4FF;">
                                ${this.fmtNumber.format(totalReal)}t
                            </div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px;">
                            <div style="font-size:0.75rem; color:#aaa;">Meta</div>
                            <div style="font-size:1.3rem; font-weight:bold; color:#FFB800;">
                                ${this.fmtNumber.format(meta)}t
                            </div>
                        </div>
                    </div>

                    <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:6px; margin-bottom:10px;">
                        <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">Fluxo</div>
                        <div style="font-size:1.1rem; font-weight:bold; color:#fff;">
                            ${this.fmtNumber.format(fluxo)} t/h
                        </div>
                    </div>

                    <div style="background:${statusColor}20; padding:15px; border-radius:6px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:bold; color:${statusColor};">
                            ${this.fmtNumber.format(projecao)}t
                        </div>
                        <div style="font-size:0.85rem; color:#ccc; margin-top:5px;">
                            Projeção Final
                        </div>
                        <div style="font-size:0.8rem; color:${statusColor}; margin-top:8px; font-weight:bold;">
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }

        _generateBoletim() {
            const data = this._getGlobalData();
            if (!data) return 'Sem dados.';

            const frentesAtivas = (data.frentes || []).length;
            const totalPeso = data.totalPesoLiquido || 0;
            const taxaAnalise = data.taxaAnalise || 0;

            return `
                <div style="background:rgba(0,212,255,0.05); padding:15px; border-left:4px solid #7B61FF; border-radius:8px;">
                    <div style="font-size:1.2rem; font-weight:bold; color:#fff; margin-bottom:12px;">
                        📋 Boletim do Dia
                    </div>
                    
                    <div style="font-size:0.9rem; line-height:1.8; color:#ddd;">
                        <div>🏭 <strong>Moagem:</strong> ${this.fmtNumber.format(totalPeso)} t</div>
                        <div>🌾 <strong>Frentes:</strong> ${frentesAtivas}</div>
                        <div>🧪 <strong>Análise:</strong> ${taxaAnalise.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        }

        _listActiveFronts() {
            const data = this._getGlobalData();
            if (!data || !data.frentes) return 'Sem frentes.';

            let html = `
                <div style="background:rgba(0,212,255,0.05); padding:15px; border-left:4px solid #00D4FF; border-radius:8px;">
                    <div style="font-size:1.1rem; font-weight:bold; color:#fff; margin-bottom:10px;">
                        📍 Frentes Ativas
                    </div>
            `;

            data.frentes.slice(0, 10).forEach(f => {
                html += `
                    <div style="padding:8px; border-bottom:1px dashed rgba(255,255,255,0.1); font-size:0.85rem;">
                        <strong style="color:#00D4FF;">Frente ${f.codFrente}</strong> - ${f.descFazenda || f.fazenda || 'N/D'}
                    </div>
                `;
            });

            html += `</div>`;
            return html;
        }

        _appendMessage(content, type = 'bot') {
            const container = document.getElementById('chat-messages-v10');
            if (!container) return;

            const msg = document.createElement('div');
            msg.className = `msg-v10 ${type}`;
            msg.innerHTML = content;
            container.appendChild(msg);
            container.scrollTop = container.scrollHeight;
        }

        _injectStyles() {
            if (document.getElementById('agro-v10-styles')) return;

            const style = document.createElement('style');
            style.id = 'agro-v10-styles';
            style.innerHTML = `
                #agro-chat-v10-container {
                    position: fixed; bottom: 20px; right: 20px;
                    z-index: 2147483647; font-family: 'Segoe UI', sans-serif;
                    pointer-events: none;
                }
                #agro-chat-v10-trigger, #agro-chat-v10-window { pointer-events: auto !important; }
                #agro-chat-v10-trigger {
                    width: 60px; height: 60px;
                    background: linear-gradient(135deg, #00D4FF, #0056b3);
                    border-radius: 50%; display: flex; align-items: center;
                    justify-content: center; cursor: pointer;
                    box-shadow: 0 6px 20px rgba(0,212,255,0.5);
                    border: 2px solid rgba(255,255,255,0.3);
                }
                #agro-chat-v10-trigger:hover { transform: scale(1.1); }
                #agro-chat-v10-trigger i { font-size: 28px; color: white; }
                #agro-chat-v10-window {
                    position: absolute; bottom: 80px; right: 0;
                    width: 380px; height: 600px; background: #0F1218;
                    border: 1px solid #333; border-radius: 12px;
                    display: none; flex-direction: column;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.9);
                }
                #agro-chat-v10-window.open { display: flex; animation: slideUp 0.3s ease; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .chat-header-v10 {
                    padding: 15px; background: linear-gradient(135deg, #181C25, #0F1218);
                    border-bottom: 2px solid #00D4FF; display: flex;
                    justify-content: space-between; align-items: center;
                }
                .chat-header-v10 .title {
                    display: flex; align-items: center; gap: 10px;
                    color: #fff; font-weight: bold; font-size: 1rem;
                }
                .chat-header-v10 .title i { color: #00D4FF; font-size: 1.2rem; }
                .chat-header-v10 .close-btn {
                    cursor: pointer; color: #888; font-size: 1.2rem;
                }
                .chat-header-v10 .close-btn:hover { color: #FF2E63; }
                #chat-messages-v10 {
                    flex: 1; padding: 15px; overflow-y: auto; background: #0F1218;
                }
                #chat-messages-v10::-webkit-scrollbar { width: 6px; }
                #chat-messages-v10::-webkit-scrollbar-track { background: #181C25; }
                #chat-messages-v10::-webkit-scrollbar-thumb { background: #00D4FF; border-radius: 3px; }
                .msg-v10 {
                    margin-bottom: 12px; padding: 12px; border-radius: 8px;
                    font-size: 0.9rem; line-height: 1.6; color: #eee;
                    max-width: 90%; word-wrap: break-word;
                }
                .msg-v10.bot {
                    background: #181C25; border-left: 3px solid #00D4FF;
                }
                .msg-v10.user {
                    background: linear-gradient(135deg, #0056b3, #003d82);
                    margin-left: auto; text-align: right; border-radius: 8px 8px 0 8px;
                }
                .chat-input-area-v10 {
                    padding: 12px; background: #181C25; border-top: 2px solid #00D4FF;
                    display: flex; gap: 10px;
                }
                #chat-input-v10 {
                    flex: 1; padding: 12px; border-radius: 20px;
                    border: 1px solid #333; background: #0F1218; color: #fff;
                    outline: none; font-size: 0.9rem; min-height: 20px;
                    cursor: text; position: relative; z-index: 999999;
                }
                #chat-input-v10:focus {
                    border-color: #00D4FF; box-shadow: 0 0 0 2px rgba(0,212,255,0.2);
                }
                #chat-input-v10:empty:before {
                    content: attr(data-placeholder); color: #666;
                }
                #chat-send-v10 {
                    width: 44px; height: 44px; border-radius: 50%; border: none;
                    background: linear-gradient(135deg, #00D4FF, #0056b3);
                    cursor: pointer; color: white; display: flex;
                    align-items: center; justify-content: center;
                }
                #chat-send-v10:hover { transform: scale(1.1); }
            `;
            
            document.head.appendChild(style);
        }

        _renderUI() {
            if (document.getElementById('agro-chat-v10-container')) return;

            const container = document.createElement('div');
            container.id = 'agro-chat-v10-container';
            container.innerHTML = `
                <div id="agro-chat-v10-trigger">
                    <i class="fas fa-brain"></i>
                </div>
                <div id="agro-chat-v10-window">
                    <div class="chat-header-v10">
                        <div class="title">
                            <i class="fas fa-robot"></i>
                            <span>AgroIntelligence V10.1</span>
                        </div>
                        <i class="fas fa-times close-btn" id="close-chat-v10"></i>
                    </div>
                    <div id="chat-messages-v10">
                        <div class="msg-v10 bot">
                            🧠 <strong>Sistema Iniciado</strong><br><br>
                            Digite <strong>"Frente 13"</strong>
                        </div>
                    </div>
                    <div class="chat-input-area-v10">
                        <div 
                            id="chat-input-v10" 
                            contenteditable="true"
                            data-placeholder="Digite sua pergunta..."
                        ></div>
                        <button id="chat-send-v10">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(container);
        }

        _setupEvents() {
            const trigger = document.getElementById('agro-chat-v10-trigger');
            const window = document.getElementById('agro-chat-v10-window');
            const input = document.getElementById('chat-input-v10');
            const sendBtn = document.getElementById('chat-send-v10');
            const closeBtn = document.getElementById('close-chat-v10');

            const toggleWindow = () => {
                window.classList.toggle('open');
                if (window.classList.contains('open')) {
                    setTimeout(() => {
                        input.focus();
                        // Move cursor to end
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(input);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }, 150);
                }
            };

            const sendMessage = () => {
                const text = input.textContent.trim();
                if (!text) return;
                input.textContent = '';
                this.processCommand(text);
            };

            // 🛡️ BLINDAGEM ULTRA AGRESSIVA
            const shield = (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            };

            // Captura ANTES de qualquer outro listener
            input.addEventListener('keydown', (e) => {
                shield(e);
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            }, true);

            input.addEventListener('keypress', shield, true);
            input.addEventListener('keyup', shield, true);
            input.addEventListener('input', shield, true);
            input.addEventListener('paste', shield, true);
            input.addEventListener('cut', shield, true);
            input.addEventListener('copy', shield, true);

            trigger.addEventListener('click', toggleWindow);
            closeBtn.addEventListener('click', toggleWindow);
            sendBtn.addEventListener('click', sendMessage);
        }
    }

    window[INSTANCE_KEY] = null;

    window.addEventListener('load', () => {
        setTimeout(() => {
            window[INSTANCE_KEY] = new AgroIntelligenceV10();
        }, 1200);
    });

})();