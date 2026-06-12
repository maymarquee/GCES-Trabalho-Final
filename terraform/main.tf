# Provisions a local Kubernetes cluster (kind, backed by Docker) and applies the
# manifests in ../k8s — the "infraestrutura necessária" referenced in the README
# for Phase 9. Application Docker images are NOT built here: build and
# `kind load docker-image` them as documented in
# specs/009-k8s-infra/quickstart.md.
#
# Implemented via the `kind`/`kubectl` CLIs through local-exec rather than a
# kind/kubernetes Terraform provider: both CLIs are already required by the rest
# of this phase, and this avoids pulling extra third-party providers.

resource "null_resource" "kind_cluster" {
  triggers = {
    cluster_name = var.cluster_name
    http_port    = var.http_port
    https_port   = var.https_port
  }

  provisioner "local-exec" {
    command = <<-EOT
      cat <<KIND_CONFIG > "${path.module}/.kind-config.yaml"
      kind: Cluster
      apiVersion: kind.x-k8s.io/v1alpha4
      nodes:
        - role: control-plane
          kubeadmConfigPatches:
            - |
              kind: InitConfiguration
              nodeRegistration:
                kubeletExtraArgs:
                  node-labels: "ingress-ready=true"
          extraPortMappings:
            - containerPort: 80
              hostPort: ${var.http_port}
              protocol: TCP
            - containerPort: 443
              hostPort: ${var.https_port}
              protocol: TCP
      KIND_CONFIG
      kind create cluster --name "${var.cluster_name}" --config "${path.module}/.kind-config.yaml"
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "kind delete cluster --name \"${self.triggers.cluster_name}\""
  }
}

# Installs the ingress-nginx controller variant tuned for kind (NodePort + hostPort
# on the node labeled ingress-ready=true above).
resource "null_resource" "ingress_nginx" {
  depends_on = [null_resource.kind_cluster]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml --context "kind-${var.cluster_name}"
      kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=180s --context "kind-${var.cluster_name}"
    EOT
  }
}

# Installs cert-manager (CRDs + controllers), used by k8s/cert-issuer.yaml and
# k8s/certificate.yaml to issue the self-signed TLS certificate for mkjs.local.
resource "null_resource" "cert_manager" {
  depends_on = [null_resource.ingress_nginx]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml --context "kind-${var.cluster_name}"
      kubectl wait --namespace cert-manager --for=condition=available deployment --all --timeout=180s --context "kind-${var.cluster_name}"
    EOT
  }
}

# Applies the application manifests (k8s/) once the cluster, ingress controller
# and cert-manager are ready. Re-runs whenever a file under ../k8s changes.
resource "null_resource" "app_manifests" {
  depends_on = [null_resource.ingress_nginx, null_resource.cert_manager]

  triggers = {
    manifests_hash = sha1(join("", [for f in fileset("${path.module}/../k8s", "**/*.yaml") : filesha1("${path.module}/../k8s/${f}")]))
  }

  provisioner "local-exec" {
    command = "kubectl apply -k \"${path.module}/../k8s\" --context \"kind-${var.cluster_name}\""
  }
}
