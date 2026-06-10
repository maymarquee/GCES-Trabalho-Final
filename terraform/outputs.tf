output "cluster_context" {
  description = "Contexto kubectl do cluster kind local (kubectl --context <valor> ...)"
  value       = "kind-${var.cluster_name}"
}

output "app_url" {
  description = "URL do jogo via Ingress (requer mkjs.local apontando para 127.0.0.1)"
  value       = "http://mkjs.local:${var.http_port}"
}

output "https_url" {
  description = "URL HTTPS do jogo via Ingress, com TLS emitido pelo cert-manager (selfsigned-issuer); o navegador exibira um aviso de certificado autoassinado"
  value       = "https://mkjs.local:${var.https_port}"
}
