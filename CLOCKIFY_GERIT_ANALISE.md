# Analise Clockify e direcao inicial da Gerit

Data da analise: 6 de marco de 2026

## Clockify

Base observada:
- `https://app.clockify.me/tracker`
- `https://clockify.me/help/track-time-and-expenses/time-tracker`
- `https://clockify.me/help/track-time-and-expenses/timesheet`
- `https://clockify.me/help/managing-teams/workspace-settings`

### Layout
- Shell de aplicacao com sidebar fixa, header compacto e area central dominante.
- Conteudo desenhado para produtividade imediata: input principal, lista operacional e acoes de start/stop muito proximas.
- Muito espaco em branco, linhas discretas, cards leves e densidade controlada.

### Header
- Barra superior utilitaria e contextual.
- Normalmente concentra workspace atual, pesquisa, perfil, notificacoes e acoes rapidas.
- Linguagem visual discreta: fundo claro, borda fina e controles pequenos.

### Menu superior
- A navegacao principal trabalha com vistas curtas e muito orientadas a tarefa, como `Timer`, `Timesheet`, `Dashboard`, `Calendar` e `Reports`.
- A troca entre vistas e pensada para ser rapida, sem excesso de texto.

### Menu lateral abre e fecha
- A sidebar e um elemento estrutural.
- Expandida, privilegia icone + rotulo.
- Colapsada, preserva navegacao por icones e reduz largura sem perder contexto.
- O padrao sugere transicoes curtas de largura, opacidade e estados hover/focus.

### Cores
- Base muito clara: branco e cinzas frios.
- Azul/ciano como cor primaria de acao e estado ativo.
- Verdes e amarelos surgem em estados secundarios, faturacao e indicadores.
- Esta leitura cromatica e parcialmente inferida a partir da interface publica e da documentacao oficial.

### Animacoes
- O produto privilegia microinteracoes.
- Hover, focus, colapso da sidebar e feedback de botao sao mais importantes que animacoes cenograficas.
- A sensacao geral e de velocidade e baixo atrito.

### Botoes
- Botoes primarios ficam reservados para iniciar tracking ou criar entradas.
- Botoes secundarios sao discretos, normalmente ghost ou outline.
- Escala compacta, leitura imediata por icone e texto.

## Gerit

### Estado atual encontrado
- Projeto em Next.js 14 com App Router.
- Tailwind CSS como base visual.
- `next-themes` ativo para dark mode.
- `TranslationProvider` existente com Context API.
- `app/page.tsx` estava vazia.
- `ClientLayout` ainda injetava navbar/footer genericos.

### Leitura arquitetural
- A base tecnica ja suportava uma home em modo dashboard.
- O projeto ainda nao tinha uma shell operacional consistente.
- A melhor direcao era tratar `/` como uma home dedicada, sem herdar o chrome antigo.

## Direcao aplicada

### Home inicial criada
- Layout full screen inspirado no Clockify.
- Sidebar colapsavel com comportamento icon-first.
- Header sticky com pesquisa, idioma, tema, notificacoes e CTA principal.
- Menu superior com `Timer`, `Timesheet` e `Dashboard`.
- Bloco de lancamento rapido com timer, tags e controle de faturacao.
- Cards de metricas e lista de entradas recentes.
- Painel lateral lazy-loaded com `Suspense`.

### Decisoes tecnicas
- `useReducer`, `useCallback`, `useMemo` e custom hook para estado do shell.
- `useDeferredValue` para pesquisa local.
- `Suspense` + `lazy` para code splitting do painel lateral.
- Regras condicionais de CSS com `data-collapsed` e `prefers-reduced-motion`.
- Consumo do contexto global de traducao e integracao com tema.
