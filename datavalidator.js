// datavalidator.js - Validações de Dados (VERSÃO FINAL COM EXCLUSÃO DE CV GENÉRICO)
class DataValidator {
    validateAll(data) {
        const anomalies = [];
        
        // Validações existentes
        anomalies.push(...this.validateWeights(data));
        anomalies.push(...this.validateFrontReleases(data));
        anomalies.push(...this.validateCodes(data));
        anomalies.push(...this.validateAnomalies(data)); // <-- Modificado para ignorar grupos genéricos de CV
        anomalies.push(...this.validateHarvesterConflict(data));
        
        // Validação de Pesagem Ímpar no Fechamento
        anomalies.push(...this.validateOddWeights(data));
        
        // Classificação final: Alertas classificados por Fazenda/Frente
        anomalies.sort((a, b) => {
            if (a.fazenda && b.fazenda) {
                if (a.fazenda !== b.fazenda) return a.fazenda.localeCompare(b.fazenda);
                if (a.frente && b.frente) return a.frente.localeCompare(b.frente);
            }
            return 0;
        });

        return { anomalies, isValid: anomalies.length === 0 };
    }

    /**
     * @description Verifica se é linha de agregação/total para ignorar na análise geral.
     */
    isAggregationRow(row) {
        if (!row) return true;

        // CRÍTICO: Se for um FECHAMENTO DE VIAGEM (qtdViagem ~ 1) E tiver peso positivo, 
        // TRATAMOS COMO LINHA VÁLIDA, mesmo que contenha a palavra 'TOTAL' em algum lugar.
        if ((row.qtdViagem && Math.abs(row.qtdViagem - 1) < 0.05) && (row.peso && parseFloat(row.peso) > 0)) {
            return false;
        }
        
        // Verifica se é linha de total comum
        const valuesStr = Object.values(row).join(' ').toUpperCase();
        const hasTotal = valuesStr.includes('TOTAL');
        
        const frotaTotal = row.frota && row.frota.toString().toUpperCase().includes('TOTAL');
        const equipamentoTotal = row.equipamento && row.equipamento.toString().toUpperCase().includes('TOTAL');
        const operadorTotal = row.operador && row.operador.toString().toUpperCase().includes('TOTAL');
        const variedadeTotal = row.variedade && row.variedade.toString().toUpperCase().includes('TOTAL');
        const fazendaTotal = row.fazenda && row.fazenda.toString().toUpperCase().includes('TOTAL');
        const transbordoTotal = row.transbordo && row.transbordo.toString().toUpperCase().includes('TOTAL');

        return hasTotal || frotaTotal || equipamentoTotal || operadorTotal || variedadeTotal || fazendaTotal || transbordoTotal;
    }
    
    _getClosingLines(data) {
        const closingLineMap = new Map();
        for (let i = data.length - 1; i >= 0; i--) {
            const row = data[i];
            const viagem = row.viagem;
            if (!viagem || isNaN(row.peso) || row.peso <= 0) continue;
            if (!closingLineMap.has(viagem)) {
                closingLineMap.set(viagem, row);
            }
        }
        return closingLineMap;
    }
    
    _getFinalLoadPerTrip(data) {
        const tripTotalMap = new Map(); 
        data.forEach(row => {
            const viagem = row.viagem;
            const frota = row.frota;
            const frente = row.frente;
            const pesoLiquido = parseFloat(row.peso) || 0;

            if (!viagem || !frota || pesoLiquido === 0 || this.isAggregationRow(row)) return;

            if (!tripTotalMap.has(viagem)) {
                tripTotalMap.set(viagem, { peso: 0, frota: frota, frente: frente });
            }
            tripTotalMap.get(viagem).peso += pesoLiquido;
        });

        return Array.from(tripTotalMap.entries()).map(([viagem, data]) => ({
            viagem: viagem,
            frota: data.frota,
            frente: data.frente,
            peso: data.peso
        }));
    }

