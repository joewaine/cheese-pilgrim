#!/usr/bin/env python3
"""Build and deploy Cheese Pilgrim to the existing Hetzner/Traefik host.

Usage: python3 scripts/deploy-hetzner.py inspect|build|dns|deploy|status
Only built public assets, nginx.conf and Dockerfile are uploaded.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tarfile
import tempfile
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SERVER = "178.105.125.95"
DOMAIN = "cheesepilgrim.joewaine.com"
REMOTE_ROOT = "/opt/cheese-pilgrim"
STATE = ROOT / "deploy/hetzner.json"
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", f"root@{SERVER}"]
COMPOSE = f"docker compose --env-file {REMOTE_ROOT}/image.env -f {REMOTE_ROOT}/compose.yaml"
TOKEN_PATH = Path(os.environ.get("FRACTAL_DNS_TOKEN_FILE", str(ROOT.parent / "render_migration/export/cloudflare-dns-token")))


def remote(command, data=None, capture=True, timeout=180):
    result = subprocess.run(SSH + [command], input=data, capture_output=capture, timeout=timeout)
    if result.returncode:
        if capture:
            print(result.stderr.decode(), file=sys.stderr)
        raise RuntimeError(f"SSH command failed (exit {result.returncode}).")
    return result.stdout.decode() if capture else ""


def cloudflare(method, path, body=None):
    request = Request("https://api.cloudflare.com/client/v4" + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + TOKEN_PATH.read_text().strip(), "Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=30) as response:
            value = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"Cloudflare returned HTTP {error.code}.") from None
    if not value.get("success"):
        raise RuntimeError("Cloudflare did not complete the DNS request.")
    return value["result"]


def dns_target():
    zones = cloudflare("GET", "/zones?name=joewaine.com")
    if len(zones) != 1 or zones[0]["status"] != "active":
        raise RuntimeError("Expected one active joewaine.com DNS zone.")
    path = f"/zones/{zones[0]['id']}/dns_records"
    records = cloudflare("GET", path + "?" + urlencode({"name": DOMAIN}))
    if records and (len(records) != 1 or records[0]["type"] != "A" or records[0]["content"] != SERVER or records[0].get("proxied")):
        raise RuntimeError(f"Existing DNS conflicts at {DOMAIN}; refusing to replace it.")
    return path, records


def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {"provider": "Hetzner", "server": SERVER, "domain": DOMAIN, "url": f"https://{DOMAIN}/"}


def save_state(value):
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(value, indent=2) + "\n")


def inspect():
    _, records = dns_target()
    print(f"DNS {DOMAIN}: {'already points to this server' if records else 'available'}")
    print(remote("hostname; docker network inspect coolify --format '{{.Name}}'; docker ps --filter name=cheese-pilgrim --format '{{.Names}} {{.Status}}'; df -h /opt"))
    inventory = remote("docker ps --format '{{json .}}'")
    (ROOT / "test-results").mkdir(exist_ok=True)
    (ROOT / "test-results/hetzner-before.json").write_text(json.dumps([json.loads(line) for line in inventory.splitlines() if line], indent=2) + "\n")


def build():
    if "Cheese Pilgrim" not in (ROOT / "dist/index.html").read_text():
        raise RuntimeError("Build the renamed app before deploying.")
    tag = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    release = f"{REMOTE_ROOT}/releases/{tag}"
    remote("docker pull nginxinc/nginx-unprivileged:stable-alpine", capture=False)
    digest = remote("docker image inspect nginxinc/nginx-unprivileged:stable-alpine --format '{{index .RepoDigests 0}}'").strip()
    if not digest.startswith("nginxinc/nginx-unprivileged@sha256:"):
        raise RuntimeError("Could not resolve the nginx image digest.")
    with tempfile.TemporaryDirectory(prefix="cheese-deploy-") as temporary:
        archive = Path(temporary) / "site.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for name in ["Dockerfile", "deploy/nginx.conf", "dist"]:
                tar.add(ROOT / name, arcname=name)
        remote(f"test ! -e {shlex.quote(release)} && install -d -m 755 {shlex.quote(release)}")
        with archive.open("rb") as source:
            subprocess.run(SSH + [f"tar -xzf - --no-same-owner -C {shlex.quote(release)}"], stdin=source, check=True, timeout=90)
        print(f"Uploaded {archive.stat().st_size:,} bytes of public assets to {release}.", flush=True)
    remote(f"docker build --build-arg NGINX_IMAGE={shlex.quote(digest)} -t cheese-pilgrim:{tag} {shlex.quote(release)}", capture=False)
    remote(f"docker run --rm --read-only --tmpfs /tmp:rw,size=16m,mode=1777 --entrypoint nginx cheese-pilgrim:{tag} -t", capture=False)
    value = state()
    value.update({"image": f"cheese-pilgrim:{tag}", "tag": tag, "release": release, "nginx_base": digest})
    save_state(value)


def dns():
    path, records = dns_target()
    if records:
        print(f"{DOMAIN} already points to {SERVER}.")
        return
    record = cloudflare("POST", path, {"type": "A", "name": DOMAIN, "content": SERVER, "ttl": 300, "proxied": False, "comment": "Cheese Pilgrim app on existing Hetzner fractal-1"})
    _, verified = dns_target()
    if not verified or verified[0]["id"] != record["id"]:
        raise RuntimeError("DNS write could not be verified.")
    value = state()
    value["dns_record_id"] = record["id"]
    save_state(value)
    print(f"Created and verified DNS: {DOMAIN} -> {SERVER}.")


def deploy():
    value = state()
    if not value.get("tag"):
        raise RuntimeError("Run the build step first.")
    remote(f"docker image inspect {shlex.quote(value['image'])} --format '{{{{.Id}}}}'")
    # Only this project's deployment files are written; preserve selectors for rollback.
    installer = '''import json,pathlib,sys
payload=json.load(sys.stdin)
root=pathlib.Path('/opt/cheese-pilgrim');root.mkdir(exist_ok=True)
for name in ('compose.yaml','image.env'):
 path=root/name
 if path.exists() and path.read_text()!=payload[name]:
  (root/('previous-'+name)).write_bytes(path.read_bytes())
 path.write_text(payload[name])
'''
    payload = {"compose.yaml": (ROOT / "deploy/compose.yaml").read_text(), "image.env": f"IMAGE_TAG={value['tag']}\n"}
    remote("python3 -c " + shlex.quote(installer), json.dumps(payload).encode())
    remote(COMPOSE + " config --quiet")
    remote(COMPOSE + " up -d --wait --wait-timeout 60", capture=False, timeout=90)
    value["deployed_at"] = datetime.now(timezone.utc).isoformat()
    value["container"] = "cheese-pilgrim-web"
    save_state(value)


def status():
    print(remote("docker ps --filter name=cheese-pilgrim-web --format '{{.Names}} {{.Image}} {{.Status}}'; docker exec cheese-pilgrim-web wget -qO- http://127.0.0.1:8080/healthz"))
    with urlopen(f"https://{DOMAIN}/", timeout=20) as response:
        content = response.read().decode()
        if response.status != 200 or "Cheese Pilgrim" not in content:
            raise RuntimeError("Public HTTPS verification did not return the expected app.")
        print(f"Verified HTTPS 200 and Cheese Pilgrim title at https://{DOMAIN}/")
    before_path = ROOT / "test-results/hetzner-before.json"
    if before_path.exists():
        before = {item["Names"]: item["ID"] for item in json.loads(before_path.read_text()) if item["Names"] != "cheese-pilgrim-web"}
        current = {item["Names"]: item["ID"] for item in map(json.loads, remote("docker ps --format '{{json .}}'").splitlines())}
        changed = [name for name, identity in before.items() if current.get(name) != identity]
        if changed:
            raise RuntimeError("Existing container inventory changed: " + ", ".join(changed))
        print(f"Verified {len(before)} existing containers retained their original IDs.")
    value = state()
    value["verified_at"] = datetime.now(timezone.utc).isoformat()
    save_state(value)


if __name__ == "__main__":
    commands = {"inspect": inspect, "build": build, "dns": dns, "deploy": deploy, "status": status}
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        raise SystemExit(__doc__)
    try:
        commands[sys.argv[1]]()
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error)) from None
