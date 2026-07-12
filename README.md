# Foga Flow

MVP aplikacji do obslugi zapytan mailowych klientow w stacku `LangGraph + Python + Angular + Postgres`.

## Zakres MVP

- rejestracja i logowanie uzytkownika,
- dashboard dostepny po zalogowaniu,
- pobieranie wiadomosci ze skrzynki przez adapter MCP,
- rozpoznawanie, czy wiadomosc jest zapytaniem klienckim,
- odkladanie zapytan do dashboardu,
- import cennika z pliku Excel,
- generowanie kosztorysow na bazie cennika,
- przygotowanie odpowiedzi mailowej z kosztorysem.

## Struktura

- `backend/` - FastAPI, SQLAlchemy, LangGraph, auth, logika biznesowa
- `frontend/` - Angular standalone app
- `deploy/nginx/email-flow.conf` - konfiguracja pod zewnetrzny Nginx na serwerze
- `docker-compose.yml` - lokalny Postgres
- `docker-compose.prod.yml` - produkcyjny deploy na Docker Compose
- `.github/workflows/deploy.yml` - automatyczny deploy przez GitHub Actions

## Uruchomienie lokalne

### 1. Postgres

```powershell
docker compose up -d postgres
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Backend bedzie dostepny pod `http://localhost:8000`.

### 3. Frontend

```powershell
cd frontend
npm install
npm start
```

Frontend bedzie dostepny pod `http://localhost:4200`, a `proxy.conf.json` przekieruje lokalne `/api` do backendu na `http://localhost:8000`.

## Deploy na serwer 95.158.64.196

Workflow deployu uruchamia sie po `push` na branch `master` albo recznie przez `workflow_dispatch`.
Kod jest kopiowany na serwer do katalogu `/opt/email-flow`, a potem GitHub Actions wykonuje:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

W tej wersji aplikacja nie zajmuje publicznego portu `80`. Kontener `frontend` wystawia sie tylko lokalnie na serwerze pod `127.0.0.1:8085`, a publiczny ruch ma obsluzyc istniejacy Nginx systemowy.

### Wymagania na serwerze

- zainstalowany Docker i Docker Compose,
- uzytkownik z dostepem SSH,
- port SSH dostepny na `2222`,
- katalog docelowy `/opt/email-flow` z prawami zapisu dla uzytkownika deployujacego,
- dzialajacy Nginx na ho?cie.

### Sekrety GitHub Actions

Ustaw w repozytorium te sekrety:

- `DEPLOY_HOST` = `95.158.64.196`
- `DEPLOY_PORT` = `2222`
- `DEPLOY_USER` = uzytkownik SSH na serwerze
- `DEPLOY_SSH_KEY` = prywatny klucz SSH do deployu
- `APP_SECRET_KEY` = sekret JWT backendu
- `POSTGRES_DB` = nazwa bazy, np. `email_flow`
- `POSTGRES_USER` = uzytkownik Postgresa
- `POSTGRES_PASSWORD` = haslo Postgresa
- `FRONTEND_ORIGIN` = publiczny origin frontendu, np. `http://95.158.64.196`
- `EMAIL_MCP_MODE` = na start moze zostac `mock`
- `EMAIL_MCP_SERVER_NAME` = nazwa integracji MCP, np. `email`
- `EMAIL_POLL_LIMIT` = np. `20`

### Konfiguracja zewnetrznego Nginx na serwerze

Skopiuj `deploy/nginx/email-flow.conf` na serwer, np. do `/etc/nginx/sites-available/email-flow.conf`, a potem podlacz go do aktywnej konfiguracji Nginx. Przyklad:

```bash
sudo cp /opt/email-flow/deploy/nginx/email-flow.conf /etc/nginx/sites-available/email-flow.conf
sudo ln -sf /etc/nginx/sites-available/email-flow.conf /etc/nginx/sites-enabled/email-flow.conf
sudo nginx -t
sudo systemctl reload nginx
```

Ta konfiguracja kieruje ruch z publicznego `http://95.158.64.196` do aplikacji nasluchujacej lokalnie na `127.0.0.1:8085`.

## Konfiguracja MCP do emaila

W tym MVP jest przygotowany adapter `MCPEmailClient`, ktory ma jeden punkt integracji:

- `backend/app/services/email_mcp.py`

Tam nalezy podpiac konkretny transport MCP do wybranego serwera obslugujacego skrzynke mailowa. Obecnie adapter dziala w trybie `mock`, zeby caly przeplyw aplikacji byl gotowy bez blokowania sie na szczegolach konkretnego serwera MCP.

## Glowne endpointy

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/inquiries`
- `POST /api/pricing/upload`
- `POST /api/agent/process-inbox`

## Co jest juz gotowe

- modele uzytkownikow, zapytan, produktow i kosztorysow,
- JWT auth,
- dashboard z logowaniem i rejestracja,
- upload Excela z cennikiem,
- szkielet przeplywu LangGraph:
  - pobierz maile,
  - sklasyfikuj wiadomosci,
  - zapisz zapytania,
  - zbuduj kosztorys,
  - przygotuj odpowiedz.

## Ograniczenia obecnego MVP

- integracja MCP jest przygotowana architektonicznie, ale nie jest jeszcze spieta z konkretnym dostawca skrzynki,
- klasyfikacja zapytan i budowa kosztorysu dzialaja regulowo z miejscem na dalsze nody LangGraph,
- odpowiedz mailowa jest generowana i zapisywana w bazie, ale fizyczna wysylka przez MCP wymaga dopiecia konkretnej implementacji klienta.
