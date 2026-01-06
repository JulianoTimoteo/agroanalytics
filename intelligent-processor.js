// intelligent-processor.js - VERSÃO BLINDADA (V.2026 - FIX 430K & METAS)
class IntelligentProcessor {
    constructor() {
        this.columnMappings = {
            'production': {
                'viagem': ['VIAGEM', 'N VIAGEM', 'NUMERO VIAGEM', 'ID_VIAGEM'],
                'frota': ['FROTA MOTRIZ', 'FROTA', 'MOTRIZ', 'CAMINHAO', 'PREFIXO'],
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
                'peso': ['PESO LIQUIDO', 'PESO FINAL', 'PESO LÍQUIDO', 'LIQUIDO'], 
                'pesoBruto': ['PESO BRUTO', 'BRUTO'],
                'pesoTara': ['PESO TARA', 'TARA'],
                'dia_balanca': ['DIA BALANCA', 'DATA ENTRADA', 'DATA/HORA ENTRADA', 'DATA'], 
                'data_saida': ['DATA/HORA SAÍDA', 'DATA/HORA SAIDA', 'DATA SAIDA', 'DATA/HORA SAÍDA\n', 'SAIDA'],
                'hora_saida': ['HORA SAÍDA', 'HORA SAIDA', 'HORA'],
                'frente': ['COD FRENTE', 'FRENTE', 'FRENTE COLHEITA'], 
                'cod_fazenda': ['COD FAZENDA', 'COD.FAZENDA', 'FAZENDA'], 
                'desc_fazenda': ['DESC FAZENDA', 'DESC.FAZENDA', 'NOME FAZENDA', 'FAZENDA NOME'],
                'variedade': ['VARIEDADE'],
                'analisado': ['ANALISADO'],
                'liberacao': ['LIBERAÇÃO', 'LIB', 'COD LIBERACAO'], 
                'tipoProprietarioFa': ['TIPO PROPRIETARIO F A', 'TIPO PROPRIETARIO (F.A.)', 'TIPO PROPRIETARIO', 'PROPRIETARIO', 'TIPO PROPRIEDADE', 'TIPO', 'PROP'], 
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
                'rotacaoMoenda': ['ROTACAO DA MOENDA', 'ROTACAO MOENDA', 'RPM MOENDA', 'MOENDA']
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
                'pesoLiquido': ['PESO LIQUIDO', 'PESOLIQUIDO', 'LIQUIDO', 'PESO LÍQUIDO', 'TONELADAS'],
                'pesoBruto': ['PESO BRUTO', 'PESOBRUTO', 'BRUTO'],
                'pesoTara': ['PESO TARA', 'PESOTARA', 'TARA'],
                'qtdViagem': ['QTD VIAGEM', 'QTDVIAGEM', 'QUANTIDADE DE VIAGENS', 'VIAGENS', 'N VIAGENS'],
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

    // Função ROBUSTA para extrair APENAS a hora HH:MM de qualquer formato
    _forceExtractTime(value) {
        if (value === null || value === undefined || value === '') return null;

        if (value instanceof Date && !isNaN(value.getTime())) {
            return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
        }
        
        if (typeof value === 'number') {
            let fraction = value % 1; 
            const total_seconds = Math.floor(86400 * fraction);
            const hours = Math.floor(total_seconds / 3600);
            const minutes = Math.floor((total_seconds % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        const strValue = String(value).trim();
        const timeMatch = strValue.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            let m = parseInt(timeMatch[2]);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        
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
                
                return this.dispatchProcess(fileType, worksheet, fileName);
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
                        resolve(this.dispatchProcess(fileType, worksheet, file.name));
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
            const workbook = XLSX.read(csvText, { type: 'string', raw: false, cellDates: false });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            const fileType = this.identifyFileTypeIntelligently(rawMatrix, fileName);
            return this.dispatchProcess(fileType, worksheet, fileName);
        } catch (error) {
            console.error(`Erro CSV ${fileName}:`, error);
            return { type: 'UNKNOWN', fileName, data: [] };
        }
    }
    
    dispatchProcess(fileType, worksheet, fileName) {
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
            return { type: 'META', fileName, data: this.processMetaData(worksheet, fileType.headerRow) };
        } else if (fileType.type === 'ACMSAFRA') {
            return { type: 'ACMSAFRA', fileName, data: this.processAcmSafraData(worksheet, fileType.headerRow) };
        }
        return { type: 'UNKNOWN', fileName, data: [] };
    }

    identifyFileTypeIntelligently(matrix, fileName) {
        const fileNameUpper = fileName.toUpperCase();
        
        // Identificação por Nome de Arquivo (Prioridade Alta)
        if (fileNameUpper.includes('ACM') || fileNameUpper.includes('SAFRA')) return { type: 'ACMSAFRA', headerRow: 0 };
        if (fileNameUpper.includes('METAS') || fileNameUpper.includes('META')) return { type: 'META', headerRow: 0 };
        if (fileNameUpper.includes('POTENCIAL')) return { type: 'POTENTIAL', headerRow: 0 };
        if (fileNameUpper.includes('PRODU') || fileNameUpper.includes('BALANCA')) return { type: 'PRODUCTION', headerRow: 0 };

        // Identificação por Conteúdo (Para pastas do Drive que não tem nome padrão)
        for (let i = 0; i < Math.min(matrix.length, 20); i++) {
            const row = matrix[i];
            if (!row || !Array.isArray(row)) continue;
            const rowString = row.join(' ').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s{2,}/g, ' ');
            
            if (rowString.includes('DISP COLHEDORA') || rowString.includes('ROTACAO DA MOENDA')) return { type: 'POTENTIAL', headerRow: i };
            if (rowString.includes('TMD') || rowString.includes('COLHEITABILIDADE')) return { type: 'META', headerRow: i };
            
            // Cuidado para não confundir Safra com Produção
            if (rowString.includes('PESO LIQUIDO') && (rowString.includes('CARREG') || rowString.includes('FROTA MOTRIZ'))) {
                 return { type: 'PRODUCTION', headerRow: i };
            }
            if (rowString.includes('QTD VIAGEM') && rowString.includes('DIST MEDIA') && !rowString.includes('FROTA MOTRIZ')) {
                return { type: 'ACMSAFRA', headerRow: i };
            }
        }
        
        return { type: 'UNKNOWN', headerRow: 0 };
    }
    
    processAcmSafraData(worksheet, headerRow) {
        const structuredData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: null, raw: false });
        return structuredData.map(row => {
            const normalized = {};
            const rawNormalized = this.normalizeRowKeys(row);
            
            // FILTRO DE TOTAIS NA SAFRA
            const values = Object.values(rawNormalized).map(v => String(v).toUpperCase());
            if (values.some(v => v.includes('TOTAL') || v.includes('GERAL') || v.includes('SOMA'))) return null;

            Object.keys(rawNormalized).forEach(key => {
                const value = rawNormalized[key];
                let mappedKey = key; 
                for (const standardKey in this.columnMappings.acmSafra) {
                    if (this.columnMappings.acmSafra[standardKey].some(pattern => key.includes(pattern.replace(/\s+/g, '')))) {
                        mappedKey = standardKey;
                        break;
                    }
                }
                normalized[mappedKey] = value;
            });
            return normalized;
        }).filter(item => item !== null);
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
                        if (!ultimaData || parsed.fullDate.getTime() > ultimaData.fullDate.getTime()) ultimaData = parsed; 
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
            let diaBalancaData = null, dataSaidaData = null, horaSaidaStr = null; 
            
            const normalizedRow = this.normalizeRowKeys(row);
            
            // 1. Coleta de Dados
            Object.keys(normalizedRow).forEach(key => {
                 const value = normalizedRow[key];
                 if (value === null || value === undefined || value === '') return;
                 const cleanKey = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
                 
                 // Dados Principais
                 if (this.matchesPattern(cleanKey, this.columnMappings.production.viagem)) {
                     if (!cleanKey.includes('QTD') && !cleanKey.includes('DIST') && !String(value).toUpperCase().includes('TOTAL')) {
                         if (!item.viagem) item.viagem = String(value).trim();
                     }
                 } else if (this.matchesPattern(cleanKey, this.columnMappings.production.frota)) item.frota = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.frente)) item.frente = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.peso)) item.peso = this.parseNumber(value);
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.qtdViagem)) item.qtdViagem = this.parseNumber(value);
                 
                 // Listas e Detalhes
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.equipamento)) this._addToList(item.equipamentos, value);
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
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.tipoProprietarioFa)) item.tipoProprietarioFa = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.liberacao)) item.liberacao = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.variedade)) item.variedade = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.analisado)) item.analisado = value;
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.cod_fazenda)) item.codFazenda = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.desc_fazenda)) item.descFazenda = String(value).trim();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.status_frota)) item.statusFrota = String(value).trim().toUpperCase();
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.distancia)) item.distancia = this.parseNumber(value);

                 // Datas
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.data_saida)) {
                     const dt = this.parseDateTime(value);
                     if (dt.fullDate) dataSaidaData = dt;
                     else {
                         const forcedTime = this._forceExtractTime(value);
                         if (forcedTime) horaSaidaStr = forcedTime;
                         if (dt.dateStr) diaBalancaData = dt;
                     }
                 }
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.hora_saida)) {
                     const forcedTime = this._forceExtractTime(value);
                     if (forcedTime) horaSaidaStr = forcedTime;
                 }
                 else if (this.matchesPattern(cleanKey, this.columnMappings.production.dia_balanca)) {
                     const dt = this.parseDateTime(value);
                     if (dt.fullDate) diaBalancaData = dt;
                 }
            });

            // 2. FILTRAGEM DE SEGURANÇA (SANITY CHECK)
            // Se tiver "Total" em qualquer lugar crítico, ou Peso > 200 ton, ou QtdViagem > 5, DESCARTA.
            if (['TOTAL', 'GERAL', 'SOMA'].some(bad => String(item.frota || '').toUpperCase().includes(bad) || String(item.viagem || '').toUpperCase().includes(bad))) return;
            if (item.peso > 200) return; // NENHUM CAMINHÃO LEVA 200 TONELADAS. ISSO É SOMA.
            if (item.qtdViagem > 5) return; // NENHUMA LINHA DEVE TER 5 VIAGENS SOZINHA.

            // 3. Consolidação Data/Hora
            if (dataSaidaData && dataSaidaData.fullDate) {
                item.timestamp = dataSaidaData.fullDate;
                item.data = dataSaidaData.dateStr;
                item.hora = dataSaidaData.timeStr;
            } else if (diaBalancaData && diaBalancaData.dateStr && horaSaidaStr) {
                const dt = this.parseDateTime(`${diaBalancaData.dateStr} ${horaSaidaStr}`);
                if (dt.fullDate) {
                    item.timestamp = dt.fullDate;
                    item.data = dt.dateStr;
                    item.hora = dt.timeStr;
                }
            } else if (horaSaidaStr) {
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
            
            let finalViagemId = item.viagem;
            if (!finalViagemId || (typeof finalViagemId === 'string' && finalViagemId.length < 3)) {
                finalViagemId = this.generateViagemId(item);
            }
            if (!finalViagemId) return;
            item.idViagem = finalViagemId;
            
            if (item.timestamp || item.hora) {
                processedData.push(item);
            }
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
                        const numericFields = ['raio', 'tmd', 'cd', 'potencial', 'meta', 'atr', 'vel', 'tc', 'tch', 'ton_hora', 'cm_hora', 'tempo_carre_min', 'cam', 'ciclo', 'viagens', 'tempo'];
                        item[standardKey] = numericFields.includes(standardKey) ? this.parseNumber(value) : String(value).trim();
                    }
                });
            });
            // ACEITA SE TIVER FRENTE **OU** FAZENDA (CORREÇÃO PARA ARQUIVOS SEM COLUNA 'FRENTE')
            if ((item.frente || item.cod_fazenda || item.desc_fazenda) && isMetaRow) processedData.push(item);
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
                    const horaString = this._forceExtractTime(value);
                    if (horaString) { item['HORA'] = horaString; item[mappedKey] = horaString; hasHour = true; }
                } else if (mappedKey) {
                    item[mappedKey] = this.parseNumber(value);
                }
            });
            
            ['Caminhões  Ida', 'Caminhões  Campo', 'Caminhões  Volta', 'Caminhões  Descarga', 'Caminhões  PARADO', 'CARRETAS CARREGADAS', 'POTENCIAL', 'Caminhões Fila externa'].forEach(exactKey => {
                let value = row[exactKey] || row[exactKey.replace(/\s{2,}/g, ' ')];
                if (value != null && value !== '') item[exactKey] = this.parseNumber(value);
            });

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
        if (value === undefined || value === null || value === '') return 0;
        let str = String(value).trim();
        if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    parseDateTime(val) {
        let dateObj = null, dateStr = '', timeStr = '';
        if (typeof val === 'number' && val > 1) { 
            const excelEpochMs = (val - 25569) * 86400 * 1000;
            const compensationMs = 3 * 3600 * 1000; 
            dateObj = new Date(excelEpochMs + compensationMs); 
        } 
        if (!dateObj && typeof val === 'string') {
            const trimmedVal = val.trim();
            const timeOnlyMatch = trimmedVal.match(/^(\d{1,2}:\d{1,2})(?::\d{1,2})?$/);
            if (timeOnlyMatch) {
                timeStr = timeOnlyMatch[1];
                return { fullDate: null, dateStr: '', timeStr: timeStr };
            }
            const dateTimeMatch = trimmedVal.match(/(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})[\sT]+(\d{1,2}):(\d{1,2})/);
            if (dateTimeMatch) {
                const parts = [parseInt(dateTimeMatch[1]), parseInt(dateTimeMatch[2]), parseInt(dateTimeMatch[3])];
                let y, m, d;
                if (parts[0] > 31) { y = parts[0]; m = parts[1]; d = parts[2]; } 
                else { d = parts[0]; m = parts[1]; y = parts[2]; }
                if (m > 12) { const temp = d; d = m; m = temp; }
                if (y < 100) y += 2000;
                const h = parseInt(dateTimeMatch[4]);
                const min = parseInt(dateTimeMatch[5]);
                dateObj = new Date(y, m - 1, d, h, min);
            } else {
                 const csvDateTimeMatch = trimmedVal.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})[\sT]+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
                 if (csvDateTimeMatch) {
                     const parts = csvDateTimeMatch.slice(1).map(Number);
                     const [y, m, d, h, min, s] = parts;
                     dateObj = new Date(y, m - 1, d, h, min, s);
                 }
            }
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
            // REMOVIDO O BLOQUEIO DE ANO 2020 PARA EVITAR DATAS FANTASMAS
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
