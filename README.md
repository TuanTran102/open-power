# superpowers-cline

CLI để cài đặt và tự động cập nhật **Superpowers skills** cho **Cline**.

[Superpowers](https://github.com/obra/superpowers) là bộ skills (methodology) cho coding agents: brainstorming, TDD, systematic-debugging, subagent-driven-development, v.v. CLI này clone upstream, copy skills vào `~/.cline/skills/` (global), và giúp bạn cập nhật khi upstream có bản mới — không cần copy thủ công, không bị outdate.

## Tính năng

- **install** — clone upstream `obra/superpowers` và cài skills vào `~/.cline/skills/`.
- **update** — `git pull` upstream rồi đồng bộ lại skills.
- **status** — xem commit hiện tại, có bản mới không, danh sách skills đã cài.
- **uninstall** — gỡ đúng các skills do CLI này cài (không đụng skill khác của bạn).
- **Wrapper Cline-specific** — skill `using-superpowers` được thay bằng bản tối ưu cho Cline (hướng dẫn dùng `use_skill`, `use_subagents`, slash commands).

## Cài đặt

```bash
# Từ thư mục dự án này
npm link          # tạo lệnh `superpowers-cline` dùng được toàn cục
```

Hoặc chạy trực tiếp:

```bash
node bin/cli.js install
```

## Sử dụng

```bash
superpowers-cline install     # cài lần đầu (global)
superpowers-cline update      # cập nhật khi có bản mới
superpowers-cline status      # kiểm tra version & skills
superpowers-cline uninstall   # gỡ cài
superpowers-cline help        # xem trợ giúp
```

## Cấu trúc

```
superpowers-cline/
├── bin/cli.js                # entry point
├── src/
│   ├── commands/             # install / update / status / uninstall
│   ├── lib/                  # config, repo (git), sync (copy + manifest)
│   └── wrapper/
│       └── using-superpowers/  # skill wrapper Cline-specific
└── package.json
```

## Dữ liệu CLI

- Cache repo: `~/.superpowers-cline/repo`
- Manifest (danh sách skills đã cài): `~/.superpowers-cline/manifest.json`
- Config (nguồn, đường dẫn): `~/.superpowers-cline/config.json`
- Skills cài vào: `~/.cline/skills/`

## Đổi nguồn sang fork (tùy chọn)

Mặc định dùng thẳng upstream `obra/superpowers`. Muốn dùng fork riêng, sửa `sourceUrl` trong `~/.superpowers-cline/config.json` rồi chạy lại `install`.

## License

MIT
