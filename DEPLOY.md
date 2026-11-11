# AREA-372 · 部署说明

本文件夹是**可直接部署的完整静态站点**。没有构建步骤、没有 Node 依赖、没有后端。

```
14 个页面 · assets/（样式、脚本、字体、图片）· data/（11 个 JSON 档案）
```

所有路径均为**相对路径**，因此无论部署在域名根目录还是子目录（如 `example.com/area372/`）都能正常工作。

---

## 一、部署前先本地验收

```bash
cd deploy
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000/index.html
```

确认能进开屏、能登录、能翻页，再上传。

---

## 二、方案 A：Cloudflare Pages（最快，完全免费）

**适合：** 想立刻拿到一个公开网址，不需要国内高速。

1. 注册 <https://dash.cloudflare.com>（免费，不要信用卡）
2. 左侧 **Workers & Pages** → **Create** → 选 **Pages** → **Upload assets**
3. 项目名填 `area-372`（会成为 `area-372.pages.dev`）
4. 把 **本文件夹里的全部内容**拖进上传区（注意：是文件夹**里面**的文件，不要连文件夹一起拖）
5. 点 **Deploy site**，约 10 秒后拿到网址

**命令行方式（可选）：**

```bash
npm i -g wrangler
wrangler login
wrangler pages deploy . --project-name=area-372
```

`_headers` 会被自动识别并生效。

> ⚠️ `pages.dev` 在国内网络经常很慢甚至打不开。发给国内朋友前请先自己用手机网络试一次。

---

## 三、方案 B：Netlify（拖拽部署，体验最接近）

1. 注册 <https://app.netlify.com>
2. 登录后首页有 **drag and drop your site output folder here** 的虚线框
3. 直接把本文件夹拖进去
4. 立刻得到 `随机的名字.netlify.app`，可在 **Site settings → Change site name** 改名

`_headers` 同样生效。

---

## 四、方案 C：Vercel

1. 注册 <https://vercel.com>
2. **Add New → Project → Deploy** 旁边的 **Upload**（或直接拖文件夹）
3. Framework Preset 选 **Other**，Build Command 留空，Output Directory 留空

Vercel 会忽略 `_headers`（无害），其余照常。

---

## 五、方案 D：GitHub Pages（免费，适合长期维护）

1. 在 GitHub 建一个仓库
2. 把本文件夹内容 push 到仓库根目录
3. **Settings → Pages → Source** 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)`
4. 稍等 1 分钟，访问 `https://你的用户名.github.io/仓库名/`

因为是相对路径，放在子目录 `/仓库名/` 下能正常运行。

---

## 六、方案 E：国内可访问（需注意备案）

如果主要给国内用户看，`pages.dev` / `netlify.app` / `vercel.app` 都可能很慢。可选：

| 服务 | 说明 |
| --- | --- |
| **腾讯云 COS + CDN** | 对象存储开静态网站，配 CDN 加速 |
| **阿里云 OSS + CDN** | 同上 |
| **又拍云 / 七牛云** | 有免费额度，速度好 |
| **香港 / 新加坡 VPS** | 自己装 Nginx，无需备案 |

> **重要：** 把**自定义域名**绑定到中国大陆的 CDN / 对象存储，**必须完成 ICP 备案**。
> 不备案时只能使用平台分配的默认域名（一般可用，但域名较长且部分平台会强制下载 HTML）。

Nginx 配置参考：

```nginx
server {
    listen 80;
    root /var/www/area-372/deploy;
    index index.html;
    charset utf-8;

    location / {
        try_files $uri $uri/ =404;
    }
    error_page 404 /404.html;

    location ~* \.(woff2|webp|png|jpg)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location ~* \.(json|html|js|css)$ {
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

---

## 七、部署后自检清单

上传完成后，逐项点一遍：

- [ ] `index.html` 开屏 2.3 秒内进入身份核验
- [ ] 输入 `工程师` 能登录并跳到主页
- [ ] 左侧 8 个导航项都能打开
- [ ] `收容项目` 页能筛选、能点开详情弹窗
- [ ] 随便访问一个不存在的地址，能看到站点风格的 404 页
- [ ] 手机浏览器打开，侧边栏能展开

---

## 八、这个包里有什么

| 路径 | 内容 |
| --- | --- |
| `*.html` | 14 个页面 |
| `assets/css/style.css` | 全部样式 |
| `assets/js/core.js` | 会话、权限、启动序列、控制台指令 |
| `assets/js/app.js` | 页面渲染、导航、检索、弹窗 |
| `assets/fonts/` | 离线字体（中文已子集化） |
| `assets/img/` | 标志、海报、欢迎图、彩蛋图 |
| `data/*.json` | 11 个内容数据文件 |
| `_headers` | 缓存与安全响应头（Cloudflare / Netlify） |
| `404.html` | 站点风格的自定义错误页 |

---

## 九、更新内容怎么办

改完源目录里的 `data/*.json` 或页面后，回到源目录重新执行：

```bash
./build-deploy.sh
```

然后把新的 `deploy/` 重新上传（Cloudflare Pages 支持在同一项目里覆盖部署，网址不变）。
