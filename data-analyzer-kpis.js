// data-analyzer-kpis.js - Cálculo de KPIs Básicos (Peso, Viagens, Taxas)
class DataAnalyzerKPIs {

    constructor(analyzer) {
        // Recebe o Analyzer principal para acesso a métodos auxiliares (isAggregationRow, isPropria, etc.)
        this.analyzer = analyzer;
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
            if (DataAnalyzer.FROTA_PROPRIA.some(prefix => frotaStr.startsWith(prefix))) {
                proprias++;
            } else if (DataAnalyzer.FROTA_TERCEIROS.some(prefix => frotaStr.startsWith(prefix))) {
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

            const frotaStr = row.frota ? row.frota.toString().trim() : '';
            if (frotaStr.toUpperCase().includes('TOTAL')) return;

            if (DataAnalyzer.FROTA_PROPRIA.some(prefix => frotaStr.startsWith(prefix))) {
                propriaPeso += peso;
            } else if (DataAnalyzer.FROTA_TERCEIROS.some(prefix => frotaStr.startsWith(prefix))) {
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
            } else if (this.analyzer.isTerceiro(row)) {
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

            if (ownerType === 'PROPRIA') {
                propriaTons += peso;
            } else if (ownerType === 'FORNECEDOR') {
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
    
    /**
     * NOVO: Calcula a média do peso líquido das últimas 3 viagens fechadas.
     * Assume-se que a "pesagem fechada" é o último registro de peso positivo para uma viagem única.
     */
    calculateLastTripAverage(data) {
        const tripWeights = [];
        const uniqueTrips = new Set();
        
        // Itera de trás para frente para pegar as últimas pesagens.
        for (let i = data.length - 1; i >= 0 && tripWeights.length < 3; i--) {
            const row = data[i];
            const viagem = row.viagem || row.idViagem;
            const peso = parseFloat(row.peso) || 0;
            
            if (peso > 0 && viagem && !this.analyzer.isAggregationRow(row)) {
                const tripKey = String(viagem).trim();
                
                // Se for a primeira vez que encontramos essa viagem, é a última pesagem dela.
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

if (typeof DataAnalyzerKPIs === 'undefined') {
    window.DataAnalyzerKPIs = DataAnalyzerKPIs;
}