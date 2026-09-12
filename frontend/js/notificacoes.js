// notificacoes.js
// Modal de notificações (ícone de sino no topo).

const botaoSinoNotificacoes = document.getElementById("btn-sino-notificacoes");
const modalNotificacoes = document.getElementById("modal-notificacoes");
const botaoFecharNotificacoes = document.getElementById("btn-fechar-notificacoes");

export function inicializarNotificacoes() {
  if (!modalNotificacoes) return;

  botaoSinoNotificacoes?.addEventListener("click", () => {
    modalNotificacoes.classList.remove("escondido");
  });

  botaoFecharNotificacoes?.addEventListener("click", () => {
    modalNotificacoes.classList.add("escondido");
  });

  modalNotificacoes.addEventListener("click", (e) => {
    if (e.target === modalNotificacoes) {
      modalNotificacoes.classList.add("escondido");
    }
  });
}
