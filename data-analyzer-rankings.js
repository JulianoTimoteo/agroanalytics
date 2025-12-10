// data-analyzer-rankings.js - Cálculo de Rankings (Top Frotas, Equipamentos, Operadores)
class DataAnalyzerRankings {

    constructor(analyzer) {
        this.analyzer = analyzer;
    }

    /**
     * Auxiliar: Encontra a Frente de maior peso para um dado código (Frota, Equipamento, Transbordo).
     */
    findMostCommonFront(data, code) {
        const frontMap = new Map();

        data.forEach(row => {
            const isMatch = (row.equipamento == code) ||
                            (row.frota == code) ||
                            (row.transbordo == code) ||
                            (row.operador == code) ||
                            (row.transbordos && row.transbordos.includes(code)) ||
                            (row.operadores && row.operadores.includes(code)) ||
                            (row.equipamentos && row.equipamentos.includes(code)) ||
                            (row.camEscravo == code) || 
                            (row.codMotorista == code); 

            if (isMatch) {
                const peso = parseFloat(row.peso) || 0;
                const front = (row.frente || '').toString();
                if (front && !front.toUpperCase().includes('TOTAL')) {
                    frontMap.set(front, (frontMap.get(front) || 0) + peso);
                }
            }
        });

        if (frontMap.size === 0) return 'N/A';
        return Array.from(frontMap.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * CRÍTICO: Calcula Top Frota, Distância Média e Ton.Km.
     */
    getTopFrota(data, prefixes, useDistance = false) { 	
        const tripMap = new Map();

        data.forEach(row => {
            const frota = (row.frota || '').toString().trim();
            const peso = parseFloat(row.peso) || 0;
            const distMedia = parseFloat(row.distancia) || 0;
            const viagem = row.viagem || row.idViagem;
            
            if (!frota || !viagem || peso === 0 || this.analyzer.isAggregationRow(row) || !prefixes.some(prefix => frota.startsWith(prefix))) {
                 return;
            }

            // Usamos a viagem como chave única, garantindo que o processamento interno de peso seja por viagem.
            const uniqueTripKey = String(viagem).trim(); 
            const tripFrotaKey = `${uniqueTripKey}_${frota}`; // Chave única para o mapa de agregações

            if (!tripMap.has(tripFrotaKey)) {
                tripMap.set(tripFrotaKey, { 
                    frota: frota,
                    pesoTotal: 0, 
                    distanciaTotal: 0, 
                    viagensCount: 0,
                    tonKmTrip: 0, 
                    isTripDataCounted: false, // FLAG CRÍTICA: Garantir que a Distância/Contagem só seja registrada uma vez
                    uniqueTripKey: uniqueTripKey
                });
            }

            const currentTrip = tripMap.get(tripFrotaKey);
            currentTrip.pesoTotal += peso;

            // NOVO: A Distância e a Contagem de Viagens (1) devem ser registradas APENAS UMA VEZ
            // pela primeira linha de um ID de Viagem válido e com peso.
            if (!currentTrip.isTripDataCounted) {
                 // A Distância Média é atribuída do próprio campo 'Dist Média' da linha.
                 currentTrip.distanciaTotal = distMedia; 
                 currentTrip.viagensCount = 1; // Contamos 1 viagem única
                 currentTrip.isTripDataCounted = true;
                 
                 // CRÍTICO: O Ton.Km deve usar o peso TOTAL FINAL desta viagem * Distância.
                 // Como o peso total está sendo somado linha a linha, o Ton.Km precisa ser calculado no final (Passagem 2)
            }
        });

        // 2. Re-agrega por Frota Motriz e Finaliza o Ton.Km
        const finalFrotaMap = new Map();
        tripMap.forEach(trip => {
            const frota = trip.frota;
            if (!finalFrotaMap.has(frota)) {
                finalFrotaMap.set(frota, { 
                    peso: 0, 
                    distanciaSum: 0, // Soma das Dist Média de cada viagem única
                    viagensCountTotal: 0, 
                    tonKmTotal: 0
                });
            }
            const finalMetrics = finalFrotaMap.get(frota);
            
            finalMetrics.peso += trip.pesoTotal;
            finalMetrics.distanciaSum += trip.distanciaTotal; 
            finalMetrics.viagensCountTotal += trip.viagensCount; 
            
            // Recalcula Ton.Km no final: Peso Total desta Viagem * Distância Média desta Viagem
            finalMetrics.tonKmTotal += trip.pesoTotal * trip.distanciaTotal; 
        });

        // 3. Ordena e limita ao Top 5
        return Array.from(finalFrotaMap.entries())
            .map(([frota, metrics]) => {
                // CORREÇÃO: Distância Média é calculada pela SOMA das Distâncias (uma por viagem) / TOTAL DE VIAGENS
                const distMediaCalculated = metrics.viagensCountTotal > 0 ? metrics.distanciaSum / metrics.viagensCountTotal : 0;
                
                // CÁLCULO DENSIDADE: Peso Total / Viagens Distintas
                const viagensDistintas = metrics.viagensCountTotal; 
                const densidadeMedia = viagensDistintas > 0 ? metrics.peso / viagensDistintas : 0;

                return {
                    codigo: frota,
                    peso: metrics.peso,
                    distanciaMedia: parseFloat(distMediaCalculated.toFixed(1)), // Dist Média (km)
                    tonKm: parseFloat(metrics.tonKmTotal.toFixed(2)), // Ton.Km Rodados
                    densidadeMedia: parseFloat(densidadeMedia.toFixed(2)), // Densidade Média (t/viagem)
                    viagensCountTotal: viagensDistintas, // Contagem de Viagens Distintas
                    frente: this.findMostCommonFront(data, frota)
                };
            })
            // ORDENAÇÃO: Se for para análise de Logística (useDistance), ordena pela Distância Média, caso contrário pelo Peso.
            .sort((a, b) => useDistance ? b.distanciaMedia - a.distanciaMedia : b.peso - a.peso) 
            .slice(0, 5);
    }

    getTopEquipamentos(data, category) {
        const equipamentosMap = new Map();

        data.forEach(row => {
            const peso = parseFloat(row.peso) || 0;
            if (peso === 0) return;

            const allEquipment = this.analyzer._extractEquipments(row);
            const validHarvesters = allEquipment.filter(eq => this.analyzer._isValidHarvesterCode(eq));

            if (validHarvesters.length === 0) return;
            const distributedPeso = peso / validHarvesters.length;

            validHarvesters.forEach(eqStr => {
                let shouldAdd = false;

                if (category === 'terceiros') {
                    if (eqStr.startsWith('93')) shouldAdd = true;
                } else if (category === 'propria') {
                    if (eqStr.startsWith('80')) shouldAdd = true;
                }

                if (shouldAdd) {
                    equipamentosMap.set(eqStr, (equipamentosMap.get(eqStr) || 0) + distributedPeso);
                }
            });
        });

        return Array.from(equipamentosMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([codigo, peso]) => ({
                codigo: codigo,
                peso: peso,
                frente: this.findMostCommonFront(data, codigo)
            }));
    }
    
    getTopOperadoresColheitaPropria(data) {
        const operadoresMap = new Map();

        data.forEach(row => {
            const peso = parseFloat(row.peso) || 0;
            if (peso === 0) return;

            const allEquipment = this.analyzer._extractEquipments(row);
            const hasOwnHarvester = allEquipment.some(eq => String(eq).startsWith('80'));

            if (!hasOwnHarvester) return;

            // O item.operadores (fullOp) já contém a string concatenada "CÓDIGO - NOME".
            const listaOperadores = (row.operadores && row.operadores.length > 0)
                                                ? row.operadores
                                                : (row.operador ? [row.operador] : []);

            const validOperadores = listaOperadores.filter(op => {
                const s = String(op).trim();
                return s.length > 0 && s !== '0' && !s.toUpperCase().includes('TOTAL');
            });

            if (validOperadores.length === 0) return;

            const distributedPeso = peso / validOperadores.length;

            validOperadores.forEach(opStr => {
                // A chave no mapa é a string completa: "CÓDIGO - NOME"
                if (!operadoresMap.has(opStr)) {
                    operadoresMap.set(opStr, { codigo: opStr, peso: 0, frente: row.frente || 'N/A' });
                }
                operadoresMap.get(opStr).peso += distributedPeso;
            });
        });

        // Retorna o objeto com a chave 'codigo' sendo o nome concatenado.
        return Array.from(operadoresMap.values())
            .sort((a, b) => b.peso - a.peso)
            .slice(0, 5);
    }
    
    getTopTransbordos(data) {
        const transbordoMap = new Map();

        data.forEach(row => {
            const peso = parseFloat(row.peso) || 0;
            if (peso === 0) return;

            if (!this.analyzer.isTerceiro(row)) return;

            const transbordos = [];
            if (row.transbordos && Array.isArray(row.transbordos)) {
                row.transbordos.forEach(tr => {
                    if (tr && !String(tr).toUpperCase().includes('TOTAL')) {
                        transbordos.push(tr);
                    }
                });
            } else {
                if (row.transbordo && !String(row.transbordo).toUpperCase().includes('TOTAL')) {
                    transbordos.push(row.transbordo);
                }
            }

            const uniqueTransbordos = [...new Set(transbordos)];
            if (uniqueTransbordos.length === 0) return;

            const distPeso = peso / uniqueTransbordos.length;

            uniqueTransbordos.forEach(tr => {
                const trStr = (tr || '').toString().trim();
                if(trStr.startsWith('92') && trStr.length > 0) {
                    if (!transbordoMap.has(trStr)) {
                        transbordoMap.set(trStr, 0);
                    }
                    transbordoMap.set(trStr, transbordoMap.get(trStr) + distPeso);
                }
            });
        });

        return Array.from(transbordoMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([codigo, peso]) => ({
                codigo: codigo,
                peso: peso,
                frente: this.findMostCommonFront(data, codigo)
            }));
    }
    
    analyzeCamEscravo(data) {
        const escravoMap = new Map();

        data.forEach(row => {
            const camEscravo = (row.camEscravo || '').toString().trim();
            if (!camEscravo || camEscravo.toUpperCase().includes('TOTAL')) return;
            if (this.analyzer.isAggregationRow(row)) return;

            const peso = parseFloat(row.peso) || 0;
            const viagem = row.viagem || row.idViagem; 
            
            if (peso === 0 || !viagem) return;

            if (!escravoMap.has(camEscravo)) {
                escravoMap.set(camEscravo, { 
                    toneladas: 0, 
                    carretas: new Set(),
                    lastRow: row 
                });
            }

            const current = escravoMap.get(camEscravo);
            current.toneladas += peso;
            current.carretas.add(viagem);
            current.lastRow = row; 
        });

        return Array.from(escravoMap.entries())
            .map(([codigo, data]) => ({
                codigo,
                toneladas: data.toneladas,
                carretas: data.carretas.size, 
                frente: this.findMostCommonFront(data.lastRow ? [data.lastRow] : [], codigo) 
            }))
            .sort((a, b) => b.toneladas - a.toneladas)
            .slice(0, 5);
    }

}

if (typeof DataAnalyzerRankings === 'undefined') {
    window.DataAnalyzerRankings = DataAnalyzerRankings;
}