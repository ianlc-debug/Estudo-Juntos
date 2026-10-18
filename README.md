# Estudo+Juntos

Plataforma web de apoio à organização de estudos em conjunto. O sistema reúne grupos de estudo, atividades com prazo, agenda, arquivos compartilhados e conversas privadas. O projeto foi desenvolvido para fins acadêmicos na disciplina de Tecnologias Web 2.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias e serviços](#tecnologias-e-serviços)
- [Como funciona](#como-funciona)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Executar localmente](#executar-localmente)
- [Banco de dados e migrações](#banco-de-dados-e-migrações)
- [Publicação atual](#publicação-atual)
- [Limitações conhecidas](#limitações-conhecidas)

## Funcionalidades

### Contas e perfil

- Cadastro e login por nome de usuário e senha.
- Senhas armazenadas com hash bcrypt.
- ID público de seis dígitos para localizar pessoas e enviar convites de contato.
- Edição de nome, e-mail e senha, além de exclusão da própria conta.
- A sessão é mantida no navegador e validada pela API por um token assinado, com validade de sete dias.

> **Atenção à recuperação de senha:** a tela permite redefinir a senha informando e-mail e nova senha. No estado atual, a API não envia e-mail nem verifica um código de confirmação. Esse fluxo não deve ser tratado como recuperação segura para uma aplicação pública.

### Grupos de estudo

- Criação de grupos abertos ou privados.
- Convites para participar de grupos; pedidos para entrar em grupos privados com aprovação dos administradores; entrada direta em grupos abertos.
- Administração de membros, papéis de administrador e participantes, com opções para sair ou excluir o grupo conforme as permissões.
- Cadastro e visualização de horários semanais do grupo.
- A área do grupo reúne quadro de atividades, mural e recursos compartilhados.

### Atividades, mural e recursos

- Administradores publicam e removem atividades do grupo; todos os participantes podem consultar o quadro.
- Uma atividade exige nome/descrição e prazo. Um arquivo pode ser anexado opcionalmente.
- Cada participante marca a atividade como concluída para si, sem alterar o estado dos demais.
- O mural aceita publicações de todos os membros e anexos.
- A área **Recursos** reúne arquivos enviados tanto às atividades quanto ao mural.
- Os anexos têm limite de 20 MB e são guardados no diretório configurado para uploads.

### Agenda e tarefas globais

- Eventos particulares podem ser adicionados, concluídos e removidos pelo próprio usuário.
- A agenda mostra os prazos das atividades dos grupos e os eventos particulares.
- A caixa de tarefas globais reúne atividades ainda ativas e eventos particulares, com opção de marcar como concluídos.
- Atividades com prazo vencido deixam de aparecer como pendentes na lista global; cada pessoa pode ocultar o item vencido da própria agenda.
- Conclusão e ocultação são individuais: não alteram a agenda dos outros membros.

### Mensagens privadas

- Solicitações de contato por ID público; o destinatário pode aceitar ou recusar.
- Conversas privadas entre contatos aceitos, com mensagens de texto e anexos.
- Atualização em tempo real de mensagens e notificações usando **Server-Sent Events (SSE)** (`EventSource`). O projeto não usa Socket.IO.

## Tecnologias e serviços

| Camada | Ferramentas |
| --- | --- |
| Interface | HTML5, CSS3 e JavaScript sem framework |
| Ícones | Font Awesome 6.5.2 via CDN |
| API/servidor | Node.js, Express 5 |
| Banco de dados | MySQL compatível, acessado com `mysql2`; o ambiente publicado foi configurado com TiDB Cloud |
| Autenticação | `bcrypt` para hash de senha; tokens assinados com HMAC-SHA256 e `SESSION_SECRET` |
| Configuração | `dotenv` para variáveis de ambiente e `cors` para requisições entre origens |
| Hospedagem usada | Vercel para a interface, Render para a API e TiDB Cloud para o banco |

O projeto não contém framework frontend, ORM, serviço de e-mail nem Socket.IO. As dependências do backend estão em `backend/package.json`.

## Como funciona

O navegador carrega a interface estática e envia as chamadas à API Express. A API autentica as rotas privadas, acessa o MySQL/TiDB e entrega atualizações de mensagens e notificações por conexões SSE. Os arquivos anexados ficam no sistema de arquivos do servidor, enquanto seus metadados são registrados no banco.

`frontend/js/configuracao-api.js` define a URL da API. O valor de `<meta name="api-base-url">` em `frontend/index.html` tem prioridade; sem ele, a interface usa `localhost:3000` ao ser aberta pelo Live Server na porta 5500 e, nos demais casos, tenta usar a mesma origem da página.

## Estrutura do repositório

```text
Estudo+Juntos/
├── backend/
│   ├── database/
│   │   ├── scheme.sql                 # esquema completo para banco novo
│   │   └── migracao_*.sql             # atualizações para bancos existentes
│   ├── src/
│   │   ├── routes/                    # rotas da API por funcionalidade
│   │   ├── database.js                # conexão e pool MySQL
│   │   └── server.js                  # configuração e inicialização da API
│   ├── .env.example                   # modelo de configuração local
│   ├── index.js                       # ponto de entrada
│   └── package.json
└── frontend/
    ├── assets/                        # imagens e identidade visual
    ├── css/                           # estilos da interface
    ├── js/                            # lógica de cada área
    └── index.html
```

## Executar localmente

### Requisitos

- Node.js instalado (versão LTS recomendada).
- MySQL local ou outro serviço compatível com o protocolo MySQL.
- Git, caso vá clonar o repositório.

### 1. Baixe o projeto e instale as dependências

```bash
git clone https://github.com/ianlc-debug/Estudo-Juntos.git
cd Estudo-Juntos/backend
npm install
```

### 2. Crie o banco

Crie um banco vazio, por exemplo `estudo_juntos`, e execute nele o arquivo `backend/database/scheme.sql` usando MySQL Workbench ou outra ferramenta MySQL.

### 3. Configure o backend

Crie `backend/.env` usando `backend/.env.example` como referência:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=estudo_juntos
DB_SSL=false
SESSION_SECRET=gere-uma-chave-aleatoria-longa
```

`DB_PORT` é opcional e usa `3306` por padrão. `DB_SSL` é opcional e usa `false` por padrão; use `true` quando o provedor exigir TLS, como no TiDB Cloud. `UPLOADS_DIR` também é opcional: define o diretório dos arquivos enviados; sem ele, os arquivos ficam em `backend/uploads`.

Gere um valor longo e aleatório para `SESSION_SECRET`; não reutilize a senha do banco. Mantenha `.env` privado e nunca publique credenciais no GitHub.

### 4. Inicie o servidor

Ainda dentro de `backend/`:

```bash
npm start
```

O servidor deve iniciar na porta configurada e registrar no terminal se conectou ao banco. A API inclui `GET /health`, que retorna o estado básico do serviço. O backend também serve a interface em `http://localhost:3000/app/`.

Para desenvolver apenas a interface, abra `frontend/index.html` com Live Server (normalmente na porta 5500) enquanto o backend está rodando na porta 3000.

## Banco de dados e migrações

- **Banco novo:** execute uma vez `backend/database/scheme.sql`. Ele contém a estrutura atual completa.
- **Banco antigo:** aplique somente as migrações que ainda não foram executadas, na ordem abaixo. Não execute uma migração repetidamente sem conferir o estado do esquema.

Ordem histórica das migrações:

1. `migracao_grupos_criador.sql`
2. `migracao_id_publico_usuarios.sql`
3. `migracao_convites_membros.sql`
4. `migracao_solicitacoes_grupo.sql`
5. `migracao_horarios_grupo.sql`
6. `migracao_atividades_grupo.sql`
7. `migracao_mural_grupo.sql`
8. `migracao_eventos_particulares.sql`
9. `migracao_mensagens_privadas.sql`
10. `migracao_solicitacoes_contato.sql`
11. `migracao_prazos_mural_tarefas.sql`

Os arquivos SQL ficam em `backend/database/`. Faça um backup antes de atualizar um banco com dados importantes.

## Publicação atual

A configuração atual separa a interface, API e banco:

1. **Vercel:** publica os arquivos estáticos da pasta `frontend/` (diretório raiz do projeto Vercel: `frontend`).
2. **Render:** executa a API Node.js (diretório raiz do serviço: `backend`; comando de início: `npm start`).
3. **TiDB Cloud:** fornece o banco compatível com MySQL.

Na configuração do backend no Render, use variáveis de ambiente, sem incluir aspas ou espaços extras:

| Variável | Valor |
| --- | --- |
| `DB_HOST` | Host exibido nos dados de conexão do TiDB |
| `DB_PORT` | Porta exibida pelo TiDB, normalmente `4000` |
| `DB_USER` | Usuário exibido pelo TiDB |
| `DB_PASSWORD` | Senha do usuário do banco |
| `DB_NAME` | Nome do banco criado no TiDB |
| `DB_SSL` | `true` se a conexão TiDB exigir TLS |
| `SESSION_SECRET` | Chave aleatória longa, exclusiva da aplicação |

O endereço da API publicado é configurado na meta tag `api-base-url` do `frontend/index.html`. Quando a URL do backend mudar, atualize esse valor e publique novamente a interface. O banco precisa permitir conexões originadas do serviço hospedado no Render.

## Limitações conhecidas

- O Render pode suspender serviços gratuitos após períodos sem uso, causando demora na primeira requisição depois de inatividade. Consulte as condições atuais do provedor, pois planos e limites podem mudar.
- Em serviços gratuitos, o disco local do backend pode ser temporário. Como anexos ficam no disco do servidor, eles podem deixar de existir após uma nova publicação ou reinicialização. Para preservar arquivos, é necessário configurar armazenamento persistente compatível e apontar `UPLOADS_DIR` para ele; verifique se isso gera custo antes de ativar.
- A recuperação de senha não tem verificação por e-mail implementada atualmente (consulte a seção de contas).
- O endpoint `GET /health` confirma que o processo HTTP responde; não substitui uma verificação completa da conexão ao banco.

## Segurança e dados

- Nunca envie senhas, `.env`, chaves ou certificados para o repositório.
- Se uma credencial tiver sido compartilhada em prints, logs ou mensagens, troque-a no provedor correspondente.
- Antes de executar migrações em dados reais, faça backup do banco.
- A API usa CORS e autenticação por token; ajuste as origens permitidas e revise o fluxo de recuperação de senha antes de disponibilizar a aplicação amplamente na internet.
