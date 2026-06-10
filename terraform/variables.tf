variable "cluster_name" {
  description = "Nome do cluster kind local provisionado para o mk.js"
  type        = string
  default     = "mkjs"
}

variable "http_port" {
  description = "Porta no host mapeada para a porta 80 do Ingress controller"
  type        = number
  default     = 80
}

variable "https_port" {
  description = "Porta no host mapeada para a porta 443 do Ingress controller"
  type        = number
  default     = 443
}
