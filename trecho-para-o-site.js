/* ================================================================
   COLE ISSO NO LUGAR da função seedVagasReais() e da chamada
   "seedVagasReais()" no <script> do tx-freela.html.
   Isso só funciona depois de publicado na Vercel (com api/vagas.js
   no lugar certo e as variáveis de ambiente configuradas).
   ================================================================ */

async function carregarVagasAoVivo(){
  const status = document.getElementById("resultCount");
  try{
    const buscas = CATEGORIAS.map(cat =>
      fetch(`/api/vagas?categoria=${encodeURIComponent(cat)}`)
        .then(r => r.ok ? r.json() : { vagas: [] })
        .catch(() => ({ vagas: [] }))
    );
    const resultados = await Promise.all(buscas);

    // remove vagas antigas vindas da API (mantém as publicadas manualmente,
    // que têm id sem o prefixo "az-")
    JOBS = JOBS.filter(j => !String(j.id).startsWith("az-"));

    resultados.forEach(r => {
      (r.vagas || []).forEach((v, i) => {
        v.co  = siglaDe(v.c);
        v.bg  = CORES[(JOBS.length + i) % CORES.length];
        v.val = valorDe(v.pay);
        JOBS.push(v);
      });
    });

    saveJobs();
    refresh();
  }catch(e){
    console.error("Falha ao carregar vagas ao vivo:", e);
  }
}

/* Na linha de inicialização no fim do <script>, troque:
     loadJobs(); seedVagasReais(); carregarPerfil(); ...
   por:
     loadJobs(); carregarPerfil(); buildChips(); refresh(); montarContato();
     renderServicos(); renderGoogleJobsPanel();
     carregarVagasAoVivo();   // <-- busca real, roda em paralelo
*/
