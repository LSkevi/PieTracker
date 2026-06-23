# Pesquisa de fintechs para o estilo BUSINESS

Resumo curto e acionável do que fintechs de referência (Mercury, Ramp, Stripe, Wise, Monarch, Copilot, YNAB) fazem em comum no visual sério. Serve de base para o estilo `business` do PieTracker: fintech sóbrio, sem folhas, sem emoji, azul/slate, numerais tabulares.

## Paleta

Convergência clara entre as referências: canvas dominante claro (branco ou cinza muito frio tipo `#F6F9FC`), neutros azul/slate para texto e bordas, e UM único accent saturado reservado só para ação primária. Stripe usa indigo/blurple (`#635BFF`, `#533AFD`), Mercury usa indigo (`#5266eb`), Monarch usa azul-ardósia/navy (`#395384`, `#042463`), Ramp usa lime só por ser marca. Texto primário quase nunca é preto puro: Stripe usa azul-petróleo `#0A2540`, secundário slate `#425466`. Verde e vermelho são semânticos (positivo/negativo), nunca decorativos. Regra repetida em todas as fontes: máximo 5 a 6 cores, accent com parcimônia.

## Tipografia

Todas tratam tipografia como sinal de seriedade. Famílias proprietárias (Arcadia na Mercury, Söhne na Stripe, Ramp Grotesk, Wise Sans) com substituto open-source recorrente: **Inter**, que já traz numerais tabulares de fábrica. O detalhe não-negociável: `font-variant-numeric: tabular-nums` (e `lining-nums`) em todo valor monetário, total e célula de tabela, para os dígitos alinharem em coluna e não "pularem" quando o valor muda. Stripe ainda aplica tracking negativo leve nos algarismos. Hierarquia por tamanho e peso, não por cor; peso intermediário (~480/500) para headings dá autoridade sem peso visual.

## Densidade

Espaçamento em grid base 4/8px. Duas escolas: a calma/editorial (Mercury, Stripe, com gutters amplos e respiro) e a densa/escaneável (Ramp, Monarch, com linha de tabela ~48px, padding reduzido, categorias colapsáveis e mantra "mais informação, menos rolagem"). Comum às duas: elevação plana, bordas hairline de 1px (`#E3E8EE` na Stripe, `#272735` na Mercury) em vez de sombras pesadas, e cantos discretos (4 a 8px), com pill/raio alto só no botão primário.

## Data-viz

Charts limpos sobre fundo claro, gridlines fantasmas em cinza, foco no dado e não na decoração. Paleta de chart restrita: a série em foco recebe o accent saturado, as demais ficam em cinza neutro. Cor é funcional (verde/laranja/vermelho por status de orçamento na Copilot; azuis da marca na Monarch), nunca arco-íris. Tipos certos: linha para tendência, barra para comparação, tabela para varredura; evitar pie 3D, multi-segmento e eixo duplo. Interatividade útil (clicar no chart filtra a lista, como na Monarch) em vez de animação gratuita. Numeral tabular também nos eixos e labels.

## Sinais de confiança

Confiança vem de disciplina visual, não de selos: branco dominante, uma cor saturada com peso, contraste alto no texto financeiro, ausência de ruído. Acessibilidade como diferencial: Stripe garante WCAG 4.5:1 em todo texto e gera escalas em espaço perceptual (CIELAB); Wise valida com WCAG 2.2 + APCA nos temas claro e escuro. Detalhes que sinalizam DNA financeiro: numerais tabulares, sinal de menos real (U+2212) em vez de hífen, formatação locale-aware (`Intl.NumberFormat('pt-BR')`, sempre 2 casas), e cada número parecendo auditável. Layout que lidera com a métrica-chave (saldo/total do mês) grande no topo.

## Produto x paleta-chave

| Produto | Accent | Canvas | Texto primário | Verde/vermelho |
| --- | --- | --- | --- | --- |
| Stripe | indigo `#635BFF` / `#533AFD` | branco / `#F6F9FC` | `#0A2540` (azul-petróleo) | `#3ECF8E` / `#DF1B41` |
| Mercury | indigo `#5266eb` | cream `#f6f5f2` / dark `#171721` | `#2a2924` | `#2f7d57` / `#b54a3a` |
| Monarch | azul-ardósia `#395384` | branco / navy `#042463` | navy `#042463` | semântico |
| Ramp | lime `#B5FF4D` (evitar no PieTracker) | branco | navy/slate | semântico |
| Wise | green `#9FE870` (evitar como primário) | branco / forest `#163300` | neutros esverdeados | `#2ED06E` / vermelho |
| YNAB | azul (token) | branco | token | `statusPositive` / `statusNegative` |
| Fintech 2026 (Eleken) | Classic Blue `#288cfa` | `#F5F5F5` | `#242c34` | verde / vermelho |

Nota: o verde da Wise e o lime da Ramp puxam para "natureza/marca própria"; no PieTracker o verde é clima do estilo `casual` (sage), então o `business` deve usar azul/slate como primário.

## O que aplicar no business do PieTracker

