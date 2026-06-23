# Design System PieTracker: 2 estilos x 2 temas

Status: RASCUNHO PARA APROVACAO (especificacao, nao implementada)
Autor: Lucas Stankevicius
Escopo: especificar o design system de 4 combinacoes antes de tocar codigo.

Este documento e a especificacao. Nenhum arquivo de codigo deve ser alterado ate ele ser aprovado.

## 0. Conceito e estado atual

Dois eixos ortogonais:

- ESTILO: `business` (fintech serio) e `casual` (clima atual sage/bege).
- TEMA: `claro` e `escuro`.

2 x 2 = 4 combinacoes: `casual-claro`, `casual-escuro`, `business-claro`, `business-escuro`.

Estado atual do codigo (ponto de partida):

- `frontend/src/components/ThemeToggle.tsx:8` le `localStorage["theme"]`; `ThemeToggle.tsx:15` e `:24` poem `data-theme="dark"` em `document.documentElement`; `ThemeToggle.tsx:26` remove o atributo no modo claro (light = ausencia de atributo).
- `frontend/src/App.css:5` define `:root` (tema claro) e `frontend/src/App.css:32` define `[data-theme="dark"]`. O arquivo tem 5960 linhas e usa `[data-theme="dark"]` espalhado.
- `frontend/src/constants/colors.ts:80` le `document.documentElement.getAttribute("data-theme")` para decidir as cores dos charts.

A identidade CASUAL atual (a ser preservada integralmente) vem de `App.css:5-51` e de `colors.ts:3-27`:

- Paleta sage/bege: `--sage-green #a8b5a0`, `--soft-beige #ede6d8`, `--cream-white #efe8da`, `--paper-white #f1eadc`, `--muted-teal #7ba098`, `--dusty-rose #d4b5a0`, `--warm-gray #c7c0b8`, `--charcoal #4a4a4a`, `--text-soft #6b6b6b` (`App.css:6-14`).
- Acentos: `--accent-gold #d4af37`, `--accent-coral #f4a261`, `--accent-lavender #c8a2c8` (`App.css:15-17`).
- Fontes: corpo `Inter` (`App.css:60`), headings serifados `Playfair Display` (h1, `App.css:88`) e `Crimson Text` (h2/h3, `App.css:94`,`:100`), importados em `App.css:3`.
- Radius: cartoes 12-16px (`App.css:388`,`:487`,`:610`), botoes pill 35px (`App.css:285`), inputs 8px (`App.css:848`).
- Sombras suaves coloridas: `--shadow-soft 0 8px 32px rgba(168,181,160,.2)`, `--shadow-card 0 4px 20px rgba(0,0,0,.1)`, `--shadow-button 0 6px 24px rgba(168,181,160,.3)` (`App.css:21-23`).
- Folhas animadas: `App.css:202` (cantos), `App.css:723` (cards), `App.css:2731` (folhas caindo do menu principal `.main-falling-leaves` / `.main-leaf`), montadas em `App.tsx:120` e no `Header.tsx:9` (`🌿`).
- Cores de categoria dos charts (sage/terroso): `ELEGANT_COLORS` e `DARK_MODE_COLORS` em `colors.ts:3-27`.

O estilo casual herda 1:1 esses valores. O estilo business e novo, fundamentado na pesquisa fintech (Mercury, Ramp, Stripe, Wise, Monarch, Copilot, YNAB).

## 1. Tokens semanticos (variaveis CSS) para as 4 combinacoes

Principio (vindo do artigo de cor semantica do YNAB e do Stripe): a UI consome tokens com nome de USO (`--bg`, `--text`, `--primary`), nunca nome de matiz (`--sage-green`). Cada token recebe valores diferentes por combinacao estilo x tema. Trocar de combinacao = trocar o mapeamento, sem reescrever as 5960 linhas por cor.

Convencao de nomes (15 tokens semanticos):

`--bg`, `--surface`, `--text`, `--text-muted`, `--primary`, `--accent`, `--border`, `--success`, `--danger`, `--font-sans`, `--font-numeric`, `--radius`, `--shadow`, `--spacing-unit`.

