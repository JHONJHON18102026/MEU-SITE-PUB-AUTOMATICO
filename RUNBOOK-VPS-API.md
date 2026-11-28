# Acesso e operação da API na VPS

Registro da topologia e do diagnóstico feito em 22/11/2026 na Área de Trabalho Remota para `217.77.5.101` (Contabo/Windows Server). A sessão remota foi autenticada pelo proprietário. Não registrar senhas, cookies, tokens ou outras credenciais neste repositório.

## Regra permanente de manutenção

- **Antes de investigar qualquer problema, bloqueio ou instabilidade**, consulte este runbook e siga primeiro as verificações e soluções já registradas.
- Depois de cada correção, registre aqui a data, o sintoma, a causa confirmada, a solução aplicada e o resultado verificado. Separe fatos confirmados de hipóteses e deixe explícito o que continuar pendente.
- Este arquivo é o registro central de soluções da VPS, da API, do motor Hust/Flow, do CDP e das contas oficiais. Não manter soluções apenas na conversa.
- Nunca registrar senhas, cookies, bearer tokens, códigos MFA ou outras credenciais.

## Uso do Reversa nas melhorias e correções

O Reversa é uma ferramenta auxiliar de engenharia para mapear o sistema, transformar regras existentes em especificações rastreáveis, planejar mudanças pequenas e investigar defeitos. Ele não substitui este runbook nem decide sozinho mudanças de arquitetura.

1. Leia este runbook e a documentação local pertinente antes de iniciar. Soluções e decisões já confirmadas aqui têm prioridade sobre conclusões automáticas do Reversa.
2. Use a análise do Reversa para compreender o código e propor um delta sobre o sistema existente. Confirme cada regra extraída no código, no comportamento real e nas decisões do proprietário.
3. Preserve a arquitetura, os fluxos e as integrações atuais. Não executar migração, reescrita, publicação, alteração de contas ou mudança de VPS por iniciativa de um agente ou comando autônomo.
4. Corrija código localmente primeiro. Defina critérios de aceite e verificações do fluxo afetado; valide localmente antes de sincronizar frontend/API/VPS conforme a camada responsável.
5. Depois da sincronização aplicável, confira o fluxo no site oficial e registre neste runbook a causa, a mudança, os testes e o estado final. Atualize as especificações do Reversa para refletir comportamento novo somente após ele estar confirmado.

Para alterações apenas visuais, combine o processo de especificação do Reversa com as skills de design pertinentes. Não carregar agentes ou skills sem relação com a tarefa.

### Reversa instalado no código local do site (27/11/2026)

- Instalado Reversa `1.3.6` para Codex em `01-codigo-fonte-projeto/persona-studio`. O instalador colocou os agentes em `.agents/skills/`, registrou o projeto em `.reversa/` e definiu `_reversa_sdd/` como pasta de especificações. A instalação não atualiza o site oficial nem altera a VPS.
- Foram instalados 78 agentes/skills do pacote, incluindo descoberta, evolução de funcionalidades, diagnóstico de bugs, qualidade de código e Impeccable para front-end. Usar somente os pertinentes à tarefa.
- Comando inicial no projeto: `reversa`. Para avançar uma funcionalidade especificada: `reversa-forward`; para registrar e investigar um defeito: `reversa-debugger`; para auditar/polir interface: `impeccable`.
- A configuração inicial foi restritiva. Em 27/11/2026, o proprietário habilitou `allowLegacyEdits: true` com caminhos explícitos apenas para `server/routes/studio.ts`, `server/routes/viral.ts`, `server/routes/aiUgc.ts`, `server/index.ts`, `server/videoJobWorker.ts`, `server/credits.ts` e `supabase/migrations/*.sql`. A configuração libera somente esses arquivos; não libera publicação nem alterações na VPS.
- O `AGENTS.md` criado pelo Reversa reforça que arquivos fora das pastas próprias não devem ser editados pelo framework. O `AGENTS.md` superior e este runbook continuam contendo as regras FUTURO DIGITAL: consultar runbook primeiro, preservar a estrutura e validar localmente antes de sincronizar.
- Para iniciar a descoberta do sistema existente, o Reversa pede nível de documentação depois do mapeamento inicial do Scout. A escolha deve ser feita pelo proprietário antes das fases mais profundas. Não usar `reversa-migrate` para este site, pois o objetivo é evoluir a estrutura existente.

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

### 2026-11-25 — causa da marca d’água confirmada na VPS

- A inspeção por RDP confirmou que o checkout ativo `C:\site` está no commit `81bf83c`. A função `isOwnerUser` lê `process.env.OWNER_USER_ID` de forma síncrona, e as rotas também a chamam de forma síncrona. O site identifica a conta DONO pelo plano `unlimited`; essa divergência explica por que as criações dessa conta podem não receber a marca.
- A logo `C:\site\server\assets\marca-dagua.png` existe. O código local atual já corrige o critério para consultar `profiles.plan === 'unlimited'` e aguardar essa consulta nas rotas de Avatar, UGC e recriação de vídeo.
- A conta API apresentou dois processos Node (`6820` e `6508`) com PowerShell pai; o teste de busca por uma tarefa chamada exatamente `Futuro Digital - API Node` não encontrou tarefa. A instância de API em console e o motor Rust não foram interrompidos.
- Tentativa de escrita pela janela PowerShell sem elevação foi negada. Foi criado somente o backup `C:\site\server\watermark.ts.pre-watermark-20261125-232212`; nenhum arquivo ativo foi alterado. A tentativa de abrir novo PowerShell administrativo foi cancelada no UAC, portanto a correção ainda não está aplicada nem testada na VPS.
- Próximo passo seguro: com a autorização de elevação confirmada no UAC, aplicar somente os ajustes de detecção do plano em `server/watermark.ts` e nos pontos correspondentes de `server/routes/avatars.ts`, `server/routes/aiUgc.ts` e `server/routes/projects.ts`, salvando backup de cada arquivo. Fazer typecheck, reiniciar apenas a API, confirmar `/api/health` e verificar uma imagem DONO no site oficial. Não reiniciar nem alterar o motor Rust.

### 2026-11-25 — navegação entre mídias geradas do Avatar

- O visualizador de imagens e o de vídeos gerados recebeu setas anterior/próxima, com posição atual/total e limites desativados nas extremidades. A navegação usa os itens carregados na galeria; vídeos são filtrados para resultados concluídos com arquivo disponível.
- Publicação oficial confirmada pela Vercel: deployment de produção `Ready`, commit `8d0b7eb` (`add previous and next controls to avatar media viewer`), domínio `www.futurodigitalai.com.br`.
- Verificação real no Chrome do site oficial, sessão DONO: visualizador de vídeo exibiu as setas e mudou de `9/16` para `10/16` ao clicar em “Próximo vídeo”; visualizador de imagem mudou de `1/19` para `2/19` ao clicar em “Próxima imagem”. Nenhuma geração ou crédito foi consumido nessa validação.
- Nova tentativa de consulta SSH à VPS para aplicar o ajuste de marca-d’água retornou `Permission denied (publickey,password,keyboard-interactive)`. Nenhuma alteração foi feita na VPS. A correção do frontend está publicada; a causa da marca-d’água já está localizada no desencontro entre a versão atual do repositório e a API antiga ativa, mas o deploy da API e a geração de conferência continuam pendentes até recuperar acesso administrativo autorizado. Não pedir nem registrar chave privada no chat.
- O código está publicado e a navegação foi verificada ao vivo no domínio oficial; resta apenas observar o comportamento com mais itens carregados além da lista atual.
- Ajuste visual/teclado (2026-11-25): padronizado o palco de imagem e vídeo em altura responsiva fixa, com `object-contain`, setas ancoradas ao centro do palco e coluna de detalhes rolável independente. `ArrowLeft`/`ArrowRight` navegam no modal, exceto quando o foco está em campo editável. Build local (`tsc --noEmit` + Vite) aprovado. Produção confirmada na Vercel como `Ready`, deployment `8jGWxvGKhBjQsrpo5CJhvX2DeRKh`, commit `5f07ccb`.
- Teste real em `https://www.futurodigitalai.com.br/avatars?media=images`, sessão DONO: botão “Próxima imagem” avançou de `1/19` para `2/19`; tecla `ArrowRight` avançou para `3/19` e `ArrowLeft` voltou para `2/19`. Nenhuma geração/crédito foi consumido.
- Teste real da navegação de vídeo: abriu um modal com `1/16`; botão “Próximo vídeo” avançou para `2/16`, `ArrowRight` para `3/16` e `ArrowLeft` retornou. O item testado mostrou “Não foi possível abrir a mídia” no player; a navegação e contagem responderam, mas este arquivo de vídeo não serviu para validar reprodução.

### 2026-11-25 — habilidade de prompt em “Monte seu Personagem”

- Implementação local em `src/features/avatars/AttributePanel.tsx`: o modal “Monte seu Personagem” agora traz a descrição livre com a ação “Montar prompt” e, logo abaixo, “Mundo do personagem”. Os exemplos antigos foram removidos. O texto só é gravado no estado do Avatar ao clicar em “Salvar”; cancelar descarta os rascunhos.
- A ação chama `POST /api/prompt/enhance-character`, não debita créditos e usa o Hust/Argon quando configurado. A skill combina a ideia escrita com os atributos selecionados, usa o mundo só como contexto secundário e mantém a identidade da foto base por padrão, permitindo transformação explícita.
- O construtor de prompt de imagem recebeu regras de coerência visual e evita impor o acabamento fotorealista quando o tipo de personagem ou a descrição pede ilustração/animação.
- `npm run build` passou localmente em 2026-11-25 (TypeScript + Vite). O Vite emitiu o aviso já conhecido: Node 22.11.0 está abaixo do mínimo recomendado 22.12+, mas o build concluiu.
- **Não publicar somente o frontend:** o domínio encaminha `/api` para Node em `C:\site` na VPS; sem a nova rota `enhance-character`, o botão responderia com erro. O checkout da VPS diverge do Git local. A tentativa SSH desta sessão (`Administrator@217.77.5.101`) foi recusada antes da autenticação (`connect to host ... port 22: Permission denied`), então não confirma nem descarta problema de chave. Nenhuma alteração foi feita na VPS ou na produção nesta implementação.
- Próximo passo para publicar: alinhar primeiro os arquivos `server/app.ts`, `server/gemini.ts`, `shared/contracts.ts` e `shared/avatarPrompt.ts` na API VPS, preservando as divergências existentes; validar a rota sem gerar mídia; só então publicar o frontend pela Vercel e confirmar a ação na página Avatar oficial. O documento-base da skill ainda não foi enviado; incorporar as regras específicas dele quando chegar.

### 2026-11-25 — ação Recriar nas imagens geradas do Avatar

- Sintoma: a ação “Recriar” estava disponível no detalhe da imagem, mas não aparecia no cartão da galeria como já aparece nos cartões de vídeo.
- Correção: cada imagem gerada agora mostra “Recriar” no canto superior esquerdo ao passar o mouse (e ao focar por teclado). Ao clicar, restaura no painel as características, a proporção e o enquadramento usados naquela imagem e informa que a pessoa pode ajustar e gerar novamente.
- A ação não chama a API de geração nem debita créditos; a nova geração só começa quando a pessoa usa o botão GERAR do canvas. A lixeira continua no canto superior direito.
- Build local (`npm run build`) aprovado. O Vite avisou que Node 22.11 está abaixo do mínimo recomendado `22.12+`, mas o build terminou com sucesso. A publicação e a conferência visual no site oficial ainda precisam ser confirmadas.

### 2026-11-25 — tentativa real da skill “Monte seu Personagem” no ambiente local

- A interface foi aberta em `http://localhost:5178/avatars`, uma prévia local sem sessão autenticada; o modal e o botão “Montar prompt” foram acionados com um briefing de teste. A chamada retornou `Erro 502 no servidor`, portanto não houve resposta do LLM nem geração de mídia/crédito.
- Diagnóstico somente de leitura: `127.0.0.1:8787/api/health` expirou após 15 segundos; `127.0.0.1:31416/v1/models` recusou conexão. O processo na porta `8787` era Node do workspace `publicacao-site`, mas não respondeu ao health. O motor Hust/Flow não estava escutando localmente.
- Conclusão: o 502 foi causado pelo backend local sem resposta; a indisponibilidade do Hust/Flow também impede a rota de usar Argon. A tela em modo visitante não valida autenticação nem uma execução real do Argon. Não declarar a skill validada.
- Próximo passo: restaurar primeiro a stack local conforme `01-codigo-fonte-projeto/persona-studio/docs/solucao-problemas-local-hust-flow.md`; confirmar `/api/health` e `/v1/models` em 200, entrar na sessão autenticada correta e repetir “Montar prompt”. Depois disso, validar a resposta editável antes de qualquer geração de imagem.

### 2026-11-25 — reteste real e comparação com o domínio oficial

