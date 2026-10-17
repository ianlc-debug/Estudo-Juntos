// estado.js
// Estado da aplicação, compartilhado entre os módulos.

function lerSessaoSalva() {
  try {
    return JSON.parse(sessionStorage.getItem("estudoJuntosSessao") || "null") || {};
  } catch {
    return {};
  }
}

const sessaoSalva = lerSessaoSalva();

export const estado = {
  usuarioAtual: sessaoSalva.usuarioAtual || "ALUNO(A)",
  usuarioAtualEmail: sessaoSalva.usuarioAtualEmail || "",
  usuarioAtualId: sessaoSalva.usuarioAtualId || null,
  usuarioAtualIdPublico: sessaoSalva.usuarioAtualIdPublico || null,
  tokenSessao: sessaoSalva.tokenSessao || null,
  bancoDeGrupos: {},
  bancoDeEventos: [],
  bancoDePrazos: [],
  idGrupoEmEdicao: null,
  dataSelecionada: { dia: null, mes: null, ano: null },
  totalGruposCriados: 0,
};

export const coresCartao = ["#e3f6e6", "#fde3ed", "#fce9b7", "#e3f1fd"];

export const diasDaSemana = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
