// sala-de-aula.js
// Lógica da Sala de Aula do Grupo (membros, horários, atividades, recados e permissões)

import { estado } from "./estado.js";
import { excluirGrupoDoServidor, reconstruirGradesDeGrupos } from "./grupos.js";
import { mostrarView } from "./navegacao.js"; // <--- Importação restaurada para permitir mudar de tela
import { renderizarHorariosInicio } from "./inicio.js";

// Elementos do Cabeçalho e Informações Gerais da Sala
const nomeGrupoSala = document.getElementById("nome-grupo-sala");
const materiaGrupoSala = document.getElementById("materia-grupo-sala");
const tipoGrupoSala = document.getElementById("tipo-grupo-sala");
const criadorGrupoSala = document.getElementById("criador-grupo-sala");
const codigoGrupoSala = document.getElementById("codigo-grupo-sala");
const contadorMembrosSala = document.getElementById("contador-membros-sala");

// Secções e Painéis da Interface
const widgetsPrincipaisSala = document.getElementById("widgets-principais-sala");
const secaoMembrosSala = document.getElementById("secao-membros-sala");
const secaoConviteSala = document.getElementById("secao-convite-sala");
const listaMembrosSala = document.getElementById("lista-membros-sala");

// Botões de Navegação e Ação
const botaoExcluirGrupo = document.getElementById("btn-excluir-grupo");
const botaoSairGrupo = document.getElementById("btn-sair-grupo");
const botaoVerMembros = document.getElementById("btn-ver-membros");
const botaoConvidarMembros = document.getElementById("btn-convidar-membros");
const botaoFecharMembros = document.getElementById("btn-fechar-membros");
const botaoFecharConvite = document.getElementById("btn-fechar-convite");
const formularioConviteGrupo = document.getElementById("formulario-convite-grupo");
const campoIdPublicoConvite = document.getElementById("campo-id-publico-convite");
const mensagemConviteGrupo = document.getElementById("mensagem-convite-grupo");

// Campos de Recados (Mensagens)
const campoRecadoSala = document.getElementById("campo-recado-sala");
const botaoEnviarRecado = document.getElementById("btn-publicar-recado");
const feedRecadosSala = document.getElementById("feed-recados-sala");

// Campos de Atividades (Tarefas)
const campoTarefaSala = document.getElementById("campo-tarefa-sala");
const botaoPublicarTarefa = document.getElementById("btn-publicar-tarefa");
const listaTarefasSala = document.getElementById("feed-tarefas-sala");
const botaoAnexarAtividade = document.getElementById("btn-anexar-atividade");
const campoArquivoAtividade = document.getElementById("campo-arquivo-atividade");
const nomeArquivoAtividade = document.getElementById("nome-arquivo-atividade");

// Formulário de Horários
const painelGerenciarHorarios = document.getElementById("painel-gerenciar-horarios");
const diaSemanaSala = document.getElementById("select-dia-sala");
const faixaHorarioSala = document.getElementById("select-horario-sala");
const botaoAdicionarHorario = document.getElementById("btn-adicionar-horario");
const gradeHorariosSala = document.getElementById("lista-horarios-sala");
const bannerHorariosSala = document.getElementById("banner-horarios-sala");

async function lerRespostaApi(resposta) {
  const texto = await resposta.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    if (texto.trimStart().startsWith("<")) {
      throw new Error(`O servidor respondeu uma página HTML (HTTP ${resposta.status}) em vez da API. Reinicie o backend atualizado e tente novamente.`);
    }
    throw new Error(texto.trim() || `A API retornou uma resposta inválida (HTTP ${resposta.status}).`);
  }
}

/**
 * Abre a Sala de Aula do grupo selecionado e navega para a vista correspondente
 * @param {string} idGrupo - Chave do grupo em estado.bancoDeGrupos
 */
