# Acesso e operação da API na VPS

Registro da topologia e do diagnóstico feito em 22/11/2026 na Área de Trabalho Remota para `217.77.5.101` (Contabo/Windows Server). A sessão remota foi autenticada pelo proprietário. Não registrar senhas, cookies, tokens ou outras credenciais neste repositório.

## Regra permanente de manutenção

- **Antes de investigar qualquer problema, bloqueio ou instabilidade**, consulte este runbook e siga primeiro as verificações e soluções já registradas.
- Depois de cada correção, registre aqui a data, o sintoma, a causa confirmada, a solução aplicada e o resultado verificado. Separe fatos confirmados de hipóteses e deixe explícito o que continuar pendente.
- Este arquivo é o registro central de soluções da VPS, da API, do motor Hust/Flow, do CDP e das contas oficiais. Não manter soluções apenas na conversa.
- Nunca registrar senhas, cookies, bearer tokens, códigos MFA ou outras credenciais.

## Caminho mais simples: onde corrigir cada tipo de problema

| O que está quebrado | Onde corrigir primeiro | Como confirmar |
|---|---|---|
| Tela, botão, layout ou regra do produto | Código local do site | Reproduzir o problema localmente, corrigir e validar; depois publicar o frontend e repetir o fluxo no domínio oficial. |
| Endpoint/API ou integração do backend | Código local da API | Corrigir e validar localmente; depois atualizar/reiniciar a API Node da VPS e testar o endpoint público e o fluxo no site oficial. |
| Serviço parado, porta errada, tarefa ou processo duplicado | VPS, depois de consultar este runbook | Verificar só o serviço e a porta afetados; validar `443`, `8787`, `31416` e, se houver Flow, CDP. Não reiniciar tudo por tentativa. |
| Login Google Flow, bearer ou perfil CDP | Perfil Chrome específico da conta na VPS | Confirmar conta/perfil/porta; login oficial manual; `list google_flow` precisa mostrar `has_bearer: true`; só então testar no site oficial. |
| Mensagem de cota/HTTP 429 | Conta oficial/provedor Flow | Não é corrigido por editar código nem por refazer login. Aguardar renovação da cota ou usar outra conta oficial já cadastrada e validada. |
| Falha de publicação ou diferença entre local e produção | Separar frontend, API e VPS | Comparar o mesmo fluxo nas três camadas; corrigir cada camada no ambiente responsável e confirmar novamente no domínio oficial. |

### Ordem padrão de uma correção

1. **Consulte este runbook** e procure primeiro um sintoma igual. Se já houver solução confirmada, aplique-a e confirme o resultado antes de investigar alternativas.
2. Identifique se o defeito está no frontend, na API, na VPS/CDP ou na cota do provedor. Health verde confirma apenas conectividade básica, não uma geração completa.
3. Para defeito de código, reproduza e corrija localmente. Não copie manualmente arquivos de build: use o fluxo normal de publicação do projeto.
4. Espelhe a mudança no ambiente responsável: frontend publicado na Vercel; API/runtime na VPS; sessão oficial do Flow no perfil Chrome daquela conta. Não copie senhas, cookies ou tokens entre ambientes.
5. Faça uma verificação de ponta a ponta no site oficial e confira resultado, erro e saldo. Em geração paga, use somente a quantidade autorizada; após falha, atualize o saldo antes de repetir.
6. Registre neste runbook a causa, o que foi alterado localmente/publicado/na VPS, o teste real e o estado final. Se a causa não foi comprovada, registre-a como hipótese e diga qual evidência falta.

**Em uma frase:** código se corrige localmente e depois se publica; processo/conta/cota se corrige onde ele existe (VPS ou Flow); tudo termina com verificação no site oficial e registro aqui.

## Acesso

1. Reutilize a janela de Área de Trabalho Remota já conectada quando disponível.
2. Confirme que a barra da conexão identifica `217.77.5.101` antes de interagir.
3. Se não houver sessão, abra a Área de Trabalho Remota para esse host usando as credenciais oficiais gerenciadas pelo proprietário no Windows.
4. Não feche processos para apenas “limpar” as janelas. Identifique antes o processo, a porta e o console pai.

## Guia rápido: Flow/CDP e contas oficiais

**Comece por esta seção antes de investigar uma falha de geração.** O objetivo é distinguir rapidamente sessão ausente de cota do provedor; health da API sozinho não valida Google Flow.

### Diagnóstico em 3 minutos

1. Confirme que o site oficial está logado e abra **Projetos → Histórico** para ler a mensagem específica do job.
2. Na sessão RDP `217.77.5.101`, use o motor Rust existente (não inicie outro console/processo) e consulte:

   ```powershell
   & 'C:\motores\motores-mcp-hub.exe' list google_flow
   & 'C:\motores\motores-mcp-hub.exe' health google_flow
   ```

3. Interprete assim:

   | Sinal | Causa provável | Próxima ação |
   |---|---|---|
   | `has_bearer: false` / `sem bearer_token ya29` | O motor não capturou a sessão oficial desse perfil | Confira a janela e o perfil CDP da mesma conta; confira `--do-not-de-elevate`; deixe o proprietário concluir o login oficial; então use o comando `login` abaixo e confira `list` de novo. |
   | HTTP `429`, “cota desta conta do Flow foi atingida” | A sessão existe, mas a cota do Flow está esgotada | Não refaça login nem envie várias tentativas. Aguarde a renovação da cota ou escolha uma conta oficial que esteja liberada e já validada. |
   | `flow.google.com/404?reason=project` | A aba do Chrome está num projeto Flow inexistente/antigo | Abra a página inicial do Flow nessa janela e confirme que a conta correta consegue abrir o estúdio/projeto antes de testar. Isso não explica sozinho um `429`. |
   | CDP sem resposta | Chrome do perfil não iniciou ou está na sessão errada | Confira a tarefa e o processo Chrome por `--remote-debugging-port` + `--user-data-dir`; não confunda a janela de outra conta. |

4. Para a conta sem bearer, após confirmar que a janela é da conta certa e o login oficial foi concluído manualmente:

   ```powershell
   & 'C:\motores\motores-mcp-hub.exe' login google_flow conta_N
   & 'C:\motores\motores-mcp-hub.exe' list google_flow
   ```

   Substitua `conta_N` pelo ID já cadastrado no motor. O resultado que libera o teste é `has_bearer: true` para esse ID. Nunca copie bearer/cookies entre perfis ou contas; não documente tokens, senhas ou códigos MFA.

5. Só depois faça **um** teste no site oficial. Um Omni Flash custa 30 créditos; confirme o modelo e o custo antes de enviar. Em falha, a API deve estornar; recarregue a página para atualizar o saldo e confirme o histórico antes de repetir.

### Perfis e portas confirmados

| ID | Perfil Chrome | CDP | Argumento obrigatório observado |
|---|---|---:|---|
| `conta_1` | `C:\motores\config\google_flow\profiles\conta_1` | `24022` | `--do-not-de-elevate` |
| `conta_2` | `C:\motores\config\google_flow\profiles\conta_2` | `35811` | `--do-not-de-elevate` |
| `conta_3` | Não confirmado | Não confirmado | Não criar ou presumir perfil/porta a partir do número da conta. |

