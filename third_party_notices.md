# THIRD-PARTY NOTICES

Các tệp mã nguồn của NASA SMART FARM được cấp phép theo MIT License trong tệp `LICENSE`. Những thư viện/font bên dưới vẫn giữ giấy phép riêng của chủ sở hữu; MIT của dự án không thay thế hoặc mở rộng giấy phép của chúng.

## TrackAsia GL JS 2.0.1

- Thành phần sử dụng: SDK bản đồ vector WebGL trong trình duyệt.
- Nguồn tải khi chạy: `https://unpkg.com/trackasia-gl@2.0.1/dist/trackasia-gl.js` và `trackasia-gl.css`.
- Giấy phép SDK: BSD 3-Clause (BSD-3-Clause), theo thông tin gói npm 2.0.1.
- Trang gói và thông tin giấy phép: https://www.npmjs.com/package/trackasia-gl
- Kho mã nguồn upstream: https://github.com/track-asia/trackasia-gl-js

**Lưu ý:** Giấy phép BSD-3-Clause áp dụng cho SDK `trackasia-gl`, không tự cấp quyền sử dụng dữ liệu bản đồ, vector tiles, style hoặc các API của TrackAsia. Các dịch vụ dữ liệu này chịu điều khoản của nhà cung cấp và phải được ghi công theo yêu cầu tương ứng.

## Three.js 0.128.0 (r128) và OrbitControls

- Thành phần sử dụng: Three.js core (`three.min.js`) và addon `OrbitControls.js` để dựng/điều khiển mô hình 3D.
- Nguồn tải khi chạy: `cdn.jsdelivr.net/npm/three@0.128.0/`.
- Giấy phép: MIT License.
- Chủ thể bản quyền upstream: three.js authors, 2010–2021.
- Giấy phép upstream đúng phiên bản: https://github.com/mrdoob/three.js/blob/r128/LICENSE

Thông báo MIT của Three.js:

```text
The MIT License

Copyright © 2010-2021 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Be Vietnam Pro (Google Fonts)

- Thành phần sử dụng: họ font Be Vietnam Pro, các trọng số 400, 500, 600, 700 và 800.
- Cách sử dụng: tải stylesheet và font từ Google Fonts khi trang chạy; tệp font không được đóng gói trong ZIP này.
- Chủ thể bản quyền: Copyright 2021 The Be Vietnam Pro Project Authors.
- Giấy phép font: SIL Open Font License 1.1 (OFL-1.1); đây là giấy phép font, không phải giấy phép mã nguồn của ứng dụng.
- Tệp giấy phép upstream: https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt

## Phạm vi và các dịch vụ ngoài

Gói website không vendor/đóng kèm mã nguồn của TrackAsia GL JS, Three.js hoặc tệp font; trình duyệt tải chúng từ các CDN/Google Fonts nêu trên. Nếu chuyển các thành phần này vào gói offline hoặc phân phối tệp font/thư viện cục bộ, phải giữ kèm thông báo và toàn văn giấy phép upstream tương ứng.

Các dịch vụ/nguồn dữ liệu như Open-Meteo, NASA POWER/SMAP, TrackAsia Maps/REST API, FAO, SoilGrids và Copernicus DEM không phải thư viện mã nguồn được cấp phép theo MIT của dự án. Mỗi nguồn có điều khoản dữ liệu/dịch vụ và yêu cầu ghi công riêng; xem tab **Nguồn dữ liệu** và README. Không được hiểu MIT License của dự án là giấy phép lại dữ liệu, ảnh bản đồ, tài liệu khoa học hoặc API của các bên đó.

## Kiểm kê mã nguồn trong gói

| Thành phần | Nguồn | Giấy phép |
|---|---|---|
| Mã nguồn gốc: `index.html`, `styles.css`, `app.js`, tài liệu dự án | NASA SMART FARM project contributors | MIT License (OSI-approved) |
| TrackAsia GL JS 2.0.1 (JS + CSS) | CDN `unpkg.com` | BSD-3-Clause |
| Three.js 0.128.0 và OrbitControls | CDN `jsdelivr.net` | MIT License |
| Be Vietnam Pro | Google Fonts | SIL Open Font License 1.1 |

Ngoài TrackAsia GL JS, Three.js/OrbitControls và Be Vietnam Pro, không phát hiện framework JavaScript/CSS nào khác được nạp trực tiếp trong `index.html` của bản này. Các API/dịch vụ ngoài được kê khai riêng tại tab **Nguồn dữ liệu**.


## Open-Meteo service and weather data

The application uses the Open-Meteo Forecast API as an external service. API data are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Required attribution is displayed next to forecast outputs and links to Open-Meteo and the licence. The free API is for non-commercial use subject to current rate limits and terms: https://open-meteo.com/en/terms . Data licence: https://creativecommons.org/licenses/by/4.0/ . The Open-Meteo API service/data licence is separate from the MIT licence of this project.