export async function abrirSalaDeAula(idGrupo) {
  estado.idGrupoEmEdicao = idGrupo;
  sessionStorage.setItem("estudoJuntosGrupoAtual", idGrupo);
  const dadosGrupo = estado.bancoDeGrupos[idGrupo];

  if (!dadosGrupo) return;

  // Altera a vista principal para a sala de aula
  mostrarView("salaDeAula", "salaDeAula");

  // Garante a exibição do painel principal da sala e esconde os secundários
  if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.remove("escondido");
  if (secaoMembrosSala) secaoMembrosSala.classList.add("escondido");
  if (secaoConviteSala) secaoConviteSala.classList.add("escondido");

  // Preenche dados do grupo na interface
  if (nomeGrupoSala) nomeGrupoSala.textContent = dadosGrupo.nome;
  if (materiaGrupoSala) materiaGrupoSala.textContent = dadosGrupo.materia;
  if (tipoGrupoSala) tipoGrupoSala.textContent = dadosGrupo.privacidade;
  if (criadorGrupoSala) criadorGrupoSala.textContent = dadosGrupo.criador || "Usuário desconhecido";
  if (codigoGrupoSala) codigoGrupoSala.textContent = dadosGrupo.codigo;

  const ehCriador = Number(dadosGrupo.criadorId) === Number(estado.usuarioAtualId);
  const ehAdministrador = Boolean(dadosGrupo.ehAdministrador);

  if (botaoExcluirGrupo) {
    botaoExcluirGrupo.style.display = ehCriador && ehAdministrador ? "inline-flex" : "none";
  }
  if (botaoSairGrupo) botaoSairGrupo.style.display = "inline-flex";
  if (botaoConvidarMembros) {
    botaoConvidarMembros.style.display = ehAdministrador ? "flex" : "none";
  }
  if (painelGerenciarHorarios) painelGerenciarHorarios.style.display = ehAdministrador ? "block" : "none";

  // Limpa campos de entrada
  if (campoRecadoSala) campoRecadoSala.value = "";
  if (campoTarefaSala) campoTarefaSala.value = "";
  if (campoArquivoAtividade) campoArquivoAtividade.value = "";
  if (nomeArquivoAtividade) {
    nomeArquivoAtividade.textContent = "";
    nomeArquivoAtividade.classList.add("escondido");
  }
  if (botaoPublicarTarefa) {
    botaoPublicarTarefa.removeAttribute("data-indice-edicao");
    botaoPublicarTarefa.textContent = "Cadastrar Atividade";
  }

  atualizarContadorMembros();
  renderizarHorarios();
  await Promise.all([carregarAtividadesDoGrupo(), carregarRecadosDoGrupo()]);
}

