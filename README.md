# 记账本 · 净收支 H5

纯前端记账网页（无后端、无数据库），数据保存在浏览器 localStorage。
适合记录「每天净收支」：收入 1000、付出 500 → 记 +500；收入 500、付出 1000 → 记 -500。
支持按月查看、月度趋势图、一键导出 Excel（每月份一个工作表，结构仿原 Excel）。

## 功能
- 📝 记一笔：日期 + 净金额（可正可负）+ 可选备注
- 📊 汇总：总余额（累计净收支）+ 当月合计（收 / 支拆分）
- 🗓 按月切换：上一月 / 下一月 / 回到本月
- 📈 月度净收支趋势图（SVG，正数红 / 负数绿）
- 💾 导出 Excel：每个有数据的月份一个 sheet，列为「月份 / 天数 / 金额」，含「总计」行
- 🌓 深色 / 浅色主题切换
- 📱 移动端优先，可直接加到手机主屏当 App 用

## 目录结构
```
account_h5/
├── index.html              # 页面
├── css/style.css           # 样式（含明暗主题）
├── js/app.js               # 全部逻辑
├── vendor/xlsx.full.min.js # 本地 Excel 导出库（无需联网）
└── README.md
```

## 本地预览
直接双击 `index.html` 即可在浏览器打开；或在项目目录起一个静态服务：
```bash
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

## 部署到 GitHub Pages（免费）
1. 在 GitHub 新建一个仓库（如 `account-h5`）。
2. 把本目录全部文件上传到仓库（可用 GitHub 网页「Add file」拖拽，或见下方 git 方式）。
3. 仓库 → **Settings → Pages**（设置 → 页面）
   - Source 选择 **Deploy from a branch**
   - Branch 选 **main**（或 master），目录选 **/ (root)**
   - 点击 Save。
4. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 也可放到 `username.github.io` 这个特殊仓库，直接作为用户主页（根目录部署）。

### 用 git 推送（可选）
```bash
git init
git add -A
git commit -m "记账本 H5 首版"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```
推送后再按上面第 3 步开启 Pages 即可。

## 数据说明
- 所有记账只存在**你当前浏览器**里，不上传任何服务器。
- 换设备 / 清缓存会丢失，重要数据请点「导出 Excel」备份。
- 导出文件名形如 `记账本_2026-09-01.xlsx`。
