// intelligent-processor.js - VERSÃO "VALE TUDO" PARA HORÁRIOS (CORREÇÃO DE GRÁFICOS)
class IntelligentProcessor {
    constructor() {
        this.columnMappings = {
            'production': {
                'viagem': ['VIAGEM', 'N VIAGEM', 'NUMERO VIAGEM'],
                'frota': ['FROTA MOTRIZ', 'FROTA', 'MOTRIZ', 'CAMINHAO'],
                'equipamento': ['EQUIPAMENTO', 'COLHEDORA', 'CARREG COLHED', 'CARREG COLHED 1', 'CARREG./COLHED. 1'],
                'equipamento2': ['CARREG COLHED 2', 'CARREG./COLHED. 2'], 
                'equipamento3': ['CARREG COLHED 3', 'CARREG./COLHED. 3'], 
                'op1_cod': ['COD OPER CARREG COLHED 1', 'COD.OPER.CARREG./COLHED. 1', 'COD OPERADOR 1'],
                'op1_dsc': ['DSC OPER CARREG COLHED 1', 'DSC.OPER.CARREG./COLHED. 1', 'NOME OPERADOR 1', 'DSC OPER CARREG COLHED'],
                'op2_cod': ['COD OPER CARREG COLHED 2', 'COD.OPER.CARREG./COLHED. 2', 'COD OPERADOR 2'],
                'op2_dsc': ['DSC OPER CARREG COLHED 2', 'DSC.OPER.CARREG./COLHED. 2', 'NOME OPERADOR 2'],
                'op3_cod': ['COD OPER CARREG COLHED 3', 'COD.OPER.CARREG./COLHED. 3', 'COD OPERADOR 3'],
                'op3_dsc': ['DSC OPER CARREG COLHED 3', 'DSC.OPER.CARREG./COLHED. 3', 'NOME OPERADOR 3'],
                'operador_generico': ['OPERADOR', 'COD OPERADOR', 'MOTORISTA'], 
                'transbordo': ['TRANSBORDO', 'TRAT TRANSBORDO', 'TRAT TRANSBORDO 1', 'TRAT. TRANSBORDO 1'],
                'transbordo2': ['TRAT TRANSBORDO 2', 'TRAT. TRANSBORDO 2'], 
                'transbordo3': ['TRAT TRANSBORDO 3', 'TRAT. TRANSBORDO 3'],
                'peso': ['PESO LIQUIDO', 'PESO FINAL', 'PESO LÍQUIDO'], 
                'pesoBruto': ['PESO BRUTO'],
                'pesoTara': ['PESO TARA'],
                'dia_balanca': ['DIA BALANCA', 'DATA ENTRADA', 'DATA/HORA ENTRADA'], 
                'data_saida': ['DATA/HORA SAÍDA', 'DATA/HORA SAIDA', 'DATA SAIDA', 'DATA/HORA SAÍDA\n'],
                'hora_saida': ['HORA SAÍDA', 'HORA SAIDA', 'HORA'],
                'frente': ['COD FRENTE', 'FRENTE'], 
                'cod_fazenda': ['COD FAZENDA', 'COD.FAZENDA', 'FAZENDA'], 
                'desc_fazenda': ['DESC FAZENDA', 'DESC.FAZENDA', 'NOME FAZENDA', 'FAZENDA NOME'],
                'variedade': ['VARIEDADE'],
                'analisado': ['ANALISADO'],
                'liberacao': ['LIBERAÇÃO', 'LIB', 'COD LIBERACAO'], 
                'tipoProprietarioFa': ['TIPO PROPRIETARIO F A', 'TIPO PROPRIETARIO (F.A.)', 'TIPO PROPRIETARIO', 'PROPRIETARIO', 'TIPO PROPRIEDADE'], 
                'qtdViagem': ['QTD VIAGEM', 'QUANTIDADE VIAGEM'],
                'distancia': ['DIST MEDIA', 'DISTANCIA', 'KM', 'RAIO MEDIO'],
                'status_frota': ['STATUS', 'FASE', 'FASE OPERACIONAL', 'STATUS CAMINHAO', 'SITUACAO ATUAL'] 
            },
            'potential': {
                'hora': ['HORA', 'HORA FIXA', 'HORA ESCALAR'],
                'dispColhedora': ['DISP COLHEDORA', 'DISPONIBILIDADE COLHEDORA'],
                'dispTransbordo': ['DISP TRANSBORDO', 'DISPONIBILIDADE TRANSBORDO'],
                'dispCaminhoes': ['DISP CAMINHOES', 'DISPONIBILIDADE CAMINHOES'],
                'potencial': ['POTENCIAL', 'CAPACIDADE'],
                'caminhoesParados': ['CAMINHOES PARADO', 'PARADO'],
                'caminhoesIda': ['CAMINHOES IDA'],
                'caminhoesCampo': ['CAMINHOES CAMPO'],
                'caminhoesVolta': ['CAMINHOES VOLTA'],
                'caminhoesDescarga': ['CAMINHOES DESCARGA'],
                'filaExterna': ['CAMINHOES FILA EXTERNA', 'FILA EXTERNA', 'CAMINHAO FILA EXTERNA'],
                'carretasCarregadas': ['CARRETAS CARREGADAS'],
                'rotacaoMoenda': ['ROTACAO DA MOENDA', 'ROTACAO MOENDA']
            },
            'meta': { 
                'frente': ['FRENTE', 'COD FRENTE'], 
                'cod_fazenda': ['F.A', 'FA', 'COD FAZENDA', 'CODIGO FAZENDA'],
                'desc_fazenda': ['DESCRICAO FAZENDA', 'DESC FAZENDA', 'NOME FAZENDA', 'FAZENDA'],
                'proprietario': ['PROPRIETARIO', 'PROP'],
                'colheitabilidade': ['COLHEITABILIDADE', 'COLHEITA'],
                'raio': ['RAIO'],
                'tmd': ['TMD'],
                'cd': ['CD'],
                'potencial': ['POTENCIAL'], 
                'meta': ['META'],
                'atr': ['ATR'],
                'maturador': ['MATURADOR', 'MAT'],
                'possivel_reforma': ['POSSIVEL REFORMA', 'POSSIVEL REFORMA', 'REFORMA'],
                'vel': ['VEL', 'VELOCIDADE'],
                'tc': ['TC'],
                'tch': ['TCH'],
                'ton_hora': ['TON HORA', 'TON/HORA', 'TONELADA HORA'],
                'potencial_campo': ['POTENCIAL CAMPO'],
                'cm_hora': ['CM HORA', 'CM (HORA)', 'CAMINHAO HORA'],
                'tempo_carre_min': ['TEMPO CARRE MIN', 'TEMPO.CARRE (MIN)', 'TEMPO CARREGAMENTO'],
                'cam': ['CAM', 'CAMINHOES', 'CAMINHAO'],
                'ciclo': ['CICLO'],
                'viagens': ['VIAGENS'],
                'tempo': ['TEMPO'],
                'previsao_mudanca': ['PREVISAO MUDANCA', 'PREVISÃO MUDANÇA', 'PREVISAO']
            },
            'acmSafra': {
                'pesoLiquido': ['PESO LIQUIDO', 'PESOLIQUIDO', 'LIQUIDO', 'PESO LÍQUIDO'],
                'pesoBruto': ['PESO BRUTO', 'PESOBRUTO', 'BRUTO'],
                'pesoTara': ['PESO TARA', 'PESOTARA', 'TARA'],
                'qtdViagem': ['QTD VIAGEM', 'QTDVIAGEM', 'QUANTIDADE DE VIAGENS', 'VIAGENS'],
                'distMedia': ['DIST MEDIA', 'DISTANCIA MEDIA', 'DIST. MEDIA']
            }
        };
    }
    
