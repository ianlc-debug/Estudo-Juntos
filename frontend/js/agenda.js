// agenda.js
// Calendário mensal (horários fixos dos grupos + eventos particulares)
// e o modal de detalhes/criação de evento de um dia específico.

import { estado, diasDaSemana } from "./estado.js";
import { mostrarView } from "./navegacao.js";

const botaoNavAgenda = document.getElementById("nav-btn-agenda");
const selectMes = document.getElementById("select-mes-agenda");
const gradeDias = document.getElementById("grade-dias-calendario");
const botaoVerAgendaInicio = document.getElementById("btn-ver-agenda-inicio");

const modalDetalhesDia = document.getElementById("modal-detalhes-dia");
const botaoFecharModalDia = document.getElementById("btn-fechar-modal-dia");
const tituloModalDia = document.getElementById("titulo-modal-dia");
const listaEventosModalDia = document.getElementById("lista-eventos-modal-dia");
const formularioModalDia = document.getElementById("formulario-modal-dia");
const campoModalDia = document.getElementById("campo-modal-dia");

/** Abre a Agenda já no mês atual e renderiza o calendário. */
function abrirAgendaNoMesAtual() {
  if (!selectMes) return;
  mostrarView("agenda");
  const mesAtual = new Date().getMonth();
  selectMes.value = mesAtual;
  renderizarCalendario(mesAtual);
}

botaoNavAgenda?.addEventListener("click", () => abrirAgendaNoMesAtual());
botaoVerAgendaInicio?.addEventListener("click", () => abrirAgendaNoMesAtual());

selectMes?.addEventListener("change", (e) => {
  renderizarCalendario(parseInt(e.target.value));
});

export function renderizarCalendario(indiceMes) {
  if (!gradeDias) return;
  gradeDias.innerHTML = "";

  const anoAtual = new Date().getFullYear();
  const totalDias = new Date(anoAtual, indiceMes + 1, 0).getDate();
  const indicePrimeiroDia = new Date(anoAtual, indiceMes, 1).getDay();

  for (let i = 0; i < indicePrimeiroDia; i++) {
    const celulaVazia = document.createElement("div");
    celulaVazia.style.padding = "10px";
    celulaVazia.style.minHeight = "80px";
    celulaVazia.style.background = "transparent";
    gradeDias.appendChild(celulaVazia);
  }

  const hoje = new Date();
  const ehMesAtual = hoje.getMonth() === indiceMes && hoje.getFullYear() === anoAtual;
  const diaDeHoje = hoje.getDate();

  for (let dia = 1; dia <= totalDias; dia++) {
    const celulaDia = document.createElement("div");

    celulaDia.style.padding = "8px";
    celulaDia.style.minHeight = "85px";
    celulaDia.style.background = "#f8fafc";
    celulaDia.style.border = "1px solid #e2e8f0";
    celulaDia.style.borderRadius = "8px";
    celulaDia.style.cursor = "pointer";
    celulaDia.style.display = "flex";
    celulaDia.style.flexDirection = "column";
    celulaDia.style.gap = "4px";

    const numeroDiaSpan = document.createElement("span");
    numeroDiaSpan.textContent = dia;
    numeroDiaSpan.style.pointerEvents = "none";
    numeroDiaSpan.style.fontWeight = "bold";
    numeroDiaSpan.style.color = "#64748b";
    numeroDiaSpan.style.fontSize = "0.9rem";
    celulaDia.appendChild(numeroDiaSpan);

    if (ehMesAtual && dia === diaDeHoje) {
      celulaDia.style.background = "#eff6ff";
      celulaDia.style.borderColor = "#bfdbfe";
      numeroDiaSpan.style.color = "#2563eb";
    }

    const dataEspecifica = new Date(anoAtual, indiceMes, dia);
    const nomeDiaDaSemana = diasDaSemana[dataEspecifica.getDay()];

    Object.values(estado.bancoDeGrupos).forEach((grupo) => {
      if (grupo.horarios && grupo.horarios.length > 0) {
        grupo.horarios.forEach((horario) => {
          if (horario.includes(nomeDiaDaSemana)) {
            const seloAzul = document.createElement("div");
            seloAzul.style.background = "#2563eb";
            seloAzul.style.color = "white";
            seloAzul.style.fontSize = "0.7rem";
            seloAzul.style.padding = "2px 4px";
            seloAzul.style.borderRadius = "4px";
            seloAzul.style.fontWeight = "bold";
            seloAzul.style.overflow = "hidden";
            seloAzul.style.textOverflow = "ellipsis";
            seloAzul.style.whiteSpace = "nowrap";
            seloAzul.style.pointerEvents = "none";
            seloAzul.textContent = grupo.nome;

            celulaDia.appendChild(seloAzul);
            celulaDia.style.background = "#eff6ff";
            celulaDia.style.borderColor = "#bfdbfe";
          }
        });
      }
    });

    estado.bancoDeEventos.forEach((evento) => {
      if (evento.dia === dia && evento.mes === indiceMes && evento.ano === anoAtual) {
        const seloVerde = document.createElement("div");
        seloVerde.style.background = "#10b981";
        seloVerde.style.color = "white";
        seloVerde.style.fontSize = "0.7rem";
        seloVerde.style.padding = "2px 4px";
        seloVerde.style.borderRadius = "4px";
        seloVerde.style.fontWeight = "bold";
        seloVerde.style.overflow = "hidden";
        seloVerde.style.textOverflow = "ellipsis";
        seloVerde.style.whiteSpace = "nowrap";
        seloVerde.style.pointerEvents = "none";

        const textoTitulo = evento.titulo ? evento.titulo : "Evento";
        seloVerde.textContent = `⭐ ${textoTitulo}`;

        celulaDia.appendChild(seloVerde);
      }
    });

    celulaDia.addEventListener("click", () => {
      abrirModalDetalhesDia(dia, indiceMes, anoAtual);
    });

    gradeDias.appendChild(celulaDia);
  }
}

