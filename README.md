# 🚴 UCI Road Cycling Dashboard

Tableau de bord UCI Cyclisme sur route (hommes) avec :
- **Compte à rebours** avant la prochaine course WorldTour
- **Classement UCI** Top 10 individuel avec photos
- **Calendrier** courses à venir et passées

---

## 🚀 Déploiement

### Via Docker Compose classique
```bash
# Cloner / copier le dossier sur votre serveur
cd uci-cycling

# Build et lancement
docker compose up -d --build

# Accès : http://votre-ip:8282
```

### Via Portainer (Stack)

1. Ouvrir Portainer → **Stacks** → **Add stack**
2. Nom : `uci-cycling`
3. Méthode : **Upload** → glisser-déposer `docker-compose.yml`  
   *OU* coller le contenu dans l'éditeur Web
4. ⚠️ Si vous utilisez l'éditeur web Portainer, vous devez aussi uploader les dossiers `backend/` et `frontend/` sur le serveur dans le même répertoire de build, ou utiliser des images pré-buildées (voir ci-dessous).

### Portainer — méthode recommandée (Build sur le serveur)

```bash
# 1. Copier le dossier sur le serveur (scp, rsync, etc.)
scp -r uci-cycling/ user@serveur:/opt/stacks/

# 2. Dans Portainer → Stacks → Add stack
#    → Repository ou Upload du docker-compose.yml
#    → Build Path : /opt/stacks/uci-cycling

# 3. Deploy the stack
```

---

## ⚙️ Configuration

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` (backend) | `3001` | Port API interne |
| Port exposé | `8282` | Modifier dans `docker-compose.yml` |

Pour changer le port d'accès :
```yaml
ports:
  - "9090:80"   # Accès sur :9090
```

---

## 📡 Sources de données

1. **UCI.org** — classement officiel (scraping)
2. **ProCyclingStats.com** — classement + photos coureurs (fallback)
3. **Données statiques** — fallback si les sources sont inaccessibles

Le cache est de **1 heure** (configurable dans `backend/server.js` → `stdTTL`).

---

## 🔄 API interne

| Endpoint | Description |
|----------|-------------|
| `GET /api/rankings` | Top 10 classement UCI |
| `GET /api/calendar` | Calendrier complet |
| `GET /api/next-race` | Prochaine course |
| `GET /api/cache/clear` | Vider le cache |
| `GET /api/health` | Healthcheck |

---

## 🛠️ Structure

```
uci-cycling/
├── backend/
│   ├── server.js        # API Node.js (Express + Cheerio)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── index.html   # Single-page app
│   ├── nginx.conf       # Nginx + proxy vers backend
│   └── Dockerfile
└── docker-compose.yml
```
