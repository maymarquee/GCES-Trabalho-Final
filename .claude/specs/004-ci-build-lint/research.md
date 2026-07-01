# Research: CI — Build & Lint

**Feature**: `004-ci-build-lint` | **Date**: 2026-06-09

---

## Decisão 1 — Plataforma de CI: GitLab CI

**Decision**: GitLab CI via `.gitlab-ci.yml` na raiz do repositório.
**Rationale**: O repositório está hospedado no GitLab. O README do projeto menciona "GitHub Actions" como referência genérica, mas a plataforma real é GitLab. GitLab CI é nativo ao repositório: nenhuma integração externa necessária, runners compartilhados já disponíveis, syntax YAML familiar e bem documentada.
**Alternatives considered**:
- GitHub Actions: Irrelevante — o repositório não está no GitHub.
- CircleCI / Jenkins: Integração externa desnecessária; adiciona complexidade de configuração sem benefício para um projeto universitário.

---

## Decisão 2 — Ferramenta de lint: ESLint

**Decision**: ESLint v8.x com configuração `.eslintrc.json` (legacy config format).
**Rationale**: ESLint é o padrão de mercado para linting de JavaScript/Node.js. A versão 8.x usa o formato `.eslintrc.json` (legacy), que é mais simples de entender e compatível com o estilo de configuração por diretório. O projeto usa CommonJS e código ES5/ES2020; a v8 suporta esse mix sem plugins adicionais. A v9 (flat config) foi evitada porque exige `eslint.config.js` e mudanças mais significativas na configuração — um overhead desnecessário para esta fase.
**Alternatives considered**:
- ESLint v9 (flat config): Mais moderno, mas exige `eslint.config.js` e a curva de aprendizado adicional não traz benefício para o escopo desta fase.
- Biome / oxlint: Ferramentas mais rápidas mas com ecosistema menor e sem suporte equivalente a regras por ambiente (node/browser). ESLint é mais adequado para a complexidade do código legado do jogo.
- JSHint: Obsoleto; não tem suporte a `async/await` ou plugins modernos.

---

## Decisão 3 — Configuração separada por contexto (back-end / front-end)

**Decision**: Dois arquivos `.eslintrc.json` separados: `server/.eslintrc.json` e `game/.eslintrc.json`.
**Rationale**: Os dois contextos têm ambientes radicalmente diferentes:
- Back-end (`server/`): Node.js, CommonJS, ES2020, testes Jest.
- Front-end (`game/src/`): Browser, ES5, globals de browser, IIFEs.
Um único arquivo na raiz forçaria compromissos que prejudicariam ambos os contextos. Arquivos separados por diretório são o padrão do ESLint v8 (hierarquia de configs).
**Alternatives considered**:
- Config única na raiz com `overrides`: Funciona, mas mistura concerns; mais difícil de manter conforme o projeto cresce.
- Config única na raiz sem overrides: Inviável — regras do Node.js conflitam com o ambiente de browser.

---

## Decisão 4 — Nível de rigor: "error" no back-end, "warn" para globals no front-end

**Decision**: `no-undef: "error"` e `no-unused-vars: "warn"` no back-end. Para o front-end, globals do browser declarados explicitamente e `no-undef: "warn"` para globals não declarados.
**Rationale**: O back-end é código novo, escrito durante este projeto, com cobertura de testes. Manter `no-undef: "error"` garante que variáveis não declaradas (bugs reais) reprovem o pipeline imediatamente. O front-end (`mk.js`, `movement.js`) é código legado original com dependências de globals carregados via `<script>` (`io`, `cv`, `Movement`); `no-undef: "warn"` para o front-end evita falsos positivos enquanto os globals principais são declarados explicitamente.
**Alternatives considered**:
- `no-undef: "error"` em ambos: Seria ideal, mas requereria um levantamento exaustivo de todos os globals usados no arquivo mk.js (>600 linhas de código legado) antes de ativar a regra, o que está fora do escopo desta fase.
- `no-undef: "warn"` em ambos: Não atende ao requisito "o pipeline deve falhar se o lint encontrar erros" para o código back-end que temos controle.

---

## Decisão 5 — Passagem de dependências entre jobs: artifacts

**Decision**: O job `build` instala `node_modules` via `npm ci` e passa a pasta como artifact. Os jobs de lint (`lint:back`, `lint:front`) usam o artifact via `needs:`.
**Rationale**: Artifacts são garantidos: o GitLab os armazena no servidor e os disponibiliza para jobs dependentes, independentemente do runner. Cache no GitLab é best-effort e pode não estar disponível entre jobs em runners diferentes. Para um projeto pequeno (node_modules de ~50 MB), o overhead de artifact é aceitável.
**Alternatives considered**:
- Cache GitLab: Conveniência maior para projetos com muitos runners, mas sem garantia. Pode causar falhas intermitentes se o cache expirar entre jobs.
- Instalar dependências em cada job: Simples, mas redundante e mais lento. `npm ci` com lock file leva ~30 s em cada job vs. ~5 s para baixar artifact.

---

## Decisão 6 — Imagem Docker para jobs de CI

**Decision**: `node:18-alpine` para todos os jobs.
**Rationale**: Node.js 18 LTS é a versão declarada no `engines` do `package.json`. A variante Alpine minimiza o tamanho da imagem e o tempo de pull nos runners. Não há dependências de sistema além do Node.js (sem gcc, make, etc. necessários para módulos nativos).
**Alternatives considered**:
- `node:18` (Debian-based): ~300 MB vs. ~60 MB Alpine; overhead desnecessário para este projeto.
- `node:20-alpine`: Node.js 20 LTS é mais recente, mas a mudança de versão está fora do escopo desta fase; consistência com o Dockerfile existente.

---

## Decisão 7 — Estágio único "lint" com dois jobs paralelos

**Decision**: Um único estágio `lint` com dois jobs paralelos: `lint:back` e `lint:front`.
**Rationale**: Os dois jobs de lint são independentes entre si (arquivos e configs diferentes) e podem rodar em paralelo, reduzindo o tempo total do pipeline. Ambos dependem do job `build` (para ter `node_modules`), mas não um do outro.
**Alternatives considered**:
- Dois estágios separados `lint-back` e `lint-front`: Adiciona latência serial desnecessária sem benefício.
- Job único de lint que faz back e front em sequência: Mais simples, mas perde o paralelismo e dificulta identificar qual contexto falhou.