function abrirModalDetalhesDia(dia, mes, ano) {
  estado.dataSelecionada = { dia, mes, ano };

  const dataFormatada = `${dia.toString().padStart(2, "0")}/${(mes + 1)
    .toString()
    .padStart(2, "0")}/${ano}`;
  if (tituloModalDia) tituloModalDia.textContent = `Eventos do dia ${dataFormatada}`;

  renderizarEventosDoDia();
  if (modalDetalhesDia) modalDetalhesDia.classList.remove("escondido");
}

function renderizarEventosDoDia() {
  if (!listaEventosModalDia) return;
  listaEventosModalDia.innerHTML = "";

  const { dia, mes, ano } = estado.dataSelecionada;

  let todosOsEventosDoDia = [];

  const dataEspecifica = new Date(ano, mes, dia);
  const nomeDiaDaSemana = diasDaSemana[dataEspecifica.getDay()];

  Object.values(estado.bancoDeGrupos).forEach((grupo) => {
    if (grupo.horarios && grupo.horarios.length > 0) {
      grupo.horarios.forEach((horario) => {
        if (horario.includes(nomeDiaDaSemana)) {
          todosOsEventosDoDia.push({
            tipo: "grupo",
            titulo: `Aula/Reunião do grupo: ${grupo.nome}`,
            descricao: horario,
            objetoOriginal: grupo,
          });
        }
      });
    }
  });

  estado.bancoDeEventos.forEach((evento) => {
    if (evento.dia === dia && evento.mes === mes && evento.ano === ano) {
      todosOsEventosDoDia.push({
        tipo: "particular",
        titulo: evento.titulo,
        objetoOriginal: evento,
      });
    }
  });

  if (todosOsEventosDoDia.length === 0) {
    listaEventosModalDia.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem; text-align: center; margin-top: 10px;">Nenhum evento para este dia.</p>`;
    return;
  }

  todosOsEventosDoDia.forEach((evento) => {
    const itemEvento = document.createElement("div");
    itemEvento.style.display = "flex";
    itemEvento.style.justifyContent = "space-between";
    itemEvento.style.alignItems = "center";
    itemEvento.style.background = "#f8fafc";
    itemEvento.style.padding = "10px";
    itemEvento.style.border = "1px solid #e2e8f0";
    itemEvento.style.borderRadius = "6px";
    itemEvento.style.marginBottom = "8px";

    if (evento.tipo === "grupo") {
      itemEvento.style.borderLeft = "4px solid #2563eb";
      itemEvento.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.9rem; color: #1e3a8a; font-weight: bold;">👥 ${evento.titulo}</span>
                        <small style="font-size: 0.75rem; color: #64748b;">${evento.descricao}</small>
                    </div>
                    <span style="font-size: 0.7rem; background: #dbeafe; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Fixo</span>
                `;
    } else {
      itemEvento.style.borderLeft = "4px solid #10b981";
      itemEvento.innerHTML = `
                    <span style="font-size: 0.9rem; color: #334155;">⭐ ${evento.titulo}</span>
                    <button class="btn-excluir" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;">Excluir</button>
                `;

      itemEvento.querySelector(".btn-excluir").addEventListener("click", () => {
        const indiceGlobal = estado.bancoDeEventos.indexOf(evento.objetoOriginal);
        if (indiceGlobal > -1) estado.bancoDeEventos.splice(indiceGlobal, 1);

        renderizarEventosDoDia();
        renderizarCalendario(mes);
      });
    }

    listaEventosModalDia.appendChild(itemEvento);
  });
}

botaoFecharModalDia?.addEventListener("click", () => {
  modalDetalhesDia.classList.add("escondido");
});

modalDetalhesDia?.addEventListener("click", (e) => {
  if (e.target === modalDetalhesDia) modalDetalhesDia.classList.add("escondido");
});

formularioModalDia?.addEventListener("submit", (e) => {
  e.preventDefault();

  const titulo = campoModalDia.value.trim();
  if (!titulo) return;

  const { dia, mes, ano } = estado.dataSelecionada;
  estado.bancoDeEventos.push({ titulo, dia, mes, ano });

  campoModalDia.value = "";
  renderizarEventosDoDia();
  renderizarCalendario(mes);
});