Observacoes transversais:

- `--font-numeric` existe em TODA combinacao porque numerais tabulares em valor monetario sao requisito de toda UI financeira seria (Stripe, Ramp, Monarch, YNAB, tendencia 2026). A regra de aplicacao esta na secao 5. Diferenca: no casual e detalhe discreto; no business e identidade.
- `--accent` no business e quase sempre igual ao `--primary` (a pesquisa manda reservar o acento azul SO para acao primaria: Mercury, Stripe, Ramp). No casual o accent e a cor quente decorativa (gold/coral), distinta do primary sage.
- `--success` e `--danger` mantem semantica universal (verde = positivo, vermelho = negativo) nas 4 combinacoes.

### 1.1 Estilo CASUAL (preserva a identidade atual)

| token | casual-claro | casual-escuro | origem |
| --- | --- | --- | --- |
| `--bg` | `#ede6d8` | `#1a1812` | `App.css:7` / `:34` (`--soft-beige`) |
| `--surface` | `#efe8da` | `#141210` | `App.css:8` / `:35` (`--cream-white`) |
| `--text` | `#4a4a4a` | `#e5e5e5` | `App.css:13` / `:40` (`--charcoal`) |
| `--text-muted` | `#6b6b6b` | `#c9c9c9` | `App.css:14` / `:41` (`--text-soft`) |
| `--primary` | `#a8b5a0` | `#7a8c6f` | `App.css:6` / `:33` (`--sage-green`) |
| `--accent` | `#d4af37` | `#d4af37` | `App.css:15` / `:42` (`--accent-gold`) |
| `--border` | `#c7c0b8` | `#4a453f` | `App.css:12` / `:39` (`--warm-gray`) |
| `--success` | `#525B02` | `#6b7d03` | `colors.ts:4` / `:17` (verde forest) |
| `--danger` | `#b54a3a` | `#c0604f` | novo (faltava no casual; tom terroso quente, nao puro) |
| `--font-sans` | `"Inter", "Segoe UI", "Roboto", -apple-system, sans-serif` | idem | `App.css:60` |
| `--font-numeric` | `"Inter", sans-serif` | idem | mesma Inter (`tabular-nums` via util, sec. 5) |
| `--radius` | `16px` | `16px` | `App.css:487` (workhorse de card) |
| `--shadow` | `0 4px 20px rgba(0,0,0,.1)` | `0 4px 20px rgba(0,0,0,.3)` | `App.css:22` / `:49` (`--shadow-card`) |
| `--spacing-unit` | `8px` | `8px` | base atual dos paddings/gaps |

Headings casual continuam serifados via `--font-display: "Playfair Display"/"Crimson Text"` (token extra so do casual, mantido de `App.css:88`,`:94`). Tokens de gradiente (`--gradient-sage` etc., `App.css:19-20`) e os acentos secundarios `--accent-coral`/`--accent-lavender` permanecem exclusivos do casual e ficam fora da tabela semantica de 15 (sao decorativos, nao estruturais).

### 1.2 Estilo BUSINESS (novo, fintech sobrio)

Fundamentacao: azul/indigo como acento unico de acao primaria (Mercury `#5266eb`, Stripe `#635BFF`/`#533AFD`, Monarch `#395384`, Classic Blue `#288cfa`). Texto azul-petroleo em vez de preto puro (Stripe `#0A2540`). Bordas hairline em vez de sombra forte (Mercury, Stripe). Cantos discretos 4-8px. Inter como fonte (numerais tabulares de fabrica). Zero folha, zero emoji estrutural.

