#!/usr/bin/env python3
"""营销 Agent 离线演示版启动器，仅使用 Python 标准库。"""

from __future__ import annotations

import argparse
import io
import json
import mimetypes
import os
import re
import secrets
import subprocess
import threading
import webbrowser
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
CATALOG = json.loads((ASSETS / "release-catalog.json").read_text(encoding="utf-8"))
SKILL_SOURCES = json.loads((ASSETS / "skill-sources.json").read_text(encoding="utf-8"))
TOKEN = secrets.token_urlsafe(24)


class OfflineServer(ThreadingHTTPServer):
    allow_reuse_address = True


class Handler(SimpleHTTPRequestHandler):
    server_version = "MarketingAgentOffline/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, _format, *_args):
        return

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def json_response(self, value, status=200):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def bytes_response(self, payload, content_type, filename=None):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(payload)

    def trusted(self):
        host = self.headers.get("Host", "").split(":", 1)[0]
        return host in {"127.0.0.1", "localhost"}

    def do_GET(self):
        if not self.trusted():
            return self.json_response({"error": "仅允许本机访问"}, 403)

        parsed = urlsplit(self.path)
        query = parse_qs(parsed.query)
        if parsed.path == "/api/bootstrap":
            return self.json_response(
                {
                    "token": TOKEN,
                    "platforms": [],
                    "demo_steps": [],
                    "real_available": False,
                    "offline": True,
                }
            )
        if parsed.path == "/api/release/catalog":
            return self.json_response(CATALOG)
        if parsed.path == "/api/release/skill":
            skill_id = query.get("id", [""])[0]
            source = SKILL_SOURCES.get(skill_id)
            return self.json_response(source or {"error": "技能不存在"}, 200 if source else 404)
        if parsed.path == "/api/release/skill.zip":
            skill_id = query.get("id", [""])[0]
            source = SKILL_SOURCES.get(skill_id)
            if not source:
                return self.json_response({"error": "技能不存在"}, 404)
            output = io.BytesIO()
            with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
                for name, content in source.get("files", {}).items():
                    archive.writestr(f"{skill_id}/{name}", content)
            return self.bytes_response(output.getvalue(), "application/zip", f"{skill_id}.zip")
        if parsed.path == "/api/video-workflow/capabilities":
            return self.json_response(
                {
                    "available": False,
                    "mode": "offline",
                    "message": "离线演示版不执行真实视频生成，页面交互和示例内容仍可使用。",
                }
            )
        if parsed.path.startswith("/api/"):
            return self.json_response({"error": "此操作需要连接业务服务；离线演示版仅保留页面交互。"}, 503)

        if parsed.path in {"", "/"}:
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if not self.trusted() or self.headers.get("X-Local-Token") != TOKEN:
            return self.json_response({"error": "请刷新页面后重试"}, 403)

        parsed = urlsplit(self.path)
        size = int(self.headers.get("Content-Length", "0") or 0)
        if size > 8 * 1024 * 1024:
            return self.json_response({"error": "离线文件不能超过 8 MB"}, 413)
        raw = self.rfile.read(size)
        try:
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            body = {}

        if parsed.path == "/api/projects/create":
            name = str(body.get("name", "")).strip()
            if not name or len(name) > 64 or re.search(r'[\\/:*?"<>|\x00-\x1f]', name):
                return self.json_response({"error": "请使用 1–64 个字符的项目名称"}, 400)
            project_id = str(body.get("id", ""))
            folder = ROOT / "本地项目" / name
            folder.mkdir(parents=True, exist_ok=True)
            (folder / ".offline-project.json").write_text(
                json.dumps({"id": project_id, "name": name}, ensure_ascii=False), encoding="utf-8"
            )
            return self.json_response(
                {"id": project_id, "name": name, "folderName": name, "nameLocked": True}
            )
        if parsed.path == "/api/projects/open-folder":
            name = str(body.get("name", "")).strip()
            folder = (ROOT / "本地项目" / name).resolve()
            local_root = (ROOT / "本地项目").resolve()
            if local_root not in folder.parents or not folder.exists():
                return self.json_response({"error": "未找到离线项目文件夹"}, 404)
            if sys_platform() == "darwin":
                subprocess.Popen(["open", str(folder)])
            return self.json_response({"opened": True})
        return self.json_response({"error": "此操作需要连接业务服务；离线演示版仅保留页面交互。"}, 503)


def sys_platform():
    import sys

    return sys.platform


def choose_server(preferred_port):
    ports = [preferred_port] if preferred_port == 0 else range(preferred_port, preferred_port + 20)
    last_error = None
    for port in ports:
        try:
            return OfflineServer(("127.0.0.1", port), Handler)
        except OSError as error:
            last_error = error
    raise last_error or OSError("没有可用端口")


def main():
    parser = argparse.ArgumentParser(description="启动营销 Agent 离线演示版")
    parser.add_argument("--port", type=int, default=18767)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    server = choose_server(args.port)
    url = f"http://127.0.0.1:{server.server_port}/?offline=1#ad-agent"
    print("\n营销 Agent 离线演示版已启动")
    print(url)
    print("使用期间请保留此窗口；按 Control + C 可停止。\n")
    if not args.no_browser and not os.environ.get("OFFLINE_NO_BROWSER"):
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
