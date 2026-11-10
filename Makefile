.PHONY: install deps dev lint build preview check docker-build docker-run docker-up docker-down help

# Установка зависимостей
install deps:
	npm install

# Запуск в режиме разработки
dev:
	npm run dev

# Проверка линтером
lint:
	npm run lint

# Сборка проекта
build:
	npm run build

# Предпросмотр production-сборки
preview:
	npm run preview

# Быстрая проверка: линтер + сборка
check: lint build

# Сборка Docker-образа
docker-build:
	docker build -t homelab-diagramm .

# Запуск Docker-контейнера (порт 8080)
docker-run: docker-build
	docker run --rm -p 8080:80 homelab-diagramm

# Запуск через Docker Compose
docker-up:
	docker compose up --build

# Остановка Docker Compose
docker-down:
	docker compose down

help:
	@echo "Доступные команды:"
	@echo "  make install       - установить зависимости"
	@echo "  make dev           - запустить режим разработки"
	@echo "  make lint          - проверить код линтером"
	@echo "  make build         - собрать проект"
	@echo "  make preview       - запустить предпросмотр сборки"
	@echo "  make check         - выполнить lint и build"
	@echo "  make docker-build  - собрать Docker-образ"
	@echo "  make docker-run    - собрать и запустить контейнер (http://localhost:8080)"
	@echo "  make docker-up     - запустить через Docker Compose"
	@echo "  make docker-down   - остановить Docker Compose"
