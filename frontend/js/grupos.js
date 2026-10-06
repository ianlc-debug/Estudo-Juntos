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
const gradeGruposPrivados = document.getElementById("private-grade-grupos");
const gradeGruposAbertos = document.getElementById("public-grade-grupos");

function grupoEhPrivado(grupo) {
  const privacidade = String(grupo.privacidade || "").toLowerCase();
  return privacidade.includes("privad") || privacidade.includes("convidad");
}

if (botaoCriarGrupo) {
  botaoCriarGrupo.addEventListener("click", () => modalFundo.classList.remove("escondido"));
}
if (botaoFecharModal) {
  botaoFecharModal.addEventListener("click", () => modalFundo.classList.add("escondido"));
}

// Atualiza as listas ao voltar para a aba, por exemplo após um administrador aprovar um pedido.
document.getElementById("nav-btn-grupos")?.addEventListener("click", () => {
  carregarGruposDoServidor();
});

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
          criadorId: g.criador_id,
          ehCriador: Number(g.criador_id) === Number(estado.usuarioAtualId),
          ehAdministrador: Boolean(Number(g.eh_administrador)),
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

/** Reconstrói as grades com grupos criados pelo usuário ou dos quais ele participa. */
export function reconstruirGradesDeGrupos() {
  if (gradeGrupos) gradeGrupos.innerHTML = "";
  if (gradeMeusGrupos) gradeMeusGrupos.innerHTML = "";
  if (gradeGruposPrivados) gradeGruposPrivados.innerHTML = "";
  if (gradeGruposAbertos) gradeGruposAbertos.innerHTML = "";

  const chaves = Object.keys(estado.bancoDeGrupos);
  estado.totalGruposCriados = chaves.length;
  document.getElementById("estado-vazio-grupos")?.classList.toggle("escondido", chaves.length > 0);
  let totalMeus = 0;
  let totalPrivados = 0;
  let totalAbertos = 0;

  chaves.forEach((chave, idx) => {
    const dadosGrupo = estado.bancoDeGrupos[chave];
    const corCartaoAtual = coresCartao[idx % coresCartao.length];
    const criarCartao = () => {
      const cartao = document.createElement("div");
      cartao.className = "cartao-grupo-personalizado";
      cartao.dataset.id = dadosGrupo.id;
      cartao.style.cssText = `background-color: ${corCartaoAtual}; position: relative; cursor: pointer;`;
      const icone = document.createElement("div");
      icone.className = "circulo-icone-grupo";
      icone.textContent = "📖";
      const nome = document.createElement("h4");
      nome.textContent = dadosGrupo.nome;
      const materia = document.createElement("p");
      materia.textContent = dadosGrupo.materia;
      cartao.append(icone, nome, materia);
      cartao.addEventListener("click", () => {
        limparMensagensEntrada();
        abrirSalaDeAula(dadosGrupo.id);
      });
      return cartao;
    };

    if (idx < 5 && gradeGrupos) {
      const cartaoInicio = criarCartao();
      gradeGrupos.appendChild(cartaoInicio);
    }
    if (dadosGrupo.ehCriador) {
      gradeMeusGrupos?.appendChild(criarCartao());
      totalMeus += 1;
    } else if (grupoEhPrivado(dadosGrupo)) {
      gradeGruposPrivados?.appendChild(criarCartao());
      totalPrivados += 1;
    } else {
      gradeGruposAbertos?.appendChild(criarCartao());
      totalAbertos += 1;
    }
  });

  document.getElementById("estado-vazio-meus-grupos")?.classList.toggle("escondido", totalMeus > 0);
  document.getElementById("estado-vazio-grupos-privados")?.classList.toggle("escondido", totalPrivados > 0);
  document.getElementById("estado-vazio-grupos-publicos")?.classList.toggle("escondido", totalAbertos > 0);

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
          limparMensagensEntrada();
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

function limparMensagensEntrada() {
  if (mensagemErroPrivado) mensagemErroPrivado.textContent = "";
  if (mensagemErroPublico) mensagemErroPublico.textContent = "";
}

// As confirmações de pedido/entrada são apenas mensagens da sessão atual.
limparMensagensEntrada();

["nav-btn-inicio", "nav-btn-agenda", "nav-btn-recursos", "nav-btn-mensagens", "nav-btn-perfil"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", limparMensagensEntrada);
});
window.addEventListener("popstate", limparMensagensEntrada);
window.addEventListener("hashchange", limparMensagensEntrada);

if (formularioEntrarPrivado) {
  formularioEntrarPrivado.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valorCodigo = campoCodigoPrivado.value.trim();
    mensagemErroPrivado.textContent = "";
    try {
      const resposta = await fetch("http://localhost:3000/api/grupos/solicitar-entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
        body: JSON.stringify({ codigo: valorCodigo }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível solicitar entrada.");
      mensagemErroPrivado.style.color = "#10b981";
      mensagemErroPrivado.textContent = resultado.mensagem;
      formularioEntrarPrivado.reset();
    } catch (erro) {
      mensagemErroPrivado.style.color = "#ef4444";
      mensagemErroPrivado.textContent = erro.message || "Não foi possível ligar ao servidor.";
    }
  });
}

if (formularioEntrarPublico) {
  formularioEntrarPublico.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valorCodigo = campoCodigoPublico.value.trim();
    mensagemErroPublico.textContent = "";
    try {
      const resposta = await fetch("http://localhost:3000/api/grupos/entrar-aberto", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
        body: JSON.stringify({ codigo: valorCodigo }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível entrar no grupo.");
      mensagemErroPublico.style.color = "#10b981";
      mensagemErroPublico.textContent = resultado.mensagem;
      formularioEntrarPublico.reset();
      await carregarGruposDoServidor();
    } catch (erro) {
      mensagemErroPublico.style.color = "#ef4444";
      mensagemErroPublico.textContent = erro.message || "Não foi possível ligar ao servidor.";
    }
  });
}
