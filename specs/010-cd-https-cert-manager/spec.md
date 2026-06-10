# Feature Specification: CD & Segurança de Rede — HTTPS via Cert Manager

**Feature Branch**: `010-cd-https-cert-manager`

**Created**: 2026-06-10

**Status**: Draft

**Input**: Phase 10 do projeto GCES (CD & Segurança de Rede): Deploy Contínuo com publicação de imagens e configuração de HTTPS via Cert Manager. O Nginx (ingress) deve redirecionar porta 80 para 443 e não expor outras portas para fora da rede de containers. Conforme anotação da disciplina, o objetivo é dominar o fluxo de deploy do Kubernetes com DNS local (`/etc/hosts` → `mkjs.local`) e HTTPS via `cert-manager` com um `ClusterIssuer` selfsigned — sem necessidade de VPS/ambiente público. O CD publica as imagens de produção via pipeline de CI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acesso ao jogo via HTTPS local (Priority: P1)

Um(a) jogador(a) que já configurou `mkjs.local` no `/etc/hosts` (Fase 9) quer acessar o jogo em `https://mkjs.local`, com o Ingress apresentando um certificado TLS emitido automaticamente pelo `cert-manager`, em vez de HTTP simples.

**Why this priority**: É o requisito central da fase — sem TLS configurado via `cert-manager`, não há "Segurança de Rede" para avaliar; é o entregável que demonstra domínio do fluxo Issuer → Certificate → Secret → Ingress.

**Independent Test**: Verificado executando `kubectl get certificate -n mkjs` (status `READY=True`), `kubectl get secret mkjs-tls -n mkjs -o yaml` (tipo `kubernetes.io/tls`) e acessando `https://mkjs.local/` no navegador (aceitando o aviso de certificado autoassinado).

**Acceptance Scenarios**:

1. **Given** o `cert-manager` instalado no cluster e os manifestos de `k8s/` aplicados, **When** o(a) desenvolvedor(a) executa `kubectl get clusterissuer`, **Then** `selfsigned-issuer` aparece com `READY=True`.
2. **Given** o `ClusterIssuer` pronto, **When** o(a) desenvolvedor(a) executa `kubectl get certificate -n mkjs`, **Then** `mkjs-tls` aparece com `READY=True` e o `Secret mkjs-tls` (tipo `kubernetes.io/tls`) existe no namespace `mkjs`.
3. **Given** a stack rodando e `mkjs.local` resolvendo para o cluster, **When** o(a) jogador(a) acessa `https://mkjs.local/` e aceita o aviso de certificado autoassinado, **Then** a página do jogo (`game/index.html`) é carregada via HTTPS.
4. **Given** duas abas em `https://mkjs.local/`, **When** ambas entram com o mesmo nome de partida (modo Rede), **Then** a conexão Socket.io é estabelecida via `wss://` através do Ingress, sem desconectar (timeouts de proxy da Fase 9 preservados).

---

### User Story 2 - Redirecionamento HTTP → HTTPS e superfície de rede mínima (Priority: P1)

Um(a) desenvolvedor(a) quer garantir que qualquer acesso em `http://mkjs.local` (porta 80) seja automaticamente redirecionado para `https://mkjs.local` (porta 443), e que nenhum `Service` além do Ingress controller exponha portas fora da rede do cluster.

**Why this priority**: É o requisito de "Segurança de Rede" explícito do README e da constituição do projeto (Princípio IV) — sem o redirecionamento e a superfície mínima, a fase fica incompleta mesmo com TLS funcionando.

**Independent Test**: Verificado com `curl -k -I http://mkjs.local/` (retorna `308 Permanent Redirect` para `https://mkjs.local/`) e `kubectl get svc -A` (apenas o `Service` do `ingress-nginx` é `LoadBalancer`/`NodePort`; `app`, `nginx`, `postgres` permanecem `ClusterIP`).

**Acceptance Scenarios**:

1. **Given** o `Ingress mkjs` com `tls` configurado, **When** o(a) desenvolvedor(a) executa `curl -k -I http://mkjs.local/`, **Then** a resposta é `308 Permanent Redirect` com `Location: https://mkjs.local/`.
2. **Given** a stack completa aplicada, **When** o(a) desenvolvedor(a) executa `kubectl get svc -n mkjs`, **Then** todos os `Services` (`app`, `nginx`, `postgres`) aparecem como `ClusterIP` — nenhum `NodePort`/`LoadBalancer` adicional foi criado pela aplicação.
3. **Given** o cluster `kind` provisionado pela Fase 9 (portas 80/443 mapeadas para o host), **When** o(a) desenvolvedor(a) inspeciona os `extraPortMappings`, **Then** apenas as portas 80 e 443 do nó `kind` estão expostas ao host — nenhuma porta de `app` (55555), `nginx` interno (80) ou `postgres` (5432) é mapeada diretamente.

---

### User Story 3 - Publicação contínua das imagens de produção (Priority: P1)

Um(a) desenvolvedor(a) quer que, a cada push na branch principal (`main`) que passe por todos os gates de qualidade/segurança já existentes, o pipeline construa e publique as imagens `mkjs-app` e `mkjs-nginx` (Fase 8, `Dockerfile.prod`/`nginx/Dockerfile`) no Container Registry do projeto, versionadas pelo SHA do commit.

**Why this priority**: É a metade "CD" do nome da fase — sem publicação automatizada de imagens, não há "Deploy Contínuo" para avaliar, mesmo com o restante (HTTPS) funcionando.

**Independent Test**: Verificado dando push na branch `main` e observando, na aba "Packages & Registries → Container Registry" do projeto GitLab, as imagens `mkjs-app` e `mkjs-nginx` com as tags `<sha-curto>` e `latest`.

**Acceptance Scenarios**:

1. **Given** um push na branch `main` que passa pelos estágios `build`, `lint`, `test`, `security`, `quality` e `infra`, **When** o estágio `release` executa, **Then** o job `release:images` builda `Dockerfile.prod` e `nginx/Dockerfile` e publica `$CI_REGISTRY_IMAGE/mkjs-app` e `$CI_REGISTRY_IMAGE/mkjs-nginx` com as tags `$CI_COMMIT_SHORT_SHA` e `latest`.
2. **Given** um push em uma branch de feature (não `main`), **When** o pipeline executa, **Then** o job `release:images` não roda (regra `rules` restringe à branch padrão).
3. **Given** uma falha em qualquer estágio anterior (ex.: `sca:npm-audit`), **When** o pipeline executa, **Then** o estágio `release` não inicia — a publicação de imagens é condicionada aos gates de qualidade/segurança.

---

### Edge Cases

