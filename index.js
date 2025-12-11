// index.js (VERSÃO FINAL COM FORÇAMENTO DE PROTOCOLO E REDIRECIONAMENTO)
export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get("url");

    if (!url) {
      return new Response("Erro: URL do OneDrive não fornecida.", { status: 400 });
    }

    try {
      // 1. Forçar HTTP/1.1 (resolve o erro QUIC) E forçar seguir redirecionamentos (SharePoint faz muito isso)
      const r = await fetch(url, {
        method: "GET",
        redirect: "follow", // <-- ESSENCIAL para links de compartilhamento
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Cache-Control": "no-cache"
        },
        cf: { httpProtocol: "http1" } // CHAVE DA SOLUÇÃO QUIC
      });

      // 2. Ler o body como arrayBuffer
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