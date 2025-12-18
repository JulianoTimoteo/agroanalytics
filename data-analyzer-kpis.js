// data-analyzer-kpis.js - Cálculo de KPIs Básicos (VERSÃO FINAL COM PROTEÇÃO DE REDECLARAÇÃO)

if (typeof DataAnalyzerKPIs === 'undefined') {
    class DataAnalyzerKPIs {

        constructor(analyzer) {
            // Recebe o Analyzer principal para acesso a métodos auxiliares (isAggregationRow, isPropria, etc.)
            this.analyzer = analyzer;
        }

        /**
         * 🔥 NOVO: Calcula o acumulado total da safra a partir dos dados AcmSafra
         * Soma a coluna PESO LIQUIDO de todos os registros da planilha.
         * @param {Array} productionData - Dados de produção (opcional aqui, mantido pela assinatura)
         * @param {Array} acmSafraData - Dados da planilha AcmSafra (usado como fonte principal)
         */
        calculateAcumuladoSafra(productionData, acmSafraData) {
            // Se o segundo parâmetro não for passado, tenta usar o primeiro (flexibilidade)
            let dataToUse = acmSafraData;
            if (!dataToUse && Array.isArray(productionData)) {
                dataToUse = productionData;
            }
            
            if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
                return 0;
            }
            
            let totalAcumulado = 0;
            
            dataToUse.forEach(row => {
                // Tenta múltiplas variações do nome da coluna para garantir compatibilidade
                const peso = parseFloat(
                    row.pesoLiquido || 
                    row.PESOLIQUIDO || 
                    row['PESO LIQUIDO'] || 
                    row['PESO LÍQUIDO'] || 
                    row.LIQUIDO || 
                    0
                );
                
                if (!isNaN(peso) && peso > 0) {
                    totalAcumulado += peso;
                }
            });
            
            return Math.round(totalAcumulado * 100) / 100; // Arredonda para 2 casas decimais
        }

        countUniqueTrips(data) {
            const viagensMap = new Map();
            const frotasDistintas = new Set();

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const viagem = row.viagem || row.idViagem;
                const frota = row.frota;

                if (!viagem || !frota) return;

                const viagemStr = viagem.toString().trim();
                const frotaStr = frota.toString().trim();

                if (viagemStr === '' || frotaStr === '' || frotaStr.toUpperCase().includes('TOTAL')) return;

                // Contagem da Frota Motriz Distinta
                frotasDistintas.add(frotaStr);

                // Chave única para contagem de viagens
                const uniqueKey = `${viagemStr}_${frotaStr}`;

                if (!viagensMap.has(uniqueKey)) {
                    viagensMap.set(uniqueKey, { frota: frotaStr });
                }
            });

            let proprias = 0;
            let terceiros = 0;

            viagensMap.forEach((info) => {
                const frotaStr = info.frota;
                // Usa os métodos da classe principal para consistência
                if (this.analyzer.isPropria({ frota: frotaStr })) {
                    proprias++;
                } else {
                    terceiros++;
                }
            });

            return { total: viagensMap.size, proprias, terceiros, frotaMotrizDistinta: frotasDistintas.size };
        }

        calculateTotalWeightComplete(data) {
            let total = 0;
            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const peso = parseFloat(row.peso) || 0;
                if (peso === 0) return;
                if (row.frota && !row.frota.toString().toUpperCase().includes('TOTAL')) {
                    total += peso;
                }
            });
            return total;
        }

        analyzeFleetDistributionComplete(data) {
            let propriaPeso = 0;
            let terceirosPeso = 0;

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const peso = parseFloat(row.peso) || 0;
                if (peso === 0) return;

                if (this.analyzer.isPropria(row)) {
                    propriaPeso += peso;
                } else {
                    terceirosPeso += peso;
                }
            });

            return { propria: propriaPeso, terceiros: terceirosPeso };
        }

        calculateAnalysisRateByTrip(data) {
            let linhasAnalisadas = 0;
            let linhasTotais = 0;

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row) || (!row.viagem && !row.idViagem) || !row.frota) return;

                const frotaStr = row.frota.toString().trim();
                if (frotaStr.toUpperCase().includes('TOTAL')) return;

                linhasTotais++;

                const analisado = row.analisado;
                const isAnalisado = analisado === true ||
                    analisado === 'SIM' ||
                    analisado === 'S' ||
                    analisado === '1' ||
                    (typeof analisado === 'string' && analisado.toUpperCase() === 'ANALISADO');

                if (isAnalisado) {
                    linhasAnalisadas++;
                }
            });

            const taxa = linhasTotais > 0 ? (linhasAnalisadas / linhasTotais) * 100 : 0;
            return parseFloat(taxa.toFixed(2));
        }

        getEquipmentDistribution(data) {
            let propriaPeso = 0;
            let terceirosPeso = 0;

            data.forEach(row => {
                const peso = parseFloat(row.peso) || 0;
                if (peso === 0) return;

                if (this.analyzer.isPropria(row)) {
                    propriaPeso += peso;
                } else {
                    terceirosPeso += peso;
                }
            });

            return { propria: propriaPeso, terceiros: terceirosPeso };
        }

        analyzeOwnerType(data) {
            let propriaTons = 0;
            let fornecedorTons = 0;

            data.forEach(row => {
                const ownerType = (row.tipoProprietarioFa || '').toUpperCase().trim();
                if (!ownerType || this.analyzer.isAggregationRow(row)) return;

                const peso = parseFloat(row.peso) || 0;

                if (peso === 0) return;

                if (ownerType.includes('PROPRIA') || ownerType.includes('PRÓPRIA')) {
                    propriaTons += peso;
                } else if (ownerType.includes('FORNECEDOR') || ownerType.includes('TERCEIRO') || ownerType.includes('FRETISTA')) {
                    fornecedorTons += peso;
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

    // Torna a classe global
    window.DataAnalyzerKPIs = DataAnalyzerKPIs;
}