- Reteste pelo Chrome em `http://localhost:5178/avatars`: preenchi “Monte seu Personagem” com uma descrição de personagem fantástico e cliquei em “Montar prompt”. A interface retornou novamente `Erro 502 no servidor`; nenhum crédito ou mídia foi gerado.
- Causa imediata do 502 local: o Vite encaminha `/api` para `http://127.0.0.1:8787`, mas não há backend local respondendo nessa porta. O `.env` do clone aberto não está presente; a configuração local documentada aponta o motor para loopback, não para a VPS.
- Verificação real no navegador do health oficial `https://api.futurodigitalai.com.br/api/health`: respondeu `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`. A stack oficial está saudável; não é necessário reiniciá-la por causa deste 502 local.
- Verificação real de `https://futurodigitalai.com.br/avatars`: o modal ainda é o antigo “Mundo do personagem”, com exemplos e sem “Montar prompt”. Assim, a versão da skill desta branch ainda não foi publicada no domínio oficial; este domínio não permite testar a nova ação ainda.
- Checagem adicional gratuita no domínio oficial, em uma aba separada: “Melhorar” no canvas concluiu em cerca de 15 segundos e reescreveu o texto de teste. A aba de teste foi fechada; o rascunho original da aba DONO permaneceu intacto. Isso confirma que o motor de texto oficial funciona, mas não valida a nova rota/skill de personagem.
- Para validar a skill no caminho oficial, a rota autenticada `/api/prompt/enhance-character` e seus arquivos de backend precisam ser aplicados primeiro no checkout VPS `C:\site`, preservando diferenças, e só depois publicar o frontend Vercel correspondente. Não publicar apenas a tela. Nenhuma mudança de produção foi feita neste reteste.
- Continuação autorizada: o proprietário autorizou uma chave SSH temporária para viabilizar o deploy. O SSH continuou retornando `Permission denied (publickey,password,keyboard-interactive)`, e o par temporário foi removido sem instalar a chave na VPS. A sessão RDP não foi modificada; a rota e o frontend continuam pendentes de sincronização. Não reiniciar a API nem publicar o frontend até haver um canal de deploy autorizado funcional.

### 2026-11-25 — preparação da sincronização da skill de personagem

- `npm test` local passou: 7 arquivos e 46 testes. O `npm run build` da implementação também já havia passado.
- Confirmei novamente que o endpoint oficial `/api/health` está saudável, mas a tela oficial ainda não contém a nova interface; health verde não confirma a rota nova.
- No RDP da VPS, `C:\ProgramData\ssh\administrators_authorized_keys` existe, mas o Windows negou leitura/edição pelo Explorer/Notepad sem elevação. O menu de contexto de Notepad mostra “Run as administrator”. A chave SSH temporária não foi instalada e não há chave privada temporária remanescente em `.codex-ssh-temp` local.
- Bloqueio atual confirmado: falta elevar o editor para atualizar `administrators_authorized_keys`. Não contornar UAC nem alterar permissões do sistema. A aprovação do usuário para usar uma chave temporária permanece, mas um operador precisa aceitar manualmente a solicitação UAC na VPS; depois disso, instalar a chave temporária, sincronizar apenas os arquivos necessários com backup, validar a rota antes de publicar o frontend e remover a chave ao terminar.
- Não houve alteração na API de produção, no frontend publicado, em dados de assinantes ou em créditos nesta tentativa.

### 2026-11-25 — acesso SSH temporário, API persistente e rota de prompt de personagem

- O proprietário abriu `C:\ProgramData\ssh\administrators_authorized_keys` no Notepad elevado e salvou uma chave pública temporária com o comentário `codex-vps-access-temp`. A chave existente foi preservada. O acesso `Administrator@217.77.5.101` foi confirmado por SSH (`whoami` → `vmi3766152\administrator`). A chave privada temporária ficou apenas em `.codex-ssh-temp\id_ed25519` neste workspace; removê-la ao concluir a sincronização e não registrá-la neste documento.
- Inventário antes da alteração: `C:\site` tinha mudanças locais em `server/gemini.ts`, `server/routes/aiUgc.ts`, `server/routes/avatars.ts`, `server/routes/projects.ts` e `server/watermark.ts`, além de binários FFmpeg e backups. Essas diferenças e artefatos foram preservados.
- Foram substituídos apenas `C:\site\server\app.ts`, `C:\site\server\gemini.ts` e `C:\site\shared\contracts.ts` para adicionar `POST /api/prompt/enhance-character`. Backups criados antes da troca: `*.pre-character-20261125`. No `gemini.ts`, a nova função foi inserida sobre a versão da VPS; as outras alterações locais desse arquivo foram mantidas. `npm run typecheck` passou dentro de `C:\site`.
- A tarefa existente `Futuro Digital - API Node` usa conta `SYSTEM`, gatilho `At system start up`, diretório `C:\site` e a entrada Node/tsx existente. Ela estava em `Ready` com resultado “a tarefa ainda não executou” e limite padrão de 72 horas. A configuração foi ajustada sem alterar ação, identidade ou gatilho: `ExecutionTimeLimit=PT0S` (sem limite), 5 reinícios com intervalo de 1 minuto, iniciar quando possível e ignorar instâncias duplicadas. A tarefa foi iniciada e está `Running`; `Stop Task If Runs` aparece `Disabled`.
- Após o reinício, `127.0.0.1:8787` voltou a escutar e o endpoint público `/api/health` respondeu `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`. Um POST sem autenticação para `/api/prompt/enhance-character` retornou HTTP 401, confirmando que a nova rota existe e continua protegida; esse teste não chamou o modelo nem consumiu créditos.
- Na cópia local, `npm run build` passou e `npm test` passou (7 arquivos, 46 testes). O aviso existente de Node 22.11.0 abaixo do recomendado pelo Vite (22.12+) permanece, mas não impediu build ou testes.
- Ainda pendente: publicar a interface local de “Monte seu Personagem” no domínio oficial, testar a ação autenticada no navegador e registrar a resposta real do Hust/Argon. Só então remover a chave SSH temporária e apagar `.codex-ssh-temp`. Não registrar token, cookie ou conteúdo de chave privada.

### 2026-11-25 — validação oficial da skill “Monte seu Personagem”

- A alteração foi publicada no commit `9b8471c` (`feat: add custom character prompt builder`). No Chrome autenticado como DONO, o domínio `https://www.futurodigitalai.com.br/avatars` mostrou o modal novo com descrição livre, “Montar prompt” e campo de mundo do personagem.
- Teste real gratuito: enviada a descrição de uma personagem fantástica adulta, com pele azul metálica, chifres de lua, olhos violeta, cabelo prateado curto e túnica roxa bordada. O botão “Montar prompt” retornou uma descrição visual estruturada que preservou esses atributos e acrescentou enquadramento, anatomia coerente, iluminação e materiais. A resposta apareceu no mesmo campo editável; nenhum link/URL indevido foi inserido.
- Saldo permaneceu em 8778 créditos antes e depois. Nenhuma imagem/vídeo foi gerado. O modal foi fechado sem salvar o personagem de teste, preservando os dados do usuário.
- Resultado: interface, rota autenticada e resposta do modelo estão funcionais no domínio oficial. A stack/API já estava saudável e o teste de registro de rota sem autenticação havia retornado 401, preservando proteção. A resposta real confirma que a rota alcança o serviço de texto; não foi necessário reiniciar serviço durante o teste.
- Pendência operacional: remover a linha SSH temporária identificada pelo comentário `codex-vps-access-temp` de `C:\ProgramData\ssh\administrators_authorized_keys`, preservar todas as demais chaves, verificar que o acesso temporário deixou de funcionar e então apagar `.codex-ssh-temp` local. A remoção foi autorizada pelo proprietário e deve ser feita ao final da sincronização.
- Regra geral de confiabilidade: antes de qualquer nova intervenção, consultar este runbook; corrigir/testar localmente quando aplicável; espelhar as mudanças necessárias na API VPS e no frontend oficial; confirmar health e fluxo real sem consumir crédito desnecessariamente; registrar causa, correção, evidência e pendências aqui. Para novos assinantes, priorizar recuperação automática, idempotência, estado de geração em tempo real, erros acionáveis e limites por fila, sem depender de janelas PowerShell abertas ou de intervenção manual diária.
- Limpeza concluída: removida exatamente uma linha com o comentário `codex-vps-access-temp`; a verificação informou duas linhas de chave restantes e não imprimiu seus conteúdos. A autenticação SSH com o par temporário passou a retornar `Permission denied`, confirmando que o acesso temporário foi revogado. A pasta local `.codex-ssh-temp` foi apagada após essa confirmação.

### 2026-11-25 — opções de personagem aplicadas ao mesmo sujeito na geração de imagem

- Sintoma relatado: selecionando tipo fantástico (ex.: inseto) junto de Masculino e Jovem, o resultado podia mostrar a criatura e uma pessoa masculina separada.
- Causa no código local: `shared/avatarPrompt.ts` achatava opções em frases separadas (`anthropomorphic insect character; man; in their twenties`). Essa lista deixava a relação entre gênero, idade e tipo ambígua para o modelo. A descrição personalizada também podia remover opções padrão sem checar se havia conflito real.
- Correção local: construir um perfil gramatical de sujeito único. Tipo, apresentação de gênero, faixa etária e demais atributos agora qualificam explicitamente o mesmo personagem; o prompt proíbe humano/modelo, acompanhante, duplicata ou segunda figura não solicitados. Opções padrão só são suprimidas quando a descrição personalizada as contradiz explicitamente.
- Verificação local: `npm run build` aprovado (`tsc --noEmit` + Vite). Aviso conhecido: Node 22.11.0, enquanto Vite recomenda 22.12+; não bloqueou o build. Não foi executada geração real nem debitado crédito neste passo.
- **Produção pendente nesta anotação:** `shared/avatarPrompt.ts` ainda precisa ser publicado no backend Node da VPS (`C:\site\shared\avatarPrompt.ts`), com backup prévio, verificação de tipo/health e confirmação pelo fluxo de imagem no site oficial. A publicação Git/Vercel do frontend não atualiza esse construtor executado pela API.

### 2026-11-25 — corrigir estilo caricatural em “Monte seu Personagem”

- Referência conferida no artigo do Manual de IA e nas capturas enviadas pelo proprietário. Palavras-chave estruturais: `photorealistic human proportions with exaggerated cartoonish features`, `funny, caricatured`, `high-detail realistic character render with caricature exaggeration`; traço assinatura descrito de forma concreta, por exemplo `gigantic hairstyle shaped like a giant twisted screw`. O exemplo do parafuso é só um modelo de redação, não deve ser copiado para personagens que não o pediram. A folha de referência multiângulo do artigo é opcional; o canvas Avatar pede uma imagem de personagem única por padrão.
- Causa da saída genérica: a instrução do endpoint `/api/prompt/enhance-character` exigia português e orientava não inventar exageros; simultaneamente recebia os atributos de início `realista/feminino/jovem`, e o prompt final do canvas ainda os combinava com a descrição customizada. Isso podia neutralizar a intenção fantástica/caricatural e introduzir “criadora de conteúdo” mesmo sem pedido.
- Correção local: o prompt da skill passou a usar inglês técnico e priorizar o briefing; em pedidos estranhos/fantásticos/caricaturais, deve usar as três frases-chave, destacar o traço assinatura e preservá-lo exatamente quando a pessoa indicar escala (p.ex., “pequeno”). Não deve converter o personagem em influencer genérico nem inventar o detalhe do exemplo do parafuso. A saída deve ser uma imagem de personagem única, salvo pedido explícito de folha de referência.
- No builder compartilhado, valores padrão inalterados (`realista/feminino/jovem`) agora são omitidos diante de uma descrição customizada, para não competir com ela. Os atributos que não são padrão continuam sendo respeitados. O limite do prompt passou de 800 para 1800 caracteres para não truncar a resposta e permitir editar/reutilizar o prompt.
- Verificação local: `npm test -- --run` aprovou 7 arquivos/47 testes; `npm run build` passou. O aviso conhecido de Node 22.11.0 abaixo do mínimo recomendado pelo Vite 22.12+ permanece não bloqueante.
- **Pendente para produção:** a correção está só no workspace neste momento. O proprietário autorizou instalar, usar e remover uma nova chave SSH temporária. A chave pública ainda não foi instalada: a tentativa SSH fora do sandbox alcançou a VPS, mas recebeu `Permission denied (publickey,password,keyboard-interactive)`. A tentativa de adicionar a chave pela sessão RDP não foi concluída; não houve alteração em `C:\ProgramData\ssh\administrators_authorized_keys`, na API VPS nem no site oficial. Não publicar apenas o frontend, porque o endpoint do modelo está na API da VPS. O próximo passo é abrir o Notepad elevado com o arquivo de chaves para que a chave pública temporária seja adicionada preservando todas as linhas existentes; então confirmar SSH, sincronizar os ajustes mínimos com backup e testar. Ao final retirar somente a linha identificada por `codex-vps-character-prompt-temp`, provar que a chave deixou de autenticar e apagar o par local.

### 2026-11-25 — validação adicional local do prompt caricatural

- Repetição de `npm test -- --run`: 7 arquivos e 47 testes aprovados.
- A tentativa de SSH por terminal fora do sandbox foi autorizada e chegou ao host, confirmando que o bloqueio atual não é a rede: a VPS rejeitou a chave porque a chave pública temporária ainda não está em `administrators_authorized_keys`.
- O primeiro par temporário foi apagado por segurança. Um novo par, com o mesmo comentário `codex-vps-character-prompt-temp`, está guardado no workspace aguardando a chave pública ser instalada pela sessão RDP; nenhuma chave foi instalada nem removida na VPS. Depois da sincronização e validação, revogar a linha e apagar o par local.

