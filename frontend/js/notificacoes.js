// Notificações persistentes de convites e pedidos para entrar em grupos.
import { estado } from "./estado.js";
import { carregarGruposDoServidor } from "./grupos.js";

const botaoSinoNotificacoes = document.getElementById("btn-sino-notificacoes");
const modalNotificacoes = document.getElementById("modal-notificacoes");
const botaoFecharNotificacoes = document.getElementById("btn-fechar-notificacoes");
const listaNotificacoes = document.getElementById("lista-convites-notificacao");
const textoSemNotificacoes = document.getElementById("texto-sem-notificacoes");
const iconeSemNotificacoes = document.getElementById("icone-sem-notificacoes");
const contadorNotificacoes = document.getElementById("contador-notificacoes");

function atualizarContador(total) {
  if (!contadorNotificacoes) return;
  contadorNotificacoes.textContent = total > 9 ? "9+" : String(total);
  contadorNotificacoes.style.display = total ? "block" : "none";
}

function criarBotao(texto, cor, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = texto;
  botao.style.cssText = `flex: 1; border: 0; border-radius: 7px; padding: 9px 12px; background: ${cor}; color: white; font-weight: 700; cursor: pointer;`;
  botao.dataset.acao = acao;
  return botao;
}

function adicionarNotificacao({ texto, id, rota, atualizarGrupos = false }) {
  const cartao = document.createElement("article");
  cartao.style.cssText = "border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc;";
  const descricao = document.createElement("p");
  descricao.style.cssText = "margin: 0 0 12px; color: #334155; line-height: 1.5;";
  descricao.textContent = texto;
  const botoes = document.createElement("div");
  botoes.style.cssText = "display: flex; gap: 8px;";
  botoes.append(criarBotao("Aceitar", "#16a34a", "aceitar"), criarBotao("Rejeitar", "#dc2626", "rejeitar"));
  botoes.querySelectorAll("button").forEach((botao) => {
    botao.addEventListener("click", () => responderNotificacao(id, rota, botao.dataset.acao, botoes, atualizarGrupos));
  });
  cartao.append(descricao, botoes);
  listaNotificacoes?.appendChild(cartao);
}

function renderizarNotificacoes(convites, solicitacoes) {
  if (!listaNotificacoes) return;
  listaNotificacoes.replaceChildren();
  const vazio = convites.length === 0 && solicitacoes.length === 0;
  if (textoSemNotificacoes) textoSemNotificacoes.style.display = vazio ? "block" : "none";
  if (iconeSemNotificacoes) iconeSemNotificacoes.style.display = vazio ? "block" : "none";

  convites.forEach((convite) => adicionarNotificacao({
    id: convite.id,
    rota: `/api/convites/${convite.id}/resposta`,
    atualizarGrupos: true,
    texto: `${convite.nome_convidante} (ID ${convite.id_convidante}) convidou você para ${convite.nome_grupo}. Chave do grupo: ${convite.chave_grupo}.`,
  }));

  solicitacoes.forEach((solicitacao) => adicionarNotificacao({
    id: solicitacao.id,
    rota: `/api/solicitacoes-grupo/${solicitacao.id}/resposta`,
    texto: `${solicitacao.nome_solicitante} (ID ${solicitacao.id_solicitante}) solicitou entrada em ${solicitacao.nome_grupo}. Chave do grupo: ${solicitacao.chave_grupo}.`,
  }));
}

async function buscarLista(url) {
  const resposta = await fetch(`http://localhost:3000${url}`, {
    headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
  });
  if (!resposta.ok) return [];
  return resposta.json();
}

async function carregarNotificacoes() {
  if (!estado.tokenSessao) {
    atualizarContador(0);
    renderizarNotificacoes([], []);
    return;
  }
  try {
    const [convites, solicitacoes] = await Promise.all([
      buscarLista("/api/convites"),
      buscarLista("/api/solicitacoes-grupo"),
    ]);
    atualizarContador(convites.length + solicitacoes.length);
    if (modalNotificacoes && !modalNotificacoes.classList.contains("escondido")) {
      renderizarNotificacoes(convites, solicitacoes);
    }
  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);
  }
}

async function responderNotificacao(id, rota, acao, botoes, atualizarGrupos) {
  botoes.querySelectorAll("button").forEach((botao) => { botao.disabled = true; });
  try {
    const resposta = await fetch(`http://localhost:3000${rota}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${estado.tokenSessao || ""}`,
      },
      body: JSON.stringify({ acao }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível responder à notificação.");
    if (acao === "aceitar" && atualizarGrupos) await carregarGruposDoServidor();
    await carregarNotificacoes();
  } catch (erro) {
    alert(erro.message || "Não foi possível ligar ao servidor.");
    botoes.querySelectorAll("button").forEach((botao) => { botao.disabled = false; });
  }
}

export function inicializarNotificacoes() {
  if (!modalNotificacoes) return;

  botaoSinoNotificacoes?.addEventListener("click", async () => {
    modalNotificacoes.classList.remove("escondido");
    renderizarNotificacoes([], []);
    await carregarNotificacoes();
  });
  botaoFecharNotificacoes?.addEventListener("click", () => modalNotificacoes.classList.add("escondido"));
  modalNotificacoes.addEventListener("click", (evento) => {
    if (evento.target === modalNotificacoes) modalNotificacoes.classList.add("escondido");
  });
  window.setInterval(carregarNotificacoes, 30000);
}