As tarefas Chrome autenticadas devem executar em `VMI3766152\Administrator` com logon interativo. Nunca execute o Chrome de Flow como `SYSTEM`: o processo pode ficar invisível na Session 0 e o motor não capturar o bearer do perfil correto. Para depurar um perfil, faça alterações apenas na tarefa/processo daquela conta.

## Cadastrar uma nova conta oficial

Uma pasta de perfil Chrome, sozinha, **não cadastra** uma conta no motor nem faz o site usá-la. Siga esta ordem para uma futura `conta_4` (ou o próximo ID ainda livre):

1. Faça inventário com `list google_flow` e confirme a próxima ID livre. Não reutilize o perfil de outra conta.
2. Descubra no **próprio motor Rust** o caminho suportado para registrar a conta. O `--help` observado lista `login`, `list` e `health`, mas não documenta um comando `add`; portanto, não invente arquivo de configuração nem edite token manualmente. Documente o caminho real do registro quando ele for confirmado.
3. Defina um perfil exclusivo `C:\motores\config\google_flow\profiles\conta_N` e uma porta CDP que não esteja em uso. Crie a tarefa Chrome em sessão interativa com `--remote-debugging-port=<porta>`, `--user-data-dir=<perfil>` e `--do-not-de-elevate`; confira na linha de comando que os três valores são os esperados.
4. Abra essa janela específica. O proprietário conclui o login Google/Flow e qualquer MFA manualmente. Confira a conta visível antes de salvar qualquer sessão.
5. Use `motores-mcp-hub.exe login google_flow conta_N`; depois confirme `has_bearer: true` em `list google_flow` e saúde do Flow. Não considere a conta validada só porque o Chrome abriu ou `/api/health` está verde.
6. Atualize a tabela de contas e o mapeamento de uso do site. Hoje, o código local direciona Omni Flash para `conta_1` e lower priority para `conta_2`; uma conta nova não será utilizada em produção automaticamente até o roteamento suportado ser alterado e implantado.
7. Faça um único teste real apropriado à rota e confirme no histórico do site: conclusão, conta/modelo usados, duração e saldo após atualizar a página. Se houver `429`, pare e trate como cota; não continue repetindo tentativas.

**Bloqueio conhecido para cadastro:** o local/schema oficial do registro de contas do motor ainda não foi confirmado neste runbook. Antes do primeiro cadastro novo, a primeira ação é localizar essa configuração pelo `--help`/documentação do binário na VPS e anotar o caminho real. Não criar conta apenas duplicando a tarefa do Chrome.

## Topologia verificada

O arquivo `Caddyfile` encaminha `api.futurodigitalai.com.br` para `127.0.0.1:8787`.

| Componente | Endereço | Evidência observada em 22/11/2026 | Necessidade |
|---|---|---|---|
| Caddy | HTTPS `443` | PID `2624`, executando `C:\Caddy\caddy.exe run --config C:\Caddy\Caddyfile` | Necessário para TLS e proxy público |
| API Node/Hono | `127.0.0.1:8787` | PID `6104` era o dono da porta. `GET /api/health` retornou `ok: true`, `engine: rust`, `missing: []`, `modelError: null` | Necessária para os endpoints do site |
| Motor Rust Hust/Flow | `127.0.0.1:31416` | PID `6764`, executando `C:\motores\motores-mcp-hub.exe serve-openai 31416`; `/v1/models` retornou o catálogo de modelos | Necessário para operações que usam o motor oficial; não é a API Node |
| Chrome com Google Flow/CDP | CDP `24022` | Chrome estava aberto com `--remote-debugging-port=24022` e perfil `C:\motores\config\google_flow\profiles\conta_1` | Necessário para automações do Flow com a sessão oficial; não é necessário para o health HTTP básico |

Também foi verificado que `443`, `8787` e `31416` estavam em escuta nos PIDs acima. A validação local confirmou a API integrada ao motor Rust e sem dependência ausente de chave Gemini. A resposta pública saudável havia sido observada na mesma sessão de diagnóstico. Os PIDs são fotografias daquele momento e mudam após reinício.

### Captura posterior da mesma sessão

Às 23:11 (horário exibido pelo Windows Server), depois de reiniciar `npm run dev:api`, a porta `8787` apareceu sob PID `4132` e o log mostrou a API iniciada em `0.0.0.0:8787/api`; `31416` continuava sob PID `6764`. A tela também mostrou uma tentativa anterior falhando com `EADDRINUSE` em `8787`. Esta captura confirma que a colisão é real, mas não identifica com segurança qual dos processos concorrentes deve ser encerrado. Faça novo health check após cada início da API.

## As quatro janelas do PowerShell

Foram vistos quatro processos `powershell.exe` (PIDs `5332`, `4440`, `5372`, `3776`) e estas linhas de comando Node:

- PID `3312`: `npx-cli.js tsx server/index.ts` — possível segunda inicialização, não era o dono da porta `8787` na captura.
- PID `12264`: `npm-cli.js run dev:api`.
- PID `9544`: `tsx watch server/index.ts`.
- PID `6104`: `tsx` executando `server/index.ts`, dono de `8787` na captura.

A cadeia `npm run dev:api` → `tsx watch` → Node que escuta `8787` corresponde ao listener observado. Há registro de uma tentativa duplicada que terminou com `EADDRINUSE` em `8787`; o processo `npx tsx server/index.ts` é concorrente/suspeito, mas não deve ser encerrado sem verificar de novo a relação pai-filho e as portas. A sessão estava saudável no momento do inventário.

O número quatro não significa que existam quatro serviços necessários. Um console pode estar ocioso, enquanto outro pode ser o host de um processo filho. Antes de fechar qualquer janela, identificar a janela que mantém a cadeia Node ativa. Não encerrar processos Node, Caddy, Rust ou Chrome em lote.

## Persistência após logout ou reboot: parcialmente configurada

Configuração conferida visualmente no Agendador de Tarefas via RDP em 22/11/2026. As três tarefas do projeto aparecem como `Ready`; não foram executadas manualmente e não houve reinicialização para teste:

| Tarefa | Gatilho | Ação conferida | Estado/limite |
|---|---|---|---|
| `Futuro Digital - Caddy` | `At system startup` | `C:\Caddy\caddy.exe run --config C:\Caddy\Caddyfile` | `Ready`; não foi executada desde a criação/correção (resultado `0x41303`, nunca executada) |
| `Futuro Digital - Motor Rust` | Logon de `VMI3766152\Administrator` | `C:\motores\motores-mcp-hub.exe serve-openai 31416`; diretório de trabalho `C:\motores` | `Ready`; não foi executada desde a criação |
| `Futuro Digital - Chrome Flow CDP` | Logon de `VMI3766152\Administrator` | `C:\Program Files\Google\Chrome\Application\chrome.exe` com `--remote-debugging-port=24022 --user-data-dir=C:\motores\config\google_flow\profiles\conta_1 https://labs.google/fx/tools/flow`; diretório de trabalho `C:\Program Files\Google\Chrome\Application` | `Ready`; ação aparece na aba Actions da tarefa. Não foi executada desde a criação |

