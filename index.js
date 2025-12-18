const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');

// =================================================================================
// ✅ ATUALIZADO COM A SUA URL
const DASHBOARD_BASE_URL = 'https://julianotimoteo.github.io/agroanalytics/index.html'; 
// =================================================================================

// Lista das abas que queremos capturar
const REPORT_TABS = [
    'tab-moagem', 
    'tab-caminhao', 
    'tab-equipamento', 
    'tab-frentes', 
    'tab-metas', 
    'tab-horaria'
];

/**
 * Função principal para gerar relatórios e disparar o webhook para o Make.
 * Disparada por requisição HTTP (Webhook).
 *
 * @param {object} req Objeto de requisição HTTP (contém body, query, headers).
 * @param {object} res Objeto de resposta HTTP.
 */
functions.http('generateReport', async (req, res) => {
    // 1. Configuração e Validação (Recebe o webhook do seu dashboard)
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed. Use POST.');
    }

    const { group_id, mode, report_pages = REPORT_TABS } = req.body;
    
    if (!group_id) {
        return res.status(400).send('Missing required parameter: group_id.');
    }

    let browser;
    const screenshotData = [];
    
    // Define a URL do Webhook do seu serviço de WhatsApp (MAKE URL)
    const WHATSAPP_WEBHOOK_URL = 'https://hook.us2.make.com/2iadd5nvwyumvi1e3988m1i0j5vdogcx'; 

    try {
        // 2. Inicialização do Puppeteer (Navegador Headless)
        console.log('Launching browser...');
        // O tempo de espera entre a navegação e a captura foi aumentado para 1.5s
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'], 
            headless: true
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 }); 

        console.log('Starting screenshot generation...');

        // 3. Loop para capturar cada aba
        for (const tabId of report_pages) {
            const url = `${DASHBOARD_BASE_URL}?tab=${tabId}&theme=${mode || 'light'}`;
            console.log(`Navigating to: ${url}`);

            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }); 

            // Garante que o tema e a aba estejam carregados e espera 1.5s
            await page.evaluate(async (theme, tabId) => {
                document.documentElement.setAttribute('data-theme', theme);
                window.agriculturalDashboard?.showTab(tabId); 
                await new Promise(resolve => setTimeout(resolve, 1500)); 
            }, mode || 'light', tabId);
            
            // Tira o screenshot da área principal do dashboard
            const screenshotBuffer = await page.screenshot({
                // Captura a área principal do dashboard
                clip: { x: 0, y: 80, width: 1200, height: 700 } 
            });

            screenshotData.push({
                tab: tabId.replace('tab-', ''),
                image_base64: screenshotBuffer.toString('base64'),
                caption: `Relatório Horário: ${tabId.replace('tab-', '').toUpperCase()} - ${new Date().toLocaleTimeString('pt-BR')}`
            });
        }
        
        // 4. Envio dos Dados para o Webhook do MAKE (COMPONENTE CRÍTICO)
        console.log(`Sending ${screenshotData.length} reports to Make Webhook...`);
        
        const whatsappPayload = {
            group_id: group_id,
            reports: screenshotData, // Array de objetos com {tab, image_base64, caption}
            source: 'AgroAnalytics GCF',
            // NOTA: Para segurança, não enviamos a chave da API do BSP daqui. O Make/Zapier deve ter a chave armazenada.
        };
        
        // Realiza o envio HTTP para o Make
        const whatsappResponse = await fetch(WHATSAPP_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(whatsappPayload)
        });
        
        if (!whatsappResponse.ok) {
            // Se o Make não responder com sucesso, lançamos um erro no GCF
            console.error(`Make Webhook failed with status: ${whatsappResponse.status}`);
            return res.status(502).send(`Dispatch failed: Make Webhook returned status ${whatsappResponse.status}`);
        }

        console.log('Report generation and dispatch complete.');

        // Resposta de sucesso para o seu dashboard
        res.status(200).json({ 
            success: true, 
            message: 'Screenshots generated and dispatched to Make service.', 
            tabs_captured: screenshotData.map(d => d.tab) 
        });

    } catch (error) {
        console.error('GCF Execution Error:', error);
        res.status(500).send(`Failed to generate report: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
});