- **Paleta:** canvas branco ou cinza-frio (`#FFFFFF` / `#F6F9FC`), neutros slate, UM accent azul/indigo (algo entre `#288cfa`, `#533AFD` e `#5266eb`) com hover/active mais escuros, reservado só para ação primária. Texto primário azul-petróleo (`#0A2540`) em vez de preto puro, secundário slate (`#425466`). Zero folhas, zero emoji.
- **Numerais tabulares (prioridade máxima):** aplicar `font-variant-numeric: lining-nums tabular-nums;` (fallback `font-feature-settings: "lnum" 1, "tnum" 1;`) em todo valor de R$, saldo, total, célula de tabela e nos eixos/labels do Recharts. É baixo custo e é o detalhe que um avaliador técnico (Ferreri) percebe.
- **Fonte:** adotar Inter no estilo business (numerais tabulares de fábrica, ótima em tamanho pequeno). Headings em peso médio (~500) para autoridade.
- **Formatação de dinheiro:** sempre `Intl.NumberFormat('pt-BR')`, 2 casas fixas (mostrar `54,00`, não `54`, para evitar reflow), sinal de menos real (U+2212) em despesa.
- **Cor semântica:** verde só para entrada/positivo, vermelho só para despesa/negativo. Opcional: status de orçamento (verde dentro, laranja perto do limite, vermelho estourado), como na Copilot.
- **Densidade e elevação:** espaçamento base 4px, cantos discretos (4 a 8px), bordas hairline de 1px em vez de sombras fortes; pill só no botão primário.
- **Data-viz:** o pie do "PieTracker" deve ser flat, paleta sóbria derivada de 1 a 2 tons de azul, sem efeito 3D nem eixo duplo. Série em foco colorida, demais em cinza. Interatividade útil (clicar filtra a lista) em vez de animação decorativa.
- **Layout:** métrica-chave (saldo/total do mês) no topo, ~3x maior que o dado de apoio; barra de resumo full-width acima do grid de cards; não preencher espaço vazio à força.
- **Arquitetura de tokens (resolve os 4 temas sem reescrever as 5960 linhas do `App.css`):** copiar o modelo do YNAB, base palette (`primary600`, `primary500`...) + camada semântica por uso (`primaryAction`, `statusPositive`, `statusNegative`, `destructive`), e cada token semântico aponta para dois valores (um claro, um escuro). Troca-se o mapeamento, não os matizes espalhados pelo CSS.
- **Acessibilidade:** garantir WCAG 4.5:1 no texto financeiro; validar pares de cor com WCAG + APCA nos 4 temas (claro/escuro x business/casual).

## Fontes

- https://www.shadcn.io/design/mercury
- https://blakecrosley.com/guides/design/mercury
- https://github.com/rohitg00/awesome-claude-design/blob/main/design-md/warm/mercury.md
- https://styles.refero.design/style/3172cd4d-118a-4a16-a259-6b634d32322e
- https://www.designmd.co/d/ramp
- https://ramp.com/
- https://trust.ramp.com/
- https://www.eleken.co/blog-posts/trusted-fintech-ui-examples
- https://www.media.io/color-palette/lime-green-color-palette.html
- https://merge.rocks/blog/fintech-dashboard-design-or-how-to-make-data-look-pretty
- https://stripe.com/blog/accessible-color-systems
- https://www.designmd.run/blog/stripe-design-system-breakdown
- https://mobbin.com/colors/brand/stripe
- https://www.shadcn.io/design/stripe
- https://styles.refero.design/style/48e5de76-05d5-4c4e-a269-c7c245b291ec
- https://www.designmd.co/d/stripe
- https://docs.stripe.com/stripe-apps/style
- https://wise.com/gb/blog/a-brand-for-everywhere-wise-unveils-bold-new-look
- https://wise.design/foundations/colour
- https://medium.com/transferwise-design/accessible-but-never-boring-part-1-ec8222f1f364
- https://www.brandcolorcode.com/wise
- https://dotyeti.com/blog/wise-rebrand-and-logo-explanation-behind-the-new-visuals
- https://the-brandidentity.com/interview/how-the-ragged-edge-and-wise-teams-came-together-to-craft-a-pivotal-rebrand-for-the-worlds-money
- https://mobbin.com/colors/brand/wise
- https://www.monarch.com/blog/monarch-brand-refresh
- https://colorswall.com/palette/12155
- https://storybook.monarchmoney.com/
- https://nicelydone.club/apps/monarch
- https://stackswitch.app/review/copilot-money
- https://developer.apple.com/articles/copilot-money/
- https://help.copilot.money/en/articles/10309907-dashboard-line-colors
- https://screensdesign.com/showcase/copilot-track-budget-money
- https://help.copilot.money/en/articles/9828946-display-settings-for-vision
- https://roadmap.copilot.money/feature-requests/p/oled-theme
- https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651
- https://www.monarch.com/monarch-brand-refresh
- https://dev.to/ynab/a-semantic-color-system-the-theory-hk7
- https://www.ynab.com/blog/the-new-design-is-rad-ynab-theme-updates
- https://www.eleken.co/blog-posts/modern-fintech-design-guide
- https://www.outcrowd.io/blog/fintech-design-trends-2026
- https://www.phoenixstrategy.group/blog/best-color-palettes-for-financial-dashboards
- https://medium.com/design-bootcamp/the-elements-of-fintech-typography-part-1-readable-money-b6c1226acbde
- https://www.925studios.co/blog/saas-dashboard-design-examples-2026
- https://www.myfonts.com/pages/fontscom-learning-fontology-level-3-numbers-proportional-vs-tabular-figures
- https://d.rsms.me/inter-website/v3/
- https://www.fintechbrainfood.com/p/the-cfo-dashboard