**A API Node continua sem inicialização automática configurada.** O processo ativo observado é iniciado pelo fluxo de desenvolvimento `npm run dev:api` / `tsx watch server/index.ts` em `C:\site`; também foi observado histórico de instâncias concorrentes e colisão `EADDRINUSE` em `8787`. Não se deve criar outra cópia por um comando presumido nem persistir o watcher de desenvolvimento como se fosse serviço de produção. Antes de automatizar Node, confirmar um entrypoint de produção, caminho de Node/dependências e configuração de ambiente; então configurar uma única instância com reinício e logs.

O desenho atual preserva o contexto da conta oficial: Caddy inicia no boot; Rust e Chrome/CDP iniciam quando `Administrator` faz logon. Não foi habilitado autologon e nenhuma credencial foi salva. Isso significa que o Chrome/Flow e Rust **não estão configurados para iniciar antes do logon do Administrator**. Caddy pode iniciar sem sessão, mas o proxy só terá upstream quando a API Node estiver disponível. A API pública e o health estavam saudáveis no diagnóstico anterior; isso não demonstra persistência após reinício.

**Validação pendente:** não reiniciar nem encerrar a sessão para testar enquanto o site estiver em uso. Em uma janela de manutenção, validar que as tarefas iniciam, que apenas um processo Node escuta `8787`, que Rust responde em `31416`, CDP em `24022`, Caddy em `443` e o health público retorna saudável. Até lá, registrar a persistência como parcial, não como concluída.

### Nova verificação remota (22/11/2026)

- O plugin Computer Use conseguiu abrir e inspecionar a sessão RDP autenticada de `217.77.5.101`; a porta RDP `3389` respondeu.
- `https://api.futurodigitalai.com.br/api/health` respondeu `ok: true`, `engine: rust`, `missing: []` e `modelError: null`.
- A tela da VPS mostrou `31416` escutando pelo PID `6764` e `8787` pelo PID `4132`. Também havia uma tentativa concorrente da API encerrada com `EADDRINUSE` em `8787`; não foi encerrado nenhum processo, pois a API pública estava saudável e a relação entre processos precisa ser confirmada.
- O inventário visual de serviços e tarefas está detalhado na seção de persistência acima; não havia serviço Caddy nem tarefa do projeto na raiz do Agendador.
- A porta `5986` aceita conexão TCP, mas WinRM recusou a sessão TLS por autoridade não confiável e nome do certificado incompatível. Não ignorar a validação do certificado. RDP permanece o canal visual confirmado.
- Naquele diagnóstico, a inicialização automática ainda estava pendente. O estado atual das tarefas está registrado na seção **Persistência após logout ou reboot** abaixo; health público saudável não prova persistência após logout/reboot.

### Histórico da correção de inicialização (22/11/2026)

- Uma tentativa antiga deixou a tarefa Caddy desabilitada e com uma ação malformada; ela não foi executada.
- A tarefa Caddy foi corrigida para o gatilho de inicialização do sistema e ação mostrada acima. Depois foram salvas tarefas separadas para Rust e Chrome/CDP no logon do Administrador.
- Os processos ativos não foram parados nem reiniciados durante esse trabalho. As tarefas criadas mostram `Ready`, mas estão sem execução registrada; a confirmação real ocorrerá somente no próximo gatilho e em teste controlado.

## Procedimento de diagnóstico

1. No Gerenciador de Tarefas > Detalhes, confira linha de comando, PID, processo pai e portas de `caddy.exe`, Node e `motores-mcp-hub.exe`. Relacione `443`, `8787`, `31416` e, separadamente, `24022` do CDP.
2. No host, teste `http://127.0.0.1:8787/api/health` e `http://127.0.0.1:31416/v1/models`. Health esperado: `ok: true`, `engine: rust`, `missing` vazio.
3. Confira `C:\Caddy\Caddyfile`; o upstream atual esperado é `127.0.0.1:8787`.
4. Se a API estiver parada, reinicie apenas a instância correta pelo mecanismo já configurado. Se `8787` já estiver ocupado, descubra o processo dono antes de iniciar outra instância.
5. Valide localmente a API, depois `https://api.futurodigitalai.com.br/api/health` e, por fim, `https://www.futurodigitalai.com.br/avatars`.
6. Não sincronize dados nem faça gerações pagas como teste de health. A sincronização de templates e mídias foi autorizada anteriormente, mas deve ser retomada após confirmar o estado da API.

## Limites do acesso remoto

A sessão RDP pode expirar, desconectar ou exigir nova autenticação após reinício. Este repositório guarda o procedimento, não as credenciais. Se não houver sessão autenticada, use as credenciais oficiais disponíveis no Windows do proprietário; nunca as copie para documentação.

## Estado atual confirmado pelo Agendador e health público (22/11/2026)

**Use esta seção como estado mais recente; ela substitui os registros anteriores de persistência parcial.** Verificado na sessão RDP de `217.77.5.101`:

- `Futuro Digital - API Node`: gatilho `At system startup`; conta `SYSTEM`; opção de execução sem logon selecionada. A tarefa ainda exibia `0x41303` (nunca executada pelo Agendador). O health público respondeu `{"ok":true,"engine":"rust","missing":[],"models":null,"modelError":null}`, portanto API, Caddy e upstream Rust estavam acessíveis naquele momento; isso **não prova que o gatilho da tarefa já executou**.
- `Futuro Digital - Caddy`: gatilho `At system startup`; conta `SYSTEM`; `Run with highest privileges` marcado. O health público confirma o proxy HTTPS funcionando agora.
- `Futuro Digital - Motor Rust`: ação `C:\motores\motores-mcp-hub.exe serve-openai 31416`; conta alterada para `NT AUTHORITY\SYSTEM`; foi adicionado gatilho `At system startup`, mantendo o gatilho de logon existente. A tarefa foi iniciada pelo Agendador e apareceu como `Running`.
- `Futuro Digital - Chrome Flow CDP`: continua no logon de `VMI3766152\Administrator`, para preservar o perfil autenticado do Google Flow em CDP `24022`. Após reboot, o Flow só volta quando a sessão do Administrador iniciar/logar; não foi configurado autologon nem armazenada senha.
- Não houve reboot. A inicialização automática após reinício continua **configurada, mas ainda não validada em reboot**. Não registrar como teste de reboot concluído.

### Próxima retomada rápida

1. Reabrir esta documentação primeiro; não rediagnosticar VPS/credenciais nem abrir quatro PowerShell. Reutilizar a RDP autenticada `217.77.5.101` e confirmar a tela antes de agir.
2. Na próxima janela de manutenção/reboot aprovado, conferir se API Node, Caddy e Rust ficam acessíveis sem iniciar consoles manualmente; health público esperado: `ok: true`, `engine: rust`, `missing: []`.
3. Confirmar especificamente que o Agendador executou as tarefas de startup (resultado diferente de `0x41303`) e que existe apenas um listener API em `8787`.
4. Fazer logon do Administrador para iniciar o Chrome/CDP e validar `24022`/Flow. Não transformar Chrome em tarefa SYSTEM: isso não preserva a sessão oficial do navegador.

Resumo sem jargão: o backend está respondendo pelo domínio; os serviços receberam gatilhos de inicialização; falta validar o ciclo real após reboot. O Chrome do Flow exige logon do Administrador.

