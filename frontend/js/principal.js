// principal.js
// Ponto de entrada da aplicação. Cada view/funcionalidade vive no seu
// próprio módulo (autenticacao, navegacao, grupos, sala-de-aula, inicio,
// agenda, recursos, mensagens, perfil, notificacoes); aqui só conectamos
// tudo.
//
// Carregado como <script type="module">, então roda automaticamente
// depois que o HTML terminou de ser parseado (não precisa de
// DOMContentLoaded).

import { inicializarAutenticacao } from "./autenticacao.js";
import { inicializarNavegacao } from "./navegacao.js";
import { renderizarTarefasGlobais, renderizarHorariosInicio } from "./inicio.js";
import { inicializarRecursos } from "./recursos.js";
import { inicializarPerfil } from "./perfil.js";
import { inicializarMensagens } from "./mensagens.js";
import { inicializarNotificacoes } from "./notificacoes.js";

// Módulos que registram seus próprios listeners assim que são importados:
import "./grupos.js";
import "./sala-de-aula.js";
import "./agenda.js";

inicializarNavegacao();
inicializarRecursos();
inicializarPerfil();
inicializarMensagens();
inicializarNotificacoes();

inicializarAutenticacao(() => {
  renderizarTarefasGlobais();
  renderizarHorariosInicio();
});
