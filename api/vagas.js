// api/vagas.js
// Função serverless da Vercel: busca vagas reais na API pública da Adzuna
// e devolve no formato que o site TX Freela MKT já entende.
//
// Como usar:
// 1) Crie uma conta grátis em https://developer.adzuna.com/ e pegue seu
//    APP_ID e APP_KEY.
// 2) No painel da Vercel: Project Settings > Environment Variables, crie
//    ADZUNA_APP_ID e ADZUNA_APP_KEY com esses valores. Redeploy o projeto.
// 3) Coloque este arquivo em /api/vagas.js na raiz do repositório (o mesmo
//    nível da pasta onde está o index.html). A Vercel detecta sozinha.
// 4) No site, chame: fetch('/api/vagas?categoria=Tecnologia e TI')
//
// Isso funciona só depois de publicado na Vercel — não funciona abrindo o
// arquivo .html direto no navegador (precisa do servidor da função).

const MAPA_CATEGORIA = {
  "Marketing e Comunicação": "marketing",
  "Tecnologia e TI": "tecnologia da informação",
  "Vendas": "vendas",
  "Administrativo": "administrativo",
  "Logística e Operações": "logística",
  "Saúde e Bem-estar": "saúde",
  "Construção e Manutenção": "construção civil",
  "Educação": "educação",
  "Outros": "emprego"
};

function limparHtml(txt) {
  return String(txt || "").replace(/<[^>]+>/g, "").trim();
}

export default async function handler(req, res) {
  const categoria = req.query.categoria || "";
  const cidade = req.query.cidade || "São Paulo";
  const pagina = Number(req.query.pagina) || 1;

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    res.status(500).json({
      erro: "Faltam as variáveis ADZUNA_APP_ID e ADZUNA_APP_KEY no ambiente da Vercel."
    });
    return;
  }

  const termo = MAPA_CATEGORIA[categoria] || categoria || "emprego";
  const url =
    `https://api.adzuna.com/v1/api/jobs/br/search/${pagina}` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}` +
    `&results_per_page=12` +
    `&where=${encodeURIComponent(cidade)}` +
    `&what=${encodeURIComponent(termo)}` +
    `&content-type=application/json`;

  try {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      res.status(resposta.status).json({ erro: "A Adzuna recusou a consulta.", status: resposta.status });
      return;
    }
    const dados = await resposta.json();

    const vagas = (dados.results || []).map(v => {
      const textoCompleto = (v.title || "") + " " + (v.description || "");
      const remoto = /remot[oa]|home\s?office/i.test(textoCompleto);
      return {
        id: "az-" + v.id,
        t: limparHtml(v.title) || "Vaga sem título",
        c: (v.company && v.company.display_name) || "Empresa não divulgada",
        cat: categoria || "Outros",
        tipo: "CLT",
        mod: remoto ? "Remoto" : "Presencial",
        loc: (v.location && v.location.display_name) || cidade + ", SP",
        pay: v.salary_min
          ? `R$ ${Math.round(v.salary_min).toLocaleString("pt-BR")}${v.salary_max && v.salary_max !== v.salary_min ? " - R$ " + Math.round(v.salary_max).toLocaleString("pt-BR") : ""}`
          : "A combinar",
        unit: v.salary_min ? "/mês" : "",
        desc: limparHtml(v.description).slice(0, 500),
        req: [],
        ben: [],
        fonte: "Adzuna",
        url: v.redirect_url,
        ts: v.created ? new Date(v.created).getTime() : Date.now()
      };
    });

    // Cache de 1h na borda da Vercel: mantém o site rápido e evita
    // estourar a cota gratuita da Adzuna (1.000 consultas/mês).
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=1800");
    res.status(200).json({ categoria, cidade, total: dados.count || vagas.length, vagas });
  } catch (erro) {
    res.status(500).json({ erro: "Não foi possível buscar vagas agora.", detalhe: String(erro) });
  }
}