/** Atualiza a contagem persistida de participantes do grupo. */
export async function atualizarContadorMembros() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !contadorMembrosSala) return;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/participantes`, {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    if (!resposta.ok) return;
    const participantes = await resposta.json();
    const total = participantes.length;
    contadorMembrosSala.textContent = `${total} membro${total === 1 ? "" : "s"}`;
  } catch (erro) {
    console.error("Erro ao atualizar participantes:", erro);
  }
}

/** Renderiza os horários cadastrados no grupo */
export function renderizarHorarios() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo) return;
  gradeHorariosSala?.replaceChildren();
  bannerHorariosSala?.replaceChildren();

  if (dadosGrupo.horarios.length === 0) {
    if (gradeHorariosSala) gradeHorariosSala.textContent = "Nenhum horário cadastrado.";
    if (bannerHorariosSala) bannerHorariosSala.textContent = "Nenhum horário vinculado";
    return;
  }

  dadosGrupo.horarios.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item-horario-sala";
    const informacao = document.createElement("div");
    informacao.className = "informacao-horario-sala";
    const titulo = document.createElement("strong");
    titulo.className = "titulo-horario-sala";
    titulo.textContent = `${item.dia}: ${item.inicio} - ${item.fim}`;
    informacao.appendChild(titulo);
    if (item.descricao) {
      const descricao = document.createElement("p");
      descricao.className = "descricao-horario-sala";
      descricao.textContent = item.descricao;
      informacao.appendChild(descricao);
    }
    el.appendChild(informacao);
    if (dadosGrupo.ehAdministrador) {
      const botaoRemover = document.createElement("button");
      botaoRemover.type = "button";
      botaoRemover.className = "btn-remover-horario";
      botaoRemover.setAttribute("aria-label", `Remover horário de ${item.dia}, ${item.inicio} às ${item.fim}`);
      botaoRemover.title = "Remover horário";
      botaoRemover.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
      botaoRemover.addEventListener("click", () => removerHorarioDoGrupo(item.id, botaoRemover));
      el.appendChild(botaoRemover);
    }
    gradeHorariosSala?.appendChild(el);

    if (bannerHorariosSala) {
      const linha = document.createElement("span");
      linha.textContent = `${item.dia}: ${item.inicio} - ${item.fim}`;
      bannerHorariosSala.appendChild(linha);
    }
  });
}

function notificarAtualizacaoDosHorarios() {
  renderizarHorariosInicio();
  window.dispatchEvent(new Event("horarios-grupo-atualizados"));
}

async function removerHorarioDoGrupo(idHorario, botao) {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !dadosGrupo.ehAdministrador) return;
  botao.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/horarios/${encodeURIComponent(idHorario)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const resultado = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível remover o horário.");
    dadosGrupo.horarios = dadosGrupo.horarios.filter((horario) => String(horario.id) !== String(idHorario));
    renderizarHorarios();
    notificarAtualizacaoDosHorarios();
  } catch (erro) {
    alert(erro.message || "Não foi possível ligar ao servidor.");
    botao.disabled = false;
  }
}

/** Renderiza as publicações do quadro de atividades. */
export function renderizarTarefas() {
  if (!listaTarefasSala) return;
  listaTarefasSala.replaceChildren();
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo) return;
  const atividades = dadosGrupo.atividades || [];
  if (!atividades.length) {
    const vazio = document.createElement("p");
    vazio.className = "estado-vazio-atividades";
    vazio.textContent = "Nenhuma atividade publicada ainda.";
    listaTarefasSala.appendChild(vazio);
    return;
  }

  atividades.forEach((atividade) => listaTarefasSala.appendChild(criarCartaoAtividade(atividade, dadosGrupo)));
}

function criarCartaoAtividade(atividade, dadosGrupo) {
  const cartao = document.createElement("article");
  cartao.className = "cartao-atividade-grupo";
  cartao.dataset.atividadeId = String(atividade.id);
  const topo = document.createElement("div");
  topo.className = "meta-atividade-grupo";
  const autor = document.createElement("strong");
  autor.textContent = atividade.autor || "Participante";
  topo.appendChild(autor);
  if (atividade.criado_em) {
    const data = new Date(atividade.criado_em);
    const horario = document.createElement("time");
    if (Number.isNaN(data.getTime())) horario.textContent = String(atividade.criado_em);
    else {
      horario.dateTime = data.toISOString();
      horario.textContent = data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }
    topo.appendChild(horario);
  }
  cartao.appendChild(topo);

  if (atividade.texto) {
    const texto = document.createElement("p");
    texto.className = "texto-atividade-grupo";
    texto.textContent = atividade.texto;
    cartao.appendChild(texto);
  }

  if (atividade.nome_arquivo) {
    const linkArquivo = document.createElement("a");
    linkArquivo.className = "arquivo-atividade-grupo";
    linkArquivo.href = "#";
    linkArquivo.innerHTML = '<i class="fa-solid fa-paperclip" aria-hidden="true"></i>';
    const nome = document.createElement("span");
    nome.textContent = atividade.nome_arquivo;
    linkArquivo.appendChild(nome);
    if (atividade.tamanho_arquivo) {
      const tamanho = document.createElement("small");
      tamanho.textContent = formatarTamanhoArquivo(atividade.tamanho_arquivo);
      linkArquivo.appendChild(tamanho);
    }
    linkArquivo.addEventListener("click", (evento) => baixarArquivoAtividade(evento, atividade, dadosGrupo));
    cartao.appendChild(linkArquivo);
  }

  const usuarioPodeRemover = dadosGrupo.ehAdministrador || Number(atividade.autor_id) === Number(estado.usuarioAtualId);
  if (usuarioPodeRemover) {
    const acoes = document.createElement("div");
    acoes.className = "acoes-atividade-grupo";
    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "btn-remover-atividade-grupo";
    botaoRemover.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>Remover envio</span>';
    botaoRemover.addEventListener("click", (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      removerAtividadeDoGrupo(atividade, dadosGrupo, botaoRemover);
    });
    acoes.appendChild(botaoRemover);
    cartao.appendChild(acoes);
  }
  return cartao;
}

function formatarTamanhoArquivo(bytes) {
  const tamanho = Number(bytes);
  if (!Number.isFinite(tamanho) || tamanho <= 0) return "";
  return tamanho < 1024 * 1024
    ? `${Math.max(1, Math.round(tamanho / 1024))} KB`
    : `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
}

