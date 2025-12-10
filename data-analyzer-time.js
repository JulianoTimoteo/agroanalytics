// data-analyzer-time.js - Agregação Horária, Projeção e Meta Dinâmica
class DataAnalyzerTime {

    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    
    /**
     * Auxiliar: Obtém os pesos de moagem/potencial por hora (H06 a H05 do dia seguinte),
     * garantindo que os pesos sejam consolidados por ID de Viagem para evitar contagem dupla.
     */
    _getHourlyWeightsAndCounts(data) {
        const totalHoursInDay = 24;
        const startHour = 6;
        const hourlyWeights = {};
        const hoursPresent = new Set();
        
        // Map para armazenar o peso TOTAL e o TIMESTAMP de fechamento para cada ID de Viagem único
        const tripAggregationMap = new Map();

        // 1. Primeira Passagem: Consolida o peso total de cada ID de Viagem.
        data.forEach((row) => {
            if (this.analyzer.isAggregationRow(row)) return;
            const viagem = row.viagem || row.idViagem;
            const peso = parseFloat(row.peso) || 0;

            if (peso === 0 || !viagem) return;
            
            const key = String(viagem).trim();

            if (key.toUpperCase() === 'TOTAL') return; // Ignora explicitamente as linhas de Total do CSV
            
            if (!tripAggregationMap.has(key)) {
                tripAggregationMap.set(key, { totalPeso: 0, timestamp: null });
            }

            const tripData = tripAggregationMap.get(key);
            tripData.totalPeso += peso;
            
            // O timestamp da ÚLTIMA linha da viagem é o tempo efetivo para o bin horário.
            if (row.timestamp instanceof Date) {
                tripData.timestamp = row.timestamp;
            }
        });
        
        // 2. Segunda Passagem: Mapeia o peso final consolidado de cada viagem para o bin horário.
        for (let i = startHour; i < startHour + totalHoursInDay; i++) {
            hourlyWeights[i] = 0;
        }

        tripAggregationMap.forEach(trip => {
            if (!trip.timestamp) return;

            const rowHour = trip.timestamp.getHours();
            const hourAdjusted = rowHour < 6 ? rowHour + 24 : rowHour;
            const peso = trip.totalPeso;

            if (hourAdjusted >= startHour && hourAdjusted < startHour + totalHoursInDay) {
                hourlyWeights[hourAdjusted] += peso;
                hoursPresent.add(hourAdjusted);
            }
        });
        
        return { hourlyWeights, hoursPresent, totalHoursInDay, startHour };
    }

    analyzePotential(potentialData) {
        if (!potentialData || potentialData.length === 0) {
            return {
                disponibilidadeColhedora: 0,
                disponibilidadeTransbordo: 0,
                disponibilidadeCaminhoes: 0,
                potencialTotal: 0,
                caminhoesParados: 0,
                rotacaoMoenda: 0,
                eficienciaGeral: 0
            };
        }

        const totals = potentialData.reduce((acc, item) => {
            acc.dispColhedora += item['DISP COLHEDORA'] || 0;
            acc.dispTransbordo += item['DISP TRANSBORDO'] || 0;
            acc.dispCaminhoes += item['DISP CAMINHÕES'] || 0;
            acc.potencial += item.POTENCIAL || 0;
            acc.rotacaoMoenda += item['ROTAÇÃO DA MOENDA'] || 0;
            return acc;
        }, {
            dispColhedora: 0, dispTransbordo: 0, dispCaminhoes: 0,
            potencial: 0, rotacaoMoenda: 0
        });

        const count = potentialData.length;

        return {
            disponibilidadeColhedora: count > 0 ? totals.dispColhedora / count : 0,
            disponibilidadeTransbordo: count > 0 ? totals.dispTransbordo / count : 0,
            disponibilidadeCaminhoes: count > 0 ? totals.dispCaminhoes / count : 0,
            potencialTotal: totals.potencial,
            // Apenas retorna a média da rotação (o card usa o último valor bruto)
            rotacaoMoenda: count > 0 ? totals.rotacaoMoenda / count : 0, 
            eficienciaGeral: count > 0 ?
                ((totals.dispColhedora + totals.dispTransbordo + totals.dispCaminhoes) / (3 * count)) * 100 : 0
        };
    }
    
