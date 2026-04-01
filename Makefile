.PHONY: dev build preview test

dev:
	@lsof -ti:4400 | xargs kill -9 2>/dev/null || true
	npm run dev -- --port 4400

build:
	npm run build

preview:
	@lsof -ti:4400 | xargs kill -9 2>/dev/null || true
	npm run preview -- --port 4400

test:
	npm test
