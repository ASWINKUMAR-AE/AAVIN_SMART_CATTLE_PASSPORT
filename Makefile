.PHONY: help setup install env db-init db-reset dev start backend expo web test clean
help:
	@echo 'make setup    - Install Expo and Django dependencies'
	@echo 'make db-init  - Apply PostgreSQL migrations (no database drop)'
	@echo 'make backend  - Start Django on port 4000'
	@echo 'make dev      - Start Django and Expo'
	@echo 'make test     - Run isolated backend tests'
env:
	@node -e "const fs=require('fs'); if(!fs.existsSync('backend/.env')) fs.copyFileSync('backend/.env.example','backend/.env');"
install:
	npm install
	python3 -m venv backend/.venv
	backend/.venv/bin/python -m pip install -r backend/requirements.txt
setup: env install
db-init:
	node scripts/init-db.js
db-reset:
	@echo 'Cloud database reset is disabled.'
	@exit 1
dev:
	npm start
start: dev
backend:
	npm run backend
expo:
	npm run expo
web:
	npm run web
test:
	npm --prefix backend test
clean:
	@echo 'Use Django migrations to manage the database.'
