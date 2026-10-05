// grupos.js
// Lista de grupos (Início e Grupos), criação de grupo, busca, entrada em grupos e exclusão.

import { estado, coresCartao } from "./estado.js";
import { abrirSalaDeAula } from "./sala-de-aula.js";
import { renderizarHorariosInicio } from "./inicio.js";
import { mostrarView } from "./navegacao.js";

const botaoCriarGrupo = document.querySelector(".btn-criar");
const modalFundo = document.getElementById("modal-criar-grupo");
const botaoFecharModal = document.getElementById("btn-fechar-modal-criar-grupo");
const formularioCriarGrupo = document.getElementById("formulario-criar-grupo");
const gradeGrupos = document.getElementById("grade-grupos");
const gradeMeusGrupos = document.getElementById("grade-meus-grupos");

if (botaoCriarGrupo) {
  botaoCriarGrupo.addEventListener("click", () => modalFundo.classList.remove("escondido"));
}
if (botaoFecharModal) {
  botaoFecharModal.addEventListener("click", () => modalFundo.classList.add("escondido"));
}

/** Função para carregar os grupos do servidor ao iniciar */
export async function carregarGruposDoServidor() {
  try {
    const resposta = await fetch("http://localhost:3000/api/grupos", {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    if (resposta.ok) {
      const gruposDoBanco = await resposta.json();
      estado.bancoDeGrupos = {};

      gruposDoBanco.forEach((g) => {
        const chave = g.id_unico || `grupo-${g.id}`;
        estado.bancoDeGrupos[chave] = {
          id: chave,
          idBanco: g.id,
          id_unico: g.id_unico,
          nome: g.nome,
          materia: g.materia,
          privacidade: g.privacidade,
          codigo: g.codigo, // Garante a atribuição do código vindo do banco
          criador: g.criador, // Garante a atribuição do criador vindo do banco
          horarios: [],
          tarefas: [],
          mensagens: [],
          membrosConvidados: [],
        };
      });

      reconstruirGradesDeGrupos();
    } else if (resposta.status === 401) {
      estado.bancoDeGrupos = {};
      reconstruirGradesDeGrupos();
    }
  } catch (erro) {
    console.error("Erro ao carregar grupos do servidor:", erro);
  }
}

/** Função para excluir um grupo no servidor e atualizar a interface */
export async function excluirGrupoDoServidor(idUnicoOuChave) {
  const dadosGrupo = estado.bancoDeGrupos[idUnicoOuChave];
  if (!dadosGrupo) return;

  if (!confirm(`Tem certeza de que deseja excluir o grupo "${dadosGrupo.nome}"?`)) {
    return;
  }

  try {
    const identificadorParaExcluir = dadosGrupo.id_unico || dadosGrupo.idBanco || dadosGrupo.id || idUnicoOuChave;

    const resposta = await fetch(`http://localhost:3000/api/grupos/${identificadorParaExcluir}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });

    if (resposta.ok) {
      delete estado.bancoDeGrupos[idUnicoOuChave];
      reconstruirGradesDeGrupos();
      alert("Grupo excluído com sucesso!");
      mostrarView("inicio", "inicio");
    } else {
      const dadosErro = await resposta.json();
      alert("Erro ao excluir grupo: " + (dadosErro.erro || "Erro desconhecido"));
    }
  } catch (erro) {
    console.error("Erro de conexão ao excluir grupo:", erro);
    alert("Não foi possível ligar ao servidor para excluir o grupo.");
  }
}

if (formularioCriarGrupo) {
  formularioCriarGrupo.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nomeGrupo = formularioCriarGrupo.querySelectorAll("input")[0].value.trim();
    const materiaGrupo = formularioCriarGrupo.querySelectorAll("input")[1].value.trim();
    const valorPrivacidade = formularioCriarGrupo.querySelector("select").value;
    const textoPrivacidade =
      valorPrivacidade === "privado" ? "Apenas convidados" : "Aberto para todos";

    const idUnico = `grupo-${Date.now()}`;
    const codigoAleatorio = Math.floor(100000 + Math.random() * 900000).toString();

    const novoGrupoDados = {
      id_unico: idUnico,
      nome: nomeGrupo,
      materia: materiaGrupo,
      privacidade: textoPrivacidade,
      codigo: codigoAleatorio,
    };

    try {
      const resposta = await fetch("http://localhost:3000/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
        body: JSON.stringify(novoGrupoDados),
      });

      if (resposta.ok) {
        await carregarGruposDoServidor();

        modalFundo.classList.add("escondido");
        formularioCriarGrupo.reset();

        const campoBusca = document.querySelector(".barra-busca");
        if (campoBusca) campoBusca.value = "";
      } else {
        const dadosErro = await resposta.json();
        alert("Erro ao criar grupo: " + dadosErro.erro);
      }
    } catch (erro) {
      console.error("Erro de conexão:", erro);
      alert("Não foi possível ligar ao servidor para criar o grupo.");
    }
  });
}

/** Reconstrói as grades de grupos da Início e de Grupos a partir do estado atual. */
export function reconstruirGradesDeGrupos() {
  if (gradeGrupos) gradeGrupos.innerHTML = "";
  if (gradeMeusGrupos) gradeMeusGrupos.innerHTML = "";

  const chaves = Object.keys(estado.bancoDeGrupos);
  estado.totalGruposCriados = chaves.length;

  if (estado.totalGruposCriados === 0) {
    document.getElementById("estado-vazio-grupos")?.classList.remove("escondido");
    document.getElementById("estado-vazio-meus-grupos")?.classList.remove("escondido");
    renderizarHorariosInicio();
    return;
  }

  document.getElementById("estado-vazio-grupos")?.classList.add("escondido");

  let temMeusGrupos = false;
  const usuarioLogado = (estado.usuarioAtual || "").trim().toLowerCase();

  chaves.forEach((chave, idx) => {
    const dadosGrupo = estado.bancoDeGrupos[chave];
    const corCartaoAtual = coresCartao[idx % coresCartao.length];

    // Usamos data-id em vez de id no atributo HTML para evitar IDs duplicados no DOM
    const cartaoHTML = `
        <div class="cartao-grupo-personalizado" data-id="${dadosGrupo.id}" style="background-color: ${corCartaoAtual}; position: relative; cursor: pointer;">
            <div class="circulo-icone-grupo">📖</div>
            <h4>${dadosGrupo.nome}</h4>
            <p>${dadosGrupo.materia}</p>
        </div>
    `;

    // 1. Exibe na grelha geral ("Explorar Grupos")
    if (idx < 5 && gradeGrupos) {
      gradeGrupos.insertAdjacentHTML("beforeend", cartaoHTML);
    }

    // 2. Exibe em "Meus Grupos" APENAS se o utilizador logado for o criador
    const criadorGrupo = (dadosGrupo.criador || "").trim().toLowerCase();
    const ehCriador = usuarioLogado !== "" && criadorGrupo === usuarioLogado;

    if (ehCriador && gradeMeusGrupos) {
      gradeMeusGrupos.insertAdjacentHTML("beforeend", cartaoHTML);
      temMeusGrupos = true;
    }
  });

  // Atualiza o estado vazio da secção "Meus Grupos"
  if (!temMeusGrupos && gradeMeusGrupos) {
    document.getElementById("estado-vazio-meus-grupos")?.classList.remove("escondido");
  } else {
    document.getElementById("estado-vazio-meus-grupos")?.classList.add("escondido");
  }

  // Associa eventos de clique aos cartões usando o atributo data-id
  document.querySelectorAll(".cartao-grupo-personalizado").forEach((cartao) => {
    cartao.addEventListener("click", () => {
      const idGrupo = cartao.getAttribute("data-id");
      if (idGrupo) abrirSalaDeAula(idGrupo);
    });
  });

  renderizarHorariosInicio();
}

// --- Busca de grupos na barra do topo ---------------------------------------

const barraBusca = document.querySelector(".barra-busca");
const caixaSugestoes = document.getElementById("sugestoes-busca");

if (barraBusca && caixaSugestoes) {
  barraBusca.addEventListener("input", (e) => {
    const valorBusca = e.target.value.toLowerCase().trim();
    caixaSugestoes.innerHTML = "";

    if (valorBusca === "") {
      caixaSugestoes.classList.add("escondido");
      return;
    }

    const gruposEncontrados = Object.values(estado.bancoDeGrupos).filter(
      (grupo) =>
        grupo.nome.toLowerCase().includes(valorBusca) ||
        grupo.materia.toLowerCase().includes(valorBusca),
    );

    if (gruposEncontrados.length > 0) {
      caixaSugestoes.classList.remove("escondido");

      gruposEncontrados.forEach((grupo) => {
        const item = document.createElement("div");
        item.className = "item-sugestao";
        item.innerHTML = `
            <span class="icone-sugestao">📖</span>
            <div class="info-sugestao">
                <strong>${grupo.nome}</strong>
                <small>${grupo.materia} • ${grupo.privacidade}</small>
            </div>
        `;

        item.addEventListener("click", () => {
          abrirSalaDeAula(grupo.id);
          barraBusca.value = "";
          caixaSugestoes.classList.add("escondido");
        });

        caixaSugestoes.appendChild(item);
      });
    } else {
      caixaSugestoes.classList.remove("escondido");
      caixaSugestoes.innerHTML = `
        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 500;">
            Nenhum grupo correspondente encontrado
        </div>
      `;
    }
  });

  document.addEventListener("click", (e) => {
    if (!barraBusca.contains(e.target) && !caixaSugestoes.contains(e.target)) {
      caixaSugestoes.classList.add("escondido");
    }
  });
}

// --- Entrar em grupo por código (privado/público) --------------------------

const formularioEntrarPrivado = document.getElementById("formulario-entrar-grupo-privado");
const campoCodigoPrivado = document.getElementById("campo-codigo-grupo-privado");
const mensagemErroPrivado = document.getElementById("mensagem-erro-grupo-privado");

const formularioEntrarPublico = document.getElementById("formulario-entrar-grupo-publico");
const campoCodigoPublico = document.getElementById("campo-codigo-grupo-publico");
const mensagemErroPublico = document.getElementById("mensagem-erro-grupo-publico");

if (formularioEntrarPrivado) {
  formularioEntrarPrivado.addEventListener("submit", (e) => {
    e.preventDefault();
    const valorCodigo = campoCodigoPrivado.value.trim();
    const chaveGrupoAlvo = Object.keys(estado.bancoDeGrupos).find(
      (chave) =>
        estado.bancoDeGrupos[chave].codigo === valorCodigo &&
        estado.bancoDeGrupos[chave].privacidade.includes("convidados"),
    );

    if (chaveGrupoAlvo) {
      mensagemErroPrivado.style.color = "#10b981";
      mensagemErroPrivado.textContent = "Solicitação enviada com sucesso!";
      campoCodigoPrivado.value = "";
      setTimeout(() => {
        mensagemErroPrivado.textContent = "";
      }, 3000);
    } else {
      mensagemErroPrivado.style.color = "#ef4444";
      mensagemErroPrivado.textContent = "Código privado não encontrado ou inválido.";
    }
  });
}

if (formularioEntrarPublico) {
  formularioEntrarPublico.addEventListener("submit", (e) => {
    e.preventDefault();
    const valorCodigo = campoCodigoPublico.value.trim();
    const chaveGrupoAlvo = Object.keys(estado.bancoDeGrupos).find(
      (chave) =>
        estado.bancoDeGrupos[chave].codigo === valorCodigo &&
        !estado.bancoDeGrupos[chave].privacidade.includes("convidados"),
    );

    if (chaveGrupoAlvo) {
      mensagemErroPublico.style.color = "#10b981";
      mensagemErroPublico.textContent = "Você ingressou no grupo com sucesso!";
      campoCodigoPublico.value = "";
      setTimeout(() => {
        mensagemErroPublico.textContent = "";
        abrirSalaDeAula(chaveGrupoAlvo);
      }, 1500);
    } else {
      mensagemErroPublico.style.color = "#ef4444";
      mensagemErroPublico.textContent = "Código de grupo aberto não encontrado.";
    }
  });
}
