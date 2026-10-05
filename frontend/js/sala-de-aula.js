// sala-de-aula.js
// Lógica da Sala de Aula do Grupo (membros, horários, atividades, recados e permissões)

import { estado } from "./estado.js";
import { excluirGrupoDoServidor } from "./grupos.js";
import { mostrarView } from "./navegacao.js"; // <--- Importação restaurada para permitir mudar de tela

// Elementos do Cabeçalho e Informações Gerais da Sala
const nomeGrupoSala = document.getElementById("sala-nome-grupo");
const materiaGrupoSala = document.getElementById("sala-materia-grupo");
const tipoGrupoSala = document.getElementById("sala-tipo-grupo");
const codigoGrupoSala = document.getElementById("codigo-grupo-sala");
const contadorMembrosSala = document.getElementById("sala-contador-membros");

// Secções e Painéis da Interface
const widgetsPrincipaisSala = document.getElementById("sala-widgets-principais");
const secaoMembrosSala = document.getElementById("sala-secao-membros");
const secaoConviteSala = document.getElementById("sala-secao-convite");
const listaMembrosSala = document.getElementById("sala-lista-membros");

// Botões de Navegação e Ação
const botaoExcluirGrupo = document.getElementById("btn-excluir-grupo");
const botaoVerMembros = document.getElementById("btn-ver-membros");
const botaoConvidarMembros = document.getElementById("btn-convidar-membros");
const botaoFecharMembros = document.getElementById("btn-fechar-membros");
const botaoFecharConvite = document.getElementById("btn-fechar-convite");

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
  if (codigoGrupoSala) codigoGrupoSala.textContent = dadosGrupo.codigo;

  // Exibe o botão de exclusão apenas para quem criou o grupo
  const usuarioLogado = (estado.usuarioAtual || "").trim().toLowerCase();
  const criadorGrupo = (dadosGrupo.criador || "").trim().toLowerCase();
  const ehCriador = usuarioLogado !== "" && criadorGrupo === usuarioLogado;

  if (botaoExcluirGrupo) {
    botaoExcluirGrupo.style.display = ehCriador ? "inline-block" : "none";
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

/** Atualiza a contagem total de membros (Criador + Convidados) */
export function atualizarContadorMembros() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  if (!dadosGrupo || !contadorMembrosSala) return;

  const total = 1 + (dadosGrupo.membrosConvidados ? dadosGrupo.membrosConvidados.length : 0);
  contadorMembrosSala.textContent = `${total} membro${total > 1 ? "s" : ""}`;
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

if (botaoExcluirGrupo) {
  botaoExcluirGrupo.addEventListener("click", () => {
    if (estado.idGrupoEmEdicao) {
      excluirGrupoDoServidor(estado.idGrupoEmEdicao);
    }
  });
}

if (botaoVerMembros) {
  botaoVerMembros.addEventListener("click", () => {
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.add("escondido");
    if (secaoMembrosSala) secaoMembrosSala.classList.remove("escondido");
    if (secaoConviteSala) secaoConviteSala.classList.add("escondido");

    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (!dadosGrupo) return;

    const nomeCriador = dadosGrupo.criador || "Administrador";
    const usuarioLogado = (estado.usuarioAtual || "").trim().toLowerCase();
    const criadorGrupo = nomeCriador.trim().toLowerCase();
    const ehCriador = usuarioLogado !== "" && criadorGrupo === usuarioLogado;

    let listaHTML = `
      <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
        <div style="width: 36px; height: 36px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
          ${nomeCriador.charAt(0).toUpperCase()}
        </div>
        <div>
          <strong style="color: #1e293b; font-size: 0.95rem;">${nomeCriador.toUpperCase()}</strong>
          <span style="font-size: 0.75rem; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold;">
            ${ehCriador ? "Você (Administrador)" : "Administrador"}
          </span>
        </div>
      </div>
    `;

    if (dadosGrupo.membrosConvidados && dadosGrupo.membrosConvidados.length > 0) {
      dadosGrupo.membrosConvidados.forEach((membro) => {
        listaHTML += `
          <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
            <div style="width: 36px; height: 36px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
              ${membro.nome ? membro.nome.charAt(0).toUpperCase() : "M"}
            </div>
            <div>
              <strong style="color: #1e293b; font-size: 0.95rem;">${(membro.nome || "Membro").toUpperCase()}</strong>
              ${membro.email ? `<span style="font-size: 0.75rem; color: #64748b; margin-left: 8px;">(${membro.email})</span>` : ""}
              <span style="font-size: 0.75rem; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold;">Convidado</span>
            </div>
          </div>
        `;
      });
    }

    if (listaMembrosSala) listaMembrosSala.innerHTML = listaHTML;
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
    if (widgetsPrincipaisSala) widgetsPrincipaisSala.classList.add("escondido");
    if (secaoMembrosSala) secaoMembrosSala.classList.add("escondido");
    if (secaoConviteSala) secaoConviteSala.classList.remove("escondido");
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
