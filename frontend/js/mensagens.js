import { estado } from "./estado.js";

const API = window.ESTUDO_API_URL + "/api/mensagens";
const formularioContato = document.getElementById("form-adicionar-contato");
const campoIdContato = document.getElementById("campo-id-contato");
const statusContato = document.getElementById("status-adicionar-contato");
const buscaContatos = document.getElementById("buscar-contatos-mensagens");
const listaContatos = document.getElementById("lista-contatos");
const vazioContatos = document.getElementById("estado-vazio-contatos");
const vazioConversa = document.getElementById("estado-conversa-vazia");
const conteudoConversa = document.getElementById("conteudo-conversa");
const avatarConversa = document.getElementById("avatar-contato-conversa");
const nomeConversa = document.getElementById("nome-contato-conversa");
const listaMensagens = document.getElementById("lista-mensagens");
const formularioMensagem = document.getElementById("form-enviar-mensagem");
const campoMensagem = document.getElementById("campo-mensagem");
const arquivoMensagem = document.getElementById("arquivo-mensagem");
const nomeArquivoMensagem = document.getElementById("nome-arquivo-mensagem");
const botaoEnviar = document.getElementById("btn-enviar-mensagem");

let contatos = [];
let contatoSelecionado = null;
let ultimaAssinaturaMensagens = "";
let ultimaAtualizacaoAuxiliar = 0;
let timerStatusContato = null;
let conexaoTempoReal = null;
let tentativaConexaoTempoReal = 0;

function viewMensagensAtiva() {
  return !document.getElementById("view-mensagens")?.classList.contains("escondido") && Boolean(estado.tokenSessao);
}

function pararTempoReal() {
  tentativaConexaoTempoReal += 1;
  conexaoTempoReal?.abort();
  conexaoTempoReal = null;
}

function aguardarReconexao(sinal) {
  return new Promise((resolver) => {
    const timer = window.setTimeout(resolver, 2000);
    sinal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolver();
    }, { once: true });
  });
}

function iniciarTempoReal() {
  if (!viewMensagensAtiva() || conexaoTempoReal) return;
  const controller = new AbortController();
  conexaoTempoReal = controller;
  const tentativa = ++tentativaConexaoTempoReal;

  (async () => {
    while (!controller.signal.aborted && tentativa === tentativaConexaoTempoReal) {
      try {
        const resposta = await fetch(`${API}/tempo-real`, {
          headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
          signal: controller.signal,
        });
        if (!resposta.ok || !resposta.body) throw new Error("Conexão em tempo real indisponível.");
        const leitor = resposta.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { value, done } = await leitor.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const eventos = buffer.replace(/\r\n/g, "\n").split("\n\n");
          buffer = eventos.pop() || "";
          for (const bloco of eventos) {
            const tipo = bloco.match(/^event:\s*(.+)$/m)?.[1]?.trim();
            const conteudo = bloco.match(/^data:\s*(.+)$/m)?.[1];
            if (tipo !== "mensagem" || !conteudo) continue;
            let evento;
            try { evento = JSON.parse(conteudo); } catch { continue; }
            carregarContatos().catch(() => {});
            if (Number(contatoSelecionado?.id) === Number(evento.remetenteId)) carregarMensagens();
          }
        }
      } catch (erro) {
        if (erro.name === "AbortError") break;
      }
      if (!controller.signal.aborted && viewMensagensAtiva()) await aguardarReconexao(controller.signal);
    }
    if (conexaoTempoReal === controller) conexaoTempoReal = null;
    if (viewMensagensAtiva() && tentativa === tentativaConexaoTempoReal) iniciarTempoReal();
  })();
}