### 2026-11-25 — conclusão da sincronização do prompt caricatural

- A correção foi enviada para `main` nos commits `980714a` (código) e `5db41d7` (runbook). A Vercel reportou o deploy do commit `5db41d7` como concluído. O checkout local não está ligado ao projeto Vercel; `.vercel/output/builds.json` registra somente uma tentativa local antiga que falhou por `EPERM` ao criar symlink no Windows, não o resultado do build remoto.
- Na VPS, os ajustes mínimos de `server/gemini.ts` e `shared/contracts.ts` foram sincronizados com backups prévios. A tarefa existente `Futuro Digital - API Node` foi reiniciada; `/api/health` respondeu `ok: true`, motor Rust conectado e sem dependências ausentes.
- Teste real autenticado no domínio oficial: “Montar prompt” preservou os traços pedidos de uma personagem caricatural, aplicou as frases-chave (`photorealistic human proportions with exaggerated cartoonish features`, `funny, caricatured`, `high-detail realistic character render with caricature exaggeration`) e criou um traço assinatura coerente. O resultado ficou editável; nenhum crédito foi debitado e nenhuma mídia foi gerada.
- A conferência visual após o deploy ainda mostrou o contador antigo `/800` no modal. Portanto, embora o status do deploy apareça como concluído, a atualização do frontend no domínio oficial **não está confirmada**. Próxima checagem: confirmar na Vercel que o deployment do commit `5db41d7` foi promovido para Production e depois conferir o bundle servido no domínio.
- A chave SSH temporária identificada por `codex-vps-character-prompt-temp` foi removida de `C:\ProgramData\ssh\administrators_authorized_keys`, preservando a chave permanente. A tentativa SSH com o par temporário foi recusada após a remoção. O par privado e scripts locais temporários foram apagados do workspace.
- Esta seção substitui as pendências contraditórias das tentativas anteriores deste runbook: a API foi sincronizada e testada; não é necessário reinstalar a chave para essa parte. A pendência restante é somente confirmar/promover a atualização do frontend na Vercel.
- Retificação da evidência de revogação: a linha temporária foi visualmente removida e salva no Notepad elevado, mas a tentativa SSH local retornou `connect to host ... port 22: Permission denied` antes da autenticação. Assim, o arquivo salvo confirma a remoção; o teste SSH não confirma rejeição pelo servidor.

### 2026-11-25 — confirmação final do frontend oficial

- Após recarregar o Chrome sem cache, o domínio oficial abriu o modal com `0/1800`; a galeria carregou novamente com 25 imagens, 10 vídeos e saldo de 8774 créditos. O HTML de produção apontou para `/assets/index-BQyRtNpC.js`; esse bundle público contém `maxLength:1800` e o contador `/1800`, sem o antigo `/800`. Isso confirma que a versão corrigida está servida no domínio Production; a visualização anterior em `/800` era conteúdo antigo em cache.
- Novo teste real autenticado de “Montar prompt”: descrição com personagem masculino caricatural de pele verde-menta, nariz curvo, sobrancelhas grandes e cabelo vermelho em chama. O Hust/Argon devolveu 1261 caracteres em inglês, manteve os quatro traços pedidos, incluiu as três frases estruturais da referência e destacou o cabelo em forma de chama. O botão exibiu “Nenhum crédito foi consumido”; saldo continuou em 8774. O modal foi cancelado, sem salvar o rascunho e sem gerar imagem.
- Limpeza VPS final: conexão SSH pela chave permanente `vps_access_ed25519` funcionou. Removidos de `C:\site` os arquivos temporários `patch-character-prompt.js`, `patch-character-prompt.mjs` e `restart-api.ps1`; `Test-Path` retornou `False` para os três. Backups da API foram mantidos.
- A linha da chave temporária continua removida e salva no arquivo autorizado; a chave permanente foi preservada. O par privado temporário local já havia sido apagado. A observação de que a verificação SSH temporária não chegou a autenticar permanece válida.
- Estado final deste fluxo: código e runbook no GitHub; API VPS saudável; frontend oficial confirmado com limite de 1800; teste real concluído sem crédito e sem mídia; nenhum rascunho de teste salvo; arquivos auxiliares removidos.

### 2026-11-25 — corrigir perda de foco e travamento ao digitar em “Monte seu Personagem”

- Causa encontrada no frontend: os rascunhos das duas caixas de texto estavam no `AttributePanel`, um painel grande conectado ao estado global do Avatar. Cada tecla atualizava esse painel. Além disso, o `onClose` inline mudava de identidade a cada render; o efeito do `Modal` era recriado, devolvia o foco ao elemento anterior e focava o diálogo novamente durante a digitação. Essa combinação causava perda de foco e sensação de congelamento.
- Correção: mover estado das caixas e ação “Montar prompt” para `CharacterBuilderModal`, isolado do painel de atributos; manter subscriptions Zustand somente aos dados necessários; no componente `Modal`, guardar o `onClose` atualizado em ref e executar o efeito de foco/teclado apenas quando `open` muda. Isso preserva foco durante a edição e evita rerender do painel por tecla digitada.
- Regressão E2E adicionada: digita `bz` tecla por tecla e verifica valor e foco no textarea. A suíte completa E2E local passou com 97 verificações e 0 falhas. O primeiro teste havia parado posteriormente por um seletor ambíguo de `GERANDO IMAGEM…`; o teste passou a consultar o texto dentro do botão de geração, preservando os asserts das duas imagens em fila. `npm test` passou (47 testes); `npm run build` passou. Aviso não bloqueante conhecido: Node 22.11.0 abaixo do mínimo recomendado pelo Vite (22.12+).
- Verificação oficial após o push: `https://www.futurodigitalai.com.br/avatars?media=images` retornou HTTP 200 e passou a servir `/assets/index-BHwIzbnq.js`, diferente do bundle anterior (`index-BQyRtNpC.js`); o JS público inclui os textos do fluxo `Monte seu Personagem`. Isso confirma o frontend novo no domínio Production.
- Tentativa de teste de teclado na janela oficial: o modal foi aberto e o textarea focado; a ferramenta detectou entrada concorrente na janela e interrompeu a digitação de teste após o primeiro caractere. O rascunho não foi salvo; não foi acionado “Montar prompt”, “Salvar” ou “Gerar”, portanto nenhum crédito ou mídia foi consumido. A checagem real de digitação em produção continua pendente; os 97 E2E aprovados são a evidência automatizada, não substituem essa conferência manual.
- Esta correção é de frontend; não requer reinício ou alteração da API VPS. O commit `2134cb7` foi enviado para `main`, e o novo bundle oficial foi confirmado. Não declarar fluidez total de todo o site apenas com esta correção; ela resolve a causa rastreada no modal e a suíte regressiva do site passou. Para a prova final de digitação na produção, retomar quando o Chrome estiver sem entrada concorrente, confirmar foco/valor após uma sequência tecla por tecla e cancelar o modal sem salvar.

### 2026-11-26 — site oficial sem galeria e geração retornando 502

- Sintoma observado no Chrome oficial autenticado como `DONO`: a página `/avatars` abria, mas a galeria dinâmica inicialmente aparecia vazia; uma tentativa de geração falhou com 502 e não debitou créditos.
- Diagnóstico na VPS via SSH permanente: `http://127.0.0.1:8787/api/health` respondeu `ok: true`, `engine: rust`, `motorConnected: true`; porém `https://api.futurodigitalai.com.br/api/health`, consultado de dentro da própria VPS, recusou a conexão. `netstat` não mostrava listener TCP em `443`; `sc query Caddy` confirmou que Caddy não está instalado como serviço Windows. A tarefa agendada existente `Futuro Digital - Caddy` estava `Ready`, sem processo Caddy ativo.
- Causa confirmada: a tarefa existente do Caddy não estava em execução, deixando a porta HTTPS pública fechada. A página estática da Vercel abria, mas as chamadas de dados/geração para a API não conseguiam chegar ao backend. As duas tentativas de imagem durante esse estado não chegaram ao motor Flow; portanto, nenhuma conta Google Flow foi usada nelas.
- Correção aplicada: iniciado, sem alterar sua configuração, a tarefa já existente `Futuro Digital - Caddy`. Depois disso, o PID `2700` passou a escutar em `0.0.0.0:443` e `[::]:443`; o health público respondeu HTTP 200 via Caddy com o motor conectado.
- Teste real após a correção: reabrir a rota oficial carregou a galeria `Meus Avatares` com 34 itens (incluindo os personagens `Pássaro · Heterocromia` e `Órgão animado · Azul`). Foram concluídas as três imagens restantes do lote: `Roedor · Âmbar`, `Mão desenhando · Heterocromia` e `Vovó/Vovô · Verde`; as três apareceram em `Imagens geradas`, sem erro. O saldo foi de 8.748 para 8.742 (6 créditos pelas três imagens); no lote completo de cinco, o saldo foi de 8.752 para 8.742 (10 créditos). A galeria terminou com 37 avatares.
- Contas Flow verificadas: `conta_1` e `conta_2` habilitadas com bearer; `conta_3` habilitada, porém sem bearer. O backend de imagem ativo em `C:\site\server\gemini.ts` envia o modelo `google_flow`, sem fixar `account_id`; o motor seleciona dentro do pool habilitado. O resultado do motor não informa qual conta atendeu a geração concluída; portanto, não registrar `conta_1` ou `conta_2` como a conta efetivamente usada. Não houve troca de conta porque a causa foi a indisponibilidade do Caddy, e ambas as contas autenticadas permaneciam habilitadas.
- Prevenção pendente: a tarefa de início do sistema para Caddy consta na configuração documentada, mas não estava ativa nesta sessão. Verificar o resultado da tarefa e a porta `443` após a próxima inicialização da VPS; não afirmar que o auto-start está validado por reboot apenas por este início manual.

### 2026-11-26 — montar mundo do personagem e rótulos legados em português

- Pedido: adicionar no modal “Monte seu Personagem” uma ação para gerar o Mundo do personagem com ambiente típico, rotina e paleta de cores, considerando a descrição e atributos selecionados.
- Implementação local: adicionado `POST /api/prompt/enhance-character-world`, protegido pela autenticação existente, sem cobrança de créditos. A skill orienta o motor Argon a escrever 3–5 frases editáveis em português brasileiro, descrever cenário coerente e paleta de 3–5 cores sem alterar a identidade do personagem nem acrescentar um segundo sujeito. O campo continua editável e só é salvo no Avatar ao apertar “Salvar”.
- Interface: botão “Montar mundo” abaixo do campo, com estado de carregamento e contador/custo zero; aceita personagem digitado ou atributos selecionados.
- Cards legados: rótulos guardados em inglês “Brazilian female violinist” e “Brazilian lighthouse keeper” agora são exibidos como “Violinista brasileira” e “Faroleiro brasileiro” mesmo em registros antigos.
- Verificação local: `npm run build` aprovado (TypeScript e Vite). Permanece o aviso não bloqueante de Node 22.11.0 abaixo do recomendado pelo Vite (22.12+).
- Sincronização concluída em `C:\site`: aplicado somente o endpoint/schema novo e a função `enhanceCharacterWorld` sobre os arquivos atuais da VPS, preservando as diferenças de produção existentes em `gemini.ts`. Backup confirmado em `C:\site\backups\avatar-world-20261126-195100`.
- O SSH permanente já autorizado (`..\vps_access_ed25519`) funcionou, então a chave temporária criada para esta sessão não foi instalada no servidor. Seu par local foi zerado e removido ao final. O endpoint sem sessão respondeu `401` nos caminhos localhost, API pública e domínio oficial, confirmando que a rota continua protegida por login.
- O primeiro teste autenticado no site retornou 404 porque o processo ativo ainda estava servindo o código antigo. Reiniciei somente a tarefa existente `Futuro Digital - API Node`; ela ficou `Running`, e `/api/health` voltou `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`.
- O commit `c0271ae` foi enviado para `main`, acionando a publicação do frontend. No Chrome oficial autenticado como DONO, o modal exibiu o botão `Montar mundo`. O teste real autenticado gerou uma descrição em português brasileiro, com ambiente de apresentação musical coerente com a violinista/globo de neve e paleta de esmeralda, âmbar, mogno e latão. O campo marcou `sem custo em créditos`; o saldo permaneceu em 8.702. O resultado era um rascunho editável e o modal foi cancelado, sem salvar.
- No reteste, a galeria exibiu o nome legado `Faroleiro brasileiro` em português. A atualização também preservou o foco da edição e o valor anterior salvo do personagem porque o modal foi fechado com `Cancelar`.

### 2026-11-26 — miniatura do tipo de personagem na geração de imagem

