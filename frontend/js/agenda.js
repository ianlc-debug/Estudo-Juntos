// agenda.js
// Calendário mensal (horários fixos dos grupos + eventos particulares)
// e o modal de detalhes/criação de evento de um dia específico.

import { estado, diasDaSemana } from "./estado.js";
import { mostrarView } from "./navegacao.js";
import { renderizarTarefasGlobais } from "./inicio.js";

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
async function abrirAgendaNoMesAtual() {
  if (!selectMes) return;
  mostrarView("agenda");
  const mesAtual = new Date().getMonth();
  selectMes.value = mesAtual;
  try {
    await Promise.all([carregarEventosParticulares(), carregarPrazosAtividades()]);
  } catch (erro) {
    alert(erro.message || "Não foi possível carregar seus eventos.");
  }
  renderizarCalendario(mesAtual);
}

botaoNavAgenda?.addEventListener("click", () => { void abrirAgendaNoMesAtual(); });
botaoVerAgendaInicio?.addEventListener("click", () => { void abrirAgendaNoMesAtual(); });

selectMes?.addEventListener("change", (e) => {
  renderizarCalendario(parseInt(e.target.value));
});

window.addEventListener("horarios-grupo-atualizados", () => {
  if (selectMes) renderizarCalendario(parseInt(selectMes.value));
});
window.addEventListener("prazos-agenda-atualizados", () => { void atualizarPrazosAgenda(); });
window.addEventListener("eventos-particulares-atualizados", () => {
  void carregarEventosParticulares().then(() => {
    if (selectMes) renderizarCalendario(parseInt(selectMes.value));
    if (modalDetalhesDia && !modalDetalhesDia.classList.contains("escondido")) renderizarEventosDoDia();
  });
});

async function atualizarPrazosAgenda() {
  try { await carregarPrazosAtividades(); }
  catch (erro) { console.error("Erro ao atualizar prazos do calendário:", erro); }
  if (selectMes) renderizarCalendario(parseInt(selectMes.value));
  if (modalDetalhesDia && !modalDetalhesDia.classList.contains("escondido")) renderizarEventosDoDia();
}

async function carregarEventosParticulares() {
  estado.bancoDeEventos = [];
  const resposta = await fetch(window.ESTUDO_API_URL + "/api/eventos-particulares", {
    headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
  });
  const dados = await lerRespostaAgenda(resposta);
  if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar seus eventos.");
  estado.bancoDeEventos = dados.map((evento) => {
    const [ano, mes, dia] = evento.data_evento.split("-").map(Number);
    return { id: evento.id, titulo: evento.titulo, concluida: Boolean(Number(evento.concluida)), dia, mes: mes - 1, ano };
  });
}

async function carregarPrazosAtividades() {
  const resposta = await fetch(`${window.ESTUDO_API_URL}/api/agenda-atividades`, {
    headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
  });
  const atividades = await lerRespostaAgenda(resposta);
  if (!resposta.ok) throw new Error(atividades.erro || "Não foi possível carregar os prazos.");
  estado.bancoDePrazos = atividades.map((atividade) => {
    const [ano, mes, dia] = atividade.prazo.split("-").map(Number);
    return { ...atividade, dia, mes: mes - 1, ano, concluida: Boolean(Number(atividade.concluida)) };
  });
}

