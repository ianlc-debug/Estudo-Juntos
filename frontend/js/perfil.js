// perfil.js
// Preenche a tela "Meu Perfil" com os dados do usuário logado.

import { estado } from "./estado.js";

const botaoNavPerfil = document.getElementById("nav-btn-perfil");

function renderizarPerfil() {
  const totalDeGrupos = Object.keys(estado.bancoDeGrupos).length;

  const nomePerfil = document.getElementById("nome-perfil");
  const avatarPerfil = document.getElementById("avatar-perfil");
  const perfilGruposParticipando = document.getElementById("perfil-grupos-participando");
  const perfilGruposCriados = document.getElementById("perfil-grupos-criados");

  if (nomePerfil) nomePerfil.textContent = estado.usuarioAtual.toUpperCase();
  if (avatarPerfil) avatarPerfil.textContent = estado.usuarioAtual.charAt(0).toUpperCase();
  if (perfilGruposParticipando) perfilGruposParticipando.textContent = totalDeGrupos;
  if (perfilGruposCriados) perfilGruposCriados.textContent = totalDeGrupos;
}

export function inicializarPerfil() {
  botaoNavPerfil?.addEventListener("click", (e) => {
    e.preventDefault();
    renderizarPerfil();
  });
}
