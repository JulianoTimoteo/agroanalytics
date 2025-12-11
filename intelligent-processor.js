// intelligent-processor.js - VERSÃO FINAL CORRIGIDA PARA CLOUDFLARE WORKER / ONEDRIVE
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
                'data_saida': ['DATA/HORA SAÍDA', 'DATA/HORA SAIDA', 'DATA SAIDA'],
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
                'tempo_carre_min': ['TEMPO CARRE MIN', 'TEMPO.CARRE (MIN)', 'TEMPO CARRE', 'TEMPO CARREGAMENTO'],
                'cam': ['CAM', 'CAMINHOES', 'CAMINHAO'],
                'ciclo': ['CICLO'],
                'viagens': ['VIAGENS'],
                'tempo': ['TEMPO'],
                'previsao_mudanca': ['PREVISAO MUDANCA', 'PREVISÃO MUDANÇA', 'PREVISAO']
            }
        };
    }

    _formatExcelTime(value) {
        if (value instanceof Date) return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
        const strValue = String(value).trim();
        const hourMatch = strValue.match(/(\d{1,2}:\d{1,2})/);
        if (hourMatch) return hourMatch[1];
        const intValue = parseInt(strValue);
        if (!isNaN(intValue) && intValue >= 0 && intValue < 24) return `${String(intValue).padStart(2, '0')}:00`;
        return strValue; 
    }

    // --- FUNÇÃO CRÍTICA: LÊ ArrayBuffer do Worker OU File do upload manual ---
    async processFile(dataOrFile, fileName) { 
        if (dataOrFile instanceof ArrayBuffer) {
            // Modo 1: Recebeu ArrayBuffer do Cloudflare Worker (Leitura Binária)
            const data = dataOrFile; 
            try {
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                
                if (!rawMatrix || rawMatrix.length === 0) {
                    return { type: 'UNKNOWN', fileName, data: [] };
                }

                const fileType = this.identifyFileTypeIntelligently(rawMatrix, fileName);
                
                if (fileType.type === 'PRODUCTION') {
                    return { type: 'PRODUCTION', fileName, data: this.processProductionData(worksheet, fileType.headerRow) };
                } else if (fileType.type === 'POTENTIAL') {
                    return { type: 'POTENTIAL', fileName, data: this.processPotentialData(worksheet, fileType.headerRow) };
                } else if (fileType.type === 'META') {
                    return { type: 'META', fileName: fileName, data: this.processMetaData(worksheet, fileType.headerRow) };
                } else {
                    return { type: 'UNKNOWN', fileName, data: [] };
                }
            } catch (error) {
                console.error(`Erro ao processar ArrayBuffer de ${fileName}:`, error);
                throw error;
            }
            
        } else {
            // Modo 2: Recebeu objeto File do upload manual (Leitura Local)
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
                            resolve({ type: 'PRODUCTION', fileName: file.name, data: this.processProductionData(worksheet, fileType.headerRow) });
                        } else if (fileType.type === 'POTENTIAL') {
                            resolve({ type: 'POTENTIAL', fileName: file.name, data: this.processPotentialData(worksheet, fileType.headerRow) });
                        } else if (fileType.type === 'META') {
                            resolve({ type: 'META', fileName: file.name, data: this.processMetaData(worksheet, fileType.headerRow) });
                        } else {
                            resolve({ type: 'UNKNOWN', fileName: file.name, data: [] });
                        }
                    } catch (error) {
                        console.error(`Erro:`, error);
                        reject(error);
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsBinaryString(file);
            });
        }
    }

    // Método de leitura de CSV (Mantido por compatibilidade, mas inutilizado pelo ArrayBuffer)
    async processCSV(csvText, fileName) {
        if (!csvText) return { type: 'UNKNOWN', fileName, data: [] };

        try {
            const workbook = XLSX.read(csvText, { type: 'string', raw: false, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            const fileType = this.identifyFileTypeIntelligently(rawMatrix, fileName);

            if (fileType.type === 'PRODUCTION') {
                const processedData = this.processProductionData(worksheet, fileType.headerRow);
                return { type: 'PRODUCTION', fileName, data: processedData };
            } else if (fileType.type === 'POTENTIAL') {
                const processedData = this.processPotentialData(worksheet, fileType.headerRow);
                return { type: 'POTENTIAL', fileName, data: processedData };
            } else if (fileType.type === 'META') {
                const processedData = this.processMetaData(worksheet, fileType.headerRow);
                return { type: 'META', fileName, data: processedData };
            }

            return { type: 'UNKNOWN', fileName, data: [] };

        } catch (error) {
            console.error(`Erro no processamento CSV para ${fileName}:`, error);
            return { type: 'UNKNOWN', fileName, data: [] };
        }
    }


    identifyFileTypeIntelligently(matrix, fileName) {
        const fileNameUpper = fileName.toUpperCase();
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

    processProductionData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false });
        const processedData = [];

        structuredData.forEach(row => {
            const item = { equipamentos: [], operadores: [], transbordos: [] }; 
            const opData = { 1: { c: null, d: null }, 2: { c: null, d: null }, 3: { c: null, d: null } };
            let diaBalancaStr, dataSaidaStr, horaSaidaStr, isAggregationRow = false;
            const normalizedRow = this.normalizeRowKeys(row);
            
            Object.keys(normalizedRow).forEach(key => {
                 const value = normalizedRow[key];
                 if (value === null || value === undefined || value === '') return;
                 const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
                 if (this.matchesPattern(cleanKey, this.columnMappings.production.viagem)) {
                     if (!cleanKey.includes('QTD') && !cleanKey.includes('DIST') && !String(value).toUpperCase().includes('TOTAL')) {
                         item.viagem = String(value).trim();
                     }
                 } else if (this.matchesPattern(cleanKey, this.columnMappings.production.frota)) {
                     item.frota = String(value).trim();
                 } else if (this.matchesPattern(cleanKey, this.columnMappings.production.frente)) {
                     item.frente = String(value).trim();
                 }
            });

            Object.keys(normalizedRow).forEach(key => {
                const value = normalizedRow[key];
                if (value === null || value === undefined || value === '') return;
                if (String(value).toUpperCase().includes('TOTAL') && isNaN(value)) isAggregationRow = true;
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

                if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento2)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento3)) this._addToList(item.equipamentos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op1_cod)) opData[1].c = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op1_dsc)) opData[1].d = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op2_cod)) opData[2].c = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op2_dsc)) opData[2].d = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op3_cod)) opData[3].c = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.op3_dsc)) opData[3].d = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.operador_generico) && !opData[1].c) opData[1].c = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.transbordo)) this._addToList(item.transbordos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.transbordo2)) this._addToList(item.transbordos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.transbordo3)) this._addToList(item.transbordos, value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.dia_balanca)) {
                    const dt = this.parseDateTime(value);
                    if (dt.dateStr) diaBalancaStr = dt.dateStr;
                    if (dt.fullDate) item.timestampEntrada = dt.fullDate;
                }
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.data_saida)) {
                    const dt = this.parseDateTime(value);
                    if (dt.fullDate) {
                        item.timestamp = dt.fullDate;
                        item.data = dt.dateStr;
                        item.hora = dt.timeStr;
                        dataSaidaStr = dt.dateStr;
                        horaSaidaStr = dt.timeStr;
                    } else if (dt.dateStr) dataSaidaStr = dt.dateStr;
                }
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.hora_saida)) {
                    const dt = this.parseDateTime(value);
                    if (dt.timeStr && !item.timestamp) horaSaidaStr = dt.timeStr;
                }
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.qtdViagem)) item.qtdViagem = this.parseNumber(value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.distancia)) item.distancia = this.parseNumber(value);
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.peso)) item.peso = this.parseNumber(String(value).replace(/,/g, '.'));
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.tipoProprietarioFa)) item.tipoProprietarioFa = String(value).trim();
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.liberacao)) item.liberacao = String(value).trim();
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.variedade)) item.variedade = String(value).trim();
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.analisado)) item.analisado = value;
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.cod_fazenda)) item.codFazenda = String(value).trim();
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.desc_fazenda)) item.descFazenda = String(value).trim();
                else if (this.matchesPattern(cleanKey, this.columnMappings.production.status_frota)) item.statusFrota = String(value).trim().toUpperCase();
            });
            
            if (!item.timestamp && (dataSaidaStr || diaBalancaStr) && horaSaidaStr) {
                const dt = this.parseDateTime(`${dataSaidaStr || diaBalancaStr} ${horaSaidaStr}`);
                if (dt.fullDate) {
                    item.timestamp = dt.fullDate;
                    item.data = dt.dateStr;
                    item.hora = dt.timeStr;
                }
            } else if (!item.timestamp && horaSaidaStr) {
                 const today = new Date();
                 const [h, m] = horaSaidaStr.split(':').map(Number);
                 item.timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
                 item.data = item.timestamp.toLocaleDateString('pt-BR');
                 item.hora = horaSaidaStr;
            }

            [1, 2, 3].forEach(idx => {
                if (opData[idx].c) {
                    let fullOp = String(opData[idx].c).trim();
                    if (opData[idx].d) fullOp += " - " + String(opData[idx].d).trim();
                    if (fullOp.toUpperCase() !== 'TOTAL' && fullOp !== '0') item.operadores.push(fullOp);
                }
            });

            if (item.equipamentos.length) item.equipamento = item.equipamentos[0];
            if (item.operadores.length) item.operador = item.operadores[0];
            if (item.transbordos.length) item.transbordo = item.transbordos[0];
            
            const isFechamentoViagem = item.qtdViagem && Math.abs(item.qtdViagem - 1) < 0.05;
            if (isAggregationRow && !isFechamentoViagem) return;
            if (!isFechamentoViagem && !item.frota) return;
            if (item.peso <= 0) return;

            item.idViagem = item.viagem || this.generateViagemId(item);
            if (item.viagem) row.viagem = item.viagem; 
            processedData.push(item);
        });

        console.log(`[PROCESSOR] ${processedData.length} linhas de produção`);
        return processedData;
    }
    
    processMetaData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false }); 
        const processedData = [];
        
        console.log('[PROCESSOR] Processando dados de metas...');
        
        structuredData.forEach((row, index) => {
            const item = {}, normalizedRow = this.normalizeRowKeys(row);
            let isMetaRow = false;
            
            // Primeiro: identificar colunas específicas pela chave exata
            Object.keys(normalizedRow).forEach(key => {
                const value = normalizedRow[key];
                if (value === null || value === undefined || value === '') return;
                
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                
                // TRATAMENTO ESPECÍFICO PARA F.A vs Desc. Fazenda
                
                // 1. Coluna F.A (código numérico da fazenda)
                if (cleanKey === 'F A' || cleanKey === 'FA' || cleanKey === 'F.A') {
                    item['cod_fazenda'] = String(value).trim();
                    isMetaRow = true;
                    return;
                }
                
                // 2. Coluna Descrição Fazenda (nome da fazenda)
                if (cleanKey.includes('DESCRICAO FAZENDA') || 
                    cleanKey.includes('DESC FAZENDA') || 
                    (cleanKey.includes('FAZENDA') && cleanKey.includes('DESC'))) {
                    item['desc_fazenda'] = String(value).trim();
                    isMetaRow = true;
                    return;
                }
                
                // 3. Se a chave é apenas "FAZENDA", precisamos verificar o contexto
                if (cleanKey === 'FAZENDA') {
                    // Verifica se o valor é numérico (então é F.A) ou textual (então é descrição)
                    if (String(value).match(/^\d+$/)) {
                        item['cod_fazenda'] = String(value).trim();
                    } else {
                        item['desc_fazenda'] = String(value).trim();
                    }
                    isMetaRow = true;
                    return;
                }
            });

            // Segundo: mapeamento padrão para outras colunas
            Object.keys(normalizedRow).forEach(key => {
                const value = normalizedRow[key];
                if (value === null || value === undefined || value === '') return;
                
                const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                
                // Pular se já mapeamos como F.A ou Desc. Fazenda
                if (cleanKey === 'F A' || cleanKey === 'FA' || cleanKey === 'F.A' || 
                    cleanKey.includes('DESCRICAO FAZENDA') || cleanKey.includes('DESC FAZENDA') ||
                    cleanKey === 'FAZENDA') {
                    return;
                }
                
                Object.keys(this.columnMappings.meta).forEach(standardKey => {
                    if (this.matchesPattern(cleanKey, this.columnMappings.meta[standardKey])) {
                        isMetaRow = true;
                        const numericFields = ['raio', 'tmd', 'cd', 'potencial', 'meta', 'atr', 'vel', 'tc', 'tch', 'ton_hora', 'cm_hora', 'tempo_carre_min', 'cam', 'ciclo', 'viagens', 'tempo'];
                        
                        // Não sobrescrever cod_fazenda ou desc_fazenda se já definidos
                        if ((standardKey === 'cod_fazenda' && item['cod_fazenda']) ||
                            (standardKey === 'desc_fazenda' && item['desc_fazenda'])) {
                            return;
                        }
                        
                        item[standardKey] = numericFields.includes(standardKey) ? this.parseNumber(value) : String(value).trim();
                    }
                });
            });
            
            // Garantir que temos ambos os campos
            if (!item['cod_fazenda'] && item['desc_fazenda']) {
                // Se temos descrição mas não código, tenta extrair código da descrição
                const descValue = item['desc_fazenda'];
                const codMatch = descValue.match(/\d+/);
                if (codMatch) {
                    item['cod_fazenda'] = codMatch[0];
                }
            }
            
            if (!item['desc_fazenda'] && item['cod_fazenda']) {
                // Se temos código mas não descrição, usa o código como placeholder
                item['desc_fazenda'] = `FAZENDA ${item['cod_fazenda']}`;
            }
            
            if (item.frente && isMetaRow) processedData.push(item);
        });
        
        console.log(`[PROCESSOR] ${processedData.length} linhas de metas processadas`);
        return processedData;
    }
    
    processPotentialData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false, cellDates: true });
        return structuredData.map(row => {
            const item = {};
            Object.keys(row).forEach(key => {
                const value = row[key];
                if (value == null || value === '') return;
                const mappedKey = this.findPotentialKey(key);
                
                if (mappedKey === 'hora') {
                    const horaString = this._formatExcelTime(value);
                    item['HORA'] = horaString;
                    item[mappedKey] = horaString; 
                } else if (mappedKey) {
                    const numValue = this.parseNumber(value);
                    item[mappedKey] = numValue;
                    const csvKey = this.findCSVKeyForPotential(mappedKey);
                    if (csvKey) item[csvKey] = numValue;
                }
            });
            
            ['Caminhões  Ida', 'Caminhões  Campo', 'Caminhões  Volta', 'Caminhões  Descarga', 'Caminhões  PARADO', 'CARRETAS CARREGADAS', 'POTENCIAL', 'Caminhões Fila externa'].forEach(exactKey => {
                let value = row[exactKey]; 
                if (!value) value = row[exactKey.replace(/\s{2,}/g, ' ')];
                if (value != null && value !== '') item[exactKey] = this.parseNumber(value);
            });

            return Object.keys(item).length && item['HORA'] ? item : null;
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
            'dispColhedora': 'DISP COLHEDORA',
            'dispTransbordo': 'DISP TRANSBORDO',
            'dispCaminhoes': 'DISP CAMINHÕES',
            'rotacaoMoenda': 'ROTAÇÃO DA MOENDA',
            'potencial': 'POTENCIAL',
            'caminhoesIda': 'Caminhões  Ida',
            'caminhoesCampo': 'Caminhões  Campo',
            'caminhoesVolta': 'Caminhões  Volta',
            'caminhoesDescarga': 'Caminhões  Descarga',
            'caminhoesParados': 'Caminhões  PARADO',
            'filaExterna': 'Caminhões Fila externa',
            'carretasCarregadas': 'CARRETAS CARREGADAS'
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

    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value.trim()) || 0;
        return 0;
    }

    parseDateTime(val) {
        let dateObj = null, dateStr = '', timeStr = '';
        
        if (typeof val === 'number') {
            dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
        } else if (typeof val === 'string') {
            const trimmedVal = val.trim();
            if (trimmedVal.match(/^\d{1,2}:\d{1,2}$/)) {
                return { fullDate: null, dateStr: '', timeStr: trimmedVal.match(/(\d{1,2}:\d{1,2})/)[1] };
            }

            const dateTimeMatch = trimmedVal.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(\d{1,2}:\d{1,2})/);
            if (dateTimeMatch) {
                let dateParts = dateTimeMatch[1].split(/[\/-]/).map(Number);
                if (dateParts[0] > 31) dateParts.reverse();
                const [d, m, y] = dateParts;
                const [h, min] = dateTimeMatch[2].split(':').map(Number);
                dateObj = new Date(y, m - 1, d, h, min);
                if (!isNaN(dateObj.getTime())) {
                    dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                    timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                }
            }
        }
        
        return dateObj && !isNaN(dateObj.getTime()) ? { fullDate: dateObj, dateStr, timeStr } : { fullDate: null, dateStr: '', timeStr: '' };
    }
}

if (typeof window !== 'undefined') window.IntelligentProcessor = IntelligentProcessor;