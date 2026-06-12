# Trabalho Individual GCES (2026-1)

| Aluna | Matrícula |
| ---- | ------ |
| Mayara Marques Silva| 231035731 |

Este repositório contém o trabalho individual da disciplina **Gerência de Configuração e Evolução de Software** (UnB, 2026-1). A aplicação base é o **mk.js**, um jogo de luta em HTML5 Canvas/JavaScript com backend Node.js/Express + Socket.io, originalmente *deprecated*. O trabalho consistiu em modernizar, containerizar, testar, proteger (DevSecOps) e implantar continuamente a aplicação, em 11 fases incrementais (0 a 10) - todas implementadas.

> Este README traz o passo a passo essencial. O guia completo - com todos os modos de jogo, K8s, HTTPS, Terraform e detalhes de cada pipeline - está em **[ComoRodar.md](ComoRodar.md)**.

> **Sobre o CI/CD:** o enunciado menciona GitHub Actions, porém o repositório da disciplina é hospedado no **GitLab** (`gitlab.com/unb-esw/gces/...`). Por isso o pipeline foi implementado em **GitLab CI** ([`.gitlab-ci.yml`](.gitlab-ci.yml)), com estágios equivalentes aos workflows/jobs do GitHub Actions: `build → lint → test → security → quality → infra → release`.

---

## Ambiente de Desenvolvimento (passo a passo)

Pré-requisito: apenas **Docker** (com Compose v2) instalado e em execução - não é necessário Node.js no host.

**1. Clonar o repositório e configurar variáveis de ambiente (uma vez):**

```bash
git clone https://gitlab.com/unb-esw/gces/gces2026-1/trabalho-final-gces-mayara-silva.git
cd trabalho-final-gces-mayara-silva
cp .env.example .env
# Edite .env se quiser alterar portas ou credenciais do banco (padrões funcionam)
```

**2. Subir a aplicação + Postgres com um único comando:**

```bash
docker compose up
```

Aguarde até ver nos logs:

```
app  | [nodemon] starting `node server/server.js`
```

**3. Acessar o jogo:**

Abra **http://localhost:55555** no navegador. Para jogar em rede, abra duas abas/navegadores e insira o **mesmo nome de jogo** nos dois.

**4. Hot-reload (já habilitado):**

- Editar qualquer arquivo em `server/` → o nodemon reinicia o servidor automaticamente (≤ 3 s).
- Editar qualquer arquivo em `game/` → basta recarregar a página no navegador.

**5. Verificar a persistência (histórico de partidas no Postgres):**

```bash
curl http://localhost:55555/api/matches
# ou direto no banco:
docker compose exec db psql -U mkjs -d mkjs -c "SELECT * FROM matches;"
```

**6. Parar o ambiente:**

```bash
docker compose down       # preserva os dados do banco (volume postgres_data)
docker compose down -v    # apaga também os volumes (reset completo)
```

**Rodar lint e testes localmente** (requer Node.js 18+):

```bash
cd server && npm install
npm run lint            # ESLint no back-end e front-end
npm test                # testes unitários + fuzzing (Jest + fast-check)
npm run test:coverage   # testes com relatório de cobertura (LCOV + HTML)
```

---

## Ambiente de Produção (passo a passo)

### Opção A - Docker Compose (mais simples)

Stack otimizada: **Nginx** (servindo os arquivos estáticos e fazendo proxy do Socket.io/API) + **Node.js** (imagem multi-stage baseada em Alpine, usuário não-root) + **Postgres**. Apenas a porta 80 do Nginx é exposta ao host; backend e banco ficam na rede interna de containers.

```bash
cp .env.example .env       # se ainda não fez
docker compose -f docker-compose.prod.yml up --build
```

Aguarde `nginx | ... start worker processes` e abra **http://localhost** no navegador. Histórico de partidas: `curl http://localhost/api/matches`. Para parar: `docker compose -f docker-compose.prod.yml down`.

### Opção B - Kubernetes com HTTPS (cluster local `kind` + cert-manager)

Sobe a mesma stack em um cluster Kubernetes local, com **HTTPS via cert-manager** e redirecionamento automático de HTTP (80) para HTTPS (443). Pré-requisitos: Docker, `kubectl`, `kind` e (opcionalmente) Terraform.

