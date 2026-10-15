// recursos.js
// Lista os arquivos anexados às publicações dos grupos do usuário.

import { estado } from "./estado.js";

const botaoNavRecursos = document.getElementById("nav-btn-recursos");
const containerRecursos = document.getElementById("container-recursos");

async function lerRespostaApi(resposta) {
  const texto = await resposta.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error(texto.trimStart().startsWith("<")
      ? `A API respondeu HTML em vez de JSON (HTTP ${resposta.status}).`
      : `Resposta inválida da API (HTTP ${resposta.status}).`);
  }
}

function formatarTamanho(bytes) {
  const tamanho = Number(bytes);
  if (!Number.isFinite(tamanho) || tamanho <= 0) return "";
  return tamanho < 1024 * 1024
    ? `${Math.max(1, Math.round(tamanho / 1024))} KB`
    : `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
}

function iconeDoArquivo(nomeArquivo) {
  const extensao = String(nomeArquivo).split(".").pop().toLowerCase();
  if (extensao === "pdf") return "fa-file-pdf";
  if (["doc", "docx", "odt"].includes(extensao)) return "fa-file-word";
  if (["xls", "xlsx", "csv", "ods"].includes(extensao)) return "fa-file-excel";
  if (["ppt", "pptx", "odp"].includes(extensao)) return "fa-file-powerpoint";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extensao)) return "fa-file-image";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extensao)) return "fa-file-zipper";
  return "fa-file-lines";
}

function criarCartaoArquivo(arquivo) {
  const linha = document.createElement("article");
  linha.className = "cartao-arquivo-recurso";

  const icone = document.createElement("i");
  icone.className = `fa-solid ${iconeDoArquivo(arquivo.nome_arquivo)}`;
  icone.setAttribute("aria-hidden", "true");

  const informacoes = document.createElement("div");
  informacoes.className = "informacoes-arquivo-recurso";
  const nome = document.createElement("strong");
  nome.textContent = arquivo.nome_arquivo;
  const detalhes = document.createElement("small");
  const data = arquivo.criado_em ? new Date(arquivo.criado_em) : null;
  const dataTexto = data && !Number.isNaN(data.getTime())
    ? data.toLocaleDateString("pt-BR")
    : "";
  detalhes.textContent = [
    arquivo.autor ? `Enviado por ${arquivo.autor}` : "",
    dataTexto,
    formatarTamanho(arquivo.tamanho_arquivo),
  ].filter(Boolean).join(" • ");
  informacoes.append(nome, detalhes);

  const botaoBaixar = document.createElement("button");
  botaoBaixar.type = "button";
  botaoBaixar.className = "botao-baixar-recurso";
  botaoBaixar.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i><span>Baixar</span>';
  botaoBaixar.addEventListener("click", () => baixarArquivo(arquivo, botaoBaixar));

  linha.append(icone, informacoes, botaoBaixar);
  return linha;
}

async function baixarArquivo(arquivo, botao) {
  botao.disabled = true;
  try {
    const resposta = await fetch(
      `${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(arquivo.grupo_id)}/atividades/${encodeURIComponent(arquivo.atividade_id)}/arquivo`,
      { headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` } },
    );
    if (!resposta.ok) {
      const erro = await lerRespostaApi(resposta);
      throw new Error(erro.erro || "Não foi possível baixar o arquivo.");
    }
    const url = URL.createObjectURL(await resposta.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = arquivo.nome_arquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (erro) {
    alert(erro.message || "Não foi possível baixar o arquivo.");
  } finally {
    botao.disabled = false;
  }
}

export async function renderizarRecursos() {
  if (!containerRecursos) return;
  containerRecursos.replaceChildren();

  const grupos = Object.values(estado.bancoDeGrupos);
  if (!grupos.length) {
    const vazio = document.createElement("div");
    vazio.className = "caixa-estado-vazio";
    vazio.textContent = "Você ainda não participa de nenhum grupo.";
    containerRecursos.appendChild(vazio);
    return;
  }

  containerRecursos.textContent = "Carregando arquivos dos grupos…";
  try {
    const resposta = await fetch(window.ESTUDO_API_URL + "/api/recursos", {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const arquivos = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(arquivos.erro || "Não foi possível carregar os recursos.");

    const arquivosPorGrupo = new Map();
    arquivos.forEach((arquivo) => {
      const lista = arquivosPorGrupo.get(arquivo.grupo_id) || [];
      lista.push(arquivo);
      arquivosPorGrupo.set(arquivo.grupo_id, lista);
    });

    containerRecursos.replaceChildren();
    grupos.forEach((grupo) => {
      const cartao = document.createElement("section");
      cartao.className = "cartao-grupo-recursos";
      const cabecalho = document.createElement("div");
      cabecalho.className = "cabecalho-grupo-recursos";
      const titulo = document.createElement("h3");
      titulo.textContent = grupo.nome;
      const lista = arquivosPorGrupo.get(grupo.id_unico) || [];
      const contador = document.createElement("span");
      contador.className = "contador-recursos";
      contador.textContent = `${lista.length} ${lista.length === 1 ? "arquivo" : "arquivos"}`;
      cabecalho.append(titulo, contador);
      cartao.appendChild(cabecalho);

      if (lista.length) {
        const listaArquivos = document.createElement("div");
        listaArquivos.className = "lista-arquivos-recursos";
        lista.forEach((arquivo) => listaArquivos.appendChild(criarCartaoArquivo(arquivo)));
        cartao.appendChild(listaArquivos);
      } else {
        const vazio = document.createElement("div");
        vazio.className = "recurso-vazio";
        vazio.textContent = "Nenhum arquivo compartilhado neste grupo.";
        cartao.appendChild(vazio);
      }
      containerRecursos.appendChild(cartao);
    });
  } catch (erro) {
    containerRecursos.replaceChildren();
    const mensagem = document.createElement("div");
    mensagem.className = "caixa-estado-vazio erro-recursos";
    mensagem.textContent = erro.message || "Não foi possível carregar os recursos dos grupos.";
    containerRecursos.appendChild(mensagem);
  }
}

export function inicializarRecursos() {
  botaoNavRecursos?.addEventListener("click", (evento) => {
    evento.preventDefault();
    void renderizarRecursos();
  });
}
