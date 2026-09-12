// sala-de-aula.js
// Tudo o que acontece dentro de um grupo já aberto: cabeçalho, membros,
// convites, horários fixos, mural de atividades e mural de recados.

import { estado } from "./estado.js";
import { mostrarView } from "./navegacao.js";
import { reconstruirGradesDeGrupos } from "./grupos.js";
import { renderizarTarefasGlobais, renderizarHorariosInicio } from "./inicio.js";

const nomeGrupoSala = document.getElementById("nome-grupo-sala");
const materiaGrupoSala = document.getElementById("materia-grupo-sala");
const tipoGrupoSala = document.getElementById("tipo-grupo-sala");
const codigoGrupoSala = document.getElementById("codigo-grupo-sala");
const bannerHorariosSala = document.getElementById("banner-horarios-sala");
const contadorMembrosSala = document.getElementById("contador-membros-sala");
const botaoExcluirGrupo = document.getElementById("btn-excluir-grupo");

const botaoVerMembros = document.getElementById("btn-ver-membros");
const botaoFecharMembros = document.getElementById("btn-fechar-membros");
const botaoAbrirConviteMembro = document.getElementById("btn-abrir-convite-membro");
const botaoFecharConvite = document.getElementById("btn-fechar-convite");

const widgetsPrincipaisSala = document.getElementById("widgets-principais-sala");
const secaoMembrosSala = document.getElementById("secao-membros-sala");
const listaMembrosSala = document.getElementById("lista-membros-sala");
const secaoConviteSala = document.getElementById("secao-convite-sala");
const formularioConviteGrupo = document.getElementById("formulario-convite-grupo");

const selectDiaSala = document.getElementById("select-dia-sala");
const selectHorarioSala = document.getElementById("select-horario-sala");
const listaHorariosSala = document.getElementById("lista-horarios-sala");
const botaoAdicionarHorario = document.getElementById("btn-adicionar-horario");

const campoTarefaSala = document.getElementById("campo-tarefa-sala");
const botaoPublicarTarefa = document.getElementById("btn-publicar-tarefa");
const feedTarefasSala = document.getElementById("feed-tarefas-sala");
const botaoSimularUpload = document.getElementById("btn-simular-upload");

const campoRecadoSala = document.getElementById("campo-recado-sala");
const botaoPublicarRecado = document.getElementById("btn-publicar-recado");
const feedRecadosSala = document.getElementById("feed-recados-sala");

/** Abre a sala de aula de um grupo específico. */
export function abrirSalaDeAula(idGrupo) {
  estado.idGrupoEmEdicao = idGrupo;
  const dadosGrupo = estado.bancoDeGrupos[idGrupo];

  mostrarView("salaDeAula", null);

  widgetsPrincipaisSala.classList.remove("escondido");
  secaoMembrosSala.classList.add("escondido");
  secaoConviteSala.classList.add("escondido");

  nomeGrupoSala.textContent = dadosGrupo.nome;
  materiaGrupoSala.textContent = dadosGrupo.materia;
  tipoGrupoSala.textContent = dadosGrupo.privacidade;
  codigoGrupoSala.textContent = dadosGrupo.codigo;

  campoRecadoSala.value = "";
  campoTarefaSala.value = "";
  if (botaoPublicarTarefa) {
    botaoPublicarTarefa.removeAttribute("data-indice-edicao");
    botaoPublicarTarefa.textContent = "Cadastrar Atividade";
  }

  atualizarContadorMembros();
  renderizarHorarios();
  renderizarTarefas();
  renderizarRecados();
}

export function atualizarContadorMembros() {
  const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
  const totalMembros = 1 + dadosGrupo.membrosConvidados.length;
  contadorMembrosSala.textContent = totalMembros;
}

if (botaoSimularUpload) {
  botaoSimularUpload.addEventListener("click", () => {
    botaoSimularUpload.style.opacity = "0.7";
    setTimeout(() => (botaoSimularUpload.style.opacity = "1"), 150);
  });
}

if (botaoExcluirGrupo) {
  botaoExcluirGrupo.addEventListener("click", () => {
    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    if (confirm(`Tem certeza que deseja excluir o grupo "${dadosGrupo.nome}"?`)) {
      delete estado.bancoDeGrupos[estado.idGrupoEmEdicao];
      estado.idGrupoEmEdicao = null;
      reconstruirGradesDeGrupos();
      renderizarTarefasGlobais();
      mostrarView("grupos");
    }
  });
}

// --- Membros e convites ---------------------------------------------------