    calculateProjectionMoagem(data, calculatedTotalWeight) {
        const { hourlyWeights, hoursPresent, totalHoursInDay, startHour } = this._getHourlyWeightsAndCounts(data);

        const dailyTargetStr = localStorage.getItem('metaMoagem');
        const dailyTarget = parseFloat(dailyTargetStr) || 25000;

        const now = new Date();
        const currentHour = now.getHours();
        let lastClosedHourAdjusted = currentHour < startHour ? currentHour + 24 : currentHour;
        lastClosedHourAdjusted = (lastClosedHourAdjusted - 1 + 24) % 24; 
        if(lastClosedHourAdjusted < startHour) lastClosedHourAdjusted += 24;

        let closedHoursCount = 0;
        let endHour = lastClosedHourAdjusted; 
        let currentIterHour = startHour;

        while (currentIterHour <= lastClosedHourAdjusted) {
            closedHoursCount++;
            endHour = currentIterHour;
            currentIterHour++;
        }

        const hoursWithWeight = hoursPresent.size;
        const is24Hours = hoursWithWeight >= 23;

        let finalDenominator = is24Hours ? totalHoursInDay : (hoursWithWeight > 0 ? hoursWithWeight : 1);
        
        let projectionRate = 0;
        let currentRhythm = 0;
        let rhythmDifference = 0;
        let forecast = 0;
        let status = 'Calculando...';
        
        let weightForAverage = 0; 
        let hoursForAverage = 0; 
        
        // CÁLCULO DO RITMO AGREGADO (usado para projection.rhythm)
        if (finalDenominator > 0) {
            projectionRate = calculatedTotalWeight / finalDenominator;
            forecast = projectionRate * totalHoursInDay;

            let rhythmEndHour = lastClosedHourAdjusted; 

            for (let i = 0; i < 3; i++) {
                let currentHourKey = (rhythmEndHour - i);
                
                if (currentHourKey >= startHour) { 
                    const weight = hourlyWeights[currentHourKey] || 0;
                    weightForAverage += weight; 
                    hoursForAverage++; 
                }
            }
            
            currentRhythm = hoursForAverage > 0 ? weightForAverage / hoursForAverage : 0; 
            
            if (forecast >= dailyTarget) {
                status = 'Bater a meta'; 
            } else {
                status = 'Abaixo da meta'; 
            }
        } 

        // Cálculo do Ritmo Necessário (Rhythm Difference)
        const hoursRemaining = totalHoursInDay - closedHoursCount;
        const weightRemaining = Math.max(0, dailyTarget - calculatedTotalWeight);
        let requiredRhythmAbsolute = 0;

        if (hoursRemaining > 0) {
            requiredRhythmAbsolute = weightRemaining / hoursRemaining;
        } else if (closedHoursCount === totalHoursInDay) {
            status = 'Consolidado (24h)';
        }

        const forecastDifference = forecast - dailyTarget;

        return {
            forecast: parseFloat(forecast.toFixed(2)),
            rhythm: parseFloat(currentRhythm.toFixed(2)), 
            requiredRhythm: parseFloat(requiredRhythmAbsolute.toFixed(2)),
            hoursPassed: closedHoursCount,
            status: status,
            forecastDifference: parseFloat(forecastDifference.toFixed(2))
        };
    }

    calculateRequiredHourlyRates(data, calculatedTotalWeight) {
        const totalHoursInDay = 24;
        const startHour = 6;

        const dailyTargetStr = localStorage.getItem('metaMoagem');
        const dailyTarget = parseFloat(dailyTargetStr) || 25000;

        const { hourlyWeights, hoursPresent } = this._getHourlyWeightsAndCounts(data);
        
        const rates = {};
        let accumulatedWeight = 0;

        const now = new Date();
        const currentHourAdjusted = now.getHours() < startHour ? now.getHours() + 24 : now.getHours();

        const isDayComplete = hoursPresent.size >= totalHoursInDay; 

        for (let h = startHour; h < startHour + totalHoursInDay; h++) {
            const currentHourWeight = hourlyWeights[h] || 0;

            if (h <= currentHourAdjusted) {
                accumulatedWeight += currentHourWeight;
            }

            const hoursElapsedSinceStart = h - startHour + 1;
            const hoursRemaining = totalHoursInDay - hoursElapsedSinceStart;
            const remainingTarget = Math.max(0, dailyTarget - accumulatedWeight);

            let requiredRate = 0;

            if (isDayComplete || accumulatedWeight >= dailyTarget) {
                 requiredRate = dailyTarget / totalHoursInDay;
            } else if (hoursRemaining > 0) {
                 requiredRate = remainingTarget / hoursRemaining;
            } else if (hoursRemaining === 0) {
                 requiredRate = remainingTarget;
            }

            const displayHour = h % 24;
            const hourKey = String(displayHour).padStart(2, '0') + ':00';

            rates[hourKey] = requiredRate;
        }

        const sortedRates = [];
        for (let h = startHour; h < startHour + totalHoursInDay; h++) {
            const displayHour = h % 24;
            const hourKey = String(displayHour).padStart(2, '0') + ':00';
            sortedRates.push(rates[hourKey] || 0);
        }

        return sortedRates;
    }
    
