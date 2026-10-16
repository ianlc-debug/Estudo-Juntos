# Estudo+Juntos

# Estudo+Juntos - Back-end

Repositório do back-end da aplicação **Estudo+Juntos**, desenvolvido em Node.js com Express e MySQL para a disciplina de Tecnologias Web 2.

## Tecnologias Utilizadas

* **Node.js** (Ambiente de execução JavaScript)
* **Express** (Framework web para Node.js)
* **MySQL / mysql2** (Banco de dados relacional e driver de conexão)
* **Dotenv** (Gerenciamento de variáveis de ambiente)
* **CORS** (Habilitação de requisições cross-origin)

---

## Estrutura do Projeto

O projeto segue uma estrutura de monorepo separando as pastas principais:
```text
Estudo+Juntos/
├── backend/
│   ├── src/
│   │   └── database.js      # Configuração da conexão com o MySQL
│   ├── .env.example         # Exemplo de variáveis de ambiente
│   ├── index.js             # Ponto de entrada do servidor
│   ├── package.json         # Dependências e scripts
│   └── package-lock.json
└── frontend/                # Arquivos da interface (HTML, CSS, JS)

```

---

## Como Executar o Projeto Localmente

Siga os passos abaixo para configurar e rodar o back-end na sua máquina:

### 1. Pré-requisitos

Certifique-se de ter instalado em seu computador:

* **Node.js** (versão LTS recomendada)
* **Git**
* Um SGBD MySQL (como **MySQL Workbench**)

### 2. Clonar o Repositório

Abra o terminal na pasta de sua preferência e clone o repositório:

```bash
git clone <https://github.com/ianlc-debug/Estudo-Juntos.git>
cd Estudo+Juntos/backend

```

### 3. Instalar as Dependências

Instale os pacotes necessários do Node.js executando:

```bash
npm install

```

### 4. Configurar as Variáveis de Ambiente (`.env`)

1. Na pasta `backend/`, crie um arquivo chamado **`.env`** (você pode se basear no arquivo `.env.example` que já está no repositório).
2. Adicione as configurações do seu banco de dados local com o seguinte modelo:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql_aqui
DB_NAME=estudo_juntos
SESSION_SECRET=uma-chave-longa-e-aleatoria

```



### 5. Criar o Banco de Dados no MySQL

Abra o seu MySQL Workbench, crie o banco de dados da aplicação executando o comando SQL abaixo:

```sql
CREATE DATABASE estudo_juntos;

```

### 6. Iniciar o Servidor

Com tudo configurado, execute o comando para iniciar o servidor back-end:

```bash
node index.js

```

* O terminal deverá exibir as mensagens de sucesso:
* `Servidor rodando na porta 3000`
* `Conectado ao banco de dados MySQL com sucesso!`



---

## Endpoints Disponíveis

* **`GET /`**
* **Descrição:** Rota de teste inicial para verificar se a API está online.
* **Retorno esperado (JSON):**
```json
{
  "mensagem": "API rodando com sucesso!"
}

```
```

# Configuração de grupos e banco de dados

