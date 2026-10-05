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
4. Inicie a API e faça login novamente. Todos os grupos aparecem somente para quem os criou, independentemente da opção de privacidade. Apenas o criador pode excluir seu grupo.

O arquivo `.env` contém credenciais locais e não deve ser compartilhado.
