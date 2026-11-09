#!/usr/bin/env bash
# One-time setup for the pipeline "CD - Release" (upload to Google Drive).
# You can run it again at any time. It keeps the folder that the pipeline uses.
#
# What it does:
#   1. Creates (or checks) the rclone remote "pocket-apps" with the scope drive.file.
#      If a login is necessary, your browser opens. Log in to Google and allow the access.
#   2. Uses the folder in GDRIVE_FOLDER_ID if it is set. Else it creates the folder "Pocket Apps".
#      rclone can see only files and folders that it created.
#   3. Stores the token as the GitHub secret GDRIVE_TOKEN.
#   4. Stores the folder ID as the GitHub variable GDRIVE_FOLDER_ID. This turns the pipeline on.
#
# Needs: rclone, jq, gh (logged in, admin rights on the repository).
# Run it from the repository root: pnpm setup:google-drive ["Folder name"]
set -euo pipefail

REMOTE="pocket-apps"
FOLDER="${1:-Pocket Apps}"

fail() {
  echo "Error: $*" >&2
  exit 1
}

for tool in rclone gh jq; do
  command -v "$tool" >/dev/null || fail "Missing tool: $tool. Install it with: brew install $tool"
done

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner) || fail "gh cannot find the GitHub repository. Run this script in the repository folder."
echo "GitHub repository: ${REPO}"

# Step 1: rclone remote with a working token.
if rclone listremotes | grep -qx "${REMOTE}:"; then
  echo "Step 1/4: Check the rclone remote '${REMOTE}'."
  if ! rclone lsjson "${REMOTE}:" --dirs-only --max-depth 1 >/dev/null 2>&1; then
    echo "The token does not work (for example, the access was removed). Your browser opens for a new login."
    rclone config reconnect "${REMOTE}:"
  fi
else
  echo "Step 1/4: Google login. Your browser opens. Log in with the Google account that owns the Drive."
  echo "          The consent screen shows 'rclone'. Allow the access."
  rclone config create "$REMOTE" drive scope=drive.file >/dev/null
fi

# Step 2: the folder. Keep the folder that the pipeline already uses.
FOLDER_ID=$(gh variable get GDRIVE_FOLDER_ID --repo "$REPO" 2>/dev/null || true)
if [ -n "$FOLDER_ID" ]; then
  echo "Step 2/4: Use the existing folder ${FOLDER_ID} (variable GDRIVE_FOLDER_ID)."
  rclone lsjson "${REMOTE}:" --drive-root-folder-id "$FOLDER_ID" --max-depth 1 >/dev/null 2>&1 ||
    fail "rclone cannot open the folder ${FOLDER_ID}. Delete the variable GDRIVE_FOLDER_ID to create a new folder: gh variable delete GDRIVE_FOLDER_ID"
else
  echo "Step 2/4: Create the Drive folder '${FOLDER}'."
  rclone mkdir "${REMOTE}:${FOLDER}"
  FOLDER_ID=$(rclone lsjson "${REMOTE}:" --dirs-only | jq -r --arg name "$FOLDER" '.[] | select(.Name == $name) | .ID')
  [ -n "$FOLDER_ID" ] || fail "Could not find the folder ID of '${FOLDER}'."
  [ "$(echo "$FOLDER_ID" | wc -l)" -eq 1 ] || fail "There are several folders with the name '${FOLDER}'. Rename or delete the extra folders."
fi

# Step 3: the token. It goes from rclone directly to GitHub. It is not printed.
echo "Step 3/4: Store the token as the GitHub secret GDRIVE_TOKEN."
TOKEN=$(rclone config dump | jq -r --arg remote "$REMOTE" '.[$remote].token // empty')
[ -n "$TOKEN" ] || fail "The rclone remote '${REMOTE}' has no token. Run: rclone config delete ${REMOTE}. Then run this script again."
printf '%s' "$TOKEN" | gh secret set GDRIVE_TOKEN --repo "$REPO"
unset TOKEN

# Step 4: the folder ID. This turns the pipeline on.
echo "Step 4/4: Store the folder ID as the GitHub variable GDRIVE_FOLDER_ID."
gh variable set GDRIVE_FOLDER_ID --repo "$REPO" --body "$FOLDER_ID"

echo
echo "Done. Folder: https://drive.google.com/drive/folders/${FOLDER_ID}"
echo "The next successful 'CI - E2E' run on main uploads the app files."
echo "Upload now:  gh run rerun \$(gh run list --repo ${REPO} --workflow 'CI - E2E' --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
echo "Check:       gh run list --repo ${REPO} --workflow 'CD - Release' --limit 3"