## Verificação após o reinício de 23/11/2026

- A tarefa de inicialização do Caddy foi salva com `run --config C:\Caddy\Caddyfile` e reiniciada. O teste público de `/api/health` ainda retornou HTTP 502 após essa alteração.
- A tarefa `Futuro Digital - API Node` exibiu `Running` e último resultado `0x1`. A ação aponta para `node.exe`, `C:\site\node_modules\tsx\dist\cli.mjs server/index.ts`, com diretório de trabalho `C:\site`.
- O Chrome da VPS recebeu `ERR_CONNECTION_REFUSED` em `http://127.0.0.1:8787/api/health`, inclusive depois de encerrar e iniciar novamente apenas a tarefa da API. Isso confirma que a API não estava atendendo na porta esperada. A causa do erro do processo ainda precisa ser confirmada pela saída de inicialização do Node. O teste de recuperação automática ficou reprovado nesse ciclo.

## Ajuste da tarefa Node após o teste manual

- O comando manual com `C:\site\server\index.ts` iniciou a API na porta 8787. Com essa instância ativa, o health público respondeu `ok: true`, `engine: rust` e `missing: []`.
- A ação de `Futuro Digital - API Node` foi atualizada para usar os argumentos `C:\site\node_modules\tsx\dist\cli.mjs C:\site\server\index.ts`, com diretório de trabalho `C:\site`. O Agendador registrou a atualização no evento 140.
- Para validar a troca, encerre somente a instância manual, execute a tarefa do Node e confirme que ela fica em execução e que o health público volta a responder. A recuperação após reboot ainda precisa ser validada com a configuração atual.

- Teste do Agendador aprovado em 23/11/2026. Após encerrar o Node manual, a tarefa foi executada sob demanda e permaneceu em `Running` após atualizar o Agendador. O health público respondeu `ok: true`, `engine: rust`, `missing: []`. Isso valida a execução pela tarefa sem PowerShell manual. O gatilho de boot com o ajuste ainda requer teste em reinício, e o health não valida geração no Flow.

## Reinício validado em 23/11/2026

- A VPS foi reiniciada pelo menu Windows e a sessão RDP exibiu a mensagem de que o computador remoto estava reiniciando.
- Após o retorno, a API pública respondeu `{"ok":true,"engine":"rust","missing":[],"models":null,"modelError":null}`. Isso confirma Caddy, Node e conexão com Rust disponíveis após boot.
- O Chrome abriu em `flow.google.com/about`, a página pública de apresentação do Flow. A conta oficial não ficou autenticada e não foi possível confirmar CDP/geração pelo Flow após o reboot.
- Um teste de imagem real foi enviado pelo Canvas do site oficial, prompt de vestido preto e bordado dourado, sem anexos, modo imagem padrão, custo mostrado de 2 créditos. O botão permaneceu em `GERANDO IMAGEM… 1/4` durante as verificações, sem resultado final observado. Não declarar geração concluída nem bem-sucedida.

### 2026-11-24 — diagnóstico da conta 1 Omni Flash

- O código oficial roteia `omni-flash-1.2` explicitamente para `conta_1`, com `account_id: conta_1` no pedido ao motor Rust.
- O health público confirmou `engine: rust`, `motorConnected: true`, `missing: []` e catálogo sem erro. Isso não valida a sessão de cada conta Flow.
- Na VPS, `motores-mcp-hub.exe health google_flow` retornou sucesso para `conta_2`; não confirmou `conta_1`.
- O histórico oficial registrou a falha Omni Flash como `conta 'conta_1' sem bearer_token ya29 no google_flow`; o cartão da aba Avatar passou a exibir que a sessão da conta 1 precisa ser autenticada novamente.
- **Não usar `motores-mcp-hub.exe login google_flow conta_1` como consulta de estado.** O comando iniciou um Chrome separado; os logs mostraram erros de descriptografia de tokens Google (`Failed to decrypt token`) e restauração do token de segurança. O processo de diagnóstico foi interrompido sem submeter login ou geração.
- Próximo passo necessário: validar/reautenticar a conta 1 na sessão interativa do Chrome/Flow com o perfil `C:\motores\config\google_flow\profiles\conta_1`, sem copiar tokens entre usuários/perfis. Só depois conferir o estado do motor e fazer um teste real autorizado. Não concluir que a API ou o motor estão completamente saudáveis com base no endpoint `/health`.

### 2026-11-24 — rechecagem após nova falha do Omni Flash

- Histórico oficial: duas tentativas Omni Flash da conta DONO falharam com `conta 'conta_1' sem bearer_token ya29 no google_flow`; ambas foram estornadas integralmente (0 créditos cobrados).
- Acesso SSH administrativo à VPS foi confirmado. `motores-mcp-hub.exe list google_flow` mostra 3 contas habilitadas: `conta_1` e `conta_3` sem bearer; `conta_2` com bearer.
- `motores-mcp-hub.exe health google_flow` consulta somente a conta 2 nesta build e retornou HTTP 200. **Não usar esse health como prova de que a conta 1 está pronta.**
- CDP da conta 1 está ouvindo em `127.0.0.1:24022`, mas a aba Chromium está em `https://flow.google.com/about`, não no estúdio autenticado do Flow. Assim, motor, API e CDP podem estar ativos enquanto o modelo Omni falha por falta de sessão autenticada da conta 1.
- Não repetir `motores-mcp-hub.exe login google_flow conta_1`: a chamada anterior abriu Chrome separado e registrou erros de descriptografia/restauração do token.
- Próximo passo obrigatório: autenticação interativa do proprietário na conta oficial pretendida usando o perfil `C:\motores\config\google_flow\profiles\conta_1`. Não copiar cookies/tokens nem automatizar senha ou código MFA. Depois, confirmar `has_bearer: true` para `conta_1` com `list google_flow` e só então executar um único teste Omni autorizado no site oficial.

### 2026-11-24 — janela visível e identidade do processo corrigidas no diagnóstico

