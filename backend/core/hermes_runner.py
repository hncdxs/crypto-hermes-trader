"""
Hermes Agent 进程管理模块

核心职责：
  1. 管理 Hermes 守护进程（gateway）的生命周期
  2. 提供 hermes chat 子进程的实时调用能力
  3. 捕获子进程输出并写入数据库（thinking_logs）
  4. 供交易员启动/对话路由/安装脚本使用

铁律：
  - Hermes Agent 是唯一执行体，后端只是代理执行 `hermes <command>`
  - 绝不直接调 LLM SDK，绝不绕过 Hermes
"""

import os
import subprocess
import signal
import time
import json
import logging
import asyncio
from typing import Optional
from datetime import datetime

logger = logging.getLogger("hermes_runner")

# ---------- 路径查找 ----------

def find_hermes() -> Optional[str]:
    """返回 hermes 可执行文件绝对路径"""
    # 按优先级查找
    candidates = [
        "hermes",  # 在 PATH 中
        "/usr/local/bin/hermes",
        "/root/.hermes/hermes-agent/venv/bin/hermes",
        os.path.expanduser("~/.hermes/hermes-agent/venv/bin/hermes"),
    ]
    for c in candidates:
        if "/" in c:
            if os.path.exists(c) and os.access(c, os.X_OK):
                return c
        else:
            r = subprocess.run(
                ["which", c],
                capture_output=True, text=True, timeout=5
            )
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout.strip()
    return None


def get_env() -> dict:
    """返回 Hermes 运行所需的完整环境变量"""
    env = os.environ.copy()
    hermes_dir = os.path.expanduser("~/.hermes")
    hermes_bin = os.path.join(hermes_dir, "hermes-agent", "venv", "bin")
    # 确保核心工具链在 PATH 中
    extra_paths = [p for p in [hermes_bin] if os.path.isdir(p)]
    if extra_paths:
        env["PATH"] = ":".join(extra_paths) + ":" + env.get("PATH", "")
    env["HOME"] = os.path.expanduser("~")
    return env


# ---------- 状态查询 ----------

def get_hermes_status() -> dict:
    """检查 Hermes Agent 是否安装及运行"""
    binary = find_hermes()
    if not binary:
        return {"installed": False, "running": False, "version": None, "path": None}

    # 版本
    version = None
    try:
        r = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=10)
        version = (r.stdout or r.stderr).strip()
    except Exception:
        pass

    # 进程检查 — 是否有 hermes 进程在运行
    running = False
    try:
        import psutil
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline = " ".join(proc.info.get("cmdline") or [])
                if "hermes" in cmdline.lower() or proc.info.get("name") == "hermes":
                    running = True
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except ImportError:
        # fallback: /proc
        my_pid = str(os.getpid())
        try:
            for entry in os.listdir("/proc"):
                if entry.isdigit() and entry != my_pid:
                    try:
                        cmd = open(f"/proc/{entry}/cmdline", "rb").read().decode("utf-8", errors="replace").replace("\x00", " ")
                        if "hermes" in cmd.lower():
                            running = True
                            break
                    except OSError:
                        pass
        except Exception:
            pass

    return {"installed": True, "running": running, "version": version, "path": binary}


# ---------- 守护进程管理 ----------

def start_gateway() -> dict:
    """在后台启动 Hermes gateway 守护进程"""
    status = get_hermes_status()
    if status["running"]:
        return {"status": "ok", "detail": "Hermes Gateway 已在运行中"}

    binary = status["path"]
    if not binary:
        return {"status": "error", "detail": "Hermes Agent 未安装，请先运行安装脚本"}

    log_path = "/tmp/hermes_gateway.log"
    try:
        proc = subprocess.Popen(
            [binary, "gateway", "run"],
            stdout=open(log_path, "a"),
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            env=get_env(),
            start_new_session=True,
        )
        # 等待启动
        time.sleep(5)
        # 确认运行
        status2 = get_hermes_status()
        if status2["running"]:
            return {"status": "ok", "detail": f"Hermes Gateway 已启动 (PID: {proc.pid})"}
        # 读日志
        if os.path.exists(log_path):
            with open(log_path) as f:
                tail = f.read()[-500:]
            return {"status": "error", "detail": f"启动异常:\n{tail}"}
        return {"status": "error", "detail": "Hermes Gateway 启动失败，请检查日志"}
    except Exception as e:
        logger.exception("启动 Hermes Gateway 失败")
        return {"status": "error", "detail": f"启动异常: {e}"}


