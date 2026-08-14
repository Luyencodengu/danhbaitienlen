# Game Tiến Lên Miền Nam – bản Android ngang

Phiên bản dùng HTML, CSS và JavaScript thuần. Người chơi đấu với 3 máy, không cần cài thư viện và giao diện đã được tối ưu cho điện thoại Android ở chế độ màn hình ngang.

## Chạy game

1. Mở thư mục `tien-len-mien-nam-android` bằng Visual Studio Code.
2. Cài tiện ích **Live Server** nếu máy chưa có.
3. Nhấn chuột phải vào `index.html` và chọn **Open with Live Server**.

Bạn cũng có thể mở trực tiếp `index.html`, nhưng Live Server giúp cập nhật giao diện ngay sau khi lưu code.

## Thử trên điện thoại Android

1. Cho máy tính và điện thoại dùng chung Wi-Fi.
2. Chạy game bằng Live Server trên máy tính.
3. Tìm địa chỉ IPv4 của máy tính bằng lệnh `ipconfig`.
4. Trên điện thoại, mở địa chỉ dạng `http://192.168.1.10:5500` rồi xoay ngang màn hình.

Hãy thay `192.168.1.10` bằng IPv4 thật của máy tính. Bản này có vùng an toàn cho máy có tai thỏ, nút điều khiển cảm ứng và thông báo xoay ngang màn hình.

## Cấu trúc

- `index.html`: giao diện bàn chơi và các hộp thoại.
- `manifest.webmanifest`: cấu hình hiển thị toàn màn hình và ưu tiên hướng ngang.
- `css/style.css`: toàn bộ giao diện, lá bài và responsive.
- `js/cards.js`: tạo, xáo, chia và sắp xếp bài.
- `js/rules.js`: nhận diện bộ bài và so sánh nước đánh.
- `js/bot.js`: tìm và chọn nước đi cho máy.
- `js/ui.js`: hiển thị bàn chơi và xử lý giao diện.
- `js/game.js`: điều khiển lượt, bỏ lượt và kết thúc ván.

Các thư mục trong `assets` được để sẵn cho ảnh và âm thanh khi nâng cấp game.