| token | business-claro | business-escuro | fundamentacao |
| --- | --- | --- | --- |
| `--bg` | `#f6f9fc` | `#171721` | Stripe `#F6F9FC` (claro) / Mercury `#171721` (canvas escuro) |
| `--surface` | `#ffffff` | `#1e1e2a` | Stripe branco / Mercury `#1e1e2a` (elevado) |
| `--text` | `#0a2540` | `#ededf3` | Stripe Downriver `#0A2540` / Mercury `#ededf3` |
| `--text-muted` | `#425466` | `#8a8478` | Stripe Steel `#425466` / Mercury muted `#8a8478` |
| `--primary` | `#533afd` | `#5266eb` | Stripe Electric Iris / Mercury indigo (acao primaria) |
| `--accent` | `#533afd` | `#5266eb` | igual ao primary (acento reservado, nao espalhado) |
| `--border` | `#e3e8ee` | `#272735` | Stripe hairline `#E3E8EE` / Mercury hairline `#272735` |
| `--success` | `#2f7d57` | `#3ecf8e` | Mercury success `#2f7d57` / Stripe green `#3ECF8E` |
| `--danger` | `#df1b41` | `#b54a3a` | Stripe error `#DF1B41` / Mercury danger `#b54a3a` |
| `--font-sans` | `"Inter", system-ui, -apple-system, sans-serif` | idem | Inter (fallback open-source Stripe; recomendacao 2026) |
| `--font-numeric` | `"Inter", system-ui, sans-serif` | idem | Inter (`tabular-nums` de fabrica) |
| `--radius` | `6px` | `6px` | Mercury workhorse 4-8px / Stripe raio discreto |
| `--shadow` | `none` | `none` | elevacao plana por hairline (Mercury, Stripe). Modais podem usar `0 4px 16px rgba(10,37,64,.08)` |
| `--spacing-unit` | `8px` | `8px` | base 4/8 (Mercury, Stripe, base 4px) |

Business NAO define `--font-display` (sem serif decorativa): headings usam `--font-sans` com peso medio (~500/600) para autoridade sem peso, conforme Mercury 480 e takeaway Stripe.

Validacao de contraste (requisito, ainda nao verificado): cada par texto/fundo das 4 combinacoes deve passar WCAG 4.5:1 (texto pequeno) e idealmente APCA (metodo Wise). `--text` business-claro `#0a2540` sobre `#ffffff` e `--text` casual-escuro `#e5e5e5` sobre `#141210` ja sao seguros; os pares `--text-muted` e os `--primary` em botao precisam de checagem antes do merge.

## 2. Arquitetura de troca

### 2.1 Modelo de atributos no `<html>`

Espelhar o padrao do tema. Hoje so existe `data-theme` em `document.documentElement` (`ThemeToggle.tsx:15`). Adicionar um segundo atributo independente `data-style`:

- `data-theme`: ausente = claro; `"dark"` = escuro (mantido exatamente como esta, nao mexer no ThemeToggle quanto a isso).
- `data-style`: `"business"` (default) ou `"casual"`. Sempre presente (inclusive no default), para o seletor CSS ser explicito e nao depender de ausencia.

Os dois atributos sao ortogonais e combinam livremente. As 4 combinacoes no `<html>`:

```
<html data-style="business">                  business-claro (default)
<html data-style="business" data-theme="dark"> business-escuro
<html data-style="casual">                     casual-claro
<html data-style="casual"  data-theme="dark">  casual-escuro
```

### 2.2 StyleContext + hook useStyle

Seguir o mesmo padrao do `AuthContext` (`contexts/AuthContext.tsx`): Context com Provider e hook consumidor. Arquivos novos:

- `frontend/src/contexts/StyleContext.tsx`: define `StyleContext`, `StyleProvider`. Estado `style: "business" | "casual"`.
- `frontend/src/hooks/useStyle.ts`: hook que consome o context (espelha `hooks/useAuth.ts`).

Comportamento do Provider (espelha a logica do ThemeToggle, sec. `ThemeToggle.tsx:6-30`):

- Na montagem: ler `localStorage["style"]`; se ausente, default `"business"`; aplicar `document.documentElement.setAttribute("data-style", style)`.
- `setStyle(next)`: atualiza estado, faz `setAttribute("data-style", next)` e grava `localStorage.setItem("style", next)`.
- Diferenca proposital frente ao tema: o style NAO segue `prefers-color-scheme` (so o tema segue, `ThemeToggle.tsx:9`). Style nao tem preferencia de sistema; default fixo `business`.

