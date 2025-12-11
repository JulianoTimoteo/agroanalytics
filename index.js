// index.js (VERSÃO FINAL CORRIGIDA PARA ONEDRIVE RAW LINKS)
export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get("url");

    if (!url) {
      return new Response("Erro: URL do OneDrive não fornecida.", { status: 400 });
    }

    try {
      // Força o Cloudflare a usar HTTP/1.1, resolvendo o erro QUIC/SharePoint
      const r = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0", // Ajuda o SharePoint a se comportar como se fosse um navegador mais antigo
          "Cache-Control": "no-cache"
        },
        cf: { httpProtocol: "http1" } // CHAVE DA SOLUÇÃO
      });

      // Ler o body como arrayBuffer (Excel precisa disso)
      const buf = await r.arrayBuffer();

      return new Response(buf, {
        status: r.status,
        headers: {
          "Content-Type": r.headers.get("Content-Type") || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
          "Cache-Control": "no-cache"
        }
      });

    } catch (e) {
      return new Response(`Erro ao buscar a URL de destino: ${e.message}`, { status: 500 });
    }
  }
};