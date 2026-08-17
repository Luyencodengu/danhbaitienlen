# Sảnh Game Bài Việt

Ứng dụng HTML, CSS và JavaScript thuần, tối ưu cho máy tính và điện thoại Android nằm ngang. Không cần cài thư viện.

## Trò chơi

- **Tiến Lên Miền Nam:** một người đấu với ba máy; bài chọn được đưa lên khay riêng.
- **Spider Solitaire:** Dễ dùng một chất, Siêu khó dùng bốn chất.
- **FreeCell Solitaire:** Dễ có sáu ô trống, Siêu khó có bốn ô chuẩn.
- **Chơi cùng bạn bè:** 2–4 người chuyền cùng một thiết bị; màn hình che bài giữa các lượt.

## Token và độ khó

Ba trò chơi với máy dùng chung số dư lưu trong `localStorage`:

- Dễ: thắng `+40.000`, thua `−10.000` token.
- Siêu khó: thắng `+400.000`, thua `−100.000` token.
- Bàn bạn bè không cộng hoặc trừ token.

Số dư khởi đầu là `100.000` token và không thể xuống dưới 0.

## Chạy thử

1. Mở thư mục bằng Visual Studio Code.
2. Nhấn chuột phải `index.html`.
3. Chọn **Open with Live Server**.

## Đưa bản cập nhật lên GitHub

Trong Terminal của repository, chạy:

```powershell
git add .
git commit -m "Nang cap sanh game bai"
git push origin master
```

GitHub Pages sẽ tự cập nhật sau khi lệnh `push` thành công.

## Tệp chính

- `index.html`: sảnh, bốn màn hình game và các hộp hướng dẫn.
- `css/style.css`: giao diện, responsive, lá bài và khay bài đã chọn.
- `js/portal.js`: điều hướng, ví token, độ khó và phần thưởng.
- `js/game.js`, `js/ui.js`, `js/bot.js`: Tiến Lên với máy.
- `js/spider.js`: luật và trạng thái Spider.
- `js/freecell.js`: luật và trạng thái FreeCell.
- `js/friends.js`: Tiến Lên chuyền thiết bị.

Chế độ phòng online bằng mã chưa nằm trong bản GitHub Pages vì cần máy chủ để đồng bộ bài và lượt chơi.