    _addToList(list, value) {
        if (value !== null && value !== undefined && value !== '' && String(value).toUpperCase() !== 'TOTAL' && String(value) !== '0') {
            const trimmedValue = String(value).trim();
            if (!list.includes(trimmedValue)) {
                 list.push(trimmedValue);
            }
        }
    }

    generateViagemId(item) {
        if (!item || !item.frota) return null;
        if (!item.data || !item.hora) return null;
        const data = item.data.replace(/\D/g, '');
        const hora = item.hora.replace(/\D/g, '').padEnd(4, '0');
        return `${data}${hora}${String(item.frota).replace(/\W/g, '')}`.toUpperCase();
    }

    // Função ROBUSTA para extrair APENAS a hora HH:MM de qualquer coisa
    _forceExtractTime(value) {
        if (value === null || value === undefined || value === '') return null;

        // 1. Se for um objeto Date
        if (value instanceof Date && !isNaN(value.getTime())) {
            // Ajusta fuso se necessário, mas pega a hora bruta
            return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
        }
        
        // 2. Se for número (fração de dia Excel, ex: 0.5 = 12:00)
        if (typeof value === 'number') {
            // Se for maior que 1, provavelmente é data+hora excel (44590.5). Pegamos só a fração.
            let fraction = value % 1; 
            const total_seconds = Math.floor(86400 * fraction);
            const hours = Math.floor(total_seconds / 3600);
            const minutes = Math.floor((total_seconds % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        const strValue = String(value).trim();

        // 3. Procura padrão HH:MM:SS ou HH:MM
        const timeMatch = strValue.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            let m = parseInt(timeMatch[2]);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        
        // 4. Se for apenas um número inteiro string "14" -> "14:00"
        if (/^\d{1,2}$/.test(strValue)) {
            let h = parseInt(strValue);
            if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
        }

        return null;
    }

    async processFile(dataOrFile, fileName) { 
        if (dataOrFile instanceof ArrayBuffer) {
            try {
                const workbook = XLSX.read(dataOrFile, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                
                if (!rawMatrix || rawMatrix.length === 0) return { type: 'UNKNOWN', fileName, data: [] };

                const fileType = this.identifyFileTypeIntelligently(rawMatrix, fileName);
                
                if (fileType.type === 'PRODUCTION') {
                    const ultimaSaida = this.getUltimaDataHoraSaida(worksheet, fileType.headerRow);
                    return {
                        type: 'PRODUCTION',
                        fileName,
                        data: this.processProductionData(worksheet, fileType.headerRow),
                        ultimaPesagem: ultimaSaida ? `${ultimaSaida.dateStr} às ${ultimaSaida.timeStr}` : null
                    };

                } else if (fileType.type === 'POTENTIAL') {
                    return { type: 'POTENTIAL', fileName, data: this.processPotentialData(worksheet, fileType.headerRow) };
                } else if (fileType.type === 'META') {
                    return { type: 'META', fileName: fileName, data: this.processMetaData(worksheet, fileType.headerRow) };
                } else if (fileType.type === 'ACMSAFRA') {
                    return { type: 'ACMSAFRA', fileName: fileName, data: this.processAcmSafraData(worksheet, fileType.headerRow) };
                } else {
                    return { type: 'UNKNOWN', fileName, data: [] };
                }
            } catch (error) {
                console.error(`Erro ArrayBuffer ${fileName}:`, error);
                throw error;
            }
        } else {
            const file = dataOrFile;
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = e.target.result;
                        const workbook = XLSX.read(data, { type: 'binary' }); 
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                        
                        if (!rawMatrix || rawMatrix.length === 0) {
                            resolve({ type: 'UNKNOWN', fileName: file.name, data: [] });
                            return;
                        }

                        const fileType = this.identifyFileTypeIntelligently(rawMatrix, file.name);
                        
                        if (fileType.type === 'PRODUCTION') {
                             const ultimaSaida = this.getUltimaDataHoraSaida(worksheet, fileType.headerRow);
                             resolve({ 
                                type: 'PRODUCTION', 
                                fileName: file.name, 
                                data: this.processProductionData(worksheet, fileType.headerRow),
                                ultimaPesagem: ultimaSaida ? `${ultimaSaida.dateStr} às ${ultimaSaida.timeStr}` : null
                            });

                        } else if (fileType.type === 'POTENTIAL') {
                            resolve({ type: 'POTENTIAL', fileName: file.name, data: this.processPotentialData(worksheet, fileType.headerRow) });
                        } else if (fileType.type === 'META') {
                            resolve({ type: 'META', fileName: file.name, data: this.processMetaData(worksheet, fileType.headerRow) });
                        } else if (fileType.type === 'ACMSAFRA') {
                            resolve({ type: 'ACMSAFRA', fileName: file.name, data: this.processAcmSafraData(worksheet, fileType.headerRow) });
                        } else {
                            resolve({ type: 'UNKNOWN', fileName: file.name, data: [] });
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsBinaryString(file);
            });
        }
    }

    async processCSV(csvText, fileName) {
        if (!csvText) return { type: 'UNKNOWN', fileName, data: [] };

        try {
            // raw: false força o XLSX a tentar interpretar strings como números/datas quando possível
            const workbook = XLSX.read(csvText, { type: 'string', raw: false, cellDates: false });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            const fileType = this.identifyFileTypeIntelligently(rawMatrix, fileName);

            if (fileType.type === 'PRODUCTION') {
                const ultimaSaida = this.getUltimaDataHoraSaida(worksheet, fileType.headerRow);
                return { 
                    type: 'PRODUCTION', 
                    fileName, 
                    data: this.processProductionData(worksheet, fileType.headerRow),
                    ultimaPesagem: ultimaSaida ? `${ultimaSaida.dateStr} às ${ultimaSaida.timeStr}` : null
                };

            } else if (fileType.type === 'POTENTIAL') {
                const processedData = this.processPotentialData(worksheet, fileType.headerRow);
                return { type: 'POTENTIAL', fileName, data: processedData };
            } else if (fileType.type === 'META') {
                const processedData = this.processMetaData(worksheet, fileType.headerRow);
                return { type: 'META', fileName, data: processedData };
            } else if (fileType.type === 'ACMSAFRA') {
                const processedData = this.processAcmSafraData(worksheet, fileType.headerRow);
                return { type: 'ACMSAFRA', fileName, data: processedData };
            }

            return { type: 'UNKNOWN', fileName, data: [] };

        } catch (error) {
            console.error(`Erro processamento CSV ${fileName}:`, error);
            return { type: 'UNKNOWN', fileName, data: [] };
        }
    }

    identifyFileTypeIntelligently(matrix, fileName) {
        const fileNameUpper = fileName.toUpperCase();
        
        if (fileNameUpper.includes('ACM') || fileNameUpper.includes('SAFRA')) {
            return { type: 'ACMSAFRA', headerRow: 0 };
        }
        if (fileNameUpper.includes('METAS') || fileNameUpper.includes('META')) return { type: 'META', headerRow: 0 };

        for (let i = 0; i < Math.min(matrix.length, 20); i++) {
            const row = matrix[i];
            if (!row || !Array.isArray(row)) continue;
            const rowString = row.join(' ').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s{2,}/g, ' ');
            
            if (rowString.includes('DISP COLHEDORA') || rowString.includes('ROTACAO DA MOENDA')) return { type: 'POTENTIAL', headerRow: i };
            if (rowString.includes('CARREG') || rowString.includes('FROTA MOTRIZ') || rowString.includes('PESO LIQUIDO')) return { type: 'PRODUCTION', headerRow: i };
            if (rowString.includes('TMD') || rowString.includes('COLHEITABILIDADE')) return { type: 'META', headerRow: i };
        }
        
        if (fileNameUpper.includes('POTENCIAL')) return { type: 'POTENTIAL', headerRow: 0 };
        if (fileNameUpper.includes('PRODU') || fileNameUpper.includes('BALANCA')) return { type: 'PRODUCTION', headerRow: 0 };
        return { type: 'UNKNOWN', headerRow: 0 };
    }
    
    processAcmSafraData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false });
        
