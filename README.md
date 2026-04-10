# 🚴 UCI Road Cycling Dashboard — Image unique

## Structure
```
uci-cycling/
├── Dockerfile                        # Image unique Nginx + Node
├── supervisord.conf                  # Lance les 2 process
├── nginx.conf                        # Proxy /api/ → Node :3001
├── server.js                         # API backend (scraping UCI/PCS)
├── package.json
├── public/
│   └── index.html                    # Frontend SPA
├── docker-compose.portainer.yml      # À coller dans Portainer
└── .github/
    └── workflows/
        └── docker-publish.yml        # CI/CD → ghcr.io
```

---

## 🚀 Workflow complet

### 1. Créer le repo GitHub

```bash
git init
git add .
git commit -m "feat: UCI cycling dashboard"
git branch -M main
git remote add origin https://github.com/TON_USER/uci-cycling.git
git push -u origin main
```

### 2. Rendre l'image publique (optionnel)

Sur GitHub → repo → **Packages** → `uci-cycling` → **Package settings**
→ Change visibility → **Public**

Sinon, créer un token dans Portainer (voir étape 4b).

### 3. GitHub Actions build l'image automatiquement

Dès le push sur `main`, l'action `.github/workflows/docker-publish.yml` :
- Build l'image Docker
- La pousse sur `ghcr.io/TON_USER/uci-cycling:latest`

Vérifier dans : **GitHub → repo → Actions** ✅

### 4a. Portainer — image publique

Dans Portainer → **Stacks → Add stack → Web editor** :

```yaml
version: '3.8'
services:
  uci-cycling:
    image: ghcr.io/TON_USER/uci-cycling:latest
    container_name: uci-cycling
    restart: unless-stopped
    ports:
      - "8282:80"
    environment:
      - NODE_ENV=production
```

Remplacer `TON_USER` par ton username GitHub → **Deploy the stack** ✅

### 4b. Portainer — image privée (token GHCR)

1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Générer un token avec le scope `read:packages`
3. Dans Portainer → **Registries → Add registry → Custom registry** :
   - URL : `ghcr.io`
   - Username : ton GitHub username
   - Password : le token généré
4. Déployer la stack normalement

---

## 🔄 Mise à jour

```bash
# Modifier le code, puis :
git add . && git commit -m "fix: ..." && git push
# → GitHub Actions rebuild automatiquement l'image
```

Dans Portainer → stack → **Pull and redeploy** pour récupérer la nouvelle image.

---

## 🌐 Accès

`http://votre-ip:8282`

Pour changer le port, modifier `"8282:80"` dans le compose.
