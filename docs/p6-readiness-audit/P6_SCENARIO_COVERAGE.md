# P6 Scenario Coverage Audit

Связанные документы:
- `../p4-user-story-mapping/P4_USER_STORY_MAPPING.md`
- `../p5-user-stories/P5_USER_STORIES.md`

Дата аудита: `2026-02-17`
Формат: статический аудит кода (backend + frontend + docker), без полного runtime smoke.

## 1. Executive Summary
- По `P5` из 9 пользовательских историй:
  - `6` реализованы;
  - `3` реализованы частично;
  - `0` не реализованы.
- Критический MVP-контур (`Calls + Dataflow + Packages + Source + Docker`) в коде присутствует.
- Основные недозакрытые зоны: равномерная обработка `error` по режимам и “настоящая” навигационная история в context trail.

## 2. P5 Coverage Matrix

| Story | Статус | Что подтверждено | Доказательства |
|---|---|---|---|
| US-01 Calls neighborhood | Реализовано | BFS call graph с direction/max_depth/max_nodes и UI-контролами | `internal/server/server.go:326`, `internal/server/server.go:340`, `frontend/src/components/controls/CallsControls.tsx:71` |
| US-02 Клик по узлу -> detail + source | Частично | Переход и открытие source есть, но ошибки source выводятся через общий error-screen | `frontend/src/hooks/useAppController.ts:399`, `frontend/src/hooks/useAppController.ts:210`, `frontend/src/App.tsx:74` |
| US-03 Dataflow forward/backward | Реализовано | Оба направления поддержаны, есть max_depth + UI-контролы | `internal/server/server.go:546`, `internal/server/server.go:556`, `frontend/src/components/controls/DataflowControls.tsx:19` |
| US-04 Package map + details | Реализовано | Граф пакетов из dashboard-таблиц + drill-down к функциям | `internal/server/server.go:149`, `frontend/src/hooks/useAppController.ts:249`, `internal/server/server.go:751` |
| US-05 Docker one-command run | Реализовано (по инфраструктуре) | `init -> app` pipeline, автогенерация БД, ожидание готовности | `docker-compose.yml:1`, `docker-compose.yml:26`, `scripts/init-cpg.sh:41`, `Dockerfile:24` |
| US-06 loading/empty/error во всех режимах | Частично | `loading/empty` есть, но `error` в основном глобальный, не системно помодовый | `frontend/src/components/graph/GraphCanvas.tsx:198`, `frontend/src/components/sidebar/DetailPanel.tsx:316`, `frontend/src/App.tsx:74` |
| US-07 Symbol search -> context jump | Реализовано | Поиск символов + переход в calls/dataflow контекст | `frontend/src/hooks/useSymbolSearch.ts:73`, `frontend/src/hooks/useAppController.ts:429` |
| US-08 Context trail (history + restore) | Частично | Trail и частичная кликабельность есть, полноценного history-stack нет | `frontend/src/components/layout/ContextTrail.tsx:77`, `frontend/src/components/layout/ContextTrail.tsx:160` |
| US-09 Subgraph limits | Реализовано | Backend clamp/валидация + UI-управление лимитами | `internal/server/server.go:340`, `internal/server/server.go:345`, `frontend/src/components/controls/CallsControls.tsx:93`, `frontend/src/components/controls/DataflowControls.tsx:26` |

## 3. P4 Backbone Coverage

| Backbone шаг (P4) | Покрытие | Комментарий |
|---|---|---|
| 1. Определить вопрос | Полное | Режимы `Calls/Dataflow/Packages` и вкладки доступны |
| 2. Найти входную сущность | Полное | Есть symbol search + старт из текущего контекста |
| 3. Построить фокусный подграф | Полное | Есть лимиты и управляемые подграфы |
| 4. Проверить код и связи | Полное | Переход в source + detail + xrefs |
| 5. Углубиться/сменить режим | Полное | Click-through и быстрые переключения режимов |
| 6. Зафиксировать вывод | Частично | Repeatable flow есть, но нет отдельного механизма фиксации/экспорта сессии |

## 4. Gap List (что не до конца закрыто)
1. **US-02/US-06:** перейти от глобального error-screen к локальным ошибкам в каждом режиме/панели.
2. **US-08:** добавить реальную историю шагов (stack) с явным восстановлением контекста.
3. **NFR верификация:** в коде есть лимиты и защита от перегрузки, но нет зафиксированных метрик p95 в автоматическом прогоне.

## 5. Readiness Verdict
- **Demo-readiness:** `High` (основные пользовательские сценарии реализованы и связаны end-to-end на уровне кода).
- **Production-readiness:** `Low/Medium` (по текущему scope это не цель, остаются UX/observability/validation gaps).

## 6. Рекомендованный короткий план доработки
1. Локализовать ошибки по режимам (`Calls`, `Dataflow`, `Workbench`, `Source`) без полного блокирования экрана.
2. Добавить mini-history для context trail (последние 10-20 шагов, click-to-restore).
3. Провести runtime smoke (`docker compose up`) и зафиксировать фактические latency метрики по 3 базовым сценариям.
