// data-analyzer-kpis.js - Cálculo de KPIs Básicos (VERSÃO FINAL - CORREÇÃO DE LEITURA TIPO PROPRIETÁRIO)

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
            let str = String(val).trim().replace(/\s/g, '');
            
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
            let dataToUse = acmSafraData || [];
            
            if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
                console.warn("[KPIs] AcmSafra vazio ou inválido.");
                return 0;
            }

            const firstRow = dataToUse[0];
            const possibleColumns = ['PESO LIQUIDO', 'PESO_LIQUIDO', 'PESO.LIQUIDO', 
                                   'LIQUIDO', 'LÍQUIDO', 
                                   'TONELADAS', 'TON', 'TONS', 
                                   'PESO', 'VLR_PESO', 
                                   'TOTAL', 'ACUMULADO', 'MOAGEM'];
                                   
            let weightCol = null;
            const keys = Object.keys(firstRow);
            
            for (const col of possibleColumns) {
                weightCol = keys.find(k => k.toUpperCase().includes(col));
                if (weightCol) break;
            }

            if (!weightCol) return 0;

            let totalAcumulado = 0;
            dataToUse.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const val = this._parseBRNumber(row[weightCol]);
                totalAcumulado += val;
            });
            
            return totalAcumulado;
        }

        /**
         * 🛠️ CÁLCULO DE TAXA DE ANÁLISE FRACIONADA POR CARGA
         * Regra: Se a viagem tem 3 cargas e 1 foi analisada, soma 0.333.
         */
        calculateAnalysisRateByTrip(data) {
            if (!data || data.length === 0) return 0;

            // Mapa: { viagemId: { cargasTotais: Set, cargasAnalisadas: Set } }
            const tripMap = new Map();

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const v = row.viagem || row.idViagem;
                // Tenta pegar o ticket/carga, se não tiver, usa a viagem como identificador único
                const c = row.carga || row.ticket || row.viagem; 
                
                if (!v) return;

                const vStr = String(v).trim();
                const cStr = String(c).trim();

                if (!tripMap.has(vStr)) {
                    tripMap.set(vStr, { totalCargas: new Set(), analisadas: new Set() });
                }

                const tripData = tripMap.get(vStr);
                tripData.totalCargas.add(cStr);

                const val = row.analisado;
                const isAnalysed = val === true || val === 'SIM' || val === 'S' || val === 1 || 
                                 val === '1' || val === '1,00' ||
                                 (typeof val === 'string' && val.toUpperCase().includes('ANALISADO'));

                if (isAnalysed) {
                    tripData.analisadas.add(cStr);
                }
            });

            let totalNumerator = 0; // Soma das frações (ex: 0.33 + 1.0 + 0.5)
            let totalTrips = tripMap.size;

            tripMap.forEach((stats) => {
                const nTotal = stats.totalCargas.size;
                const nAnalisadas = stats.analisadas.size;

                if (nTotal > 0) {
                    // Cada carga analisada vale 1 / nTotal. 
                    // Se analisou todas, soma 1.0. Se analisou 1 de 3, soma 0.333333
                    totalNumerator += (nAnalisadas / nTotal);
                }
            });

            const taxa = totalTrips > 0 ? (totalNumerator / totalTrips) * 100 : 0;
            return parseFloat(taxa.toFixed(2));
        }

        // --- MÉTODOS DE APOIO ORIGINAIS ---

        countUniqueTrips(data) {
            const uniqueTrips = new Set();
            const uniqueProprias = new Set();
            const uniqueTerceiros = new Set();
            
            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const vId = row.viagem || row.idViagem;
                if (!vId) return;
                
                const idStr = String(vId).trim();
                uniqueTrips.add(idStr);
                
                if (this.analyzer.isPropria(row)) uniqueProprias.add(idStr);
                else uniqueTerceiros.add(idStr);
            });
            
            return { total: uniqueTrips.size, proprias: uniqueProprias.size, terceiros: uniqueTerceiros.size };
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
                else t += peso;
            });
            return { propria: p, terceiros: t };
        }
        
        getEquipmentDistribution(data) {
             let propria = 0;
             let terceiros = 0;
             
             data.forEach(row => {
                 const peso = parseFloat(row.peso) || 0;
                 if (peso <= 0) return;

                 if (this.analyzer.isPropria(row)) propria += peso;
                 else terceiros += peso;
             });
             
             return { propria, terceiros };
        }

        /**
         * Análise de Tipo de Proprietário (Própria vs Fornecedor)
         * 🔥 CORREÇÃO AQUI: Usa 'tipoProprietarioFa' mapeado do IntelligentProcessor
         * e adiciona fallback para Frota se o campo de texto estiver vazio.
         */
        analyzeOwnerType(data) {
            let propriaTons = 0;
            let fornecedorTons = 0;
            
            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const peso = parseFloat(row.peso) || 0;
                
                // 1. Tenta identificar pelo texto da coluna "Tipo Proprietario (F.A.)"
                // O IntelligentProcessor mapeia essa coluna para 'tipoProprietarioFa'
                const tipoProp = (row.tipoProprietarioFa || row.dscTipoPropriedade || '').toUpperCase().trim();
                
                // Verifica se existe texto válido na coluna
                if (tipoProp.length > 0) {
                    if (tipoProp.includes('FORNECEDOR') || tipoProp.includes('PARCERIA') || tipoProp.includes('TERCEIRO') || tipoProp.includes('FRETISTA')) {
                        fornecedorTons += peso;
                    } else {
                        // Assume Própria para "ARRENDAMENTO", "PROPRIA", "AGRICOLA", etc.
                        propriaTons += peso;
                    }
                } 
                else {
                    // 2. Fallback de Segurança: Se a coluna de texto estiver vazia,
                    // usa a lógica de prefixo de frota (isTerceiro / isPropria) definida no DataAnalyzer
                    if (this.analyzer.isTerceiro(row)) {
                        fornecedorTons += peso;
                    } else {
                        propriaTons += peso;
                    }
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
                const v = row.viagem || row.idViagem;
                const peso = parseFloat(row.peso) || 0;
                
                if (peso > 0 && v && !this.analyzer.isAggregationRow(row)) {
                    if (!uniqueTrips.has(v)) { 
                        tripWeights.push(peso); 
                        uniqueTrips.add(v); 
                    }
                }
            }
            
            const sum = tripWeights.reduce((a, b) => a + b, 0);
            return { average: tripWeights.length > 0 ? sum / tripWeights.length : 0, count: tripWeights.length };
        }
    }
    
    window.DataAnalyzerKPIs = DataAnalyzerKPIs;
}