    /**
     * @description NOVO: Busca Frota e Viagem em linhas anteriores se a linha atual (TOTAL) for nula.
     */
    _getFallbackMetadata(data, currentRow) {
        const fallback = { 
            frota: currentRow.frota || 'N/A', 
            viagem: currentRow.viagem || currentRow.idViagem || 'N/A' 
        };
        
        // Se a Frota e a Viagem já estiverem preenchidas na linha atual, não precisa de fallback.
        if (currentRow.frota && currentRow.viagem) {
            return { frota: currentRow.frota, viagem: currentRow.viagem };
        }

        const liberacao = currentRow.liberacao;
        // Se não tiver liberação (chave para agrupar), retornamos o fallback original (N/A)
        if (!liberacao) return fallback; 

        // Itera as linhas anteriores para encontrar metadados válidos
        for (let i = data.indexOf(currentRow) - 1; i >= 0; i--) {
            const prevRow = data[i];
            
            // Verifica se a linha anterior tem a mesma liberação E não é uma linha de agregação (Total)
            if (prevRow.liberacao === liberacao && !this.isAggregationRow(prevRow)) {
                
                // Se encontrarmos a Frota Motriz e Viagem na linha de detalhe anterior:
                if (prevRow.frota && prevRow.viagem) {
                    fallback.frota = prevRow.frota;
                    
                    // Se a Viagem da linha atual era o ID de fallback (NO_FROTA), substituímos.
                    if (String(fallback.viagem).startsWith('NO_FROTA')) {
                        fallback.viagem = prevRow.viagem;
                    }
                    return fallback;
                }
            }
            // Se encontrarmos uma Liberação diferente, paramos a busca (fim do ciclo de viagem anterior).
            if (prevRow.liberacao && prevRow.liberacao !== liberacao) break;
            
            // Se encontrarmos outro fechamento de viagem/linha total anterior, paramos.
            if (prevRow.qtdViagem && Math.abs(prevRow.qtdViagem - 1) < 0.05 && prevRow !== currentRow) break;
        }

        return fallback;
    }

    validateOddWeights(data) {
        const anomalies = [];
        data.forEach(row => {
            if (row.qtdViagem && Math.abs(row.qtdViagem - 1) < 0.05) {
                const peso = parseFloat(row.peso);
                if (!peso || peso === 0) return;

                const centavos = Math.round(peso * 100);
                if (centavos % 2 !== 0) {
                    
                    // APLICAÇÃO DO FALLBACK: Se Frota/Viagem estiverem nulas, busca nas linhas anteriores.
                    const { frota: frotaId, viagem: viagemId } = this._getFallbackMetadata(data, row);
                    
                    anomalies.push({
                        type: 'PESO_IMPAR',
                        severity: 'critical',
                        title: 'Pesagem Ímpar Detectada',
                        message: `Viagem ${viagemId} fechou com peso de ${Utils.formatNumber(peso)} t (Final Ímpar).`,
                        detail: `Frota: ${frotaId} | O peso deve ser múltiplo de 20kg (ex: final par como .00, .02, .04).`,
                        viagem: viagemId, 
                        frota: frotaId
                    });
                }
            }
        });
        return anomalies;
    }

    validateWeights(data) {
        const anomalies = [];
        const lastRowViagens = new Set(); 
        const viagemLastRowMap = this._getClosingLines(data);
        
        data.forEach((row) => {
            const pesoBruto = row.pesoBruto; 
            const pesoTara = row.pesoTara;
            const pesoLiquido = row.peso; 
            
            // Usa o Fallback para garantir Frota/Viagem (necessário se o dado de origem estiver incompleto)
            const { frota: frotaId, viagem: viagemId } = this._getFallbackMetadata(data, row);
            
            if (!viagemId || isNaN(pesoLiquido) || pesoLiquido <= 0 || this.isAggregationRow(row)) return;
            
            if (!isNaN(pesoBruto) && !isNaN(pesoTara)) {
                const round2 = (num) => Math.round(num * 100) / 100;
                const pesoCalculado = pesoBruto - pesoTara;
                const diferenca = Math.abs(round2(pesoCalculado) - round2(pesoLiquido));
                
                if (diferenca > 0.05) { 
                    if (!frotaId.toString().toUpperCase().includes('TOTAL')) {
                        anomalies.push({
                            type: 'CALCULO_PESO',
                            severity: 'critical',
                            title: `Cálculo de Peso Incorreto (${frotaId})`,
                            message: `Viagem ${viagemId}: Reportado ${Utils.formatNumber(round2(pesoLiquido))} t vs Calculado ${Utils.formatNumber(round2(pesoCalculado))} t.`,
                            detail: `Diferença: ${Utils.formatNumber(diferenca, 2)} t`, 
                            viagem: viagemId
                        });
                    }
                }
            }
            
            const isClosingRow = viagemLastRowMap.get(viagemId) === row;
            if (isClosingRow && !lastRowViagens.has(viagemId)) {
                lastRowViagens.add(viagemId);
            }
        });
        return anomalies;
    }

    /**
     * @description DESATIVADO: Ignora Pesagem Duplicada, conforme solicitado pelo usuário.
     */
    validateDuplicateWeighings(data) {
        return []; 
    }