Por que Context (e nao copiar o padrao state-local do ThemeToggle): o seletor de estilo precisa ser lido por outros componentes alem do botao, principalmente `colors.ts` e os charts (sec. 4 e 5). O ThemeToggle hoje guarda `isDark` em state local porque so ele precisa; o style sera consumido em mais lugares, entao Context evita prop drilling.

`StyleProvider` envolve a arvore no mesmo ponto onde o app e montado (junto do `AuthProvider`).

### 2.3 Como ficam os seletores CSS

A camada de tokens (sec. 1) vira blocos de mapeamento. Substituir o `:root`/`[data-theme="dark"]` atuais por 4 blocos explicitos. Esqueleto:

```css
/* CASUAL CLARO (data-style="casual", sem data-theme) */
[data-style="casual"] {
  --bg: #ede6d8;
  --surface: #efe8da;
  --text: #4a4a4a;
  /* ...demais tokens casual-claro... */
}

/* CASUAL ESCURO */
[data-style="casual"][data-theme="dark"] {
  --bg: #1a1812;
  --surface: #141210;
  --text: #e5e5e5;
  /* ...demais tokens casual-escuro... */
}

/* BUSINESS CLARO (default) */
[data-style="business"] {
  --bg: #f6f9fc;
  --surface: #ffffff;
  --text: #0a2540;
  /* ...demais tokens business-claro... */
}

/* BUSINESS ESCURO */
[data-style="business"][data-theme="dark"] {
  --bg: #171721;
  --surface: #1e1e2a;
  --text: #ededf3;
  /* ...demais tokens business-escuro... */
}
```

Especificidade: `[data-style][data-theme]` (0,2,0) vence `[data-style]` (0,1,0), entao a regra escura sobrescreve corretamente a clara dentro do mesmo estilo. Como o eixo style esta presente em ambos, nao ha conflito entre estilos.

Compatibilidade durante a migracao: os nomes antigos (`--sage-green`, `--cream-white` etc.) podem ser mantidos como aliases apontando para os tokens semanticos APENAS dentro dos blocos casual, evitando reescrever as 5960 linhas de uma vez. Ex.: dentro de `[data-style="casual"]`, `--sage-green: var(--primary);`. Isso e ponte temporaria, removida ao fim da migracao (sec. 5).

## 3. Seletor de estilo no header

### 3.1 Posicao

Ao lado do `ThemeToggle`, no mesmo container de acoes do header. Hoje o `ThemeToggle` e montado em `App.tsx:167`, dentro de `<div className="user-header-actions">` (`App.tsx:166`), antes do botao Logout (`App.tsx:168`). O novo `StyleToggle` entra imediatamente antes do `ThemeToggle`, no mesmo `user-header-actions`:

```
user-header-actions
  -> StyleToggle   (novo)
  -> ThemeToggle   (App.tsx:167, existente)
  -> Logout        (App.tsx:168, existente)
```

Novo componente `frontend/src/components/StyleToggle.tsx`, espelhando a estrutura de `ThemeToggle.tsx` (botao com `aria-label`/`title`, classe `.style-toggle` analoga a `.theme-toggle`). Consome `useStyle()`.

### 3.2 Icones (SVG, nunca emoji estrutural)

O `ThemeToggle` ja usa SVG inline (lua `ThemeToggle.tsx:33`, sol `ThemeToggle.tsx:50`), estilo Feather/Lucide. O `StyleToggle` segue a mesma linha. Conjunto de icones (Lucide, MIT, ou Heroicons):

- Estilo casual ativo (acao = trocar para business): icone `briefcase` (Lucide) ou `building-office` (Heroicons), significando "ir para o serio".
- Estilo business ativo (acao = trocar para casual): icone `leaf` (Lucide) ou `sparkles` (Heroicons), significando "ir para o casual".

Os SVGs entram inline como em `ThemeToggle.tsx` (sem dependencia nova; copiar o path do Lucide), `stroke="currentColor"`, `width/height` ~18-20 para casar com o toggle de tema. Regra dura: o `leaf` aqui e icone de CONTROLE (1 glifo SVG monocromatico no botao), nao decoracao. As folhas decorativas continuam exclusivas do estilo casual (sec. 4).

