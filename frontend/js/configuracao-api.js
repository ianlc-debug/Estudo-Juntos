// Em desenvolvimento local, a interface usa a API local na porta 3000,
// mesmo que a meta tag ainda contenha o endereço de produção. Em produção,
// usa a URL configurada na meta tag ou a mesma origem da página.
const apiConfigurada = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
const hostApi = window.location.hostname || 'localhost';
const apiDesenvolvimento = `${window.location.protocol}//${hostApi}:3000`;
const apiMesmaOrigem = window.location.origin;
const hostsLocais = ['localhost', '127.0.0.1', '::1'];
const acessoLocal = hostsLocais.includes(hostApi);
const apiEscolhida = acessoLocal
    ? (window.location.port === '3000' ? apiMesmaOrigem : apiDesenvolvimento)
    : (apiConfigurada || apiMesmaOrigem);

window.ESTUDO_API_URL = apiEscolhida.replace(/\/$/, '');