if (botaoVerMembros) {
  botaoVerMembros.addEventListener("click", () => {
    widgetsPrincipaisSala.classList.add("escondido");
    secaoMembrosSala.classList.remove("escondido");

    const dadosGrupo = estado.bancoDeGrupos[estado.idGrupoEmEdicao];

    let listaHTML = `
                <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 36px; height: 36px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                        ${estado.usuarioAtual.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong style="color: #1e293b; font-size: 0.95rem;">${estado.usuarioAtual.toUpperCase()}</strong>
                        <span style="font-size: 0.75rem; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold;">Você (Administrador)</span>
                    </div>
                </div>
            `;

    dadosGrupo.membrosConvidados.forEach((membro) => {
      listaHTML += `
                    <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="width: 36px; height: 36px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                            ${membro.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong style="color: #1e293b; font-size: 0.95rem;">${membro.nome.toUpperCase()}</strong>
                            <span style="font-size: 0.75rem; color: #64748b; margin-left: 8px;">(${membro.email})</span>
                            <span style="font-size: 0.75rem; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold;">Convidado</span>
                        </div>
                    </div>
                `;
    });

    listaMembrosSala.innerHTML = listaHTML;
  });
}

if (botaoFecharMembros) {
  botaoFecharMembros.addEventListener("click", () => {
    secaoMembrosSala.classList.add("escondido");
    widgetsPrincipaisSala.classList.remove("escondido");
  });
}

if (botaoAbrirConviteMembro) {
  botaoAbrirConviteMembro.addEventListener("click", () => {
    secaoConviteSala.classList.remove("escondido");
    document.getElementById("campo-nome-convite").focus();
  });
}

if (botaoFecharConvite) {
  botaoFecharConvite.addEventListener("click", () => {
    secaoConviteSala.classList.add("escondido");
    formularioConviteGrupo.reset();
  });
}

if (formularioConviteGrupo) {
  formularioConviteGrupo.addEventListener("submit", (e) => {
    e.preventDefault();
    const nomeInformado = document.getElementById("campo-nome-convite").value.trim();
    const emailInformado = document.getElementById("campo-email-convite").value.trim();

    const grupoAtual = estado.bancoDeGrupos[estado.idGrupoEmEdicao];
    grupoAtual.membrosConvidados.push({ nome: nomeInformado, email: emailInformado });

    formularioConviteGrupo.reset();
    secaoConviteSala.classList.add("escondido");
    atualizarContadorMembros();

    if (!secaoMembrosSala.classList.contains("escondido")) {
      botaoVerMembros.click();
    }
  });
}

// --- Horários fixos ---------------------------------------------------

if (botaoAdicionarHorario) {
  botaoAdicionarHorario.addEventListener("click", () => {
    const dia = selectDiaSala.value;
    const valorHorario = selectHorarioSala.value;
    if (!dia || !valorHorario) return alert("Selecione um dia e um horário válidos.");

    const partes = valorHorario.split("-");
    const horarioFormatado = `${partes[0]}:00 - ${partes[1]}:00`;

    const registro = `${dia} às ${horarioFormatado}`;
    const listaAtual = estado.bancoDeGrupos[estado.idGrupoEmEdicao].horarios;

    if (listaAtual.includes(registro)) return alert("Esse horário já está vinculado ao grupo!");

    listaAtual.push(registro);
    renderizarHorarios();
  });
}

export function renderizarHorarios() {
  listaHorariosSala.innerHTML = "";
  bannerHorariosSala.innerHTML = "";
  const lista = estado.bancoDeGrupos[estado.idGrupoEmEdicao].horarios;

  if (lista.length === 0) {
    bannerHorariosSala.innerHTML = `<span style="opacity:0.75; font-style: italic;">Nenhum horário definido</span>`;
  }

  lista.forEach((item, indice) => {
    const itemBanner = document.createElement("p");
    itemBanner.innerHTML = `<i class="fa-regular fa-calendar-check" style="margin-right: 6px;"></i> ${item}`;
    bannerHorariosSala.appendChild(itemBanner);

    const chip = document.createElement("div");
    chip.className = "chip-horario";
    chip.innerHTML = `${item} <button class="btn-remover-chip">&times;</button>`;
    chip.querySelector(".btn-remover-chip").addEventListener("click", () => {
      lista.splice(indice, 1);
      renderizarHorarios();
    });
    listaHorariosSala.appendChild(chip);
  });

  renderizarHorariosInicio();
}

// --- Mural de atividades (tarefas) -----------------------------------------