## 4. Diferencas de conteudo entre estilos

Tokens trocam cor/forma; alem disso ha diferencas de CONTEUDO (presenca/ausencia de elementos e copy). Controladas por `data-style` no CSS e por leitura de `useStyle()` no TSX.

Elementos decorativos (so casual, ocultos no business):

- Folhas dos cantos: `App.css:202`,`:217` (`.corner-leaf` etc.).
- Folhas dos cards: `App.css:723-750`.
- Folhas caindo do menu: `App.css:2731+` (`.main-falling-leaves`/`.main-leaf`), montadas em `App.tsx:120-122`.
- `🌿` flutuante do header: `Header.tsx:9` (`.nature-element`).
- Gradientes decorativos (`--gradient-sage`, `--gradient-sunset`, `App.css:19-20`) e animacoes `bounce`/`rotateFlower` (`App.css:312`,`:330`).

Mecanismo de ocultacao: regra CSS `[data-style="business"] .main-falling-leaves, [data-style="business"] .corner-leaf, [data-style="business"] .nature-element { display: none; }`. Onde o elemento e estrutural no DOM (ex.: `🌿` no `Header.tsx:9`), trocar por render condicional via `useStyle()` para nao deixar emoji no DOM mesmo escondido.

Emoji estrutural a remover no business (substituir por icone SVG ou nada):

- `App.tsx:150` `📊 Dashboard`, `:156` `🛡️ Admin Panel`, `:292` `🥧 Pie Tracker`.
- `Header.tsx:9` `🌿`.
- `components/AdminPanel.tsx` (varios: `:200`,`:220`,`:223`,`:230`,`:244`,`:259`,`:272`,`:329`,`:333`,`:357`,`:368`,`:388`,`:403`,`:446-448`,`:468`,`:474`).
- `components/InfoPanel.tsx:201` `📅`.
- `components/ReceiptCapture.tsx:164` `📷`.
- `components/ExpenseForm.tsx:284`,`:653` `💱`, `:731` `✅`, `:735` `⚠️`.
- `components/auth/AuthContainer.tsx:66` `🥧`.

Tratamento por estilo:

- Business: zero emoji. Onde o emoji era so enfeite, remover. Onde carregava significado (status `✅ Active`/`⏸️ Inactive` em `AdminPanel.tsx:329`, sucesso/erro em `ExpenseForm.tsx:731`,`:735`), trocar por icone SVG Lucide monocromatico colorido com `--success`/`--danger`, ou por pill de status (padrao Ramp/YNAB), preservando o significado sem emoji.
- Casual: mantem o emoji atual (clima informal aprovado).

Copy/wording: o documento nao reescreve textos agora, mas registra a regra: copy informal e tom leve sao do casual; o business usa rotulos diretos e neutros. Nesta etapa nenhuma string e alterada; apenas marcada para revisao futura junto da remocao de emoji.

Charts (`colors.ts`): hoje a paleta de categoria e sage/terroso (`ELEGANT_COLORS`/`DARK_MODE_COLORS`, `colors.ts:3-27`) e a escolha depende so de `data-theme` (`colors.ts:80`). No business a paleta deve ser sobria derivada de azul/slate (Monarch, Stripe: serie focal saturada, demais em cinza), sem o arco-iris terroso. Logo `getCategoryColor` (`colors.ts:38`) passa a depender tambem do estilo. Detalhe na sec. 5; o `pie` do PieTracker fica flat, sem efeito 3D (tendencia 2026).

## 5. Plano de migracao (cirurgico)

Principio (CLAUDE.md secoes 2 e 3): mudanca minima, sem refatorar o que nao faz parte da tarefa, cada linha rastreavel ao objetivo. Verificavel a cada passo. Nenhum passo abaixo deve ser executado antes da aprovacao desta spec.

Plano por etapas, cada uma com criterio de verificacao:

