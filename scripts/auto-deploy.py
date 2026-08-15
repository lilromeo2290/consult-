#!/usr/bin/env python3
"""
Auto-deploy script for Rev_Mgnt_Sys
Reads config from PROJECT_CONTEXT.md or uses defaults below.
Usage: python3 scripts/auto-deploy.py
"""

import paramiko
import os
import sys
import time
import tarfile
import io
import subprocess
from pathlib import Path

# ── CONFIG ──────────────────────────────────────────────────────
VPS_HOST = "153.75.247.4"
VPS_PORT = 22
VPS_USER = "root"
SSH_KEY_PATH = "/home/z/.ssh/vps_deploy_key"

LOCAL_PROJECT = "/home/z/my-project/Rev_Mgnt_Sys"
VPS_DEPLOY_DIR = "/home/kpma-rms"
VPS_DB_DIR = "/home/kpma-rms-build-fresh/db"
VPS_DB_PATH = f"{VPS_DB_DIR}/custom.db"

DATABASE_URL = f"file:{VPS_DB_PATH}"

# Tar source paths (relative to .next/)
STANDALONE_SUBDIR = ".next/standalone/Rev_Mgnt_Sys"  # nested project structure!
STATIC_DIR = ".next/static"
PUBLIC_DIR = "public"

LOCAL_DB_BACKUP = os.path.join(LOCAL_PROJECT, "db", "custom.db")
# ────────────────────────────────────────────────────────────────


def log(msg):
    print(f"[DEPLOY] {msg}")


def load_ssh_key():
    for key_cls in [paramiko.RSAKey, paramiko.ECDSAKey, paramiko.Ed25519Key]:
        try:
            key = key_cls.from_private_key_file(SSH_KEY_PATH)
            log(f"Loaded {key_cls.__name__} from {SSH_KEY_PATH}")
            return key
        except paramiko.SSHException:
            continue
    raise RuntimeError(
        f"Cannot load SSH key from {SSH_KEY_PATH}. "
        "Regenerate with: python3 -c \"from cryptography.hazmat.primitives.asymmetric import rsa; from cryptography.hazmat.primitives import serialization; k=rsa.generate_private_key(65537,2048); open('{SSH_KEY_PATH}','wb').write(k.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption()))\""
    )


def connect_ssh(key):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, pkey=key, timeout=15)
    log(f"Connected to {VPS_HOST}:{VPS_PORT}")
    return client


def run_cmd(client, cmd, check=True):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    if check and exit_code != 0:
        log(f"Command failed (exit {exit_code}): {cmd}")
        log(f"STDERR: {err}")
        raise RuntimeError(f"Remote command failed: {err}")
    return out, err, exit_code


def build_local():
    log("Building locally...")
    env = os.environ.copy()
    env["DATABASE_URL"] = DATABASE_URL
    result = subprocess.run(
        ["npx", "next", "build"],
        cwd=LOCAL_PROJECT,
        capture_output=True,
        text=True,
        timeout=300,
        env=env,
    )
    if result.returncode != 0:
        log(f"Build failed: {result.stderr[-500:]}")
        raise RuntimeError("Local build failed")
    log("Build successful")


def create_tars():
    standalone_src = os.path.join(LOCAL_PROJECT, STANDALONE_SUBDIR)
    static_src = os.path.join(LOCAL_PROJECT, STATIC_DIR)
    public_src = os.path.join(LOCAL_PROJECT, PUBLIC_DIR)

    for path in [standalone_src, static_src, public_src]:
        if not os.path.isdir(path):
            raise FileNotFoundError(f"Missing: {path}")

    tars = {}
    for name, src in [
        ("standalone", standalone_src),
        ("static", static_src),
        ("public", public_src),
    ]:
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for item in os.listdir(src):
                tar.add(os.path.join(src, item), arcname=item)
        tars[name] = buf.getvalue()
        log(f"Created {name}.tar.gz ({len(tars[name])} bytes)")

    return tars


def upload_and_deploy(client, tars):
    sftp = client.open_sftp()

    try:
        # Upload tars to /tmp/
        for name, data in tars.items():
            remote_path = f"/tmp/{name}.tar.gz"
            log(f"Uploading {name}.tar.gz...")
            with sftp.open(remote_path, "wb") as f:
                f.write(data)
            log(f"Uploaded {name}.tar.gz ({len(data)} bytes)")

        # Deploy on VPS
        log("Deploying on VPS...")

        # Clear old deploy
        run_cmd(client, f"rm -rf {VPS_DEPLOY_DIR}/*")

        # Extract standalone
        run_cmd(client, f"cd {VPS_DEPLOY_DIR} && tar xzf /tmp/standalone.tar.gz")

        # Extract static
        run_cmd(client, f"mkdir -p {VPS_DEPLOY_DIR}/.next/static")
        run_cmd(client, f"cd {VPS_DEPLOY_DIR}/.next/static && tar xzf /tmp/static.tar.gz")

        # Extract public
        run_cmd(client, f"cd {VPS_DEPLOY_DIR} && tar xzf /tmp/public.tar.gz")

        # ALWAYS fix .env
        run_cmd(client, f'echo "{DATABASE_URL}" > {VPS_DEPLOY_DIR}/.env')
        log(f"Set DATABASE_URL in {VPS_DEPLOY_DIR}/.env")

        # Ensure DB directory exists
        run_cmd(client, f"mkdir -p {VPS_DB_DIR}")

        # Restart PM2
        run_cmd(client, "pm2 restart all", check=False)
        time.sleep(3)

        # Verify
        out, _, code = run_cmd(client, "pm2 status", check=False)
        log(f"PM2 status:\n{out}")

        # Cleanup
        for name in tars:
            run_cmd(client, f"rm -f /tmp/{name}.tar.gz", check=False)

        log("Deploy complete!")

    finally:
        sftp.close()


def backup_db(client):
    """Download database backup to local."""
    log("Backing up database...")
    sftp = client.open_sftp()
    try:
        os.makedirs(os.path.dirname(LOCAL_DB_BACKUP), exist_ok=True)
        sftp.get(VPS_DB_PATH, LOCAL_DB_BACKUP)
        log(f"Database backed up to {LOCAL_DB_BACKUP}")
    except FileNotFoundError:
        log(f"WARNING: Database not found at {VPS_DB_PATH}")
    except Exception as e:
        log(f"WARNING: DB backup failed: {e}")
    finally:
        sftp.close()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--backup-only":
        key = load_ssh_key()
        client = connect_ssh(key)
        backup_db(client)
        client.close()
        return

    if len(sys.argv) > 1 and sys.argv[1] == "--skip-build":
        log("Skipping build (--skip-build)")
    else:
        build_local()

    tars = create_tars()
    key = load_ssh_key()
    client = connect_ssh(key)

    try:
        backup_db(client)
        upload_and_deploy(client, tars)
    finally:
        client.close()


if __name__ == "__main__":
    main()
