# Roadmap de melhorias do PieTracker

Estado atual do repo, olhando para o que mais alavanca a avaliacao tecnica da Ferreri (impacto x esforco). Complementa `docs/AVALIACAO.md`, nao o substitui: itens marcados **(do audit)** vem de la e aqui so sao repriorizados; itens **(novo)** nao estavam no audit.

Convencao: cada item tem impacto x esforco, `arquivo:linha`, por que importa pra vaga e a acao concreta.

---

## Ja entregue

Feito nesta sessao, serve de baseline (nao e item de roadmap):

- Historia do git limpa e commits Conventional.
- Deploy completo: Render (backend) + Neon (Postgres) + Vercel (frontend).
- Sistema de 2 estilos business/casual ortogonal ao tema: tokens CSS + `StyleContext` + `data-style`, default business (`contexts/StyleContext.tsx`).
- Folhas caindo migradas para canvas (`components/FallingLeaves.tsx`), usadas no fundo e no auth (`App.tsx:125`, `auth/AuthContainer.tsx:43`), gated em `style === "casual"`.
- `--forest-green` agora e token semantico (`App.css:6058-6060`), fechando o P0 da cor do titulo.
- `tabular-nums` + `lnum` nos valores monetarios principais (`App.css:6102-6112`).
- `prefers-reduced-motion` global (`App.css:6167`).
- "Beautiful expense tracking made simple" removido do auth.
- Glifo replacement char neutralizado no header ativo (`App.css:6096-6100`).

---

## Alto impacto

### Fechar o IDOR: exigir JWT e derivar user_id so do token **(do audit)**
Impacto alto x esforco medio. `backend/security.py:46-64`, `backend/main.py:277-286` e `309-390`; front `services/auth.ts:63`, `hooks/useExpenses.ts:13-15`, `config/constants.ts:20`.
Por que importa: e o item de maior peso numa avaliacao fintech. `resolve_user_id` ainda aceita `X-User-Id` cru sem token, e `/expenses` / `/categories` usam `Depends(get_user_id)`. Qualquer um troca o header e le/cria/apaga dado alheio. `test_security.py:96,110` ainda codifica o spoof como esperado.
Acao: trocar para `dependencies=[Depends(get_current_user)]` nos endpoints de dados e derivar `user_id` so do `sub` verificado. Remover `resolve_user_id` / `get_user_id` / `PUBLIC_USER_ID` e o ramo anonimo no front. Reescrever `test_security` para que spoof sem token de 401.

### Corrigir o grafico anual: converter moeda por despesa antes de somar **(do audit)**
Impacto alto x esforco baixo. `frontend/src/components/ChartDisplay.tsx:220-230` (`prepareYearlyData`), `235-238` (`calculateYearlyTotal`), `512` (`YAxis domain={[0,3000]}`), `520` (`tickFormatter` com `$` fixo).
Por que importa: bug de correcao financeira. `convertCurrency` so e usado no pie (`ChartDisplay.tsx:81`); a linha e o total anual somam BRL+USD+JPY como mesma unidade, o eixo corta acima de 3000 e em JPY estoura, e eixo/linha/tooltip se contradizem. A logica certa ja existe na view mensal (`App.tsx:92-112`).
Acao: converter cada `amount` de `expense.currency` para `selectedCurrency` (`convertCurrencySync`) antes de somar por mes e no total; `domain={[0,'auto']}` ou max dinamico; `tickFormatter` -> `formatCurrency(value, selectedCurrency)`.

### Teste de regressao do grafico anual (Vitest) **(novo)**
Impacto alto x esforco baixo. `frontend/src/components/ChartDisplay.tsx`; novo `ChartDisplay.test.tsx` (ou helper pura em `utils`).
Por que importa: zero teste de `ChartDisplay` hoje. Amarrar a correcao acima a um teste demonstra disciplina no exato bug que o avaliador olharia primeiro num app de dinheiro.
Acao: extrair a soma anual para funcao pura e testar: 3 despesas BRL+USD+JPY no mesmo mes resultam no total convertido esperado, e o max do eixo acompanha o maior mes.