async function carregarAtividadesDoGrupo() {
  const chaveGrupo = estado.idGrupoEmEdicao;
  const dadosGrupo = estado.bancoDeGrupos[chaveGrupo];
  if (!dadosGrupo || !listaTarefasSala) return;
  listaTarefasSala.textContent = "Carregando atividades…";
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/atividades`, {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const atividades = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(atividades.erro || "Não foi possível carregar as atividades.");
    if (estado.idGrupoEmEdicao !== chaveGrupo) return;
    dadosGrupo.atividades = atividades;
    renderizarTarefas();
  } catch (erro) {
    if (estado.idGrupoEmEdicao === chaveGrupo) {
      listaTarefasSala.textContent = erro.message || "Não foi possível carregar as atividades.";
    }
  }
}

async function baixarArquivoAtividade(evento, atividade, dadosGrupo) {
  evento.preventDefault();
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/atividades/${encodeURIComponent(atividade.id)}/arquivo`, {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    if (!resposta.ok) {
      const erro = await lerRespostaApi(resposta);
      throw new Error(erro.erro || "Não foi possível baixar o arquivo.");
    }
    const url = URL.createObjectURL(await resposta.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = atividade.nome_arquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (erro) {
    alert(erro.message || "Não foi possível baixar o arquivo.");
  }
}

async function removerAtividadeDoGrupo(atividade, dadosGrupo, botao) {
  if (!confirm("Remover esta publicação e o arquivo anexado, se houver? Esta ação não pode ser desfeita.")) return;
  botao.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/atividades/${encodeURIComponent(atividade.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const resultado = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível remover a publicação.");
    dadosGrupo.atividades = (dadosGrupo.atividades || []).filter((item) => String(item.id) !== String(atividade.id));
    botao.closest(".cartao-atividade-grupo")?.remove();
    if (!listaTarefasSala.querySelector(".cartao-atividade-grupo")) {
      const vazio = document.createElement("p");
      vazio.className = "estado-vazio-atividades";
      vazio.textContent = "Nenhuma atividade publicada ainda.";
      listaTarefasSala.appendChild(vazio);
    }
  } catch (erro) {
    alert(erro.message || "Não foi possível remover a publicação.");
    botao.disabled = false;
  }
}

/** Renderiza os recados carregados do servidor. */
export function renderizarRecados() {
  if (!feedRecadosSala) return;
  feedRecadosSala.innerHTML = "";

  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo) return;
  const recados = dadosGrupo.recados || [];

  if (recados.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "estado-vazio-mural";
    vazio.textContent = "Nenhum recado publicado ainda.";
    vazio.style.cssText = "color: #94a3b8; font-size: 0.85rem; text-align: center;";
    feedRecadosSala.appendChild(vazio);
    return;
  }

  recados.forEach((recado) => feedRecadosSala.appendChild(criarCartaoRecado(recado, dadosGrupo)));
}

function criarCartaoRecado(recado, dadosGrupo) {
  const cartao = document.createElement("article");
  cartao.className = "item-recado-sala";
  cartao.dataset.recadoId = String(recado.id);
  cartao.style.cssText = "background: #ffffff; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";

  const cabecalho = document.createElement("div");
  cabecalho.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px;";
  const autor = document.createElement("strong");
  autor.textContent = recado.autor || "Participante";
  autor.style.cssText = "color: #3b82f6; font-size: 0.85rem;";
  cabecalho.appendChild(autor);
  if (recado.criado_em) {
    const data = new Date(recado.criado_em);
    const horario = document.createElement("time");
    if (!Number.isNaN(data.getTime())) {
      horario.dateTime = data.toISOString();
      horario.textContent = data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } else horario.textContent = String(recado.criado_em);
    horario.style.cssText = "color: #94a3b8; font-size: 0.72rem;";
    cabecalho.appendChild(horario);
  }
  cartao.appendChild(cabecalho);

  const texto = document.createElement("p");
  texto.textContent = recado.texto;
  texto.style.cssText = "margin: 0; color: #334155; font-size: 0.9rem; white-space: pre-wrap; overflow-wrap: anywhere;";
  cartao.appendChild(texto);

  const podeExcluir = dadosGrupo.ehAdministrador || Number(recado.autor_id) === Number(estado.usuarioAtualId);
  if (podeExcluir) {
    const acoes = document.createElement("div");
    acoes.style.cssText = "display: flex; justify-content: flex-end; margin-top: 8px;";
    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "btn-remover-atividade-grupo";
    botaoExcluir.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>Excluir recado</span>';
    botaoExcluir.addEventListener("click", (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      excluirRecadoDoMural(recado, dadosGrupo, botaoExcluir);
    });
    acoes.appendChild(botaoExcluir);
    cartao.appendChild(acoes);
  }
  return cartao;
}

async function carregarRecadosDoGrupo() {
  const chaveGrupo = estado.idGrupoEmEdicao;
  const dadosGrupo = estado.bancoDeGrupos[chaveGrupo];
  if (!dadosGrupo || !feedRecadosSala) return;
  feedRecadosSala.textContent = "Carregando mural…";
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/mural`, {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const recados = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(recados.erro || "Não foi possível carregar o mural.");
    if (estado.idGrupoEmEdicao !== chaveGrupo) return;
    dadosGrupo.recados = recados;
    renderizarRecados();
  } catch (erro) {
    if (estado.idGrupoEmEdicao === chaveGrupo) feedRecadosSala.textContent = erro.message || "Não foi possível carregar o mural.";
  }
}

async function excluirRecadoDoMural(recado, dadosGrupo, botao) {
  if (!confirm("Excluir este recado do mural?")) return;
  botao.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/mural/${encodeURIComponent(recado.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const resultado = await lerRespostaApi(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível excluir o recado.");
    dadosGrupo.recados = (dadosGrupo.recados || []).filter((item) => String(item.id) !== String(recado.id));
    botao.closest(".item-recado-sala")?.remove();
    if (!feedRecadosSala.querySelector(".item-recado-sala")) renderizarRecados();
  } catch (erro) {
    alert(erro.message || "Não foi possível excluir o recado.");
    botao.disabled = false;
  }
}

// --- Event Listeners --------------------------------------------------------

async function carregarParticipantesDoGrupo() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo) return;
  if (listaMembrosSala) listaMembrosSala.textContent = "Carregando participantes…";

  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/participantes`, {
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar os participantes.");
    if (listaMembrosSala) listaMembrosSala.replaceChildren();

    dados.forEach((participante) => {
      const ehAdministrador = Number(participante.administrador) === 1;
      const cartao = document.createElement("div");
      cartao.style.cssText = "display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;";
      const avatar = document.createElement("div");
      avatar.textContent = (participante.nome_usuario || "U").charAt(0).toUpperCase();
      avatar.style.cssText = `width: 36px; height: 36px; flex: 0 0 36px; background: ${ehAdministrador ? "#3b82f6" : "#10b981"}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;`;
      const informacoes = document.createElement("div");
      informacoes.style.flex = "1";
      const nome = document.createElement("strong");
      nome.textContent = participante.nome_usuario;
      nome.style.cssText = "color: #1e293b; font-size: 0.95rem;";
      const id = document.createElement("small");
      id.textContent = `ID ${participante.id_publico}`;
      id.style.cssText = "display: block; color: #64748b; margin-top: 3px;";
      const papel = document.createElement("span");
      papel.textContent = ehAdministrador ? "Administrador" : "Participante";
      papel.style.cssText = `font-size: 0.75rem; background: ${ehAdministrador ? "#dbeafe" : "#ecfdf5"}; color: ${ehAdministrador ? "#1e40af" : "#047857"}; padding: 2px 7px; border-radius: 4px; margin-left: 8px; font-weight: bold;`;
      informacoes.append(nome, papel, id);
      cartao.append(avatar, informacoes);

      if (dadosGrupo.ehAdministrador && Number(participante.id_publico) !== Number(estado.usuarioAtualIdPublico)) {
        const criarBotaoGestao = (rotulo, metodo, rota, confirmacao) => {
          const botao = document.createElement("button");
          botao.type = "button";
          botao.textContent = rotulo;
          botao.style.cssText = `border: 0; border-radius: 6px; padding: 8px 12px; background: ${metodo === "DELETE" ? "#dc2626" : ehAdministrador ? "#64748b" : "#2563eb"}; color: white; font-weight: 700; cursor: pointer;`;
          botao.addEventListener("click", async () => {
            if (confirmacao && !confirm(confirmacao)) return;
            botao.disabled = true;
            try {
              const respostaAcao = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}${rota}`, {
                method: metodo,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
                body: JSON.stringify({ idPublico: participante.id_publico }),
              });
              const resultado = await respostaAcao.json();
              if (!respostaAcao.ok) throw new Error(resultado.erro || "Não foi possível atualizar o participante.");
              await carregarParticipantesDoGrupo();
            } catch (erro) {
              alert(erro.message || "Não foi possível ligar ao servidor.");
              botao.disabled = false;
            }
          });
          cartao.appendChild(botao);
        };
        if (ehAdministrador) {
          criarBotaoGestao("Rebaixar a membro", "PATCH", "/administradores", "Rebaixar este administrador a membro?");
        } else {
          criarBotaoGestao("Tornar administrador", "POST", "/administradores");
        }
        criarBotaoGestao("Remover do grupo", "DELETE", "/participantes", `Remover ${participante.nome_usuario} deste grupo?`);
      }
      listaMembrosSala?.appendChild(cartao);
    });
    if (!dados.length && listaMembrosSala) listaMembrosSala.textContent = "Ainda não há participantes.";
    if (contadorMembrosSala) contadorMembrosSala.textContent = `${dados.length} membro${dados.length === 1 ? "" : "s"}`;
  } catch (erro) {
    if (listaMembrosSala) listaMembrosSala.textContent = erro.message;
  }
}

if (botaoExcluirGrupo) {
  botaoExcluirGrupo.addEventListener("click", () => {
    if (estado.idGrupoEmEdicao) {
      excluirGrupoDoServidor(estado.idGrupoEmEdicao);
    }
  });
}

if (botaoSairGrupo) {
  botaoSairGrupo.addEventListener("click", async () => {
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;
    if (!confirm("Tem certeza de que deseja sair deste grupo? Se você for o último participante, o grupo será excluído.")) return;

    botaoSairGrupo.disabled = true;
    botaoSairGrupo.textContent = "Saindo…";
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => controlador.abort(), 15000);
    try {
      const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/sair`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
        signal: controlador.signal,
      });
      const resultado = await lerRespostaApi(resposta);
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível sair do grupo.");

      delete estado.bancoDeGrupos[dadosGrupo.id];
      estado.idGrupoEmEdicao = null;
      reconstruirGradesDeGrupos();
      mostrarView("grupos", "grupos");
      alert(resultado.mensagem);
    } catch (erro) {
      const mensagem = erro.name === "AbortError"
        ? "O servidor demorou para responder. Atualize a página para confirmar se a saída foi concluída."
        : (erro.message || "Não foi possível ligar ao servidor.");
      alert(mensagem);
    } finally {
      window.clearTimeout(temporizador);
      botaoSairGrupo.disabled = false;
      botaoSairGrupo.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Sair do Grupo';
    }
  });
}

if (botaoVerMembros) {
  botaoVerMembros.addEventListener("click", async () => {
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.add("escondido");
    if (secaoMembrosSala) secaoMembrosSala.classList.remove("escondido");
    if (secaoConviteSala) secaoConviteSala.classList.add("escondido");
    await carregarParticipantesDoGrupo();
  });
}

if (botaoFecharMembros) {
  botaoFecharMembros.addEventListener("click", () => {
    if (secaoMembrosSala) secaoMembrosSala.classList.add("escondido");
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.remove("escondido");
  });
}

if (botaoConvidarMembros) {
  botaoConvidarMembros.addEventListener("click", () => {
    if (!estado.bancoDeGrupos[estado.idGrupoEmEdicao]?.ehAdministrador) {
      alert("Somente administradores podem convidar pessoas.");
      return;
    }
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.add("escondido");
    if (secaoMembrosSala) secaoMembrosSala.classList.add("escondido");
    if (secaoConviteSala) secaoConviteSala.classList.remove("escondido");
  });
}

if (formularioConviteGrupo) {
  formularioConviteGrupo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    const idPublico = campoIdPublicoConvite?.value.trim();
    if (!dadosGrupo || !idPublico) return;
    if (!dadosGrupo.ehAdministrador) {
      if (mensagemConviteGrupo) mensagemConviteGrupo.textContent = "Somente administradores podem convidar.";
      return;
    }

    try {
      const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/convites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${estado.tokenSessao || ""}`,
        },
        body: JSON.stringify({ idPublico }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível enviar o convite.");
      if (mensagemConviteGrupo) {
        mensagemConviteGrupo.textContent = resultado.mensagem;
        mensagemConviteGrupo.style.color = "#15803d";
      }
      formularioConviteGrupo.reset();
    } catch (erro) {
      if (mensagemConviteGrupo) {
        mensagemConviteGrupo.textContent = erro.message;
        mensagemConviteGrupo.style.color = "#dc2626";
      }
    }
  });
}

if (botaoFecharConvite) {
  botaoFecharConvite.addEventListener("click", () => {
    if (secaoConviteSala) secaoConviteSala.classList.add("escondido");
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.remove("escondido");
  });
}

if (botaoEnviarRecado && campoRecadoSala) {
  botaoEnviarRecado.addEventListener("click", async (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    const texto = campoRecadoSala.value.trim();
    if (!texto) return;

    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;
    if (texto.length > 5000) {
      alert("O recado pode ter até 5.000 caracteres.");
      return;
    }
    botaoEnviarRecado.disabled = true;
    botaoEnviarRecado.textContent = "Publicando…";
    try {
      const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/mural`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
        body: JSON.stringify({ texto }),
      });
      const resultado = await lerRespostaApi(resposta);
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível publicar o recado.");
      dadosGrupo.recados = dadosGrupo.recados || [];
      dadosGrupo.recados.unshift(resultado);
      feedRecadosSala.querySelector(".estado-vazio-mural")?.remove();
      feedRecadosSala.prepend(criarCartaoRecado(resultado, dadosGrupo));
      campoRecadoSala.value = "";
    } catch (erro) {
      alert(erro.message || "Não foi possível publicar o recado.");
    } finally {
      botaoEnviarRecado.disabled = false;
      botaoEnviarRecado.textContent = "Publicar no Mural";
    }
  });
}