async function lerRespostaAgenda(resposta) {
  const texto = await resposta.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error(texto.trimStart().startsWith("<")
      ? `A API respondeu HTML em vez de JSON (HTTP ${resposta.status}).`
      : `Resposta inválida da API (HTTP ${resposta.status}).`);
  }
}

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
          if (horario.dia === nomeDiaDaSemana) {
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

    estado.bancoDePrazos.forEach((atividade) => {
      if (atividade.dia === dia && atividade.mes === indiceMes && atividade.ano === anoAtual) {
        const selo = document.createElement("div");
        const vencida = atividade.prazo < new Date().toISOString().slice(0, 10);
        selo.style.cssText = `background:${atividade.concluida ? "#10b981" : vencida ? "#ef4444" : "#f59e0b"}; color:white; font-size:.7rem; padding:2px 4px; border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; pointer-events:none;`;
        selo.textContent = `📚 ${atividade.texto || "Atividade"}`;
        celulaDia.appendChild(selo);
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
        if (horario.dia === nomeDiaDaSemana) {
          todosOsEventosDoDia.push({
            tipo: "grupo",
            titulo: `Aula/Reunião do grupo: ${grupo.nome}`,
            descricao: `${horario.dia}, ${horario.inicio} - ${horario.fim}${horario.descricao ? ` • ${horario.descricao}` : ""}`,
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

  estado.bancoDePrazos.forEach((atividade) => {
    if (atividade.dia === dia && atividade.mes === mes && atividade.ano === ano) {
      todosOsEventosDoDia.push({ tipo: "atividade", titulo: atividade.texto || "Atividade do grupo", descricao: `Grupo: ${atividade.grupo_nome}`, objetoOriginal: atividade });
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
    } else if (evento.tipo === "atividade") {
      itemEvento.style.borderLeft = "4px solid #f59e0b";
      const bloco = document.createElement("div");
      const titulo = document.createElement("strong");
      titulo.textContent = `📚 ${evento.titulo}`;
      const descricao = document.createElement("small");
      descricao.textContent = `${evento.descricao} • Prazo ${evento.objetoOriginal.prazo.split("-").reverse().join("/")}`;
      descricao.style.cssText = "display:block; color:#64748b;";
      bloco.append(titulo, descricao);
      itemEvento.appendChild(bloco);
      if (evento.objetoOriginal.prazo < new Date().toISOString().slice(0, 10)) {
        const ocultar = document.createElement("button");
        ocultar.type = "button";
        ocultar.className = "btn-excluir";
        ocultar.textContent = "Ocultar da agenda";
        ocultar.style.cssText = "flex:0 0 auto; background:#64748b; color:white; border:0; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:.75rem;";
        ocultar.addEventListener("click", () => { void ocultarPrazoDaAgenda(evento.objetoOriginal, ocultar); });
        itemEvento.appendChild(ocultar);
      }
    } else {
      itemEvento.style.borderLeft = "4px solid #10b981";
      const titulo = document.createElement("span");
      titulo.textContent = `⭐ ${evento.titulo}`;
      titulo.style.cssText = "font-size: 0.9rem; color: #334155; overflow-wrap: anywhere;";
      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.className = "btn-excluir";
      botaoExcluir.textContent = "Excluir";
      botaoExcluir.style.cssText = "flex: 0 0 auto; background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;";
      botaoExcluir.addEventListener("click", () => { void excluirEventoParticular(evento.objetoOriginal, botaoExcluir); });
      const acoes = document.createElement("div");
      acoes.style.cssText = "display:flex; align-items:center; gap:6px;";
      const concluir = document.createElement("input");
      concluir.type = "checkbox";
      concluir.checked = evento.objetoOriginal.concluida;
      concluir.title = "Marcar evento como concluído";
      concluir.addEventListener("change", () => { void marcarEventoConcluido(evento.objetoOriginal, concluir); });
      acoes.append(concluir, botaoExcluir);
      itemEvento.append(titulo, acoes);
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

formularioModalDia?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titulo = campoModalDia.value.trim();
  if (!titulo) return;

  const { dia, mes, ano } = estado.dataSelecionada;
  const botaoEnviar = formularioModalDia.querySelector('button[type="submit"]');
  if (botaoEnviar) botaoEnviar.disabled = true;
  try {
    const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const resposta = await fetch(window.ESTUDO_API_URL + "/api/eventos-particulares", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
      body: JSON.stringify({ titulo, data }),
    });
    const resultado = await lerRespostaAgenda(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar o evento.");
    estado.bancoDeEventos.push({ id: resultado.id, titulo: resultado.titulo, dia, mes, ano });
    campoModalDia.value = "";
    renderizarEventosDoDia();
    renderizarCalendario(mes);
    renderizarTarefasGlobais();
  } catch (erro) {
    alert(erro.message || "Não foi possível salvar o evento.");
  } finally {
    if (botaoEnviar) botaoEnviar.disabled = false;
  }
});

async function excluirEventoParticular(evento, botao) {
  if (!confirm(`Remover o evento “${evento.titulo}”?`)) return;
  botao.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/eventos-particulares/${encodeURIComponent(evento.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${estado.tokenSessao || ""}` },
    });
    const resultado = await lerRespostaAgenda(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível remover o evento.");
    estado.bancoDeEventos = estado.bancoDeEventos.filter((item) => String(item.id) !== String(evento.id));
    renderizarEventosDoDia();
    renderizarCalendario(estado.dataSelecionada.mes);
    renderizarTarefasGlobais();
  } catch (erro) {
    alert(erro.message || "Não foi possível remover o evento.");
    botao.disabled = false;
  }
}

async function marcarEventoConcluido(evento, controle) {
  controle.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/eventos-particulares/${evento.id}/concluida`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
      body: JSON.stringify({ concluida: controle.checked }),
    });
    const resultado = await lerRespostaAgenda(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível atualizar o evento.");
    evento.concluida = controle.checked;
    renderizarEventosDoDia();
    renderizarCalendario(estado.dataSelecionada.mes);
    renderizarTarefasGlobais();
  } catch (erro) {
    controle.checked = !controle.checked;
    alert(erro.message || "Não foi possível atualizar o evento.");
  } finally { controle.disabled = false; }
}

async function ocultarPrazoDaAgenda(atividade, botao) {
  botao.disabled = true;
  try {
    const resposta = await fetch(`${window.ESTUDO_API_URL}/api/grupos/${encodeURIComponent(atividade.grupo_id)}/atividades/${atividade.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${estado.tokenSessao || ""}` },
      body: JSON.stringify({ ocultar_calendario: true }),
    });
    const resultado = await lerRespostaAgenda(resposta);
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível ocultar o prazo.");
    estado.bancoDePrazos = estado.bancoDePrazos.filter((item) => String(item.id) !== String(atividade.id));
    renderizarEventosDoDia();
    renderizarCalendario(estado.dataSelecionada.mes);
  } catch (erro) {
    botao.disabled = false;
    alert(erro.message || "Não foi possível ocultar o prazo.");
  }
}
