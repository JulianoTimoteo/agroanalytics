// data-analyzer-metas.js - COMPLETO CORRIGIDO
class DataAnalyzerMetas {
    
    constructor() {}

    _robustParse(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value.replace(/,/g, '.')) || 0;
        return 0;
    }

    _getFrontActiveMetadata(frente, frontsAnalysis) {
        if (!frontsAnalysis) return null;
        const activeFront = frontsAnalysis.find(f => f.codFrente == frente);
        return activeFront ? {
            codFazenda: activeFront.codFazenda,
            descFazenda: activeFront.descFazenda,
            liberacao: activeFront.liberacao
        } : null;
    }
    
    analyzeMetas(metaData, frontsAnalysis) {
        if (!metaData || metaData.length === 0) return new Map();

        const metasByFront = new Map();
        
        metaData.forEach(row => {
            const frente = String(row.frente).trim();
            if (!frente || !/^\d+$/.test(frente)) return;

            if (!metasByFront.has(frente)) {
                metasByFront.set(frente, {
                    meta: 0, cd: 0, ton_hora: 0, cm_hora: 0, cam: 0,
                    raio: [], tmd: [], atr: [], vel: [], 
                    detalhes: [] 
                });
            }

            const current = metasByFront.get(frente);
            current.meta += this._robustParse(row.meta);
            current.cd += this._robustParse(row.cd);
            current.ton_hora += this._robustParse(row.ton_hora);
            current.cm_hora += this._robustParse(row.cm_hora);
            current.cam += this._robustParse(row.cam);
            
            if (row.raio) current.raio.push(this._robustParse(row.raio));
            if (row.tmd) current.tmd.push(this._robustParse(row.tmd));
            if (row.atr) current.atr.push(this._robustParse(row.atr));
            if (row.vel) current.vel.push(this._robustParse(row.vel));
            
            current.detalhes.push({ ...row, potencial_float: this._robustParse(row.potencial) });
        });
        
        const finalMetasCards = new Map();

        metasByFront.forEach((metaAgg, frente) => {
            const frontMetadata = this._getFrontActiveMetadata(frente, frontsAnalysis);
            let activeRow = null;

            if (frontMetadata && frontMetadata.codFazenda && frontMetadata.codFazenda !== 'N/A') {
                activeRow = metaAgg.detalhes.find(detalhe => 
                    String(detalhe.cod_fazenda) == String(frontMetadata.codFazenda)
                );
            }
            
            if (!activeRow) {
                activeRow = metaAgg.detalhes.sort((a, b) => b.potencial_float - a.potencial_float)[0];
            }
            
            if (!activeRow) return;

            const getAverage = (arr, fallback) => arr.length > 0 ? arr.reduce((a, b) => a + b) / arr.length : (this._robustParse(fallback) || 0);
            const checkBooleanStatus = (value) => (String(value).toUpperCase() === 'SIM' || String(value) === '1' || String(value) === '1,00');

            const card = {
                frente: frente,
                meta: metaAgg.meta,
                cd: metaAgg.cd,
                ton_hora: metaAgg.ton_hora,
                cm_hora: metaAgg.cm_hora,
                cam: metaAgg.cam,
                tmd: getAverage(metaAgg.tmd, activeRow.tmd),
                raio: getAverage(metaAgg.raio, activeRow.raio),
                atr: getAverage(metaAgg.atr, activeRow.atr),
                vel: getAverage(metaAgg.vel, activeRow.vel),
                cod_fazenda: activeRow.cod_fazenda || 'N/A',
                desc_fazenda: activeRow.desc_fazenda || 'N/A',
                proprietario: activeRow.proprietario || 'N/A',
                liberacao_ativa: frontMetadata ? frontMetadata.liberacao : 'N/A',
                colheitabilidade: activeRow.colheitabilidade || 'N/A',
                ciclo: activeRow.ciclo || 'N/A',
                tempo_carre_min: activeRow.tempo_carre_min || 'N/A',
                tch: activeRow.tch || 'N/A', 
                viagens: activeRow.viagens || 'N/A',
                tempo: activeRow.tempo || 'N/A',
                previsao_mudanca: activeRow.previsao_mudanca || 'N/A',
                potencial_entrega_total: activeRow.potencial || 'N/A',
                maturador: checkBooleanStatus(activeRow.maturador) ? 'SIM' : 'NÃO',
                possivel_reforma: checkBooleanStatus(activeRow.possivel_reforma) ? 'SIM' : 'NÃO',
            };
            
            finalMetasCards.set(frente, card);
        });

        console.log(`[META ANALYZER] ${finalMetasCards.size} cards processados`);
        return finalMetasCards;
    }
}

(function() {
    if (typeof DataAnalyzerRankings !== 'undefined') {
        const metasAnalyzer = new DataAnalyzerMetas();
        DataAnalyzerRankings.prototype.analyzeMetas = function(metaData, frontsAnalysis) {
            return metasAnalyzer.analyzeMetas(metaData, frontsAnalysis);
        };
    }
})();

if (typeof window !== 'undefined') window.DataAnalyzerMetas = DataAnalyzerMetas;