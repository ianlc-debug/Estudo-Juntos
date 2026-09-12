// inicio.js
// Blocos da tela "Início" que agregam dados de todos os grupos:
// sessões de estudo agendadas e tarefas pendentes (barra lateral direita).

import { estado } from "./estado.js";
import { abrirSalaDeAula } from "./sala-de-aula.js";

const containerTarefasGlobais = document.getElementById("container-tarefas-globais");

/** Lista as próximas sessões de estudo (horários fixos de todos os grupos). */
export function renderizarHorariosInicio() {
  const containerSessoes = document.querySelector(
    "#view-inicio .secao-painel:last-of-type",
  );
  if (!containerSessoes) return;

  const cabecalho = containerSessoes.querySelector(".cabecalho-secao");
  containerSessoes.innerHTML = "";
  containerSessoes.appendChild(cabecalho);

  let temHorarios = false;
  const containerLista = document.createElement("div");
  containerLista.style.display = "flex";
  containerLista.style.flexDirection = "column";
  containerLista.style.gap = "10px";
  containerLista.style.marginTop = "15px";

  Object.keys(estado.bancoDeGrupos).forEach((chave) => {
    const grupo = estado.bancoDeGrupos[chave];
    if (grupo.horarios && grupo.horarios.length > 0) {
      temHorarios = true;
      grupo.horarios.forEach((horario) => {
        const itemSessao = document.createElement("div");
        itemSessao.style.background = "#ffffff";
        itemSessao.style.padding = "14px 18px";
        itemSessao.style.borderRadius = "10px";
        itemSessao.style.border = "1px solid #e2e8f0";
        itemSessao.style.display = "flex";
        itemSessao.style.justifyContent = "space-between";
        itemSessao.style.alignItems = "center";
        itemSessao.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
        itemSessao.style.cursor = "pointer";

        itemSessao.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #eff6ff; color: #2563eb; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-regular fa-clock"></i>
                            </div>
                            <div>
                                <strong style="color: #1e293b; font-size: 0.95rem; display: block; margin-bottom: 2px;">${horario}</strong>
                                <small style="color: #64748b; font-weight: 500;">Grupo: ${grupo.nome} (${grupo.materia})</small>
                            </div>
                        </div>
                        <span style="color: #2563eb; font-weight: 600; font-size: 0.85rem;">Ir para o Grupo →</span>
                    `;

        itemSessao.addEventListener("click", () => {
          abrirSalaDeAula(grupo.id);
        });

        containerLista.appendChild(itemSessao);
      });
    }
  });

  if (!temHorarios) {
    const caixaVazia = document.createElement("div");
    caixaVazia.className = "caixa-estado-vazio";
    caixaVazia.innerHTML = `<p>Você não possui nenhuma sessão de estudo agendada no momento.</p>`;
    containerSessoes.appendChild(caixaVazia);
  } else {
    containerSessoes.appendChild(containerLista);
  }
}

/** Lista, na barra lateral direita, as tarefas pendentes de todos os grupos. */
export function renderizarTarefasGlobais() {
  if (!containerTarefasGlobais) return;
  containerTarefasGlobais.innerHTML = "";

  let totalPendentes = 0;

  Object.keys(estado.bancoDeGrupos).forEach((chave) => {
    const grupo = estado.bancoDeGrupos[chave];
    grupo.tarefas.forEach((tarefa) => {
      if (!tarefa.concluida) {
        totalPendentes++;
        const itemHTML = `
                        <div class="item-tarefa-global">
                            <span>${tarefa.texto}</span>
                            <small><i class="fa-solid fa-graduation-cap"></i> Grupo: ${grupo.nome}</small>
                        </div>
                    `;
        containerTarefasGlobais.insertAdjacentHTML("beforeend", itemHTML);
      }
    });
  });

  if (totalPendentes === 0) {
    containerTarefasGlobais.innerHTML = `
                <div class="tarefas-vazias" style="padding: 5px 0;">
                    <p style="color: #64748b; font-size: 0.9rem;">Nenhuma tarefa pendente</p>
                </div>
            `;
  }
}