    validateFrontReleases(data) {
        // Mapa: Liberação -> { frentes: Set, fazendas: Set, viagens: Set }
        const releaseMap = new Map(); 
        const anomalies = [];
        
        data.forEach(row => {
            if (this.isAggregationRow(row)) return; 

            // Tratamento de segurança para conversão em string (evita crash se undefined)
            const liberacao = row.liberacao ? String(row.liberacao).trim() : null;
            const frente = row.frente ? String(row.frente).trim() : null;
            const fazenda = row.codFazenda ? String(row.codFazenda).trim() : null;
            
            // Usa o Fallback para garantir Viagem (necessário se o dado de origem estiver incompleto)
            const { viagem: viagemId } = this._getFallbackMetadata(data, row); 

            // Só processa se tiver Liberação e Frente válidas
            if (!liberacao || !frente) return; 
            
            // Agrupa pela LIBERAÇÃO (Chave Única)
            if (!releaseMap.has(liberacao)) {
                releaseMap.set(liberacao, { 
                    frentes: new Set(), 
                    fazendas: new Set(), 
                    viagens: new Set() 
                });
            }
            
            const entry = releaseMap.get(liberacao);
            entry.frentes.add(frente);
            if (fazenda) entry.fazendas.add(fazenda);
            
            // Adiciona a viagem de forma segura
            if (viagemId) entry.viagens.add(viagemId.toString());
        });

        // Verifica conflitos: 1 Liberação deve ter apenas 1 Frente
        releaseMap.forEach((details, liberacao) => {
            if (details.frentes.size > 1) {
                const frentesList = Array.from(details.frentes).join(', ');
                const fazendasList = Array.from(details.fazendas).join(', ');
                // Limita a exibição de viagens para não poluir o alerta
                const viagensArr = Array.from(details.viagens);
                const viagensList = viagensArr.slice(0, 5).join(', ') + (viagensArr.length > 5 ? '...' : '');

                anomalies.push({
                    type: 'LIBERACAO_CONFLITO',
                    severity: 'critical',
                    title: 'Conflito Crítico: Múltiplas Frentes na Mesma Liberação',
                    message: `A Liberação ${liberacao} está sendo usada nas frentes: ${frentesList}.`,
                    detail: `Isso viola a regra de unicidade (1 Liberação = 1 Frente). Fazenda(s): ${fazendasList} | Viagens: ${viagensList}`,
                    fazenda: fazendasList,
                    frente: frentesList, // Usado para ordenação
                    liberacao: liberacao,
                    viagens: viagensList
                });
            }
        });
        
        return anomalies;
    }

    validateHarvesterConflict(data) {
        const harvesterFrontMap = new Map();
        const anomalies = [];
        
        data.forEach(row => {
            // Usa o Fallback para garantir Viagem (necessário se o dado de origem estiver incompleto)
            const { viagem: viagemId } = this._getFallbackMetadata(data, row); 

            if (this.isAggregationRow(row) || !row.frente || !viagemId) return; 
            
            const frente = (row.frente || '').toString().trim();
            const peso = parseFloat(row.peso) || 0;
            if (!frente || peso === 0) return;

            const allEquipment = [];
            if (row.equipamento && !row.equipamento.toString().toUpperCase().includes('TOTAL')) allEquipment.push(row.equipamento);
            if (row.equipamentos && Array.isArray(row.equipamentos)) {
                allEquipment.push(...row.equipamentos.filter(e => e && !e.toString().toUpperCase().includes('TOTAL')));
            }
            
            const validHarvesters = allEquipment.filter(eq => {
                const eqStr = (eq || '').toString().trim();
                return /^(80|93)\d{3,4}$/.test(eqStr);
            });

            validHarvesters.forEach(harvester => {
                const hStr = harvester.toString().trim();
                if (!harvesterFrontMap.has(hStr)) {
                    harvesterFrontMap.set(hStr, new Set());
                }
                harvesterFrontMap.get(hStr).add(frente);
            });
        });
        
        harvesterFrontMap.forEach((frentes, harvester) => {
            if (frentes.size > 1) {
                anomalies.push({
                    type: 'COLHEDORA_CONFLITO_FRONTES',
                    severity: 'critical', 
                    title: 'Colhedora Usada em Múltiplas Frentes',
                    message: `Colhedora ${harvester} está operando nas frentes: ${Array.from(frentes).join(', ')}.`,
                    detail: `Verifique o planejamento e o registro de tempo/peso.`,
                    colhedora: harvester, 
                    frente: Array.from(frentes).join(', ')
                });
            }
        });
        return anomalies;
    }