### Remover admin hardcoded: admin so por `user.role` **(do audit)**
Impacto alto x esforco baixo. `backend/security.py:67-72`, `backend/main.py:587`, `frontend/src/App.tsx:86-89`.
Por que importa: furo de seguranca + divida de arquitetura. `is_admin_user` concede admin por `email==admin@pietracker.com` / `id==admin-super-user`, e o signup auto-seta `role=admin` pra esse email (`main.py:587`). Com cadastro aberto, qualquer um vira admin e acessa `/admin`, que lista `password_hash` e deleta usuarios. O front espelha o literal em `App.tsx:86-89`.
Acao: `is_admin_user` so checa `role in {admin, super_admin}`; remover o branch de signup; expor `user.role` no `/auth/me` e checar `role === 'admin'` no front; remover os tres literais.

### Code-splitting: bundle JS unico de 758KB (Recharts no chunk principal) **(novo)**
Impacto alto x esforco medio. `frontend/vite.config.ts` (sem `manualChunks`); `frontend/src/components/ChartDisplay.tsx:1-20`.
Por que importa: o build imprime literalmente `Some chunks are larger than 500 kB` e gera 758KB (219KB gzip) num chunk so. Recharts inteiro vai pro bundle inicial mesmo so aparecendo pos-login. Um avaliador que abre Network/Lighthouse ve JS gordo e zero estrategia de splitting.
Acao: `build.rollupOptions.output.manualChunks` separando vendor (react/react-dom), recharts e axios; e/ou `React.lazy` + `Suspense` no `ChartDisplay` e `AdminPanel` (telas pos-login). So isolar Recharts sob demanda ja derruba o JS inicial.

### `localhost:8000` hardcoded em ReceiptCapture e AdminPanel **(do audit)**
Impacto alto x esforco baixo. `frontend/src/components/ReceiptCapture.tsx:68`; `frontend/src/components/AdminPanel.tsx:45` (usos `52-168`).
Por que importa: bug vivo de demo. Os dois reimplementam `import.meta.env.VITE_API_URL || 'http://localhost:8000'` em vez de `API_CONFIG.BASE_URL` (`config/constants.ts:6-14`). Sem `VITE_API_URL`, OCR e admin quebram no deploy, e o avaliador pode abrir justamente o OCR.
Acao: importar `{ API_CONFIG }` e usar `API_CONFIG.BASE_URL` nos dois. Fonte unica de verdade da base URL.

### ErrorBoundary que e boundary de verdade **(do audit)**
Impacto alto x esforco baixo. `frontend/src/App.tsx:19-45`.
Por que importa: o "ErrorBoundary" usa `useState` + `window.addEventListener('error')`, que so pega erro global/async, nao erro de render do React. Um throw durante render derruba a arvore pra branco apesar do fallback. Error boundary que nao e boundary e erro conceitual visivel numa vaga de eng.
Acao: converter para class component com `getDerivedStateFromError` + `componentDidCatch`, ou usar `react-error-boundary`. Pequeno, alto sinal tecnico.

### README com screenshots reais do app **(novo)**
Impacto alto x esforco baixo. `C:/git/PieTracker/README.md:40-46`.
Por que importa: a secao Screenshots tem so a nota `Real screenshots can be added here` e descricoes em italico, sem imagem. README e a primeira coisa que o recrutador abre no GitHub; o resto ja e forte (badges, demo, arquitetura, trade-offs), falta o visual. Maior ganho de impressao por menor esforco.
Acao: 3 prints reais no business claro (dashboard com pie+total, form com OCR preenchido, admin) em `docs/screenshots/`, embedados no README. Idealmente um GIF curto de adicionar despesa.

### Demo populada: hoje o link da Vercel cai em tela de login vazia **(do audit)**
Impacto alto x esforco medio. `frontend/src/App.tsx:47-122` (`AuthenticatedApp` gated por auth); `README.md:12` (link da demo).
Por que importa: o dashboard inteiro vive pos-login. O cenario mais provavel: o recrutador clica no link, ve a tela de auth e fecha sem criar conta, nunca vendo graficos/OCR/multi-moeda. Mesmo criando conta, comeca vazio.
Acao: botao "Ver demo" na `LoginForm` que loga numa conta seed populada com despesas em varias moedas/categorias, ou semear dados no primeiro login. Documentar credenciais demo no README.

