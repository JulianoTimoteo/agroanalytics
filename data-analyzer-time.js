// data-analyzer-time.js - VERSÃO BLINDADA CONTRA ERROS DE FORMATAÇÃO E DIVISÃO
class DataAnalyzerTime {

    constructor(analyzer) {
        this.analyzer = analyzer;
    }

    /**
     * Auxiliar de Segurança: Garante que o valor é um número JS válido (float/int)
     * Converte "22.000,00" -> 22000.00
     */
    _safeNumber(val, defaultValue = 0) {
        if (val === null || val === undefined || val === '') return defaultValue;
        if (typeof val === 'number') return isNaN(val) ? defaultValue : val;
        
        // Se for string, limpa formatação BR
        let str = String(val).trim();
        if (str.includes(',') || str.includes('.')) {
            // Remove pontos de milhar e troca vírgula por ponto
            str = str.replace(/\./g, '').replace(',', '.');
        }
        
        const parsed = parseFloat(str);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Gera os dados para o gráfico de barras 24h (Moagem Real e Meta)
     */
    analyze24hComplete(data) {
        const buckets = this._initHourlyBuckets();
        
        if (!data || !Array.isArray(data)) return [];

        data.forEach(row => {
            if (this.analyzer.isAggregationRow(row)) return;
            
            const hourIndex = this._getAgroIndexFromRow(row);
            if (hourIndex === -1) return;

            const peso = this._safeNumber(row.peso);
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
            taxaAnalise: b.viagens > 0 ? Math.round((b.analisadas / b.viagens) * 100) : 0
        }));
    }

    /**
     * Gera os dados para o gráfico de Frota Horária (Própria vs Terceiros)
     */
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

    /**
     * Gera dados detalhados de Frentes por hora
     */
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

        // Cria um dataset para cada frente encontrada
        const datasets = uniqueFronts.map(frente => {
            const dataPoints = buckets.map(b => parseFloat((b.frentes[frente] || 0).toFixed(2)));
            return {
                label: `Frente ${frente}`,
                data: dataPoints
            };
        });

        return { labels, datasets };
    }

    /**
     * Calcula a projeção de moagem para o fim do dia
     * ESTE É O PONTO CRÍTICO QUE ESTAVA FALHANDO
     */
    calculateProjectionMoagem(data, totalReal) {
        const empty = this._emptyProjection();
        
        if (!data || data.length === 0) return empty;

        // 1. Sanitiza a Meta vinda do Storage (Blindagem)
        const metaStorage = localStorage.getItem('metaMoagem');
        const meta = this._safeNumber(metaStorage, 25000); // Default 25000 se falhar

        // 2. Calcula horas passadas
        let lastHourWithDataIndex = -1;
        const buckets = this.analyze24hComplete(data);
        
        buckets.forEach((b, index) => {
            if (b.peso > 0) lastHourWithDataIndex = index;
        });

        if (lastHourWithDataIndex === -1) return empty;

        const hoursPassed = lastHourWithDataIndex + 1;
        
        // 3. Calcula Ritmo e Projeção
        const totalRealSafe = this._safeNumber(totalReal);
        const rhythm = hoursPassed > 0 ? totalRealSafe / hoursPassed : 0;
        const forecast = rhythm * 24;
        const diff = forecast - meta;
        
        // 4. Define Status
        let status = 'Calculando...';
        if (forecast >= meta) status = 'Bater a meta';
        else status = 'Abaixo da meta';

        // 5. Cálculo do Ritmo Necessário para as horas restantes
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
        // Blindagem da Meta novamente para o gráfico de linha pontilhada
        const metaStorage = localStorage.getItem('metaMoagem');
        const meta = this._safeNumber(metaStorage, 25000);
        
        const hourlyMeta = meta / 24;
        return new Array(24).fill(parseFloat(hourlyMeta.toFixed(2)));
    }

    analyzePotential(potentialData) {
        return potentialData || [];
    }

    // --- MÉTODOS AUXILIARES PRIVADOS ---

    _initHourlyBuckets() {
        const buckets = [];
        // Turno Agro: 06:00 de hoje até 05:00 de amanhã
        for (let i = 0; i < 24; i++) {
            const hour = (i + 6) % 24; // 6, 7, ..., 23, 0, ..., 5
            const timeLabel = `${String(hour).padStart(2, '0')}:00`;
            buckets.push({
                label: timeLabel,
                hour: hour,
                peso: 0,
                viagens: 0,
                analisadas: 0,
                propria: 0,
                terceiros: 0,
                frentes: {} 
            });
        }
        return buckets;
    }

    _getAgroIndexFromRow(row) {
        let horaStr = row.hora;
        
        if (!horaStr && row.timestamp instanceof Date) {
            horaStr = `${row.timestamp.getHours()}:${row.timestamp.getMinutes()}`;
        }

        if (!horaStr) return -1;

        const parts = horaStr.split(':');
        const h = parseInt(parts[0], 10);
        
        if (isNaN(h)) return -1;

        if (h >= 6) return h - 6;
        return h + 18;
    }

    _isAnalysed(row) {
        const val = row.analisado;
        if (val === true || val === 'SIM' || val === 'S' || val === 1) return true;
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

if (typeof window !== 'undefined') window.DataAnalyzerTime = DataAnalyzerTime;