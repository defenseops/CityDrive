# CityDrive — Веб-сервис каршеринга

Учебный дипломный проект. Полнофункциональная платформа каршеринга с клиентским приложением, административной панелью и водительским интерфейсом.

## Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Node.js, Express.js |
| База данных | PostgreSQL 16 + PostGIS |
| Авторизация | JWT Bearer токены |
| Миграции | node-pg-migrate |
| Файлы | Multer → `uploads/documents/` |
| Контейнеры | Docker, Docker Compose |

---

## Быстрый старт (Docker)

```bash
# Клонировать репозиторий
git clone <repo-url>
cd sqlCityuDrive

# Поднять все сервисы одной командой
docker compose up --build
```

После запуска:
- **Клиентское приложение** — http://localhost:3000
- **API бэкенда** — http://localhost:3001/api
- **PostgreSQL** — localhost:5432

> При первом запуске бэкенд автоматически применяет все миграции (создаёт схему БД). Данные PostgreSQL и загруженные файлы сохраняются в именованных Docker volumes между перезапусками.

### Запуск без Docker (локальная разработка)

Требования: Node.js 20+, PostgreSQL (порт 5431, база `avtorend`).

```bash
# Backend
cd backend
cp .env.example .env   # заполнить переменные
npm install
npm run migrate        # применить миграции
npm run dev            # nodemon, порт 3001

# Frontend (в отдельном терминале)
cd frontend
npm install
npm run dev            # порт 3000
```

