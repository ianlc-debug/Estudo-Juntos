// Controla a troca de views dentro do painel (Início, Grupos, Agenda,
// Recursos, Mensagens, Perfil e a "sala de aula" de um grupo) e qual item do menu lateral fica marcado como ativo.

const botoesNav = {
  inicio: document.getElementById("nav-btn-inicio"),
  grupos: document.getElementById("nav-btn-grupos"),
  agenda: document.getElementById("nav-btn-agenda"),
  recursos: document.getElementById("nav-btn-recursos"),
  mensagens: document.getElementById("nav-btn-mensagens"),
  perfil: document.getElementById("nav-btn-perfil"),
};

const views = {
  inicio: document.getElementById("view-inicio"),
  grupos: document.getElementById("view-grupos"),
  agenda: document.getElementById("view-agenda"),
  recursos: document.getElementById("view-recursos"),
  mensagens: document.getElementById("view-mensagens"),
  perfil: document.getElementById("view-perfil"),
  salaDeAula: document.getElementById("view-sala-aula"),
};

export function resetarNavAtiva() {
  Object.values(botoesNav).forEach((btn) => {
    if (btn) btn.classList.remove("ativo");
  });
  Object.values(views).forEach((view) => {
    if (view) view.classList.add("escondido");
  });
}

export function mostrarView(chaveView, chaveNav = chaveView, salvarNoHistorico = true) {
  if (chaveView !== "salaDeAula") {
    sessionStorage.removeItem("estudoJuntosGrupoAtual");
  }
  resetarNavAtiva();
  if (chaveNav && botoesNav[chaveNav]) botoesNav[chaveNav].classList.add("ativo");
  if (views[chaveView]) views[chaveView].classList.remove("escondido");
  window.dispatchEvent(new CustomEvent("estudo-juntos:viewchange", { detail: { view: chaveView } }));

  if (salvarNoHistorico) {
    history.pushState(
      { view: chaveView, nav: chaveNav }, 
      "", 
      `#${chaveView}`
    );
  }
}

export function inicializarNavegacao() {
  botoesNav.inicio?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("inicio");
  });

  botoesNav.grupos?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("grupos");
  });

  botoesNav.mensagens?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("mensagens");
  });

  botoesNav.recursos?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("recursos");
  });

  botoesNav.agenda?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("agenda");
  });

  botoesNav.perfil?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("perfil");
  });

  const linkVerTudo = document.querySelector(".ver-tudo");
  linkVerTudo?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarView("grupos");
  });

  document.getElementById("btn-voltar-grupos")?.addEventListener("click", () => {
    mostrarView("grupos", "grupos");
  });

  const fotoPerfil = document.querySelector(".foto-perfil");
  fotoPerfil?.addEventListener("click", () => {
    botoesNav.perfil?.click();
  });

  window.addEventListener("popstate", (evento) => {
    if (evento.state && evento.state.view) {
      mostrarView(evento.state.view, evento.state.nav, false);
    } else {
      mostrarView("inicio", "inicio", false);
    }
  });

  if (window.location.hash) {
    const viewInicialHash = window.location.hash.replace("#", "");
    if (views[viewInicialHash]) {
      mostrarView(viewInicialHash, viewInicialHash, false);
    }
  }
}