    validateCodes(data) {
        const anomalies = [];
        data.forEach(row => {
            const { frota: frotaId } = this._getFallbackMetadata(data, row); // Usa o Fallback

            if (frotaId && frotaId !== 'N/A' && !frotaId.toUpperCase().includes('TOTAL') && !/^(31|32|91|92|80|93)/.test(frotaId)) {
                anomalies.push({
                    type: 'CODIGO_INVALIDO',
                    severity: 'warning',
                    title: 'Código de Frota Inválido',
                    message: `Frota ${frotaId} não segue padrão esperado.`,
                    frota: frotaId
                });
            }
        });
        return anomalies;
    }

    validateAnomalies(data) {
        const anomalies = [];
        // Filtramos os dados no início para usar a frota correta (com fallback) no agrupamento
        const combinedData = data.filter(row => !row.frota?.toString().toUpperCase().includes('TOTAL')).map(row => {
             const { frota: frotaId, viagem: viagemId } = this._getFallbackMetadata(data, row);
             return { ...row, frota: frotaId, viagem: viagemId };
        });
        
        const groups = {};
        const tripData = new Map(); 

        combinedData.forEach(row => {
            const frota = (row.frota ?? '').toString(); 
            const equipamento = (row.equipamento ?? '').toString();
            const tipoCarga = (row.tipoCarga ?? 'NO_CARGA').toString().toUpperCase().replace(/[^A-Z0-9]/g, '_'); // Adiciona Tipo Carga
            const pesoLiquido = parseFloat(row.peso) || 0; 
            const viagem = row.viagem; 

            if (!frota || pesoLiquido <= 0 || !viagem || frota === 'N/A') return; // Ignora N/A

            // Agrupa por: Frota - Equipamento - Tipo Carga
            const equipamentoStr = (equipamento && !equipamento.toUpperCase().includes('N/A')) ? equipamento : 'NO_EQUIPAMENTO';
            const configKey = `${frota}-${equipamentoStr}-${tipoCarga}`; 
            const uniqueTripKey = `${configKey}-${viagem}`;

            if (!tripData.has(uniqueTripKey)) {
                tripData.set(uniqueTripKey, { frotaEquipamentoTipoCarga: configKey, peso: 0, viagem: viagem });
            }
            tripData.get(uniqueTripKey).peso += pesoLiquido;
        });

        const THRESHOLD_STD_DEV = 15; 
        const MAX_VIAGENS_DETAIL = 5; 

        tripData.forEach(item => {
            const key = item.frotaEquipamentoTipoCarga;
            if (!groups[key]) groups[key] = { pesos: [], count: 0, viagens: new Set() };
            groups[key].pesos.push(item.peso);
            groups[key].count++;
            groups[key].viagens.add(item.viagem);
        });

        for (const key in groups) {
            const { pesos, count, viagens } = groups[key];

            // **********************************************
            // MODIFICAÇÃO: Ignora o cálculo do CV para grupos genéricos/incompletos
            if (key.includes('NO_EQUIPAMENTO') || key.includes('NO_CARGA')) {
                // Se a chave for genérica (falta Equipamento ou Tipo Carga), ignora a validação de CV
                continue; 
            }
            // **********************************************
            
            if (count < 5) continue; 

            const mean = pesos.reduce((a, b) => a + b, 0) / count;
            const variance = pesos.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / count;
            const stdDev = Math.sqrt(variance);
            
            // Coeficiente de Variação (CV)
            const cv = (stdDev / mean) * 100; 
            
            if (cv > THRESHOLD_STD_DEV) {
                const viagensArray = Array.from(viagens);
                const displayViagens = viagensArray.slice(0, MAX_VIAGENS_DETAIL).join(', ');
                const additionalCount = viagensArray.length - MAX_VIAGENS_DETAIL;

                let detailMessage = `Viagens envolvidas (Max ${MAX_VIAGENS_DETAIL}): ${displayViagens}`;
                if (additionalCount > 0) detailMessage += ` (+${additionalCount} outras viagens)`;

                anomalies.push({
                    type: 'VARIACAO_PESO',
                    severity: 'warning',
                    title: 'Alta Variação de Carga',
                    message: `Frota/Equipamento/Tipo Carga ${key} exibe Coeficiente de Variação de ${cv.toFixed(1)}% (Limite: ${THRESHOLD_STD_DEV}%).`,
                    frotaEquipamento: key,
                    detail: detailMessage
                });
            }
        }
        return anomalies;
    }
}

if (typeof DataValidator === 'undefined') {
    window.DataValidator = DataValidator;
}