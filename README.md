# Email Flow

MVP aplikacji do obslugi zapytan mailowych klientow w stacku `LangGraph + Python + Angular + Postgres`.

## Zakres MVP

- rejestracja i logowanie uzytkownika,
- dashboard dostepny po zalogowaniu,
- konfiguracja skrzynki email per user po zalogowaniu,
- pobieranie wiadomosci ze skrzynki przypisanej do danego usera,
- rozpoznawanie, czy wiadomosc jest zapytaniem klienckim,
- odkladanie zapytan do dashboardu,
- import cennika z pliku Excel,
- generowanie kosztorysow na bazie cennika,
- przygotowanie odpowiedzi mailowej z kosztorysem,
- opcjonalne wysylanie odpowiedzi przez SMTP z konta danego usera.

## Multi-tenant

Ta aplikacja jest multi-tenant na poziomie uzytkownika. To oznacza:

- kazdy user ma wlasny cennik,
- kazdy user ma wlasna liste zapytan,
- kazdy user ma wlasna konfiguracje skrzynki IMAP/SMTP,
- konfiguracja maila nie jest juz globalna w `.env.prod`.

Ustawienia skrzynki zapisuje sie po zalogowaniu w dashboardzie, w sekcji konfiguracji skrzynki.

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

Frontend bedzie dostepny pod `http://localhost:4200/email-flow/`.

## Deploy na serwer 95.158.64.196

Workflow deployu uruchamia sie po `push` na branch `master` albo recznie przez `workflow_dispatch`.
Kod jest kopiowany na serwer do katalogu `/opt/email-flow`, a potem GitHub Actions wykonuje:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Aplikacja jest wystawiona pod prefiksem `http://95.158.64.196/email-flow/`. Kontener `frontend` wystawia sie lokalnie na serwerze pod `127.0.0.1:8085`, a publiczny ruch obsluguje systemowy Nginx.

### Wymagania na serwerze

- zainstalowany Docker i Docker Compose,
- uzytkownik z dostepem SSH,
- port SSH dostepny na `2222`,
- katalog docelowy `/opt/email-flow` z prawami zapisu dla uzytkownika deployujacego,
- dzialajacy Nginx na hoscie.

### Sekrety GitHub Actions

Ustaw w repozytorium te sekrety:

- `DEPLOY_HOST` = `95.158.64.196`
- `DEPLOY_PORT` = `2222`
- `DEPLOY_USER` = `webaby`
- `DEPLOY_SSH_KEY` = prywatny klucz SSH do deployu
- `SECRET_KEY` = sekret JWT backendu
- `POSTGRES_DB` = nazwa bazy, np. `email_flow`
- `POSTGRES_USER` = uzytkownik Postgresa
- `POSTGRES_PASSWORD` = haslo Postgresa
- `FRONTEND_ORIGIN` = publiczny origin frontendu, np. `http://95.158.64.196`
- `EMAIL_POLL_LIMIT` = np. `20`

### Konfiguracja zewnetrznego Nginx na serwerze

```bash
sudo cp /opt/email-flow/deploy/nginx/email-flow.conf /etc/nginx/sites-available/email-flow.conf
sudo ln -sf /etc/nginx/sites-available/email-flow.conf /etc/nginx/sites-enabled/email-flow.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Skrzynka email per user

Po zalogowaniu user w dashboardzie ustawia wlasne dane:

- tryb integracji `disabled` albo `imap`,
- host, port, login, haslo IMAP,
- folder i filtr wyszukiwania IMAP,
- opcjonalnie host, port, login, haslo i adres nadawcy SMTP.

Jak dziala ten model:

- agent pobiera maile z konta zalogowanego usera,
- agent zapisuje zapytania tylko do tenant scope tego usera,
- odpowiedzi SMTP sa wysylane z danych zapisanych dla tego usera,
- `.env.prod` nie przechowuje juz danych skrzynki dla wszystkich tenantow.

## Uwaga bezpieczenstwa

W aktualnym MVP hasla IMAP i SMTP sa przechowywane w bazie aplikacji, zeby mozna bylo szybko uruchomic multi-tenant flow. Produkcyjnie warto je zaszyfrowac kluczem aplikacyjnym albo przeniesc do wydzielonego secret store.
