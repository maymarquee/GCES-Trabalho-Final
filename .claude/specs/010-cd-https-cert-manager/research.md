# Research: CD & Segurança de Rede — HTTPS via Cert Manager

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10

## Decisões de Design

### Emissor TLS: `ClusterIssuer` selfsigned vs CA própria vs Let's Encrypt

**Decisão**: `ClusterIssuer` `selfsigned-issuer` (`spec.selfSigned: {}`).

**Alternativas consideradas**:

- **Let's Encrypt (`ACME`, desafio `HTTP-01`/`DNS-01`)**: É o caso de uso mais "real" do `cert-manager`, mas exige um domínio público resolvível pela internet e a porta 80 do `Ingress` acessível pelos servidores do Let's Encrypt para o desafio `HTTP-01` (ou um provedor DNS com API para `DNS-01`). A anotação da disciplina é explícita: "não sendo necessário o uso de VPS para disponibilizar publicamente, pode ser local mesmo" — Let's Encrypt não funciona em `mkjs.local` (domínio não roteável publicamente).
- **`ClusterIssuer` com CA própria (`spec.ca`)**: Requer gerar manualmente um par de chaves de CA, criar um `Secret` com `tls.crt`/`tls.key` da CA e referenciá-lo no `ClusterIssuer`. Tecnicamente mais próximo de uma PKI interna corporativa, mas adiciona um passo manual de geração/armazenamento de chave que foge do "fazer de forma rápida" da anotação, sem ganho pedagógico adicional sobre o fluxo `Issuer → Certificate → Secret → Ingress`.
- **`ClusterIssuer` `selfSigned`** (escolha final): Não requer chaves pré-existentes nem domínio público — o `cert-manager` gera a chave e o certificado autoassinado sob demanda. É exatamente o emissor sugerido pela anotação da disciplina ("usando um issuer selfsigned") e exercita o mesmo fluxo `ClusterIssuer → Certificate → Secret → Ingress.spec.tls` que um `ACME`/CA real usaria, com o trade-off conhecido e documentado de o navegador exibir aviso de certificado não confiável.

**Conclusão**: `selfSigned` é a opção que melhor equilibra "dominar o fluxo de HTTPS via cert-manager" com "sem VPS, local mesmo" — zero dependências externas, zero chaves para gerenciar.

---

### `Certificate` explícito vs anotação `cert-manager.io/cluster-issuer` (ingress-shim)

**Decisão**: Criar um recurso `Certificate mkjs-tls` explícito em `k8s/certificate.yaml`, referenciando o `ClusterIssuer` via `issuerRef`.

**Alternativas consideradas**:

- **`ingress-shim`** (anotar o `Ingress` com `cert-manager.io/cluster-issuer: selfsigned-issuer` e deixar o `cert-manager` criar o `Certificate` implicitamente a partir do bloco `tls` do `Ingress`): Funciona com menos YAML — o `cert-manager` observa `Ingress` com essa anotação e cria o `Certificate` correspondente automaticamente.
- **`Certificate` explícito** (escolha final): Um arquivo `k8s/certificate.yaml` separado torna visível, para quem lê os manifestos, a relação `ClusterIssuer ← Certificate → Secret` independentemente do `Ingress` — alinhado ao objetivo declarado da fase ("terem domínio do fluxo"). Também facilita inspecionar `kubectl get certificate -n mkjs` e seu `status.conditions` sem precisar correlacionar com anotações do `Ingress`.

**Conclusão**: O `Certificate` explícito custa um arquivo a mais e deixa o fluxo de emissão de TLS auto-documentado nos manifestos, em vez de implícito em uma anotação.

---

### Redirecionamento HTTP → HTTPS

**Decisão**: Anotações `nginx.ingress.kubernetes.io/ssl-redirect: "true"` e `nginx.ingress.kubernetes.io/force-ssl-redirect: "true"` no `Ingress mkjs`, junto com `spec.tls`.

**Detalhe**: `ssl-redirect: "true"` já é o padrão do `ingress-nginx` quando o `Ingress` declara `tls` para o host — mas o valor default só é aplicado quando existe ao menos um `Secret` TLS válido para o host. `force-ssl-redirect: "true"` garante o redirecionamento `308` mesmo durante a janela em que o `Certificate`/`Secret` ainda não foi emitido pelo `cert-manager` (evitando servir HTTP em texto plano nesse intervalo). Tornar ambas as anotações explícitas documenta a intenção de segurança em vez de depender de um default implícito do controller.

**Conclusão**: Duas anotações, sem novos recursos — o `ingress-nginx` já implementa o redirecionamento; a Fase 10 apenas o ativa explicitamente.

---

### Superfície de rede: nenhum novo `Service` externo

**Decisão**: Nenhuma alteração nos `Services` `app`/`nginx`/`postgres` (todos `ClusterIP`, Fase 9). O único ponto de entrada externo continua sendo o `Service` do `ingress-nginx` (instalado fora de `k8s/`), cujas portas 80/443 já são mapeadas para o host via `extraPortMappings` do `kind` (Fase 9).

**Conclusão**: O requisito "não expor outras portas para fora da rede de containers" já estava satisfeito pela topologia da Fase 9; esta fase apenas reafirma e testa essa garantia (SC-004) após adicionar TLS.

---

### Onde instalar o `cert-manager`: `terraform/` vs `k8s/kustomization.yaml`

