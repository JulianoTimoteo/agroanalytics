// data-analyzer-time.js - VERSÃO UNIVERSAL (CORREÇÃO DE LEITURA DE HORAS MISTAS E PROJEÇÃO)
if (typeof DataAnalyzerTime === 'undefined') {
    class DataAnalyzerTime {

        constructor(analyzer) {
            this.analyzer = analyzer;
        }

        _initHourlyBuckets() {
            const buckets = [];
            // Cria buckets do ciclo agrícola: 06:00 até 05:00 do dia seguinte
            for (let i = 0; i < 24; i++) {
                const hour = (i + 7) % 24; // Ajustado para iniciar as 07:00 conforme padrão agro
                const timeLabel = `${String(hour).padStart(2, '0')}:00`;
                buckets.push({
                    label: timeLabel,
                    hour: hour,
                    peso: 0,
                    viagens: 0,
                    analisadas: 0,
                    propria: 0,
                    terceiros: 0,
                    potencialSum: 0,
                    potencialCount: 0,
                    rotacaoSum: 0,
                    rotacaoCount: 0,
                    dispColhSum: 0,
                    dispTransSum: 0,
                    dispCamSum: 0,
                    frentes: {} 
                });
            }
            return buckets;
        }

        /**
         * Auxiliar de Segurança: Garante que o valor é um número JS válido
         * Trata: "1.000,00" (BR), "1000.00" (US), 0.57, "57%"
         */
        _safeNumber(val, defaultValue = 0) {
            if (val === null || val === undefined || val === '') return defaultValue;
            if (typeof val === 'number') return isNaN(val) ? defaultValue : val;
            
            // Se for string, limpa formatação BR
            let str = String(val).trim();
            
            // Remove % se existir
            if (str.includes('%')) str = str.replace('%', '');

            // Lógica de detecção de formato
            if (str.includes(',') && str.includes('.')) {
                // Formato misto (ex: 1.000,50 ou 1,000.50)
                // Assume que o último separador é o decimal
                const lastDot = str.lastIndexOf('.');
                const lastComma = str.lastIndexOf(',');
                
                if (lastComma > lastDot) {
                    // Formato BR: 1.000,50 -> Remove ponto, troca vírgula
                    str = str.replace(/\./g, '').replace(',', '.');
                } else {
                    // Formato US: 1,000.50 -> Remove vírgula
                    str = str.replace(/,/g, '');
                }
            } else if (str.includes(',')) {
                // Apenas vírgula (ex: 57,5) -> Troca por ponto
                str = str.replace(',', '.');
            }
            
            const parsed = parseFloat(str);
            return isNaN(parsed) ? defaultValue : parsed;
        }

        /**
         * 🔥 LÓGICA DE DETECÇÃO DE HORA UNIVERSAL
         * Aceita: "06:00", "6", "1900-01-01 06:00:00", Date Object, Excel Serial, etc.
         */
        _getAgroIndexFromRow(row) {
            let h = -1;

            // 1. Tenta ler direto da coluna 'hora' ou 'HORA' (Prioridade)
            let val = row.hora || row.HORA || row.time;

            if (val !== undefined && val !== null && val !== '') {
                // Se for objeto Date
                if (val instanceof Date && !isNaN(val.getTime())) {
                    h = val.getHours();
                } 
                // Se for string
                else if (typeof val === 'string') {
                    val = val.trim();
                    // Caso 1: Formato "1900-01-01 06:00:00" ou "2023-10-25T06:00:00"
                    const match = val.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
                    if (match) {
                        h = parseInt(match[1], 10);
                    }
                    // Caso 2: Formato Simples "06:00" ou "6:00"
                    else if (val.includes(':')) {
                        h = parseInt(val.split(':')[0], 10);
                    }
                    // Caso 3: Apenas número "6" ou "06"
                    else if (!isNaN(parseInt(val))) {
                        h = parseInt(val, 10);
                    }
                }
                // Se for número (ex: Excel fraction 0.25 = 06:00)
                else if (typeof val === 'number') {
                    if (val < 1) {
                        h = Math.floor(val * 24);
                    } else {
                        if (val < 24) h = Math.floor(val);
                        else {
                            const decimal = val - Math.floor(val);
                            h = Math.floor(decimal * 24);
                        }
                    }
                }
            }

            // 2. Se falhou, tenta ler do timestamp principal da linha
            if ((h === -1 || isNaN(h)) && row.timestamp instanceof Date) {
                h = row.timestamp.getHours();
            }

            // 3. Validação Final
            if (h < 0 || h > 23 || isNaN(h)) return -1;

            // Converte hora real (0-23) para índice agrícola (começando as 07:00)
            // 07:00 -> Index 0
            // 06:00 -> Index 23
            if (h >= 7) return h - 7;
            return h + 17;
        }

        analyze24hComplete(data) {
            const buckets = this._initHourlyBuckets();
            
            if (!data || !Array.isArray(data)) return [];

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                
                const hourIndex = this._getAgroIndexFromRow(row);
                if (hourIndex === -1) return;

                const peso = this._safeNumber(row.peso || row.pesoLiquido || row.PESO);
                const analisado = this._isAnalysed(row);

                buckets[hourIndex].peso += peso;
                buckets[hourIndex].viagens += 1;
                if (analisado) buckets[hourIndex].analisadas += 1;
            });

            // Formata para Array garantindo precisão decimal
            return buckets.map(b => ({
                time: b.label,
                peso: parseFloat(b.peso.toFixed(2)),
                viagens: b.viagens,
                analisadas: b.analisadas,
                taxaAnalise: b.viagens > 0 ? Math.round((b.analisadas / b.viagens) * 100) : 0
            }));
        }

        analyzeFleetHourly(data) {
            const buckets = this._initHourlyBuckets();
            
            if (!data || !Array.isArray(data)) return [];

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;

                const hourIndex = this._getAgroIndexFromRow(row);
                if (hourIndex === -1) return;

                const peso = this._safeNumber(row.peso);
                
                if (this.analyzer.isPropria(row)) {
                    buckets[hourIndex].propria += peso;
                } else if (this.analyzer.isTerceiro(row)) {
                    buckets[hourIndex].terceiros += peso;
                }
            });

            return buckets.map(b => {
                const total = b.propria + b.terceiros;
                let winner = '-';
                if (total > 0) {
                    winner = b.propria >= b.terceiros ? 'Própria' : 'Terceiros';
                }

                return {
                    time: b.label,
                    propria: parseFloat(b.propria.toFixed(2)),
                    terceiros: parseFloat(b.terceiros.toFixed(2)),
                    total: parseFloat(total.toFixed(2)),
                    winner: winner
                };
            });
        }

        analyzeFrontHourlyComplete(data) {
            const buckets = this._initHourlyBuckets();
            const frontsSet = new Set();
            
            if (!data || !Array.isArray(data)) return { labels: [], datasets: [] };

            data.forEach(row => {
                if (this.analyzer.isAggregationRow(row)) return;
                const hourIndex = this._getAgroIndexFromRow(row);
                if (hourIndex === -1) return;

                const frente = row.frente ? String(row.frente).trim() : 'N/A';
                const peso = this._safeNumber(row.peso);

                if (!buckets[hourIndex].frentes[frente]) {
                    buckets[hourIndex].frentes[frente] = 0;
                }
                buckets[hourIndex].frentes[frente] += peso;
                frontsSet.add(frente);
            });

            const labels = buckets.map(b => b.label);
            const uniqueFronts = Array.from(frontsSet).sort();

            const datasets = uniqueFronts.map(frente => {
                const dataPoints = buckets.map(b => parseFloat((b.frentes[frente] || 0).toFixed(2)));
                return {
                    label: `Frente ${frente}`,
                    data: dataPoints
                };
            });

            return { labels, datasets };
        }

        // FUNÇÃO ESSENCIAL PARA O PAINEL DE MOAGEM (RESTABELECIDA)
        calculateProjectionMoagem(data, totalReal) {
            const empty = this._emptyProjection();
            
            if (!data || data.length === 0) return empty;

            const metaStorage = localStorage.getItem('metaMoagem');
            const meta = this._safeNumber(metaStorage, 25000);

            // Identifica a última hora com dados reais
            let lastHourWithDataIndex = -1;
            const buckets = this.analyze24hComplete(data);
            
            // Varre buckets até encontrar o último com peso > 0
            // Importante: Considerar a hora atual do sistema também para não projetar futuro vazio como "0"
            const now = new Date();
            const currentHour = now.getHours();
            
            buckets.forEach((b, index) => {
                if (b.peso > 0) lastHourWithDataIndex = index;
            });

            if (lastHourWithDataIndex === -1) return empty;

            // +1 porque o índice 0 representa a primeira hora passada
            const hoursPassed = lastHourWithDataIndex + 1;
            
            const totalRealSafe = this._safeNumber(totalReal);
            
            // Ritmo médio = Total / Horas Passadas
            const rhythm = hoursPassed > 0 ? totalRealSafe / hoursPassed : 0;
            
            // Projeção = Ritmo * 24h
            const forecast = rhythm * 24;
            const diff = forecast - meta;
            
            let status = 'Calculando...';
            if (forecast >= meta) status = 'Bater a meta';
            else status = 'Abaixo da meta';

            const hoursRemaining = 24 - hoursPassed;
            const weightRemaining = meta - totalRealSafe;
            const requiredRhythm = hoursRemaining > 0 && weightRemaining > 0 ? weightRemaining / hoursRemaining : 0;

            return {
                forecast: parseFloat(forecast.toFixed(0)),
                rhythm: parseFloat(rhythm.toFixed(1)),
                hoursPassed: hoursPassed,
                status: status,
                forecastDifference: parseFloat(diff.toFixed(0)),
                requiredRhythm: parseFloat(requiredRhythm.toFixed(1))
            };
        }

        calculateRequiredHourlyRates(data, totalWeight) {
            const metaStorage = localStorage.getItem('metaMoagem');
            const meta = this._safeNumber(metaStorage, 25000);
            const hourlyMeta = meta / 24;
            return new Array(24).fill(parseFloat(hourlyMeta.toFixed(2)));
        }

        analyzePotential(potentialData) {
            if (!potentialData || potentialData.length === 0) return [];
            
            const buckets = this._initHourlyBuckets().map(b => ({
                ...b,
                potencialSum: 0, potencialCount: 0,
                rotacaoSum: 0, rotacaoCount: 0,
                dispColhSum: 0, dispTransSum: 0, dispCamSum: 0
            }));

            potentialData.forEach(row => {
                const index = this._getAgroIndexFromRow(row);
                if (index !== -1) {
                    const getVal = (keys) => {
                        for (const k of keys) if (row[k] !== undefined) return this._safeNumber(row[k]);
                        return 0;
                    };

                    const pot = getVal(['potencial', 'POTENCIAL']);
                    const rot = getVal(['rotacaoMoenda', 'ROTAÇÃO DA MOENDA', 'RPM', 'rotacao']);
                    
                    // Disponibilidades (Assume que vem 0-1 ou 0-100, será normalizado no app.js)
                    const dC = getVal(['dispColhedora', 'DISP COLHEDORA']);
                    const dT = getVal(['dispTransbordo', 'DISP TRANSBORDO']);
                    const dCam = getVal(['dispCaminhoes', 'DISP CAMINHÕES']);

                    if (pot > 0) { buckets[index].potencialSum += pot; buckets[index].potencialCount++; }
                    if (rot > 0) { buckets[index].rotacaoSum += rot; buckets[index].rotacaoCount++; }
                    
                    buckets[index].dispColhSum += dC;
                    buckets[index].dispTransSum += dT;
                    buckets[index].dispCamSum += dCam;
                }
            });

            return buckets.map(b => ({
                time: b.label,
                potencial: b.potencialCount > 0 ? b.potencialSum / b.potencialCount : 0,
                rotacao: b.rotacaoCount > 0 ? b.rotacaoSum / b.rotacaoCount : 0,
                dispColhedora: b.potencialCount > 0 ? b.dispColhSum / b.potencialCount : 0,
                dispTransbordo: b.potencialCount > 0 ? b.dispTransSum / b.potencialCount : 0,
                dispCaminhoes: b.potencialCount > 0 ? b.dispCamSum / b.potencialCount : 0,
                raw: b
            }));
        }

        _isAnalysed(row) {
            const val = row.analisado;
            if (val === true || val === 'SIM' || val === 'S' || val === 1) return true;
            if (typeof val === 'string' && val.toUpperCase().includes('SIM')) return true;
            if (typeof val === 'string' && val.toUpperCase() === 'ANALISADO') return true;
            return false;
        }

        _emptyProjection() {
            return {
                forecast: 0, rhythm: 0, hoursPassed: 0, 
                status: 'Sem dados', forecastDifference: 0, requiredRhythm: 0
            };
        }
    }

    window.DataAnalyzerTime = DataAnalyzerTime;
}