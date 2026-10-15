#!/usr/bin/env python3
"""丑团用户号端到端 (TData 全自治, 无需短信/扫码/人工).
流程: TData --UseCurrentSession--> Telethon --BotFather /newbot--> 测试Bot --/start--> 断言欢迎语+web_app按钮.
输入 (环境变量, 值永不打印):
  TDATA_DIR        TData 目录 (已登录的测试号 Desktop 完全退出后复制)
  TG_SESSION_OUT   转换后 session 落盘 (默认 /workspace/.choutuan-tg/telethon.session)
  TEST_BOT_TOKEN   已有测试Bot可填, 为空则用 BotFather 自动创建一个
  WEBAPP_URL       默认 https://choutuan.telesearch.workers.dev
无 TDATA_DIR 时打印 SKIP exit 0.
"""
import asyncio, os, re, sys, urllib.request, json

TOKEN_RE = re.compile(r'(\d{6,12}:[A-Za-z0-9_-]{30,})')

async def main() -> int:
    tdata = os.environ.get('TDATA_DIR', '')
    if not tdata or not os.path.isdir(tdata):
        print('TGUSER SKIP: 无 TDATA_DIR (见 docs/bot-testing.md, 测试号 Desktop 退出后把 tdata 打 zip 给我)')
        return 0
    out = os.environ.get('TG_SESSION_OUT', '/workspace/.choutuan-tg/telethon.session')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    webapp = os.environ.get('WEBAPP_URL', 'https://choutuan.telesearch.workers.dev')

    from opentele.td import TDesktop
    from opentele.api import UseCurrentSession
    print('--- 1/6 TData 转换 (零短信, 复用已授权会话) ---')
    tdesk = TDesktop(tdata)
    assert tdesk.isLoaded(), 'tdata 未加载 (目录不对或未登录)'
    client = await tdesk.ToTelethon(session=out, flag=UseCurrentSession)
    await client.connect()
    me = await client.get_me()
    print('user: id=%s username=%s' % (me.id, getattr(me, 'username', None)))

    token = os.environ.get('TEST_BOT_TOKEN', '')
    if not token:
        print('--- 2/6 BotFather 自动建测试Bot ---')
        bf = await client.get_entity('BotFather')
        async with client.conversation(bf, timeout=120) as conv:
            await conv.send_message('/newbot')
            await conv.get_response()
            await conv.send_message('ChouTuan Test')
            await conv.get_response()
            import random
            for _ in range(8):
                cand = 'choutuan_t%d_bot' % random.randint(10000, 99999)
                await conv.send_message(cand)
                r = await conv.get_response()
                m = TOKEN_RE.search(r.text or '')
                if m:
                    token = m.group(1)
                    print('created bot: @%s' % cand)
                    break
            if not token:
                print('TGUSER FAIL: BotFather 建号失败'); return 1
    else:
        print('--- 2/6 用现成 TEST_BOT_TOKEN ---')
    bot_username = None

    print('--- 3/6 给测试Bot发 /start ---')
    # 用 token 拿 bot 用户名 (Bot API, 不打印 token)
    req = urllib.request.Request(
        'https://api.telegram.org/bot%s/getMe' % token, data=b'{}',
        headers={'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as r:
        info = json.load(r)
    assert info.get('ok'), info
    bot_username = '@' + info['result']['username']
    print('bot: %s' % bot_username)
    await client.send_message(bot_username, '/start')

    print('--- 4/6 等欢迎语 (轮询历史, 最长90s) ---')
    from telethon.tl.types import KeyboardButtonWebView
    found, has_webapp = None, False
    for _ in range(18):
        await asyncio.sleep(5)
        async for m in client.iter_messages(bot_username, limit=5):
            if m.out:
                continue
            if '丑团' in (m.text or ''):
                found = m
                try:
                    rows = (m.reply_markup.rows if m.reply_markup else [])
                    for row in rows:
                        for b in row.buttons:
                            if isinstance(b, KeyboardButtonWebView):
                                has_webapp = True
                except Exception:
                    pass
                break
        if found:
            break
    assert found, 'TGUSER FAIL: 90s 内没收到欢迎语 (webhook 没接好, 查 wrangler tail)'
    print('reply: %s' % (found.text or '')[:80])
    print('web_app button: %s' % has_webapp)

    print('--- 5/6 Mini App 页存活 ---')
    with urllib.request.urlopen(webapp + '/api/health', timeout=20) as r:
        h = json.load(r)
    assert h.get('ok'), h
    print('health: %s %s' % (h.get('version'), h.get('runtime')))
    print('TGUSER PASS(full): /start -> 欢迎语 -> web_app按钮%s' % (' OK' if has_webapp else ' (按钮缺失, 只回了文字!)'))
    await client.disconnect()
    return 0 if has_webapp else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