### `@import` de 3 familias de fonte render-blocking, 2 nunca usadas no business **(novo)**
Impacto alto x esforco baixo. `frontend/src/App.css:3` (`@import` Playfair+Inter+Crimson); `App.css:6114-6134` (business usa so `var(--font-sans)`).
Por que importa: o `@import` e render-blocking e baixa Playfair (5 pesos) e Crimson (3 pesos) que o estilo business (o que o recrutador ve primeiro) nunca renderiza, pois forca `var(--font-sans)`=Inter. Desperdicio de bytes no first paint exatamente na primeira impressao.
Acao: tirar o `@import` do CSS e por no `<head>` do `index.html` `<link rel=preconnect>` + `<link rel=stylesheet>` so com Inter e os pesos usados. Carregar Playfair/Crimson sob demanda so quando `data-style=casual`.

---

## Medio impacto

### POST /expenses com modelo Pydantic (ExpenseCreate) **(do audit)**
Impacto medio x esforco baixo. `backend/main.py:358-371`.
Por que importa: `create_expense` recebe `expense: dict` e acessa `expense['amount']` direto; campo faltando da KeyError 500, sem validacao de tipo, destoando do resto que usa Pydantic.
Acao: criar `ExpenseCreate(BaseModel)` com `amount: float`, `category/description/date: str`, `currency` com default; tipar o parametro. Retorna 422 limpo e mostra dominio de FastAPI.

### Inverter o modelo de estilo: casual atras de seletor, business limpo por ausencia **(do audit)**
Impacto medio x esforco medio. `frontend/src/App.css:6155-6164` (`[data-style=business] ... display:none`); decoracoes base em `App.css:299-321`, gradiente de titulo `~408-412`.
Por que importa: o default da app e business (`StyleContext.tsx`) mas o CSS default e casual: folhas, gradiente em texto, serif e pills sao definidos sem escopo e depois NEGADOS por `display:none` no business. O audit (AVALIACAO.md:119-120) pediu o contrario. Como esta, qualquer seletor decorativo novo vaza pro business ate alguem lembrar de nega-lo, e a stylesheet conta historia de feature remendada.
Acao: por ornamento e gradiente-texto so sob `[data-style="casual"]`; business limpo por ausencia, nao por `display:none`.

### Integrar o bloco-patch business/casual em vez de apendice no fim do CSS **(novo)**
Impacto medio x esforco medio. `frontend/src/App.css:6053-6194` (bloco anexado) vs `:root` original em `App.css:5-51`.
Por que importa: toda a feature nova (style-toggle, tokens, tabular-nums, kill do glifo, overrides business) esta amontoada num apendice de ~140 linhas no fim, separada dos tokens e seletores que modifica. Le-se a folha inteira achando que e casual-only e so no rodape aparece o sistema de 2 estilos. Impressao de bolted-on, exatamente a que evitar.
Acao: mover os tokens do apendice pro bloco `:root`/`[data-theme]`/`[data-style]` do topo e distribuir cada override business junto da regra que sobrescreve. O sistema deve parecer projetado.

### Folhas div do InfoPanel renderizam ate no business (markup nao gated) **(novo)**
Impacto medio x esforco baixo. `frontend/src/components/InfoPanel.tsx:175-187`.
Por que importa: `App.tsx:125` e `AuthContainer.tsx:43` condicionam folhas a `style === "casual"`, mas o InfoPanel renderiza 12 `.falling-leaf` incondicionalmente, e o CSS base nao gateia elas. Resultado: folhas aparecem no business, furando a promessa do estilo sobrio. Incoerencia que o avaliador nota ao alternar estilos.
Acao: envolver em `{style === "casual" && (...)}` ou, melhor, trocar as 12 divs por `<FallingLeaves/>` (consistencia + reduced-motion + gate de graca).

