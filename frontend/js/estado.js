// estado.js
// Estado da aplicação, compartilhado entre os módulos.

export const estado = {
  usuarioAtual: "ALUNO(A)",
  usuarioAtualEmail: "", // Adicionado para rastrear o e-mail corretamente
  bancoDeGrupos: {},
  bancoDeEventos: [],
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