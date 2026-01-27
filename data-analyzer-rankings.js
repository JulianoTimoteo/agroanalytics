// data-analyzer-rankings.js - Módulo de Rankings e Top 5 (VERSÃO CORRIGIDA: EXIBE NOMES DOS OPERADORES)

if (typeof DataAnalyzerRankings === 'undefined') {
    class DataAnalyzerRankings {
        constructor(analyzer) {
            this.analyzer = analyzer;
        }

        findMostCommonFront(data, code) {
            const frontMap = new Map();
            const targetCode = String(code).split(/\s+|-/)[0].trim(); 

            data.forEach(row => {
                const extractCode = (val) => String(val || '').split(/\s+|-/)[0].trim();
                const check = (val) => extractCode(val) === targetCode;
                const checkArray = (arr) => Array.isArray(arr) && arr.some(v => extractCode(v) === targetCode);

                const isMatch = check(row.equipamento) || 
                                check(row.frota) || 
                                check(row.transbordo) || 
                                check(row.operador) || 
                                check(row.camEscravo) || 
                                check(row.codMotorista) ||
                                checkArray(row.transbordos) ||
                                checkArray(row.operadores) ||
                                checkArray(row.equipamentos);

                if (isMatch) {
                    const peso = parseFloat(row.peso) || 0;
                    const front = (row.frente || '').toString().trim();
                    if (front && front.toUpperCase() !== 'TOTAL' && front !== '0') {
                        frontMap.set(front, (frontMap.get(front) || 0) + peso);
                    }
                }
            });

            if (frontMap.size === 0) return 'N/A';
            return Array.from(frontMap.entries()).sort((a, b) => b[1] - a[1])[0][0];
        }

        // NOVO MÉTODO: Encontra o nome do operador baseado no código
        findOperatorName(data, operatorCode) {
            // Remove qualquer caractere não numérico do código
            const cleanCode = String(operatorCode).replace(/[^0-9]/g, '');
            if (!cleanCode) return null;

            // Procura nas linhas de dados por uma correspondência
            for (const row of data) {
                if (!row.operadores || !row.operadoresDescricao) continue;
                
                // Verifica cada operador
                for (let i = 0; i < row.operadores.length; i++) {
                    const opCode = String(row.operadores[i] || '').replace(/[^0-9]/g, '');
                    if (opCode === cleanCode && row.operadoresDescricao[i]) {
                        const nome = String(row.operadoresDescricao[i]).trim();
                        // Remove código do início se presente
                        const cleanName = nome.replace(/^[0-9]+\s*(?:-|–)?\s*/, '').trim();
                        if (cleanName.length > 0) return cleanName;
                    }
                }
            }
            
            return null;
        }

        // NOVO MÉTODO: Encontra o nome do operador de transbordo baseado no código
        findTransbordoOperatorName(data, transbordoCode) {
            const cleanCode = String(transbordoCode).replace(/[^0-9]/g, '');
            if (!cleanCode) return null;

            for (const row of data) {
                if (!row.transbordosDescricao || !Array.isArray(row.transbordosDescricao)) continue;
                
                for (let i = 0; i < row.transbordosDescricao.length; i++) {
                    const descStr = String(row.transbordosDescricao[i] || '').trim();
                    const descCode = descStr.replace(/[^0-9]/g, '');
                    
                    if (descCode === cleanCode) {
                        const nome = descStr.replace(/^[0-9]+\s*(?:-|–)?\s*/, '').trim();
                        if (nome.length > 0) return nome;
                    }
                }
            }
            
            return null;
        }

        getTopFrota(data, prefixes, useDistance = false) {  
            const tripMap = new Map();
            data.forEach(row => {
                const frota = (row.frota || '').toString().trim();
                const peso = parseFloat(row.peso) || 0;
                const distMedia = parseFloat(row.distancia) || 0;
                const viagem = row.viagem || row.idViagem;
                if (!frota || !viagem || peso === 0 || this.analyzer.isAggregationRow(row) || (prefixes && !prefixes.some(prefix => frota.startsWith(prefix)))) return;

                const uniqueTripKey = String(viagem).trim(); 
                const tripFrotaKey = `${uniqueTripKey}_${frota}`;

                if (!tripMap.has(tripFrotaKey)) {
                    tripMap.set(tripFrotaKey, { frota, pesoTotal: 0, distanciaDaViagem: 0, viagensCount: 0, isTripDataCounted: false });
                }
                const currentTrip = tripMap.get(tripFrotaKey);
                currentTrip.pesoTotal += peso;
                if (!currentTrip.isTripDataCounted) {
                     if (distMedia > 0) currentTrip.distanciaDaViagem = distMedia;
                     currentTrip.viagensCount = 1; 
                     currentTrip.isTripDataCounted = true;
                } else if (currentTrip.distanciaDaViagem === 0 && distMedia > 0) currentTrip.distanciaDaViagem = distMedia;
            });

            const finalFrotaMap = new Map();
            tripMap.forEach(trip => {
                const frota = trip.frota;
                if (!finalFrotaMap.has(frota)) finalFrotaMap.set(frota, { peso: 0, distanciaSum: 0, viagensCountTotal: 0, tonKmTotal: 0 });
                const finalMetrics = finalFrotaMap.get(frota);
                finalMetrics.peso += trip.pesoTotal;
                finalMetrics.distanciaSum += trip.distanciaDaViagem; 
                finalMetrics.viagensCountTotal += trip.viagensCount; 
                finalMetrics.tonKmTotal += (trip.pesoTotal * trip.distanciaDaViagem); 
            });

            return Array.from(finalFrotaMap.entries()).map(([frota, metrics]) => {
                    const distMediaCalculated = metrics.viagensCountTotal > 0 ? (metrics.distanciaSum / metrics.viagensCountTotal) : 0;
                    return {
                        codigo: frota, peso: metrics.peso,
                        distMedia: parseFloat(distMediaCalculated.toFixed(1)),
                        tonKm: parseFloat(metrics.tonKmTotal.toFixed(2)),
                        viagensCountTotal: metrics.viagensCountTotal,
                        frente: this.findMostCommonFront(data, frota)
                    };
                }).sort((a, b) => useDistance ? b.distMedia - a.distMedia : b.peso - a.peso).slice(0, 5);
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
                    if (category === 'terceiros' && eqStr.startsWith('93')) shouldAdd = true;
                    if (category === 'propria' && eqStr.startsWith('80')) shouldAdd = true;
                    if (shouldAdd) equipamentosMap.set(eqStr, (equipamentosMap.get(eqStr) || 0) + distributedPeso);
                });
            });
            return Array.from(equipamentosMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
                .map(([codigo, peso]) => ({ codigo, peso, frente: this.findMostCommonFront(data, codigo) }));
        }

        getTopOperadoresColheitaPropria(data) {
            const operadoresMap = new Map(); 

            data.forEach(row => {
                const peso = parseFloat(row.peso) || 0;
                if (peso === 0) return;
                const allEquipment = this.analyzer._extractEquipments(row);
                if (!allEquipment.some(eq => String(eq).startsWith('80'))) return;

                const listaOperadores = (row.operadores && row.operadores.length > 0) ? row.operadores : (row.operador ? [row.operador] : []);
                const validOperadores = listaOperadores.filter(op => String(op).trim().length > 0 && !String(op).toUpperCase().includes('TOTAL'));
                if (validOperadores.length === 0) return;
                const distributedPeso = peso / validOperadores.length;

                validOperadores.forEach(opStr => {
                    const opFull = String(opStr).trim();
                    const opCode = opFull.replace(/[^0-9]/g, ''); 
                    if (!opCode) return;

                    if (!operadoresMap.has(opCode)) {
                        operadoresMap.set(opCode, { 
                            codigo: opCode,
                            bestName: opFull, 
                            peso: 0, 
                            frente: row.frente || 'N/A' 
                        });
                    }
                    
                    const entry = operadoresMap.get(opCode);
                    entry.peso += distributedPeso;
                    
                    const hasLettersRegex = /[a-zA-Z\u00C0-\u00FF]/;
                    const currentHasLetters = hasLettersRegex.test(entry.bestName);
                    const newHasLetters = hasLettersRegex.test(opFull);

                    if ((!currentHasLetters && newHasLetters) || (currentHasLetters && newHasLetters && opFull.length > entry.bestName.length)) {
                        entry.bestName = opFull;
                    }
                });
            });

            return Array.from(operadoresMap.values()).sort((a, b) => b.peso - a.peso).slice(0, 5)
                .map(item => {
                    // Tenta encontrar o nome do operador nas descrições
                    let displayName = this.findOperatorName(data, item.codigo);
                    
                    // Se não encontrou nas descrições, usa o melhor nome disponível
                    if (!displayName) {
                        displayName = item.bestName.replace(/^[0-9]+\s*(?:-|–)?\s*/, '').trim();
                        if (displayName.length === 0) displayName = item.bestName;
                    }

                    return {
                        codigo: displayName, 
                        peso: item.peso,
                        frente: this.findMostCommonFront(data, item.codigo) 
                    };
                });
        }

        getTopTransbordos(data) {
            const transbordoMap = new Map();
            
            data.forEach(row => {
                const peso = parseFloat(row.peso) || 0;
                if (peso === 0 || !this.analyzer.isTerceiro(row)) return;
                
                let transbordos = [];
                if (row.transbordos && Array.isArray(row.transbordos)) transbordos = row.transbordos;
                else if (row.transbordo) transbordos = [row.transbordo];
                
                transbordos = [...new Set(transbordos.filter(t => t && !String(t).toUpperCase().includes('TOTAL')))];
                if (transbordos.length === 0) return;
                
                const distPeso = peso / transbordos.length;
                transbordos.forEach(tr => {
                    const trStr = String(tr).trim();
                    if(trStr.startsWith('92')) {
                        const trCode = trStr.replace(/[^0-9]/g, '');
                        if (!transbordoMap.has(trCode)) {
                            transbordoMap.set(trCode, { 
                                codigo: trCode,
                                codigoOriginal: trStr,
                                peso: 0 
                            });
                        }
                        const entry = transbordoMap.get(trCode);
                        entry.peso += distPeso;
                    }
                });
            });
            
            return Array.from(transbordoMap.values()).sort((a, b) => b.peso - a.peso).slice(0, 5)
                .map(item => {
                    // Tenta encontrar o nome do operador do transbordo nas descrições
                    let displayName = this.findTransbordoOperatorName(data, item.codigo);
                    
                    // Se não encontrou, usa o código do transbordo
                    if (!displayName) {
                        displayName = item.codigoOriginal;
                    }

                    return {
                        codigo: displayName,
                        peso: item.peso, 
                        frente: this.findMostCommonFront(data, item.codigo) 
                    };
                });
        }

        analyzeCamEscravo(data) { return []; }
        analyzeMetas(metaData, frentesAnalysis) { return metaData; }
    }
    window.DataAnalyzerRankings = DataAnalyzerRankings;
}