- Sintoma relatado: com `Bebê animado` selecionado, a geração ainda parecia seguir a foto de um homem adulto e ignorar a imagem de referência do tipo.
- Causa confirmada no código: as imagens das opções do painel eram apenas miniaturas da interface; `useGenerateAvatar` não as incluía no pedido. Ao mesmo tempo, uma foto/avatar-base ativo era enviado ao motor com instrução forte para preservar a pessoa. A idade padrão `Jovem (18–29)` também competia com o tipo Bebê.
- Correção local: o canvas agora envia a miniatura do tipo escolhido como `characterStyleReference`, separada da identidade, das referências do usuário e do produto. O backend a descreve explicitamente como guia de estilo/proporção para o mesmo personagem, registra seu nome nos parâmetros da geração e a mostra em “Referências” nos detalhes. As instruções de foto base permitem as transformações pedidas pelos atributos sem criar um segundo sujeito. Ao selecionar Bebê animado, a idade padrão Jovem é retirada do perfil final.
- Cartões de geração: o teste visual da sessão mostrou dois cartões “Gerando imagem…” enquanto o indicador estava em `2/4` e o saldo passou de 8.694 para 8.690. Isso confirma que os placeholders de processamento estavam visíveis durante aquela fila. O conteúdo final naturalmente só substitui o placeholder quando a API devolve e salva a imagem. Um clique de inspeção no browser iniciou essa fila de duas imagens sem intenção; não foram feitos outros cliques de geração depois disso.
- Verificação local desta correção: `npm run build` aprovado e `npm test` aprovado com 8 arquivos/52 testes. O aviso conhecido de Node 22.11.0 abaixo do recomendado pelo Vite (22.12+) não bloqueou o build.
- Diagnóstico no teste real: após o hard reload, o site oficial passou a enviar a miniatura de `Bebê animado` e a exibir essa referência ao assinante. Mesmo assim, o prompt salvo em “Monte seu Personagem” dizia “male character”, “lean”, “broad shoulders” e “narrow waist”. A descrição contraditória seguia sendo enviada por inteiro, e uma regra geral permitia que ela anulasse as opções selecionadas; isso explicava o adulto recorrente.
- Correção adicional: para `bebe-animado`, o construtor remove cláusulas explícitas de idade/gênero/anatomia adulta da descrição técnica, mantém cláusulas compatíveis (por exemplo, estilo e roupa), e acrescenta uma restrição direta de bebê animado como único sujeito. Nas demais categorias, o texto personalizado permanece inalterado. A prioridade agora é sempre do tipo selecionado quando ele conflita com um detalhe de anatomia da descrição.
- Interface oficial: abaixo do envio de foto aparece um cartão visível “Referência de estilo: Bebê animado”. A miniatura é enviada automaticamente como guia separado; a foto base enviada pela pessoa continua independente e não é substituída.
- Verificação local: 18 testes de `avatarPrompt.test.ts` passaram; `npm run build` passou (TypeScript + Vite). Aviso não bloqueante conhecido: Node 22.11.0 está abaixo do mínimo recomendado pelo Vite 8.3 (22.12+).
- Publicação: commit `849851c` enviado para `main`; o domínio oficial serviu o bundle novo, que contém o cartão de referência selecionada. Na VPS, o arquivo `shared/avatarPrompt.ts` foi copiado após backup em `C:\site\backups\avatar-baby-reference-20261126-2106`; `npm run typecheck` passou; somente a tarefa existente `Futuro Digital - API Node` foi reiniciada. O health local e público retornou HTTP 200, `ok: true`, motor Rust conectado e `missing: []`.
- Diagnóstico no Chrome oficial: a segunda geração devolveu `Erro ao gerar imagem nos Motores ('google_flow'): ... PUBLIC_ERROR_UNSAFE_GENERATION ... SafetyBlockedException ... INVALID_ARGUMENT`, conta `conta_1`. O cartão de processamento sumiu, a galeria ficou em 46 itens e o saldo em 8.678; o serviço estornou/não manteve débito. A causa operacional desta tentativa é o bloqueio de segurança do Google Flow, não a ausência da miniatura. A API do Gemini documenta proteções integradas para danos envolvendo crianças que não são substituídas pelas configurações usuais de safety ([documentação oficial](https://ai.google.dev/gemini-api/docs/safety-settings)).
- Ajuste seguro seguinte: para “Bebê animado”, substituir o tratamento fotorrealista/caricatural por ilustração 3D claramente fictícia, de mascote infantil totalmente vestido e apropriado para todas as idades; remover termos de anatomia adulta da descrição. Isso clarifica o conteúdo benigno, não desativa nem tenta contornar o filtro. O build e os 18 testes unitários do construtor passaram depois desse ajuste.
- Correção final implantada: prompt de mascote bebê ilustrado enviado à VPS com backup em `C:\site\backups\avatar-baby-safety-20261126-2119`; `npm run typecheck` passou; somente `Futuro Digital - API Node` foi reiniciada e permaneceu `Running`; health local e público retornou HTTP 200 com Hust/Rust conectado.
- Teste real final no Chrome oficial: duas tentativas com o prompt anterior foram bloqueadas por `PUBLIC_ERROR_UNSAFE_GENERATION` e não alteraram o saldo. Após o ajuste seguro (ilustração 3D explicitamente fictícia, sem fotorrealismo, bebê totalmente vestido), uma geração foi concluída. A galeria passou de 46 para 47 e o saldo de 8.678 para 8.676 (2 créditos). A imagem aprovada visualmente é um único menino bebê em estilo 3D, roupa infantil e cenário de estúdio. O modal de detalhes mostra a regra “Bebê animado” e “Referência visual de estilo” para a miniatura anexada; o cartão de referência também permanece visível no painel, separado da foto base.
- Resultado: a referência visual e as opções de tipo já influenciam a imagem no fluxo oficial. Não desativar os filtros de segurança; manter a formulação infantil estilizada e totalmente vestida para essa categoria. Os dois bloqueios anteriores não tiveram débito líquido.

### 2026-11-26 — prioridade do briefing e híbrido com referência visual

- Pedido: “Monte seu Personagem” deve ter maior peso; referências de tipo e imagens anexadas devem contribuir características para o mesmo personagem híbrido, sem substituir o briefing.
- Diagnóstico confirmado no site oficial: uma geração com `Cacique` preservou o personagem 3D casual do briefing, mas ignorou o cocar da miniatura. A ficha da geração guardava `referencia-estilo-cacique.jpg`; portanto, não era problema de seleção do cartão nem ausência do arquivo. O prompt salvo e o wrapper do motor se contradiziam: o construtor podia mandar ignorar detalhes em conflito, enquanto o wrapper anterior declarava que a referência visual definia aparência/categoria. Além disso, o perfil do tipo continha apenas o rótulo “Cacique”, sem descrever em texto o cocar.
- Correção: `shared/avatarPrompt.ts` agora dá prioridade explícita ao briefing de “Monte seu Personagem”, descreve semanticamente em português os 24 tipos selecionáveis e exige incorporar características visuais compatíveis da miniatura no mesmo sujeito. `server/routes/avatars.ts` classifica referências anexadas como fontes complementares de traços híbridos, mantendo a foto base e o produto em papéis separados. `server/rustMotor.ts` repete a mesma hierarquia multimodal enviada ao Hust/Flow, removendo a contradição.
- Verificação local: `npm.cmd run test -- tests/unit/avatarPrompt.test.ts tests/unit/rustMotorQueue.test.ts` aprovado (25 testes); `npm.cmd run build` aprovado. Aviso conhecido: Node 22.11.0 é inferior à versão recomendada pelo Vite 8.3 (22.12+), mas não impediu build.
- Publicação: commit `ae061f3` enviado a `main`. Antes de sincronizar API, foram conferidas as alterações preexistentes em `C:\site`; os arquivos de produção foram preservados e alterados apenas nos trechos de referência. Backup confirmado em `C:\site\backups\character-reference-hybrid-20261126-1735`. `npm.cmd run typecheck` passou em `C:\site`; somente a tarefa existente `Futuro Digital - API Node` foi parada/iniciada; tarefa ficou `Running`; health local e público respondeu HTTP 200, `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`.
- Teste real inicial, antes do ajuste, no Chrome oficial como DONO: selecionado `Cacique`, referência visível e arquivo listado na ficha, mas resultado genérico sem cocar. Galeria 53→54; saldo 8.664→8.662 (2 créditos). A falha visual reproduziu o problema relatado.
- Reteste real, após sincronização e reinício da API: mesmo briefing salvo, uma imagem Nano Banana 2 no site oficial. Resultado híbrido bem-sucedido: preservou rosto, cabelo, proporções, roupa casual e estética 3D do briefing; incorporou um cocar grande de penas coloridas visivelmente baseado na miniatura; apareceu na galeria com o nome “Cacique”. Detalhes confirmaram o prompt atualizado e `referencia-estilo-cacique.jpg`. Galeria 54→55; saldo 8.662→8.660 (2 créditos). A aba oficial ficou aberta no resultado para inspeção.
- Conclusão limitada: este teste real confirma o comportamento para `Cacique` e a nova regra compartilhada. Os testes unitários cobrem a construção do prompt e os 24 tipos recebem descrição textual; a consistência visual dos outros 23 ainda deve ser medida com gerações individuais antes de afirmar que todos os estilos ficaram perfeitos.

### 2026-11-26 — fila do botão Validar influencer

- Sintoma: captura mostrava `Gerando…` com `2/4` na quantidade escolhida para o lote. A quantidade `2/4` é o lote selecionado, não a contagem da fila.
- Causa no frontend: `useGenerateAvatar()` retornava `busy` assim que qualquer imagem estava pendente e `AttributePanel` desabilitava o botão por `busy`. Além disso, `attributeRequestPendingRef` bloqueava outro lote mesmo havendo slots livres. Isso contrariava o limite de quatro imagens simultâneas.
- Correção local: removido o bloqueio exclusivo de lote; a reserva síncrona de slots continua impedindo ultrapassar quatro. `busy` agora só é verdadeiro quando `pendingImageRequests >= MAX_PENDING_IMAGE_REQUESTS`; até lá, o assinante pode enviar novos lotes e o hook reduz o lote ao espaço livre.
- Verificação no site oficial antes da publicação: não havia geração ativa; saldo DONO 8.656, galeria com 57 imagens e botão `Validar influencer` disponível. Nenhuma geração cobrada foi iniciada para investigar este estado.
- Build local tentado e bloqueado antes do TypeScript/Vite iniciar por `EPERM: operation not permitted, lstat C:\Users\Jonathan` no Node dentro do sandbox. A publicação pela Vercel deverá validar a compilação remota.
- Escopo: frontend apenas. Nenhuma alteração na API VPS.
- Observação de marca d’água: `server/assets/marca-dagua.png` tem transparência, e `server/watermark.ts` a sobrepõe sem placa opaca; partes da imagem gerada podem aparecer através das áreas transparentes, dando aparência de miniatura atrás da marca. Isso é transparência do overlay, não uma segunda aplicação do arquivo inteiro. Nenhuma alteração foi feita na marca nesta etapa.

### 2026-11-26 — imagem não pode sumir entre processamento e galeria

- Sintoma: o cartão provisório “Gerando imagem…” desaparecia por um intervalo e a imagem final só aparecia depois.
- Causa: `generate()` recebia os avatares salvos, chamava `bump()` para atualizar a galeria e, no `finally`, removia os cartões pendentes. A atualização de `useMyAvatars()` é assíncrona; por alguns instantes nenhum dos dois estados era exibido. O endpoint salva o avatar antes de concluir o registro da geração, então esse intervalo era puramente de sincronização visual.
- Correção local: `useGenerateAvatar` mantém os `AvatarDTO` recém-retornados como resultados otimistas. `GeneratedMediaTabs` os mescla à resposta do servidor, evita duplicar por ID e mantém o cartão final no lugar do placeholder até a busca da galeria confirmar o registro. Os resultados são exibidos imediatamente e o contador acompanha a lista mesclada.
- Escopo: frontend, sem mudanças na API da VPS ou cobrança. Nenhuma nova geração foi iniciada para reproduzir o intervalo.

### 2026-11-26 — cenários de personagem-fruta no Avatar

- Sintoma: personagens de frutas estavam aparecendo repetidamente em ambientes de criador de conteúdo/estúdio, embora o briefing pedisse personagens antropomórficos e deixasse o cenário coerente com eles.
- Causa: o construtor não tinha uma regra específica de direção de ambiente para frutas; uma instrução genérica de estilo não impedia a tendência do modelo de escolher cenário de influencer.
- Correção em `shared/avatarPrompt.ts`: prompt livre usa acabamento neutro, sem impor estética UGC. Quando a cena menciona fruta ou espécies comuns (morango, maçã, banana, uva, laranja, abacaxi, manga, pera, melancia, limão, cereja, pêssego, kiwi, coco, ameixa, goiaba, mamão ou abacate), a API instrui o motor a respeitar o local informado em “Mundo do personagem”/na cena; se estiver ausente, escolher local narrativo coerente (por exemplo, estufa/plantação de morango, pomar de maçã, feira/cozinha conforme o papel), variar entre novas criações e não usar automaticamente microfone, estúdio ou mesa de podcast.
- Publicação do código: commits `f8c7486` e `fc6ad3d` enviados a `main`. `npm run build` passou (TypeScript e Vite); aviso conhecido de Node 22.11.0 abaixo da recomendação do Vite (22.12+) não bloqueou o build.
- Sincronização da API VPS: backup anterior criado em `C:\site\backups\avatar-fruit-env-20261126`; `shared/avatarPrompt.ts` foi copiado para `C:\site\shared\avatarPrompt.ts`. SHA-256 local e remoto coincidem (`9c37ab89d0c2eb5b6840d867a93978e651dfda8c5edb44a9dfd13a6aa3111910`). `npm run typecheck` passou em `C:\site`.
- Reinicialização: somente a tarefa existente `Futuro Digital - API Node` foi reiniciada e retornou a `Running`. Health local da VPS e público responderam `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`.
- Validação: compilação e disponibilidade da API confirmadas. Nenhuma imagem real foi gerada neste passo; portanto, o resultado visual do novo ambiente ainda precisa ser confirmado numa próxima geração autorizada, que pode consumir créditos.

### 2026-11-26 — carregamento da galeria Avatar

- Teste real na sessão oficial DONO: em `/projects`, 24 projetos/19 concluídos apareceram após a navegação; em `/avatars`, a galeria mostrou 43 imagens e 11 vídeos. Ao atualizar Avatar, os cartões existentes permaneceram visíveis enquanto a página revalidava, e os mesmos totais continuaram disponíveis. Nenhuma geração ou crédito foi usado.
- Causa concreta de lentidão no caminho de imagens: `/api/avatars/gallery` emitia uma chamada `createSignedUrl` ao Storage para cada avatar (até 120 por resposta). A página também monta dois leitores simultâneos da lista do DONO (`GalleryTabs` e `GeneratedMediaTabs`), duplicando o GET inicial e o trabalho de assinatura.
- Correção local: assinar os caminhos em lote com `createSignedUrls` e compartilhar, por escopo e token da sessão, requisições concorrentes de `listAvatars` no frontend. Preserva o filtro privado/comunidade, TTL de 1 hora e tratamento individual de itens com URL inválida.
- Validação local: `npm run build` passou (TypeScript e Vite). O Vite emite o aviso já conhecido de que Node 22.11.0 está abaixo do mínimo 22.12.0, sem impedir o build.
- Publicação: commit `757f9c6` enviado para `main`. Como `C:\site` estava em `81bf83c` com alterações locais e backups não rastreados, não houve pull/reset. A rota atual foi baixada, comparada e atualizada isoladamente, preservando o restante do checkout. Backup anterior em `C:\site\backups\avatars.ts.pre-gallery-batch-20261126`; SHA-256 do backup `BEA66874DF143BFAE2B44B24E4AF316E31E3514A30F510D0B173B296C782FA17`; SHA-256 aplicado `4D5731BCF96DC943F1097481290CD35E7D894F1FE4F36CB2B5671638AFD5CE4A`. Arquivo temporário `.next` removido após confirmação.
- Verificação na VPS: `npm run typecheck` passou; somente a tarefa `Futuro Digital - API Node` foi reiniciada e voltou `Running`; health local e público responderam `ok: true`, `engine: rust`, `motorConnected: true`, `missing: []`.
- Reteste real após sincronização, com hard refresh no domínio oficial e sessão DONO: a aba Avatar carregou 43 imagens e 11 vídeos, com miniaturas visíveis em até 5 segundos após a captura de reload. Nenhuma geração foi disparada e nenhum crédito foi consumido. A otimização do endpoint foi confirmada funcional; comparação cronometrada antes/depois não foi instrumentada, então não registrar redução numérica de tempo.

### 2026-11-27 — Argon preserva o personagem e só define ambiente/roupa quando pedidos

- Requisito: o Argon deve tomar o personagem descrito no campo como fonte de verdade. Só pode especificar cenário/ambiente e figurino quando isso estiver escrito no campo; se o usuário omitir, deve deixá-los sem especificação. Se forem pedidos, deve respeitar os detalhes.
- Falha real encontrada no site oficial: depois que o Argon preenchia o campo, a edição manual desse campo não atualizava o texto-fonte usado na próxima chamada. Ao clicar em “Gerar outra ideia”, o site mandava o texto do template anterior, não o personagem digitado. A primeira geração seguinte a uma edição repetia também o conflito e o elenco do template antigo, portanto parecia ignorar o personagem.
- Correção no frontend (`src/features/avatars/AvatarTemplatesPanel.tsx`): qualquer edição do campo único agora atualiza também o texto-fonte da próxima chamada. Se o usuário não editar a sugestão, o botão continua gerando outra ideia a partir do template, evitando encadear o prompt anterior.
- Correção das instruções do Argon em `server/gemini.ts`: preservar espécie, identidade, traços, idade, gênero, papel, quantidade e relações escritos; skills e título do template não autorizam personagem extra nem cenário/roupa novos. Só acrescentar ambiente e roupas se pedidos explicitamente no campo; caso contrário, deixá-los neutros/indefinidos. Para imagem, descrever um instante sem câmera/duração/proporção; para vídeo, propor ação e câmera filmáveis sem inventar cenário/figurino. Atualizada também a orientação para variar conflito/ação em vez de inventar local e roupa.
- Build local: `npm.cmd run build` aprovado (TypeScript + Vite; 1890 módulos). Permanece o aviso conhecido de Node 22.11.0 abaixo do mínimo recomendado 22.12.0, sem impedir o build.
- Publicação: frontend commit `f7b5071` enviado a `main` e testado no domínio oficial `https://www.futurodigitalai.com.br/avatars`. Instruções backend commit `0ccd87b` enviadas a `main` e sincronizadas para a VPS.
- Bloqueio encontrado durante a primeira sincronização backend: a cópia `C:\site` não tinha `src/lib/directorSpeech.ts`, importado pelo `server/gemini.ts`; o typecheck falhou e o script fez rollback automático. Foi então sincronizado esse módulo de utilidade sem dependências e repetido o procedimento. Backup final preservado em `C:\site\backups\avatar-idea-user-only-setting-r2-20261126`; backup da tentativa anterior também preservado em `C:\site\backups\avatar-idea-user-only-setting-20261126`. No segundo procedimento, `npm.cmd run typecheck` passou, a tarefa `Futuro Digital - API Node` ficou Running e `/api/health` respondeu `ok: true`, `engine: rust`, `motorConnected: true`, sem dependências ausentes. Scripts e candidatos temporários foram removidos; backups mantidos.
- Testes reais gratuitos no site oficial como DONO: (1) modo vídeo com personagem único “pitaya amarela”, sem roupa nem ambiente; o Argon manteve a pitaya, olhos, formato, expressão e a ação da carta, sem inventar pessoas, cenário ou figurino. (2) modo imagem com uma pera roxa; manteve espécie, cor, folhas e olhos, deixando roupa/cenário sem especificação. (3) após editar a sugestão, novo pedido explícito por casaco amarelo, botas verdes, estufa antiga e chuva forte; o Argon usou corretamente esses elementos. O site exibiu confirmação “Nova ideia criada pelo Argon, sem consumir créditos”; saldo DONO permaneceu em 8.620 créditos. Nenhuma imagem ou vídeo pago foi gerado.
- Resultado: botão único visível e funcional nas bibliotecas de imagem e vídeo; prompt editado chega ao Argon; cenário e roupa ficam sob controle explícito do usuário. A variação continua sendo orientação do agente, não uma garantia matemática de que um modelo generativo nunca repita detalhes quando o usuário não fixa parâmetros.

### 2026-11-27 — correção do registro sobre a fila de vídeos

- **Correção importante:** a nota anterior desta seção descrevia uma implementação feita numa cópia antiga fora do repositório Git como se ela estivesse na versão atual. Conferi o repositório oficial `publicacao-site`: nele não existem `server/videoJobWorker.ts` nem `video_generation_jobs`, e a migration `0007_durable_video_jobs_and_idempotent_refunds.sql` também não existe. A única execução da geração de vídeo no código atual começa por `setImmediate` em `server/routes/aiUgc.ts`.
- Portanto, a fila durável e seus mecanismos de retomada/estorno **não estão implementados na versão atual nem ativos no site oficial**. Reiniciar o processo Node ainda pode interromper uma geração em andamento. Tratar essa melhoria separadamente, implementar localmente, testar em banco isolado e só depois publicar. A branch de desenvolvimento pode ter custo recorrente; não criar nem migrar produção sem autorização para esse custo e plano de validação.
- A observação anterior de que `server/veo.ts` e o contrato de vídeo foram corrigidos deve ser verificada contra a versão atual antes de ser tomada como evidência de comportamento da fila: os caminhos citados não implementam a persistência do job.

### 2026-11-27 — estado do Supabase antes da fila durável

- A conexão de leitura confirmou que o único projeto disponível, `meu-site-db`, está marcado como `main PRODUCTION` e saudável. Não há branches de desenvolvimento, não há migrações registradas no painel e o painel informa que não há backups. O banco contém dados reais (`profiles` 1, `credit_ledger` 226, `generations` 289, `avatars` 47); o esquema de `profiles`, `credit_ledger`, `generations` e `video_projects` é compatível com as tabelas-base exigidas pela migration 0007.
- Nenhuma alteração de esquema foi executada. A migration `0007_durable_video_jobs_and_idempotent_refunds.sql` continua local e pendente; não aplicar diretamente em `main PRODUCTION` sem aprovação explícita e plano de rollback/backup. Branch de teste precisa ser isolado e o custo confirmado antes de criar.
- **Bloqueio urgente confirmado no painel de uso:** organização no plano Free excedeu cota no ciclo anterior: egress 21,15/5 GB (423%) e cached egress 8,86/5 GB (177%). A tolerância termina em 28/11/2026; o painel alerta que requisições podem retornar HTTP 402 se as restrições forem aplicadas. Causa específica do tráfego ainda não foi rastreada. Não modificar plano/cobrança sem decisão do proprietário; investigar consumo por tráfego de API/Storage antes de atribuir causa.
- Estado inicial dos advisors naquele momento: `handle_new_user()` exposta para `anon`/`authenticated`, proteção de senha vazada desativada, 7 FKs sem índice e avisos de RLS; health advisor sem alertas. A situação da função foi corrigida em 27/11/2026, conforme a atualização mais recente ao final deste runbook. Os demais avisos seguem pendentes de análise/decisão.
- Próxima etapa: obter autorização do proprietário para consultar o custo de um branch de desenvolvimento no grupo Supabase mostrado; não criar branch nem aplicar migration até aprovação do custo. Depois reconstruir o esquema de teste usando as migrations locais ordenadas, validar 0007 e só então planejar a publicação.

### 2026-11-27 — investigação do egress e imagens de avatares

- Evidência agregada dos logs de Storage (janela padrão de 24h): 4.225 respostas `GET image/png` no bucket `avatars`, totalizando aproximadamente 7,16 GB; 4.221 requisições tiveram como origem o domínio oficial `www.futurodigitalai.com.br`. Houve também 123 respostas `video/mp4` (~473 MB). Não foram registrados caminhos, URLs assinadas, tokens nem dados de assinantes neste runbook.
- Os registros de PNG não trazem `objectPath` (campo vazio); portanto, a consulta não identifica quais avatares individuais foram mais acessados. Outra agregação encontrou 89 caminhos limpos distintos; a maior frequência observada por caminho foi 108. O principal vetor do egress está confirmado como leitura repetida de imagens do bucket de avatares pelo site oficial; o componente exato que dispara as leituras ainda precisa ser isolado com instrumentação/código correspondente à versão publicada.
- Comparação de código local: `server/routes/avatars.ts` carrega o arquivo no bucket de avatares com `cacheControl: '31536000'`, mas constrói e persiste `image_url` com `getPublicUrl()`. A migration local `0006_private_generated_media.sql` declara o bucket privado. O projeto de produção reporta `avatars.public = false` e 46 de 47 `avatars.image_url` existentes são URLs assinadas (`/object/sign/`); isso é divergência entre a cópia local examinada e os dados/configuração vistos em produção, não prova de que essa rota local esteja no deploy atual.
- Correção desta revisão: a inspeção anterior deixou passar o refresh periódico em `src/features/avatars/useAvatarData.ts`. A consulta das últimas 24 horas encontrou PNGs assinados sendo baixados repetidamente; ver a confirmação e a correção na seção de 27/11 ao final. A repetição de leituras da galeria é confirmada; não atribuir automaticamente todo o tráfego a uma única causa.
- Estado do serviço na inspeção: projeto `meu-site-db` (`ipzignkykujfevkoigro`) `ACTIVE_HEALTHY`; snapshot de recursos sem pressão aparente de CPU/conexões; tamanho do banco ~29,36 MB, Storage ~0,10 GB. O problema de disponibilidade é a cota de tráfego, não falta de espaço no banco segundo esse snapshot.
- A organização no plano Free excedeu as cotas indicadas pelo painel: egress não cacheado 21,145/5 GB (~423%) e cached egress 8,863/5 GB (~177%). O painel alerta que, encerrada a tolerância em 28/11/2026, requisições podem retornar HTTP 402. Não alterar plano nem assumir compromisso de cobrança sem autorização explícita.
- Não foi criada branch de desenvolvimento. O proprietário aprovou apenas a cotação: US$ 0,01344 por hora (~US$ 9,68 por 30 dias se mantida ligada continuamente, estimativa aritmética; cobranças adicionais/uso podem variar). Como é custo recorrente, criar branch ainda exige autorização explícita. Nenhuma migration foi aplicada e nenhum dado/esquema de produção foi alterado.
- Revisão estática adicional da pasta local `supabase/migrations`: há dois arquivos com prefixo `0002`, dois com `0003` e dois com `0006`. O script local `scripts/db-setup.mjs` ordena alfabeticamente e executa todos os `.sql` diretamente, sem tabela/controle de migrations aplicadas. Algumas migrations declaram idempotência; isso não torna seguro reaplicar a sequência inteira em produção. O script não foi executado. Corrigir o processo de versionamento/execução antes de qualquer setup ou replay de schema.
- A documentação atual do Supabase confirma que URLs assinadas diferentes são chaves de cache distintas no Smart CDN; gerar token novo a cada leitura impede aquecer o cache. Smart CDN automático requer Pro ou superior; no Free, a proteção imediata é reduzir dimensões/tamanho dos arquivos e reutilizar URLs/cache do navegador quando a política de privacidade permitir. Documentação consultada: [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [otimização de Storage](https://supabase.com/docs/guides/storage/production/scaling), [Smart CDN e cache de URLs assinadas](https://supabase.com/docs/guides/storage/cdn/smart-cdn).
- Próximas ações seguras: (1) comparar commit e artefato implantado com a cópia local; (2) medir o padrão de leitura/caching sem registrar URLs ou tokens; (3) reduzir downloads repetidos e otimizar miniaturas preservando qualidade/fluxo; (4) conferir a política de retenção/entrega de mídia e egress depois da correção; (5) avaliar separadamente opção de plano para evitar restrição HTTP 402; (6) retomar a migration 0007 somente em banco isolado, após provisionamento de desenvolvimento aprovado e validação do schema. Não usar a produção como ambiente de teste.

### 2026-11-27 — proteção local contra egress repetido e migrations remotas

- A API agora mantém em memória URLs assinadas de Storage por bucket/caminho por até 50 minutos (antes do TTL de 60 minutos), reutilizando o mesmo token durante atualizações da galeria e reidratações de mídia. Pedidos simultâneos para o mesmo conjunto de caminhos compartilham a chamada em lote. A exclusão de avatar invalida a URL correspondente. Isso reduz a troca de chaves de cache do CDN; não reduz o tamanho dos PNGs nem prova, sem nova medição, quanto do egress será evitado.
- A rota de avatares continua usando assinatura em lote, mas reaproveita as URLs já emitidas no processo. Imagens novas já são enviadas com `cacheControl: 31536000`; a política dos arquivos antigos ainda não foi medida diretamente no cabeçalho HTTP, portanto não afirmar que eles já têm cache efetivo.
- `scripts/db-setup.mjs` foi substituído por um fluxo seguro: sem flag, lista o plano sem abrir conexão. `--apply-local` exige `SUPABASE_DB_URL` apontando para `localhost`, `127.0.0.1` ou `::1`; recusa banco remoto, banco local preexistente sem ledger, e alterações posteriores em migration já registrada. O histórico local usa nomes completos e SHA-256, então os prefixos repetidos `0002`, `0003` e `0006` não colidem. Nenhuma migration foi aplicada nesta sessão.
- Verificação local: `npm.cmd run typecheck` passou; `node scripts/db-setup.mjs` listou 11 migrations e confirmou que não abriu conexão; `git diff --check` passou. A primeira execução dentro do sandbox foi impedida por EPERM no Node ao resolver `C:\Users\Jonathan`; repetição autorizada fora do sandbox concluiu com sucesso.
- Estado de publicação: esta correção está somente no repositório `publicacao-site`; ainda não foi publicada no Vercel nem sincronizada/reiniciada na API da VPS. O alerta de cota continua ativo até confirmar no painel e medir os novos logs após publicação. Não aplicar migration, alterar plano nem iniciar geração paga durante essa validação.

### 2026-11-27 — validação após aplicar cache de URLs assinadas

- Backup anterior à edição da API na VPS: `C:\site\backups\avatar-egress-20261127-062552` (cópias de `server/storage.ts` e `server/routes/avatars.ts`). A alteração em produção foi limitada a cachear URLs assinadas por bucket/caminho por 50 minutos e reutilizar essa função na galeria de avatares.
- `npm.cmd run typecheck` passou na VPS. A tarefa `Futuro Digital - API Node` foi parada e iniciada novamente para carregar o código atualizado.
- Verificação depois do reinício: `http://127.0.0.1:8787/api/health` e `https://api.futurodigitalai.com.br/api/health` retornaram `ok: true`, `engine: rust`, `motorConnected: true`, `motorError: null`. A tarefa aparece `Running` antes do reinício e os health checks confirmam resposta depois.
- A alteração reduz a criação de tokens assinados distintos nas leituras repetidas; ainda é necessário medir o egress nos próximos logs para quantificar o efeito. A cota Free já excedida não é zerada por esta mudança; nenhuma alteração de plano/billing foi feita. Banco de produção e migrations não foram tocados.

### 2026-11-27 — redução de egress das galerias de avatares

- **Investigação aprofundada (logs Supabase consultados em 27/11):** Storage registrou 4.221 GETs de PNG assinados, 85 caminhos de imagem distintos e 85 URLs assinadas distintas: em média 49,7 leituras por imagem, totalizando 6.820,6 MB. São transferências repetidas, não 4.221 gerações. Um agregado separado de `edge_logs` encontrou 6.310 `MISS` e 1 `HIT` para os caminhos de objetos assinados `avatars`; os agregados têm escopos diferentes e não devem ser somados como se fossem a mesma consulta. A tabela `storage.objects` mostrou 47 objetos de avatar no snapshot, média de 1,62 MB e metadata `cacheControl=max-age=31536000`; portanto, não assumir que a causa é um cabeçalho Cache-Control ausente. A resposta de imagem grande e baixa taxa de HIT é o problema confirmado; cada usuário/dispositivo que recebe um MISS volta a transferir o PNG. O snapshot de 47 objetos e o recorte dos logs de 85 caminhos podem não representar exatamente o mesmo conjunto/instante. Os 6,82 GB desse recorte também não explicam automaticamente os 21,1 GB acumulados no ciclo.
- Correção local: imagens recém-geradas mantêm o original PNG em resolução completa e recebem uma miniatura WebP (480x640, qualidade 76, `cacheControl` de um ano). As grades de Galeria, Meus Avatares, resultados e seletor rápido preferem a miniatura; abrir, baixar, arrastar ao canvas e reutilizar continuam usando o original. Miniaturas são opcionais: falha ao gerá-las não reprova nem esconde uma geração paga. Não há migration nem mudança de formato do original.
- Para não exigir alteração de schema, miniaturas usam caminho determinístico `<user>/<avatar>.thumb.webp`. A galeria própria lista o diretório do usuário uma vez e só assina miniaturas existentes; avatares antigos sem miniatura continuam no original. Comunidade mantém o caminho atual até a otimização ser expandida com segurança.
- Backfill preparado em `scripts/backfill-avatar-thumbnails.ts`: padrão é simulação, sem baixar nem enviar arquivos; `--apply` cria só as miniaturas faltantes, sequencialmente, sem excluir ou atualizar originais/registros. A criação inicial lê cada original uma vez e consome esse egress pontual antes de reduzir downloads repetidos posteriores. Não foi executado contra o Supabase de produção nesta etapa.
- Teste local: `npm.cmd test` passou (9 arquivos, 59 testes); `npm.cmd run typecheck` passou; `npm.cmd run build` passou. Node 22.11.0 emitiu aviso porque Vite recomenda 22.12+; build concluiu normalmente. O teste de otimização usa uma imagem sintética, não um arquivo real de assinante.
- Monitoramento permanente criado no Codex: automação diária às 09:00 (America/Sao_Paulo) acompanha GETs e MB de Storage das últimas 24h, caminhos distintos e cache HIT/MISS, registra no runbook e alerta acima de 1 GB/dia, 1.000 GETs/dia, maioria de MISS ou erro do serviço. Não altera billing, schema, nem apaga dados.
- Estado de preparação antes da implantação registrada na seção seguinte: naquele momento a correção ainda não estava sincronizada, o backfill de produção não havia sido executado e não havia medição pós-deploy. A simulação local terminou com `Supabase não configurado no servidor (.env)` sem acessar nem modificar dados. O código e o backfill foram concluídos depois; consultar a seção de implantação abaixo para o estado atual.

### 2026-11-27 — implantação das miniaturas e backfill concluídos

- API da VPS atualizada em `C:\site`, mantendo as personalizações de produção existentes. Backup prévio em `C:\site\backups\avatar-thumbnails-20261127` contém a rota, contratos e manifests anteriores. A tarefa `Futuro Digital - API Node` foi reiniciada; health local e domínio público responderam `ok: true`, `engine: rust`, `motorConnected: true`, sem dependências ausentes.
- `sharp@0.35.5` instalado no backend da VPS. `npm.cmd run typecheck` passou. O npm informou que Node 22.11.0 está abaixo do mínimo recomendado por Vite/Rolldown (22.12.0) e apontou uma vulnerabilidade moderada no conjunto de dependências; não foi executado `npm audit fix` para evitar atualização lateral fora do escopo.
- Backfill de produção: 48 originais lidos uma única vez (78,6 MB) e 48 miniaturas WebP criadas (1,4 MB no total). Redução estimada de bytes para a grade, comparando o tamanho gravado: 98,2%. Uma nova simulação confirmou 48 avatares e zero miniaturas faltando. Nenhum original, registro, bucket ou permissão foi removido/alterado.
- Validação no site oficial em aba autenticada recém-carregada: galeria mostrou 48 imagens e 12 vídeos; as imagens de avatar observadas vieram de caminhos `.thumb.webp`, com dimensões naturais 360×640. A aba original, que tinha prompt não salvo, foi preservada sem recarga; a aba temporária de verificação foi fechada. Abrir/baixar/reutilizar continua apontando ao PNG original.
- Não foi feita geração paga. A prova do efeito de tráfego no período virá do monitor diário de GET/bytes e cache HIT/MISS; não afirmar redução dos 21,1 GB já acumulados no ciclo. O primeiro processamento de novos dispositivos/itens e a abertura/download de originais ainda transfere dados; miniaturas reduzem drasticamente a transferência repetida da galeria, mas a automação diária deve continuar alertando desvios.
- Observação de rede: a chamada HTTPS do shell local de manutenção não conectou ao host da API; a mesma rota respondeu saudável a partir da VPS e o site oficial autenticado carregou a galeria. Não há evidência nesta verificação de indisponibilidade percebida pelo assinante.

### 2026-11-27 — geração de avatar sem cartão final (diagnóstico confirmado)

- Sintoma no site oficial: apareceu o cartão “Gerando imagem…”; uma mensagem de erro foi exibida e nenhum cartão final/miniatura apareceu.
- Evidência Supabase em produção, 06:40–06:44 UTC: a geração foi criada e debitou 2 créditos; o PNG original (aprox. 2,3 MB) e a miniatura WebP (aprox. 31 KB) foram enviados ao Storage com HTTP 200, e ambas as URLs assinadas foram emitidas com HTTP 200.
- Causa confirmada: ao persistir o avatar, a API enviou `thumbnail_url` no `POST /rest/v1/avatars`, que respondeu HTTP 400. O schema oficial da tabela `avatars` não contém essa coluna. O código local atual já exclui `thumbnail_url` da linha inserida e mantém a miniatura no caminho determinístico do Storage; a API ativa da VPS está divergente/desatualizada nesse trecho.
- Efeito adicional confirmado: o registro de geração permaneceu `processing`, sem avatar vinculado nem `completed_at`; o ledger registra o débito de 2 créditos sem estorno. A rota lança erro na gravação dos avatares antes de atualizar a geração/estornar, então o placeholder persiste e o arquivo carregado fica órfão do registro da galeria.
- Estado: diagnóstico concluído; **correção e recuperação ainda pendentes**. Não repetir a geração, pois os arquivos já estão no Storage. Próximo passo: sincronizar com backup somente `server/routes/avatars.ts` da versão local compatível, fazer typecheck na VPS, reiniciar apenas `Futuro Digital - API Node` e conferir health. Depois, reconciliar o arquivo já enviado e o registro/débito pendente de forma idempotente; primeiro confirmar a correspondência exata entre arquivo, geração e parâmetros. Acrescentar tratamento compensatório para falha de insert (marcar `failed`, estornar uma vez e limpar/registrar objetos órfãos) antes de declarar a rota robusta.
- Reincidência às 06:49–06:50 UTC, confirmada pelos logs e pela mensagem vermelha “Could not find the 'thumbnail_url' column of 'avatars' in the schema cache”: duas novas imagens e duas miniaturas foram enviadas ao Storage com HTTP 200; a gravação em `avatars` voltou HTTP 400. O total atual é de 3 gerações avatar em `processing`, 6 créditos debitados e zero resultados vinculados. A API da VPS permanece sem a correção; pausar novos pedidos de imagem até sincronizar e confirmar a rota corrigida. A tentativa de inspeção SSH direta desta sessão não conectou (porta 22 bloqueada pelo ambiente), então não foi feita alteração remota.

### 2026-11-27 07:00 UTC — rota corrigida carregada na API ativa

- Reinspeção via SSH administrativo mostrou que `C:\site\server\routes\avatars.ts` já continha a correção (`ok.map(({ thumbnail_url: _thumbnailUrl, ...row }) => row)` e insert de `insertRows`), embora o processo Node ativo ainda estivesse servindo código anterior. Não foi necessária alteração de schema nem substituição do arquivo de produção.
- `npm.cmd run typecheck` passou dentro de `C:\site`.
- Backup da rota ativa antes do reinício: `C:\site\backups\thumbnail-url-schema-20261127\avatars.ts.pre-restart`; SHA-256 do arquivo: `C6E98CAD9337D29B03BC71088116C984DBD4F5F129826FDBC95DBB3E3372A4D7`.
- Reiniciada somente a tarefa `Futuro Digital - API Node`. Health local `127.0.0.1:8787/api/health` e público `https://api.futurodigitalai.com.br/api/health` responderam `ok:true`, `engine:rust`, `motorConnected:true`, `missing:[]`.
- Reconciliação feita sem repetir gerações: os três PNGs e as três miniaturas foram confirmados no Storage. Foram criados os três registros ausentes em `avatars`, com nomes descritivos do cenário, e as gerações ligadas aos respectivos registros passaram a `done` com `result_count=1`. Verificação SQL confirmou os seis objetos e os três vínculos. Os 6 créditos debitados foram mantidos porque os três arquivos gerados foram recuperados para a galeria; nenhum crédito adicional foi debitado.
- Não foi feita uma nova geração paga como teste. A correção foi validada com typecheck, reinício isolado da API e health local/público; ainda falta conferir a renderização após atualizar a galeria autenticada no navegador. O arquivo local da rota e o runbook permanecem alterados localmente para sincronização normal posterior.

### 2026-11-27 14:47 UTC — alerta de egress e indisponibilidade do RDP

- Janela monitorada: 2026-11-26 14:47 UTC a 2026-11-27 14:47 UTC. `storage_logs` registrou 4.250 GETs bem-sucedidos de PNG (7.205,2 MB; 89 caminhos distintos), 77 GETs de WebP de miniatura (2,4 MB; 48 caminhos), 151 GETs de MP4 (606,9 MB; 37 caminhos) e 128 GETs JPEG (15,8 MB; 26 caminhos). URLs distintas coincidiram com caminhos distintos por tipo, então os downloads repetidos usaram URLs assinadas já existentes.
- `edge_logs`, filtrado separadamente por objetos assinados no bucket de avatares, registrou 6.361 respostas `MISS` de PNG (10.776,5 MB; 91 caminhos) e 57 `HIT` de PNG (31 MB; 29 caminhos); miniaturas WebP: 96 `MISS` (2,9 MB; 51 caminhos). Esta fonte tem contagens/bytes diferentes de `storage_logs`; não somar nem comparar como se fossem o mesmo contador. A taxa HIT observada entre os PNGs edge foi inferior a 1%.
- Alertas acionados: PNGs excederam 1 GB e 1.000 GETs/dia; a maioria das respostas continua `MISS`. Em relação ao snapshot de referência anterior (4.221 GETs/6.820,6 MB e 6.310 MISS/1 HIT), o download de PNG não caiu e os MISS permanecem muito altos. Os agregados indicam que a economia esperada ainda não está demonstrada. O frontend local das grades próprias usa `thumbnail_url ?? image_url`, mas os logs não identificam o referenciador; portanto ainda não está confirmado se os PNGs vieram de abertura/download de originais, telas fora da galeria, ou algum cliente sem miniatura. Investigar uso das rotas e distribuição de mídia antes de alterar privacidade de bucket.
- Erros Storage não-2xx na janela: 18 GETs assinados e 16 criações de URL assinada retornaram 400; não apareceram 5xx neste agregado.
- Diagnóstico RDP: uma tentativa local de TCP para `217.77.5.101` falhou em 22, 443, 8787 e 3389; a resolução DNS local também não retornou resposta nessa sessão. Como o ambiente de diagnóstico pode não representar a rede do cliente, isso não confirma que a VPS esteja desligada. No próximo acesso, testar novamente do computador do usuário e conferir painel/console da Contabo antes de reiniciar serviços.

### 2026-11-27 — inventário visual da sessão RDP e consoles abertos

- Inspeção visual da sessão RDP `217.77.5.101` confirmou várias janelas sobrepostas: cinco PowerShells visíveis (um com logs da API e prompt ao final, um prompt ocioso em `C:\site`, um erro de patch ao fundo, um console de diagnóstico SSH/Event Viewer e um console de inicialização do Chrome conta_2 que voltou ao prompt), um console do motor Rust `motores-mcp-hub.exe` escutando em `127.0.0.1:31416`, duas janelas Chrome de perfis Flow (indicadores G e P) e Server Manager.
- O PowerShell de inventário exibiu a tarefa `Futuro Digital - API Node` no estado `Ready`; isso confirma que a tarefa existe, mas não que a API esteja rodando ou que a tarefa tenha iniciado o serviço. As linhas de log da API na janela grande também terminam em prompt, então não são prova de processo ativo.
- Não foram encerradas janelas nem alteradas tarefas nesta inspeção. O console Rust é a única janela que mostra explicitamente um processo em escuta. As duas sessões Chrome devem ser preservadas enquanto forem necessárias para automação autenticada do Flow; não devem ser confundidas com serviços de backend.
- A confirmação definitiva de quais PIDs mantêm 443/8787/31416/CDP e de quais tarefas iniciam esses processos continua pendente. Próxima etapa técnica: acesso remoto administrativo funcional por SSH ou ferramenta de administração apropriada, verificar listeners e ações/gatilhos das tarefas, converter backend/motor/Caddy em serviços gerenciados e manter Chrome interativo apenas para Flow. Depois, validar reinício e health sem deixar consoles manuais.
- Resultado: a VPS está acessível por RDP neste momento, mas o inventário visível não permite afirmar que a automação pós-reboot esteja completa; a tarefa da API em `Ready` é um alerta para revisar. Nenhuma sessão Flow foi fechada.

### 2026-11-27 — automação das tarefas persistentes da VPS (RDP)

- Revisão feita pelo Agendador de Tarefas da VPS. As quatro tarefas `Futuro Digital - API Node`, `Futuro Digital - Caddy`, `Futuro Digital - Chrome Flow CDP` e `Futuro Digital - Motor Rust` estavam com status `Running` durante a conferência.
- A API Node já estava configurada para reiniciar após falha (1 minuto, 5 tentativas), executar assim que possível após um início perdido e não encerrar por tempo máximo.
- Caddy foi ajustado: executar assim que possível após início perdido; reiniciar após falha a cada 1 minuto, até 3 tentativas; desativado o limite de encerramento em 3 dias. Tarefa continua disparada na inicialização do sistema.
- Motor Rust mantém ação `C:\motores\motores-mcp-hub.exe serve-openai 31416`, gatilhos na inicialização e logon do Administrator, e reinício após falha a cada 1 minuto, até 3 tentativas; limite de 3 dias desativado.
- Chrome Flow CDP foi ajustado para recuperar após falha a cada 1 minuto, até 3 tentativas; executar após início perdido; limite de 3 dias desativado. Mantida a execução somente quando Administrator estiver conectado e o gatilho no logon: o CDP/Flow precisa da sessão interativa autenticada.
- A execução simultânea permanece configurada para não iniciar uma segunda instância da mesma tarefa. As quatro tarefas foram vistas como `Running` depois dos ajustes. Nenhuma tarefa foi encerrada nem reiniciada nesta operação.
- Limite operacional: o Agendador pode iniciar os processos após boot/logon e tentar recuperá-los de falhas, mas essa conferência não executou reboot. O Chrome autenticado não fica garantido sem sessão Windows iniciada; contas Flow também podem exigir reautenticação. Não se fechou janela de console manual porque não foi verificado o PID/proprietário de cada janela, então não presumir que consoles existentes são descartáveis.

### 2026-11-27 — validação da VPS pela sessão RDP

- No Agendador de Tarefas da VPS, as quatro tarefas esperadas foram exibidas como `Running`: API Node, Caddy, Chrome Flow CDP e Motor Rust. Os gatilhos visíveis foram: API e Caddy na inicialização; Chrome CDP no logon de `VMI3766152\Administrator`; Motor Rust com múltiplos gatilhos. Isso valida o estado reportado pelo Agendador nesta sessão, não a sobrevivência após reboot.
- Health público consultado em `https://api.futurodigitalai.com.br/api/health`: `ok:true`, `engine:"rust"`, `motorConnected:true`, `motorError:null`, `missing:[]`, `modelError:null`. A resposta comprova a rota HTTPS pública (Caddy/API) e a comunicação da API com o motor Rust no momento do teste.
- CDP não foi validado diretamente nesta rodada: o health endpoint não informa estado do Chrome/CDP e não foi obtida resposta do endpoint CDP da VPS. A tarefa aparecer como `Running` não basta para provar que a porta de depuração responde ou que o Flow autenticado está operacional.
- O reboot controlado não foi concluído pela interface gráfica nesta sessão. A tentativa não confirmou a seleção da ação e foi cancelada; portanto, não registrar nem comunicar o teste de retomada pós-reboot como aprovado. Nenhum serviço foi encerrado deliberadamente.
- Resultado: serviços essenciais da API estavam saudáveis durante a checagem; o fluxo autenticado do Flow/CDP e a recuperação após reinicialização continuam sem validação empírica. Próxima verificação: fazer reboot controlado quando houver janela de manutenção e reconectar; validar os quatro serviços e o endpoint CDP após o logon do Administrator, então registrar horário e resultados reais. Se o CDP não responder, conferir primeiro ação/gatilho e estado da sessão interativa antes de reiniciar tarefas.

### 2026-11-27 — validação funcional após reinício controlado

- Reinício iniciado pela interface do Windows às 17:08 (horário exibido na VPS). O RDP desconectou durante a reinicialização e reconectou depois que o Windows voltou.
- A primeira consulta pública de health durante a subida respondeu `ok:false`, `motorConnected:false` e “A ponte Hust está desligada ou inacessível”. Após a inicialização dos processos, a mesma rota passou a responder `ok:true`, `engine:"rust"`, `motorConnected:true`, `motorError:null`, `missing:[]` e modelos disponíveis. Isso demonstra que Caddy, API Node e motor Rust voltaram e se comunicaram depois do reboot; houve uma janela temporária de inicialização, não uma falha persistente.
- Após o reboot, `http://127.0.0.1:24022/json/version` respondeu com os dados do Chrome 158 e `webSocketDebuggerUrl` na porta 24022. Isso confirma que o Chrome com CDP foi iniciado e a porta está respondendo.
- O Google Flow também carregou na janela Chrome já aberta; a interface exibiu o selo ULTRA. Não foi iniciada geração de imagem/vídeo nesta validação, portanto não registrar uma geração real como aprovada nem afirmar que a autenticação da conta foi confirmada por uma nova geração.
- Conclusão: inicialização pós-reboot comprovada funcionalmente para API/Caddy/Rust e Chrome/CDP. A primeira consulta negativa enquanto o motor ainda iniciava é uma condição transitória a considerar em health checks; aguardar alguns minutos antes de diagnosticar queda definitiva. Não foi feita leitura final do status das quatro tarefas no Agendador após o boot, então o resultado é validação funcional dos endpoints/processos, não auditoria de cada configuração do Agendador.

### 2026-11-27 — geração real no site oficial após reinício

- Sessão autenticada como DONO em `https://www.futurodigitalai.com.br/avatars`; saldo antes/depois: 8428 → 8426 créditos.
- Uma imagem foi gerada pelo fluxo de Influencer IA usando o tipo de personagem Inseto, gênero Masculino e idade Jovem (18–29), com prompt explícito de oficina botânica, roupa terrosa e personagem único.
- Resultado concluído e registrado na galeria: contador de imagens 51 → 52; o card “Inseto” abriu no visualizador como item 1/52. O modal exibiu a descrição final usada e os atributos selecionados, confirmando que entraram no prompt final.
- Inspeção visual confirmou o personagem solicitado e a marca-d’água FUTURO DIGITAL no canto superior esquerdo. A imagem ficou disponível após o processamento; os 2 créditos foram debitados conforme indicado na interface.
- Em conjunto com o reboot, health público `ok:true` / `motorConnected:true`, CDP `127.0.0.1:24022` respondendo e as quatro tarefas (API Node, Caddy, Chrome Flow/CDP, Motor Rust) vistas como `Running` após o boot, isso valida um ciclo real de imagem no site oficial e o retorno funcional da stack após reinício.
- Limite do teste: não foi feita geração de vídeo. Também não foi encerrado à força um serviço para simular crash em produção; a configuração de recuperação das tarefas está documentada acima, mas a reação a uma falha forçada não foi exercitada. Evitar teste de interrupção enquanto assinantes puderem estar usando o site; se for necessário provar failover, agendar janela de manutenção e observar health/CDP durante a recuperação.

### 2026-11-27 — timeout 502 no montador de personagem resolvido

- Reprodução no site oficial: `POST /api/prompt/enhance-character` retornou HTTP 502 após 60 segundos, com a mensagem explícita `O motor oficial não respondeu em 60 segundos.` O health do mesmo motor permanecia verde e listava `gemini-4-argon`; portanto, health/catalogo não validavam uma conclusão real de chat. O teste não gerou mídia nem gastou créditos.
- Causa operacional confirmada: a tarefa `Futuro Digital - Motor Rust` aparecia `Running`, mas o motor de chat não concluía a solicitação. Não havia geração ativa na API. As outras tarefas de API Node, Caddy e Chrome Flow/CDP não foram tocadas.
- Correção: pelo Agendador de Tarefas da VPS, encerrei apenas `Futuro Digital - Motor Rust`, confirmei a caixa “Do you want to end all instances…” com `Yes`, esperei a tarefa mudar para `Ready`, e executei a mesma tarefa pelo menu `Action > Run`. O console do motor voltou a mostrar `[motores-openai-bridge] escutando em http://127.0.0.1:31416`.
- Validação: health público voltou/permaneceu `ok:true`, `engine:rust`, `motorConnected:true`, `missing:[]`, com o catálogo disponível. No site oficial, “Montar prompt do personagem” completou e preencheu o campo em português brasileiro; o texto manteve a criatura orelhuda, gênero Masculino, idade Jovem (18–29) e tipo Extremo. “Montar mundo do personagem” também completou em português, com ambiente e paleta coerentes. O saldo permaneceu em 8396 créditos e os contadores permaneceram em 52 imagens e 13 vídeos. Nenhuma mídia foi gerada e o rascunho de teste não foi salvo.
- Procedimento rápido se o 502 voltar: primeiro consultar este runbook e o health; se o health estiver verde mas o botão de montagem de prompt retornar o mesmo timeout de 60 s, verificar que não há geração ativa, reiniciar somente a tarefa `Futuro Digital - Motor Rust` pelo Agendador (End, confirmar a instância, aguardar `Ready`, Run), confirmar a linha de escuta em `127.0.0.1:31416`, revalidar health e fazer uma única chamada gratuita de montagem de prompt. Não reiniciar API, Caddy, Chrome ou Flow para esse sintoma sem nova evidência.
- Auditoria funcional associada: seis rotas oficiais (`/agente-diretor`, `/viral`, `/ai-ugc`, `/studio`, `/projects`, `/avatars`) carregaram sem estado visual de erro 5xx; build local passou; suíte unitária passou (59 testes); suíte E2E passou (97 verificações). E2E usa respostas simuladas para IA/banco, portanto não substitui gerações reais. O teste real gratuito desta seção cobre os dois montadores do Avatar. Não foi iniciada geração paga de imagem ou vídeo.
- Correção de registro: uma nota anterior nesta sessão associou incorretamente o timeout 502 à fila durável `video_generation_jobs`. Essa associação estava errada. O código atualmente usado não depende dessa tabela para `/prompt/enhance-character`; a implementação da fila durável está apenas numa cópia antiga fora do repositório Git e não está publicada/aplicada. Ela não foi causa deste timeout. A durabilidade da fila de vídeos continua sendo uma melhoria separada, ainda não implantada nem validada em produção.
### 2026-11-27 — revisão dos advisors e ajuste de segurança do Auth

- Projeto confirmado: `meu-site-db` (`ipzignkykujfevkoigro`), região `sa-east-1`, status `ACTIVE_HEALTHY`.
- Segurança: `public.handle_new_user()` é uma função `SECURITY DEFINER` usada pelo trigger `on_auth_user_created` em `auth.users`, mas também podia ser chamada via RPC por `anon` e `authenticated`. Foi criada a migration local `supabase/migrations/0012_restrict_handle_new_user_rpc.sql` e aplicada ao projeto oficial. Verificação posterior: `has_function_privilege` retornou `false` para `anon` e `authenticated`, `true` para `service_role`; o trigger continua habilitado (`tgenabled = O`). Advisor de segurança deixou de listar essa função.
- Proteção contra senhas vazadas: segue desligada. O painel atual do Supabase confirma que esse recurso exige plano Pro ou superior. O proprietário autorizou ativar somente se não houvesse custo; não foi feito upgrade nem alteração paga. Reavaliar somente após decisão explícita sobre custo/plano.
- Performance: advisors ainda listam 7 FKs sem índice, 19 políticas com chamada de autenticação não encapsulada em `SELECT`, 5 avisos de políticas permissivas sobrepostas em `viral_folders` e 2 índices não utilizados. São avisos de desempenho, não erros funcionais confirmados. Não foram alterados: sem ambiente isolado/backup, mudanças amplas nas políticas e índices precisam de revisão individual antes de DDL em produção.
- Health advisor: sem alertas. Não houve cadastro de usuário de teste nem geração de mídia nesta revisão; o trigger foi verificado por catálogo e privilégios, sem tocar dados reais.
- Fila de vídeos: o repositório Git atual ainda inicia o processamento em `setImmediate`; não contém `videoJobWorker.ts`, tabela `video_generation_jobs` nem a migration 0007. A melhoria de durabilidade permanece pendente e não pode ser considerada publicada.
- E2E local: a primeira execução passou 97 verificações, mas revelou que o mock de `GET /api/avatars/templates` faltava e o proxy do Vite tentava alcançar a API local indisponível. O mock foi adicionado em `tests/e2e/run-e2e.mjs`; a segunda execução passou novamente com 97/97 e sem mensagens de proxy recusado. A suíte continua simulando IA e banco.
- Registro da migration: a lista de migrations do Supabase confirma `20261128001002 / restrict_handle_new_user_rpc` aplicada.
- Painel Supabase exibe aviso de excedente do ciclo anterior e possível restrição dos projetos a partir de 28/11/2026 se o estado continuar. Não alterar plano/cobrança sem consentimento. Conferir o painel de uso antes de novas cargas de mídia.
- Uso consultado novamente no painel oficial em 27/11: período exibido 02/11–02/12, egress 21,408/5 GB (428%) e cached egress 9,004/5 GB (180%). O aviso do painel diz que, terminado o grace period em 28/11 se a organização continuar acima da cota, a Fair Use Policy pode restringir requisições com HTTP 402. Nenhuma alteração de plano ou cobrança foi feita.
- Logs agregados das últimas 24 horas, sem retornar URLs, tokens ou caminhos: GETs assinados de `image/png` somaram 1.158 requisições / 1,804 GiB em 86 objetos; o mesmo objeto teve até 34 leituras. 1.116 GETs (1,726 GiB) vieram com referer `www.futurodigitalai.com.br`; 42 (0,078 GiB) vieram sem referer. `video/mp4`: 158 GETs / 0,619 GiB em 42 objetos, até 10 leituras do mesmo objeto; os GETs observados vieram do domínio oficial. O pico de PNG ocorreu em janelas concentradas de 10 minutos, chegando a 284 leituras / 0,42 GiB. Isso confirma transferência repetida de originais privados pelo site; não explica sozinho toda a cota do ciclo.
- Causa de código que contribui para a repetição: `useAvatarData.ts` executava refetch automático da galeria a cada 50 minutos enquanto a aba estava visível. O backend renova URLs assinadas após 50 minutos para URLs com validade de 1 hora. Quando a URL assinada muda, o navegador trata a imagem como URL diferente e baixa o PNG de novo. O horário de renovação e as leituras repetidas coincidem; o impacto total ainda precisa ser medido após o rollout.
- Correção publicada em `src/features/avatars/useAvatarData.ts`: removido o timer de polling. A galeria agora mantém as imagens enquanto a aba fica ativa, revalida quando a pessoa retorna a uma aba desatualizada e continua recebendo novas imagens pelo evento Realtime. URLs permanecem com validade de 1 hora; nenhum prazo de acesso foi ampliado. Build aprovado, 59 testes unitários e 97 verificações E2E aprovados. Commit `86f9cfb fix: prevent repeated avatar gallery downloads` enviado a `main`; deployment Vercel de produção `meu-site-pub-automatico-919pieewr-jhonjhon18102026.vercel.app` ficou `Ready`. Smoke test em aba isolada do domínio oficial confirmou sessão DONO, saldo de créditos e galeria de avatares carregando. **Redução de egress ainda não medida; comparar logs de Storage após o rollout antes de declarar o consumo corrigido.**
- Observação curta pós-rollout, logs Supabase de 28/11/2026 00:20–00:26 UTC: 1 GET de `application/json` originado no domínio oficial e nenhum GET `image/png`/`video/mp4` nesse intervalo. É compatível com ausência de downloads de mídia durante a amostra, mas não prova redução sustentada de egress nem resolve o excedente mensal; continuar comparando janelas equivalentes.

### 2026-11-28 — revisão de falhas Lower Priority e Auth

- Revisão do runbook feita antes de investigar. Projeto Supabase `meu-site-db` segue `ACTIVE_HEALTHY`; health advisor sem lints. Advisors atuais repetem 7 FKs sem índice, 19 avisos de reavaliação em políticas RLS, 5 políticas permissivas sobrepostas em `viral_folders` e 2 índices não usados. São recomendações de desempenho; sem branch de desenvolvimento e sem backups no projeto, nenhuma migration ou DDL de produção foi executada.
- A autorização para ativar proteção contra senhas comprometidas era condicionada a não haver custo. O painel e o advisor confirmam que está desativada e que a ativação exige plano Pro ou superior; não houve upgrade nem mudança de billing. A autorização não cobre uma cobrança recorrente.
- Consulta read-only do inventário no motor da VPS em 28/11: três contas registradas; `conta_1` e `conta_2` habilitadas e com `has_bearer: true`; `conta_3` habilitada sem bearer. `conta_2` não tinha cooldown geral ativo e o `cooldown_video_until` registrado (27/11 16:43 UTC) já havia vencido na checagem. A ferramenta `flow_accounts` é somente inventário, não testa autenticação.
- `motores-mcp-hub.exe health google_flow` respondeu HTTP 200 para `conta_1`, não para `conta_2`. Logo, o health geral/API e esse health do motor não provam que a sessão de Flow da conta 2 esteja apta a gerar. Não foi feita geração real: o alerta de egress do plano Free ainda estava excedido e o runbook manda evitar novas cargas de mídia até nova medição/decisão.
- Leitura agregada de `video_projects` confirmou sete falhas recentes em `veo-3.1-lowerpriority` roteadas para `conta_2` com erro `fetch failed` (cinco entre 24–25/11 e duas em 27/11); havia também falhas históricas distintas de bearer ausente, HTTP 429 e recusa do provedor. Isso comprova que “fetch failed” não explica todas as falhas e que o fluxo lower priority já teve outros bloqueios; não comprova falha permanente de bearer na checagem atual.
- Correção local em `server/veo.ts`, `server/videoGenerationDiagnostics.ts` e `server/routes/aiUgc.ts`: erros agora distinguem chamada API→motor, comunicação motor→Flow e download do arquivo final; a mensagem e o log registram o motor efetivamente usado e a conta roteada, sem expor tokens. A falha de comunicação do Flow orienta checar a conta específica; não executa retry automático, pois uma tentativa cujo resultado de cobrança é incerto poderia duplicar geração/custo.
- Testes após a alteração: suíte unitária `npm.cmd test` passou (9 arquivos, 61 testes); `npm.cmd run typecheck`, `npm.cmd run build` e `git diff --check` passaram. O build ainda emite aviso não bloqueante: Node 22.11.0 está abaixo da versão mínima recomendada pelo Vite/Rolldown (22.12+).
- Sincronização da API concluída em `C:\site` após comparar os trechos e preservar todas as demais alterações existentes. Backup dos três arquivos-alvo: `C:\site\backups\video-error-diagnostics-20261128-0045`. O script temporário foi removido.
- Antes do restart, a consulta read-only confirmou zero projetos em `processing`. Reiniciada somente a tarefa `Futuro Digital - API Node`; a tarefa voltou a `Running` e o health local retornou `ok:true`, `engine:rust`, `motorConnected:true`, `missing:[]`. Nenhuma geração foi iniciada.
- O patch melhora diagnóstico, timeout do download e registro de modelo/conta, mas não prova nem elimina a causa externa dos `fetch failed` do Flow. A conta 2 continua sem teste individual sem custo pela ferramenta disponível; qualquer geração de validação deve esperar a cota/egress estar segura.
- A sincronização GitHub/Vercel ainda está pendente; o código local e runbook precisam ser commitados e enviados. O DNS de `github.com` falhou na consulta anterior, então confirmar a conectividade antes de tentar o push.
- Pendências concretas: (1) validar a conta 2 com um health/check que realmente a selecione ou com uma geração real de baixo risco quando a cota estiver segura; (2) medir o egress depois da otimização das miniaturas; (3) tratar o alerta de excedente/possível HTTP 402 sem presumir que o código o zerou; (4) decidir um ambiente isolado/backup antes de otimizar índices/políticas; (5) avaliar fila durável de vídeos separadamente, pois a rota ainda inicia trabalho com `setImmediate` e reinício da API pode interromper processamento.