async function requisitar(url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, {
      ...opcoes,
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}`, ...(opcoes.headers || {}) },
    });
  } catch {
    throw new Error("Não foi possível conectar à plataforma. Confira se o servidor está iniciado.");
  }
  const texto = await resposta.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch { /* respostas de arquivo não passam por aqui */ }
  if (!resposta.ok) throw new Error(dados.erro || `Não foi possível concluir a operação (HTTP ${resposta.status}).`);
  return { resposta, dados };
}

function definirStatusContato(texto = "", tipo = "") {
  if (!statusContato) return;
  window.clearTimeout(timerStatusContato);
  statusContato.textContent = texto;
  statusContato.className = `status-mensagens${tipo ? ` ${tipo}` : ""}`;
  if (texto) timerStatusContato = window.setTimeout(() => definirStatusContato(), 5000);
}

function formatarHora(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function renderizarContatos() {
  if (!listaContatos) return;
  const filtro = (buscaContatos?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtrados = contatos.filter((contato) =>
    `${contato.nome_usuario} ${contato.id_publico}`.toLocaleLowerCase("pt-BR").includes(filtro),
  );
  listaContatos.replaceChildren();

  filtrados.forEach((contato) => {
    const item = document.createElement("div");
    item.className = "item-contato";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `btn-contato${Number(contatoSelecionado?.id) === Number(contato.id) ? " ativo" : ""}`;
    const avatar = document.createElement("span");
    avatar.className = "avatar-contato";
    avatar.textContent = String(contato.nome_usuario || "?").trim().charAt(0).toLocaleUpperCase("pt-BR");
    const detalhes = document.createElement("span");
    detalhes.className = "detalhes-contato";
    const linhaTitulo = document.createElement("span");
    linhaTitulo.className = "linha-contato-titulo";
    const nome = document.createElement("span");
    nome.className = "nome-contato";
    nome.textContent = contato.nome_usuario;
    const hora = document.createElement("span");
    hora.className = "hora-contato";
    hora.textContent = formatarHora(contato.ultima_mensagem_em);
    linhaTitulo.append(nome, hora);
    const ultima = document.createElement("span");
    ultima.className = "ultima-mensagem-contato";
    ultima.textContent = contato.ultima_mensagem || (contato.ultimo_arquivo ? `📎 ${contato.ultimo_arquivo}` : `ID ${contato.id_publico}`);
    detalhes.append(linhaTitulo, ultima);
    botao.append(avatar, detalhes);
    if (Number(contato.nao_lidas) > 0) {
      const contador = document.createElement("span");
      contador.className = "contador-nao-lidas";
      contador.textContent = String(Math.min(Number(contato.nao_lidas), 99));
      botao.appendChild(contador);
    }
    botao.addEventListener("click", () => selecionarContato(contato));
    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "botao-excluir-contato";
    remover.title = `Remover ${contato.nome_usuario} dos contatos`;
    remover.setAttribute("aria-label", `Remover ${contato.nome_usuario} dos contatos`);
    remover.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
    remover.addEventListener("click", (evento) => {
      evento.stopPropagation();
      removerContato(contato);
    });
    item.append(botao, remover);
    listaContatos.appendChild(item);
  });

  if (vazioContatos) {
    vazioContatos.textContent = contatos.length && !filtrados.length
      ? "Nenhum contato corresponde à busca."
      : "Nenhum contato por aqui ainda. Adicione alguém usando o ID público.";
    vazioContatos.classList.toggle("escondido", contatos.length > 0 && filtrados.length > 0);
  }
}

async function carregarContatos() {
  const { dados } = await requisitar(`${API}/contatos`);
  contatos = Array.isArray(dados) ? dados : [];
  if (contatoSelecionado) {
    contatoSelecionado = contatos.find((contato) => Number(contato.id) === Number(contatoSelecionado.id)) || contatoSelecionado;
  }
  renderizarContatos();
}

async function removerContato(contato) {
  const confirmar = window.confirm(`Remover ${contato.nome_usuario} dos seus contatos? O histórico da conversa e os arquivos enviados também serão apagados permanentemente.`);
  if (!confirmar) return;
  try {
    const { dados } = await requisitar(`${API}/contatos/${encodeURIComponent(contato.id)}`, { method: "DELETE" });
    if (Number(contatoSelecionado?.id) === Number(contato.id)) {
      contatoSelecionado = null;
      ultimaAssinaturaMensagens = "";
      listaMensagens.replaceChildren();
      conteudoConversa.classList.add("escondido");
      vazioConversa.classList.remove("escondido");
    }
    definirStatusContato(dados.mensagem, "sucesso");
    await carregarContatos();
  } catch (erro) {
    definirStatusContato(erro.message, "erro");
  }
}

function selecionarContato(contato) {
  contatoSelecionado = contato;
  ultimaAssinaturaMensagens = "";
  vazioConversa?.classList.add("escondido");
  conteudoConversa?.classList.remove("escondido");
  nomeConversa.textContent = contato.nome_usuario;
  avatarConversa.textContent = String(contato.nome_usuario || "?").trim().charAt(0).toLocaleUpperCase("pt-BR");
  renderizarContatos();
  carregarMensagens(true);
  campoMensagem?.focus();
}

function mostrarInicioConversa() {
  contatoSelecionado = null;
  ultimaAssinaturaMensagens = "";
  listaMensagens?.replaceChildren();
  conteudoConversa?.classList.add("escondido");
  vazioConversa?.classList.remove("escondido");
  renderizarContatos();
}

function criarMensagem(mensagem) {
  const linha = document.createElement("article");
  const propria = Number(mensagem.remetente_id) === Number(estado.usuarioAtualId);
  linha.className = `mensagem-linha${propria ? " propria" : ""}`;
  if (mensagem.texto) {
    const bolha = document.createElement("div");
    bolha.className = "mensagem-bolha";
    bolha.textContent = mensagem.texto;
    linha.appendChild(bolha);
  }
  if (mensagem.nome_arquivo) {
    const anexo = document.createElement("button");
    anexo.type = "button";
    anexo.className = "anexo-mensagem";
    const icone = document.createElement("i");
    icone.className = "fa-solid fa-paperclip";
    icone.setAttribute("aria-hidden", "true");
    const nome = document.createElement("span");
    nome.textContent = `${mensagem.nome_arquivo}${mensagem.tamanho_arquivo ? ` • ${formatarTamanho(mensagem.tamanho_arquivo)}` : ""}`;
    anexo.append(icone, nome);
    anexo.addEventListener("click", () => baixarAnexo(mensagem));
    linha.appendChild(anexo);
  }
  const horario = document.createElement("time");
  horario.className = "horario-mensagem";
  horario.textContent = formatarHora(mensagem.criado_em);
  linha.appendChild(horario);
  return linha;
}

function formatarTamanho(bytes) {
  const tamanho = Number(bytes);
  if (!Number.isFinite(tamanho) || tamanho <= 0) return "";
  return tamanho < 1024 * 1024 ? `${Math.max(1, Math.round(tamanho / 1024))} KB` : `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
}

