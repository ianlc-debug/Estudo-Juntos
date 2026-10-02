// perfil.js
// Preenche a tela "Meu Perfil" e gere as ações da conta com modais flutuantes e ícones SVG modernos para a senha.

import { estado } from "./estado.js";

const botaoNavPerfil = document.getElementById("nav-btn-perfil");
const botaoExcluirConta = document.getElementById("btn-excluir-conta");
const botaoEditarPerfil = document.getElementById("btn-editar-perfil");
const botaoAlterarSenha = document.getElementById("btn-alterar-senha");

function renderizarPerfil() {
  const totalDeGrupos = Object.keys(estado.bancoDeGrupos || {}).length;

  const nomePerfil = document.getElementById("nome-perfil");
  const emailPerfil = document.getElementById("email-perfil");
  const avatarPerfil = document.getElementById("avatar-perfil");
  const perfilGruposParticipando = document.getElementById("perfil-grupos-participando");
  const perfilGruposCriados = document.getElementById("perfil-grupos-criados");

  if (nomePerfil) {
    nomePerfil.textContent = estado.usuarioAtual ? estado.usuarioAtual.toUpperCase() : "";
  }
  if (emailPerfil) {
    emailPerfil.textContent = estado.usuarioAtualEmail || "Definido no sistema";
  }
  if (avatarPerfil) {
    avatarPerfil.textContent = estado.usuarioAtual ? estado.usuarioAtual.charAt(0).toUpperCase() : "";
  }
  if (perfilGruposParticipando) {
    perfilGruposParticipando.textContent = totalDeGrupos;
  }
  if (perfilGruposCriados) {
    perfilGruposCriados.textContent = totalDeGrupos;
  }
}

