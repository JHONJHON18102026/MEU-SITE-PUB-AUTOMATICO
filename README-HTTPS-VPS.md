# HTTPS da API no VPS

Depois que `api.futurodigitalai.com.br` apontar para `217.77.5.101`:

1. Instale o Caddy no Windows Server.
2. Copie o `Caddyfile` para `C:\Caddy\Caddyfile`.
3. Libere TCP 80 e 443 no firewall:

```powershell
New-NetFirewallRule -DisplayName "Futuro Digital HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Futuro Digital HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

4. Inicie o Caddy:

```powershell
caddy run --config C:\Caddy\Caddyfile
```

O Caddy solicita e renova automaticamente o certificado de `api.futurodigitalai.com.br` e encaminha para a API local em `127.0.0.1:8787`.