async function carregarMensagens(forcar = false) {
  if (!contatoSelecionado || conteudoConversa?.classList.contains("escondido")) return;
  const contatoId = Number(contatoSelecionado.id);
  try {
    const { dados } = await requisitar(`${API}/contatos/${encodeURIComponent(contatoId)}/mensagens`);
    if (Number(contatoSelecionado?.id) !== contatoId || conteudoConversa?.classList.contains("escondido")) return;
    const mensagens = Array.isArray(dados) ? dados : [];
    const assinatura = mensagens.map((mensagem) => `${mensagem.id}:${mensagem.texto || ""}:${mensagem.nome_arquivo || ""}`).join("|");
    if (assinatura !== ultimaAssinaturaMensagens || forcar) {
      const pertoDoFim = listaMensagens.scrollHeight - listaMensagens.scrollTop - listaMensagens.clientHeight < 100;
      listaMensagens.replaceChildren(...mensagens.map(criarMensagem));
      if (forcar || pertoDoFim) listaMensagens.scrollTop = listaMensagens.scrollHeight;
      ultimaAssinaturaMensagens = assinatura;
      await carregarContatos();
    }
  } catch (erro) {
    if (forcar) {
      listaMensagens.replaceChildren();
      const aviso = document.createElement("p");
      aviso.className = "estado-vazio-contatos";
      aviso.textContent = erro.message;
      listaMensagens.appendChild(aviso);
    }
  }
}

