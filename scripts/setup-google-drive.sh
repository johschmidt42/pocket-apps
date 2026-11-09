#!/usr/bin/env bash
# One-time setup for the pipeline "CD - Release" (upload to Google Drive).
#
# What it does:
#   1. Creates the rclone remote "pocket-apps" with the scope drive.file.
#      Your browser opens. Log in to Google and allow the access.
#   2. Creates the Drive folder "Pocket Apps". rclone can see only files that it created.
#   3. Stores the token as the GitHub secret GDRIVE_TOKEN.
#   4. Stores the folder ID as the GitHub variable GDRIVE_FOLDER_ID. This turns the pipeline on.
#
# Needs: rclone, gh (logged in), jq. Run it from the repository root: pnpm setup:google-drive
set -euo pipefail

REMOTE="pocket-apps"
FOLDER="${1:-Pocket Apps}"

for tool in rclone gh jq; do
  if ! command -v "$tool" >/dev/null; then
    echo "Missing tool: $tool. Install it with: brew install $tool" >&2
    exit 1
  fi
done

if rclone listremotes | grep -qx "${REMOTE}:"; then
  echo "rclone remote '${REMOTE}' exists. It is used again."
else
  echo "Step 1/4: Google login. Your browser opens. Allow the access."
  rclone config create "$REMOTE" drive scope=drive.file
fi

echo "Step 2/4: Create the Drive folder '${FOLDER}'."
rclone mkdir "${REMOTE}:${FOLDER}"
FOLDER_ID=$(rclone lsjson "${REMOTE}:" --dirs-only | jq -r --arg name "$FOLDER" '.[] | select(.Name == $name) | .ID')
if [ -z "$FOLDER_ID" ]; then
  echo "Could not find the folder ID of '${FOLDER}'." >&2
  exit 1
fi

echo "Step 3/4: Store the token as the GitHub secret GDRIVE_TOKEN."
rclone config dump | jq -r --arg remote "$REMOTE" '.[$remote].token' | gh secret set GDRIVE_TOKEN

echo "Step 4/4: Store the folder ID as the GitHub variable GDRIVE_FOLDER_ID."
gh variable set GDRIVE_FOLDER_ID --body "$FOLDER_ID"

echo
echo "Done. Folder: https://drive.google.com/drive/folders/${FOLDER_ID}"
echo "The next successful 'CI - E2E' run on main uploads the app files."
echo "To upload now: gh run rerun \$(gh run list --workflow 'CI - E2E' --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
