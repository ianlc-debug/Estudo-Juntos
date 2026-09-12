// mensagens.js
// Tela "Mensagens": adicionar contatos à lista.
// (O recurso de chat em si ainda não existe nesta versão do projeto.)

const botaoAdicionarContato = document.getElementById("btn-adicionar-contato");
const campoNomeContato = document.getElementById("campo-nome-contato");
const listaContatos = document.getElementById("lista-contatos");

export function inicializarMensagens() {
  if (!botaoAdicionarContato) return;

  botaoAdicionarContato.addEventListener("click", () => {
    const nome = campoNomeContato.value.trim();
    if (!nome) return;

    const botaoContato = document.createElement("button");
    botaoContato.className = "btn-contato";
    botaoContato.textContent = nome;
    listaContatos.appendChild(botaoContato);

    campoNomeContato.value = "";
  });
}
