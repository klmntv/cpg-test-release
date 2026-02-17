# P3 Scope Plan (timebox + приоритизация)

Связанные документы:
- `../p1-discovery/P1_DISCOVERY.md`
- `../p2-one-pager-prd/P2_ONE_PAGER_PRD.md`

## 1. Цель этапа
Зафиксировать реалистичный MVP-скоуп на 24 часа и определить, что точно войдет в демо, а что будет отрезано при рисках по времени.

## 2. Timebox и рамки
- Общий timebox: `24 часа`
- Формат: `вертикальные срезы`, которые можно показать end-to-end
- Ограничение: только сценарии, дающие прямую пользу инженеру при исследовании кода

## 3. MoSCoW (финальный скоуп P3)
## Must (обязательно в релиз)
1. Центральный graph canvas (основной экран приложения).
2. Call graph exploration (BFS neighborhood, 10-60 узлов по умолчанию).
3. Dataflow slice (forward/backward) с ограничением глубины/размера.
4. Package dependency map (по dashboard queries).
5. Переход из узла графа в source panel.
6. Полностью рабочий запуск через `docker compose up`.

## Should (делаем при наличии времени)
1. Поиск символов с быстрым переходом в граф.
2. Context trail (история навигации в рамках сессии).
3. Улучшенные empty/error/loading состояния.

## Could (опционально)
1. Пресеты запросов/фильтров.
2. Горячие клавиши навигации.
3. Базовая in-app подсказка по режимам.

## Won't (не делаем в P3)
1. Полный рендер всего CPG без лимитов.
2. Multi-user, auth, RBAC, SSO.
3. Production hardening (HA, enterprise security policy).

## 4. Скоуп в формате эпиков и задач
## Epic A: Graph-first UI
1. Каркас экрана: canvas в центре, боковые панели контекста.
2. Базовые интеракции: zoom/pan/select/focus.
3. Унификация модели узлов/ребер для всех режимов.

## Epic B: Аналитические сценарии
1. Calls: старт от функции, расширение соседства.
2. Dataflow: выбор переменной, forward/backward path.
3. Packages: граф зависимостей пакетов + drill-down.

## Epic C: Кодовый контекст
1. Source panel: открытие файла и подсветка линий.
2. Связка node -> source location.
3. Стабильное поведение на missing source.

## Epic D: Поставка и проверка
1. `docker-compose.yml` и init/app pipeline.
2. README quick start + troubleshooting.
3. Smoke сценарии на полном наборе данных.

## 5. Backlog (приоритет + оценка)
| ID | Задача | Priority | Оценка |
|---|---|---|---|
| B1 | Graph canvas + базовая навигация | P0 | 3h |
| B2 | Calls API + UI режим | P0 | 4h |
| B3 | Dataflow API + UI режим | P0 | 4h |
| B4 | Packages API + UI режим | P0 | 3h |
| B5 | Node-to-source переход | P0 | 2h |
| B6 | Docker compose e2e запуск | P0 | 2h |
| B7 | Loading/empty/error states | P1 | 2h |
| B8 | Symbol search | P1 | 2h |
| B9 | README + demo script | P0 | 1.5h |
| B10 | Buffer на багфиксы | P0 | 0.5h |

Плановая сумма: `24h`

## 6. Cut Line (что режется первым при риске срыва срока)
1. Сначала режется `Could`.
2. Затем режется часть `Should` (в первую очередь symbol search).
3. `Must` не режется; при проблемах упрощается UX, но не сценарии.

## 7. Definition of Done для P3
1. Все `Must` user flows проходят end-to-end.
2. Для каждого `Must` есть acceptance check (ручной smoke).
3. Приложение поднимается одной командой `docker compose up`.
4. Ошибки и пустые ответы отображаются контролируемо и не ломают UI.

## 8. Контрольные точки на 24 часа
1. `T+6h`: готов каркас UI и Calls базово работает.
2. `T+12h`: Dataflow и Packages работают end-to-end.
3. `T+18h`: Source drill-down + стабилизация состояний.
4. `T+24h`: Docker smoke, README, финальный demo-flow.
