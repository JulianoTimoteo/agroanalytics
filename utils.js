// utils.js - FunÃ§Ãµes UtilitÃ¡rias
class Utils {

    /**
     * Formata um nÃºmero para o padrÃ£o brasileiro (ex: 12.345,67).
     * @param {number} num O nÃºmero a ser formatado.
     * @returns {string} O nÃºmero formatado como string.
     */
    static formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0,00';
        return new Intl.NumberFormat('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(num);
    }

    /**
     * Formata um peso (toneladas) para exibiÃ§Ã£o.
     * Se o valor for inteiro, retorna sem decimais. Se nÃ£o, retorna com duas decimais.
     * @param {number} num O peso a ser formatado.
     * @returns {string} O peso formatado (ex: "123" ou "123,45").
     */
    static formatWeight(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        
        // Se o nÃºmero for um inteiro, formata como inteiro.
        if (num === Math.floor(num)) {
            return new Intl.NumberFormat('pt-BR', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
            }).format(num);
        }

        // Caso contrÃ¡rio, usa a formataÃ§Ã£o padrÃ£o com decimais.
        return this.formatNumber(num);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    static generateGradient(ctx, area, colorStops) {
        if (!area || typeof area.bottom === 'undefined' || typeof area.top === 'undefined') {
            const fallbackColor = colorStops[0].color
                .split(',')
                .slice(0, 3)
                .join(',')
                .replace('rgba', 'rgb') + ')';
            return fallbackColor;
        }

        const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        return gradient;
    }

    // Seguro para evitar "undefined.map(...)"
    static safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    // FunÃ§Ã£o para cÃ¡lculo de quantis
    static getQuantile(arr, q) {
        arr = this.safeArray(arr);
        if (arr.length === 0) return 0;

        const sorted = [...new Set(arr)].sort((a, b) => a - b);
        
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    }
    
    /**
     * Adiciona a lÃ³gica de cor por Tier (para ranking).
     */
    static getTierColor(index, totalItems) {
        const tierSize = Math.ceil(totalItems / 3);
        if (index < tierSize) return '#00F5A0'; // Tier 1 (Success)
        if (index < tierSize * 2) return '#FFB800'; // Tier 2 (Warning)
        return '#FF2E63'; // Tier 3 (Danger)
    }
}

// Exportar para uso global
window.Utils = Utils;