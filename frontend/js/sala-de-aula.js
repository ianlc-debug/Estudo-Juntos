// sala-de-aula.js
// Lógica da Sala de Aula do Grupo (membros, horários, atividades, recados e permissões)

import { estado } from "./estado.js";
import { excluirGrupoDoServidor, reconstruirGradesDeGrupos } from "./grupos.js";
import { mostrarView } from "./navegacao.js"; // <--- Importação restaurada para permitir mudar de tela

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
const botaoEnviarRecado = document.getElementById("btn-enviar-recado");
const feedRecadosSala = document.getElementById("feed-recados-sala");

// Campos de Atividades (Tarefas)
const campoTarefaSala = document.getElementById("campo-tarefa-sala");
const campoDataTarefaSala = document.getElementById("campo-data-tarefa-sala");
const botaoPublicarTarefa = document.getElementById("btn-publicar-tarefa");
const listaTarefasSala = document.getElementById("lista-tarefas-sala");

// Formulário de Horários
const formularioHorarioSala = document.getElementById("formulario-horario-sala");
const diaSemanaSala = document.getElementById("dia-semana-sala");
const horaInicioSala = document.getElementById("hora-inicio-sala");
const horaFimSala = document.getElementById("hora-fim-sala");
const descricaoHorarioSala = document.getElementById("descricao-horario-sala");
const gradeHorariosSala = document.getElementById("grade-horarios-sala");

/**
 * Abre a Sala de Aula do grupo selecionado e navega para a vista correspondente
 * @param {string} idGrupo - Chave do grupo em estado.bancoDeGrupos
 */
export function abrirSalaDeAula(idGrupo) {
  estado.idGrupoEmEdicao = idGrupo;
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

  // Limpa campos de entrada
  if (campoRecadoSala) campoRecadoSala.value = "";
  if (campoTarefaSala) campoTarefaSala.value = "";
  if (campoDataTarefaSala) campoDataTarefaSala.value = "";
  if (botaoPublicarTarefa) {
    botaoPublicarTarefa.removeAttribute("data-indice-edicao");
    botaoPublicarTarefa.textContent = "Cadastrar Atividade";
  }

  atualizarContadorMembros();
  renderizarHorarios();
  renderizarTarefas();
  renderizarRecados();
}

/** Atualiza a contagem persistida de participantes do grupo. */
export async function atualizarContadorMembros() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !contadorMembrosSala) return;
  try {
    const resposta = await fetch(`http://localhost:3000/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/participantes`, {
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
  if (!gradeHorariosSala) return;
  gradeHorariosSala.innerHTML = "";

  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !dadosGrupo.horarios) return;

  if (dadosGrupo.horarios.length === 0) {
    gradeHorariosSala.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">Nenhum horário cadastrado.</p>`;
    return;
  }

  dadosGrupo.horarios.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "item-horario-sala";
    el.style.cssText =
      "background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0;";
    el.innerHTML = `
      <div>
        <strong style="color: #334155; font-size: 0.85rem;">${item.dia}: ${item.inicio} - ${item.fim}</strong>
        <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${item.descricao || "Sem descrição"}</p>
      </div>
      <button class="btn-remover-horario" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold;">✕</button>
    `;
    gradeHorariosSala.appendChild(el);
  });

  gradeHorariosSala.querySelectorAll(".btn-remover-horario").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      dadosGrupo.horarios.splice(index, 1);
      renderizarHorarios();
    });
  });
}

/** Renderiza as atividades do grupo */
export function renderizarTarefas() {
  if (!listaTarefasSala) return;
  listaTarefasSala.innerHTML = "";

  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !dadosGrupo.tarefas) return;

  if (dadosGrupo.tarefas.length === 0) {
    listaTarefasSala.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">Nenhuma atividade cadastrada.</p>`;
    return;
  }

  dadosGrupo.tarefas.forEach((tarefa, index) => {
    const el = document.createElement("div");
    el.className = "item-tarefa-sala";
    el.style.cssText =
      "background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0;";
    el.innerHTML = `
      <div>
        <strong style="color: #1e293b; font-size: 0.9rem;">${tarefa.titulo}</strong>
        ${tarefa.data ? `<p style="margin: 2px 0 0; color: #64748b; font-size: 0.78rem;">Data: ${tarefa.data}</p>` : ""}
      </div>
      <button class="btn-remover-tarefa" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold;">✕</button>
    `;
    listaTarefasSala.appendChild(el);
  });

  listaTarefasSala.querySelectorAll(".btn-remover-tarefa").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      dadosGrupo.tarefas.splice(index, 1);
      renderizarTarefas();
    });
  });
}

