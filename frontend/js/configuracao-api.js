// Em produção, o frontend é servido pelo backend na mesma origem (incluindo
// HTTPS e portas atribuídas pelo provedor). Com Live Server, a API fica na
// porta 3000 do mesmo computador/servidor que entregou a página.
const apiConfigurada = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
const hostApi = window.location.hostname || 'localhost';
const apiDesenvolvimento = `${window.location.protocol}//${hostApi}:3000`;
const apiMesmaOrigem = window.location.origin;
window.ESTUDO_API_URL = (apiConfigurada || (window.location.port === '5500' ? apiDesenvolvimento : apiMesmaOrigem)).replace(/\/$/, '');
