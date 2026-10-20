#!/usr/bin/env bash
# Curate the pristine --routes-only captures into the tour-ordered previews/ sets.
# Run from the repo root after both `--shots .shots/.shots-dark` passes finish.
set -euo pipefail

cd "$(dirname "$0")/.."

LIGHT=".shots"
DARK=".shots-dark"

# target-stem : source-shot-stem  (base screens, tour order 00–21)
PAGES=(
  "00-home:root"
  "01-dashboard:dashboard"
  "02-analytics:analytics"
  "03-health:health"
  "04-moderation:moderation"
  "05-communities:communities"
  "06-community-detail:communities-c-design-circle"
  "07-members:members"
  "08-member-detail:members-m-paul"
  "09-events:events"
  "10-event-detail:events-e-01"
  "11-tasks:tasks"
  "12-content:content"
  "13-content-detail:content-p-01"
  "14-collections:collections"
  "15-collection-detail:collections-col-01"
  "16-messages:messages"
  "17-message-thread:messages-conv-01"
  "18-notifications:notifications"
  "19-settings-overview:settings"
  "20-settings-appearance:settings-appearance"
  "21-signup:signup"
)

# alternate states, 22–33 (two new: health at-risk, moderation drawer)
VIEWS=(
  "22-analytics-range-90d:analytics-range-90d"
  "23-communities-table-view:communities-view-table"
  "24-health-at-risk:health-risk-at-risk"
  "25-moderation-drawer:moderation-report-r-01"
  "26-events-agenda-view:events-view-agenda"
  "27-events-new-event-dialog:events-new-1"
  "28-members-invited-grid-view:members-status-invited-view-grid"
  "29-tasks-list-view:tasks-view-list"
  "30-tasks-overdue-filter:tasks-filter-overdue"
  "31-content-table-draft-view:content-view-table-status-draft"
  "32-notifications-unread-tab:notifications-tab-unread"
  "33-collections-search:collections-q-design"
)

copy() { # dest_dir source_dir stem target
  local dest="$1" srcdir="$2" stem="$3" target="$4"
  local src="$srcdir/$stem.png"
  if [[ ! -f "$src" ]]; then
    echo "MISSING $src" >&2
    exit 1
  fi
  cp "$src" "$dest/$target.png"
}

rm -f previews/.DS_Store previews/*/.DS_Store 2>/dev/null || true

for dir in desktop mobile dark dark-mobile views; do
  mkdir -p "previews/$dir"
  rm -f "previews/$dir"/*.png
done

for pair in "${PAGES[@]}"; do
  target="${pair%%:*}"; stem="${pair##*:}"
  copy previews/desktop  "$LIGHT/desktop" "$stem" "$target"
  copy previews/mobile   "$LIGHT/mobile"  "$stem" "$target"
  copy previews/dark     "$DARK/desktop"  "$stem" "$target"
  copy previews/dark-mobile "$DARK/mobile" "$stem" "$target"
done

for pair in "${VIEWS[@]}"; do
  target="${pair%%:*}"; stem="${pair##*:}"
  copy previews/views "$LIGHT/desktop" "$stem" "$target"
done

echo "desktop      $(ls previews/desktop | wc -l | tr -d ' ')"
echo "mobile       $(ls previews/mobile | wc -l | tr -d ' ')"
echo "dark         $(ls previews/dark | wc -l | tr -d ' ')"
echo "dark-mobile  $(ls previews/dark-mobile | wc -l | tr -d ' ')"
echo "views        $(ls previews/views | wc -l | tr -d ' ')"
echo "total        $(find previews -type f | wc -l | tr -d ' ')"