### Переменные окружения бэкенда (`.env`)

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5431
DB_NAME=avtorend
DB_USER=postgres
DB_PASSWORD=1234
JWT_SECRET=carsharing_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads
```

---

## Структура проекта

```
sqlCityuDrive/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # Подключение к PostgreSQL (pg.Pool)
│   │   │   └── upload.js      # Multer: max 10MB, jpg/png/pdf
│   │   ├── middleware/
│   │   │   ├── auth.js        # Верификация JWT
│   │   │   └── roles.js       # requireRole / requireEmployee / requireClient
│   │   └── routes/
│   │       ├── auth.js        # Регистрация, логин, /me
│   │       ├── users.js       # Документы, баланс, пополнение, уведомления
│   │       ├── cars.js        # Автопарк, повреждения
│   │       ├── bookings.js    # Бронирования
│   │       ├── fines.js       # Штрафы
│   │       ├── tariffs.js     # Тарифы
│   │       ├── employees.js   # Управление сотрудниками
│   │       ├── driver.js      # Задачи водителя (доставки)
│   │       └── admin.js       # Дашборд, аудит, отчёты
│   ├── migrations/
│   │   └── 1745000000000_initial_schema.js
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (client)       # Клиентские страницы
│   │   │   │   ├── cars/      # Каталог + детальная страница авто
│   │   │   │   ├── bookings/  # Мои бронирования
│   │   │   │   ├── fines/     # Мои штрафы
│   │   │   │   ├── receipts/  # Фискальные чеки
│   │   │   │   └── profile/   # Профиль, баланс, уведомления
│   │   │   ├── admin/         # Панель сотрудника
│   │   │   │   ├── dashboard/ # Дашборд со статистикой
│   │   │   │   ├── users/     # Управление клиентами
│   │   │   │   ├── verification/ # Верификация документов
│   │   │   │   ├── cars/      # Автопарк
│   │   │   │   ├── bookings/  # Все бронирования
│   │   │   │   ├── fines/     # Все штрафы
│   │   │   │   ├── employees/ # Сотрудники
│   │   │   │   ├── tariffs/   # Тарифы (CRUD)
│   │   │   │   ├── receipts/  # Фискальные чеки
│   │   │   │   ├── driver/    # Задачи на доставку
│   │   │   │   └── audit/     # Журнал аудита
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── components/
│   │   │   └── UserHeader.js  # Шапка с уведомлениями (колокольчик)
│   │   └── lib/
│   │       └── api.js         # API-клиент (все эндпоинты)
│   └── Dockerfile
└── docker-compose.yml
```

---

## Схема базы данных

20 таблиц. Ключевые сущности:

| Таблица | Описание |
|---------|---------|
| `users` | Клиенты: телефон, ВУ, верификация, рейтинг |
| `employees` | Сотрудники: admin, manager, moderator, driver, parking_manager |
| `cars` | Автопарк: класс, топливо, статус, координаты (PostGIS) |
| `parking_lots` | Парковки |
| `tariffs` | Тарифы: цена/мин, цена/км, депозит, штрафы |
| `bookings` | Бронирования с доставкой и самовывозом |
| `transactions` | Финансовые операции (hold/capture/refund/charge/void) |
| `fines` | Штрафы с фото-доказательствами |
| `user_documents` | Документы для верификации |
| `car_damages` | Повреждения автомобилей |
| `audit_log` | Журнал всех изменений (триггеры) |
| `delivery_assignments` | Задачи водителей на доставку/возврат |

---

## Роли и доступы

### Клиенты
- Регистрация по телефону + данные ВУ
- Верификация через загрузку документов
- Бронирование авто (только верифицированные)
- Пополнение баланса, история транзакций
- Просмотр штрафов и фискальных чеков
- In-app уведомления об изменениях броней и транзакций

### Сотрудники

| Роль | Доступ |
|------|--------|
| `admin` | Полный доступ ко всем разделам |
| `manager` | Автопарк, бронирования, штрафы, тарифы, чеки, доставки |
| `moderator` | Верификация клиентов, штрафы, список клиентов |
| `driver` | Задачи на доставку и возврат авто |
| `parking_manager` | Автопарк, парковки, бронирования |

---

## API эндпоинты

### Авторизация
```
POST /api/auth/register          # Регистрация клиента
POST /api/auth/login             # Вход клиента
POST /api/auth/employee/login    # Вход сотрудника
GET  /api/auth/me                # Текущий пользователь
```

### Клиентские
```
GET  /api/cars                   # Каталог авто (фильтры: status, car_class)
GET  /api/cars/:id               # Детальная страница авто + повреждения
POST /api/bookings               # Создать бронирование
GET  /api/bookings/my            # Мои бронирования
POST /api/bookings/:id/cancel    # Отменить бронирование
GET  /api/fines/my               # Мои штрафы
GET  /api/users/me/balance       # Баланс
POST /api/users/me/topup         # Пополнить баланс (макс. 100 000 ₽)
GET  /api/users/me/notifications # Уведомления из audit_log
GET  /api/users/me/documents     # Мои документы
POST /api/users/me/documents     # Загрузить документ
GET  /api/tariffs                # Список тарифов
```

### Административные
```
GET    /api/users                        # Список клиентов (поиск, фильтр)
GET    /api/users/pending-verification   # На верификации
POST   /api/users/:id/verify             # Верифицировать / отклонить
GET    /api/admin/stats                  # Статистика дашборда
GET    /api/admin/audit                  # Журнал аудита
GET    /api/employees                    # Список сотрудников
POST   /api/employees                    # Создать сотрудника
PUT    /api/employees/:id                # Обновить сотрудника
DELETE /api/employees/:id               # Удалить сотрудника
GET    /api/bookings                     # Все бронирования
GET    /api/fines                        # Все штрафы
POST   /api/tariffs                      # Создать тариф
PUT    /api/tariffs/:id                  # Обновить тариф
DELETE /api/tariffs/:id                 # Удалить тариф
```

---

## Основные флоу

### Регистрация и верификация клиента
1. Клиент регистрируется (телефон, ФИО, данные ВУ)
2. Загружает фото паспорта и ВУ
3. Модератор/Админ просматривает документы в разделе «Верификация»
4. При подтверждении — `verification_status = 'verified'`, `can_book = true`
5. Клиент может бронировать автомобили

### Бронирование авто
1. Клиент выбирает авто из каталога, переходит на детальную страницу
2. Выбирает тариф, опции доставки/самовывоза
3. Создаётся бронирование — при наличии хранимой процедуры `create_booking()` вызывается она, иначе прямой INSERT
4. Авто получает статус `booked`

### Финансовый баланс
- Пополнение: транзакция `type='refund'`, `status='success'`
- Списание: транзакции `type='charge'` или `type='hold'`
- Баланс = сумма `refund` − сумма `charge`/`hold`

---

## Docker-сборка с кастомным API URL

По умолчанию фронтенд обращается к `http://localhost:3001/api`. Для деплоя на сервер:

```bash
docker compose build \
  --build-arg NEXT_PUBLIC_API_URL=http://your-server-ip:3001/api
```

> `NEXT_PUBLIC_API_URL` встраивается в бандл Next.js при сборке (build-time), поэтому его нельзя изменить через переменную окружения в runtime — только через `--build-arg`.
