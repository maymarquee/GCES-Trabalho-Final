# Quickstart: Segurança — SAST & SCA

**Branch**: `007-sast-sca` | **Date**: 2026-06-09

## Executar SCA (npm audit) localmente

Pré-requisito: Node.js 18+ e dependências instaladas.

```bash
cd server

# Verificar vulnerabilidades (relatório completo)
npm audit

# Verificar apenas high/critical (mesmo critério do CI)
npm audit --audit-level=high

# Gerar relatório JSON (mesmo formato do CI)
npm audit --json > npm-audit-report.json
cat npm-audit-report.json
```

**Saída esperada (sem vulnerabilidades):**
```
found 0 vulnerabilities
```

## Executar SAST (semgrep) localmente

Pré-requisito: Docker instalado.

```bash
# Baixar e executar semgrep (mesma imagem usada pelo CI)
docker run --rm \
  -v "$(pwd):/src" \
  returntocorp/semgrep semgrep \
  --config=p/javascript \
  --config=p/nodejs \
  --exclude=node_modules \
  --exclude=test \
  --json \
  -o /src/gl-sast-report.json \
  /src/server /src/game/src

cat gl-sast-report.json | python3 -m json.tool | head -50
```

**Nota**: O CI usa a imagem gerenciada pelo GitLab (`registry.gitlab.com/security-products/semgrep`), que pode ter regras ligeiramente diferentes do `returntocorp/semgrep` público, mas os resultados são comparáveis para triagem local.

## Verificar jobs de segurança no GitLab

1. Acesse o repositório no GitLab
2. Navegue até `CI/CD → Pipelines`
3. Clique no pipeline mais recente
4. No estágio `security`, visualize:
   - `semgrep-sast` — análise SAST do código-fonte
   - `sca:npm-audit` — verificação de vulnerabilidades em dependências

## Baixar artefatos de segurança

```bash
# Via CLI do GitLab (requer token)
# Ou via interface: CI/CD → Pipelines → [pipeline] → Download artifacts

# Arquivos gerados:
# - gl-sast-report.json   (relatório SAST)
# - npm-audit-report.json (relatório SCA)
```

## Interpretar resultados

### npm-audit-report.json

```json
{
  "metadata": {
    "vulnerabilities": {
      "high": 0,     // 0 = pipeline passa
      "critical": 0  // > 0 = pipeline falha
    }
  }
}
```

### gl-sast-report.json

```json
{
  "vulnerabilities": [
    {
      "severity": "Medium",   // Nível do achado
      "name": "...",          // Regra semgrep que disparou
      "location": {
        "file": "server/server.js",
        "start_line": 42      // Linha no código
      }
    }
  ]
}
```

Achados SAST são informativos — o pipeline não falha por causa deles (`allow_failure: true`). Revise manualmente e abra issues para correção.
