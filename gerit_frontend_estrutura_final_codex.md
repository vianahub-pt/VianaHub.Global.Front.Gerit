# Token para GPT-5.3-Codex — Reorganização Arquitetural do Frontend Gerit

## Objetivo

Atualizar toda a estrutura do projeto frontend **VianaHub.Global.Front.Gerit** para a arquitetura abaixo, reorganizando pastas, módulos, responsabilidades e pontos de entrada, **sem alterar qualquer aspecto visual existente da aplicação**.

A mudança deve ser **estrutural/arquitetural**, mantendo intactos:

- layouts
- interfaces
- design
- cores
- tipografia
- espaçamentos
- comportamento visual
- identidade visual
- experiência visual do utilizador
- composição visual atual das telas

## Regra principal

**Não alterar o frontend visualmente.**

O projeto deve continuar com a mesma aparência atual. A refatoração deve focar apenas em:

- organização de pastas
- separação de responsabilidades
- posicionamento correto de arquivos
- adequação ao modelo SaaS multitenant
- alinhamento ao backend e ao domínio da aplicação
- melhoria de escalabilidade e manutenção

---

## Estrutura alvo obrigatória

A estrutura final do projeto deve ficar exatamente a esta:

```txt
VianaHub.Global.Front.Gerit/
├─ app/
│  ├─ (public)/
│  │  ├─ login/page.tsx
│  │  └─ terms/page.tsx
│  ├─ (workspace)/
│  │  ├─ page.tsx
│  │  ├─ settings/
│  │  │  └─ preferences/page.tsx
│  │  ├─ operations/
│  │  ├─ catalogs/
│  │  └─ workspace/
│  ├─ (platform-admin)/
│  │  ├─ page.tsx
│  │  ├─ tenants/
│  │  ├─ plans/
│  │  ├─ subscriptions/
│  │  └─ jobs/
│  ├─ api/
│  │  ├─ auth/
│  │  │  ├─ login/route.ts
│  │  │  └─ refresh/route.ts
│  │  └─ gerit/[...path]/route.ts
│  ├─ layout.tsx
│  ├─ providers.tsx
│  └─ globals.css
│
├─ core/
│  ├─ config/
│  ├─ constants/
│  ├─ env/
│  ├─ errors/
│  ├─ logger/
│  ├─ types/
│  └─ utils/
│
├─ platform/
│  ├─ api/
│  │  ├─ contracts/
│  │  ├─ http/
│  │  ├─ adapters/
│  │  └─ mappers/
│  ├─ auth/
│  ├─ tenant/
│  ├─ subscription/
│  ├─ entitlements/
│  ├─ access-control/
│  ├─ workspace-bootstrap/
│  ├─ query/
│  ├─ storage/
│  ├─ i18n/
│  ├─ observability/
│  └─ providers/
│
├─ domains/
│  ├─ operations/
│  ├─ catalogs/
│  ├─ workspace/
│  ├─ identity/
│  └─ platform-admin/
│
├─ shared/
│  ├─ ui/
│  ├─ layout/
│  ├─ forms/
│  ├─ data-table/
│  ├─ feedback/
│  ├─ guards/
│  └─ upload/
│
├─ locales/
├─ public/
├─ next.config.mjs
├─ tsconfig.json
└─ tsconfig.typecheck.json
```

---

## Regras obrigatórias de migração

### 1. Manter comportamento visual atual

A reorganização **não pode**:

- redesenhar telas
- trocar layout
- mudar aparência de componentes
- alterar classes utilitárias de Tailwind sem necessidade arquitetural real
- modificar estrutura visual final das páginas
- trocar posição visual de blocos já existentes
- alterar branding/logo
- alterar comportamento visual da navbar, sidebar, header, footer, shell, cards, formulários e painéis

Se algum arquivo visual precisar ser movido, ele deve ser movido **preservando sua renderização e markup final o máximo possível**.

### 2. Eliminar a arquitetura antiga como destino ativo

A estrutura antiga baseada em:

- `components/`
- `hooks/`
- `lib/`

não deve continuar como arquitetura principal.

Essas pastas devem ser:

- migradas
- esvaziadas
- removidas da estrutura final, se não forem mais necessárias

#### Regras de migração

- componentes visuais genéricos → `shared/`
- layout compartilhado → `shared/layout/` ou `platform/providers/` quando fizer sentido
- componentes de domínio → `domains/<dominio>/...`
- hooks de domínio → `domains/<dominio>/...`
- hooks de infraestrutura → `platform/...`
- utilitários transversais → `core/...`
- i18n helpers → `platform/i18n/`
- logger → `core/logger/`

### 3. Corrigir redundâncias existentes

Remover duplicidades e rotas redundantes, em especial:

- não manter simultaneamente `/preferences` e `/settings/preferences` se representam a mesma tela
- preferências do utilizador devem ficar em:

```txt
app/(workspace)/settings/preferences/page.tsx
```

### 4. Corrigir a área de platform admin

A área de administração global deve usar a convenção:

```txt
app/(platform-admin)/page.tsx
```

Evitar redundância estrutural como:

```txt
app/(platform-admin)/platform-admin/page.tsx
```

### 5. Consolidar query layer

Não dividir responsabilidade de query entre múltiplas áreas confusas.

A camada de query/cache deve ficar centralizada em:

```txt
platform/query/
```

Exemplo de conteúdos esperados:

- `query-client.ts`
- `query-keys.ts`
- `index.ts`

Remover duplicidade conceitual entre `platform/api/query/...` e `platform/query/...`.

### 6. Consolidar jobs

Não manter simultaneamente:

- `domains/jobs`
- `domains/platform-admin/jobs`

Como Jobs é parte do contexto de administração global, ele deve ficar:

```txt
domains/platform-admin/
```

### 7. Diferenciar platform x domain

Seguir esta regra com rigor:

#### `platform/`
Camada transversal de infraestrutura da aplicação.

Exemplos:
- auth
- tenant
- subscription state
- entitlements
- access-control
- bootstrap
- api/http
- query
- storage
- observability
- i18n
- providers globais

#### `domains/`
Camada orientada ao negócio e às áreas reais do produto.

Exemplos:
- operations
- catalogs
- workspace
- identity
- platform-admin

#### `shared/`
Componentes e building blocks reutilizáveis sem regra de negócio forte.

#### `core/`
Constantes, env, erros, utils e infra neutra e transversal.

---

## Mapeamento esperado da estrutura antiga para a nova

### `components/`
Migrar conforme a responsabilidade:

- `components/auth/*` → `platform/auth/` ou `domains/identity/` conforme o caso
- `components/workspace/*` → `shared/layout/` ou `domains/workspace/` conforme o caso
- `components/home/*` → `domains/workspace/` ou `domains/operations/` dependendo da finalidade
- `components/preferences/*` → `domains/identity/preferences/` e rota `app/(workspace)/settings/preferences/`
- `components/brand/*` → `shared/ui/` ou `shared/layout/` se for branding reutilizável
- `components/ui/*` → `shared/ui/` ou `shared/feedback/` conforme o tipo

- Quando terminar de migrar excluir a pasta `components`

### `hooks/`
Migrar conforme a responsabilidade:

- hooks ligados a domínio → `domains/...`
- hooks ligados a auth/tenant/subscription/entitlements/query → `platform/...`
- hooks genéricos de UI compartilhável → `shared/...` quando fizer sentido

- Quando terminar de migrar excluir a pasta `hooks`

### `lib/`
Migrar conforme a responsabilidade:

- `language.ts` → `platform/i18n/`
- `logger.ts` → `core/logger/`
- outros utilitários genéricos → `core/utils/`

- Quando terminar de migrar excluir a pasta `lib`

---

## Responsabilidades esperadas por camada

## `app/`
Responsável apenas por:

- entrypoints do App Router
- composição de layouts
- páginas
- route groups
- endpoints BFF/proxy

Evitar colocar lógica de domínio profunda em `app/`.

## `platform/api/`
Responsável por:

- contratos comuns
- cliente HTTP
- adapters
- mappers
- base para integração tipada com a API

## `platform/auth/`
Responsável por:

- sessão
- login
- refresh
- logout
- estado/auth bootstrap
- integração com providers de autenticação

## `platform/tenant/`
Responsável por:

- tenant atual
- troca de tenant
- persistência segura do tenant
- contexto de tenant

## `platform/subscription/`
Responsável por:

- assinatura atual do tenant
- estado transversal da subscription
- leitura do plano atual

## `platform/entitlements/`
Responsável por:

- capacidades derivadas do plano
- limites de uso
- regras de acesso por subscription/plano

## `platform/access-control/`
Responsável por:

- RBAC
- helpers do tipo `can()`
- integração entre permissões e uso no frontend

## `platform/workspace-bootstrap/`
Responsável por bootstrap do workspace:

- sessão
- tenant
- utilizador
- permissões
- subscription
- entitlements
- preferências

## `shared/layout/`
Responsável por elementos estruturais reutilizáveis do shell visual já existente.

## `shared/ui/`
Responsável por componentes visuais reutilizáveis e neutros.

## `shared/guards/`
Responsável por wrappers reutilizáveis de UI/roteamento, consumindo regras da camada `platform/access-control/`.

---

## Regras específicas para preservar o projeto atual

1. Reaproveitar o máximo possível dos componentes já existentes.
2. Mover arquivos antes de reescrever arquivos.
3. Preferir refatoração por extração e reorganização, não reimplementação desnecessária.
4. Preservar nomes e contratos públicos sempre que isso evitar quebra visual ou funcional.
5. Ajustar imports e aliases após a reorganização.
6. Remover duplicidades criadas na transição.
7. Manter as rotas já funcionais, redirecionando somente quando a nova organização exigir.
8. Não inventar novos layouts visuais.

---

## Estratégia de implementação esperada

Executar a atualização seguindo esta ordem:

1. Criar a nova árvore base de pastas.
2. Mapear arquivos antigos para a nova arquitetura.
3. Mover `components`, `hooks` e `lib` para os destinos corretos.
4. Ajustar imports e aliases.
5. Consolidar `preferences` em `app/(workspace)/settings/preferences/page.tsx`.
6. Corrigir `platform-admin` para `app/(platform-admin)/page.tsx`.
7. Consolidar query layer em `platform/query/`.
8. Consolidar jobs no domínio correto.
9. Garantir build, tipagem e funcionamento.
10. Remover resíduos da arquitetura antiga.

---

## Resultado esperado

Ao final, o projeto deve:

- manter o mesmo visual atual
- manter o mesmo layout atual
- manter a mesma experiência visual
- ficar com estrutura de pastas coerente e limpa
- eliminar resíduos da arquitetura antiga
- refletir melhor o modelo SaaS do backend
- separar corretamente `app`, `core`, `platform`, `domains` e `shared`
- ficar pronto para evolução mais profissional e sustentável

---

## Instrução final para execução

Faça a reorganização completa da estrutura do frontend para o padrão acima.

Prioridade máxima:

1. **não alterar layout, design, UI, cores ou aparência**
2. **corrigir a arquitetura de pastas e responsabilidades**
3. **remover redundâncias e resíduos do modelo antigo**
4. **preservar funcionamento atual do projeto**

A refatoração deve ser arquitetural, limpa, segura e incremental, mas o resultado final deve refletir a nova estrutura proposta.

