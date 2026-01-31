#!/bin/bash
# Opens Chrome with a URL, reusing existing tab if host matches
# Usage: ./open-chrome.sh <url> [profile-directory]
# Example: ./open-chrome.sh "http://localhost:3010" "Profile 9"

URL="${1:-about:blank}"
PROFILE="${2:-Profile 9}"

# Extract host from URL (e.g., "http://localhost:3010" from "http://localhost:3010/page")
HOST=$(echo "$URL" | sed -E 's|(https?://[^/]+).*|\1|')

# Get the position of the frontmost window (the terminal calling this script)
WINDOW_POS=$(osascript -e 'tell application "System Events" to get the position of window 1 of (first process whose frontmost is true)' 2>/dev/null)

if [[ -z "$WINDOW_POS" ]]; then
  echo "Error: Could not get window position. Check accessibility permissions." >&2
  exit 1
fi

# Parse x, y coordinates
WINDOW_X=$(echo "$WINDOW_POS" | cut -d',' -f1 | tr -d ' ')
WINDOW_Y=$(echo "$WINDOW_POS" | cut -d',' -f2 | tr -d ' ')

# Get screen bounds for the screen containing this window
SCREEN_BOUNDS=$(osascript -e "
tell application \"Finder\"
  set allBounds to bounds of window of desktop
  return allBounds
end tell
" 2>/dev/null)

# Parse screen bounds (x1, y1, x2, y2)
SCREEN_X1=$(echo "$SCREEN_BOUNDS" | cut -d',' -f1 | tr -d ' ')
SCREEN_Y1=$(echo "$SCREEN_BOUNDS" | cut -d',' -f2 | tr -d ' ')
SCREEN_X2=$(echo "$SCREEN_BOUNDS" | cut -d',' -f3 | tr -d ' ')
SCREEN_Y2=$(echo "$SCREEN_BOUNDS" | cut -d',' -f4 | tr -d ' ')

# Determine which screen the window is on and set bounds
if [[ $WINDOW_X -lt 0 ]]; then
  # Window is on left screen (negative X)
  X1=$SCREEN_X1
  X2=0
  Y1=0
  Y2=$SCREEN_Y2
else
  # Window is on main screen
  X1=0
  Y1=0
  X2=$SCREEN_X2
  Y2=$SCREEN_Y2
fi

# Try to find existing Chrome tab with matching host
FOUND_WINDOW=$(osascript <<EOF
tell application "Google Chrome"
  set targetHost to "$HOST"
  repeat with w in windows
    repeat with t in tabs of w
      set tabURL to URL of t
      if tabURL starts with targetHost then
        -- Found matching tab, return window index
        return index of w
      end if
    end repeat
  end repeat
  return 0
end tell
EOF
)

if [[ "$FOUND_WINDOW" != "0" && -n "$FOUND_WINDOW" ]]; then
  # Found existing window with matching host - move it to current screen and activate
  echo "Found existing Chrome window with $HOST, moving to current screen..."
  osascript <<EOF
tell application "Google Chrome"
  set targetHost to "$HOST"
  set windowCount to count of windows
  repeat with winIdx from 1 to windowCount
    set w to window winIdx
    set tabCount to count of tabs of w
    repeat with tabIdx from 1 to tabCount
      set t to tab tabIdx of w
      set tabURL to URL of t
      if tabURL starts with targetHost then
        -- Set this tab as active
        set active tab index of w to tabIdx
        -- Move window to current screen
        set bounds of w to {$X1, $Y1, $X2, $Y2}
        -- Bring to front
        set index of w to 1
        activate
        return
      end if
    end repeat
  end repeat
end tell
EOF
else
  # No existing tab found - open new window with profile
  echo "No existing tab found for $HOST, opening new window..."
  open -na "Google Chrome" --args --profile-directory="$PROFILE" --new-window "$URL"
  sleep 0.5
  osascript <<EOF
tell application "Google Chrome"
  set bounds of front window to {$X1, $Y1, $X2, $Y2}
end tell
EOF
fi