Resumo do fluxo: o detalhamento de cada passo está nas seções [Kubernetes (K8s)](ComoRodar.md#kubernetes-k8s) e [HTTPS (cert-manager)](ComoRodar.md#https-cert-manager) do ComoRodar.md:

```bash
# 1. Provisionar cluster kind + ingress-nginx + cert-manager + manifestos (automatizado)
cd terraform && terraform init && terraform apply && cd ..

# 2. Buildar as imagens de produção e carregá-las no cluster
docker build -f Dockerfile.prod -t mkjs-app:latest .
docker build -f nginx/Dockerfile -t mkjs-nginx:latest .
kind load docker-image mkjs-app:latest --name mkjs
kind load docker-image mkjs-nginx:latest --name mkjs

# 3. (Re)aplicar os manifestos agora que as imagens existem no cluster
kubectl apply -k k8s/

# 4. Mapear o host local (como administrador, em /etc/hosts ou
#    C:\Windows\System32\drivers\etc\hosts):
#    127.0.0.1 mkjs.local
```

Acesse **https://mkjs.local/** (o certificado é autoassinado - aceite o aviso do navegador). O redirecionamento 80 → 443 pode ser verificado com:

```bash
curl -k -I http://mkjs.local/    # HTTP/1.1 308 Permanent Redirect → Location: https://mkjs.local/
```

Os Services `app`, `nginx` e `postgres` são todos `ClusterIP` - nenhuma porta além de 80/443 (ingress) é exposta para fora da rede de containers.

### Imagens publicadas (CD)

A cada push na branch `main` com pipeline verde, o estágio `release` publica as imagens de produção no **GitLab Container Registry** do projeto (`mkjs-app` e `mkjs-nginx`, tags `latest` e `<sha do commit>`). Para visualizá-las: **Deploy → Container Registry** no GitLab. Para baixar:

```bash
docker login registry.gitlab.com
docker pull registry.gitlab.com/unb-esw/gces/gces2026-1/trabalho-final-gces-mayara-silva/mkjs-app:latest
```

---

## Fases implementadas

| Fase | O que foi feito | Principais artefatos |
|---|---|---|
| 0. Retirada de Depreciação | Express 3 → 4.21, Socket.io 0.9 → 4.8, APIs depreciadas corrigidas (server e cliente), testes unitários garantindo o comportamento | [`server/package.json`](server/package.json), [`server/test/`](server/test) |
| 1. Containerização (DEV) | Imagem de desenvolvimento com hot-reload via nodemon + bind mounts | [`Dockerfile`](Dockerfile), [`nodemon.json`](nodemon.json) |
| 2. Docker Compose (DEV) | App + Postgres 16; persistência do histórico de partidas (`/api/matches`) | [`docker-compose.yml`](docker-compose.yml), [`server/db.js`](server/db.js), [`server/db/init.sql`](server/db/init.sql) |
| 3. CI - Build & Lint | Estágios `build` e `lint` (back e front, ESLint); pipeline falha em erro de lint | [`.gitlab-ci.yml`](.gitlab-ci.yml) |
| 4. CI - Testes Unitários | Jest no estágio `test`; commits sequenciais red → green no CI (ex.: `50b9431` red → `f7eeb7f` green; branch `ci-red-demo`) | [`server/test/games.unit.test.js`](server/test/games.unit.test.js), [`server/test/matchmaking.test.js`](server/test/matchmaking.test.js) |
| 5. CI - Fuzzing | Property-based testing com fast-check sobre as entradas do servidor (job `test:fuzz`) | [`server/test/server.fuzz.test.js`](server/test/server.fuzz.test.js) |
| 6. Segurança - SAST & SCA | SAST via semgrep (template GitLab) + SCA via `npm audit` (falha em high/critical) | [`.gitlab-ci.yml`](.gitlab-ci.yml) (jobs `semgrep-sast`, `sca:npm-audit`) |
| 7. Qualidade de Código | SonarCloud no estágio `quality` com Quality Gate bloqueante e cobertura via LCOV | [`sonar-project.properties`](sonar-project.properties) |
| 8. Containerização (PROD) | Multi-stage build Alpine, usuário não-root, Nginx servindo estáticos e proxy do Socket.io/API | [`Dockerfile.prod`](Dockerfile.prod), [`nginx/`](nginx), [`docker-compose.prod.yml`](docker-compose.prod.yml) |
| 9. Infra - K8s & Terraform | Manifestos K8s (Kustomize): deployments, services, StatefulSet do Postgres com PVC, ingress; Terraform provisiona cluster `kind` + ingress-nginx; validação no CI | [`k8s/`](k8s), [`terraform/`](terraform) |
| 10. CD & Segurança de Rede | Publicação de imagens no Container Registry a cada push na `main`; HTTPS via cert-manager (ClusterIssuer + Certificate); redirect 308 de 80 → 443; demais serviços apenas `ClusterIP` | [`k8s/cert-issuer.yaml`](k8s/cert-issuer.yaml), [`k8s/certificate.yaml`](k8s/certificate.yaml), [`k8s/ingress.yaml`](k8s/ingress.yaml), job `release:images` |

O histórico de commits é atômico e incremental, com branches por fase (`001-deprecation-removal` … `010-cd-https-cert-manager`) e specs/planos de cada fase em [`specs/`](specs).

---

## Licença
Este software é distribuído sob os termos da licença MIT.