if (botaoPublicarTarefa) {
  botaoPublicarTarefa.addEventListener("click", () => {
    const textoTarefa = campoTarefaSala.value.trim();
    if (!textoTarefa) return;

    const arrayAlvo = estado.bancoDeGrupos[estado.idGrupoEmEdicao].tarefas;
    const indiceEmEdicao = botaoPublicarTarefa.getAttribute("data-indice-edicao");

    if (indiceEmEdicao !== null) {
      arrayAlvo[parseInt(indiceEmEdicao)].texto = textoTarefa;
      botaoPublicarTarefa.removeAttribute("data-indice-edicao");
      botaoPublicarTarefa.textContent = "Cadastrar Atividade";
    } else {
      arrayAlvo.push({ autor: estado.usuarioAtual, texto: textoTarefa, concluida: false });
    }

    campoTarefaSala.value = "";
    renderizarTarefas();
    renderizarTarefasGlobais();
  });
}

export function renderizarTarefas() {
  feedTarefasSala.innerHTML = "";
  const lista = estado.bancoDeGrupos[estado.idGrupoEmEdicao].tarefas;
  lista.forEach((tarefa, idx) => {
    const cartao = document.createElement("div");
    cartao.className = "cartao-post-mural";

    const classeEstiloTexto = tarefa.concluida ? "texto-tarefa-concluida" : "";
    const marcado = tarefa.concluida ? "checked" : "";

    cartao.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <input type="checkbox" class="checkbox-tarefa" ${marcado} style="transform: scale(1.2); margin-top: 4px; cursor: pointer;">
                    <div style="flex: 1;">
                        <div class="meta-post-mural">📍 Cadastrado por: <strong>${tarefa.autor.toUpperCase()}</strong></div>
                        <p class="${classeEstiloTexto}" style="margin: 0; font-weight: 500;">${tarefa.texto}</p>
                        <div class="acoes-cartao-mural">
                            <button class="btn-editar-post-mural">✏️ Editar</button>
                            <button class="btn-excluir-post-mural"><i class="fa-solid fa-trash-can"></i> Excluir</button>
                        </div>
                    </div>
                </div>
            `;

    cartao.querySelector(".checkbox-tarefa").addEventListener("change", (e) => {
      tarefa.concluida = e.target.checked;
      renderizarTarefas();
      renderizarTarefasGlobais();
    });

    cartao.querySelector(".btn-editar-post-mural").addEventListener("click", () => {
      campoTarefaSala.value = tarefa.texto;
      campoTarefaSala.focus();
      botaoPublicarTarefa.setAttribute("data-indice-edicao", idx);
      botaoPublicarTarefa.textContent = "Salvar Alterações";
    });

    cartao.querySelector(".btn-excluir-post-mural").addEventListener("click", () => {
      lista.splice(idx, 1);
      renderizarTarefas();
      renderizarTarefasGlobais();
    });

    feedTarefasSala.appendChild(cartao);
  });
}

// --- Mural de recados (mensagens do grupo) ---------------------------------

if (botaoPublicarRecado) {
  botaoPublicarRecado.addEventListener("click", () => {
    const textoRecado = campoRecadoSala.value.trim();
    if (!textoRecado) return;

    const arrayAlvo = estado.bancoDeGrupos[estado.idGrupoEmEdicao].mensagens;
    const indiceEmEdicao = botaoPublicarRecado.getAttribute("data-indice-edicao");

    if (indiceEmEdicao !== null) {
      arrayAlvo[parseInt(indiceEmEdicao)].texto = textoRecado;
      botaoPublicarRecado.removeAttribute("data-indice-edicao");
      botaoPublicarRecado.textContent = "Publicar no Mural";
    } else {
      arrayAlvo.push({ autor: estado.usuarioAtual, texto: textoRecado });
    }

    campoRecadoSala.value = "";
    renderizarRecados();
  });
}

export function renderizarRecados() {
  feedRecadosSala.innerHTML = "";
  const lista = estado.bancoDeGrupos[estado.idGrupoEmEdicao].mensagens;
  lista.forEach((recado, idx) => {
    const cartao = document.createElement("div");
    cartao.className = "cartao-post-mural";
    cartao.innerHTML = `
                <div class="meta-post-mural">👤 Enviado por: <strong>${recado.autor.toUpperCase()}</strong></div>
                <p>${recado.texto}</p>
                <div class="acoes-cartao-mural">
                    <button class="btn-editar-post-mural">✏️ Editar recado</button>
                    <button class="btn-excluir-post-mural"><i class="fa-solid fa-trash-can"></i> Excluir</button>
                </div>
            `;

    cartao.querySelector(".btn-editar-post-mural").addEventListener("click", () => {
      campoRecadoSala.value = recado.texto;
      campoRecadoSala.focus();
      botaoPublicarRecado.setAttribute("data-indice-edicao", idx);
      botaoPublicarRecado.textContent = "Salvar Mudanças";
    });

    cartao.querySelector(".btn-excluir-post-mural").addEventListener("click", () => {
      lista.splice(idx, 1);
      renderizarRecados();
    });

    feedRecadosSala.appendChild(cartao);
  });
}
