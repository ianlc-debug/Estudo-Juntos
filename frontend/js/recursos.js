// recursos.js
// Tela "Recursos": lista, por grupo, os materiais compartilhados
// (funcionalidade de upload ainda não implementada — mostra estado vazio).

import { estado } from "./estado.js";

const botaoNavRecursos = document.getElementById("nav-btn-recursos");
const containerRecursos = document.getElementById("container-recursos");

export function renderizarRecursos() {
  containerRecursos.innerHTML = "";

  const grupos = Object.values(estado.bancoDeGrupos);

  if (grupos.length === 0) {
    containerRecursos.innerHTML = `
                <div class="caixa-estado-vazio">
                    <p>Você ainda não participa de nenhum grupo.</p>
                </div>
            `;
    return;
  }

  grupos.forEach((grupo) => {
    containerRecursos.innerHTML += `
                <div class="cartao-grupo-recursos">
                    <h3>${grupo.nome}</h3>
                    <div class="recurso-vazio">
                        <i class="fa-solid fa-folder-open"
                        style="font-size:35px;margin-bottom:10px;color:#94a3b8;"></i>
                        <p>
                            Nenhum material compartilhado neste grupo.
                        </p>
                    </div>
                </div>
            `;
  });
}

export function inicializarRecursos() {
  botaoNavRecursos?.addEventListener("click", (e) => {
    e.preventDefault();
    renderizarRecursos();
  });
}
