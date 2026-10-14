export function normalizarNomeUsuario(valor) {
  return Array.from(String(valor || "").normalize("NFC").toLocaleUpperCase("pt-BR").normalize("NFC"))
    .filter((caractere) => caractere === " " || /\p{Lu}/u.test(caractere))
    .join("");
}

function ativarTransformacao(campo, transformar) {
  if (!campo || campo.dataset.nomeMaiusculoAtivo === "true") return;
  campo.dataset.nomeMaiusculoAtivo = "true";
  campo.autocapitalize = "characters";

  campo.addEventListener("input", () => {
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    const valorOriginal = campo.value;
    const valor = transformar(valorOriginal);
    if (campo.value === valor) return;

    const novoInicio = inicio === null ? null : transformar(valorOriginal.slice(0, inicio)).length;
    const novoFim = fim === null ? null : transformar(valorOriginal.slice(0, fim)).length;
    campo.value = valor;
    if (novoInicio !== null && novoFim !== null) campo.setSelectionRange(novoInicio, novoFim);
  });
}

export function ativarNomeMaiusculo(campo) {
  ativarTransformacao(campo, normalizarNomeUsuario);
}

export function ativarMaiusculas(campo) {
  ativarTransformacao(campo, (valor) => String(valor || "").toLocaleUpperCase("pt-BR"));
}
