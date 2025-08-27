# 协作规范

本指南旨在为所有参与本项目的人员提供一套协作标准，确保代码和文档的一致性、可读性和可维护性。

## Git Commit 提交规范
采用 **Conventional Commits** 风格，格式：
```
<type>(scope): <subject>

- <body>
```
- **type**：feat / fix / docs / style / refactor / perf / test / chore / build / ci / revert
- **scope**：可选，说明影响范围，如 `datasets`、`whitepaper`
- **subject**：一句话描述，不超过 50 字符，使用祈使句（如"添加了.../修改了..."）
- **body**：可选，说明修改原因、对比或参考等，用空行隔开


### type 含义速查
| type | 含义 | 典型场景 |
|------|------|-----------|
| feat | 新功能 | 新增模块、接口、脚本 |
| fix | Bug 修复 | 修正逻辑错误、边界条件 |
| docs | 文档 | 修改 README、设计文档 |
| style | 代码格式 | 空格、缩进、删除未用变量（不影响逻辑）|
| refactor | 代码重构 | 重组结构、优化设计（非功能/性能变更）|
| perf | 性能优化 | 提升速度、内存、I/O 效率 |
| test | 测试 | 新增/更新单元或集成测试 |
| chore | 杂务 | 更新依赖、脚本、配置文件 |
| build | 构建 | 修改构建流程、打包脚本 |
| ci | 持续集成 | 修改 GitHub Actions、Jenkins 配置 |
| revert | 回滚 | 撤销先前一次提交或回滚功能 |

> **建议**：`<subject>` 与 `<body>` 使用简体中文，保持沟通一致性；但 `<type>` 必须使用表格所示的英文小写关键词，以符合 Conventional Commits 规范。

中文示例：
```
fix(system_design): 修正时序图链接失效

- 时序图文件重命名导致 README 内部链接无法跳转，更新引用路径并测试通过。
```

## 语言与注释规范
- **统一语言**: 为确保团队内部沟通效率，所有代码注释、文档字符串 (Docstrings) 及各类说明文档，原则上均使用**简体中文**编写。
- **中英混用**: 当涉及到特定的技术术语、库名称或配置项时，可以直接使用英文原文，无需翻译（如 `model`, `API`, `LangChain`）。

## 分支与合并规范

### 本仓库（文档仓库）
为最大化文档编写和更新的效率，**本仓库的所有修改，无论大小，可以直接在 `main` 分支上进行**。

- **工作流程**:
    1. 在本地修改前，请务必先执行 `git pull`，确保您的 `main` 分支与远程保持同步，避免冲突。
    2. 完成修改后，直接向 `main` 分支推送 (`git push`) 您的提交。
    3. 提交时，严格遵循前述的 [Git Commit 提交规范](#git-commit-提交规范)，确保变更历史清晰可追溯。

### 其他代码仓库
对于本项目的其他**代码仓库**，必须遵循以 `dev` 分支为核心的 Pull Request (PR) 流程，以保证代码质量和协作效率。

-   **`main` 分支**: 受保护的**发布分支**，只接收来自 `dev` 分支的合并，**严禁直接修改**。
-   **`dev` 分支**: 主**开发分支**，汇集所有已完成的功能和修复，是发起 PR 的目标分支。

**标准开发流程**:
1.  **创建任务分支**: 当你开始开发新任务时，请从 `dev` 分支签出一个新分支，分支名应清晰地反映任务内容（如 `feature/user-authentication` 或 `fix/login-bug`）。
    ```bash
    # 切换到 dev 分支并拉取最新代码
    git checkout dev
    git pull
    # 基于 dev 创建你的任务分支
    git checkout -b feature/your-task-name
    ```
2.  **开发与提交**: 在你的任务分支上完成开发，并进行本地提交。
3.  **推送分支**: 完成任务后，将你的任务分支推送到远程仓库。
    ```bash
    git push origin feature/your-task-name
    ```
4.  **发起 Pull Request**:
    -   在代码仓库的网页界面上，从你的任务分支向 `dev` 分支发起一个 Pull Request。
    -   请为 PR 撰写清晰的标题和描述，如果有关联的任务或 Issue，请一并附上链接。
5.  **代码审查与合并**:
    -   为提高开发效率，在确保代码质量的前提下，允许 **PR 发起人自行审查并合并** 自己的 Pull Request。
    -   **责任**: 在合并前，您有责任：
        -   再次确认代码符合所有项目规范。
        -   确保功能已完整测试，不会引入新的 Bug。
        -   检查是否存在不必要的代码或文件。
    -   确认无误后，自行将 PR 合并到 `dev` 分支，并**删除**已被合并的远程任务分支。

> **一句话总结**：本文档库推 `main`，代码库走 PR 到 `dev`。

## 文件命名规范
1. **英文小写 + 连字符 `-`**，避免空格与特殊字符。
2. 日期使用 `YYYYMMDD` ，如 `20250521-announcement.md`。
3. 多版本文件后缀 `v1`、`v2`，避免使用"final""new"。
4. 数据集文件统一使用下划线 `_` 分隔，如 `ospf_logs_cleaned.jsonl`。

> 备注：官方原始文件（如赛事通知、赛题 PDF、官方手册等）可直接使用原文件名，无需遵循上述命名规范。

## 启用 Git LFS
仓库已预置 `.gitattributes` 并追踪常见大文件：PDF、PPT、MP4、数据压缩包等。

团队成员在首次克隆仓库后，需要进行本地环境设置。

启用步骤：
```bash
# 安装（仅首次）
# macOS (Homebrew)
brew install git-lfs

# Windows (任选其一)
choco install git-lfs             # Chocolatey
winget install --id GitHub.GitLFS -e # Winget
# 或从 https://git-lfs.github.com 下载安装包

# 初始化 LFS（安装后仅在仓库根执行一次）
git lfs install
```
查看 LFS 文件列表：
```bash
git lfs ls-files
```

如需追踪新类型文件：
```bash
git lfs track "*.ext"
```
提交 `.gitattributes` 即生效。

---
如对协作规范有疑问或需调整，请及时联系。 