### CSS morto das folhas main/auth (substituidas por canvas) **(novo, corrige o audit)**
Impacto medio x esforco baixo. MORTAS: `App.css:2823-2954` (`.main-leaf`/`.main-falling-leaves` + `@keyframes main-fall`), `App.css:5299-5417` (`.auth-leaf`/`.auth-falling-leaves`). VIVAS: `App.css:3006-3132` e `4428-4494` (`.falling-leaves`/`.falling-leaf` consumidas pelo InfoPanel).
Por que importa: o audit afirmou que TODAS as classes de folha viraram dead code com o canvas. So o fundo e o auth migraram; `.falling-leaves`/`.falling-leaf` continuam vivas pelo InfoPanel. Mortas de verdade hoje sao so as `.main-*` e `.auth-*`.
Acao: apagar os blocos `.main-*`/`@keyframes main-fall` e `.auth-*` (incl. variantes dark). Para `.falling-leaves`/`.falling-leaf`, decidir junto com o item do InfoPanel acima (se trocar por `<FallingLeaves/>`, matar tambem essas).

### Rotas backend duplicadas `/health` e `/` com a versao boa shadowada **(do audit)**
Impacto medio x esforco baixo. `backend/main.py:215` e `240` (`/health`), `229` e `305` (`/`).
Por que importa: FastAPI usa a ultima registrada. A `/` detalhada (mostra docs e `database_status`, `229-238`) fica morta e responde a trivial `305-307`. Duas funcoes `health_check` no mesmo modulo confundem.
Acao: manter so a `/` informativa (`229-238`) e a `/health` detalhada (`240-266`); apagar a `/` trivial e a `/health` simples; renomear funcoes duplicadas.

### Componentes mortos CategoryManager e Header ainda no repo **(do audit)**
Impacto medio x esforco baixo. `frontend/src/components/CategoryManager.tsx` (+ `.css`), `frontend/src/components/Header.tsx`.
Por que importa: zero imports em `src`. `Header.tsx` e o unico que usa `.header h1`, mantendo viva uma teia de 3 regras `.header h1::after` que brigam entre si (`App.css:414-422`, `3623-3625`, `6097-6100`) e o emoji literal no `Header.tsx`. Orfaos que so somam ruido.
Acao: apagar os tres arquivos e, junto, o CSS `.header`/`.header h1`/`.title-icon` e os 3 `::after`. Some o glifo quebrado de uma vez.

### `console.log` de debug em producao **(do audit)**
Impacto medio x esforco baixo. `frontend/src/App.tsx:72-78` (bloco "Debug logging for production"); `hooks/useExpenses.ts`, `utils/currency.ts` (~13 logs).
Por que importa: `App.tsx:73-78` loga loading, API base, MODE e username em todo mount. Vaza estado no console em prod e e a primeira coisa que o avaliador ve no DevTools da demo.
Acao: remover o bloco `App.tsx:72-78` e os logs de `useExpenses.ts`/`currency.ts`, ou gatear com `if (import.meta.env.DEV)`.

### Backend dead code: `_safe_write_json`, `_rotate_backups`, `users_db` **(do audit)**
Impacto medio x esforco baixo. `backend/main.py:80` (`users_db`), `88-125` (`_rotate_backups`/`_safe_write_json`).
Por que importa: as duas funcoes nunca sao chamadas e `users_db` e dict vazio mantido "for compatibility" ja substituido pelo banco. Fosseis da persistencia em arquivo abandonada.
Acao: apagar as funcoes e o dict; reavaliar a feature de backup em arquivo inteira (ver path traversal abaixo).

### Path traversal em `/admin/backup/download` (feature fossil) **(do audit)**
Impacto medio x esforco baixo. `backend/main.py:914-924`.
Por que importa: `name` do query string e concatenado em `os.path.join(BACKUP_DIR, name)` sem sanitizar, servindo de um diretorio onde nada escreve. Codigo morto que ainda e exploravel e o pior dos dois mundos.
Acao: decisao de arquitetura, remover a feature de backup em arquivo por inteiro (endpoints + `BACKUP_DIR` + funcoes mortas). Se mantiver, `os.path.basename` + validar prefixo.