def stop_gateway() -> dict:
    """停止 Hermes gateway 守护进程"""
    killed = False
    try:
        import psutil
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline = " ".join(proc.info.get("cmdline") or [])
                if ("hermes" in cmdline.lower() and "gateway" in cmdline.lower()) or \
                   (proc.info.get("name") == "hermes"):
                    proc.terminate()
                    killed = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except ImportError:
        try:
            for entry in os.listdir("/proc"):
                if entry.isdigit() and entry != str(os.getpid()):
                    try:
                        cmd = open(f"/proc/{entry}/cmdline", "rb").read().decode("utf-8", errors="replace").replace("\x00", " ")
                        if "hermes" in cmd.lower():
                            os.kill(int(entry), signal.SIGTERM)
                            killed = True
                    except (OSError, ProcessLookupError):
                        pass
        except Exception:
            pass

    if killed:
        return {"status": "ok", "detail": "Hermes Gateway 已停止"}
    status = get_hermes_status()
    if not status["running"]:
        return {"status": "ok", "detail": "Hermes Gateway 未在运行"}
    return {"status": "error", "detail": "停止失败"}


# ---------- 执行 hermes chat（核心） ----------

async def run_hermes_chat(
    prompt: str,
    trader_id: Optional[str] = None,
    timeout: int = 120,
) -> dict:
    """执行 hermes chat 子进程并捕获完整输出

    这是最核心的函数，所有"让 Hermes 做事"的入口都经过它：
    - 用户对话框聊天
    - 交易员启动时执行策略扫描
    - 安装/配置任务

    返回:
        {
            "success": bool,
            "output": str,         # 完整输出文本
            "error": Optional[str],
            "exit_code": int,
            "thinking_logs": list,  # 解析出的思维链片段（可选）
        }
    """
    binary = find_hermes()
    if not binary:
        return {"success": False, "output": "", "error": "Hermes Agent 未安装", "exit_code": -1, "thinking_logs": []}

    # 构造命令
    cmd = [binary, "chat", "-q", prompt, "-m", "MiniMax-M2.7", "--provider", "openai"]

    logger.info(f"执行 hermes chat (trader={trader_id}): {prompt[:80]}...")

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=get_env(),
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {
                "success": False,
                "output": "",
                "error": f"执行超时 ({timeout}s)",
                "exit_code": -1,
                "thinking_logs": [],
            }

        output = stdout.decode("utf-8", errors="replace").strip()
        err_output = stderr.decode("utf-8", errors="replace").strip()
        exit_code = proc.returncode or 0

        result = {
            "success": exit_code == 0,
            "output": output,
            "error": err_output if err_output else None,
            "exit_code": exit_code,
            "thinking_logs": [],
        }

        # 如果有关联交易员，写入 thinking_logs 表
        if trader_id and output:
            await _save_thinking_log(trader_id, prompt, output, exit_code)

        return result

    except Exception as e:
        logger.exception(f"hermes chat 执行异常")
        return {"success": False, "output": "", "error": str(e), "exit_code": -1, "thinking_logs": []}


async def _save_thinking_log(trader_id: str, prompt: str, output: str, exit_code: int):
    """将 Hermes 执行结果写入 thinking_logs 表"""
    try:
        from core.database import async_session_factory
        from sqlalchemy import text

        async with async_session_factory() as db:
            await db.execute(
                text("""
                    INSERT INTO thinking_logs (trader_id, prompt, output, exit_code, created_at)
                    VALUES (:tid, :prompt, :output, :code, :now)
                """),
                {
                    "tid": trader_id,
                    "prompt": prompt[:5000],
                    "output": output[:10000],
                    "code": exit_code,
                    "now": datetime.utcnow(),
                }
            )
            await db.commit()
    except Exception as e:
        logger.warning(f"写入 thinking_logs 失败: {e}")


# ---------- 获取思维日志 ----------

async def get_thinking_logs(trader_id: str, limit: int = 20) -> list[dict]:
    """从数据库查询交易员的 Hermes 思维日志"""
    try:
        from core.database import async_session_factory
        from sqlalchemy import text

        async with async_session_factory() as db:
            rows = await db.execute(
                text("""
                    SELECT id, prompt, output, exit_code, created_at
                    FROM thinking_logs
                    WHERE trader_id = :tid
                    ORDER BY created_at DESC
                    LIMIT :lim
                """),
                {"tid": trader_id, "lim": limit},
            )
            return [
                {
                    "id": str(r[0]),
                    "prompt": r[1],
                    "output": r[2],
                    "exit_code": r[3],
                    "created_at": r[4].isoformat() if r[4] else None,
                }
                for r in rows.fetchall()
            ]
    except Exception as e:
        logger.warning(f"查询 thinking_logs 失败: {e}")
        return []
