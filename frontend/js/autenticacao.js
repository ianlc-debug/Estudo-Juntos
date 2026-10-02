// autenticacao.js
// Telas de login, cadastro, recuperação de senha, logout, reset de estado de sessão e alternância moderna de visibilidade de senha.

import { estado } from "./estado.js";
import { mostrarView } from "./navegacao.js";

const telaLogin = document.getElementById("tela-login");
const telaCadastro = document.getElementById("tela-cadastro");
const telaRecuperarSenha = document.getElementById("tela-recuperar-senha");
const telaPainel = document.getElementById("tela-painel");

const formularioLogin = document.getElementById("formulario-login");
const campoUsuario = document.getElementById("campo-usuario");
const campoSenhaLogin = document.getElementById("senha-login");

const textoBoasVindas = document.getElementById("boas-vindas-usuario");
const botaoSair = document.getElementById("btn-sair");
const fotoPerfil = document.querySelector(".foto-perfil");

// Referências para o formulário e campos de registo
const formularioRegisto = document.getElementById("formulario-cadastro");
const campoRegistoUsuario = document.getElementById("registo-usuario");
const campoRegistoEmail = document.getElementById("registo-email");
const campoRegistoSenha = document.getElementById("registo-senha");

// Referências para a recuperação de senha
const formularioRecuperar = document.getElementById("formulario-recuperar");
const campoRecuperarEmail = document.getElementById("recuperar-email");
const campoRecuperarSenha = document.getElementById("recuperar-nova-senha");

// Ícones SVG modernos para olho aberto e olho cortado
const iconeOlhoAberto = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoCortado = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// Função para transformar dinamicamente inputs de senha adicionando o botão do olhinho
function ativarAlternanciaSenha(inputElement) {
  if (!inputElement || inputElement.dataset.possuiOlho) return;
  inputElement.dataset.possuiOlho = "true";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position: relative; display: flex; align-items: center; width: 100%;";
  inputElement.parentNode.insertBefore(wrapper, inputElement);
  wrapper.appendChild(inputElement);

  inputElement.style.paddingRight = "45px";

  const btnToggle = document.createElement("button");
  btnToggle.type = "button";
  btnToggle.innerHTML = iconeOlhoAberto;
  btnToggle.style.cssText = "position: absolute; right: 12px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; padding: 0;";
  btnToggle.title = "Mostrar/Ocultar senha";

  btnToggle.addEventListener("click", () => {
    if (inputElement.type === "password") {
      inputElement.type = "text";
      btnToggle.innerHTML = iconeOlhoCortado;
    } else {
      inputElement.type = "password";
      btnToggle.innerHTML = iconeOlhoAberto;
    }
  });

  wrapper.appendChild(btnToggle);
}

export function inicializarAutenticacao(aoLogarComSucesso) {
  ativarAlternanciaSenha(campoSenhaLogin);
  ativarAlternanciaSenha(campoRegistoSenha);
  ativarAlternanciaSenha(campoRecuperarSenha);

  // Navegação: Ir para o cadastro
  document.getElementById("link-cadastro")?.addEventListener("click", (e) => {
    e.preventDefault();
    telaLogin.classList.add("escondido");
    telaCadastro.classList.remove("escondido");
  });

  // Navegação: Ir para recuperação de senha
  document.getElementById("link-esqueci-senha")?.addEventListener("click", (e) => {
    e.preventDefault();
    telaLogin.classList.add("escondido");
    telaRecuperarSenha.classList.remove("escondido");
  });

  // Navegação: Voltar para o login
  document.querySelectorAll(".voltar-login").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      telaCadastro.classList.add("escondido");
      telaRecuperarSenha.classList.add("escondido");
      telaLogin.classList.remove("escondido");
    });
  });

  // Lógica de Registo integrada com o Back-end
  formularioRegisto?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome_usuario = campoRegistoUsuario.value.trim();
    const email = campoRegistoEmail.value.trim();
    const senha = campoRegistoSenha.value;

    // Validação estrita do nome: apenas letras (com acentos) e espaços
    const regexNome = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nome_usuario || !regexNome.test(nome_usuario)) {
      alert("O nome de usuário deve conter apenas letras e espaços (sem números, símbolos ou caracteres especiais).");
      return;
    }

    try {
      const resposta = await fetch("http://localhost:3000/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_usuario, email, senha }),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert("Sucesso: " + dados.mensagem);
        formularioRegisto.reset();
        
        telaCadastro.classList.add("escondido");
        telaLogin.classList.remove("escondido");
      } else {
        alert("Erro no registo: " + dados.erro);
      }
    } catch (erro) {
      console.error("Erro de conexão com o servidor:", erro);
      alert("Não foi possível ligar ao servidor. Verifique se o back-end está ativo.");
    }
  });

  // Lógica de Login integrada com o Back-end
  formularioLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const identificador = campoUsuario?.value.trim();
    const senha = campoSenhaLogin?.value;

    if (!identificador || !senha) {
      alert("Por favor, preencha o usuário/e-mail e a senha.");
      return;
    }

    try {
      const resposta = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identificador, senha }),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        estado.usuarioAtual = dados.usuario.nome_usuario;
        estado.usuarioAtualEmail = dados.usuario.email;

        if (textoBoasVindas) {
          textoBoasVindas.textContent = `OLÁ, ${estado.usuarioAtual.toUpperCase()}`;
        }
        if (fotoPerfil) {
          fotoPerfil.textContent = estado.usuarioAtual.charAt(0).toUpperCase();
        }

        // Força a abertura direta na aba de Início utilizando a navegação oficial[cite: 6]
        mostrarView("inicio", "inicio");

        telaLogin.classList.add("escondido");
        telaPainel.classList.remove("escondido");
        formularioLogin.reset();

        aoLogarComSucesso?.();
      } else {
        alert("Erro no login: " + dados.erro);
      }
    } catch (erro) {
      console.error("Erro de conexão com o servidor:", erro);
      alert("Não foi possível ligar ao servidor. Verifique se o back-end está ativo.");
    }
  });

  // Lógica de Recuperação de Senha
  formularioRecuperar?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = campoRecuperarEmail.value.trim();
    const novaSenha = campoRecuperarSenha.value;

    try {
      const resposta = await fetch("http://localhost:3000/api/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, novaSenha }),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert("Sucesso: " + dados.mensagem);
        formularioRecuperar.reset();

        telaRecuperarSenha.classList.add("escondido");
        telaLogin.classList.remove("escondido");
      } else {
        alert("Erro: " + dados.erro);
      }
    } catch (erro) {
      console.error("Erro de conexão com o servidor:", erro);
      alert("Não foi possível ligar ao servidor.");
    }
  });

  // Lógica de Logout rigorosa para limpar sessões anteriores e histórico
  botaoSair?.addEventListener("click", (e) => {
    e.preventDefault();

    estado.usuarioAtual = "ALUNO(A)";
    estado.usuarioAtualEmail = "";

    localStorage.clear();
    sessionStorage.clear();

    // Limpa o hash da URL para evitar reter a última aba aberta no próximo login[cite: 6]
    history.replaceState(null, "", window.location.pathname);

    formularioLogin?.reset();
    telaPainel.classList.add("escondido");
    telaLogin.classList.remove("escondido");
  });
}