        return structuredData.map(row => {
            const normalized = {};
            const rawNormalized = this.normalizeRowKeys(row);
            
            Object.keys(rawNormalized).forEach(key => {
                const value = rawNormalized[key];
                let mappedKey = key; 
                
                for (const standardKey in this.columnMappings.acmSafra) {
                    if (this.columnMappings.acmSafra[standardKey].some(pattern => 
                        key.includes(pattern.replace(/\s+/g, '')))) {
                        mappedKey = standardKey;
                        break;
                    }
                }
                normalized[mappedKey] = value;
            });
            return normalized;
        });
    }

    getUltimaDataHoraSaida(worksheet, headerRow) {
        const rows = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false });
        let ultimaData = null; 

        for (const row of rows) {
            for (const key of Object.keys(row)) {
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, " ").replace(/\s+/g, " ").trim();
                if (cleanKey.includes("DATA HORA SAIDA")) { 
                    const parsed = this.parseDateTime(row[key]);
                    if (parsed.fullDate) {
                        if (!ultimaData || parsed.fullDate.getTime() > ultimaData.fullDate.getTime()) {
                            ultimaData = parsed; 
                        }
                    }
                }
            }
        }
        return ultimaData;
    }

    processProductionData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false });
        const processedData = [];

        structuredData.forEach(row => {
            const item = { equipamentos: [], operadores: [], transbordos: [] }; 
            const opData = { 1: { c: null, d: null }, 2: { c: null, d: null }, 3: { c: null, d: null } };
            let diaBalancaData = null, dataSaidaData = null, horaSaidaStr = null, isAggregationRow = false; 
            
            const normalizedRow = this.normalizeRowKeys(row);
            
            // 1. Coleta de Dados Básicos
            Object.keys(normalizedRow).forEach(key => {
                 const value = normalizedRow[key];
                 if (value === null || value === undefined || value === '') return;
                 const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
                 
                 if (this.matchesPattern(cleanKey, this.columnMappings.production.viagem)) {
                     if (!cleanKey.includes('QTD') && !cleanKey.includes('DIST') && !String(value).toUpperCase().includes('TOTAL')) {
                         if (!item.viagem) item.viagem = String(value).trim();
                     }
                 } else if (this.matchesPattern(cleanKey, this.columnMappings.production.frota)) {
                     item.frota = String(value).trim();
                 } else if (this.matchesPattern(cleanKey, this.columnMappings.production.frente)) {
                     item.frente = String(value).trim();
                 }
            });

            // 2. Coleta de Dados Detalhados
            Object.keys(normalizedRow).forEach(key => {
                const value = normalizedRow[key];
                if (value === null || value === undefined || value === '') return;
                
                if (String(value).toUpperCase().includes('TOTAL') && isNaN(value)) isAggregationRow = true;
                
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

                if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento2)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento3)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.peso)) item.peso = this.parseNumber(value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.qtdViagem)) item.qtdViagem = this.parseNumber(value);
                
                // --- CAPTURA DE DATAS ---
                // Verifica colunas de DATA/HORA SAÍDA
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.data_saida)) {
                    // Tenta parser completo
                    const dt = this.parseDateTime(value);
                    if (dt.fullDate) dataSaidaData = dt;
                    else {
                        // Se falhou data completa, tenta extrair só a hora à força
                        const forcedTime = this._forceExtractTime(value);
                        if (forcedTime) horaSaidaStr = forcedTime;
                        
                        if (dt.dateStr) diaBalancaData = dt;
                    }
                }
                // Verifica colunas de HORA SAÍDA
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.hora_saida)) {
                    const forcedTime = this._forceExtractTime(value);
                    if (forcedTime) horaSaidaStr = forcedTime;
                }
                // Verifica colunas de DIA BALANÇA
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.dia_balanca)) {
                    const dt = this.parseDateTime(value);
                    if (dt.fullDate) diaBalancaData = dt;
                }
            });

            // 3. CONSOLIDAÇÃO DE DATAS E HORAS (A Mágica acontece aqui)
            
            // Caso ideal: Temos data completa de saída
            if (dataSaidaData && dataSaidaData.fullDate) {
                item.timestamp = dataSaidaData.fullDate;
                item.data = dataSaidaData.dateStr;
                item.hora = dataSaidaData.timeStr;
            } 
            // Caso comum: Temos Data separada da Hora (string)
            else if (diaBalancaData && diaBalancaData.dateStr && horaSaidaStr) {
                const dt = this.parseDateTime(`${diaBalancaData.dateStr} ${horaSaidaStr}`);
                if (dt.fullDate) {
                    item.timestamp = dt.fullDate;
                    item.data = dt.dateStr;
                    item.hora = dt.timeStr;
                }
            } 
            // Fallback Crítico: Se temos apenas HORA, forçamos a entrada
            // (Isso garante que o gráfico horário funcione, mesmo sem dia certo)
            else if (horaSaidaStr) {
                 // Usa data de hoje como dummy se não tiver data, apenas para ordenar
                 item.timestamp = new Date(); 
                 item.data = new Date().toLocaleDateString('pt-BR');
                 item.hora = horaSaidaStr; // Isso é o que o gráfico precisa!
            }

            // [Lógica padrão de ID e Fechamento...]
            const isFechamentoViagem = item.qtdViagem && Math.abs(item.qtdViagem - 1) < 0.05;
            if (isAggregationRow && !isFechamentoViagem) return;
            if (item.peso <= 0) return;

            let finalViagemId = item.viagem;
            if (String(finalViagemId || '').toUpperCase() === 'TOTAL' && isFechamentoViagem) {
                 finalViagemId = String(item.frota); 
            } else if (!finalViagemId || (typeof finalViagemId === 'string' && finalViagemId.length < 3)) {
                finalViagemId = this.generateViagemId(item);
            }
            if (!finalViagemId || String(finalViagemId).toUpperCase().includes('TOTAL')) return;
            item.idViagem = finalViagemId;
            
            processedData.push(item);
        });

        return processedData;
    }
    
    processMetaData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false }); 
        const processedData = [];
        structuredData.forEach((row) => {
            const item = {}, normalizedRow = this.normalizeRowKeys(row);
            let isMetaRow = false;
            Object.keys(normalizedRow).forEach(key => {
                const value = normalizedRow[key];
                if (!value) return;
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, ' ').trim();
                
                Object.keys(this.columnMappings.meta).forEach(standardKey => {
                    if (this.matchesPattern(cleanKey, this.columnMappings.meta[standardKey])) {
                        isMetaRow = true;
                        item[standardKey] = this.parseNumber(value) || String(value).trim();
                    }
                });
            });
            if (item.frente && isMetaRow) processedData.push(item);
        });
        return processedData;
    }
    
    processPotentialData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false, cellDates: true });
        return structuredData.map(row => {
            const item = {};
            let hasHour = false;
            
            Object.keys(row).forEach(key => {
                const value = row[key];
                if (value == null || value === '') return;
                
                const mappedKey = this.findPotentialKey(key);
                
                if (mappedKey === 'hora') {
                    // Força extração de HH:MM
                    const horaString = this._forceExtractTime(value);
                    if (horaString) {
                        item['HORA'] = horaString;
                        item[mappedKey] = horaString; 
                        hasHour = true;
                    }
                } else if (mappedKey) {
                    const numValue = this.parseNumber(value);
                    item[mappedKey] = numValue;
                    const csvKey = this.findCSVKeyForPotential(mappedKey);
                    if (csvKey) item[csvKey] = numValue;
                }
            });
            
            // Mapeamento extra para colunas exatas
            ['Caminhões  Ida', 'Caminhões  Campo', 'Caminhões  Volta', 'Caminhões  Descarga', 'Caminhões  PARADO', 'CARRETAS CARREGADAS', 'POTENCIAL', 'Caminhões Fila externa'].forEach(exactKey => {
                let value = row[exactKey] || row[exactKey.replace(/\s{2,}/g, ' ')];
                if (value != null && value !== '') item[exactKey] = this.parseNumber(value);
            });

            // Só retorna se tiver HORA, senão o gráfico não sabe onde plotar
            return hasHour ? item : null;
        }).filter(i => i); 
    }
    
    findPotentialKey(originalKey) {
        const cleanKey = originalKey.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
        for (const standardKey in this.columnMappings.potential) {
            if (this.columnMappings.potential[standardKey].some(pattern => {
                const patUpper = pattern.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
                return cleanKey === patUpper || cleanKey.includes(patUpper);
            })) return standardKey;
        }
        return null;
    }
    
    findCSVKeyForPotential(internalKey) {
        const map = {
            'dispColhedora': 'DISP COLHEDORA', 'dispTransbordo': 'DISP TRANSBORDO', 'dispCaminhoes': 'DISP CAMINHÕES',
            'rotacaoMoenda': 'ROTAÇÃO DA MOENDA', 'potencial': 'POTENCIAL', 'caminhoesIda': 'Caminhões  Ida',
            'caminhoesCampo': 'Caminhões  Campo', 'caminhoesVolta': 'Caminhões  Volta', 'caminhoesDescarga': 'Caminhões  Descarga',
            'caminhoesParados': 'Caminhões  PARADO', 'filaExterna': 'Caminhões Fila externa', 'carretasCarregadas': 'CARRETAS CARREGADAS'
        };
        return map[internalKey] || null;
    }

    matchesPattern(key, patterns) {
        return patterns.some(pattern => key.toUpperCase().includes(pattern.toUpperCase()));
    }

    normalizeRowKeys(row) {
        const normalized = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
            normalized[cleanKey] = row[key];
        });
        return normalized;
    }

    // Parser Numérico Blindado
    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (value === undefined || value === null || value === '') return 0;
        let str = String(value).trim();
        if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    // Parser Data/Hora Blindado
    parseDateTime(val) {
        let dateObj = null, dateStr = '', timeStr = '';
        
        // 1. Número Excel
        if (typeof val === 'number' && val > 1) { 
            const excelEpochMs = (val - 25569) * 86400 * 1000;
            const compensationMs = 3 * 3600 * 1000; 
            dateObj = new Date(excelEpochMs + compensationMs); 
        } 
        
        // 2. String (com suporte a formatos mistos)
        if (!dateObj && typeof val === 'string') {
            const trimmedVal = val.trim();
            
            // Regex para Data (DD/MM/YYYY ou YYYY-MM-DD) + Hora
            const dateTimeMatch = trimmedVal.match(/(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})[\sT]+(\d{1,2}):(\d{1,2})/);
            
            if (dateTimeMatch) {
                // Tenta identificar qual parte é ano (maior que 31)
                const parts = [parseInt(dateTimeMatch[1]), parseInt(dateTimeMatch[2]), parseInt(dateTimeMatch[3])];
                let y, m, d;

                if (parts[0] > 31) { y = parts[0]; m = parts[1]; d = parts[2]; } // YYYY-MM-DD
                else { d = parts[0]; m = parts[1]; y = parts[2]; } // DD-MM-YYYY
                
                // Correção Mês/Dia (US vs BR)
                if (m > 12) { const temp = d; d = m; m = temp; }
                if (y < 100) y += 2000;

                const h = parseInt(dateTimeMatch[4]);
                const min = parseInt(dateTimeMatch[5]);
                
                dateObj = new Date(y, m - 1, d, h, min);
            }
        }
        
        // Formata se tivermos um objeto data válido
        if (dateObj && !isNaN(dateObj.getTime())) {
            // Proteção contra anos loucos (1899, etc)
            if (dateObj.getFullYear() < 2020) dateObj.setFullYear(new Date().getFullYear());
            
            const d = dateObj.getDate();
            const m = dateObj.getMonth() + 1;
            const y = dateObj.getFullYear();
            const h = dateObj.getHours();
            const min = dateObj.getMinutes();
            
            dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
            timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            return { fullDate: dateObj, dateStr, timeStr };
        }

        return { fullDate: null, dateStr: '', timeStr: '' };
    }
}

if (typeof window !== 'undefined') window.IntelligentProcessor = IntelligentProcessor;