### AdminPanel reusando o service layer em vez de fetch cru **(novo)**
Impacto medio x esforco medio. `frontend/src/components/AdminPanel.tsx:45-168`.
Por que importa: o resto do app fala com o backend via `services/auth.ts` e `hooks/useExpenses.ts` (axios + `API_CONFIG`); o AdminPanel usa `fetch` nativo, monta a base URL na mao e remonta headers `Authorization` em cada chamada. Duas convencoes de acesso a API no mesmo projeto sinalizam falta de camada de servico.
Acao: extrair um `adminService` que reuse `API_CONFIG.BASE_URL` e o padrao de auth ja existente, e consumir dele.

### Testes do sistema de estilos novo (StyleContext / StyleToggle) **(novo)**
Impacto medio x esforco baixo. `frontend/src/contexts/StyleContext.tsx`, `hooks/useStyle.ts`, `components/StyleToggle.tsx`; novos `*.test.tsx`.
Por que importa: o diferencial desta sessao (2 estilos via `data-style` + persistencia) nao tem nenhum teste, justamente a feature a destacar. Ja existe `ThemeToggle.test.tsx` como padrao a espelhar.
Acao: testar default business; `toggleStyle` alterna e grava `style` no localStorage; provider aplica `data-style` no html; `useStyle` fora do provider lanca.

### Teste de integracao dos endpoints de dados (auth obrigatoria) com TestClient **(novo)**
Impacto medio x esforco medio. `backend/tests/` (novo); `backend/main.py:309-390`.
Por que importa: o backend so cobre helpers puros (security 26, parsing 19, db 2); zero teste de rota HTTP. Depois de fechar o IDOR, um teste de ponta a ponta vira a prova viva da correcao.
Acao: `TestClient`: GET/POST/DELETE `/expenses` sem `Authorization` -> 401; token de A nao enxerga dados de B.

### `index.html` sem meta description, Open Graph e theme-color **(novo)**
Impacto medio x esforco baixo. `frontend/index.html:1-16`.
Por que importa: o html tem so charset, favicon, viewport e title. Sem OG/Twitter card, colar o link da demo no LinkedIn/email pro recrutador nao gera preview. Preview rico sinaliza capricho de produto.
Acao: `description`, `og:title/description/image/url`, `twitter:card=summary_large_image`, `theme-color` (claro `#f6f9fc` / dark `#171721`).

### Nome inconsistente: "Pie Tracker" vs "PieTracker" **(novo)**
Impacto medio x esforco baixo. `frontend/src/App.tsx:152` ("Pie Tracker"), `frontend/index.html:10` e `README.md:1` ("PieTracker").
Por que importa: inconsistencia de branding e o descuido que um avaliador atento nota, sugerindo falta de revisao final.
Acao: padronizar em "PieTracker" em todos os pontos de UI (conferir tambem AuthContainer).

---

## Baixo impacto / nice-to-have

### Ticks/labels do Recharts fora do tabular-nums **(novo)**
Impacto baixo x esforco baixo. `frontend/src/App.css:6102-6112` (regra cobre `.total-amount` etc., nao os ticks); `ChartDisplay.tsx` (YAxis/tooltip).
Por que importa: os numeros do eixo Y (texto SVG da lib) nao herdam a regra de tabular-nums, entao ainda "dancam" ao trocar de escala. Fecha o ultimo flanco do P0 de numerais.
Acao: `font-variant-numeric: tabular-nums` em `.recharts-text`/`.recharts-cartesian-axis-tick text`.

### `transition: all` repetido 55x **(do audit)**
Impacto baixo x esforco medio. `frontend/src/App.css` (55 ocorrencias, ex. inputs `~888`).
Por que importa: o `prefers-reduced-motion` ja foi adicionado, mas os 55 `transition: all` continuam animando border/box-shadow/transform juntos e escondem o que de fato anima.
Acao: trocar por listas explicitas nas regras quentes (inputs, botoes, cards); 1-2 tokens de transition reusaveis.

### Copy fluff "Track your spending with style" no form **(do audit)**
Impacto baixo x esforco baixo. `frontend/src/components/ExpenseForm.tsx:402`.
Por que importa: frase de venda, nao orientacao de uso; "with style" contradiz o tom sobrio do business. O par dele no auth ja foi removido.
Acao: trocar por texto funcional ("Amount, category and date are required") ou remover o subtitulo.