1. Camada de tokens no CSS.
   - Acao: no topo de `App.css` (substituindo `:root` `App.css:5` e `[data-theme="dark"]` `App.css:32`), criar os 4 blocos de mapeamento da sec. 2.3 com os 15 tokens da sec. 1. Manter os nomes antigos como aliases dentro dos blocos casual (ponte).
   - Verificar: app abre em `casual-claro` e `casual-escuro` visualmente identico ao atual (a ponte de aliases garante isso). Diff nao toca as ~5900 linhas de regras, so o topo.

2. StyleContext + hook + provider.
   - Acao: criar `contexts/StyleContext.tsx` e `hooks/useStyle.ts` (sec. 2.2); envolver a arvore com `StyleProvider` junto do `AuthProvider`.
   - Verificar: `localStorage["style"]` nasce `business`; alternar o valor manualmente troca `data-style` no `<html>` e o app re-renderiza nos 4 estados. Teste unitario espelhando `ThemeToggle.test.tsx`.

3. StyleToggle no header.
   - Acao: criar `components/StyleToggle.tsx` (sec. 3) e monta-lo em `App.tsx` imediatamente antes do `ThemeToggle` (`App.tsx:167`), dentro de `user-header-actions`.
   - Verificar: botao alterna estilo, persiste em reload, icones SVG corretos, `aria-label` presente. As 4 combinacoes acessiveis pelo par StyleToggle + ThemeToggle.

4. Conteudo decorativo condicional.
   - Acao: regras `[data-style="business"] { display:none }` para folhas/gradientes (sec. 4); render condicional via `useStyle()` para o `🌿` estrutural (`Header.tsx:9`) e para `.main-falling-leaves` (`App.tsx:120`).
   - Verificar: em qualquer tema, business nao mostra folha/gradiente/emoji decorativo; casual mantem tudo.

5. Migracao de componentes para tokens semanticos.
   - Acao, um componente por vez (cartoes, depois forms, depois tabelas do AdminPanel), trocar `var(--sage-green)` etc. por `var(--primary)`/`var(--surface)`/`var(--text)`... e remover o alias correspondente da ponte quando o ultimo uso sair. Surgical: so o componente da vez.
   - Verificar: o componente migrado fica visualmente identico no casual (claro+escuro) E ganha aparencia business correta. Rodar o app e comparar os 4 estados.

6. Numerais tabulares.
   - Acao: criar util `.tabular` (ou classe `.amount`) aplicando `font-variant-numeric: lining-nums tabular-nums; font-feature-settings: "lnum" 1, "tnum" 1;` e usa-la em todo valor monetario, total, saldo, celula de tabela e label/eixo de chart. Garantir `Intl.NumberFormat("pt-BR")` com 2 casas e sinal de menos real (U+2212) nas despesas.
   - Verificar: valores alinham em coluna sem "pular" ao mudar de digito, nos 4 estados. No business e identidade; no casual fica discreto e tambem alinhado.

7. Paleta de charts por estilo.
   - Acao: estender `getCategoryColor` (`colors.ts:38`) e `isDarkModeEnabled` (`colors.ts:74`) para ler tambem `data-style`; adicionar arrays business (azul/slate, serie focal saturada, demais cinza) preservando intactos `ELEGANT_COLORS`/`DARK_MODE_COLORS` (`colors.ts:3-27`) para o casual.
   - Verificar: charts no casual identicos ao atual; no business usam a paleta sobria; pie flat sem efeito 3D.

8. Limpeza da ponte e tirar "Beautiful".
   - Acao: remover aliases antigos remanescentes apos a ultima migracao; remover o rotulo "Beautiful" do comentario `App.css:1` e qualquer copy correlata.
   - Verificar: nenhum `--sage-green`/`--cream-white` etc. restante fora dos blocos casual; build limpo; lint sem orfaos (CLAUDE.md secao 3: remover so os orfaos que a propria mudanca criou).

Fora de escopo desta spec (nao fazer sem pedido): reescrever copy/textos do produto, mexer no backend FastAPI, alterar layout/estrutura de telas, adicionar dependencias de UI. Icones SVG entram inline copiando o path do Lucide/Heroicons (sem novo pacote), como ja faz o `ThemeToggle`.
