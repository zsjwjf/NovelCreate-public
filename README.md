<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Novel Timeline Editor / 小说时间线编辑器

An application designed for novel writers to organize timelines, events, and character relationships. It features visualizations for event connections and character relationship graphs, and uses AI to assist with creative brainstorming.

一个帮助小说作者组织时间线、事件和人物关系的应用程序。它具有事件关联和人物关系图的可视化功能，并使用人工智能辅助创意构思。

---

## ✨ Features / 功能特性

- **Multiple Scripts Management**: Create and manage different novels or stories in one place.
- **Interactive Timeline View**: Visualize events on a dynamic, zoomable, and pannable timeline, organized by storylines.
- **Character Relationship Graph**: Use a force-directed graph to map out complex relationships between characters and groups.
- **Rich Data Management**: Easily create, edit, and delete core story elements:
  - Custom Eras (e.g., "Crisis Era", "Generation One")
  - Storylines (main plots, subplots)
  - Event Types (e.g., "Key Plot", "Clue")
  - Characters & Character Groups
  - Events & their connections
- **AI-Powered Idea Generation**: Leverage AI (supports Gemini and OpenAI) to brainstorm new event ideas based on the current story context.
- **Local Storage**: All your data is saved securely in your browser's local storage. No cloud account needed.
- **Fully Responsive**: Designed to work on various screen sizes.

---

- **多剧本管理**: 在一个地方创建和管理不同的小说或故事。
- **交互式时间线视图**: 在动态、可缩放、可平移的时间线上可视化事件，并按故事线组织。
- **人物关系图**: 使用力导向图来展示人物和群组之间的复杂关系。
- **丰富的数据管理**: 轻松创建、编辑和删除核心故事元素：
  - 自定义纪元 (例如, "危机纪元", "第一代")
  - 故事线 (主线, 支线)
  - 事件类型 (例如, "关键情节", "线索")
  - 人物 & 人物群组
  - 事件 & 事件关联
- **AI 辅助创意**: 利用 AI (支持 Gemini 和 OpenAI) 根据当前的故事背景构思新的事件创意。
- **本地存储**: 您的所有数据都安全地保存在浏览器的本地存储中，无需云端账户。
- **完全响应式**: 适应各种屏幕尺寸。

---

## 🚀 Live Demo / 在线演示

You can access the live demo here: (Link to your deployed application)

您可以在这里访问在线演示：(此处替换为您的部署链接)

---

## 🔧 Getting Started / 本地开发

To run this project locally, you'll need Node.js and npm installed.

要在本地运行此项目，您需要安装 Node.js 和 npm。

1.  **Clone the repository / 克隆仓库**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies / 安装依赖**
    ```bash
    npm install
    ```

3.  **Build the project / 构建项目**
    This command builds the CSS and JavaScript bundle.
    此命令会构建 CSS 和 JavaScript 文件。
    ```bash
    npm run build
    ```

4.  **Run a local server / 运行本地服务器**
    Since the project uses ES modules, you need to serve the files from a local web server. You can use any simple server, like `live-server` from npm.
    由于项目使用了 ES 模块，您需要通过本地 Web 服务器来访问文件。您可以使用任何简单的服务器，例如 npm 上的 `live-server`。
    ```bash
    # If you don't have live-server, install it globally
    # 如果您没有 live-server, 请全局安装
    npm install -g live-server

    # Run the server from the project root
    # 在项目根目录运行服务器
    live-server
    ```
    The application will be available at `http://127.0.0.1:8080`.

---

## ☁️ Deployment / 部署

This project is optimized for easy deployment on static hosting platforms like Cloudflare Pages.

本项目已针对 Cloudflare Pages 等静态托管平台进行了优化，可轻松部署。

### Deploying to Cloudflare Pages / 部署到 Cloudflare Pages

1.  **Push your code / 推送代码**
    Push your project code to a GitHub (or GitLab) repository.
    将您的项目代码推送到 GitHub (或 GitLab) 仓库。

2.  **Log in to Cloudflare / 登录 Cloudflare**
    - Go to your Cloudflare Dashboard.
    - Navigate to **Workers & Pages**.
    - 登录您的 Cloudflare 仪表板，然后导航到 **Workers & Pages**。

3.  **Create a new Pages project / 创建新的 Pages 项目**
    - Click **Create application** > **Pages** > **Connect to Git**.
    - Select your project repository and click **Begin setup**.
    - 点击 **Create application** > **Pages** > **Connect to Git**。
    - 选择您的项目仓库，然后点击 **Begin setup**。

4.  **Configure Build Settings / 配置构建设置**
    Use the following settings for the build configuration:
    使用以下设置进行构建配置：

    - **Framework preset**: `None`
    - **Build command**: `npm install && npm run build`
    - **Build output directory**: `/`
    - **Root directory**: (leave blank if `package.json` is in the root)

     <!-- It's recommended to add a screenshot here -->

5.  **Deploy / 部署**
    - Click **Save and Deploy**. Cloudflare will build and deploy your site.
    - 点击 **Save and Deploy**。Cloudflare 将会构建和部署您的网站。

6.  **API Key Configuration / API 密钥配置**
    - **Important**: This application does **not** use Cloudflare's environment variables for API keys.
    - The AI API keys (for Gemini or OpenAI) are configured within the application itself via the **Settings** modal (⚙️ icon).
    - The keys are stored securely in your browser's `localStorage` and are never exposed publicly.
    - **重要提示**: 此应用程序**不**使用 Cloudflare 的环境变量来管理 API 密钥。
    - AI API 密钥（用于 Gemini 或 OpenAI）是在应用程序内部通过**设置**对话框（⚙️ 图标）进行配置的。
    - 密钥安全地存储在您浏览器的 `localStorage` 中，绝不会公开暴露。

---

## 💻 Tech Stack / 技术栈

- **Frontend**: React, TypeScript
- **Visualization**: D3.js (for Character Graph)
- **Styling**: Tailwind CSS
- **Build Tool**: esbuild
