// dataanalyzer.js - VERSÃO BLINDADA CONTRA LINHAS DE TOTAL (CORREÇÃO FINAL)

if (typeof DataAnalyzer === 'undefined') {
    class DataAnalyzer {
        // --- CONSTANTES DE NEGÓCIO ---
        static FROTA_PROPRIA = ['31', '32'];
        static FROTA_TERCEIROS = ['91'];
        static EQUIPAMENTO_PROPRIO = ['80'];
        static EQUIPAMENTO_TERCEIROS = ['93'];

        constructor() {
            // Inicializa Submódulos de Análise
            if (typeof DataAnalyzerKPIs !== 'undefined') this.kpisModule = new DataAnalyzerKPIs(this);
            if (typeof DataAnalyzerRankings !== 'undefined') this.rankingsModule = new DataAnalyzerRankings(this);
            if (typeof DataAnalyzerTime !== 'undefined') this.timeModule = new DataAnalyzerTime(this);
        }

        /**
         * Verifica se um registro pertence ao contexto 'Própria'.
         */
        isPropria(row) {
            const dscTipo = (row.dscTipoPropFrota || '').toUpperCase().trim();
            if (dscTipo === 'PROPRIO') return true;

            const frota = (row.frota || '').toString().trim();
            let equipRaw = row.equipamento;
            if (!equipRaw && Array.isArray(row.equipamentos) && row.equipamentos.length > 0) {
                equipRaw = row.equipamentos[0];
            }
            const equip = (equipRaw || '').toString().trim();

            if (DataAnalyzer.FROTA_PROPRIA.some(p => frota.startsWith(p))) return true;
            if (DataAnalyzer.EQUIPAMENTO_PROPRIO.some(p => equip.startsWith(p))) return true;

            return false;
        }

        /**
         * Verifica se um registro pertence ao contexto 'Terceiros'.
         */
        isTerceiro(row) {
            const dscTipo = (row.dscTipoPropFrota || '').toUpperCase().trim();
            if (dscTipo === 'TERCEIROS' || dscTipo === 'FORNECEDOR' || dscTipo === 'FRETISTA') return true;

            const frota = (row.frota || '').toString().trim();
            let equipRaw = row.equipamento;
            if (!equipRaw && Array.isArray(row.equipamentos) && row.equipamentos.length > 0) {
                equipRaw = row.equipamentos[0];
            }
            const equip = (equipRaw || '').toString().trim();

            if (DataAnalyzer.FROTA_TERCEIROS.some(p => frota.startsWith(p))) return true;
            if (DataAnalyzer.EQUIPAMENTO_TERCEIROS.some(p => equip.startsWith(p))) return true;

            return false;
        }

        /**
         * 🔥 FUNÇÃO DE FILTRAGEM BLINDADA (NUCLEAR) 🔥
         * Identifica qualquer resquício de linha de soma/total do Google Sheets.
         */
        isAggregationRow(row) {
            if (!row) return true;

            // 1. VARREDURA GLOBAL: Procura 'TOTAL' em qualquer campo de texto da linha
            // Isso resolve casos onde o 'Total' aparece na coluna Fazenda, Descrição ou Viagem
            try {
                const values = Object.values(row);
                for (let val of values) {
                    if (typeof val === 'string') {
                        const s = val.toUpperCase().trim();
                        // Se encontrar a palavra TOTAL isolada ou no início da frase
                        if (s === 'TOTAL' || s.startsWith('TOTAL ') || s.includes(' TOTAL')) {
                            return true;
                        }
                    }
                }
            } catch (e) {
                console.warn("Erro na verificação de linha:", e);
            }

            // 2. VERIFICAÇÃO ESPECÍFICA DE VIAGEM (Caso mais comum)
            const viagem = String(row.viagem || row.Viagem || row.idViagem || '').toUpperCase().trim();
            if (viagem === 'TOTAL' || viagem === 'Total') return true;

            // 3. HEURÍSTICA DE ESTRUTURA (Para linhas de rodapé que não têm texto 'Total')
            // Linhas de soma geralmente têm PESO mas não têm EQUIPAMENTO nem OPERADOR.
            const temPeso = (parseFloat(row.peso) || 0) > 0;
            const temEquipamento = row.equipamento || (row.equipamentos && row.equipamentos.length > 0);
            const temOperador = row.op1_cod || row.codMotorista || row.operador;
            
            // Se tem peso, mas não tem equipamento E não tem identificação de viagem válida
            // É quase certeza que é uma linha de totalização perdida
            if (temPeso && !temEquipamento && (!viagem || viagem === '0' || viagem === 'undefined')) {
                return true;
            }

            return false;
        }

        // Validação de código de colhedora (usado para distribuição)
        _isValidHarvesterCode(code) {
            if (!code) return false;
            const s = code.toString().trim();
            return /^(80|93)\d{3,4}$/.test(s);
        }

        _extractEquipments(row) {
            const allEquipment = [];
            if (row.equipamento && !this.isAggregationRow(row)) {
                allEquipment.push(row.equipamento);
            }
            if (row.equipamentos && Array.isArray(row.equipamentos)) {
                const validos = row.equipamentos.filter(e => e && !String(e).toUpperCase().includes('TOTAL'));
                allEquipment.push(...validos);
            }
            return [...new Set(allEquipment)];
        }

        /**
         * Coleta metadados das frentes (liberação e conflitos)
         */
        _getFrontMetadata(data, allAnomalies) {
            const frontMap = new Map();
            const conflictingLib = new Set();
            const conflictingHarv = new Set();

            if (allAnomalies && Array.isArray(allAnomalies)) {
                allAnomalies.forEach(a => {
                    if (a.type === 'LIBERACAO_CONFLITO') conflictingLib.add(a.liberacao);
                    if (a.type === 'COLHEDORA_CONFLITO_FRONTES') conflictingHarv.add(a.colhedora);
                });
            }

            data.forEach(row => {
                // Filtro de segurança já aplicado, mas reforçamos
                if (this.isAggregationRow(row) || !row.frente || !row.liberacao) return;

                const frente = (row.frente || '').toString().trim();
                const liberacao = (row.liberacao || '').toString().trim();
                const allEquipment = this._extractEquipments(row);
                const validHarvesters = allEquipment.filter(eq => this._isValidHarvesterCode(eq));

                if (!frontMap.has(frente)) {
                    frontMap.set(frente, { liberacaoMap: new Map(), isLibConflict: false, isHarvConflict: false });
                }

                const fData = frontMap.get(frente);
                fData.liberacaoMap.set(liberacao, (fData.liberacaoMap.get(liberacao) || 0) + 1);

                if (conflictingLib.has(liberacao)) fData.isLibConflict = true;
                validHarvesters.forEach(h => {
                    if (conflictingHarv.has(h)) fData.isHarvConflict = true;
                });
            });

            const result = new Map();
            frontMap.forEach((fData, frente) => {
                let mostCommonLib = 'N/A';
                let maxCount = 0;
                fData.liberacaoMap.forEach((count, lib) => {
                    if (count > maxCount) { maxCount = count; mostCommonLib = lib; }
                });
                result.set(frente, { liberacao: mostCommonLib, isLibConflict: fData.isLibConflict, isHarvConflict: fData.isHarvConflict });
            });
            return result;
        }

        // Funções Auxiliares de Frente
        getHarvesterContributionByFront(data) {
            const frontHarvesterMap = new Map();
            data.forEach(row => {
                // FILTRO DE SEGURANÇA
                if (this.isAggregationRow(row)) return;

                const frente = (row.frente || '').toString().trim();
                const peso = parseFloat(row.peso) || 0;
                const allEquipment = this._extractEquipments(row);
                
                if (!frente || allEquipment.length === 0 || peso === 0) return;
                
                const validHarvesters = allEquipment.filter(eq => this._isValidHarvesterCode(eq));
                if (validHarvesters.length === 0) return;
                const distributedPeso = peso / validHarvesters.length;

                if (!frontHarvesterMap.has(frente)) {
                    frontHarvesterMap.set(frente, { totalWeight: 0, harvesters: new Map(), variedade: row.variedade || 'N/A' });
                }
                const frontData = frontHarvesterMap.get(frente);
                frontData.totalWeight += peso;
                validHarvesters.forEach(equipamento => { 
                    const eqStr = (equipamento || '').toString().trim();
                    if (!frontData.harvesters.has(eqStr)) frontData.harvesters.set(eqStr, { codigo: eqStr, peso: 0 });
                    frontData.harvesters.get(eqStr).peso += distributedPeso;
                });
            });

            const finalResults = {};
            frontHarvesterMap.forEach((frontData, frente) => {
                const total = frontData.totalWeight;
                finalResults[frente] = Array.from(frontData.harvesters.values()).map(h => ({
                    codigo: h.codigo, peso: h.peso,
                    percent: total > 0 ? parseFloat(((h.peso / total) * 100).toFixed(1)) : 0,
                    propriedade: DataAnalyzer.EQUIPAMENTO_PROPRIO.some(p => h.codigo.startsWith(p)) ? 'Própria' : 'Terceira'
                })).sort((a, b) => b.peso - a.peso);
            });
            return finalResults;
        }
        
        analyzeFrontsComplete(data, frontMetadata) {
            const frentesMap = new Map();
            const harvesterContributionMap = this.getHarvesterContributionByFront(data);

            data.forEach(row => {
                if (this.isAggregationRow(row)) return;

                const viagem = row.viagem || row.idViagem;
                const frota = row.frota;
                const frente = row.frente;
                if (!viagem || !frota || !frente) return;
                
                const chaveFrente = String(frente).trim();
                if (!frentesMap.has(chaveFrente)) {
                    frentesMap.set(chaveFrente, {
                        viagensSet: new Set(), analisadasSet: new Set(), pesoTotal: 0,
                        variedade: row.variedade || 'N/A',
                        fazendaData: { cod: row.codFazenda || 'N/A', desc: row.descFazenda || 'N/A' }
                    });
                }
                const fData = frentesMap.get(chaveFrente);
                fData.viagensSet.add(`${viagem}_${frota}`);
                fData.pesoTotal += parseFloat(row.peso) || 0;
                
                const analisado = row.analisado;
                if (analisado === true || analisado === 'SIM' || String(analisado).toUpperCase().includes('SIM')) {
                    fData.analisadasSet.add(`${viagem}_${frota}`);
                }
            });

            return Array.from(frentesMap.entries()).map(([codFrente, data]) => {
                const viagens = data.viagensSet.size;
                const analisadas = data.analisadasSet.size;
                const taxaAnalise = viagens > 0 ? (analisadas / viagens) * 100 : 0;
                const metadata = frontMetadata.get(codFrente) || {};
                
                let status = 'active';
                let statusText = 'Alta';
                const isConflict = metadata.isLibConflict || metadata.isHarvConflict;
                const finalTaxa = Math.round(taxaAnalise);

                if (isConflict) { status = 'critical'; statusText = 'ALERTA CRÍTICO'; }
                else if (finalTaxa < 30) { status = 'critical'; statusText = 'Baixa'; }
                else if (finalTaxa <= 35) { status = 'warning'; statusText = 'Média'; }

                return {
                    codFrente: codFrente,
                    codFazenda: data.fazendaData.cod,
                    descFazenda: data.fazendaData.desc,
                    fazenda: `${data.fazendaData.cod} / ${data.fazendaData.desc}`,
                    variedade: data.variedade,
                    viagens: viagens,
                    pesoTotal: parseFloat(data.pesoTotal.toFixed(2)),
                    analisadas: analisadas,
                    produtividade: viagens > 0 ? parseFloat((data.pesoTotal / viagens).toFixed(2)) : 0,
                    taxaAnalise: finalTaxa,
                    status: status, statusText: statusText,
                    harvesterContribution: harvesterContributionMap[codFrente] || [],
                    liberacao: metadata.liberacao || 'N/A',
                    isLibConflict: !!metadata.isLibConflict,
                    isHarvConflict: !!metadata.isHarvConflict
                };
            }).sort((a, b) => b.pesoTotal - a.pesoTotal);
        }

        getEmptyAnalysis(potentialData = []) {
            return {
                totalViagens: 0, viagensProprias: 0, viagensTerceiros: 0, frotaMotrizDistinta: 0,
                totalPesoLiquido: 0, taxaAnalise: 0, distribuicaoFrota: { propria: 0, terceiros: 0 },
                potentialData: [], topFrotasProprias: [], topFrotasTerceiros: [],
                topEquipamentosProprios: [], topEquipamentosTerceiros: [], topTransbordos: [],
                topOperadoresColheitaPropria: [], topCamEscravo: [],
                ownerTypeData: { propria: 0, fornecedor: 0, total: 0 },
                lastTripAverage: 0, lastTripCount: 0,
                analise24h: [], fleetHourly: [], frentes: [],
                equipmentDistribution: { propria: 0, terceiros: 0 },
                projecaoMoagem: { forecast: 0, rhythm: 0, hoursPassed: 0, status: 'Sem dados' },
                data: [], potentialRawData: potentialData, requiredHourlyRates: [],
                metaData: null, lastExitTimestamp: null, lastExitTimestampFormatted: 'Aguardando dados.',
                acumuladoSafra: 0
            };
        }

        _findLastExitTimestamp(data) {
            let lastTimestamp = null;
            data.forEach(row => {
                if (this.isAggregationRow(row) || !row.timestamp || !(row.timestamp instanceof Date)) return;
                if (!lastTimestamp || row.timestamp > lastTimestamp) lastTimestamp = row.timestamp;
            });
            return lastTimestamp;
        }

        /**
         * ORQUESTRADOR PRINCIPAL
         */
        analyzeAll(data, potentialData = [], metaData = [], validationResult = { anomalies: [] }, acmSafraData = []) {
            if (!Array.isArray(data) || data.length === 0) {
                const empty = this.getEmptyAnalysis(potentialData);
                if (this.kpisModule && this.kpisModule.calculateAcumuladoSafra) {
                    empty.acumuladoSafra = this.kpisModule.calculateAcumuladoSafra(null, acmSafraData);
                }
                return empty;
            }

            // --- FILTRAGEM ABSOLUTA ANTES DE QUALQUER CÁLCULO ---
            // Remove qualquer linha que se pareça com TOTAL
            const filteredData = data.filter(row => !this.isAggregationRow(row));

            const lastExitTimestamp = this._findLastExitTimestamp(filteredData);
            
            // --- 1. CHAMADAS AOS MÓDULOS (USANDO filteredData) ---
            
            const contagemViagens = this.kpisModule.countUniqueTrips(filteredData);
            const totalPesoLiquido = this.kpisModule.calculateTotalWeightComplete(filteredData);
            const taxaAnalise = this.kpisModule.calculateAnalysisRateByTrip(filteredData);
            const distribuicaoFrota = this.kpisModule.analyzeFleetDistributionComplete(filteredData);
            const lastTripAvgResult = this.kpisModule.calculateLastTripAverage(filteredData);
            const equipmentDistribution = this.kpisModule.getEquipmentDistribution(filteredData);
            const ownerTypeData = this.kpisModule.analyzeOwnerType(filteredData);
            const acumuladoSafra = this.kpisModule.calculateAcumuladoSafra(null, acmSafraData);

            const analise24h = this.timeModule.analyze24hComplete(filteredData);
            const fleetHourly = this.timeModule.analyzeFleetHourly(filteredData);
            const frontsData = this.timeModule.analyzeFrontHourlyComplete(filteredData);
            const projecaoMoagem = this.timeModule.calculateProjectionMoagem(filteredData, totalPesoLiquido);
            const requiredHourlyRates = this.timeModule.calculateRequiredHourlyRates(analise24h, totalPesoLiquido);

            const rankingData = filteredData.filter(row => (row.viagem || row.idViagem) && row.frota);
            
            const topFrotasProprias = this.rankingsModule.getTopFrota(rankingData, DataAnalyzer.FROTA_PROPRIA, false);
            const topFrotasTerceiros = this.rankingsModule.getTopFrota(rankingData, DataAnalyzer.FROTA_TERCEIROS, false);
            const topEquipamentosProprios = this.rankingsModule.getTopEquipamentos(rankingData, 'propria');
            const topEquipamentosTerceiros = this.rankingsModule.getTopEquipamentos(rankingData, 'terceiros');
            const topTransbordos = this.rankingsModule.getTopTransbordos(rankingData);
            const topOperadoresColheitaPropria = this.rankingsModule.getTopOperadoresColheitaPropria(rankingData);
            const topCamEscravo = this.rankingsModule.analyzeCamEscravo(rankingData);

            const frontMetadata = this._getFrontMetadata(filteredData, validationResult.anomalies);
            const frentes = this.analyzeFrontsComplete(filteredData, frontMetadata);

            let metaResult = new Map();
            if (this.rankingsModule.analyzeMetas) {
                metaResult = this.rankingsModule.analyzeMetas(metaData, frentes);
            }

            if (frentes && metaResult) {
                frentes.forEach(f => {
                    const meta = metaResult.get(String(f.codFrente));
                    if (meta) {
                        const rawMeta = meta.meta; 
                        let metaVal = typeof rawMeta === 'number' ? rawMeta : parseFloat(rawMeta);
                        f.potencialTotal = isNaN(metaVal) ? 0 : metaVal;
                    } else {
                        f.potencialTotal = 0;
                    }
                });
            }

            return {
                totalViagens: contagemViagens.total,
                viagensProprias: contagemViagens.proprias,
                viagensTerceiros: contagemViagens.terceiros,
                frotaMotrizDistinta: contagemViagens.frotaMotrizDistinta,
                totalPesoLiquido: totalPesoLiquido,
                taxaAnalise: taxaAnalise,
                distribuicaoFrota: distribuicaoFrota,
                potentialData: this.timeModule.analyzePotential(potentialData),

                topFrotasProprias,
                topFrotasTerceiros,
                topEquipamentosProprios,
                topEquipamentosTerceiros,
                topTransbordos,
                topOperadoresColheitaPropria,
                topCamEscravo,
                
                ownerTypeData,
                lastTripAverage: lastTripAvgResult.average,
                lastTripCount: lastTripAvgResult.count,

                analise24h,
                fleetHourly,
                frentes,
                equipmentDistribution,
                projecaoMoagem,
                requiredHourlyRates,
                
                lastExitTimestamp: lastExitTimestamp,
                lastExitTimestampFormatted: lastExitTimestamp ? lastExitTimestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : 'N/A',
                acumuladoSafra: acumuladoSafra,

                analyzeFrontHourly: (d) => this.timeModule.analyzeFrontHourlyComplete(d),
                data: filteredData, // Retorna os dados LIMPOS para o visualizador
                potentialRawData: potentialData,
                metaData: metaResult 
            };
        }
    }

    window.DataAnalyzer = DataAnalyzer;
}