1. Configure `backend/.env` com as credenciais do MySQL e uma chave aleatória longa em `SESSION_SECRET` (veja `.env.example`).
2. Em uma instalação nova, execute `backend/database/scheme.sql`.
3. Em uma instalação que já possui a tabela `grupos`, execute uma vez `backend/database/migracao_grupos_criador.sql` antes de iniciar a API. A migração associa os grupos existentes aos usuários pelo nome do criador salvo.
4. Em uma instalação que já possui a tabela `usuarios`, execute também uma vez `backend/database/migracao_id_publico_usuarios.sql` para criar IDs públicos para as contas existentes.
5. Execute uma vez `backend/database/migracao_convites_membros.sql` para criar as tabelas de participantes e convites e registrar os criadores antigos como administradores dos próprios grupos.
6. Execute uma vez `backend/database/migracao_solicitacoes_grupo.sql` para habilitar pedidos de entrada em grupos privados.
7. Execute uma vez `backend/database/migracao_horarios_grupo.sql` para habilitar horários semanais dos grupos existentes.
8. Execute uma vez `backend/database/migracao_atividades_grupo.sql` para habilitar as publicações e anexos do quadro de atividades.
9. Execute uma vez `backend/database/migracao_mural_grupo.sql` para habilitar as publicações do mural.
10. Execute uma vez `backend/database/migracao_eventos_particulares.sql` para habilitar eventos particulares persistentes na agenda.
11. Execute uma vez `backend/database/migracao_mensagens_privadas.sql` para habilitar contatos e conversas privadas.
12. Execute uma vez `backend/database/migracao_solicitacoes_contato.sql` para habilitar solicitações de contato.
13. Inicie a API e faça login novamente. O ID público de seis dígitos aparece no perfil e pode ser usado para enviar solicitações de contato na aba “Mensagens”; quem recebe pode aceitar ou recusar. Contatos aceitos podem trocar mensagens de texto e anexar arquivos de até 20 MB. “Meus Grupos” lista apenas os grupos criados pelo usuário; os grupos de que participa aparecem em “Grupos Privados” ou “Grupos Abertos”. Pedidos de entrada em grupos privados são enviados aos administradores pelas notificações; grupos abertos aceitam a entrada imediatamente pelo código. Os anexos são guardados em `backend/uploads/`, uma pasta ignorada pelo Git. Em servidores, configure `UPLOADS_DIR` para apontar a um diretório persistente.

O arquivo `.env` contém credenciais locais e não deve ser compartilhado.

## Compartilhar a plataforma na mesma rede

Para que os cadastros, grupos, mensagens e arquivos sejam compartilhados, apenas um computador deve executar o backend e o banco MySQL. Os demais usuários acessam a interface desse servidor pelo navegador; eles não devem iniciar outro backend nem usar o Live Server em seus próprios computadores.

1. No computador que ficará ligado como servidor, configure o `backend/.env` com o MySQL local (`DB_HOST=localhost`, `DB_NAME=estudo_juntos`) e aplique as migrações do banco listadas acima.
2. Inicie o backend nesse computador com `node index.js` dentro da pasta `backend` e mantenha o terminal aberto.
3. No Windows do servidor, execute `ipconfig` e anote o endereço IPv4 da rede local (por exemplo, `192.168.0.25`). Permita o Node.js ou a porta TCP `3000` no Firewall do Windows quando solicitado.
4. Em cada outro computador conectado à mesma rede, abra `http://IP-DO-SERVIDOR:3000/app/`, substituindo pelo IPv4 anotado.

O backend serve a interface em `/app/` e a API no mesmo servidor, então todos usam o mesmo MySQL e a mesma pasta `backend/uploads`. O servidor precisa permanecer ligado. Para compartilhar entre redes diferentes sem publicar a plataforma na internet, cada pessoa pode entrar numa rede privada Tailscale e acessar a máquina que hospeda o backend.

### Compartilhar entre redes diferentes sem custo mensal

O Tailscale cria uma rede privada entre os computadores. O plano Personal permite até seis usuários sem custo, e o Tailscale Serve pode disponibilizar o backend por HTTPS apenas nessa rede privada.

1. Instale o Tailscale no computador que vai hospedar o backend e no computador de cada participante. Cada pessoa deve usar sua própria conta.
2. Crie uma rede Tailscale e convide os outros participantes. O plano gratuito Personal permite até seis usuários.
3. No computador anfitrião, configure o MySQL e o `backend/.env` como na instalação local. Inicie o servidor (`node index.js` na pasta `backend`) e mantenha-o ligado.
4. No terminal do anfitrião, execute `tailscale serve --bg localhost:3000` e depois `tailscale serve status`. O Tailscale mostrará um endereço HTTPS privado.
5. Os participantes abrem esse endereço com `/app/` no final. Todos passam a usar o banco e os arquivos do computador anfitrião.

Esse modo não exige que o MySQL fique exposto à internet, mas o computador anfitrião, o backend e o MySQL precisam estar ligados. Contas e arquivos que ficaram em bancos separados não são mesclados automaticamente.

