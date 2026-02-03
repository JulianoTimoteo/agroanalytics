const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');

// =================================================================================
const DASHBOARD_BASE_URL = 'https://julianotimoteo.github.io/agroanalytics/index.html'; 
// =================================================================================

// Lista padrão de abas
const REPORT_TABS = [
    'tab-moagem', 
    'tab-caminhao', 
    'tab-equipamento', 
    'tab-frentes', 
    'tab-metas', 
    'tab-horaria'
];

functions.http('generateReport', async (req, res) => {
    // 1. Validação
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed. Use POST.');
    }

    const { group_id, mode, report_pages = REPORT_TABS } = req.body;
    
    if (!group_id) {
        return res.status(400).send('Missing required parameter: group_id.');
    }

    // URL do Make (Integromat)
    const WHATSAPP_WEBHOOK_URL = 'https://hook.us2.make.com/2iadd5nvwyumvi1e3988m1i0j5vdogcx'; 

    let browser = null;
    const screenshotData = [];

    try {
        console.log('Launching browser...');
        
        // 2. Configuração Otimizada do Puppeteer para Cloud Functions
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-gpu',
                '--disable-dev-shm-usage', // CRÍTICO: Evita crash de memória em container
                '--no-first-run',
                '--no-zygote',
                '--single-process' // Otimiza uso de recursos
            ],
            headless: 'new'
        });

        const page = await browser.newPage();
        
        // Define viewport (Tamanho da "tela" virtual)
        await page.setViewport({ width: 1200, height: 800 }); 

        console.log('Starting screenshot generation...');

        // 3. Loop de Captura
        for (const tabId of report_pages) {
            const theme = mode || 'light';
            // Adiciona timestamp para evitar cache do navegador
            const url = `${DASHBOARD_BASE_URL}?tab=${tabId}&theme=${theme}&t=${Date.now()}`;
            
            console.log(`Navigating to tab: ${tabId}`);

            // Aumentei o timeout para garantir carregamento em conexões lentas
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); 

            // Script injetado na página para forçar a troca de aba e tema
            await page.evaluate(async (themeName, activeTabId) => {
                // Força o tema
                document.documentElement.setAttribute('data-theme', themeName);
                
                // Força a troca de aba via função global do seu app
                if (window.agriculturalDashboard && typeof window.agriculturalDashboard.showTab === 'function') {
                    window.agriculturalDashboard.showTab(activeTabId);
                }
                
                // Espera renderização dos gráficos (Chart.js tem animação)
                await new Promise(resolve => setTimeout(resolve, 2000)); 
            }, theme, tabId);
            
            // Captura
            const screenshotBuffer = await page.screenshot({
                // Clip ajustado para ignorar o header se necessário (y: 80)
                clip: { x: 0, y: 0, width: 1200, height: 800 }, 
                encoding: 'binary',
                quality: 80, // Otimiza tamanho (apenas para jpg) - para png ignore
                type: 'png'
            });

            screenshotData.push({
                tab: tabId.replace('tab-', ''),
                image_base64: Buffer.from(screenshotBuffer).toString('base64'),
                caption: `📊 *${tabId.replace('tab-', '').toUpperCase()}* - ${new Date().toLocaleTimeString('pt-BR')}`
            });
        }
        
        // 4. Disparo para o Make
        console.log(`Sending ${screenshotData.length} reports to Make...`);
        
        const payload = {
            group_id: group_id,
            reports: screenshotData,
            source: 'Google Cloud Function'
        };
        
        const response = await fetch(WHATSAPP_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Make Webhook returned ${response.status}: ${response.statusText}`);
        }

        console.log('Success!');
        res.status(200).json({ success: true, count: screenshotData.length });

    } catch (error) {
        console.error('Execution Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        // Garante que o navegador fecha para não estourar memória do servidor
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
});