/** Renderiza o feed de mensagens/recados */
export function renderizarRecados() {
  if (!feedRecadosSala) return;
  feedRecadosSala.innerHTML = "";

  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !dadosGrupo.mensagens) return;

  if (dadosGrupo.mensagens.length === 0) {
    feedRecadosSala.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem; text-align: center;">Nenhum recado publicado ainda.</p>`;
    return;
  }

  dadosGrupo.mensagens.forEach((msg) => {
    const el = document.createElement("div");
    el.className = "item-recado-sala";
    el.style.cssText =
      "background: #ffffff; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <strong style="color: #3b82f6; font-size: 0.82rem;">${msg.autor || "Anônimo"}</strong>
        <small style="color: #94a3b8; font-size: 0.72rem;">${msg.horario || ""}</small>
      </div>
      <p style="margin: 0; color: #334155; font-size: 0.88rem;">${msg.texto}</p>
    `;
    feedRecadosSala.appendChild(el);
  });
}

// --- Event Listeners --------------------------------------------------------

async function carregarParticipantesDoGrupo() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo) return;
  if (listaMembrosSala) listaMembrosSala.textContent = "Carregando participantes…";

  try {
    const resposta = await fetch(`http://localhost:3000/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/participantes`, {
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

      if (dadosGrupo.ehAdministrador && !ehAdministrador) {
        const botaoPromover = document.createElement("button");
        botaoPromover.type = "button";
        botaoPromover.textContent = "Tornar administrador";
        botaoPromover.style.cssText = "border: 0; border-radius: 6px; padding: 8px 12px; background: #2563eb; color: white; font-weight: 700; cursor: pointer;";
        botaoPromover.addEventListener("click", async () => {
          botaoPromover.disabled = true;
          botaoPromover.textContent = "Promovendo…";
          try {
            const respostaPromocao = await fetch(`http://localhost:3000/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/administradores`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${estado.tokenSessao || ""}`,
              },
              body: JSON.stringify({ idPublico: participante.id_publico }),
            });
            const resultado = await respostaPromocao.json();
            if (!respostaPromocao.ok) throw new Error(resultado.erro || "Não foi possível promover o participante.");
            await carregarParticipantesDoGrupo();
          } catch (erro) {
            alert(erro.message || "Não foi possível ligar ao servidor.");
            botaoPromover.disabled = false;
            botaoPromover.textContent = "Tornar administrador";
          }
        });
        cartao.appendChild(botaoPromover);
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
      const resposta = await fetch(`http://localhost:3000/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/sair`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
        signal: controlador.signal,
      });
      const resultado = await resposta.json();
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
      const resposta = await fetch(`http://localhost:3000/api/grupos/${encodeURIComponent(dadosGrupo.id_unico)}/convites`, {
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
  botaoEnviarRecado.addEventListener("click", () => {
    const texto = campoRecadoSala.value.trim();
    if (!texto) return;

    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;

    const agora = new Date();
    const horaFormatada = `${agora.getHours().toString().padStart(2, "0")}:${agora.getMinutes().toString().padStart(2, "0")}`;

    dadosGrupo.mensagens.push({
      autor: estado.usuarioAtual || "Usuário",
      texto: texto,
      horario: horaFormatada,
    });

    campoRecadoSala.value = "";
    renderizarRecados();
  });
}

if (botaoPublicarTarefa && campoTarefaSala) {
  botaoPublicarTarefa.addEventListener("click", () => {
    const titulo = campoTarefaSala.value.trim();
    const data = campoDataTarefaSala ? campoDataTarefaSala.value : "";
    if (!titulo) return;

    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;

    dadosGrupo.tarefas.push({ titulo, data });
    campoTarefaSala.value = "";
    if (campoDataTarefaSala) campoDataTarefaSala.value = "";

    renderizarTarefas();
  });
}

if (formularioHorarioSala) {
  formularioHorarioSala.addEventListener("submit", (e) => {
    e.preventDefault();
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;

    const novoHorario = {
      dia: diaSemanaSala ? diaSemanaSala.value : "Segunda-feira",
      inicio: horaInicioSala ? horaInicioSala.value : "08:00",
      fim: horaFimSala ? horaFimSala.value : "09:00",
      descricao: descricaoHorarioSala ? descricaoHorarioSala.value.trim() : "",
    };

    dadosGrupo.horarios.push(novoHorario);
    formularioHorarioSala.reset();
    renderizarHorarios();
  });
}