    analyze24hComplete(data) {
        const hourlyData = {};
        const startHour = 6;

        for (let i = startHour; i <= 29; i++) {
            hourlyData[i] = {
                viagensSet: new Set(),
                peso: 0,
                analisadasSet: new Set()
            };
        }

        data.forEach(row => {
            if (this.analyzer.isAggregationRow(row)) return;

            const viagem = row.viagem || row.idViagem;
            const frota = row.frota;
            if (!viagem || !frota) return;

            const viagemStr = viagem.toString().trim();
            const frotaStr = frota.toString().trim();
            if (viagemStr === '' || frotaStr === '' || frotaStr.toUpperCase().includes('TOTAL')) return;

            const chaveViagem = `${viagemStr}_${frotaStr}`;
            let hora = -1;

            if (row.timestamp && row.timestamp instanceof Date) {
                hora = row.timestamp.getHours();
            } else if (row.hora) {
                const horaStr = row.hora.toString();
                const match = horaStr.match(/(\d{1,2})[:h]/) || horaStr.match(/^(\d{1,2})$/);
                if (match) hora = parseInt(match[1], 10);
            }

            if (hora >= 0 && hora < 24) {
                const horaAjustada = hora < startHour ? hora + 24 : hora;

                if (horaAjustada >= startHour && horaAjustada <= 29) {
                    hourlyData[horaAjustada].viagensSet.add(chaveViagem);

                    const peso = parseFloat(row.peso) || 0;
                    hourlyData[horaAjustada].peso += peso;

                    const analisado = row.analisado;
                    const isAnalisado = analisado === true || analisado === 'SIM' || analisado === 'S' || analisado === '1' || (typeof analisado === 'string' && analisado.toUpperCase() === 'ANALISADO');
                    if (isAnalisado) hourlyData[horaAjustada].analisadasSet.add(chaveViagem);
                }
            }
        });

        const result = [];
        for (let i = startHour; i <= 29; i++) {
            const h = hourlyData[i];
            const viagens = h.viagensSet.size;
            const analisadas = h.analisadasSet.size;
            const taxa = viagens > 0 ? (analisadas / viagens) * 100 : 0;
            let horaLabel = i <= 23 ? String(i).padStart(2, '0') + ':00' : String(i - 24).padStart(2, '0') + ':00';

            result.push({
                time: horaLabel,
                viagens: viagens,
                peso: h.peso,
                taxaAnalise: parseFloat(taxa.toFixed(0))
            });
        }
        return result;
    }

    // Removida a função analyzeHarvestHourly
    
