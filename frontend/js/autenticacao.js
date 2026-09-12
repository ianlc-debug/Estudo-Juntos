// autenticacao.js
// Telas de login, cadastro, recuperação de senha e logout.

import { estado } from "./estado.js";

const telaLogin = document.getElementById("tela-login");
const telaCadastro = document.getElementById("tela-cadastro");
const telaRecuperarSenha = document.getElementById("tela-recuperar-senha");
const telaPainel = document.getElementById("tela-painel");

const formularioLogin = document.getElementById("formulario-login");
const campoUsuario = document.getElementById("campo-usuario");
const textoBoasVindas = document.getElementById("boas-vindas-usuario");
const botaoSair = document.getElementById("btn-sair");
const fotoPerfil = document.querySelector(".foto-perfil");

/**
 * @param {() => void} aoLogarComSucesso Chamado após o login, para que
 *   outros módulos (agenda de horários, tarefas globais...) atualizem a
 *   tela de Início.
 */
export function inicializarAutenticacao(aoLogarComSucesso) {
  document.getElementById("link-cadastro")?.addEventListener("click", (e) => {
    e.preventDefault();
    telaLogin.classList.add("escondido");
    telaCadastro.classList.remove("escondido");
  });

  document.getElementById("link-esqueci-senha")?.addEventListener("click", (e) => {
    e.preventDefault();
    telaLogin.classList.add("escondido");
    telaRecuperarSenha.classList.remove("escondido");
  });

  document.querySelectorAll(".voltar-login").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      telaCadastro.classList.add("escondido");
      telaRecuperarSenha.classList.add("escondido");
      telaLogin.classList.remove("escondido");
    });
  });

  formularioLogin?.addEventListener("submit", (e) => {
    e.preventDefault();
    estado.usuarioAtual = campoUsuario.value.trim() || "ALUNO(A)";

    if (textoBoasVindas) {
      textoBoasVindas.textContent = `OLÁ, ${estado.usuarioAtual.toUpperCase()}`;
    }
    if (fotoPerfil) {
      fotoPerfil.textContent = estado.usuarioAtual.charAt(0).toUpperCase();
    }

    telaLogin.classList.add("escondido");
    telaPainel.classList.remove("escondido");

    aoLogarComSucesso?.();
  });

  botaoSair?.addEventListener("click", (e) => {
    e.preventDefault();
    telaPainel.classList.add("escondido");
    telaLogin.classList.remove("escondido");
    formularioLogin?.reset();
  });
}
