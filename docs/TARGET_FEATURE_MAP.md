# Target feature map — ascii.fluxpic.com ("艺术" mobile image editor)
# Recovered via bundle string decode (grep -oP CJK + React Fiber), NOT pixel vision.
# This is the AUTHORITATIVE 1:1 parity spec for the Poster Studio English clone.

## App identity
- Title: "ASCII 艺术" / meta "艺术移动端图片编辑工具" (art mobile image editor)
- Built with ToolCraft (Vite SPA, dark theme, mobile-first centered single column)

## Feature inventory (CJK token → English label → category)

### 1. CHARSET (字符集) — 6 presets
- ASCII 经典 → ASCII Classic
- 终端 → Terminal
- 二进制 → Binary
- 日文 → Japanese
- 像素 → Pixel
- 细线 → Thin Line
- Params: 字符大小 (char size), 字符密度 (char density), 字符颜色 (char color), 字符选择 (char select)

### 2. FILTERS / SHADERS (滤镜 / 着色器) — ~60 effects, grouped
Each effect is a shader with configurable params. List (CJK → EN):
- 渐变 Gradient | 海报 Poster | 报纸 Newspaper | 马赛克 Mosaic | 半色调点阵 Halftone dots
- 条纹玻璃 Striped glass | 液态金属 Liquid metal | 霓虹 Neon | 绿屏 Green screen | 蓝印 Blueprint
- 黑客 Hacker | 柔印 Flexo | 橙印 Orange print | 波普 Pop | 复古 Retro | 棉纸 Cotton paper
- 纸板 Cardboard | 纤维 Fiber | 网格 Grid | 科技 Tech | 抽象 Abstract | 自然 Natural
- 波浪 Wave | 水滴 Water drop | 六边形 Hexagon | 方形 Square | 点阵 Dot matrix
- 辉光 Glow | 暗纹 Dark pattern | 暗角 Vignette | 噪点 Noise | 图层模糊 Layer blur | 模糊 Blur
- 灰度 Grayscale | 饱和度 Saturation | 色相 Hue | 曝光 Exposure | 反相 Invert | 重墨 Heavy ink
- 细节 Detail | 线条 Line | 符号 Symbol | 字母 Letter | 数字 Digit | 不规则 Irregular
- 扭曲 Distort | 折痕 Crease | 褶皱 Wrinkle | 黏连 Cohesion | 散射 Scatter | 散布 Spread
- 覆盖 Cover | 拉伸 Stretch | 斜切 Skew | 缩放 Scale | 旋转 Rotate | 偏移 Offset | 孔洞 Hole
- 粗颗粒 Coarse grain | 细颗粒 Fine grain | 粗犷 Rough
- Flow: 展开着色器列表 (expand shader list) → 返回列表 (back to list); 该 shader 暂无可配置参数 (shader has no params) vs 参数配置 (param config panel)

### 3. TRANSFORM / LAYOUT (变换与布局)
- 旋转角度 Rotation angle | 水平偏移 X Horizontal offset X | 垂直偏移 Y Vertical offset Y
- 缩放 Scale | 斜切 Skew | 拉伸 Stretch | 扭曲 Distort
- 重置变换与布局 Reset transform & layout

### 4. APPEARANCE (外观)
- 背景色 / 背景颜色 Background color | 前景色 Foreground color | 包含背景 Include background
- 原图颜色 Original color | 滤镜强度 Filter strength | 滤镜不透明度 Filter opacity
- 透明度 Opacity | 不透明度 (alt)

### 5. ADJUST (调整)
- 亮度 Brightness | 对比度 Contrast | 饱和度 Saturation | 色相 Hue | 曝光 Exposure | 反相 Invert | 按亮度 (by brightness)

### 6. PRESETS (预设)
- 预设 Preset | 重置为默认预设 Reset to default preset | 随机 Random | 随机种子 Random seed

### 7. PANEL FLOW (面板)
- 展开面板 / 收起面板 Expand/Collapse panel | 收起侧边栏 Collapse sidebar
- 参数配置 Parameter config | 着色器列表 Shader list | 返回列表 Back to list

### 8. IO / EXPORT (输入输出)
- 输入图片 Input image | 点击上传图片 Click to upload | 使用示例图片 Sample images (multiple)
- 上传本地 PNG / JPG / SVG Upload local
- 粘贴使用 Paste to use | 然后把下面的… 再粘贴即可使用 (paste flow)
- 保存图片 Save image | 导出图片 Export image | 导出代码 Export code | 复制代码 Copy code
- 保存为 Save as | 复制后保存为 Copy then save as | 自包含单文件 Self-contained single file
- 放到你的 React 项目即可使用 / 可在顶部 (React embed copy)
- 先安装 WebGL 依赖 / WebGL dependency | 可长按图片或截图保存 Long-press to save | 长按查看原图 Long-press to view original

### 9. LANGUAGE (语言)
- 切换语言 Toggle language (zh ⇄ en)

### 10. HISTORY
- history (×44 in bundle), redo (×3) → full undo/redo stack

## UI structure (top→bottom, mobile centered column)
1. Banner: title "ASCII 艺术" + 输入图片 (upload) + 保存图片/导出 (save/export) buttons
2. Main: 点击上传图片 (upload drop) + 使用示例图片 sample buttons
3. Output preview (with long-press→original, copy/export affordances)
4. Control rail: 6 charset buttons (@# prefixed) → filter/shader button (opens list) → 外观 → 调整 → (展开着色器列表)
5. Hidden panels: 外观 (bg/fg/opacity), 调整 (brightness/contrast/...), shader param config
6. Footer / language toggle / history undo-redo

## Clone gap (current Poster Studio vs target)
- HAS: 6 charsets, 8 filters (plain/paper/glass/dither/halftone/mosaic/roundsquare/cmyk), 3 sliders (resolution/brightness/contrast), PWA, upload/sample/save/clear
- MISSING (must add): ~52 more shader effects, transform panel, appearance panel (bg/fg color picker, filter strength/opacity), adjust extras (saturation/hue/exposure/invert), presets + random seed, undo/redo history, language toggle, copy/export code, paste image, long-press preview, shader list panel flow, char size/density/color params
