# A5 — script-generator Agent 协作重写

## 任务
重写 `/home/z/my-project/src/components/views/script-generator-view.tsx`，从原 641 行两栏版本升级为 Hermes 风格 Agent 协作创作台（三栏 + 步进式时间线 + 剧情文档库 + 来源展示）。

## 上下文与契约确认
- 读完 worklog.md / 旧 view / store / globals.css / shadcn 组件清单
- 读完三个后端 API 实现：
  - `POST /api/agent/search` — 调 `searchMoviePlot(movieTitle, genre)`，返回 `{snippets, fullPlot, combined, sources, savedPlotId}`；登录用户自动入库
  - `GET/POST/DELETE /api/agent/plots` — PlotDocument CRUD，按 userId 隔离，同 movieTitle+source 覆盖
  - `POST /api/ai/script` — 接受 `plotContext` 字段；有则严格按真实剧情创作，无则末尾标注「剧情未经校验」
- dev.log 显示 `POST /api/agent/search 200 in 1884ms` 后端可用（web_reader 深度读取会 fail 但被 try/catch 吞掉，最终用 snippets 拼 combined，返回 200）

## 关键决策
1. **布局**：`lg:grid-cols-[38fr_32fr_30fr]` 精确还原 38/32/30 三栏比例；移动端 `grid-cols-1` 自然堆叠（顺序：表单 → Agent → 结果，符合 spec）
2. **Agent 模式状态机**：`agentMode: "none" | "web" | "doc"`，三张可选卡片（非 RadioGroup，因为需要 desc+locked 状态），未登录时 doc 卡片 disabled 并显示「需登录」badge
3. **时间线前端驱动**：steps 是 React state 数组（4 步），用 stepTimers ref 记录每步开始时间。search API 一次性返回，但前端通过 `sleep` 在 step2/3 之间制造 400-700ms 视觉过渡，让用户感知到「搜索→阅读→整合→生成」的真实 Agent 推进感
4. **错误处理**：search 失败时把当前 running step 标记为 error（红色 X 图标 + 错误信息 + 重试按钮），不阻塞用户切回 none/doc 模式手动生成
5. **剧情文档库**：登录用户选中 doc 模式时 useEffect 自动 fetch plots；列表项显示电影名+来源badge(联网/手动)+字数+相对时间；点击选中后下方显示前 24 行预览（可展开至 64 行）；新建 Dialog 预填当前表单的电影名；删除有 stopPropagation 防误触
6. **来源展示**：search 完成后显示 sources 列表，每项可点击外链跳转（target=_blank rel=noopener），显示来源名+域名+摘要前 60 字
7. **未校验提示**：ResultPanel 检测 result 是否含「剧情未经校验」字符串，含则在工具栏下方显示琥珀色警告条引导用户切到 Agent 模式
8. **保留旧版**：复制/收藏/重新生成/TTS 试听/Markdown 渲染/EmptyState/Skeleton 全部保留；修复了旧版 `{ }` 空表达式的小瑕疵

## 风险与遗留
- search API 的 `web_reader` 深度读取后端会报错（z-ai SDK 无此函数），但被 try/catch 吞掉，最终 combined 由 snippets 拼接。step2「读取 X 字」显示的就是 snippets 长度，不影响功能。后端问题不在本任务范围。
- Timeline 的 step2/3 用 sleep 制造过渡，纯视觉驱动，不影响真实 API 调用顺序（search 一次返回所有数据，script 是单独调用）

## 产出
- 1 个文件：`src/components/views/script-generator-view.tsx`（约 1000 行，含主组件 + AgentPanel/SourceSelector/AgentTimeline/StepIcon/PlotLibrary/SearchSources/Field/SelectField/EmptyState/ResultSkeleton/AgentRunningSkeleton/ResultPanel/Markdown 13 个子组件）
- ESLint：0 error 0 warning
- 编译：✓ Compiled in 410ms