- O usuário identificou que a janela Flow visível no RDP era da conta 2. Não usá-la para validar `conta_1`.
- A janela/CDP `24022` da conta 1 pertence ao perfil `C:\motores\config\google_flow\profiles\conta_1`, mas o processo Chrome correspondente (PID observado 1012) está em `Session 0`, usuário não interativo `SYSTEM`, iniciado como filho do motor Rust (PID observado 8708), também em `SYSTEM`. Isso explica por que a janela não aparece na sessão RDP e por que não se deve confundir a janela visível da conta 2 com a conta 1.
- A tarefa Rust está configurada como `SYSTEM` com gatilhos de inicialização/logon; a tarefa Chrome está configurada como `Administrator` interativo no logon, mas o CDP 24022 observado foi criado pelo motor Rust em Session 0. Health/lista continuam mostrando `conta_1 has_bearer=false`.
- A correção aplicada após autorização explícita foi mudar a principal da tarefa Rust para `VMI3766152\Administrator` com logon interativo, parar apenas o Chrome oculto antigo do perfil conta_1, iniciar a tarefa Chrome Flow CDP e reiniciar o motor. Verificação: tarefa Rust `Running`, motor no usuário Administrator/session 3, CDP `24022` sob o mesmo usuário/session 3.
- A captura RDP confirmou a janela Chrome visível na página inicial do Flow usando o perfil configurado de conta_1. O `has_bearer` ainda estava `false` na última leitura; o usuário precisa concluir o login oficial nessa janela. Não automatizar senha/MFA nem testar geração antes de confirmar `has_bearer: true`.
- A tarefa Rust agora depende de uma sessão interativa do Administrador. Desconectar o RDP sem fazer logoff preserva a sessão; após logoff/reboot, confirmar o logon e o estado das tarefas antes de afirmar que a geração está pronta. Ainda não foi feito teste de geração nem de reboot após a alteração.
- Após o proprietário concluir o login manual na janela do perfil conta_1 (Flow exibindo o avatar `G` e a conta `ULTRA`), a lista do motor ainda retornou `has_bearer: false`, mesmo após reiniciar a tarefa Rust no mesmo usuário/sessão. A integração browser→bearer não está validada; não enviar geração de teste enquanto esse estado continuar falso.
- Uma nova execução do comando CLI `login google_flow conta_1` para capturar a sessão foi rejeitada pela revisão automática por risco de descriptografia/captura de credenciais. Não tentar contornar por outra chamada indireta; identificar um procedimento suportado do motor ou obter autorização explícita para essa operação específica.