async function baixarAnexo(mensagem) {
  try {
    let resposta;
    try {
      resposta = await fetch(`${API}/arquivos/${encodeURIComponent(mensagem.id)}`, {
        headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
      });
    } catch {
      throw new Error("Não foi possível conectar à plataforma. Confira se o servidor está iniciado.");
    }
    if (!resposta.ok) {
      const texto = await resposta.text();
      let erro = {};
      try { erro = texto ? JSON.parse(texto) : {}; } catch { /* mantém a mensagem padrão */ }
      throw new Error(erro.erro || "Não foi possível baixar o arquivo.");
    }
    const arquivo = await resposta.blob();
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = mensagem.nome_arquivo || "arquivo";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (erro) {
    alert(erro.message || "Não foi possível baixar o arquivo.");
  }
}

function atualizarNomeArquivo() {
  const arquivo = arquivoMensagem?.files?.[0];
  nomeArquivoMensagem.textContent = arquivo ? `Anexo: ${arquivo.name} (${formatarTamanho(arquivo.size)})` : "";
  nomeArquivoMensagem.classList.toggle("escondido", !arquivo);
}

function ajustarAlturaCampoMensagem() {
  if (!campoMensagem) return;
  campoMensagem.style.height = "42px";
  campoMensagem.style.height = `${Math.min(campoMensagem.scrollHeight, 120)}px`;
}

export function inicializarMensagens() {
  if (!formularioContato || !formularioMensagem) return;

  formularioContato.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const idPublico = campoIdContato.value.trim();
    if (!/^\d{6}$/.test(idPublico)) {
      definirStatusContato("O ID público deve ter seis dígitos.", "erro");
      return;
    }
    const botao = document.getElementById("btn-adicionar-contato");
    botao.disabled = true;
    definirStatusContato("Adicionando contato...");
    try {
      const { dados } = await requisitar(`${API}/contatos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPublico }),
      });
      campoIdContato.value = "";
      definirStatusContato(dados.mensagem || "Solicitação enviada.", "sucesso");
    } catch (erro) {
      definirStatusContato(erro.message, "erro");
    } finally {
      botao.disabled = false;
    }
  });

  buscaContatos?.addEventListener("input", renderizarContatos);
  arquivoMensagem?.addEventListener("change", atualizarNomeArquivo);
  campoMensagem?.addEventListener("input", ajustarAlturaCampoMensagem);

  formularioMensagem.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!contatoSelecionado) return;
    const texto = campoMensagem.value.trim();
    const arquivo = arquivoMensagem.files?.[0] || null;
    if (!texto && !arquivo) return;
    if (arquivo && arquivo.size > 20_000_000) {
      alert("O arquivo deve ter no máximo 20 MB.");
      return;
    }
    botaoEnviar.disabled = true;
    try {
      let opcoes;
      if (arquivo) {
        const formulario = new FormData();
        formulario.append("texto", texto);
        formulario.append("arquivo", arquivo, arquivo.name);
        opcoes = { method: "POST", body: formulario };
      } else {
        opcoes = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) };
      }
      await requisitar(`${API}/contatos/${encodeURIComponent(contatoSelecionado.id)}/mensagens`, opcoes);
      campoMensagem.value = "";
      ajustarAlturaCampoMensagem();
      arquivoMensagem.value = "";
      atualizarNomeArquivo();
      await carregarMensagens(true);
    } catch (erro) {
      alert(erro.message || "Não foi possível enviar a mensagem.");
    } finally {
      botaoEnviar.disabled = false;
      campoMensagem.focus();
    }
  });

  campoMensagem?.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      formularioMensagem.requestSubmit();
    }
  });

  window.addEventListener("estudo-juntos:viewchange", (evento) => {
    if (evento.detail?.view === "mensagens") {
      mostrarInicioConversa();
      ultimaAtualizacaoAuxiliar = Date.now();
      carregarContatos().catch((erro) => definirStatusContato(erro.message, "erro"));
      iniciarTempoReal();
    } else {
      definirStatusContato();
      pararTempoReal();
    }
  });
  window.addEventListener("estudo-juntos:contatosatualizados", () => {
    carregarContatos().catch((erro) => console.error("Não foi possível atualizar contatos:", erro));
  });
  window.setInterval(() => {
    const view = document.getElementById("view-mensagens");
    if (!view?.classList.contains("escondido") && estado.tokenSessao) {
      const agora = Date.now();
      if (agora - ultimaAtualizacaoAuxiliar >= 14000) {
        ultimaAtualizacaoAuxiliar = agora;
        carregarContatos().catch(() => {});
      }
    }
  }, 14000);
  if (!document.getElementById("view-mensagens")?.classList.contains("escondido") && estado.tokenSessao) {
    ultimaAtualizacaoAuxiliar = Date.now();
    carregarContatos().catch((erro) => definirStatusContato(erro.message, "erro"));
    iniciarTempoReal();
  }
}