    analyzeFleetHourly(data) {
        const hourlyData = {};
        const startHour = 6;

        for (let i = startHour; i <= 29; i++) {
            hourlyData[i] = { propria: 0, terceiros: 0, total: 0 };
        }

        data.forEach(row => {
            if (this.analyzer.isAggregationRow(row)) return; 
            const peso = parseFloat(row.peso) || 0;
            if (peso === 0) return;

            let hora = -1;
            if (row.timestamp && row.timestamp instanceof Date) {
                hora = row.timestamp.getHours();
            } else if (row.hora) {
                const horaStr = row.hora.toString();
                const match = horaStr.match(/(\d{1,2})[:h]/) || horaStr.match(/^(\d{1,2})$/);
                if (match) hora = parseInt(match[1], 10);
            }

            if (hora >= 0 && hora < 24) {
                const horaAjustada = hora < startHour ? hora + 24 : hora;

                if (horaAjustada >= startHour && horaAjustada <= 29) {
                    const frotaStr = (row.frota || '').toString();

                    const isPropria = this.analyzer.constructor.FROTA_PROPRIA.some(prefix => frotaStr.startsWith(prefix));

                    if (isPropria) {
                        hourlyData[horaAjustada].propria += peso;
                    } else if (this.analyzer.constructor.FROTA_TERCEIROS.some(prefix => frotaStr.startsWith(prefix))) {
                        hourlyData[horaAjustada].terceiros += peso;
                    }
                    hourlyData[horaAjustada].total += peso;
                }
            }
        });

        const result = [];
        for (let i = startHour; i <= 29; i++) {
            const h = hourlyData[i];
            const total = h.total;

            let horaLabel = i <= 23 ? String(i).padStart(2, '0') + ':00' : String(i - 24).padStart(2, '0') + ':00';

            const percPropria = total > 0 ? (h.propria / total) * 100 : 0;
            const percTerceiros = total > 0 ? (h.terceiros / total) * 100 : 0;

            result.push({
                time: horaLabel,
                propria: h.propria,
                terceiros: h.terceiros,
                total: total,
                percPropria: parseFloat(percPropria.toFixed(1)),
                percTerceiros: parseFloat(percTerceiros.toFixed(1)),
                winner: h.propria > h.terceiros ? 'Própria' : (h.terceiros > h.propria ? 'Terceiros' : 'Empate')
            });
        }
        return result;
    }

    analyzeFrontHourlyComplete(data) {
        const hourlyFrontData = {};
        const frontsSet = new Set();
        const startHour = 6;

        for(let i = startHour; i <= 29; i++) {
            hourlyFrontData[i] = {
                pesos: {},
                viagensAdicionadas: new Set()
            };
        }

        data.forEach(row => {
            if (this.analyzer.isAggregationRow(row)) return; 

            const viagem = row.viagem || row.idViagem; 
            const frota = row.frota;
            const frente = row.frente;
            if (!viagem || !frota || !frente) return;

            const viagemStr = viagem.toString().trim();
            const frotaStr = frota.toString().trim();
            const frenteStr = frente.toString().trim();
            if (viagemStr === '' || frotaStr === '' || frenteStr === '' || frotaStr.toUpperCase().includes('TOTAL')) return;

            const chaveViagem = `${viagemStr}_${frotaStr}`;
            const chaveFrente = frenteStr;
            let hora = -1;

            if (row.timestamp && row.timestamp instanceof Date) {
                hora = row.timestamp.getHours();
            } else if (row.hora) {
                const horaStr = row.hora.toString();
                const match = horaStr.match(/(\d{1,2})[:h]/) || horaStr.match(/^(\d{1,2})$/);
                if (match) hora = parseInt(match[1], 10);
            }

            if (hora >= 0 && hora < 24) {
                const horaAjustada = hora < startHour ? hora + 24 : hora;

                if (horaAjustada >= startHour && horaAjustada <= 29) {
                    frontsSet.add(frenteStr);

                    if (!hourlyFrontData[horaAjustada].pesos[frenteStr]) {
                        hourlyFrontData[horaAjustada].pesos[frenteStr] = 0;
                    }

                    const peso = parseFloat(row.peso) || 0;
                    hourlyFrontData[horaAjustada].pesos[frenteStr] += peso;
                    hourlyFrontData[horaAjustada].viagensAdicionadas.add(chaveViagem);
                }
            }
        });

        const labels = [];
        for(let i = startHour; i <= 29; i++) {
            let horaLabel = i <= 23 ? String(i).padStart(2, '0') + ':00' : String(i - 24).padStart(2, '0') + ':00';
            labels.push(horaLabel);
        }

        const datasets = Array.from(frontsSet).map(frente => {
            const dataPoints = [];
            for(let i = startHour; i <= 29; i++) {
                dataPoints.push(Math.round(hourlyFrontData[i].pesos[frente] || 0));
            }
            return {
                label: `Frente ${frente}`,
                data: dataPoints
            };
        });

        return { labels, datasets };
    }

}

if (typeof DataAnalyzerTime === 'undefined') {
    window.DataAnalyzerTime = DataAnalyzerTime;
}