### Glifo quebrado ainda na fonte do CSS, so neutralizado em duplicata **(do audit)**
Impacto baixo x esforco baixo. `frontend/src/App.css:415` (content do glifo) vs `3623-3625` e `6097-6100` (dois overrides que escondem).
Por que importa: resultado liquido correto, codigo sujo: tres regras `.header h1::after` pra um efeito de componente morto.
Acao: apagar a regra-fonte (`414-422`) e os dois overrides redundantes, junto com o Header.tsx.

### Favicon torta colorida destoa do business **(novo)**
Impacto baixo x esforco baixo. `frontend/index.html:5-8` (SVG inline com paleta casual `#a8b5a0`/`#f4a261`/`#7ba098`).
Por que importa: o favicon usa a paleta sage/coral/teal do estilo CASUAL, brigando com a UI business azul `#533afd` logo na aba do browser.
Acao: favicon sobrio alinhado ao business (PNG 32x32 + 180x180 apple-touch em `frontend/public/`).

### Caminho anonimo `resolve_user_id`/`get_user_id` a remover **(do audit)**
Impacto baixo x esforco baixo. `backend/main.py:277-286`, `security.py` (`resolve_user_id`, `PUBLIC_USER_ID`).
Por que importa: manutenibilidade. So existe pra um modo que nao deve rodar; deixa duas formas de obter o usuario onde deveria haver uma. Cai junto com o fix do IDOR.
Acao: apos fechar o IDOR, apagar `get_user_id`/`resolve_user_id`/`PUBLIC_USER_ID` e o ramo anonimo no front.

### Dependencias mortas bcrypt e python-magic **(do audit)**
Impacto baixo x esforco baixo. `backend/requirements.txt:4,6,13`.
Por que importa: nenhum `import bcrypt`/`import magic`; o hashing usa `pbkdf2_sha256`. Menos superficie num projeto lido linha a linha.
Acao: remover `bcrypt` e `python-magic`; trocar `passlib[bcrypt]` por `passlib`.

### Assets default do Vite nao usados **(novo)**
Impacto baixo x esforco baixo. `frontend/public/vite.svg`; `frontend/src/assets/react.svg`.
Por que importa: restos do scaffold create-vite, nao referenciados. Sinalizam projeto nao limpo na arvore de arquivos.
Acao: apagar os dois (e a pasta `src/assets` se ficar vazia); por o favicon real no `public/`.

### Arquivo LICENSE ausente **(novo)**
Impacto baixo x esforco baixo. `README.md:299-301` declara MIT, sem arquivo `LICENSE` na raiz.
Por que importa: higiene que o proprio README ja aponta como pendencia.
Acao: adicionar `LICENSE` (MIT) na raiz.

### Pasta `scripts/` com one-offs de debug sem organizacao **(novo)**
Impacto baixo x esforco baixo. `scripts/` (`debug_categories.py`, `diagnose_db.py`, `reset_categories.py`, `cleanup_categories.py`, etc.).
Por que importa: 11 scripts soltos misturando smoke tests legitimos, manutencao e debug throwaway. Parece diretorio de rascunhos; a primeira leitura da arvore conta.
Acao: separar `scripts/maintenance` e `scripts/smoke`; remover os descartaveis; alinhar o README de scripts.

### Smoke e2e (Playwright): login -> add expense -> ver grafico **(novo)**
Impacto baixo x esforco alto. Repo (nao existe `playwright.config` nem e2e).
Por que importa: um smoke do fluxo critico sinaliza maturidade, mas o ROI esta nos P0. Nao e prioridade antes de submeter.
Acao: se sobrar tempo, 1 spec do caminho feliz; caso contrario, registrar no README como proximo passo.

### Split do App.css monolitico por camadas **(novo)**
Impacto medio x esforco alto. `frontend/src/App.css` (6194 linhas, 555 seletores); import unico em `App.tsx:16`.
Por que importa: quase todo o CSS vive num arquivo so, sem co-localizacao com componentes. Pro avaliador e o primeiro sinal de divida (impossivel achar o estilo de um componente sem grep). Esforco alto e gzip ja e ok (19KB), entao fica abaixo dos itens acima, mas e o maior salto de organizacao percebida.
Acao: quebrar em `tokens.css` (todas as `:root`/`[data-theme]`/`[data-style]`), `base.css` (reset/tipografia) e um `.css` por componente co-localizado, como ja se faz com `AdminPanel.css` e `ReceiptCapture.css`.

