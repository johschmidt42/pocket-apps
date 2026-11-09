#!/usr/bin/env bash
# One-time setup for the pipeline "CD - Release" (upload to Google Drive).
# You can run it again at any time. It keeps the folder that the pipeline uses.
#
# What it does:
#   1. Asks for the OAuth client ID and secret of your own Google Cloud project.
#      (rclone's shared client ID stops working in 2026.)
#   2. Creates or updates the rclone remote "pocket-apps" with the scope drive.file.
#      If a login is necessary, your browser opens. Log in to Google and allow the access.
#   3. Uses the folder in GDRIVE_FOLDER_ID if it is set and the same OAuth client created it.
#      Else it creates the folder "Pocket Apps". rclone can see only what its OAuth client created.
#   4. Stores token, client ID and client secret as GitHub secrets.
#   5. Stores the folder ID as the GitHub variable GDRIVE_FOLDER_ID. This turns the pipeline on.
#
# Needs: rclone, jq, gh (logged in, admin rights on the repository).
# Run it from the repository root: pnpm setup:google-drive ["Folder name"]
# Optional: set GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET in the environment. Else the script asks.
set -euo pipefail

REMOTE="pocket-apps"
FOLDER_NAME="${1:-Pocket Apps}"

fail() {
  echo "Error: $*" >&2
  exit 1
}

remote_value() {
  rclone config dump | jq -r --arg remote "$REMOTE" --arg key "$1" '.[$remote][$key] // empty'
}

for tool in rclone gh jq; do
  command -v "$tool" >/dev/null || fail "Missing tool: $tool. Install it with: brew install $tool"
done

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner) || fail "gh cannot find the GitHub repository. Run this script in the repository folder."
echo "GitHub repository: ${REPO}"

# Step 1: the OAuth client of your own Google Cloud project.
HAS_REMOTE=false
rclone listremotes | grep -qx "${REMOTE}:" && HAS_REMOTE=true
CURRENT_CLIENT_ID=""
if $HAS_REMOTE; then CURRENT_CLIENT_ID=$(remote_value client_id); fi

CLIENT_ID="${GDRIVE_CLIENT_ID:-}"
CLIENT_SECRET="${GDRIVE_CLIENT_SECRET:-}"
if [ -z "$CLIENT_ID" ] && [ -n "$CURRENT_CLIENT_ID" ]; then
  CLIENT_ID="$CURRENT_CLIENT_ID"
  CLIENT_SECRET=$(remote_value client_secret)
fi
if [ -z "$CLIENT_ID" ]; then
  echo "Step 1/5: Enter the OAuth client of your Google Cloud project (type: Desktop app)."
  read -r -p "  Client ID: " CLIENT_ID
  read -r -s -p "  Client secret (not shown): " CLIENT_SECRET
  echo
fi
[ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ] || fail "Client ID and client secret are necessary."

# Step 2: rclone remote with a working token of this client.
CLIENT_CHANGED=false
if ! $HAS_REMOTE; then
  echo "Step 2/5: Google login. Your browser opens. Log in with the Google account that must own the folder."
  rclone config create "$REMOTE" drive scope=drive.file client_id="$CLIENT_ID" client_secret="$CLIENT_SECRET" >/dev/null
  CLIENT_CHANGED=true
elif [ "$CLIENT_ID" != "$CURRENT_CLIENT_ID" ]; then
  echo "Step 2/5: Switch the rclone remote to your OAuth client. Your browser opens for a new login."
  rclone config update "$REMOTE" client_id="$CLIENT_ID" client_secret="$CLIENT_SECRET" config_refresh_token=false >/dev/null
  rclone config reconnect "${REMOTE}:"
  CLIENT_CHANGED=true
else
  echo "Step 2/5: Check the rclone remote '${REMOTE}'."
  if ! rclone lsjson "${REMOTE}:" --dirs-only --max-depth 1 >/dev/null 2>&1; then
    echo "The token does not work (for example, the access was removed). Your browser opens for a new login."
    rclone config reconnect "${REMOTE}:"
  fi
fi

# The token must have the scope drive.file. A wider scope gives access to the whole Drive.
SCOPE=$(remote_value scope)
[ "$SCOPE" = "drive.file" ] || fail "The rclone remote '${REMOTE}' has the scope '${SCOPE}', not 'drive.file'. Run: rclone config delete ${REMOTE}. Then run this script again."

# Step 3: the folder. Keep the folder that the pipeline already uses, if this client created it.
FOLDER_ID=$(gh variable get GDRIVE_FOLDER_ID --repo "$REPO" 2>/dev/null || true)
if [ -n "$FOLDER_ID" ] && $CLIENT_CHANGED; then
  echo "Step 3/5: The OAuth client changed. It cannot see the old folder ${FOLDER_ID}."
  echo "          You can delete the old folder in Google Drive."
  FOLDER_ID=""
fi
if [ -n "$FOLDER_ID" ]; then
  echo "Step 3/5: Use the existing folder ${FOLDER_ID} (variable GDRIVE_FOLDER_ID)."
  rclone lsjson "${REMOTE}:" --drive-root-folder-id "$FOLDER_ID" --max-depth 1 >/dev/null 2>&1 ||
    fail "rclone cannot open the folder ${FOLDER_ID}. Delete the variable GDRIVE_FOLDER_ID to create a new folder: gh variable delete GDRIVE_FOLDER_ID"
else
  echo "Step 3/5: Create the Drive folder '${FOLDER_NAME}'."
  rclone mkdir "${REMOTE}:${FOLDER_NAME}"
  FOLDER_ID=$(rclone lsjson "${REMOTE}:" --dirs-only | jq -r --arg name "$FOLDER_NAME" '.[] | select(.Name == $name) | .ID')
  [ -n "$FOLDER_ID" ] || fail "Could not find the folder ID of '${FOLDER_NAME}'."
  [ "$(echo "$FOLDER_ID" | wc -l)" -eq 1 ] || fail "There are several folders with the name '${FOLDER_NAME}'. Rename or delete the extra folders."
fi

# Step 4: token and client. They go from rclone directly to GitHub. They are not printed.
echo "Step 4/5: Store GDRIVE_TOKEN, GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET as GitHub secrets."
TOKEN=$(remote_value token)
[ -n "$TOKEN" ] || fail "The rclone remote '${REMOTE}' has no token. Run: rclone config delete ${REMOTE}. Then run this script again."
printf '%s' "$TOKEN" | gh secret set GDRIVE_TOKEN --repo "$REPO"
printf '%s' "$CLIENT_ID" | gh secret set GDRIVE_CLIENT_ID --repo "$REPO"
printf '%s' "$CLIENT_SECRET" | gh secret set GDRIVE_CLIENT_SECRET --repo "$REPO"
unset TOKEN CLIENT_SECRET

# Step 5: the folder ID. This turns the pipeline on.
echo "Step 5/5: Store the folder ID as the GitHub variable GDRIVE_FOLDER_ID."
gh variable set GDRIVE_FOLDER_ID --repo "$REPO" --body "$FOLDER_ID"

echo
echo "Done. Folder: https://drive.google.com/drive/folders/${FOLDER_ID}"
echo "The next successful 'CI - E2E' run on main uploads the app files."
echo "Upload now:  gh run rerun \$(gh run list --repo ${REPO} --workflow 'CI - E2E' --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
echo "Check:       gh run list --repo ${REPO} --workflow 'CD - Release' --limit 3"
