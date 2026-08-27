# 心院人格 H5

一个移动端优先的互动问卷：根据好感度、存在感与关注朝向生成 8 种拟人化心院画像，并给出 CP 感、私人回信和匿名心形词云。

## 本地启动

需要 Node.js 20–25，无第三方运行依赖。

```powershell
npm start
```

浏览器打开 `http://127.0.0.1:4173`。Windows 也可双击 `启动网页版.bat`。

```powershell
npm test
```

## 数据边界

- 完整匿名答卷提交到 `POST /api/v1/responses`。
- “你想对心院说的话”会以 `message_to_xinyuan` 匿名保存，供管理员后续汇总；它不参与人格评分、不进入公共词云，也不会发送给 AI 报告接口。
- 不收集姓名、学号或答题者 IP；服务端 IP 只在内存中短暂用于一分钟频率限制，不写入数据库。
- 未配置 Supabase 时，本地开发数据写入 `data/responses.json`；该文件已被 `.gitignore` 排除。
- 公开词云只包含明确同意公开的三个词，并支持最低出现次数保护。

## 接入 Supabase

1. 在 Supabase 创建项目。
2. 打开 SQL Editor，运行 [`supabase/schema.sql`](supabase/schema.sql)。
3. 在 Render 的服务页面进入 **Environment**，添加：

```text
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=仅限服务端的密钥
ADMIN_TOKEN=一段至少32字符的随机密码
PUBLIC_CLOUD_MIN_COUNT=2
```

4. 保存后让 Render 重新部署。
5. 打开 `https://你的网站/api/v1/health`，确认返回的 `storage` 是 `supabase`。

`SUPABASE_SERVICE_ROLE_KEY` 和 `ADMIN_TOKEN` 只能放在 Render Environment，不能写入前端或提交 GitHub。数据库启用了 RLS，未创建浏览器端读写策略。

## 统计接口

| 方法 | 路径 | 权限 | 用途 |
|---|---|---|---|
| POST | `/api/v1/responses` | 公开 | 提交匿名答卷 |
| GET | `/api/v1/stats/word-cloud?minCount=2&limit=40` | 公开聚合 | 心形词云数据 |
| GET | `/api/v1/stats/overview` | 管理员 | 总量、均值、人格、院系和选项分布 |
| GET | `/api/v1/stats/export.csv` | 管理员 | 导出匿名答卷及“想对心院说的话”CSV |
| POST | `/api/v1/admin/ai-report` | 管理员 | 让 AI 分析匿名聚合数据 |
| GET | `/api/v1/health` | 公开 | 检查存储与 AI 配置状态 |

管理员接口使用请求头：

```text
Authorization: Bearer 你的ADMIN_TOKEN
```

PowerShell 示例：

```powershell
$headers = @{ Authorization = "Bearer 你的ADMIN_TOKEN" }
Invoke-RestMethod "https://你的网站/api/v1/stats/overview" -Headers $headers
Invoke-WebRequest "https://你的网站/api/v1/stats/export.csv" -Headers $headers -OutFile "心院答卷.csv"
```

## 可选 AI 报告

在 Render Environment 继续添加：

```text
OPENAI_API_KEY=你的服务端API密钥
OPENAI_MODEL=你的OpenAI项目可用模型ID
```

然后调用：

```powershell
$headers = @{ Authorization = "Bearer 你的ADMIN_TOKEN" }
Invoke-RestMethod "https://你的网站/api/v1/admin/ai-report" -Method Post -Headers $headers
```

AI 只收到 `stats/overview` 产生的匿名聚合统计，不接收单份答卷或“想对心院说的话”。请求使用 OpenAI Responses API 的 JSON Schema 结构化输出，并设置 `store: false`。

## Render 发布

- Runtime：`Node`
- Build Command：`npm install`
- Start Command：`npm start`
- Health Check Path：`/api/v1/health`

服务器监听 `0.0.0.0` 和 Render 提供的 `PORT`。每次 GitHub 更新后可自动重新部署。
