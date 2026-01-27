// dataanalyzer.js - VERSÃO FINAL CORRIGIDA (CÁLCULO DA META CORRETO)

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
            const equipamento = (equipRaw || '').toString().trim();

            if (DataAnalyzer.EQUIPAMENTO_PROPRIO.some(prefix => equipamento.startsWith(prefix))) return true;
            if (DataAnalyzer.FROTA_PROPRIA.some(prefix => frota.startsWith(prefix))) return true;

            return false;
        }

        /**
         * Verifica se um registro pertence ao contexto 'Terceiros'.
         */
        isTerceiro(row) {
            const dscTipo = (row.dscTipoPropFrota || '').toUpperCase().trim();
            if (dscTipo === 'FRETISTA') return true;

            const frota = (row.frota || '').toString().trim();

            let equipRaw = row.equipamento;
            if (!equipRaw && Array.isArray(row.equipamentos) && row.equipamentos.length > 0) {
                equipRaw = row.equipamentos[0];
            }
            const equipamento = (equipRaw || '').toString().trim();

            if (DataAnalyzer.EQUIPAMENTO_TERCEIROS.some(prefix => equipamento.startsWith(prefix))) return true;
            if (DataAnalyzer.FROTA_TERCEIROS.some(prefix => frota.startsWith(prefix))) return true;

            return false;
        }

        /**
         * Validador Rígido de Colhedora.
         */
        _isValidHarvesterCode(code) {
            if (!code) return false;
            const s = code.toString().trim();
            return /^(80|93)\d{3,4}$/.test(s);
        }

        /**
         * Método auxiliar para extrair equipamentos de todas as fontes possíveis na linha
         */
        _extractEquipments(row) {
            const allEquipment = [];
            if (row.equipamento && !row.equipamento.toString().toUpperCase().includes('TOTAL')) {
                allEquipment.push(row.equipamento);
            }
            if (row.equipamentos && Array.isArray(row.equipamentos)) {
                const validos = row.equipamentos.filter(e => e && !e.toString().toUpperCase().includes('TOTAL'));
                allEquipment.push(...validos);
            }
            return [...new Set(allEquipment)];
        }
        
        /**
         * @description Verifica se é linha de agregação/total para ignorar na análise geral.
         */
        isAggregationRow(row) {
            if (window.agriculturalDashboard && window.agriculturalDashboard.validator) {
                return window.agriculturalDashboard.validator.isAggregationRow(row);
            }

            if (!row) return true;
            
            if (row.qtdViagem && Math.abs(row.qtdViagem - 1) < 0.05) {
                return false;
            }
            
            const valuesStr = Object.values(row).join(' ').toUpperCase();
            return valuesStr.includes('TOTAL');
        }

        /**
         * Coleta metadados das frentes (liberação mais comum e conflitos)
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
                if (this.isAggregationRow(row) || !row.frente || !row.liberacao) return;

                const frente = (row.frente || '').toString().trim();
                const liberacao = (row.liberacao || '').toString().trim();
                const allEquipment = this._extractEquipments(row);
                const validHarvesters = allEquipment.filter(eq => this._isValidHarvesterCode(eq));

                if (!frontMap.has(frente)) {
                    frontMap.set(frente, {
                        liberacaoMap: new Map(),
                        isLibConflict: false,
                        isHarvConflict: false,
                    });
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
                    if (count > maxCount) {
                        maxCount = count;
                        mostCommonLib = lib;
                    }
                });

                result.set(frente, {
                    liberacao: mostCommonLib,
                    isLibConflict: fData.isLibConflict,
                    isHarvConflict: fData.isHarvConflict
                });
            });

            return result;
        }

        /**
         * Funções Auxiliares de Frente (Colhedoras)
         */
        getHarvesterContributionByFront(data) {
            const frontHarvesterMap = new Map();

            data.forEach(row => {
                const frente = (row.frente || '').toString().trim();
                const peso = parseFloat(row.peso) || 0;
                const allEquipment = this._extractEquipments(row);

                if (!frente || allEquipment.length === 0 || peso === 0 || this.isAggregationRow(row)) return;

                const validHarvesters = allEquipment.filter(eq => this._isValidHarvesterCode(eq));
                if (validHarvesters.length === 0) return;

                const distributedPeso = peso / validHarvesters.length;

                if (!frontHarvesterMap.has(frente)) {
                    frontHarvesterMap.set(frente, { totalWeight: 0, harvesters: new Map(), variedade: row.variedade || 'N/A' });
                }

                const frontData = frontHarvesterMap.get(frente);
                frontData.totalWeight += peso;
                const harvestersMap = frontData.harvesters;

                validHarvesters.forEach(equipamento => { 
                    const eqStr = (equipamento || '').toString().trim();
                    if (!harvestersMap.has(eqStr)) harvestersMap.set(eqStr, { codigo: eqStr, peso: 0 });
                    harvestersMap.get(eqStr).peso += distributedPeso;
                });
            });

            const finalResults = {};
            frontHarvesterMap.forEach((frontData, frente) => {
                const total = frontData.totalWeight;
                const harvestersList = Array.from(frontData.harvesters.values())
                    .map(h => ({
                        codigo: h.codigo,
                        peso: h.peso,
                        percent: total > 0 ? parseFloat(((h.peso / total) * 100).toFixed(1)) : 0,
                        propriedade: DataAnalyzer.EQUIPAMENTO_PROPRIO.some(p => h.codigo.startsWith(p)) ? 'Própria' : 'Terceira'
                    }))
                    .sort((a, b) => b.peso - a.peso);

                finalResults[frente] = harvestersList;
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
                const variedade = row.variedade || 'N/A';
                const codFazenda = row.codFazenda ? String(row.codFazenda).trim() : 'N/A';
                const descFazenda = row.descFazenda ? String(row.descFazenda).trim() : 'N/A';

                if (!viagem || !frota || !frente) return;
                const viagemStr = viagem.toString().trim();
                const frotaStr = frota.toString().trim();
                const frenteStr = frente.toString().trim();
                if (viagemStr === '' || frotaStr === '' || frenteStr === '' || frotaStr.toUpperCase().includes('TOTAL')) return;

                const chaveViagemFrota = `${viagemStr}_${frotaStr}`;
                const chaveFrente = frenteStr;

                if (!frentesMap.has(chaveFrente)) {
                    frentesMap.set(chaveFrente, {
                        viagensSet: new Set(),
                        analisadasSet: new Set(),
                        pesoTotal: 0,
                        variedade: variedade,
                        fazendaData: { cod: codFazenda, desc: descFazenda },
                    });
                }

                const frenteData = frentesMap.get(chaveFrente);
                frenteData.viagensSet.add(chaveViagemFrota);
                const peso = parseFloat(row.peso) || 0;
                frenteData.pesoTotal += peso;

                frenteData.fazendaData.cod = codFazenda !== 'N/A' ? codFazenda : frenteData.fazendaData.cod;
                frenteData.fazendaData.desc = descFazenda !== 'N/A' ? descFazenda : frenteData.fazendaData.desc;
                
                const analisado = row.analisado;
                const isAnalisado = analisado === true || analisado === 'SIM' || analisado === 'S' || analisado === '1' || (typeof analisado === 'string' && analisado.toUpperCase() === 'ANALISADO');
                if (isAnalisado) frenteData.analisadasSet.add(chaveViagemFrota);
            });

            const result = Array.from(frentesMap.entries()).map(([codFrente, data]) => {
                const viagens = data.viagensSet.size;
                const analisadas = data.analisadasSet.size;
                const taxaAnalise = viagens > 0 ? (analisadas / viagens) * 100 : 0;
                const produtividade = viagens > 0 ? (data.pesoTotal / viagens) : 0;
                let status = 'active';
                let statusText = 'Alta';

                const finalTaxaAnalise = Math.round(taxaAnalise);
                const metadata = frontMetadata.get(codFrente) || {};
                const isConflict = metadata.isLibConflict || metadata.isHarvConflict;

                if (isConflict) { status = 'critical'; statusText = 'ALERTA CRÍTICO'; } 
                else if (finalTaxaAnalise < 30) { status = 'critical'; statusText = 'Baixa'; } 
                else if (finalTaxaAnalise >= 31 && finalTaxaAnalise <= 35) { status = 'warning'; statusText = 'Média'; } 
                
                const cod = data.fazendaData.cod || 'N/A';
                const desc = data.fazendaData.desc || 'N/A';
                const finalFazendaDisplay = `${cod} / ${desc}`;

                return {
                    codFrente: codFrente,
                    codFazenda: cod, 
                    descFazenda: desc,
                    fazenda: finalFazendaDisplay, 
                    variedade: data.variedade,
                    viagens: viagens,
                    pesoTotal: parseFloat(data.pesoTotal.toFixed(2)),
                    analisadas: analisadas,
                    produtividade: parseFloat(produtividade.toFixed(2)), 
                    taxaAnalise: Math.round(taxaAnalise),
                    status: status,
                    statusText: statusText,
                    harvesterContribution: harvesterContributionMap[codFrente] || [],
                    liberacao: metadata.liberacao || 'N/A',
                    isLibConflict: metadata.isLibConflict || false,
                    isHarvConflict: metadata.isHarvConflict || false
                };
            });

            return result.sort((a, b) => b.pesoTotal - a.pesoTotal);
        }
        
        getEmptyAnalysis(potentialData = []) {
            return {
                totalViagens: 0,
                viagensProprias: 0,
                viagensTerceiros: 0,
                frotaMotrizDistinta: 0,
                totalPesoLiquido: 0,
                taxaAnalise: 0,
                distribuicaoFrota: { propria: 0, terceiros: 0 },
                potentialData: this.timeModule ? this.timeModule.analyzePotential(potentialData) : [],
                topFrotasProprias: [],
                topFrotasTerceiros: [],
                topEquipamentosProprios: [],
                topEquipamentosTerceiros: [],
                topTransbordos: [],
                topOperadoresColheitaPropria: [],
                topCamEscravo: [],
                ownerTypeData: { propria: 0, fornecedor: 0, total: 0, propriaPercent: 0, fornecedorPercent: 0, topFazendas: [] }, 
                lastTripAverage: 0, 
                lastTripCount: 0, 
                analise24h: [],
                fleetHourly: [],
                harvestHourly: [],
                frentes: [],
                equipmentDistribution: { propria: 0, terceiros: 0 },
                projecaoMoagem: { forecast: 0, rhythm: 0, rhythmSum: 0, fixedRhythm: 0, fixedSum: 0, weightsUsed: [], hoursPassed: 0, status: 'Sem dados', requiredRhythm: 0, forecastDifference: 0 },
                data: [],
                potentialRawData: potentialData,
                requiredHourlyRates: [],
                metaData: null,
                lastExitTimestamp: null,
                lastExitTimestampFormatted: 'Aguardando dados.',
                acumuladoSafra: 0 // Default value
            };
        }

        /**
         * Encontra o timestamp de saída mais recente (o último registro).
         */
        _findLastExitTimestamp(data) {
            let lastTimestamp = null;
            let lastRow = null;
            
            data.forEach(row => {
                if (this.isAggregationRow(row)) return;
                
                if (!row.timestamp || !(row.timestamp instanceof Date)) return;
                
                const ts = row.timestamp;
                const tsTime = ts.getTime();
                
                if (isNaN(tsTime)) return;
                
                if (!row.data || row.data === '') {
                    return;
                }
                
                if (!lastTimestamp || tsTime > lastTimestamp.getTime()) {
                    lastTimestamp = ts;
                    lastRow = row;
                }
            });
            
            return lastTimestamp;
        }

        /**
         * Função Principal de Análise - ORQUESTRADOR
         * CORREÇÃO AQUI: Adicionado acmSafraData nos parâmetros
         */
        analyzeAll(data, potentialData = [], metaData = [], validationResult = { anomalies: [] }, acmSafraData = []) {
            if (!Array.isArray(data) || data.length === 0) {
                const emptyAnalysis = this.getEmptyAnalysis(potentialData);
                if (this.rankingsModule && this.rankingsModule.analyzeMetas) {
                    emptyAnalysis.metaData = this.rankingsModule.analyzeMetas(metaData); 
                }
                // Ainda precisamos calcular o acumulado mesmo sem dados de produção
                if (this.kpisModule && this.kpisModule.calculateAcumuladoSafra) {
                    // CORREÇÃO: Passando null no primeiro arg para forçar uso do acmSafraData (2º arg)
                    emptyAnalysis.acumuladoSafra = this.kpisModule.calculateAcumuladoSafra(null, acmSafraData);
                }
                return emptyAnalysis;
            }

            console.log(`[ANALYZER] Iniciando análise com ${data.length} registros`);

            const lastExitTimestamp = this._findLastExitTimestamp(data);
            
            let lastExitTimestampFormatted = 'Aguardando dados.';
            if (lastExitTimestamp) {
                const dateStr = lastExitTimestamp.toLocaleDateString('pt-BR');
                const timeStr = lastExitTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                lastExitTimestampFormatted = `${dateStr} às ${timeStr}`;
            }

            // --- DELEGAÇÃO PARA o MÓDULO DE KPIS ---
            const contagemViagens = this.kpisModule.countUniqueTrips(data);
            const totalPesoLiquido = this.kpisModule.calculateTotalWeightComplete(data);
            const distribuicaoFrota = this.kpisModule.analyzeFleetDistributionComplete(data);
            const taxaAnalise = this.kpisModule.calculateAnalysisRateByTrip(data);
            const equipmentDistribution = this.kpisModule.getEquipmentDistribution(data.filter(row => !this.isAggregationRow(row)));
            const ownerTypeData = this.kpisModule.analyzeOwnerType(data); 
            const lastTripAvgResult = this.kpisModule.calculateLastTripAverage(data);
            
            // 🔥 CÁLCULO DO ACUMULADO SAFRA (CORRIGIDO)
            // Agora passamos null no primeiro argumento e acmSafraData no segundo
            // Isso faz com que a função calculateAcumuladoSafra use corretamente a planilha de acumulado
            const acumuladoSafra = this.kpisModule.calculateAcumuladoSafra(null, acmSafraData);

            // --- DELEGAÇÃO PARA o MÓDULO DE TIME ---
            const projecaoMoagem = this.timeModule.calculateProjectionMoagem(data, totalPesoLiquido);
            const requiredHourlyRates = this.timeModule.calculateRequiredHourlyRates(data, totalPesoLiquido);
            const analise24h = this.timeModule.analyze24hComplete(data);
            const fleetHourly = this.timeModule.analyzeFleetHourly(data);
            
            // --- DELEGAÇÃO PARA o MÓDULO DE RANKINGS ---
            const filteredData = data.filter(row =>
                (row.viagem || row.idViagem) &&
                row.frota &&
                !this.isAggregationRow(row)
            );
            const topFrotasProprias = this.rankingsModule.getTopFrota(filteredData, DataAnalyzer.FROTA_PROPRIA, false);
            const topFrotasTerceiros = this.rankingsModule.getTopFrota(filteredData, DataAnalyzer.FROTA_TERCEIROS, false);
            
            const topEquipamentosProprios = this.rankingsModule.getTopEquipamentos(filteredData, 'propria');
            const topEquipamentosTerceiros = this.rankingsModule.getTopEquipamentos(filteredData, 'terceiros');
            const topTransbordos = this.rankingsModule.getTopTransbordos(filteredData);
            const topOperadoresColheitaPropria = this.rankingsModule.getTopOperadoresColheitaPropria(filteredData);
            const topCamEscravo = this.rankingsModule.analyzeCamEscravo(data);
            
            // --- ANÁLISE DE FRENTES ---
            const frontMetadata = this._getFrontMetadata(data, validationResult.anomalies);
            const frentes = this.analyzeFrontsComplete(data, frontMetadata);

            // --- DELEGAÇÃO PARA o MÓDULO DE METAS ---
            const metaResult = this.rankingsModule.analyzeMetas(metaData, frentes);

            // 🔥 MERGE CORRETO DA META (USANDO A COLUNA 'META' E NÃO 'POTENCIAL')
            if (frentes && metaResult) {
                frentes.forEach(f => {
                    const meta = metaResult.get(String(f.codFrente));
                    if (meta) {
                        // CORREÇÃO: Usa 'meta.meta' (Soma da Coluna META) em vez de 'potencial_entrega_total'
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
                
                ownerTypeData: ownerTypeData,
                
                lastTripAverage: lastTripAvgResult.average, 
                lastTripCount: lastTripAvgResult.count,

                analise24h,
                fleetHourly,
                frentes,
                equipmentDistribution,
                projecaoMoagem,
                requiredHourlyRates,
                
                lastExitTimestamp: lastExitTimestamp,
                lastExitTimestampFormatted: lastExitTimestampFormatted,
                
                acumuladoSafra: acumuladoSafra, // 🔥 Campo Adicionado e agora com valor correto

                analyzeFrontHourly: (d) => this.timeModule.analyzeFrontHourlyComplete(d),
                data: filteredData,
                potentialRawData: potentialData,
                metaData: metaResult 
            };
        }
    }

    window.DataAnalyzer = DataAnalyzer;
}