---

## Itens de correcao abertos

Repriorizando o que ja esta em `docs/AVALIACAO.md` (sem recopiar o detalhe de la). Acessibilidade e o maior bloco ainda aberto e nao foi tocado nesta sessao alem do reduced-motion:

- **Prioridade 1 (correcao/seguranca, ja cobertos como Alto impacto acima):** IDOR (P0), grafico anual (P0), admin hardcoded (P1), localhost hardcoded (P1), ErrorBoundary (P1), Pydantic no POST (P2).
- **Prioridade 2 (acessibilidade WCAG, P0/P1 do audit ainda 100% abertos):** contraste AA da paleta sage/bege (`AVALIACAO.md:21-28`); foco de teclado sem anel visivel (`30-34`); `aria-live` em toasts/erros (`62-66`); modais sem `role=dialog`/focus trap (`68-72`); date picker inacessivel por teclado (`140-144`); validacao so por cor (`146-150`). Alto valor pra vaga e o avaliador pode rodar Lighthouse/leitor de tela. Adotar um token unico de anel de foco `:focus-visible` (generalizando o `.date-input-display` que ja existe) e um container `aria-live` resolvem boa parte com pouco codigo.
- **Prioridade 3 (data-viz / moeda, P1/P2):** paleta de categorias com luminancia escalonada (`122-126`); pie dependendo so de cor (`128-132`); `formatCurrency` ignorando locale via `Intl.NumberFormat` (`134-138`); arredondamento de moeda sem decimais (`160-164`); fallback errado "Canadian Dollar" em `getCurrencyName` (`166-170`); cores do pie lidas do DOM fora do React (`172-176`).
- **Prioridade 4 (tipografia/hierarquia/polimento, P1/P2):** sopa de fontes (`98-102`), hierarquia de titulos inconsistente (`104-108`), `.chart-title` sobrecarregada (`110-114`), emoji em headers/botoes (`190-194`), escala de espacamento por valores magicos (`184-188`), `.expense-count` com dois significados (`178-182`).
- **Nits (P2):** OCR vaza `str(e)` ao cliente (`250-254`), reset de senha expoe "Check server logs" (`268-272`), `datetime.utcnow()` deprecado e `SECRET_KEY` default de dev (`274-278`), `color-scheme: dark` ausente (`208-212`), `name` faltando no email do Forgot Password (`214-218`).

---

## Recomendacao

Os 5 movimentos de maior alavancagem pra impressionar o avaliador, em ordem:

1. **Fechar o IDOR + admin so por role + teste de endpoint com TestClient.** Seguranca e o que mais pesa numa vaga fintech, e o teste de ponta a ponta transforma a correcao em prova. Maior peso por esforco medio.
2. **Corrigir o grafico anual (conversao de moeda + escala/tick) + teste de regressao.** Bug de correcao financeira visivel na demo; esforco baixo, sinal alto de cuidado com dinheiro e com teste.
3. **Demo populada + README com screenshots reais.** O recrutador hoje cai numa tela de login vazia e fecha. Garantir que o link mostre o app cheio de graficos e que o README tenha imagem e o ganho de primeira impressao mais barato.
4. **Higiene de demo: ErrorBoundary de verdade, `localhost` -> `API_CONFIG`, remover `console.log`, code-splitting do Recharts.** Tudo de baixo esforco que evita o pior cenario (tela branca, OCR quebrado, logs vazando) e mostra otimizacao no Network/Lighthouse.
5. **Integrar o bloco-patch business/casual e inverter o modelo de estilo (casual escopado, business limpo).** Faz o diferencial da sessao parecer projetado, nao remendado, e e o que o avaliador percebe ao alternar estilos. Se sobrar folego, comecar o split do App.css.

Acessibilidade WCAG (Prioridade 2 acima) fica logo apos esses 5: e o maior bloco ainda 100% aberto do audit e tem alto retorno se o avaliador rodar Lighthouse ou um leitor de tela.