- O que acontece se `cert-manager` não estiver instalado quando `kubectl apply -k k8s/` rodar? Os recursos `ClusterIssuer`/`Certificate` falham com `no matches for kind "ClusterIssuer"/"Certificate"` (CRDs inexistentes). O `terraform/` (Fase 9, estendido nesta fase) instala o `cert-manager` e aguarda seus pods ficarem `Ready` **antes** de aplicar `k8s/`; o `quickstart.md` documenta o mesmo passo manual para quem não usa Terraform.
- O que acontece se o navegador não confiar no certificado autoassinado? É esperado um aviso de segurança ("conexão não é privada") — aceitável para ambiente local/educacional conforme a anotação da disciplina. `quickstart.md`/`ComoRodar.md` documentam como prosseguir (avançar mesmo assim) e, opcionalmente, como exportar/confiar na CA gerada pelo `selfsigned-issuer`.
- O que acontece com a renovação do certificado? `cert-manager` renova automaticamente o `Certificate mkjs-tls` antes de expirar (padrão: renovação a 2/3 da validade); nenhuma ação manual é necessária — documentado em `research.md`.
- O que acontece se `kubectl kustomize k8s/` (job `k8s:validate`, Fase 9) for executado sem o `cert-manager` instalado? `kubectl kustomize` apenas renderiza YAML (não contata a API server para validar CRDs), então `ClusterIssuer`/`Certificate` são renderizados normalmente e o job continua verde.
- O que acontece se `terraform destroy` for executado? O `cert-manager` é removido junto com o cluster `kind` inteiro (não é um recurso Terraform separado a destruir).
- O que acontece se o registry do projeto GitLab não estiver habilitado? `docker push` falha com erro de autenticação/404; `quickstart.md` documenta como habilitar "Container Registry" em Settings → General → Visibility do projeto GitLab (habilitado por padrão em projetos GitLab.com).
- O que acontece com o `Deployment app`/`nginx` locais (imagens `mkjs-app:latest`/`mkjs-nginx:latest` carregadas via `kind load`, Fase 9)? Continuam sendo o fluxo de deploy local — esta fase **não** substitui `kind load` por `imagePullSecrets` apontando para o registry remoto, pois não há cluster remoto/VPS para justificar essa complexidade (decisão registrada em `research.md`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O `cert-manager` (CRDs + controllers, namespace `cert-manager`) DEVE ser instalado no cluster a partir do manifesto oficial de uma versão fixada, **antes** da aplicação dos manifestos de `k8s/` — análogo à instalação do `ingress-nginx` na Fase 9.
- **FR-002**: `k8s/` DEVE conter um `ClusterIssuer` chamado `selfsigned-issuer` (`spec.selfSigned: {}`), recurso cluster-scoped incluído em `k8s/kustomization.yaml`.
- **FR-003**: `k8s/` DEVE conter um `Certificate` chamado `mkjs-tls` no namespace `mkjs`, referenciando `selfsigned-issuer` (`issuerRef.kind: ClusterIssuer`), com `dnsNames: [mkjs.local]` e `secretName: mkjs-tls`.
- **FR-004**: O `Ingress mkjs` DEVE declarar `spec.tls` com `hosts: [mkjs.local]` e `secretName: mkjs-tls`, preservando as anotações de timeout WebSocket da Fase 9.
- **FR-005**: O `Ingress mkjs` DEVE definir as anotações `nginx.ingress.kubernetes.io/ssl-redirect: "true"` e `nginx.ingress.kubernetes.io/force-ssl-redirect: "true"`, garantindo que requisições em `http://mkjs.local` (porta 80) recebam `308` para `https://mkjs.local` (porta 443).
- **FR-006**: Nenhum `Service` da aplicação (`app`, `nginx`, `postgres`) PODE ser do tipo `NodePort`/`LoadBalancer` — todos permanecem `ClusterIP`; apenas o `Service` do controller `ingress-nginx` (instalado fora de `k8s/`, Fase 9) expõe portas 80/443 ao host via `kind`.
- **FR-007**: O `terraform/` (se usado) DEVE instalar o `cert-manager` (manifesto oficial, `kubectl apply` + `kubectl wait` pelos deployments do namespace `cert-manager`) entre a instalação do `ingress-nginx` e a aplicação de `k8s/`.
- **FR-008**: O `.gitlab-ci.yml` DEVE conter um novo estágio `release`, posicionado após `infra`, com um job `release:images` que builda `Dockerfile.prod` e `nginx/Dockerfile` e publica as imagens resultantes em `$CI_REGISTRY_IMAGE/mkjs-app` e `$CI_REGISTRY_IMAGE/mkjs-nginx`, tagueadas com `$CI_COMMIT_SHORT_SHA` e `latest`.
- **FR-009**: O job `release:images` DEVE rodar apenas quando `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` (branch `main`), e — por estar em um estágio posterior a `build`/`lint`/`test`/`security`/`quality`/`infra` sem `needs` que pulem etapas — só inicia se todos os jobs anteriores tiverem sucesso.
- **FR-010**: `ComoRodar.md`/`quickstart.md` DEVEM documentar: instalação do `cert-manager`, verificação do `ClusterIssuer`/`Certificate`, acesso a `https://mkjs.local` (incluindo o aviso de certificado autoassinado), verificação do redirecionamento `http://` → `https://`, e onde visualizar as imagens publicadas no Container Registry.

### Key Entities

- **`ClusterIssuer` `selfsigned-issuer`**: Emissor de certificados autoassinados (`spec.selfSigned: {}`), cluster-scoped, usado como raiz de confiança local.
- **`Certificate` `mkjs-tls`** (namespace `mkjs`): Solicita ao `selfsigned-issuer` um certificado para `mkjs.local`; cert-manager materializa o `Secret mkjs-tls`.
- **`Secret` `mkjs-tls`** (tipo `kubernetes.io/tls`, namespace `mkjs`): Gerado/gerenciado pelo `cert-manager`; contém `tls.crt`/`tls.key` consumidos pelo `Ingress`.
- **`Ingress` `mkjs`** (atualizado): Adiciona bloco `tls` e anotações `ssl-redirect`/`force-ssl-redirect`.
- **`cert-manager`** (namespace `cert-manager`, fora de `k8s/kustomization.yaml`): Controllers (`cert-manager`, `cert-manager-cainjector`, `cert-manager-webhook`) instalados via manifesto oficial, análogo ao `ingress-nginx`.
- **Estágio `release` / job `release:images`**: Novo estágio do `.gitlab-ci.yml`; publica `$CI_REGISTRY_IMAGE/mkjs-app` e `$CI_REGISTRY_IMAGE/mkjs-nginx` no GitLab Container Registry.
- **(Opcional) `null_resource.cert_manager`**: Recurso Terraform que instala o `cert-manager` entre `ingress_nginx` e `app_manifests`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `kubectl get clusterissuer selfsigned-issuer` e `kubectl get certificate mkjs-tls -n mkjs` mostram `READY=True`; `kubectl get secret mkjs-tls -n mkjs` existe com `type: kubernetes.io/tls`.
- **SC-002**: `https://mkjs.local/` carrega o jogo no navegador (após aceitar o aviso de certificado autoassinado); duas abas completam uma partida em modo Rede via `wss://`.
- **SC-003**: `curl -k -I http://mkjs.local/` retorna `308 Permanent Redirect` com `Location: https://mkjs.local/`.
- **SC-004**: `kubectl get svc -n mkjs` mostra `app`, `nginx` e `postgres` como `ClusterIP`; nenhum `Service` adicional do tipo `NodePort`/`LoadBalancer` é criado por `k8s/`.
- **SC-005**: Um push na branch `main` produz, no pipeline GitLab, um job `release:images` verde no estágio `release`, e as imagens `mkjs-app`/`mkjs-nginx` aparecem em "Packages & Registries → Container Registry" com as tags do commit e `latest`.
- **SC-006**: `kubectl kustomize k8s/` (job `k8s:validate`, Fase 9) continua renderizando sem erro com os novos recursos `ClusterIssuer`/`Certificate` incluídos.

## Assumptions

- O `cert-manager` é instalado a partir do manifesto oficial (`https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml`), versão fixada para reprodutibilidade — atualizações de versão ficam fora do escopo desta fase.
- Um certificado emitido por um `ClusterIssuer` `selfSigned` gera aviso de segurança no navegador (cadeia não reconhecida por uma CA pública). Isso é aceitável e esperado para o ambiente local/educacional desta fase, conforme a anotação da disciplina ("não sendo necessário o uso de VPS"); confiar na CA no SO/navegador é documentado como passo opcional.
- O Container Registry do projeto GitLab está habilitado por padrão (GitLab.com) e as variáveis `CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD` são predefinidas pelo runner — nenhuma credencial adicional precisa ser cadastrada.
- "Deploy Contínuo" nesta fase é entendido como **publicação automatizada de imagens versionadas** no Container Registry a cada push em `main`, condicionada aos gates de qualidade/segurança já existentes (Princípio III). Não há redeploy automático para o cluster `kind` local — o fluxo `kind load docker-image` da Fase 9 continua sendo o caminho de deploy local, já que não existe um ambiente remoto/VPS para o qual "entregar" as imagens publicadas.
- DNS local (`mkjs.local` → IP do cluster via `/etc/hosts`/`hosts` do Windows) já documentado na Fase 9; esta fase não introduz novo mecanismo de DNS, apenas passa a servir esse host também em HTTPS.
- As credenciais/segredos do Postgres (`Secret mkjs-secrets`, Fase 9) não são alterados por esta fase.