### 2026-11-23 — 404 em Meus Avatares resolvido
A VPS estava no commit bac4ef2 e servia uma API anterior às rotas de galeria e templates. A Vercel encaminhava as requisições corretamente. O middleware de /avatars/* devolve 401 sem login mesmo quando a rota específica falta. Para comparar versões, o health atual inclui motorConnected e availableModels.
Na VPS, abrir o menu Iniciar remoto com Alt+Home, abrir o PowerShell e usar uma sessão administrativa para o Git e o Agendador. Com a árvore limpa, atualizar C:\site via fast-forward a partir de origin/main e reiniciar somente a tarefa Futuro Digital - API Node. A atualização para 487316d retornou health ok com motorConnected true. No site oficial, a sessão autenticada voltou a carregar 25 avatares com miniaturas e 4 templates salvos. Geração nova não foi executada nesta correção.

### 2026-11-23 — Geração real no canvas após reparar a VPS
O motor antigo respondia 404 ao POST /v1/videos/generations e o job de imagem expirava em 210 s. O CDP em 24022 respondia. Foi implantado o binário local target/release de 22/11 pelo compartilhamento RDP, com backup em C:\motores\motores-mcp-hub.exe.previous. Reiniciada somente a tarefa Futuro Digital - Motor Rust. A rota de vídeo passou a validar o prompt. Uma imagem Nano Banana 2 com referência terminou com status done e entrou na galeria.
O vídeo passou a falhar no pós-processamento por spawn ffprobe ENOENT. Foram instalados ffmpeg.exe e ffprobe.exe do pacote Gyan Essentials no diretório de trabalho C:\site. Um novo Recriar no cartão existente concluiu e reproduziu no site oficial. O limite de quatro pedidos e a cobrança não foram aferidos neste reteste.

### Estado consolidado após os testes reais

Este resumo é o estado mais recente para retomada; os registros anteriores acima são históricos e descrevem etapas intermediárias:

- Alterações operacionais registradas: atualização do código da API em `C:\site`, ajuste da tarefa agendada `Futuro Digital - API Node`, atualização do executável Rust com cópia anterior preservada em `C:\motores\motores-mcp-hub.exe.previous`, reinício da tarefa Rust e disponibilização de `ffmpeg.exe`/`ffprobe.exe` no diretório de trabalho da API.
- Testes no site oficial concluídos: uma geração de imagem Nano Banana 2 com referência foi concluída e apareceu na galeria; um vídeo Omni Flash com referência foi recriado, concluído e reproduzido.
- Saúde pública da API e caminho até o motor Rust responderam durante a sessão. Isso confirma o funcionamento naquele momento, mas não substitui uma nova checagem de disponibilidade na próxima sessão.
- Ainda pendente: medir limite de quatro gerações simultâneas e conferir débito de créditos; também confirmar novamente o estado das tarefas/serviços após um reboot futuro. Não concluir que esses dois comportamentos foram validados pelos testes acima.
- Nenhuma senha, cookie ou token foi copiado para esta documentação.

### 2026-11-24 — Conta 1 após ajuste do Chrome Flow CDP

- A conta 1 começou com `has_bearer=false`, embora o Flow estivesse logado visualmente. A tarefa `Futuro Digital - Chrome Flow CDP` iniciava o perfil sem o argumento `--do-not-de-elevate`; o Chrome da conta 2 usava esse argumento.
- Foi aplicado o mesmo argumento na tarefa da conta 1 e reiniciado apenas o Chrome do perfil `conta_1`. O comando suportado `motores-mcp-hub.exe login google_flow conta_1` então retornou `has_ya29_bearer:true`; a lista do motor confirmou `conta_1` e `conta_2` com bearer. A conta 3 permaneceu sem bearer e não foi alterada.
- Teste no site oficial: um vídeo Avatar foi enviado com Omni Flash 1.2, preset Beatriz · Verão Brasil, prompt em português. O site registrou o job e mostrou `1 de 4 vídeos em andamento`; o saldo passou de 9134 para 9104 créditos (30 créditos).
- Resultado: o job falhou porque a cota da conta 1 no Flow foi atingida. O histórico oficial mostrou “A cota desta conta do Flow foi atingida. Aguarde ou tente novamente com outra conta oficial.” A captura de sessão está corrigida, mas a geração Omni Flash não foi validada como funcional enquanto a cota estiver bloqueada. O erro é distinto do bearer ausente.
- A cobrança de 30 créditos foi inicialmente mostrada no saldo em cache; depois de recarregar a página oficial, o saldo voltou de 9104 para 9134. A falha foi estornada corretamente. O histórico exibe “estornado” e zero resultados prontos; esse zero não é o valor do estorno.
- Na sessão RDP, o Chrome do perfil conta 1 exibiu `flow.google.com/404?reason=project` (“Projeto não encontrado”). Confirmar se essa sessão precisa de um projeto Flow válido antes de retestar. Não automatizar autenticação, não capturar credenciais e não afirmar geração concluída.
- **Estado mais recente para retomada:** `conta_1` e `conta_2` tinham `has_bearer: true`; `conta_1` estava sem cota Omni disponível no teste. `conta_3` continuava sem bearer. A porta/perfil da conta 2 foram observados como `35811` e `profiles\conta_2`; os dados da conta 3 ainda precisam ser descobertos.
- Próxima ação para `conta_1`: aguardar renovação de cota ou escolher outra conta oficial já validada; não repetir Omni na conta 1 enquanto o Flow retornar a mensagem de cota. Para cadastrar conta nova, usar a seção **Cadastrar uma nova conta oficial**; ainda falta localizar o mecanismo de registro suportado no motor Rust.

### 2026-11-25 — Reteste real do Omni Flash no Avatar

- O histórico oficial ainda mostrava a falha de cota da conta 1 do dia anterior. No canvas Avatar, foi selecionado **Omni Flash 1.2**, com o preset **Beatriz · Verão Brasil** e o prompt já preenchido sobre o vestido preto bordado; a fala estava explicitamente em português do Brasil. Não foi anexada foto de produto.
- Foi enviada uma única geração pelo site oficial. O saldo passou de **9.134 para 9.104 créditos** e o job apareceu em `Avatar > Vídeos gerados`. O vídeo terminou, foi reproduzido na galeria e mostrou a mesma influenciadora com vestido preto e detalhes dourados; o cartão registrou **10 segundos**.
- Durante o mesmo período, o usuário informou que havia clicado em **Recriar** em um cartão antigo. Portanto, os dois jobs simultâneos observados eram: a geração nova acima e a recriação do usuário — não uma duplicação atribuída ao primeiro clique. A recriação também concluiu com vídeo de **10 segundos**; o saldo final ficou em **9.074**, totalizando 60 créditos para as duas solicitações.
- Este resultado indica que o caminho Omni Flash voltou a concluir para o estado atual do serviço, apesar da falha de cota registrada no dia anterior. A identidade da conta Flow usada não foi exibida no site durante o teste; o mapeamento conhecido do código aponta Omni para `conta_1`, mas não foi feita nova consulta direta ao motor nesta sessão. Não inferir daqui que todas as contas estão validadas nem que o limite de quatro jobs foi testado.
- A galeria oficial foi deixada aberta em `Avatares > Vídeos gerados`. Não houve exclusão nem alteração de outros resultados.

### 2026-11-25 — Corrigido e testado o Recriar de vídeos concluídos

- Causa: a interface permitia **Recriar** em vídeos concluídos e enviava o ID do projeto original (`replacesProjectId`), mas a API só aceitava substituir projetos com status `failed`. O servidor rejeitava recriações de vídeos concluídos.
- Correção no código local: `1a398c2 fix: allow recreating completed avatar videos`. A validação agora aceita substituir um projeto `failed` ou `done` que tenha `video_url`; falha sem vídeo não é tratada como resultado concluído. A correção também preserva o cartão original na galeria quando há uma tentativa de recriação pendente.
- Na VPS, `C:\site\server\routes\aiUgc.ts` recebeu somente essa alteração. O checkout VPS está divergente do repositório local e contém artefatos não rastreados; não foi feito force-pull nem substituição da pasta.
- Verificação do backend: `https://api.futurodigitalai.com.br/api/health` respondeu `ok: true`, `engine: rust`, `motorConnected: true`, sem dependências ausentes.
- Teste real na conta DONO, site oficial, aba `Avatars > Vídeos gerados`: foi clicado uma única vez **Recriar vídeo** no vídeo concluído mais recente (10 s). O site confirmou “Vídeo de Avatar entrou em produção”; o saldo caiu de **9.074 para 9.044** (30 créditos). O vídeo substituto apareceu no mesmo cartão, manteve 10 itens na galeria e ficou concluído/reproduzível. Não houve novo clique nem duplicação do pedido.
- **Pendência operacional separada:** ao reiniciar `Futuro Digital - API Node` pelo Agendador durante esta manutenção, a tarefa aparecia como `Running`, porém a porta 8787 não voltou a responder. Para não deixar o domínio indisponível, a tarefa foi parada e o comando de API já configurado (`node.exe` + `tsx` em `C:\site\server\index.ts`, diretório `C:\site`) foi iniciado manualmente; o health público voltou a responder e o teste real foi realizado. A tarefa agendada está `Ready` e o Node está em execução em console interativo; portanto, a API pode parar se esse console for fechado ou a sessão terminar. Investigar e validar a execução persistente da tarefa antes de fechar o console ou afirmar recuperação automática.

### 2026-11-25 — Agente Diretor: consistência visual de mãos e anatomia

- Solicitação: reforçar nos prompts de vídeo a prevenção de terceira mão, membros/dedos duplicados e artefatos visuais.
- Correção local em `server/gemini.ts`: o Agente Diretor agora injeta uma regra obrigatória de continuidade no início do `flowVideoPrompt` em todos os presets, e também no campo editável da ação. Ela pede anatomia estável quadro a quadro, no máximo duas mãos visíveis (cinco dedos cada), sem membros desconectados, deformações, flicker, morphing, objetos surgindo/desaparecendo ou duplicação do produto; orienta gestos simples e contínuos.
- Se o modelo não devolver `flowVideoPrompt`, o backend agora deriva o texto a partir da ação e fala da cena antes de acrescentar a regra obrigatória. O lock fica no início do texto para sobreviver ao limite de truncamento quando o frontend inclui a regra de áudio em pt-BR.
- Build local aprovado em 25/11/2026 (`npm run build`; TypeScript e Vite concluíram). O ambiente usa Node 22.11.0 e Vite avisou que recomenda Node 22.12+; a compilação concluiu mesmo assim.
- Publicação do frontend confirmada na Vercel em produção: deployment `ready`, commit `7326e28 fix: build director video prompt when plan omits it`, com o domínio oficial conectado.
- Teste real ao vivo pelo Agente Diretor, conta DONO, no site oficial: briefing de demonstração de frasco com limite de duas mãos e continuidade; `Criar plano de produção` concluiu, o prompt final apareceu no canvas com a trava de continuidade e o botão `Gerar` ficou habilitado. Foi enviada exatamente uma geração com `Veo 3.1 · lower priority`; a galeria subiu de **10 para 11 vídeos** e o saldo permaneceu em **9.014 créditos**. O resultado concluiu em 8 segundos e foi aberto para inspeção. Nos quadros conferidos em 1s, 3s e 6s, não foi observada terceira mão: há duas mãos visíveis no manuseio do frasco.
- O frontend oficial inclui uma regra de continuidade e cria um prompt de vídeo de fallback quando o plano retornado não contém `flowVideoPrompt`; isso elimina o bloqueio do botão observado no teste anterior. A instrução do backend em `server/gemini.ts` está no GitHub, mas ainda **não foi aplicada à API ativa em `C:\site` na VPS**. A API ativa continua sendo um processo manual conforme a anotação operacional acima; não fechar esse console nem afirmar persistência automática.
- Limites e achados do teste: esta foi uma única geração e não comprova ausência de artefatos em todos os renders. O teste usou 0 referências de produto/personagem, então não avalia fidelidade a uma embalagem real; o vídeo trouxe marca/rótulo e textos sobrepostos que não foram pedidos, mostrando que o modelo pode inventar esses elementos sem referência e instrução explícita de não inserir texto. O preset `Personagem consistente` usou 8s. O saldo não foi debitado neste teste lower priority. A instrução de backend em `server/gemini.ts` continua no GitHub, mas ainda **não foi aplicada à API ativa em `C:\site` na VPS**; o frontend oficial atualmente injeta a regra para o prompt enviado pelo canvas.

### 2026-11-25 — Lower Priority recusou referência de produto no Agente Diretor

- No site oficial, uma geração pelo Agente Diretor usando `Veo 3.1 lower priority` falhou. O registro de erro recebido do Flow identifica o modelo `veo_3_1_r2v_lite_low_priority` e o status `PUBLIC_ERROR_IP_INPUT_IMAGE`, com motivo `IP_PROHIBITED` (erro 3). A geração não foi concluída.
- Comparação com o teste aprovado acima: o Lower Priority já concluiu em 25/11, mas aquele teste usou **zero imagens de referência**. Portanto, o sucesso anterior valida que o caminho do modelo estava funcional sem referência; não valida o processamento desta foto de produto.
- A mesma foto do conjunto estampado foi aceita e gerou um vídeo pelo Omni Flash nesta sessão. Isso demonstra que a foto não está universalmente inválida no site; a rejeição observada é específica ao caminho Veo/Flow (ou ao contexto de conta/moderação desse pedido). Ainda não foi isolado qual dos dois fatores explica a diferença.
- A resposta de erro não informa `account_id`. O mapeamento documentado do código direciona lower priority para `conta_2`, mas não há evidência neste job que confirme a conta efetivamente usada. Não atribuir a falha à conta 2 nem à sessão CDP sem consultar o histórico/log de roteamento do motor.
- Evidência da tela: o cartão ficou `Falhou`, o Omni Flash concluído continuou separado na galeria e o saldo observado permaneceu em 8.984 créditos após a tentativa lower priority. Não repetir a mesma referência em Veo como reteste: primeiro usar uma foto de produto sem elementos que possam acionar o filtro de propriedade intelectual ou testar uma referência alternativa autorizada.
- Diagnóstico confirmado: este job foi recusado pelo Flow/Veo com `IP_PROHIBITED`. A hipótese de que a estampa visível acionou uma regra específica do Veo é plausível, mas não está confirmada; a aceitação pelo Omni reforça que ainda é necessário comparar roteamento/conta e filtros do modelo. A falha não prova indisponibilidade geral do Lower Priority nem defeito geral na conta 2.

### 2026-11-25 — Referências por função e teste real via Agente Diretor

- Causa corrigida na API: a rota de vídeo acrescentava instruções genéricas para preservar identidade em qualquer imagem anexada. No modo de demonstração com as mãos, isso podia tratar a foto de produto como identidade de pessoa; a orientação de referência também misturava rosto/roupa e produto. Agora o backend separa os papéis de `INFLUENCIADOR`, `PRODUTO` e frame inicial, e só pede preservação da identidade quando existe referência de pessoa. A falha do Flow é mostrada com mensagem específica quando o provedor retorna `IP_PROHIBITED`, e o log inclui o motor e código sem despejar o payload inteiro.
- Aplicação na VPS `C:\site`: o branch ativo estava em `81bf83c`, com alteração local preservada em `server/routes/aiUgc.ts` para permitir recriação de vídeo concluído e arquivos auxiliares FFmpeg não rastreados. Não foi feito pull/reset. Foi feito backup de `server/routes/aiUgc.ts` e aplicado apenas o ajuste necessário sobre esse arquivo; `server/videoGenerationDiagnostics.ts` foi adicionado. Os dois arquivos foram comparados por SHA-256 após o envio.
- Verificação: `npm run typecheck` passou no checkout da VPS. O health local e público de `https://api.futurodigitalai.com.br/api/health` respondeu `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`.
- Teste real oficial via Agente Diretor: o plano existente permaneceu salvo. A partir dele, foi aberto o canvas e substituída somente a referência do canvas de teste por uma imagem neutra de frasco branco sem marca; o campo de influencer ficou vazio e o prompt pediu somente mãos, narração pt-BR e preservação do frasco. Foi selecionado `Veo 3.1 · lower priority` e enviado **um** vídeo. O pedido apareceu em `Avatares > Vídeos gerados`, concluiu e ficou salvo no site com **8 segundos**. A prévia mostra duas mãos segurando o frasco branco. O saldo permaneceu em **8.984 créditos**.
- Interpretação: isso valida o fluxo Director → canvas → slot Produto → lower priority/Flow → galeria do site com referência neutra. A falha anterior com a estampa de personagens continuou sendo uma recusa do próprio Flow (`IP_PROHIBITED`), não evidência de que toda imagem ou todas as contas falharão. Não reutilizar a imagem com personagens protegidos em lower priority como teste de repetição; o provedor pode continuar recusando referências específicas. Não afirmar que todos os erros possíveis foram eliminados.

### 2026-11-25 — Avatar: lixeira dos vídeos e detalhes da geração

- Causa da lixeira sem resposta: a camada transparente para abrir o vídeo cobria a área do botão de excluir. A lixeira recebeu `z-index` maior que essa camada; agora aparece um indicador de exclusão enquanto aguarda a API.
- Ao abrir um vídeo, o modal agora mostra modelo, custo/modo ilimitado, duração, formato, data, configuração de voz/legendas, prompt por cena e referências salvas com miniatura e nome.
- A rota de vídeo no código local também passa a enviar e armazenar a foto de produto entre as referências do Avatar, com deduplicação; isso permitirá que novas gerações mostrem o produto nos detalhes e usem a imagem como referência do Flow.
- Verificação local: `npm run typecheck`, `npm run build` e E2E passaram; **96 verificações aprovadas, 0 falhas**. O E2E abriu os detalhes e confirmou prompt/custo/referências; a lixeira removeu apenas o registro simulado de teste após confirmação. Nenhum vídeo real foi excluído.
- Publicação: commit `e889ee6 fix avatar video delete and details` enviado a `main`. O bundle público Vercel do domínio oficial respondeu HTTP 200 e contém o painel novo. O Chrome já estava na página `Avatars > Vídeos gerados`, com cartões de vídeo e lixeiras expostos.
- **Pendência de backend:** o domínio oficial encaminha `/api` para a API Node na VPS, não para a Vercel. O checkout ativo documentado em `C:\site` está divergente e preserva mudanças locais; a tentativa de acesso SSH nesta sessão foi recusada (`Permission denied (publickey,password,keyboard-interactive)`). Portanto, a extensão de referência de produto no backend está no código GitHub/local, mas ainda não foi aplicada nem testada na API ativa da VPS. Não afirmar que referências de produto ficarão armazenadas para novas gerações até aplicar cuidadosamente essa mudança em `C:\site` e reiniciar somente a API Node pelo procedimento operacional autorizado.
- Ao retomar: primeiro conferir este runbook e confirmar se a API ativa continua em `8787`; recuperar acesso SSH autorizado ou usar o procedimento administrativo suportado para `C:\site`, preservar as diferenças locais e só então validar o upload da referência de produto e o painel no site oficial.

### 2026-11-25 — acesso remoto para aplicar a atualização de referências

- O código de backend aprovado está no `main` local/GitHub nos commits `51e9816` (papéis de referências e diagnóstico de falhas) e `7fe1c51` (renovação de URLs assinadas das referências). O checkout da VPS continua divergente em `81bf83c`; não fazer `pull` amplo nem sobrescrever o diretório.
- A tentativa SSH de `Administrator@217.77.5.101` retornou `Permission denied (publickey,password,keyboard-interactive)`: este computador não possui a chave privada autorizada disponível.
- O proprietário autorizou uma chave temporária. Um par foi gerado apenas localmente e removido sem ser instalado; nenhum arquivo ou serviço da VPS foi alterado nesta tentativa.
- A sessão RDP permanece conectada e mostra a API Node ativa em `C:\site` (processos observados 8724 e 1696). Nenhum processo foi encerrado e a API não foi reiniciada.
- **Pendente:** habilitar um canal de implantação autorizado e não interativo (chave SSH válida disponível neste computador ou provisionamento da chave via ferramenta administrativa suportada). Depois, preservar o diff local do VPS em `server/routes/aiUgc.ts` e os binários auxiliares FFmpeg, implantar apenas `server/routes/aiUgc.ts`, `server/storage.ts` e `server/videoGenerationDiagnostics.ts`, validar a compilação na VPS, reiniciar apenas `Futuro Digital - API Node` e confirmar `/api/health` mais uma geração com referência e os detalhes do vídeo no site oficial.
- Nova tentativa pela interface RDP não instalou a chave: o fluxo de acesso ao arquivo administrativo não ficou confiável nesta sessão. Os consoles PowerShell existentes não foram usados nem alterados; o Explorador e o Gerenciador de Tarefas abertos durante a inspeção foram fechados. O segundo par temporário também foi removido localmente.

### 2026-11-25 — fala do Agente Diretor termina antes do vídeo

- Problema observado no site oficial: um plano de 10s retornou uma fala de 23 palavras. A tela mostrava `23/15` e bloqueava a aprovação para o canvas. O rascunho salvo era anterior à correção; não deve ser tratado como uma fala já ajustada.
- Regra de duração: reservar os últimos 1,5s sem fala e limitar o texto a 1,8 palavras por segundo no tempo útil. Isso dá até 15 palavras em 10s, 11 em 8s e 24 em 15s.
- Correção local e no frontend oficial (commit `d584611`): normalizar a fala da primeira cena antes de mostrar o plano e antes de montar o handoff ao canvas. Falas editadas acima do limite continuam bloqueadas, com contagem visível e orientação para reduzir. O bundle oficial foi conferido após o deployment Vercel `Ready` do commit `d584611` e contém a normalização.
- Correção de backend: `server/gemini.ts` acrescenta o limite no pedido ao modelo e ajusta a fala retornada. Na VPS `C:\site\server\gemini.ts`, a alteração foi aplicada preservando backup `server\gemini.ts.pre-director-speech-20261125`; o health local e público permaneceu saudável. O teste do plano de 23 palavras ocorreu antes de a publicação Vercel ficar `Ready`; não afirmar que uma nova chamada de plano, já com o backend ativo atualizado, foi confirmada neste ciclo.
- Testes locais após a correção de frontend: `npm test -- --run` (46 aprovados) e `npm run build` passaram. Vite ainda avisa que o Node local 22.11.0 é menor que o recomendado 22.12+, sem impedir a compilação.
- Não foi enviado vídeo nem houve consumo de créditos nesta correção. O teste acústico de uma nova geração permanece pendente; ao validar, usar um plano novo e conferir no vídeo que a última palavra termina antes do fim. Planos salvos antigos não são reescritos sozinhos: recrie o plano para receber a fala corrigida.

### 2026-11-25 — Avatar carrega 16 vídeos válidos por lote

- A aba Avatar busca projetos em páginas de 24 registros brutos, mas parte deles pode ser motion ou ter sido substituída; por isso a primeira página mostrava só 10 vídeos atuais mesmo havendo mais histórico.
- A galeria agora pagina automaticamente até reunir 16 vídeos atuais (ou esgotar os registros disponíveis), exibe 16 por lote e mantém `Carregar mais vídeos` para avançar. O total exibido continua baseado em vídeos reais salvos, sem criar cartões artificiais.
- A correção foi publicada no commit `bbe56ce`. O bundle público do domínio oficial contém a lógica de lote 16 e autopaginação. Build local aprovado; nenhum job de geração de mídia foi iniciado nesta mudança.

### 2026-11-25 — Remoção do slot VÍDEO no canvas Avatar

- Solicitação: retirar o terceiro slot `VÍDEO`, que não será usado. A remoção afeta apenas a área de anexos do canvas.
- `INFLUENCER`, `PRODUTO`, alternância Imagem/Vídeo, seleção do modelo e botão GERAR continuam disponíveis. O slot não acionava geração de vídeo; apenas abria a aba de templates.
- Build local aprovado antes da publicação. A mudança será espelhada pela Vercel após o push ao branch `main`; nenhuma configuração da VPS ou geração de mídia é necessária.

### 2026-11-25 — placeholders imediatos para imagens em geração no Avatar

- Sintoma: ao pedir duas imagens, os novos cartões só apareciam quando a API terminava. O botão atualizava o contador, mas a galeria renderizava apenas avatares salvos.
- Causa: o estado local `pendingImageRequests` não era passado para a galeria. Além disso, o endpoint de imagem responde só depois que todas as saídas terminam, então a lista de avatares não recebia registros temporários.
- Correção: `AvatarsPage` repassa o total pendente para `GeneratedMediaTabs`, que renderiza um placeholder `Gerando imagem…` para cada saída solicitada antes das imagens concluídas. Assim, um pedido de 2 imagens mostra 2 cartões de processamento na hora; imagens já salvas continuam visíveis. O placeholder também aparece durante o carregamento inicial quando há pedido pendente recuperável no histórico.
- Build local aprovado (`npm run build`). Nenhuma geração foi iniciada para testar esta mudança; a confirmação de produção será feita pelo bundle após publicação.

### 2026-11-25 — diagnóstico da marca d’água da conta DONO

- Causa do desencontro entre código e API: o snapshot da API VPS documentado em `81bf83c` identifica o proprietário comparando `userId` com `process.env.OWNER_USER_ID`. Já o código atual do repositório, a partir do commit `991ab2e`, consulta `profiles.plan` e considera DONO quando o plano é `unlimited` (mesmo campo usado pelo débito de créditos). O commit `991ab2e` não está contido no snapshot `81bf83c`.
- Isso explica por que a API antiga pode salvar imagens do DONO sem marca: se `OWNER_USER_ID` estiver vazio ou não corresponder ao ID autenticado, `isOwnerUser` retorna `false` e o overlay é ignorado. A presença/valor dessa variável no processo ativo não foi consultada, portanto essa condição específica continua como hipótese; não registrar nem expor seu valor.
- No código atual, `/api/avatars/generate` aplica `applyWatermark` antes do upload ao Storage. A marca é adicionada no backend após a geração, não pelo prompt da imagem.
- **Pendente de operação:** implantar com segurança na API ativa `server/watermark.ts` e `server/routes/avatars.ts` do commit `991ab2e` (ou equivalente), preservando as divergências e arquivos locais em `C:\site`. Ainda não foi feita alteração nem reinicialização na VPS, nem geração de verificação. Depois da implantação, confirmar o plano DONO pelo próprio caminho da aplicação e fazer uma imagem autorizada no site oficial para verificar visualmente a marca.

### 2026-11-25 — navegação entre mídias geradas do Avatar

- O visualizador de imagens e o de vídeos gerados recebeu setas anterior/próxima, com posição atual/total e limites desativados nas extremidades. A navegação usa os itens carregados na galeria; vídeos são filtrados para resultados concluídos com arquivo disponível.
- Alteração feita no código local. Publicação e verificação visual no site oficial ainda pendentes.