**Decisão**: `terraform/null_resource.cert_manager`, instalando o manifesto oficial do `cert-manager` via `kubectl apply` + `kubectl wait`, entre `null_resource.ingress_nginx` e `null_resource.app_manifests` — mesmo padrão do `ingress-nginx` na Fase 9.

**Alternativas consideradas**:

- **Incluir o manifesto do `cert-manager` em `k8s/kustomization.yaml`**: Misturaria infraestrutura de cluster (controllers cluster-wide, namespace `cert-manager`, dezenas de CRDs) com os manifestos da aplicação `mkjs` (namespace `mkjs`). Também quebraria `kubectl apply -k k8s/` em um cluster onde o `cert-manager` ainda não existe, pois o `ClusterIssuer`/`Certificate` (que **ficam** em `k8s/`) dependem das CRDs do `cert-manager` já estarem registradas.
- **`null_resource.cert_manager` em `terraform/`** (escolha final): Mantém a mesma separação já estabelecida na Fase 9 entre "infraestrutura do cluster" (`kind`, `ingress-nginx`, agora `cert-manager` — via Terraform/`quickstart.md` Opção A) e "aplicação" (`k8s/kustomization.yaml`). `quickstart.md` documenta o passo manual equivalente para quem não usa Terraform.

**Conclusão**: Mesma fronteira arquitetural da Fase 9: `terraform/`/Opção A do `quickstart.md` provisionam o cluster e seus add-ons (`ingress-nginx`, `cert-manager`); `k8s/` contém apenas recursos da aplicação `mkjs` (incluindo `ClusterIssuer`/`Certificate`, que dependem desses add-ons mas pertencem semanticamente ao "como o `mkjs` é exposto").

---

### CD — registry de imagens: GitLab Container Registry vs GHCR/DockerHub via GitHub Actions

**Decisão**: Novo estágio `release` em `.gitlab-ci.yml`, job `release:images`, publicando em `$CI_REGISTRY_IMAGE/mkjs-app` e `$CI_REGISTRY_IMAGE/mkjs-nginx` (GitLab Container Registry do próprio projeto).

**Alternativas consideradas**:

- **GitHub Actions + GHCR/Docker Hub** (sugestão genérica da anotação da disciplina): Exigiria mover ou espelhar o repositório (atualmente hospedado e com CI configurado no GitLab — `.gitlab-ci.yml`, estágios `build`→`quality` das Fases 3-9) para o GitHub, e cadastrar credenciais/segredos adicionais (token do GHCR ou usuário/senha do Docker Hub) em um sistema de CI novo, paralelo ao já existente.
- **GitLab Container Registry** (escolha final): O projeto já roda inteiramente no GitLab CI; o Container Registry é um recurso integrado ao próprio projeto GitLab, habilitado por padrão, com variáveis `CI_REGISTRY`/`CI_REGISTRY_IMAGE`/`CI_REGISTRY_USER`/`CI_REGISTRY_PASSWORD` predefinidas pelo runner — zero credenciais novas para cadastrar, zero sistemas de CI adicionais. Atende ao mesmo objetivo ("publicação de imagens via pipeline") com o menor custo de integração possível.

**Conclusão**: GitLab Container Registry é o "GHCR/Docker Hub" natural deste projeto — mesmo conceito (registry de imagens versionado, integrado ao CI), sem trocar de plataforma.

---

### Escopo do "CD": publicação de imagens vs redeploy automático no cluster local

**Decisão**: O estágio `release` publica as imagens versionadas no Container Registry. O deploy no cluster `kind` local continua manual, via `kind load docker-image` (Fase 9) — não há `imagePullSecrets`/atualização automática de `Deployment` apontando para o registry remoto.

**Alternativas consideradas**:

- **Atualizar `k8s/kustomization.yaml` (`images:` transformer) para apontar `app`/`nginx` para `$CI_REGISTRY_IMAGE/...:latest`, e adicionar um job de CI que roda `kubectl apply -k k8s/` contra o cluster local**: Exigiria (a) o runner do GitLab ter rede até o cluster `kind` local da máquina do desenvolvedor (inviável — `kind` roda em Docker na máquina local, não é alcançável por um runner SaaS), e (b) `imagePullSecrets` com um `docker-registry` `Secret` apontando para o GitLab Container Registry (token de deploy) configurado no cluster local — passo manual extra sem um ambiente remoto real para justificá-lo.
- **Publicação de imagens apenas, deploy local inalterado** (escolha final): Cumpre literalmente "Deploy Contínuo com publicação de imagens" (a métrica auditável é "as imagens existem, versionadas, no registry, geradas automaticamente a cada push em `main`"), sem inventar um ambiente remoto fictício só para ter algo para o qual "redeployar". É consistente com a anotação da disciplina, que trata o registry como o entregável de CD ("O CD pode ser ajustado com publicação da imagem...").

**Conclusão**: Escopo igual ao da Fase 9 para o Terraform (infraestrutura **local**, sem nuvem/VPS): o CD desta fase entrega artefatos versionados (imagens no registry); não há ambiente remoto para "implantar continuamente" neles, e inventar um seria escopo fora do que a disciplina pede.

---

### Versão do `cert-manager`

**Decisão**: Fixar `v1.16.2` (`https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml`) — última versão estável compatível com Kubernetes 1.29+ (mesma baseline da Fase 9) no momento da implementação.

**Conclusão**: Versão fixada por reprodutibilidade, mesmo padrão do manifesto `ingress-nginx` da Fase 9 (URL versionada, não `main`/`latest` — exceto onde o próprio upstream do `ingress-nginx` já usa `main` por convenção do provider `kind`).
