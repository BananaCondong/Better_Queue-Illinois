#!/usr/bin/env python3
"""
Push table presence (and optional camera snapshot) from a Raspberry Pi to
Firebase Realtime Database. Uses the Firebase Admin SDK with a service account.

Setup:
  1. In Firebase Console: Project settings → Service accounts → Generate new private key.
  2. Save the JSON on the Pi (e.g. /home/pi/secrets/serviceAccount.json) — never commit it.
  3. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  4. Enable Realtime Database and (optional) Cloud Storage; grant the service account
     "Firebase Admin SDK Administrator Service Agent" (default) and Storage Object Admin
     if uploading images.

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  python3 upload_table_presence.py --table 5 --presence present
  python3 upload_table_presence.py --table 5 --presence present --image /tmp/frame.jpg
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import timedelta

import firebase_admin
from firebase_admin import credentials, db, storage

DEFAULT_DATABASE_URL = "https://officehourqueue-29dea-default-rtdb.firebaseio.com"
DEFAULT_STORAGE_BUCKET = "officehourqueue-29dea.firebasestorage.app"


def init_firebase() -> None:
    if firebase_admin._apps:
        return
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not path or not os.path.isfile(path):
        print(
            "Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.",
            file=sys.stderr,
        )
        sys.exit(1)
    cred = credentials.Certificate(path)
    database_url = os.environ.get("FIREBASE_DATABASE_URL", DEFAULT_DATABASE_URL)
    bucket = os.environ.get("FIREBASE_STORAGE_BUCKET", DEFAULT_STORAGE_BUCKET)
    firebase_admin.initialize_app(
        cred,
        {"databaseURL": database_url, "storageBucket": bucket},
    )


def upload_image(table_id: str, image_path: str) -> str:
    bucket = storage.bucket()
    blob = bucket.blob(f"table_snapshots/{table_id}/latest.jpg")
    blob.upload_from_filename(image_path, content_type="image/jpeg")
    return blob.generate_signed_url(expiration=timedelta(days=7), method="GET")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update table presence in Firebase RTDB.")
    parser.add_argument("--table", required=True, help="Table id (must match queue entries, e.g. 5)")
    parser.add_argument(
        "--presence",
        choices=("present", "away"),
        required=True,
        help="Whether someone is at the table",
    )
    parser.add_argument(
        "--image",
        help="Optional JPEG path to upload to Firebase Storage; URL is stored in RTDB",
    )
    args = parser.parse_args()

    init_firebase()

    table_id = str(args.table).strip()
    payload: dict = {
        "presence": args.presence,
        "updatedAt": db.ServerValue.TIMESTAMP,
    }

    if args.image:
        if not os.path.isfile(args.image):
            print(f"Image not found: {args.image}", file=sys.stderr)
            sys.exit(1)
        payload["imageUrl"] = upload_image(table_id, args.image)

    db.reference(f"tables/{table_id}").set(payload)
    print(f"tables/{table_id} → {payload.get('presence')} (updated)")


if __name__ == "__main__":
    main()
