// inicio.js
// Blocos da tela "Início" que agregam dados de todos os grupos:
// sessões de estudo agendadas e tarefas pendentes (barra lateral direita).

import { estado, diasDaSemana } from "./estado.js";
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

  const containerLista = document.createElement("div");
  containerLista.style.display = "flex";
  containerLista.style.flexDirection = "column";
  containerLista.style.gap = "10px";
  containerLista.style.marginTop = "15px";

  const agora = new Date();
  const sessoes = [];
  Object.keys(estado.bancoDeGrupos).forEach((chave) => {
    const grupo = estado.bancoDeGrupos[chave];
    if (grupo.horarios && grupo.horarios.length > 0) {
      grupo.horarios.forEach((horario) => {
        const diaAlvo = diasDaSemana.indexOf(horario.dia);
        if (diaAlvo < 0) return;
        let diasAte = (diaAlvo - agora.getDay() + 7) % 7;
        if (diasAte === 0 && horario.inicio <= `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`) diasAte = 7;
        const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + diasAte);
        sessoes.push({ grupo, horario, data });
      });
    }
  });

  sessoes.sort((a, b) => a.data - b.data || a.horario.inicio.localeCompare(b.horario.inicio));
  sessoes.forEach(({ grupo, horario, data }) => {
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

        const informacao = document.createElement("div");
        informacao.style.cssText = "display: flex; align-items: center; gap: 12px;";
        const icone = document.createElement("div");
        icone.style.cssText = "background: #eff6ff; color: #2563eb; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;";
        icone.innerHTML = '<i class="fa-regular fa-clock"></i>';
        const texto = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.style.cssText = "color: #1e293b; font-size: 0.95rem; display: block; margin-bottom: 2px;";
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const diferenca = Math.round((data - hoje) / 86400000);
        const dataLegivel = diferenca === 0 ? "Hoje" : diferenca === 1 ? "Amanhã" : data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
        titulo.textContent = `${dataLegivel} • ${horario.dia}, ${horario.inicio} - ${horario.fim}`;
        const legenda = document.createElement("small");
        legenda.style.cssText = "color: #64748b; font-weight: 500;";
        legenda.textContent = `Grupo: ${grupo.nome} (${grupo.materia})`;
        texto.append(titulo, legenda);
        informacao.append(icone, texto);
        const acao = document.createElement("span");
        acao.style.cssText = "color: #2563eb; font-weight: 600; font-size: 0.85rem;";
        acao.textContent = "Ir para o Grupo →";
        itemSessao.append(informacao, acao);

        itemSessao.addEventListener("click", () => {
          abrirSalaDeAula(grupo.id);
        });

        containerLista.appendChild(itemSessao);
  });

  if (sessoes.length === 0) {
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
