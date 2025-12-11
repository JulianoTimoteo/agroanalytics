export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get("url");

    if (!url) {
      return new Response("Erro: URL do OneDrive não fornecida.", { status: 400 });
    }

    try {
      const r = await fetch(url);
      const resp = new Response(r.body, r);

      resp.headers.set("Access-Control-Allow-Origin", "*");
      resp.headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
      resp.headers.set("Access-Control-Allow-Headers", "Content-Type, Cache-Control");

      return resp;
    } catch (e) {
      return new Response(`Erro ao buscar a URL de destino: ${e.message}`, { status: 500 });
    }
  }
}