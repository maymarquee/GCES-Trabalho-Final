# Quickstart: Qualidade de Código — SonarCloud

## Setup único (uma vez por projeto)

### 1. Criar conta e organização no SonarCloud

1. Acesse [sonarcloud.io](https://sonarcloud.io) e clique em **Log in with GitLab**
2. Autorize o SonarCloud a acessar seu GitLab
3. Clique em **+ → Analyze new project**
4. Selecione a organização GitLab `unb-esw` (ou a que contém seu projeto)
5. Encontre e selecione o repositório `trabalho-final-gces-mayara-silva`
6. Clique em **Set Up**
7. Na próxima tela, escolha **With GitLab CI** como método de análise

### 2. Obter Project Key e Organization Key

Após a importação:
- **Organization Key**: visível em sonarcloud.io → clique na sua organização → **Administration → Organization Settings → Key**
- **Project Key**: visível em sonarcloud.io → seu projeto → **Project Settings → Project Information → Project Key**

### 3. Atualizar `sonar-project.properties`

Edite o arquivo `sonar-project.properties` na raiz do repositório:

```properties
sonar.projectKey=SEU_PROJECT_KEY_AQUI
sonar.organization=SUA_ORGANIZATION_KEY_AQUI
```

### 4. Gerar SONAR_TOKEN

1. sonarcloud.io → clique no avatar → **My Account**
2. Aba **Security**
3. Em **Generate Tokens**, insira um nome (ex: `gitlab-ci`) e clique **Generate**
4. **Copie o token imediatamente** — ele não será exibido novamente

### 5. Adicionar SONAR_TOKEN no GitLab

1. Acesse seu repositório no GitLab
2. **Settings → CI/CD → Variables → Add variable**
3. Configure:
   - **Key**: `SONAR_TOKEN`
   - **Value**: (cole o token gerado)
   - **Type**: Variable
   - **Flags**: marque **Mask variable** (oculta o valor nos logs)
4. Clique em **Add variable**

---

## Verificar análise no dashboard

Após o primeiro pipeline executar com sucesso:

1. Acesse [sonarcloud.io](https://sonarcloud.io) → seu projeto
2. A aba **Overview** exibe: Quality Gate status, Coverage %, Bugs, Code Smells, Duplications
3. A aba **Issues** lista problemas encontrados com severidade e localização
4. A aba **Measures → Coverage** mostra detalhes por arquivo

---

## Executar análise localmente (opcional)

Pré-requisito: Java 11+ e sonar-scanner instalados, e `SONAR_TOKEN` exportado.

```bash
# Instalar sonar-scanner (uma vez)
# macOS: brew install sonar-scanner
# Linux: baixe em https://docs.sonarsource.com/sonarcloud/advanced-setup/ci-based-analysis/sonarscanner-cli/

# Gerar cobertura localmente
cd server && npm run test:coverage && cd ..

# Executar análise
export SONAR_TOKEN=seu_token_aqui
sonar-scanner -Dsonar.qualitygate.wait=true
```

---

## Verificar Quality Gate no pipeline GitLab

1. Acesse `CI/CD → Pipelines` no repositório GitLab
2. Clique no pipeline mais recente → estágio `quality`
3. Job `sonarcloud` → log exibe: `QUALITY_GATE_STATUS: OK` (ou `ERROR` se falhar)
4. O link para o dashboard SonarCloud aparece no log do job