botaoAnexarAtividade?.addEventListener("click", () => campoArquivoAtividade?.click());

campoArquivoAtividade?.addEventListener("change", () => {
  const arquivo = campoArquivoAtividade.files?.[0];
  if (!nomeArquivoAtividade) return;
  nomeArquivoAtividade.textContent = arquivo
    ? `${arquivo.name} • ${formatarTamanhoArquivo(arquivo.size)}`
    : "";
  nomeArquivoAtividade.classList.toggle("escondido", !arquivo);
});

if (botaoPublicarTarefa) {
  botaoPublicarTarefa.addEventListener("click", async (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    const texto = campoTarefaSala?.value.trim() || "";
    const arquivo = campoArquivoAtividade?.files?.[0] || null;
    if (!dadosGrupo || (!texto && !arquivo)) {
      alert("Escreva um texto ou anexe um arquivo para publicar.");
      return;
    }
    if (arquivo && arquivo.size > 20_000_000) {
      alert("O arquivo deve ter no máximo 20 MB.");
      return;
    }
    botaoPublicarTarefa.disabled = true;
    botaoPublicarTarefa.textContent = "Publicando…";
    try {
      let resposta;
      if (arquivo) {
        const formulario = new FormData();
        formulario.append("texto", texto);
        formulario.append("arquivo", arquivo, arquivo.name);
        resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/atividades/arquivo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
          body: formulario,
        });
      } else {
        resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/atividades`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
          body: JSON.stringify({ texto }),
        });
      }
      const resultado = await lerRespostaApi(resposta);
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível publicar a atividade.");
      const atividade = {
        id: resultado.id,
        texto,
        autor: estado.usuarioAtual,
        autor_id: estado.usuarioAtualId,
        criado_em: new Date().toISOString(),
        nome_arquivo: arquivo?.name || null,
        tamanho_arquivo: arquivo?.size || null,
      };
      dadosGrupo.atividades = dadosGrupo.atividades || [];
      dadosGrupo.atividades.unshift(atividade);
      listaTarefasSala.querySelector(".estado-vazio-atividades")?.remove();
      listaTarefasSala.prepend(criarCartaoAtividade(atividade, dadosGrupo));
      if (campoTarefaSala) campoTarefaSala.value = "";
      if (campoArquivoAtividade) campoArquivoAtividade.value = "";
      if (nomeArquivoAtividade) {
        nomeArquivoAtividade.textContent = "";
        nomeArquivoAtividade.classList.add("escondido");
      }
    } catch (erro) {
      alert(erro.message || "Não foi possível publicar a atividade.");
    } finally {
      botaoPublicarTarefa.disabled = false;
      botaoPublicarTarefa.textContent = "Publicar atividade";
    }
  });
}

if (botaoAdicionarHorario) {
  botaoAdicionarHorario.addEventListener("click", async () => {
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo || !dadosGrupo.ehAdministrador) {
      alert("Somente administradores podem vincular horários.");
      return;
    }
    const dia = diaSemanaSala?.value;
    const [horaInicio, horaFim] = (faixaHorarioSala?.value || "").split("-");
    if (!dia || !horaInicio || !horaFim) {
      alert("Selecione o dia da semana e o horário.");
      return;
    }
    botaoAdicionarHorario.disabled = true;
    try {
      const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/horarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
        body: JSON.stringify({ dia, inicio: `${horaInicio}:00`, fim: `${horaFim}:00` }),
      });
      const resultado = await lerRespostaApi(resposta);
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível vincular o horário.");
      dadosGrupo.horarios.push({ ...resultado, inicio: resultado.inicio.slice(0, 5), fim: resultado.fim.slice(0, 5) });
      if (diaSemanaSala) diaSemanaSala.value = "";
      if (faixaHorarioSala) faixaHorarioSala.value = "";
      renderizarHorarios();
      notificarAtualizacaoDosHorarios();
    } catch (erro) {
      alert(erro.message || "Não foi possível ligar ao servidor.");
    } finally {
      botaoAdicionarHorario.disabled = false;
    }
  });
}
