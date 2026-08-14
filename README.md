# superpowers-cline

CLI để cài đặt và tự động cập nhật **Superpowers skills** cho **Cline**.

[Superpowers](https://github.com/obra/superpowers) là bộ skills (methodology) cho coding agents: brainstorming, TDD, systematic-debugging, subagent-driven-development, v.v. CLI này clone upstream, copy skills vào Cline, và giúp bạn cập nhật khi upstream có bản mới — không cần copy thủ công, không bị outdate.

## Tính năng

- **install** — clone upstream `obra/superpowers` và cài skills vào `~/.cline/skills/` (global).
- **install-project** — cài skills vào `.cline/skills/` trong project hiện tại (workaround cho IDE extension không detect global skills).
- **update** — `git pull` upstream rồi đồng bộ lại global skills.
- **status** — xem commit hiện tại, có bản mới không, danh sách skills đã cài.
- **uninstall** — gỡ global skills do CLI này cài (không đụng skill khác của bạn).
- **uninstall-project** — gỡ project skills do CLI này cài.
- **Wrapper Cline-specific** — skill `using-superpowers` được thay bằng bản tối ưu cho Cline (hướng dẫn dùng `use_skill`, `use_subagents`, slash commands).

## Cài đặt

```bash
# Từ thư mục dự án này
npm link          # tạo lệnh `supcline` dùng được toàn cục
```

Hoặc chạy trực tiếp:

```bash
node bin/cli.js install
```

## Sử dụng

```bash
# Cài global (mọi project)
supcline install

# Cài vào project hiện tại (khi IDE không detect global skills)
cd /path/to/project
supcline install-project

# Cập nhật / kiểm tra / gỡ
supcline update
supcline status
supcline uninstall
supcline uninstall-project
supcline help
```

## Khi nào dùng global vs project

- **Global** (`install`): cài vào `~/.cline/skills/`, dùng cho mọi project. Hoạt động tốt với Cline CLI.
- **Project** (`install-project`): cài vào `<project>/.cline/skills/`, dùng khi IDE extension (Antigravity/VS Code) không detect được global skills. Cần chạy lại cho từng project.

## Cấu trúc

```
superpowers-cline/
├── bin/cli.js                # entry point
├── src/
│   ├── commands/             # install / install-project / update / status / uninstall / uninstall-project
│   ├── lib/                  # config, repo (git), sync (copy + manifest)
│   └── wrapper/
│       └── using-superpowers/  # skill wrapper Cline-specific
└── package.json
```

## Dữ liệu CLI

- Cache repo: `~/.superpowers-cline/repo`
- Manifest global: `~/.superpowers-cline/manifest.json`
- Config (nguồn, đường dẫn): `~/.superpowers-cline/config.json`
- Skills global: `~/.cline/skills/`
- Skills project: `<project>/.cline/skills/` + manifest tại `<project>/.cline/superpowers-manifest.json`

## Đổi nguồn sang fork (tùy chọn)

Mặc định dùng thẳng upstream `obra/superpowers`. Muốn dùng fork riêng, sửa `sourceUrl` trong `~/.superpowers-cline/config.json` rồi chạy lại `install`.

## License

MIT