// Ícones SVG modernos para olho aberto e olho cortado (fechado)
const iconeOlhoAberto = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoCortado = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// Função auxiliar para criar e exibir um modal flutuante com suporte a alternar visibilidade de senha
function abrirModalDinamico(titulo, campos, aoConcluir) {
  document.getElementById("modal-dinamico-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "modal-dinamico-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); display: flex;
    justify-content: center; align-items: center; z-index: 1000;
  `;

  const cartao = document.createElement("div");
  cartao.style.cssText = `
    background: white; padding: 30px; border-radius: 12px;
    width: 100%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    position: relative; display: flex; flex-direction: column; gap: 20px;
  `;

  let htmlCampos = campos.map(c => {
    const ehSenha = c.tipo === 'password';
    return `
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <label style="font-size: 13px; font-weight: 600; color: #444;">${c.label}</label>
        <div style="position: relative; display: flex; align-items: center;">
          <input type="${c.tipo || 'text'}" id="${c.id}" value="${c.valor || ''}" placeholder="${c.placeholder || ''}" 
            style="width: 100%; padding: 12px; ${ehSenha ? 'padding-right: 45px;' : ''} border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;" />
          ${ehSenha ? `
            <button type="button" id="toggle-${c.id}" style="position: absolute; right: 12px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; padding: 0;" title="Mostrar/Ocultar senha">
              ${iconeOlhoAberto}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  cartao.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 20px; color: #111; font-weight: bold;">${titulo}</h3>
      <button id="fechar-modal-custom" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">&times;</button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 15px;">
      ${htmlCampos}
      <button id="concluir-modal-custom" style="background-color: #2b70f6; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px;">CONCLUIR</button>
    </div>
  `;

  overlay.appendChild(cartao);
  document.body.appendChild(overlay);

  // Ativar funcionalidade dos botões de alternância com os ícones SVG modernos
  campos.forEach(c => {
    if (c.tipo === 'password') {
      const btnToggle = document.getElementById(`toggle-${c.id}`);
      const inputEl = document.getElementById(c.id);
      btnToggle?.addEventListener("click", () => {
        if (inputEl.type === "password") {
          inputEl.type = "text";
          btnToggle.innerHTML = iconeOlhoCortado; // Mostra o olho cortado quando a senha está visível
        } else {
          inputEl.type = "password";
          btnToggle.innerHTML = iconeOlhoAberto; // Mostra o olho normal quando a senha está oculta
        }
      });
    }
  });

  const fechar = () => overlay.remove();
  document.getElementById("fechar-modal-custom").onclick = fechar;
  overlay.onclick = (e) => { if (e.target === overlay) fechar(); };

  document.getElementById("concluir-modal-custom").onclick = () => {
    const valores = campos.reduce((acc, c) => {
      acc[c.id] = document.getElementById(c.id).value.trim();
      return acc;
    }, {});
    aoConcluir(valores, fechar);
  };
}

export function inicializarPerfil() {
  botaoNavPerfil?.addEventListener("click", (e) => {
    e.preventDefault();
    renderizarPerfil();
  });

  // 1. Botão Editar Perfil com Cartão Flutuante
  botaoEditarPerfil?.addEventListener("click", () => {
    abrirModalDinamico(
      "Editar Perfil",
      [
        { id: "input-novo-nome", label: "Nome de Usuário", valor: estado.usuarioAtual || "", placeholder: "Digite o novo nome" },
        { id: "input-novo-email", label: "E-mail", valor: estado.usuarioAtualEmail || "", placeholder: "Digite o novo e-mail" }
      ],
      async (valores, fecharModal) => {
        const novoNome = valores["input-novo-nome"].trim();
        const novoEmail = valores["input-novo-email"].trim();

        // Validação estrita: impede campos vazios
        if (!novoNome || !novoEmail) {
          alert("O nome de usuário e o e-mail não podem ficar vazios.");
          return;
        }

        // Validação estrita do nome: apenas letras e espaços
        const regexNome = /^[a-zA-ZÀ-ÿ\s]+$/;
        if (!regexNome.test(novoNome)) {
          alert("O nome de usuário deve conter apenas letras e espaços (sem números, símbolos ou caracteres especiais).");
          return;
        }

        // Validação estrita da estrutura do e-mail
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(novoEmail)) {
          alert("Por favor, insira um endereço de e-mail válido (ex: exemplo@dominio.com).");
          return;
        }

        try {
          const resposta = await fetch(`http://localhost:3000/api/usuarios/${estado.usuarioAtual}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ novoNome, novoEmail }),
          });

          const dados = await resposta.json();

          if (resposta.ok) {
            alert("Sucesso: " + dados.mensagem);
            estado.usuarioAtual = novoNome;
            estado.usuarioAtualEmail = novoEmail;
            
            const textoBoasVindas = document.getElementById("boas-vindas-usuario");
            if (textoBoasVindas) {
              textoBoasVindas.textContent = `OLÁ, ${estado.usuarioAtual.toUpperCase()}`;
            }
            
            renderizarPerfil();
            fecharModal();
          } else {
            alert("Erro ao atualizar: " + dados.erro);
          }
        } catch (erro) {
          console.error("Erro de conexão:", erro);
          alert("Não foi possível ligar ao servidor.");
        }
      }
    );
  });

  // 2. Botão Alterar Senha com Cartão Flutuante e ícones modernos de senha
  botaoAlterarSenha?.addEventListener("click", () => {
    abrirModalDinamico(
      "Alterar Senha",
      [
        { id: "input-senha-atual", label: "Senha Atual", tipo: "password", placeholder: "Digite sua senha atual" },
        { id: "input-nova-senha", label: "Nova Senha (Mínimo 6 caracteres)", tipo: "password", placeholder: "Digite a nova senha" }
      ],
      async (valores, fecharModal) => {
        const senhaAtual = valores["input-senha-atual"];
        const novaSenha = valores["input-nova-senha"];

        if (!senhaAtual || !novaSenha) {
          alert("Preencha todos os campos.");
          return;
        }

        try {
          const resposta = await fetch(`http://localhost:3000/api/usuarios/senha/${estado.usuarioAtual}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senhaAtual, novaSenha }),
          });

          const dados = await resposta.json();

          if (resposta.ok) {
            alert("Sucesso: " + dados.mensagem);
            fecharModal();
          } else {
            alert("Erro ao alterar senha: " + dados.erro);
          }
        } catch (erro) {
          console.error("Erro de conexão:", erro);
          alert("Não foi possível ligar ao servidor.");
        }
      }
    );
  });

  // 3. Lógica de Excluir Conta
  botaoExcluirConta?.addEventListener("click", async () => {
    const confirmar = confirm("Tem certeza absoluta que deseja excluir a sua conta? Esta ação não pode ser desfeita.");
    if (!confirmar) return;

    try {
      const identificador = estado.usuarioAtual;
      if (!identificador) {
        alert("Erro: Nenhum utilizador ativo encontrado.");
        return;
      }

      const resposta = await fetch(`http://localhost:3000/api/usuarios/${identificador}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const dados = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        alert("Conta excluída com sucesso.");
        estado.usuarioAtual = null;

        document.getElementById("tela-painel")?.classList.add("escondido");
        document.getElementById("tela-login")?.classList.remove("escondido");
      } else {
        alert("Erro ao excluir conta: " + (dados.erro || "O servidor recusou o pedido."));
      }
    } catch (erro) {
      console.error("Erro de conexão com o servidor:", erro);
      alert("Não foi possível ligar ao servidor para excluir a conta.");
    }
  });
}