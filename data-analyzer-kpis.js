// data-analyzer-kpis.js - Cálculo de KPIs Básicos (VERSÃO FINAL - CORREÇÃO DE LEITURA ACUMULADO)

if (typeof DataAnalyzerKPIs === 'undefined') {
    class DataAnalyzerKPIs {

        constructor(analyzer) {
            this.analyzer = analyzer;
        }

        /**
         * Auxiliar para converter string numérica BR (1.000,00) para Float JS (1000.00)
         */
        _parseBRNumber(val) {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            
            // Remove espaços e converte para string
            let str = String(val).trim();
            
            // Se já for formato americano simples (ex: "1000.50"), converte direto
            if (!str.includes(',') && !str.includes('.') && !isNaN(parseFloat(str))) {
                return parseFloat(str);
            }

            // Detecta formato 1.000,00
            if (str.includes(',') && str.includes('.')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } 
            // Detecta formato 1000,00
            else if (str.includes(',')) {
                str = str.replace(',', '.');
            }
            
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        }

        /**
         * 🔥 CÁLCULO DO ACUMULADO SAFRA
         * Procura inteligentemente a coluna de peso na planilha AcmSafra
         */
        calculateAcumuladoSafra(productionData, acmSafraData) {
            // Prioriza os dados do AcmSafra. Se não tiver, tenta usar produção (mas geralmente produção é só do dia)
            let dataToUse = acmSafraData;
            
            if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
                console.warn("[KPIs] AcmSafra vazio ou inválido.");
                return 0;
            }

            console.log(`[KPIs] Calculando Acumulado Safra com ${dataToUse.length} registros.`);

            // 1. Identificar qual coluna contém o peso
            const firstRow = dataToUse[0];
            const possibleColumns = [
                'PESO LIQUIDO', 'PESO_LIQUIDO', 'PESO.LIQUIDO', 
                'LIQUIDO', 'LÍQUIDO', 
                'TONELADAS', 'TON', 'TONS', 
                'PESO', 'VLR_PESO', 
                'TOTAL', 'ACUMULADO', 'MOAGEM'
            ];

            let weightCol = null;

            // Busca exata ou parcial (case insensitive)
            const keys = Object.keys(firstRow);
            
            // Tentativa 1: Busca exata nas chaves
            for (const col of possibleColumns) {
                const match = keys.find(k => k.toUpperCase().trim() === col);
                if (match) {
                    weightCol = match;
                    break;
                }
            }

            // Tentativa 2: Busca por string contida (ex: "SOMA DE PESO LIQUIDO")
            if (!weightCol) {
                for (const col of possibleColumns) {
                    const match = keys.find(k => k.toUpperCase().includes(col));
                    if (match) {
                        weightCol = match;
                        break;
                    }
                }
            }
            
            // Tentativa 3: Se não achou, pega a primeira coluna que parece ser numérica e tem valor alto
            if (!weightCol) {
                for (const key of keys) {
                    const val = this._parseBRNumber(firstRow[key]);
                    if (val > 100) { // Assume que peso acumulado será um valor considerável
                        weightCol = key;
                        console.warn(`[KPIs] Coluna de peso não identificada por nome. Usando provável coluna numérica: ${key}`);
                        break;
                    }
                }
            }

            if (!weightCol) {
                console.error("[KPIs] Não foi possível identificar a coluna de Peso no arquivo AcmSafra.");
                console.log("Colunas disponíveis:", keys);
                return 0;
            }

            console.log(`[KPIs] Usando coluna '${weightCol}' para cálculo do Acumulado Safra.`);

            // 2. Somar os valores
            let totalAcumulado = 0;
            
            dataToUse.forEach(row => {
                // Pula linha de total geral se houver (para não duplicar)
                const valuesStr = Object.values(row).join(' ').toUpperCase();
                if (valuesStr.includes('TOTAL GERAL') || valuesStr.includes('AGREGADO')) return;

                const val = this._parseBRNumber(row[weightCol]);
                totalAcumulado += val;
            });

            return totalAcumulado;
        }

        // =========================================================================
        // MÉTODOS ORIGINAIS DE KPIS (MANTIDOS E PROTEGIDOS)
        // =========================================================================

        countUniqueTrips(data) {
            const uniqueTrips = new Set();
            const uniqueProprias = new Set();
            const uniqueTerceiros = new Set();
            const uniqueFrotaMotriz = new Set();

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const viagemId = row.viagem || row.idViagem;
                if (!viagemId) return;

                const idStr = String(viagemId).trim();
                uniqueTrips.add(idStr);

                if (this.analyzer.isPropria(row)) uniqueProprias.add(idStr);
                else if (this.analyzer.isTerceiro(row)) uniqueTerceiros.add(idStr);

                if (row.frota) uniqueFrotaMotriz.add(String(row.frota).trim());
            });

            return {
                total: uniqueTrips.size,
                proprias: uniqueProprias.size,
                terceiros: uniqueTerceiros.size,
                frotaMotrizDistinta: uniqueFrotaMotriz.size
            };
        }

        calculateTotalWeightComplete(data) {
            let total = 0;
            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                total += parseFloat(row.peso) || 0;
            });
            return total;
        }

        analyzeFleetDistributionComplete(data) {
            let p = 0, t = 0;
            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const peso = parseFloat(row.peso) || 0;
                if (this.analyzer.isPropria(row)) p += peso;
                else if (this.analyzer.isTerceiro(row)) t += peso;
            });
            return { propria: p, terceiros: t };
        }

        calculateAnalysisRateByTrip(data) {
            const trips = new Set();
            const analysedTrips = new Set();

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const v = row.viagem || row.idViagem;
                if (!v) return;
                const vStr = String(v).trim();
                trips.add(vStr);
                
                const val = row.analisado;
                const isAnalysed = val === true || val === 'SIM' || val === 'S' || val === 1 || (typeof val === 'string' && val.toUpperCase() === 'ANALISADO');
                
                if (isAnalysed) analysedTrips.add(vStr);
            });

            return trips.size > 0 ? (analysedTrips.size / trips.size) * 100 : 0;
        }
        
        getEquipmentDistribution(data) {
             let propria = 0;
             let terceiros = 0;
             
             data.forEach(row => {
                 const peso = parseFloat(row.peso) || 0;
                 if (peso <= 0) return;

                 // Verifica pelo equipamento
                 let equip = row.equipamento;
                 if (!equip && row.equipamentos && row.equipamentos.length > 0) {
                     equip = row.equipamentos[0];
                 }
                 
                 if (equip) {
                     const equipStr = String(equip).trim();
                     const isProprio = DataAnalyzer.EQUIPAMENTO_PROPRIO.some(prefix => equipStr.startsWith(prefix));
                     const isTerceiro = DataAnalyzer.EQUIPAMENTO_TERCEIROS.some(prefix => equipStr.startsWith(prefix));
                     
                     if (isProprio) propria += peso;
                     else if (isTerceiro) terceiros += peso;
                     else {
                         // Fallback para frota se equipamento não for conclusivo
                         if (this.analyzer.isPropria(row)) propria += peso;
                         else terceiros += peso;
                     }
                 } else {
                     if (this.analyzer.isPropria(row)) propria += peso;
                     else terceiros += peso;
                 }
             });
             
             return { propria, terceiros };
        }

        analyzeOwnerType(data) {
            let propriaTons = 0;
            let fornecedorTons = 0;
            
            const fazendaMap = new Map();

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const peso = parseFloat(row.peso) || 0;
                const tipoProp = (row.dscTipoPropriedade || '').toUpperCase().trim();
                
                // Lógica principal baseada no campo dscTipoPropriedade
                if (tipoProp.includes('FORNECEDOR') || tipoProp.includes('PARCERIA')) {
                    fornecedorTons += peso;
                } else if (tipoProp.includes('ARRENDAMENTO') || tipoProp.includes('AGRICOLA') || tipoProp.includes('PROPRIA')) {
                    propriaTons += peso;
                } else {
                    // Fallback se o campo estiver vazio
                    if (this.analyzer.isPropria(row)) propriaTons += peso;
                    else fornecedorTons += peso;
                }
                
                // Coleta dados para ranking de fazendas
                if (row.descFazenda) {
                    const fazenda = row.descFazenda;
                    if (!fazendaMap.has(fazenda)) fazendaMap.set(fazenda, 0);
                    fazendaMap.set(fazenda, fazendaMap.get(fazenda) + peso);
                }
            });

            const total = propriaTons + fornecedorTons;
            
            return {
                propria: propriaTons,
                fornecedor: fornecedorTons,
                total: total,
                propriaPercent: total > 0 ? (propriaTons / total) * 100 : 0,
                fornecedorPercent: total > 0 ? (fornecedorTons / total) * 100 : 0,
            };
        }
        
        calculateLastTripAverage(data) {
            const tripWeights = [];
            const uniqueTrips = new Set();
            
            for (let i = data.length - 1; i >= 0 && tripWeights.length < 3; i--) {
                const row = data[i];
                const viagem = row.viagem || row.idViagem;
                const peso = parseFloat(row.peso) || 0;
                
                if (peso > 0 && viagem && !this.analyzer.isAggregationRow(row)) {
                    const tripKey = String(viagem).trim();
                    
                    if (!uniqueTrips.has(tripKey)) {
                        tripWeights.push(peso);
                        uniqueTrips.add(tripKey);
                    }
                }
            }
            
            const sum = tripWeights.reduce((acc, weight) => acc + weight, 0);
            const count = tripWeights.length;

            return {
                average: count > 0 ? sum / count : 0,
                count: count,
                weights: tripWeights
            };
        }
    }

    window.DataAnalyzerKPIs = DataAnalyzerKPIs;
}