(() => {
  "use strict";

  const STORAGE = {
    users: "partida_users_v1",
    session: "partida_session_v1"
  };

  const DIMENSIONS = {
    clareza: {
      label: "Clareza",
      short: "A tarefa ainda está nebulosa",
      recommendation: "Defina uma entrega observável e escreva apenas a próxima ação física."
    },
    desconforto: {
      label: "Desconforto",
      short: "A emoção está pesando no começo",
      recommendation: "Nomeie a emoção, reduza a exposição e autorize uma ação pequena enquanto ela ainda existe."
    },
    ambiente: {
      label: "Ambiente",
      short: "As condições favorecem a fuga",
      recommendation: "Remova uma distração e deixe aberto somente o material necessário para começar."
    },
    energia: {
      label: "Energia",
      short: "A capacidade disponível está baixa",
      recommendation: "Escolha uma versão mínima compatível com sua energia ou reposicione a tarefa para um horário melhor."
    },
    dependencia: {
      label: "Dependência",
      short: "Algo externo impede o avanço",
      recommendation: "Formule um pedido claro ou produza a parte que independe de autorização."
    }
  };

  const PATTERNS = {
    nevoa: "Névoa — não sei exatamente por onde começar",
    aversao: "Aversão — sei o que fazer, mas evito o desconforto",
    perfeicao: "Perfeição — espero uma versão ideal",
    saturacao: "Saturação — há demandas demais ou pouca recuperação",
    distracao: "Distração — estímulos capturam minha atenção",
    desconexao: "Desconexão — a tarefa perdeu sentido",
    dependencia: "Dependência — falta uma pessoa, decisão ou recurso"
  };

  const JOURNEY = [
    ["Escolha o laboratório", "Selecione uma tarefa ou projeto importante que vem sendo adiado."],
    ["Fotografe o padrão", "Registre um episódio com horário, tarefa, emoção, fuga e consequência."],
    ["Diferencie atraso de procrastinação", "Encerre ou remarque conscientemente algo que não merece prioridade."],
    ["Identifique seu padrão dominante", "Escolha entre névoa, aversão, perfeição, saturação, distração, desconexão e dependência."],
    ["Meça a fricção", "Dê notas de zero a quatro e escolha uma dimensão principal."],
    ["Nomeie a emoção", "Troque “estou mal” por uma descrição específica do que aparece antes da tarefa."],
    ["Escreva uma frase operacional", "Complete: estou evitando… mas farei… por apenas…"],
    ["Defina a entrega", "Remova do projeto tudo o que não pertence a esta etapa."],
    ["Encontre a próxima ação física", "Descreva uma ação que uma câmera conseguiria observar."],
    ["Crie três escalas", "Defina a versão mínima, a comum e a ampliada para a mesma tarefa."],
    ["Estabeleça o critério de pronto", "Escreva no máximo três critérios verificáveis."],
    ["Crie um plano se-então", "Escolha um sinal estável e uma resposta concreta."],
    ["Prepare o ambiente", "Deixe arquivo, material, roupa ou ferramenta prontos antes do momento."],
    ["Aumente a fricção da fuga", "Crie um atraso de pelo menos dez segundos antes da distração automática."],
    ["Faça a primeira revisão", "Mantenha uma ferramenta, ajuste uma e abandone outra."],
    ["Use o ritual de noventa segundos", "Leia a ação, respire, feche uma distração e abra o material."],
    ["Trabalhe em bloco curto", "Faça dez a vinte e cinco minutos com uma unidade verificável."],
    ["Prepare a saída", "Registre a última decisão e escreva o próximo gesto antes de parar."],
    ["Produza um rascunho imperfeito", "Separe criação de revisão e proteja a primeira versão."],
    ["Peça feedback cedo", "Solicite resposta sobre um ponto específico, não aprovação geral."],
    ["Faça uma sessão acompanhada", "Combine início e duração com alguém, sem vigilância."],
    ["Faça um pedido que destrava", "Peça contexto, decisão, recurso ou prazo alternativo."],
    ["Proteja energia", "Priorize recuperação antes de uma tarefa de alta demanda."],
    ["Planeje de trás para frente", "Parta da entrega e identifique revisão, versão e primeira ação."],
    ["Teste uma recompensa", "Escolha algo breve e compatível para marcar conclusão ou retorno."],
    ["Simule um dia difícil", "Use a versão mínima em condições menos favoráveis, sem esperar o ideal."],
    ["Aplique RETORNO", "Relate fatos, examine a ruptura e reinicie sem compensar dias perdidos."],
    ["Revise o que não merece continuar", "Abandone, delegue ou renegocie uma tarefa sem valor atual."],
    ["Monte seu painel", "Registre partidas, retornos, fricção, próximos passos e entregas."],
    ["Assine o contrato de continuidade", "Defina frequência, revisão, cuidado e pedido de ajuda."],
  ];

  const state = {
    user: null,
    route: "hoje",
    journeyWeek: 1,
    timer: {
      interval: null,
      running: false,
      paused: false,
      duration: 10,
      remaining: 600,
      startedAt: null,
      formData: null,
      completed: false
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[char]));
  const nowIso = () => new Date().toISOString();
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  async function hashPassword(value) {
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(value);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    }
    // Fallback determinístico para prévias em HTTP. O piloto não deve receber senhas pessoais.
    let hash = 2166136261;
    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `pilot-${(hash >>> 0).toString(16)}`;
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE.users)) || {}; }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE.users, JSON.stringify(users));
  }

  async function seedDemo() {
    const users = loadUsers();
    const email = "teste@partida.app";
    if (!users[email]) {
      users[email] = createUserRecord("Pessoa Teste", email, await hashPassword("Partida123!"));
      saveUsers(users);
    }
  }

  function createUserRecord(name, email, passwordHash) {
    return {
      id: uid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: nowIso(),
      journeyCompleted: [],
      diagnostics: [],
      sessions: [],
      review: {},
      preferences: { dailyGoal: 10 }
    };
  }

  function saveCurrentUser() {
    if (!state.user) return;
    const users = loadUsers();
    users[state.user.email] = state.user;
    saveUsers(users);
  }

  function sessionEmail() { return localStorage.getItem(STORAGE.session); }

  function restoreSession() {
    const email = sessionEmail();
    const users = loadUsers();
    if (email && users[email]) state.user = users[email];
  }

  function toast(message, type = "") {
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    $("#toast-region").appendChild(item);
    window.setTimeout(() => item.remove(), 3400);
  }

  function initials(name = "P") {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date);
  }

  function dayKey(dateValue) {
    const date = new Date(dateValue);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function computeStreak() {
    if (!state.user?.sessions.length) return 0;
    const days = new Set(state.user.sessions.map(session => dayKey(session.createdAt)));
    let streak = 0;
    const cursor = new Date();
    while (days.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function journeyProgress() {
    return Math.round(((state.user?.journeyCompleted.length || 0) / JOURNEY.length) * 100);
  }

  function getNextJourneyDay() {
    const completed = new Set(state.user?.journeyCompleted || []);
    const index = JOURNEY.findIndex((_, i) => !completed.has(i + 1));
    return index === -1 ? 30 : index + 1;
  }

  function updateShell() {
    if (!state.user) return;
    const progress = journeyProgress();
    $("#sidebar-name").textContent = state.user.name;
    $("#sidebar-avatar").textContent = initials(state.user.name);
    $("#side-progress").textContent = `${progress}%`;
    $("#side-progress-bar").style.width = `${progress}%`;
    $("#today-label").textContent = formatDate();
  }

  function showWelcome() {
    clearTimer();
    $("#welcome-view").classList.remove("hidden");
    $("#auth-view").classList.add("hidden");
    $("#app-view").classList.add("hidden");
  }

  function showAuth(mode = "login") {
    $("#welcome-view").classList.add("hidden");
    $("#auth-view").classList.remove("hidden");
    $("#app-view").classList.add("hidden");
    switchAuth(mode);
  }

  function switchAuth(mode) {
    const login = mode === "login";
    $("#login-form").classList.toggle("hidden", !login);
    $("#signup-form").classList.toggle("hidden", login);
    $("#auth-eyebrow").textContent = login ? "Bem-vindo de volta" : "Seu primeiro passo";
    $("#auth-title").textContent = login ? "Entre no seu espaço" : "Crie sua conta gratuita";
    $("#auth-description").textContent = login ? "Retome exatamente do ponto em que parou." : "Comece pequeno. O sistema aprende com a sua prática.";
    const first = $(login ? "#login-form input" : "#signup-form input");
    window.setTimeout(() => first?.focus(), 50);
  }

  function showApp() {
    $("#welcome-view").classList.add("hidden");
    $("#auth-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    updateShell();
    if (!location.hash.startsWith("#/")) location.hash = "#/hoje";
    renderRoute();
  }

  function currentRoute() {
    const value = location.hash.replace(/^#\//, "").split("?")[0];
    return ["hoje", "diagnostico", "partida", "jornada", "revisao", "biblioteca", "perfil"].includes(value) ? value : "hoje";
  }

  function renderRoute() {
    if (!state.user) return;
    clearTimer();
    state.route = currentRoute();
    $$(".main-nav a").forEach(link => link.classList.toggle("active", link.dataset.route === state.route));
    const renderers = {
      hoje: renderToday,
      diagnostico: renderDiagnostic,
      partida: renderPartida,
      jornada: renderJourney,
      revisao: renderReview,
      biblioteca: renderLibrary,
      perfil: renderProfile
    };
    $("#main").innerHTML = renderers[state.route]();
    bindRouteEvents();
    updateShell();
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("#sidebar").classList.remove("open");
    $("#menu-button").setAttribute("aria-expanded", "false");
  }

  function pageHead(eyebrow, title, description, actions = "") {
    return `<header class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
  }

  function renderToday() {
    const name = escapeHtml(state.user.name.split(" ")[0]);
    const progress = journeyProgress();
    const nextDay = getNextJourneyDay();
    const [missionTitle, missionText] = JOURNEY[nextDay - 1];
    const lastDiag = state.user.diagnostics.at(-1);
    const sessions = state.user.sessions.length;
    const todaySessions = state.user.sessions.filter(item => dayKey(item.createdAt) === dayKey(new Date())).length;
    const completedDeliveries = state.user.sessions.filter(item => item.result === "concluido").length;
    return `
      ${pageHead("Seu painel", `Bom dia, ${name}.`, "O objetivo de hoje não é recuperar tudo. É produzir uma próxima evidência de movimento.", `<a class="button button-primary" href="#/partida">▶ Dar a partida</a>`)}
      <section class="grid grid-two">
        <article class="card span-two today-card">
          <div>
            <span class="tag tag-coral">Dia ${nextDay} da jornada</span>
            <h2 style="margin:14px 0 8px">${escapeHtml(missionTitle)}</h2>
            <p class="muted">${escapeHtml(missionText)}</p>
            <div class="page-actions" style="margin-top:18px">
              <a class="button button-primary" href="#/jornada">Abrir tarefa do dia</a>
              <a class="button button-secondary" href="#/diagnostico">Diagnosticar fricção</a>
            </div>
          </div>
          <div class="progress-ring" style="--progress:${progress}" aria-label="${progress}% da jornada concluída">
            <span class="progress-ring-content"><strong>${progress}%</strong><small>da jornada</small></span>
          </div>
        </article>

        <article class="card card-dark">
          <div class="card-head"><div><span class="tag tag-gold">Protocolo rápido</span><h3 style="margin-top:12px">Comece nos próximos 10 minutos</h3></div><span style="font-size:1.8rem;color:var(--gold-300)">→</span></div>
          <ol class="action-list">
            <li><span>1</span><div>Escolha uma tarefa que cabe na realidade de agora.</div></li>
            <li><span>2</span><div>Defina a menor unidade verificável.</div></li>
            <li><span>3</span><div>Prepare o ambiente e inicie um bloco curto.</div></li>
          </ol>
          <a class="button button-primary" href="#/partida" style="margin-top:22px">Preparar sessão</a>
        </article>

        <article class="card">
          <div class="card-head"><div><span class="tag">Último diagnóstico</span><h3 style="margin-top:12px">${lastDiag ? DIMENSIONS[lastDiag.mainDimension].label : "Ainda não realizado"}</h3></div><span style="font-size:1.7rem">◎</span></div>
          ${lastDiag ? `<p>${escapeHtml(DIMENSIONS[lastDiag.mainDimension].short)}.</p><p class="muted">${escapeHtml(DIMENSIONS[lastDiag.mainDimension].recommendation)}</p>` : `<div class="empty-state"><strong>Descubra o que está travando</strong><span>Leva menos de dois minutos.</span></div>`}
          <a class="button button-secondary" href="#/diagnostico">${lastDiag ? "Refazer diagnóstico" : "Começar diagnóstico"}</a>
        </article>

        <article class="card span-two">
          <div class="card-head"><div><span class="tag">Evidências de movimento</span><h3 style="margin-top:12px">Seu painel PARTIDA</h3></div><a class="button button-small button-secondary" href="#/revisao">Ver revisão</a></div>
          <div class="metrics-row">
            <div class="metric"><strong>${todaySessions}</strong><span>partidas hoje</span></div>
            <div class="metric"><strong>${sessions}</strong><span>partidas registradas</span></div>
            <div class="metric"><strong>${completedDeliveries}</strong><span>entregas concluídas</span></div>
            <div class="metric"><strong>${computeStreak()}</strong><span>dias em sequência</span></div>
          </div>
        </article>
      </section>`;
  }

  function renderDiagnostic() {
    return `
      ${pageHead("Perceber antes de corrigir", "Diagnóstico de fricção", "Responda pensando em uma tarefa real. As notas não julgam você; elas apontam onde uma pequena intervenção pode ajudar.")}
      <section class="grid grid-two">
        <form id="diagnostic-form" class="card section-form">
          <label class="field-label">Qual tarefa você está evitando?
            <input name="task" required maxlength="160" placeholder="Ex.: abrir o relatório e escrever o primeiro parágrafo">
          </label>
          <label class="field-label">Qual padrão parece mais próximo?
            <select name="pattern" required><option value="">Selecione um padrão</option>${Object.entries(PATTERNS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>
          </label>
          <div class="field-grid">
            ${rangeField("clareza", "Quanto a tarefa está confusa?", "O passo está visível", "Não sei por onde começar")}
            ${rangeField("desconforto", "Quanto desconforto aparece?", "Tolerável", "Muito intenso")}
            ${rangeField("ambiente", "Quanto o ambiente favorece a fuga?", "Protegido", "Cheio de interrupções")}
            ${rangeField("energia", "Quanto a baixa energia interfere?", "Capacidade disponível", "Exaustão/ativação insuficiente")}
            ${rangeField("dependencia", "Quanto depende de algo externo?", "Posso avançar", "Bloqueio relevante")}
          </div>
          <button class="button button-primary" type="submit">Gerar intervenção inicial</button>
        </form>
        <div>
          <article class="card">
            <span class="tag">Como usar</span>
            <h3 style="margin-top:14px">Procure a alavanca, não a culpa</h3>
            <p class="muted">O sistema compara cinco dimensões: clareza, desconforto, ambiente, energia e dependência. A maior nota orienta o primeiro teste — não define sua identidade.</p>
            <ul class="action-list">
              <li><span>P</span><div><strong>Perceba</strong><br><small class="muted">o padrão provável</small></div></li>
              <li><span>R</span><div><strong>Reduza</strong><br><small class="muted">a exigência do começo</small></div></li>
              <li><span>D</span><div><strong>Dê a partida</strong><br><small class="muted">e observe o que muda</small></div></li>
            </ul>
          </article>
          <div id="diagnostic-result" style="margin-top:20px"></div>
        </div>
      </section>`;
  }

  function rangeField(name, label, min, max) {
    return `<div class="range-field"><label for="${name}"><span>${label}</span><span class="range-value" id="${name}-value">2</span></label><input type="range" id="${name}" name="${name}" min="0" max="4" value="2"><div class="range-ends"><span>${min}</span><span>${max}</span></div></div>`;
  }

  function diagnosticResultTemplate(item) {
    const dimension = DIMENSIONS[item.mainDimension];
    return `<article class="diagnostic-result">
      <div class="diagnostic-score"><span class="score-badge">${item.scores[item.mainDimension]}</span><div><p class="eyebrow" style="margin:0">Fricção dominante</p><h3 style="margin:3px 0">${dimension.label}</h3></div></div>
      <p style="margin-top:18px"><strong>${dimension.short}.</strong> ${dimension.recommendation}</p>
      <p class="muted"><strong>Padrão informado:</strong> ${escapeHtml(PATTERNS[item.pattern])}</p>
      <div class="page-actions"><a class="button button-primary" href="#/partida">Transformar em uma partida</a><a class="button button-secondary" href="#/hoje">Voltar ao painel</a></div>
    </article>`;
  }

  function renderPartida() {
    const last = state.user.diagnostics.at(-1);
    const suggestedTask = last?.task || "";
    const suggestedAction = last ? DIMENSIONS[last.mainDimension].recommendation.split(".")[0] : "";
    return `
      ${pageHead("Dar a partida", "Uma sessão curta e deliberada", "Defina uma unidade verificável, proteja o começo e trabalhe sem transformar o bloco em uma prova de valor.")}
      <section class="timer-layout">
        <article class="card timer-card">
          <div>
            <div class="timer-face"><div><strong id="timer-display">10:00</strong><span id="timer-status">pronto para começar</span></div></div>
            <div class="timer-controls">
              <button class="button button-primary" id="timer-start">▶ Iniciar</button>
              <button class="button button-secondary hidden" id="timer-pause">Pausar</button>
              <button class="button button-secondary hidden" id="timer-finish">Encerrar e registrar</button>
            </div>
          </div>
        </article>
        <div class="timer-setup">
          <form id="session-form" class="card section-form">
            <div class="card-head"><div><span class="tag tag-coral">Cartão de partida</span><h3 style="margin-top:12px">Prepare o próximo bloco</h3></div><span style="font-size:1.8rem">▶</span></div>
            <label class="field-label">Tarefa escolhida
              <input name="task" required maxlength="160" value="${escapeHtml(suggestedTask)}" placeholder="O que você quer mover?">
            </label>
            <label class="field-label">Próxima ação física
              <input name="nextAction" required maxlength="180" value="${escapeHtml(suggestedAction)}" placeholder="Ex.: abrir o documento e escrever três tópicos">
            </label>
            <label class="field-label">Unidade verificável
              <input name="unit" maxlength="140" placeholder="Ex.: um rascunho de 150 palavras">
            </label>
            <label class="field-label">O que ficará fora deste bloco?
              <input name="boundary" maxlength="140" placeholder="Ex.: formatação e revisão final">
            </label>
            <div><span class="field-label" style="margin-bottom:8px">Duração do bloco</span><div class="duration-options">${[5,10,15,25].map(minutes => `<button type="button" class="duration-option ${minutes === 10 ? "active" : ""}" data-duration="${minutes}">${minutes} min</button>`).join("")}</div></div>
          </form>
          <div id="session-complete-panel"></div>
        </div>
      </section>`;
  }

  function renderJourney() {
    const progress = journeyProgress();
    const start = (state.journeyWeek - 1) * 7;
    const end = state.journeyWeek === 5 ? 30 : Math.min(start + 7, 30);
    return `
      ${pageHead("Prática pequena e observação contínua", "Jornada PARTIDA de 30 dias", "Quatro semanas para construir um sistema pessoal e dois dias para consolidar continuidade — sem sequência perfeita como medida de identidade.")}
      <article class="card journey-overview">
        <div class="progress-ring" style="--progress:${progress}"><span class="progress-ring-content"><strong>${progress}%</strong><small>concluído</small></span></div>
        <div><span class="tag tag-gold">Sua jornada</span><h3 style="margin:12px 0 7px">${state.user.journeyCompleted.length} de 30 práticas realizadas</h3><p class="muted">Se você interromper, não compense dias perdidos. Retorne à próxima prática útil.</p></div>
      </article>
      <div class="journey-tabs" role="tablist" aria-label="Semanas da jornada">
        ${[[1,"Semana 1 — Observar"],[2,"Semana 2 — Construir"],[3,"Semana 3 — Praticar"],[4,"Semana 4 — Sustentar"],[5,"Dias 29 e 30"]].map(([week,label]) => `<button class="journey-tab ${state.journeyWeek===week?"active":""}" data-week="${week}" role="tab">${label}</button>`).join("")}
      </div>
      <div class="day-list">
        ${JOURNEY.slice(start, end).map(([title, text], localIndex) => {
          const day = start + localIndex + 1;
          const complete = state.user.journeyCompleted.includes(day);
          return `<article class="day-item ${complete ? "complete" : ""}"><span class="day-number">${complete ? "✓" : day}</span><div class="day-copy"><strong>Dia ${day} — ${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></div><button class="day-check" data-day="${day}" aria-label="${complete ? "Marcar como não concluído" : "Marcar como concluído"}">${complete ? "✓" : "+"}</button></article>`;
        }).join("")}
      </div>`;
  }

  function renderReview() {
    const sessions = state.user.sessions;
    const diagnostics = state.user.diagnostics;
    const counts = Object.keys(DIMENSIONS).reduce((acc, key) => ({ ...acc, [key]: diagnostics.filter(item => item.mainDimension === key).length }), {});
    const max = Math.max(1, ...Object.values(counts));
    const totalMinutes = sessions.reduce((sum, item) => sum + (item.elapsedMinutes || 0), 0);
    const completed = sessions.filter(item => item.result === "concluido").length;
    return `
      ${pageHead("Avaliar, ajustar e retornar", "Revisão semanal de fricção", "Use dados para melhorar decisões — não para vigiar ou envergonhar. Uma única mudança útil vale mais que um painel perfeito.", `<button class="button button-secondary" id="export-data">Exportar meus dados</button>`)}
      <section class="grid grid-three">
        <article class="card metric"><strong>${sessions.length}</strong><span>partidas registradas</span></article>
        <article class="card metric"><strong>${totalMinutes}</strong><span>minutos de ação focada</span></article>
        <article class="card metric"><strong>${completed}</strong><span>entregas concluídas</span></article>
        <article class="card span-two">
          <div class="card-head"><div><span class="tag">Padrões observados</span><h3 style="margin-top:12px">Fricção dominante</h3></div></div>
          <div class="bar-chart">${Object.entries(DIMENSIONS).map(([key, item]) => `<div class="bar-row"><span>${item.label}</span><div class="bar-row-track"><span style="width:${Math.round((counts[key]/max)*100)}%"></span></div><strong>${counts[key]}</strong></div>`).join("")}</div>
          ${diagnostics.length ? "" : `<div class="empty-state"><strong>Seu gráfico nascerá da prática</strong><span>Faça o primeiro diagnóstico para começar.</span></div>`}
        </article>
        <article class="card card-coral">
          <span class="tag" style="background:rgba(255,255,255,.16);color:white">Regra de continuidade</span>
          <h3 style="margin-top:14px">Recomeçar é uma habilidade.</h3>
          <p style="color:rgba(255,255,255,.78)">Uma semana difícil não exige punição. Relate o que aconteceu, reduza a ação de retorno e prepare uma nova condição.</p>
        </article>
        <form id="review-form" class="card span-two section-form">
          <div class="card-head"><div><span class="tag tag-gold">Caderno de prática</span><h3 style="margin-top:12px">Minha revisão</h3></div></div>
          <div class="field-grid">
            <label class="field-label">Três avanços reais<textarea name="advances" placeholder="Partidas, retornos ou entregas relevantes">${escapeHtml(state.user.review.advances || "")}</textarea></label>
            <label class="field-label">Maior padrão de fricção<textarea name="friction" placeholder="O que apareceu antes do adiamento?">${escapeHtml(state.user.review.friction || "")}</textarea></label>
            <label class="field-label">Uma tarefa a renegociar<textarea name="renegotiate" placeholder="Abandonar, delegar, reduzir ou remarcar">${escapeHtml(state.user.review.renegotiate || "")}</textarea></label>
            <label class="field-label">Um ajuste para a próxima semana<textarea name="adjustment" placeholder="Escolha somente um teste">${escapeHtml(state.user.review.adjustment || "")}</textarea></label>
          </div>
          <button class="button button-primary" type="submit">Salvar revisão</button>
        </form>
      </section>`;
  }

  function renderLibrary() {
    return `
      ${pageHead("Aprofunde sem acumular", "Biblioteca PARTIDA", "Use o conteúdo para apoiar uma ação real. Você não precisa consumir tudo antes de começar.")}
      <section class="grid grid-two">
        <article class="card library-card book-card">
          <div><span class="tag tag-gold">eBook completo</span><h3 style="margin-top:16px;font-size:2rem">PARTIDA</h3><p style="color:rgba(255,255,255,.72)">O sistema completo para vencer a procrastinação, iniciar o que importa e transformar intenção em ação.</p></div>
          <a class="button button-primary" href="assets/PARTIDA_Sistema_Antiprocrastinacao_Ian_Salvero.pdf" download>Baixar eBook gratuito</a>
        </article>
        <article class="card library-card podcast-card">
          <div><span class="tag" style="background:rgba(255,255,255,.14);color:white">Podcast no Spotify</span><h3 style="margin-top:16px;font-size:2rem">Mente Organizada</h3><p style="color:rgba(255,255,255,.72)">Uma experiência em áudio do universo Vida em Ordem para reduzir ruído mental e recuperar presença.</p></div>
          <a class="button button-secondary" href="https://open.spotify.com/episode/17MflrulFHZxlf2EfNyFcs?si=ClNnnJ77S2upnHsbQn4VQw" target="_blank" rel="noopener">Ouvir no Spotify ↗</a>
        </article>
        <article class="card">
          <span class="tag tag-coral">Protocolo de emergência</span><h3 style="margin-top:14px">Quando você precisa começar agora</h3>
          <ol class="action-list"><li><span>1</span><div>Nomeie o desconforto sem transformá-lo em identidade.</div></li><li><span>2</span><div>Escolha uma unidade que caiba em dez minutos.</div></li><li><span>3</span><div>Afaste uma distração e prepare o retorno.</div></li></ol>
          <a class="button button-primary" href="#/partida" style="margin-top:18px">Usar protocolo</a>
        </article>
        <article class="card">
          <span class="tag">Uso responsável</span><h3 style="margin-top:14px">Quando organização não é suficiente</h3>
          <p class="muted">Procrastinação persistente pode coexistir com condições de saúde, exaustão, relações de trabalho inseguras ou falta de recursos. Este sistema é educativo e não produz diagnóstico.</p>
          <p class="muted">Quando houver sofrimento intenso, prejuízo relevante ou risco à segurança, procure avaliação profissional e apoio local adequado.</p>
        </article>
      </section>`;
  }

  function renderProfile() {
    return `
      ${pageHead("Configurações", "Seu espaço PARTIDA", "Ajuste seus dados do piloto, exporte seu histórico ou encerre a sessão neste dispositivo.")}
      <section class="grid grid-two">
        <form id="profile-form" class="card section-form">
          <div class="card-head"><div><span class="tag">Perfil</span><h3 style="margin-top:12px">Dados básicos</h3></div><span class="avatar" style="width:54px;height:54px;font-size:1rem">${initials(state.user.name)}</span></div>
          <label class="field-label">Nome<input name="name" value="${escapeHtml(state.user.name)}" maxlength="50" required></label>
          <label class="field-label">E-mail<input value="${escapeHtml(state.user.email)}" disabled></label>
          <label class="field-label">Meta padrão de sessão<select name="dailyGoal">${[5,10,15,25].map(value => `<option value="${value}" ${state.user.preferences.dailyGoal===value?"selected":""}>${value} minutos</option>`).join("")}</select></label>
          <button class="button button-primary" type="submit">Salvar alterações</button>
        </form>
        <article class="card section-form">
          <div><span class="tag tag-gold">Privacidade do piloto</span><h3 style="margin-top:12px">Seus dados ficam neste navegador</h3><p class="muted">Esta versão não sincroniza entre dispositivos. Antes de limpar os dados do navegador, faça uma exportação se quiser preservar seu histórico.</p></div>
          <button class="button button-secondary" id="profile-export">Exportar meus dados</button>
          <button class="button button-secondary" id="logout-button">Sair da conta</button>
          <button class="button button-danger" id="reset-button">Apagar meus dados locais</button>
        </article>
      </section>`;
  }

  function bindRouteEvents() {
    $$("input[type='range']", $("#main")).forEach(input => input.addEventListener("input", () => {
      $(`#${input.name}-value`).textContent = input.value;
    }));

    $("#diagnostic-form")?.addEventListener("submit", handleDiagnostic);
    $("#review-form")?.addEventListener("submit", handleReview);
    $("#profile-form")?.addEventListener("submit", handleProfile);

    $$(".duration-option").forEach(button => button.addEventListener("click", () => {
      $$(".duration-option").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      state.timer.duration = Number(button.dataset.duration);
      state.timer.remaining = state.timer.duration * 60;
      updateTimerDisplay();
    }));
    $("#timer-start")?.addEventListener("click", startTimer);
    $("#timer-pause")?.addEventListener("click", pauseTimer);
    $("#timer-finish")?.addEventListener("click", () => completeSession(false));

    $$(".journey-tab").forEach(button => button.addEventListener("click", () => {
      state.journeyWeek = Number(button.dataset.week);
      renderRoute();
    }));
    $$(".day-check").forEach(button => button.addEventListener("click", () => toggleJourneyDay(Number(button.dataset.day))));

    $("#export-data")?.addEventListener("click", exportData);
    $("#profile-export")?.addEventListener("click", exportData);
    $("#logout-button")?.addEventListener("click", logout);
    $("#reset-button")?.addEventListener("click", askReset);
  }

  function handleDiagnostic(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scores = Object.keys(DIMENSIONS).reduce((acc, key) => ({ ...acc, [key]: Number(form.get(key)) }), {});
    const mainDimension = Object.keys(scores).sort((a,b) => scores[b] - scores[a])[0];
    const item = {
      id: uid(),
      task: String(form.get("task")).trim(),
      pattern: String(form.get("pattern")),
      scores,
      mainDimension,
      createdAt: nowIso()
    };
    state.user.diagnostics.push(item);
    saveCurrentUser();
    $("#diagnostic-result").innerHTML = diagnosticResultTemplate(item);
    $("#diagnostic-result").scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Diagnóstico salvo. Agora transforme a intervenção em uma partida.", "success");
  }

  function startTimer() {
    const form = $("#session-form");
    if (!form.reportValidity()) return;
    if (state.timer.running) return;
    state.timer.formData = Object.fromEntries(new FormData(form).entries());
    state.timer.running = true;
    state.timer.paused = false;
    state.timer.startedAt = Date.now();
    state.timer.completed = false;
    form.querySelectorAll("input, button").forEach(element => element.disabled = true);
    $("#timer-start").classList.add("hidden");
    $("#timer-pause").classList.remove("hidden");
    $("#timer-finish").classList.remove("hidden");
    $("#timer-status").textContent = "partida em andamento";
    state.timer.interval = window.setInterval(() => {
      if (state.timer.paused) return;
      state.timer.remaining -= 1;
      updateTimerDisplay();
      if (state.timer.remaining <= 0) completeSession(true);
    }, 1000);
  }

  function pauseTimer() {
    state.timer.paused = !state.timer.paused;
    $("#timer-pause").textContent = state.timer.paused ? "Continuar" : "Pausar";
    $("#timer-status").textContent = state.timer.paused ? "pausa consciente" : "partida em andamento";
  }

  function updateTimerDisplay() {
    const minutes = Math.max(0, Math.floor(state.timer.remaining / 60));
    const seconds = Math.max(0, state.timer.remaining % 60);
    const display = $("#timer-display");
    if (display) display.textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  }

  function clearTimer() {
    if (state.timer.interval) window.clearInterval(state.timer.interval);
    state.timer.interval = null;
    state.timer.running = false;
    state.timer.paused = false;
    state.timer.duration = state.user?.preferences?.dailyGoal || 10;
    state.timer.remaining = state.timer.duration * 60;
    state.timer.formData = null;
  }

  function completeSession(reachedTime) {
    if (state.timer.completed) return;
    state.timer.completed = true;
    if (state.timer.interval) window.clearInterval(state.timer.interval);
    const form = state.timer.formData || Object.fromEntries(new FormData($("#session-form")).entries());
    const elapsedSeconds = (state.timer.duration * 60) - Math.max(0, state.timer.remaining);
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const session = {
      id: uid(),
      task: String(form.task || "").trim(),
      nextAction: String(form.nextAction || "").trim(),
      unit: String(form.unit || "").trim(),
      boundary: String(form.boundary || "").trim(),
      plannedMinutes: state.timer.duration,
      elapsedMinutes,
      result: reachedTime ? "concluido" : "retorno-preparado",
      createdAt: nowIso()
    };
    state.user.sessions.push(session);
    saveCurrentUser();
    state.timer.running = false;
    $("#timer-status").textContent = reachedTime ? "bloco concluído" : "retorno preparado";
    $("#timer-pause")?.classList.add("hidden");
    $("#timer-finish")?.classList.add("hidden");
    $("#session-complete-panel").innerHTML = `<article class="card diagnostic-result session-summary"><span class="tag">Evidência registrada</span><h3>${reachedTime ? "Você sustentou o bloco." : "Você encerrou de forma estratégica."}</h3><p><strong>${escapeHtml(session.task)}</strong></p><p class="muted">${elapsedMinutes} minuto${elapsedMinutes===1?"":"s"} de ação. O próximo retorno já tem uma pista: ${escapeHtml(session.nextAction)}.</p><div class="page-actions"><a class="button button-primary" href="#/hoje">Voltar ao painel</a><button class="button button-secondary" id="new-session">Nova partida</button></div></article>`;
    $("#new-session")?.addEventListener("click", renderRoute);
    toast("Partida registrada como evidência de movimento.", "success");
    updateShell();
  }

  function toggleJourneyDay(day) {
    const list = state.user.journeyCompleted;
    const index = list.indexOf(day);
    if (index >= 0) list.splice(index, 1); else list.push(day);
    list.sort((a,b) => a-b);
    saveCurrentUser();
    renderRoute();
    toast(index >= 0 ? "Prática reaberta." : `Dia ${day} registrado.`, "success");
  }

  function handleReview(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.user.review = {
      advances: String(form.get("advances") || ""),
      friction: String(form.get("friction") || ""),
      renegotiate: String(form.get("renegotiate") || ""),
      adjustment: String(form.get("adjustment") || ""),
      updatedAt: nowIso()
    };
    saveCurrentUser();
    toast("Revisão semanal salva.", "success");
  }

  function handleProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.user.name = String(form.get("name")).trim();
    state.user.preferences.dailyGoal = Number(form.get("dailyGoal"));
    saveCurrentUser();
    updateShell();
    toast("Perfil atualizado.", "success");
  }

  function exportData() {
    const safe = { ...state.user, passwordHash: undefined };
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `partida-dados-${dayKey(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Arquivo de dados preparado.", "success");
  }

  function logout() {
    localStorage.removeItem(STORAGE.session);
    state.user = null;
    location.hash = "";
    showWelcome();
    toast("Sessão encerrada.");
  }

  function askReset() {
    const dialog = $("#confirm-dialog");
    $("#confirm-title").textContent = "Apagar dados locais?";
    $("#confirm-message").textContent = "Diagnósticos, sessões, jornada e revisões desta conta serão removidos deste navegador. Esta ação não pode ser desfeita.";
    dialog.showModal();
    dialog.addEventListener("close", () => {
      if (dialog.returnValue !== "confirm") return;
      const users = loadUsers();
      delete users[state.user.email];
      saveUsers(users);
      localStorage.removeItem(STORAGE.session);
      state.user = null;
      location.hash = "";
      showWelcome();
      toast("Dados locais removidos.", "success");
    }, { once: true });
  }

  function toggleProfileMenu() {
    const existing = $(".profile-menu");
    if (existing) { existing.remove(); return; }
    const menu = document.createElement("div");
    menu.className = "profile-menu";
    menu.innerHTML = `<button data-profile-action="profile">Configurações do perfil</button><button data-profile-action="export">Exportar dados</button><button data-profile-action="logout" class="danger-link">Sair</button>`;
    document.body.appendChild(menu);
    menu.addEventListener("click", event => {
      const action = event.target.dataset.profileAction;
      if (action === "profile") location.hash = "#/perfil";
      if (action === "export") exportData();
      if (action === "logout") logout();
      menu.remove();
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).toLowerCase().trim();
    const users = loadUsers();
    const user = users[email];
    if (!user || user.passwordHash !== await hashPassword(String(form.get("password")))) {
      toast("E-mail ou senha não conferem.", "error");
      return;
    }
    state.user = user;
    localStorage.setItem(STORAGE.session, email);
    toast("Bem-vindo de volta.", "success");
    showApp();
  }

  async function handleSignup(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).toLowerCase().trim();
    const users = loadUsers();
    if (users[email]) { toast("Já existe uma conta local com este e-mail.", "error"); return; }
    const user = createUserRecord(String(form.get("name")), email, await hashPassword(String(form.get("password"))));
    users[email] = user;
    saveUsers(users);
    state.user = user;
    localStorage.setItem(STORAGE.session, email);
    toast("Conta criada. Sua primeira partida começa agora.", "success");
    showApp();
  }

  function bindGlobalEvents() {
    $$('[data-open-auth]').forEach(button => button.addEventListener("click", () => showAuth(button.dataset.openAuth)));
    $$('[data-switch-auth]').forEach(button => button.addEventListener("click", () => switchAuth(button.dataset.switchAuth)));
    $("#auth-back").addEventListener("click", showWelcome);
    $("#login-form").addEventListener("submit", handleLogin);
    $("#signup-form").addEventListener("submit", handleSignup);
    $("#fill-demo").addEventListener("click", () => {
      const users = loadUsers();
      state.user = users["teste@partida.app"];
      localStorage.setItem(STORAGE.session, "teste@partida.app");
      toast("Modo demonstração iniciado.", "success");
      showApp();
    });
    $$(".password-toggle").forEach(button => button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
    }));
    $("#menu-button").addEventListener("click", () => {
      const sidebar = $("#sidebar");
      const open = sidebar.classList.toggle("open");
      $("#menu-button").setAttribute("aria-expanded", String(open));
    });
    $("#quick-start").addEventListener("click", () => location.hash = "#/partida");
    $("#profile-button").addEventListener("click", toggleProfileMenu);
    window.addEventListener("hashchange", renderRoute);
    document.addEventListener("click", event => {
      if (!event.target.closest("#profile-button") && !event.target.closest(".profile-menu")) $(".profile-menu")?.remove();
    });
  }

  async function init() {
    await seedDemo();
    bindGlobalEvents();
    restoreSession();
    if (state.user) showApp(); else showWelcome();
  }

  init().catch(error => {
    console.error(error);
    toast("Não foi possível iniciar o piloto neste navegador.", "error");
  });
})();
