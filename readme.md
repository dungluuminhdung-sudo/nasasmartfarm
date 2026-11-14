# NASA SMART FARM — TrackAsia Guided Demo 1.2.7-fixed (nền 1.2.7)

## Kế thừa bản sửa giao diện 1.2.2
- Đồng bộ kích thước nhiệt độ thấp và cao trong thẻ dự báo.
- Tách kiểu chữ của nhiệt độ, dấu phân cách và lượng mưa để giá trị 16°/17° không còn bị thu nhỏ bởi quy tắc CSS chung.

Ứng dụng là website tĩnh; các tệp chạy chính gồm `index.html`, `styles.css`, `app.js` và `config.js`. `README.md`, `LICENSE` và `THIRD_PARTY_NOTICES.md` là tài liệu và hồ sơ cấp phép đi kèm. Bản tham khảo 1.2.7 dùng TrackAsia cho bản đồ và tra cứu địa điểm/reverse-geocoding, đồng thời có Live Demo toàn website với điều khiển; đồng thời giữ hồ sơ giấy phép mã nguồn mở và các cải tiến của bản 1.2.3.

> Công cụ hỗ trợ tham khảo dựa trên dữ liệu môi trường, hồ sơ khu vườn và bộ quy tắc nông học. Các quyết định mùa vụ cần đối chiếu số đo thực địa và hướng dẫn kỹ thuật tại địa phương.


## Bản hiệu chỉnh kỹ thuật 1.2.7-fixed

Bản ZIP này được sửa trực tiếp từ mã nguồn 1.2.7. Đây là bản hiệu chỉnh mô phỏng 3D và kiểm thử, không phải bản ghép từ các đoạn `index.html`/`styles.css` rời.

- Đồng bộ `instanceMatrix` và `instanceColor` của các `InstancedMesh` trước khi kết xuất; cập nhật bounding box/sphere sau khi đặt cây, tán, cành và quả.
- Mô hình dự phòng Canvas dùng cùng tỷ lệ mét → pixel cho kích thước thân và tán cây; thao tác chọn cây tính cả dịch chuyển ngang/dọc và vẽ lại vòng chọn.
- Làm mới vùng chọn khi hồ sơ/kích thước cây thay đổi; bảo vệ kích thước khung kết xuất khi phần tử tạm thời có chiều rộng/chiều cao bằng 0.
- Có đường dự phòng thay `ResizeObserver` bằng sự kiện `window.resize` khi trình duyệt không hỗ trợ API này.
- Giữ nguyên nguyên tắc bản đồ nhiệt: ưu tiên ít nhất 3 điểm đo thủ công không thẳng hàng; nếu chỉ có SMAP thì thể hiện giá trị tham chiếu theo ô lưới khoảng 9 km, không nội suy giả thành số đo từng luống.

### Kết quả kiểm tra trong môi trường phát triển

- `node --check app.js`: đạt.
- Bộ tự kiểm tra trong ứng dụng: **90/90 đạt**.
- Chromium desktop: khởi tạo Canvas fallback, chọn cây, đổi góc nhìn/lớp đất và trạng thái bản đồ nhiệt không có dữ liệu; bản đồ nhiệt tạo canvas khi có 3 điểm đo thủ công không thẳng hàng.
- Chromium mobile 390 px: mô hình Canvas hiển thị với kích thước đo được và không tràn ngang trang.
- Kiểm tra cú pháp CSS: 645 quy tắc được phân tích, không có lỗi cú pháp.

**Giới hạn kiểm thử:** môi trường này không tải được CDN bên ngoài, nên chưa chạy trực tiếp WebGL/Three.js với GPU. Phần đồng bộ buffer đã được kiểm tra tĩnh và qua bộ tự kiểm tra; trước khi trình diễn chính thức, cần mở bản deploy bằng HTTPS trên trình duyệt có WebGL và kiểm tra tương tác 3D thực tế.


## Bản hoàn thiện Live Demo và ghi công Open-Meteo

- Thu gọn bảng điều khiển Live Demo ngay khi bắt đầu; có nút mở/thu gọn riêng để không che thông tin trong trang.
- Mỗi lần bắt đầu hoặc chạy lại Live Demo tạo hồ sơ canh tác mẫu mới trong bộ nhớ phiên. Hồ sơ thật được chụp trước tour và khôi phục khi thoát/kết thúc; không lưu dữ liệu mẫu vào LocalStorage.
- Demo đi lần lượt qua 9 phân hệ. Với Tổng quan, Vị trí, Hồ sơ, Digital Twin, Đề xuất cây, Luân canh/xen canh, Kế hoạch, Trợ lý và Nguồn dữ liệu, trang được cuộn theo từng đoạn từ đầu xuống cuối thay vì nhảy thẳng đến phần tử cuối. Các trường mẫu có khoảng dừng khoảng 0,55 giây sau khi nhập xong.
- Bước Đề xuất cây hiển thị mục tiêu và xếp hạng #1–#8; demo đổi mục tiêu để minh họa kết quả thay đổi. Bước Luân canh/xen canh giới thiệu cả trường hợp cây hàng năm và vườn cây lâu năm, kèm lịch sử, mùa vụ, mục tiêu, đất, nước, địa hình và dự báo khi có dữ liệu.
- Trợ lý giữ xuống dòng và khoảng cách giữa các nhóm thông tin bằng `white-space: pre-wrap`.
- Bổ sung ghi công Open-Meteo cạnh các vùng dự báo, có lựa chọn tiếng Việt (VI) và tiếng Anh (EN). Ghi công liên kết tới Open-Meteo và giấy phép CC BY 4.0, đồng thời nêu rõ dữ liệu được định dạng/biến đổi trong ứng dụng.
- URL Open-Meteo trong ứng dụng tiếp tục được tạo động theo tọa độ vị trí đã xác nhận. URL mẫu có tọa độ cố định chỉ tham chiếu đúng vị trí được ghi trong query.

**Lưu ý Open-Meteo:** Free API chỉ dùng cho mục đích phi thương mại theo điều khoản hiện hành và có giới hạn lượt gọi. Việc có hiển thị dòng ghi công không tự động cấp quyền dùng API miễn phí cho mục đích thương mại. Xem [Terms of Use](https://open-meteo.com/en/terms) và [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

### Kiểm tra cho bản Live Demo bilingual

- `node --check app.js`: đạt.
- Bộ kiểm thử logic trong ứng dụng: **90/90 đạt**, thực thi trong Node VM với lớp DOM giả lập cho các phần kiểm thử không cần trình duyệt.
- Phân tích `styles.css` bằng tinycss2: 645 quy tắc, 0 lỗi cú pháp.
- Kiểm tra trình duyệt tích hợp cho hoạt ảnh cuộn, WebGL/CDN và API thật chưa được chạy lại trong lượt đóng gói này; cần smoke-test trên bản HTTPS sau khi deploy.


## Giấy phép mã nguồn mở (Open Source License)

**Mã nguồn gốc của NASA SMART FARM được phát hành theo MIT License (SPDX: `MIT`), là giấy phép được Open Source Initiative (OSI) công nhận.** Phạm vi mã nguồn gốc gồm `index.html`, `styles.css` và `app.js`; tài liệu dự án đi kèm. Toàn văn giấy phép nằm trong tệp [`LICENSE`](./LICENSE).

### Thư viện và tài nguyên phần mềm bên thứ ba

| Thành phần | Phiên bản/cách dùng | Giấy phép | Vai trò |
|---|---|---|---|
| TrackAsia GL JS | 2.0.1, tải từ unpkg CDN | BSD-3-Clause | Bản đồ vector WebGL |
| Three.js | 0.128.0 (r128), tải từ jsDelivr CDN | MIT License | Kết xuất mô hình vườn 3D |
| OrbitControls | Bản đi kèm Three.js 0.128.0 | MIT License (cùng giấy phép Three.js r128) | Điều khiển góc nhìn mô hình 3D |
| Be Vietnam Pro | Tải từ Google Fonts; dùng các trọng số 400/500/600/700/800 | SIL Open Font License 1.1 (OFL-1.1) | Kiểu chữ giao diện |

Thông báo bản quyền, điều khoản và liên kết giấy phép upstream được lưu trong [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md). Gói triển khai hiện không chứa bản sao cục bộ của các thư viện hoặc tệp font; trình duyệt tải chúng từ các địa chỉ CDN/Google Fonts ghi trong `index.html`.

### Phân biệt mã nguồn với dữ liệu và dịch vụ

MIT License của dự án **không** cấp lại quyền đối với API, dữ liệu khí tượng/vệ tinh, ảnh nền bản đồ, tài liệu khoa học hoặc nội dung của bên thứ ba. Open-Meteo, NASA POWER/SMAP, TrackAsia Maps/REST API, FAO, SoilGrids và Copernicus DEM được sử dụng như các nguồn/dịch vụ ngoài và có điều khoản, giấy phép dữ liệu, yêu cầu ghi công riêng. Các mục đó được liệt kê tại tab **Nguồn dữ liệu**; cần tuân thủ điều khoản của nhà cung cấp tương ứng.

> MIT là giấy phép của phần mã nguồn do dự án phát hành. Giấy phép TrackAsia GL JS, Three.js và Be Vietnam Pro vẫn áp dụng riêng cho từng thành phần của họ.

> Trước khi công bố, nhóm cần xác nhận có quyền cấp phép MIT đối với toàn bộ phần mã nguồn gốc được liệt kê; nếu có đoạn mã do bên thứ ba cung cấp, phải giữ nguyên giấy phép và thông báo tương ứng.

### Kê khai sử dụng công cụ AI

Trong quá trình phát triển và hoàn thiện dự án, nhóm có sử dụng **ChatGPT (OpenAI)** và **Google Gemini** làm công cụ hỗ trợ. Các công cụ này được dùng để trao đổi và rà soát giải pháp kỹ thuật, hỗ trợ đọc/giải thích mã nguồn, gợi ý phát hiện và sửa lỗi, góp ý cấu trúc giao diện, cũng như kiểm tra cách trình bày tài liệu và thông tin giấy phép.

Các kết quả do AI gợi ý đều được nhóm xem xét, lựa chọn, chỉnh sửa và kiểm tra trước khi đưa vào dự án. Nhóm trực tiếp chịu trách nhiệm về kiến trúc sản phẩm, lựa chọn và diễn giải nguồn dữ liệu, quy tắc nông học, logic chức năng, kiểm thử và quyết định cuối cùng đối với nội dung được phát hành.

ChatGPT và Gemini được kê khai là **công cụ hỗ trợ trong quá trình phát triển**; bản website này không gọi API ChatGPT hoặc Gemini khi vận hành. Trợ lý trong website hiện sử dụng các quy tắc xử lý được triển khai trong mã nguồn.

### Ghi chú về chú thích phiên bản trong CSS

Các chú thích trong `styles.css` mô tả những vòng lặp cải tiến chức năng nội bộ (bố cục Digital Twin, dữ liệu, hồ sơ, tư vấn, bản đồ nhiệt và kế hoạch cây trồng). Các số hiệu phiên bản cũ đã được lược bỏ khỏi chú thích để tránh nhầm với số phiên bản phát hành. Chú thích CSS không phải nhật ký commit và không tự xác định ngày một tính năng được hoàn thành.

## Đưa website lên Netlify

1. Giải nén ZIP.
2. Mở Netlify, chọn đúng site cần cập nhật → **Deploys** → **Deploy manually**.
3. Kéo thả toàn bộ thư mục dự án, gồm các tệp chạy chính, `LICENSE` và `THIRD_PARTY_NOTICES.md` để giữ đủ thông tin cấp phép.
4. Muốn giữ URL cũ, cần deploy vào đúng site hiện có.

Đây là static site. Các API dữ liệu công khai hiện cấu hình không yêu cầu API key. GPS cần HTTPS/localhost và quyền vị trí trình duyệt. Internet cần để tải thư viện, ảnh nền và dữ liệu API.

## Những thay đổi chính trong 1.2.4

- Chuẩn hóa và xác nhận sáu tên tệp triển khai: `index.html`, `app.js`, `styles.css`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`.
- Kê khai ChatGPT và Google Gemini là công cụ AI hỗ trợ phát triển trong README và tab Nguồn dữ liệu.
- Lược bỏ số hiệu phiên bản cũ khỏi chú thích CSS và thay bằng mô tả chức năng/iteration nội bộ.

- Bổ sung MIT License cho mã nguồn dự án và kê khai riêng giấy phép TrackAsia GL JS, Three.js/OrbitControls, Be Vietnam Pro.
- Thêm `LICENSE` và `THIRD_PARTY_NOTICES.md`; tab Nguồn dữ liệu có liên kết tới các giấy phép.
- Rút gọn nội dung giao diện; ưu tiên trạng thái dữ liệu và việc cần làm.
- Bỏ câu tự mô tả, lời hứa hệ thống và ghi chú kỹ thuật lặp lại ở các màn hình.
- Giữ cảnh báo có ý nghĩa trực tiếp như độ phân giải dữ liệu SMAP, ET₀ tham chiếu và nguồn dữ liệu mô hình.

### 1. Sửa NASA POWER `-999`

- Giá trị `-999` và các sentinel không hợp lệ (nhỏ hơn `-900`) được coi là dữ liệu thiếu, không phải số đo.
- Bức xạ `ALLSKY_SFC_SW_DWN` đọc đơn vị từ metadata API. Nếu metadata không trả đơn vị, cấu hình `community=AG` dùng mặc định `MJ/m²/ngày`; không còn gắn nhãn kWh cố định.
- Mỗi tham số lấy bản ghi hợp lệ gần nhất của chính tham số đó. Ngày bản ghi được hiển thị riêng theo từng tham số.
- Nếu không có bản ghi bức xạ hợp lệ, giao diện hiển thị **Không có dữ liệu**, nêu rõ mã `-999` và không đưa giá trị thiếu vào biểu đồ hay phép tính.

NASA POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/  
NASA POWER FAQ: https://power.larc.nasa.gov/docs/faqs/data/  
NASA POWER parameter dictionary: https://power.larc.nasa.gov/parameters/

### 2. Bộ lập kế hoạch “Luân canh & xen canh”

Tab mới cho phép người dùng nhập tùy chọn:

- Cây đang trồng hoặc cây vụ gần nhất; có lựa chọn hiện tại chưa trồng cây.
- Kiểu hệ thống: cây hàng năm hay vườn cây lâu năm.
- Vụ hiện tại/vụ gần nhất và vụ dự kiến tiếp theo.
- Lịch sử 2–3 vụ (mỗi dòng `năm/vụ: cây trồng`).
- Mục tiêu chính, mục tiêu cây xen/phủ và vấn đề cần ưu tiên.
- Ghi chú thực địa: giống, ngày gieo/thu hoạch, sâu bệnh, tưới và các thông tin đã biết.

Dữ liệu được tự lưu cục bộ trên trình duyệt. Các trường không biết có thể để trống.

**Luân canh** được tách riêng khỏi **xen canh**:

- Luân canh: sàng lọc cây trồng cho vụ kế tiếp, ưu tiên khác họ với cây vừa trồng và giảm ưu tiên khi một họ cây lặp nhiều vụ.
- Xen canh/cây phủ: đề xuất nhóm cây trồng cùng thời gian hoặc dải sinh cảnh, đồng thời nêu lợi ích có thể có và điều kiện khiến phương án không phù hợp.
- Với vườn cây lâu năm như na, website không tự đề xuất nhổ/thay cây chính; tập trung đánh giá cây phủ đất và dải sinh cảnh. Nếu lịch sử gần nhất có cây lâu năm và người dùng chưa chọn kiểu hệ thống, bộ máy sẽ suy luận đây là vườn lâu năm; người dùng có thể chọn rõ hệ cây hàng năm khi khu đất đã được chuyển đổi.
- Khi chưa có cây hiện tại/lịch sử, danh sách ứng viên lấy từ Smart Advisor và được gắn nhãn là sàng lọc sơ bộ, chưa phải khuyến nghị thời vụ đã xác minh. Nếu người dùng chọn hệ cây hàng năm, các cây ăn quả lâu năm như chuối, dừa, thanh long và mắc ca được loại khỏi danh sách vụ hàng năm.
- Dự báo Open-Meteo 7 ngày chỉ thêm cảnh báo tác nghiệp ngắn hạn (ví dụ nhiều ngày nóng, ET₀ cao hoặc mưa nhiều kết hợp thoát nước kém). Nó **không** chứng minh cây trồng phù hợp cho toàn bộ mùa vụ.

Điểm cây là điểm ưu tiên của quy tắc, không phải xác suất thành công, năng suất hay lợi nhuận. Ứng dụng chưa tự tải lịch gieo trồng cấp xã/huyện; người dùng cần đối chiếu FAO Crop Calendar và tài liệu khuyến nông địa phương.

### 3. Cây xen/cây phủ và giới hạn bằng chứng

- **Cỏ lạc dại (*Arachis pintoi*):** có nghiên cứu tại Việt Nam trong hệ thống hồ tiêu Tây Nguyên về sinh khối, che phủ và đóng góp dinh dưỡng. Đây không phải bằng chứng trực tiếp cho mọi vườn na; cần thử diện tích nhỏ và kiểm tra cạnh tranh nước/ánh sáng.
- **Dải cây họ đậu ngắn ngày:** có thể đa dạng hóa hệ cây và tạo sinh khối; lượng N thực sự được cố định/phần còn lại cho cây chính phụ thuộc giống, nốt sần, sinh khối và cách quản lý tàn dư. Không giả định N chuyển ngay sang cây bên cạnh.
- **Dải hoa bản địa:** chỉ là ý tưởng sinh cảnh; phải chọn loài phù hợp sinh thái địa phương, không xâm lấn và không trở thành ký chủ của sâu bệnh.
- **Cúc vạn thọ (*Tagetes*):** không được gợi ý như cây xua rệp/nhện đỏ hay cây xen trừ sâu phổ quát. UC IPM cho biết một số giống có thể ức chế một số tuyến trùng trong luống trồng dày; trồng xen dưới cây thường không kiểm soát tuyến trùng tốt. Trong app, mục này chỉ hiện khi người dùng cho biết đã xác định vấn đề tuyến trùng.
- **Sắn xen đậu xanh/lạc:** liên kết tài liệu khuyến nông Việt Nam mô tả kỹ thuật ở một số vùng miền Trung; không tự áp dụng lịch/khoảng cách đó cho các tỉnh khác.

### 4. Trợ lý và kiểm thử

- Trợ lý có thể tạo bản tóm tắt chuỗi cây trồng dựa trên cùng dữ liệu của tab luân canh/xen canh.
- Live Demo 1.2.7 đi qua đủ 9 phân hệ, có tạm dừng/tiếp tục/bước tiếp/chạy lại/thoát; dữ liệu mẫu chỉ ở bộ nhớ phiên và được khôi phục sau tour.
- Không thêm mục/menu “Kiểm tra hệ thống” vào giao diện người dùng. Cơ chế self-test chỉ dùng nội bộ khi phát triển qua tham số `?selftest`.

## Giới hạn và cách diễn giải

- T2M/RH2M là nhiệt độ/độ ẩm không khí, không phải độ ẩm đất.
- NASA POWER là dữ liệu lưới, không phải phép đo trong vườn nhỏ; địa hình phức tạp có thể làm giá trị khác điều kiện tại thửa.
- Dự báo 7 ngày không thể đại diện cả mùa vụ. Ứng dụng không chốt lịch gieo hoặc cây phù hợp địa phương nếu chưa có lịch mùa vụ/giống/khuyến cáo tương ứng.
- Với vườn cây lâu năm, bộ lập kế hoạch giữ cây chính và đánh giá cây phủ/dải sinh cảnh; không đề xuất phá bỏ cây hiện hữu chỉ từ dữ liệu khí tượng.
- Họ thực vật được nhận diện từ tên người dùng nhập; tên địa phương/giống lạ có thể chưa phân loại được và sẽ hiển thị “Chưa nhận diện”.
- Tài liệu cỏ lạc dại là bằng chứng ở hệ thống cây lâu năm khác tại Việt Nam, không khẳng định hiệu quả tương tự trên na Chi Lăng.
- Điểm ưu tiên phản ánh mức phù hợp theo hồ sơ, không dự báo năng suất hay thu nhập.

## Bản đồ

Bản tham khảo 1.2.7 thay bản đồ cũ bằng TrackAsia Streets v2, detailLevel=full. Photon, Open-Meteo Geocoding, Leaflet và Esri World Imagery đã được gỡ khỏi luồng bản đồ. API key TrackAsia được cấu hình trong `config.js` của bản tham khảo. Khóa phía trình duyệt có thể xuất hiện trong yêu cầu mạng; cần giới hạn domain và quota trong tài khoản TrackAsia.

## Nguồn dữ liệu và tài liệu nông học

### Khí tượng, vệ tinh và vị trí
- Open-Meteo Forecast API: https://open-meteo.com/en/docs
- Open-Meteo Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- NASA POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA POWER Climatology API: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
- NASA POWER Hydrology / SMAP: https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/
- NASA POWER FAQ: https://power.larc.nasa.gov/docs/faqs/data/
- NASA POWER Parameter Dictionary: https://power.larc.nasa.gov/parameters/
- GPS accuracy (MDN): https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy
- TrackAsia Reverse Geocoding v2: https://docs.track-asia.com/vi/api-integration/reverse-geocoding/v2/

### Bản đồ và thư viện
- TrackAsia GL JS: https://docs.track-asia.com/vi/guides/
- TrackAsia Autocomplete v2: https://docs.track-asia.com/vi/api-integration/autocomplete/v2/
- TrackAsia Search v2: https://docs.track-asia.com/vi/api-integration/search/v2/
- TrackAsia Place Details v2: https://docs.track-asia.com/vi/api-integration/place-detail/v2/
- Three.js: https://threejs.org/manual/#en/installation
- TrackAsia GL JS package (BSD-3-Clause): https://www.npmjs.com/package/trackasia-gl

### Luân canh, xen canh và IPM
- FAO – Crop Calendar Việt Nam: https://www.fao.org/agriculture/crops/information-resources/vn/
- FAO – How to IPM: https://www.fao.org/agriculture/crops/thematic-sitemap/theme/compendium/tools-guidelines/how-to-ipm/en/
- FAO – Species diversification and crop rotation: https://www.fao.org/conservation-agriculture/in-practice/species-diversification/en/
- FAO – Crop planning and management in organic agriculture: https://www.fao.org/family-farming/detail/en/c/1617788/
- WASI – *Arachis pintoi* xen trong vườn hồ tiêu Tây Nguyên: https://wasi.org.vn/en/effect-of-arachis-pintoi-intercropped-with-black-pepper-plantations-in-the-central-highlands/
- UC IPM – Nematodes and marigold limitations: https://ipm.ucanr.edu/home-and-landscape/nematodes/
- Việt Nam – kỹ thuật xen đậu xanh và sắn ở một số vùng miền Trung: https://agro.gov.vn/vn/tID8046_Ky-thuat-trong-xen-canh-dau-xanh-va-san.html

### Nông học và đất
- FAO – nhu cầu nước tưới: https://www.fao.org/4/S2022E/s2022e08.htm
- FAO GAEZ: https://www.fao.org/land-water/resources/tools/databases/gaez/en
- FAO ECOCROP: https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en
- SoilGrids: https://isric.org/explore/soilgrids
- Copernicus DEM: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- EPA – IPM principles: https://www.epa.gov/safepestcontrol/integrated-pest-management-ipm-principles

### Tài liệu địa phương Lạng Sơn
- Sở NN&MT Lạng Sơn – tài liệu phát triển nông/lâm nghiệp 2026–2030: https://sonnmt.langson.gov.vn/tin-tuc-su-kien/tai-lieu-phat-trien-nong-lam-nghiep-giai-doan-2026-2030-tren-dia-ban-tinh-lang-son.html
- Hướng dẫn cây na: https://sonnmt.langson.gov.vn/upload/105376/fck/stnmtls/C%C3%A2y%20Na.pdf
- Hướng dẫn cây quýt: https://sonnmt.langson.gov.vn/upload/105376/fck/stnmtls/C%C3%A2y%20Qu%C3%BDt.pdf
- Hướng dẫn cây hồi: https://sonnmt.langson.gov.vn/thong-tin-chuyen-nganh2/trong-trot-bao-ve-thuc-vat/huong-dan-ky-thuat-nhan-giong-trong-cham-soc-cay-hoi-tren-dia-ban-tinh-lang-son.html

## Tự động cập nhật

- Open-Meteo: kiểm tra mỗi 60 phút khi website đang mở.
- NASA POWER Daily/SMAP: kiểm tra mỗi 24 giờ khi website đang mở.
- NASA POWER Climatology: kiểm tra mỗi 30 ngày khi website đang mở.
- Khi quay lại tab, website kiểm tra nguồn nào đã đến hạn.
- Website lưu riêng thời điểm trình duyệt nhận dữ liệu và mốc dữ liệu nguồn.
- Khi đóng trình duyệt, static site không có tiến trình nền; dữ liệu chỉ đồng bộ khi mở lại.

Các chu kỳ là lịch kiểm tra của trình duyệt, không đảm bảo nguồn phát hành dữ liệu mới ở mỗi lần.

## Quyền riêng tư

- Hồ sơ, lịch sử cây trồng và ghi chú được lưu cục bộ trên trình duyệt bằng LocalStorage.
- Không có đăng nhập, đồng bộ đa thiết bị hoặc database server trong bản này.
- Vị trí chỉ được dùng sau khi người dùng xác nhận điểm tham chiếu; GPS cần quyền trình duyệt.
- Xuất JSON để sao lưu; xóa dữ liệu trình duyệt có thể làm mất bản lưu cục bộ.

## Kiểm thử phát triển

Bản phát hành giữ self-test logic nội bộ qua `?selftest`; không có trang/menu kiểm tra hệ thống trong giao diện người dùng. Trong môi trường đóng gói, 64/64 kiểm thử logic đã đạt; `node --check` cho JavaScript đạt; CSS được phân tích cú pháp không có lỗi; HTML đã được kiểm tra cấu trúc, có đủ 9 mục điều hướng và tab luân canh. Không thể khởi chạy trình duyệt tự động trong môi trường này do chính sách chặn trang cục bộ, vì vậy chưa xác nhận hiển thị trực quan trên Chrome/Edge/điện thoại hoặc kết nối API ngoài thực tế. Kiểm thử logic không thể xác nhận dữ liệu nông học tại từng vườn.

## Cấu trúc gói

```text
NASA_SMART_FARM_FIELD_SHIFT_1_2_4/
├── index.html
├── styles.css
├── app.js
├── config.js
├── README.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```


## TrackAsia – cấu hình bản đồ (bản tham khảo 1.2.7)

Bản này nạp TrackAsia GL JS 2.0.1 và style Streets v2 với `detailLevel=full`. Các nhãn tên địa điểm, đường và địa giới được hiển thị theo dữ liệu của TrackAsia và mức zoom; không đảm bảo mọi nhãn xuất hiện đồng thời ở mọi mức zoom.

### Cấu hình API key

1. Mở `config.js`.
2. Bản tham khảo này đã được cấu hình bằng khóa bạn cung cấp trong `config.js`.
3. Khóa được gửi từ trình duyệt trong yêu cầu style/API, vì vậy người xem có thể thấy nó trong Network tab. Hãy giới hạn domain, quota và phạm vi API trong tài khoản TrackAsia.
4. Nếu đã chia sẻ khóa công khai, hãy thu hồi và thay bằng khóa mới đã giới hạn domain.
5. Tải website qua HTTPS hoặc localhost.

Không dùng khóa phía trình duyệt như mật khẩu bí mật hoặc khóa quản trị tài khoản.

### API được gọi

- Map style: `https://maps.track-asia.com/styles/v2/streets.json` với `detailLevel=full`.
- Autocomplete: `https://maps.track-asia.com/api/v2/place/autocomplete/json`.
- Place Details: `https://maps.track-asia.com/api/v2/place/details/json`.
- Reverse Geocoding: `https://maps.track-asia.com/api/v2/geocode/json`, dùng `new_admin=true` và `include_old_admin=true`.

SDK TrackAsia GL JS 2.0.1 được công bố theo BSD-3-Clause. Giấy phép SDK không thay thế điều khoản dịch vụ/dữ liệu bản đồ TrackAsia. Kiểm tra điều khoản của tài khoản và dịch vụ trước khi triển khai công khai.

## Trạng thái của gói này

**Đây là bản tham khảo kỹ thuật, không phải xác nhận đủ điều kiện dự thi và không phải hồ sơ nộp NASA Space Apps Challenge.** Nó được tạo từ prototype đã có trước sự kiện để người dùng xem thử hướng thay đổi. Không dùng ngày phát hành của gói này để suy diễn thời điểm phát triển các tính năng cốt lõi hoặc thay thế việc khai báo lịch sử thực tế với ban tổ chức.


## Live Demo – hướng dẫn trải nghiệm toàn website (1.2.7)

Nút **Live Demo** trên thanh đầu trang chạy một chuyến tham quan qua 9 phân hệ: Tổng quan → Vị trí & môi trường → Hồ sơ canh tác → Thiết kế vườn 3D → Đề xuất cây trồng → Luân canh & xen canh → Kế hoạch canh tác → Trợ lý thông minh → Nguồn dữ liệu.

- Khi bắt đầu tour và chưa có vị trí đã xác nhận, trình duyệt yêu cầu quyền GPS. Nếu đã có vị trí, tour không yêu cầu GPS lại. Nếu chưa có vị trí đã xác nhận, tour hiển thị trạng thái trống của Tổng quan rồi chuyển tới bước định vị và chờ người xem kiểm tra, bấm xác nhận; nếu GPS không nhận được, người xem có thể tự lấy GPS, tìm địa danh, chọn trên bản đồ hoặc nhập tọa độ. Tour không tự tạo vị trí fallback.
- Sau khi vị trí được xác nhận, ứng dụng gọi luồng tải dữ liệu hiện có cho Open-Meteo Forecast, NASA POWER Daily, NASA POWER Hydrology và NASA POWER Climatology. Tour chờ tối đa 42 giây trước khi tiếp tục; dữ liệu trả về muộn có thể cập nhật sau đó. Nguồn lỗi được hiển thị theo trạng thái của từng mô-đun, không tạo số liệu thay thế.
- Hồ sơ và lịch sử luân canh là dữ liệu minh họa, được nhập qua các trường và bộ phân tích hiện có. Các trường này chỉ ở bộ nhớ phiên; `save()` và `persistFreshness()` bị khóa trong khi demo chạy.
- Có các điều khiển **Tạm dừng**, **Tiếp tục**, **Bước tiếp**, **Chạy lại** và **Thoát**. Tạm dừng giữ vị trí cuộn và tiến trình nhập; Bước tiếp bỏ phần còn lại của nhiệm vụ hiện tại để sang bước sau (yêu cầu dữ liệu đã gửi có thể hoàn tất ở nền). Chạy lại bắt đầu từ đầu nhưng giữ nguyên bản chụp dữ liệu ban đầu. Nếu người xem thao tác trực tiếp trong nội dung, tour tự tạm dừng; riêng thao tác tìm/chọn/xác nhận vị trí khi tour đang chờ xác nhận được phép tiếp tục.
- Khi kết thúc hoặc thoát, tour khôi phục trạng thái ứng dụng ban đầu và trở về Tổng quan. Dữ liệu hồ sơ thật trong LocalStorage không bị thay bằng dữ liệu mẫu.
- Nếu người xem đóng/tải lại trang giữa phiên, dữ liệu mẫu chưa được ghi vào LocalStorage; khi tải lại ứng dụng sẽ đọc hồ sơ thật như trước khi bắt đầu.
- Trợ lý trong demo là bộ xử lý quy tắc hiện có của ứng dụng, không phải dịch vụ AI hội thoại từ xa.

Live Demo là chế độ trình diễn, không thay thế việc người dùng tự xác nhận vị trí hoặc đo đạc thực địa. Dữ liệu mẫu được gắn nhãn trong bảng điều khiển trình diễn.


### Thay đổi trong 1.2.7

- Nếu chưa có vị trí đã xác nhận, Live Demo giới thiệu trạng thái trống ở Tổng quan, chuyển tới trang định vị, lấy GPS nếu được cấp quyền và chờ người xem kiểm tra rồi bấm xác nhận; không tự chấp nhận vị trí và không tạo tọa độ fallback. Nếu đã có vị trí, không yêu cầu GPS lại.
- Sau khi có vị trí, Live Demo quay về Tổng quan và cuộn tuần tự từ đầu đến hết nội dung, bao gồm chỉ số hiện tại, dự báo 7 ngày, NASA POWER, bảng mô phỏng tác động và lối tắt; chỉ chuyển phân hệ sau khi đã tới cuối trang.
- Nhập hồ sơ mẫu chậm hơn: trường số gõ từng ký tự với nhịp riêng và mọi trường nghỉ ít nhất 550 ms sau khi hoàn tất; sau khi nhập xong, tour cuộn lại toàn bộ biểu mẫu trước khi chuyển bước.
- Các thao tác GPS/tìm kiếm/chọn vị trí/xác nhận trong khi tour đang chờ xác nhận không tự làm tạm dừng tour. Nút Bước tiếp, Tạm dừng, Tiếp tục, Chạy lại và Thoát vẫn có tác dụng.
- Sau khi xác nhận vị trí, tour chờ các nguồn môi trường hoàn tất hoặc hết thời gian chờ trước khi cuộn Tổng quan.

### Thay đổi kế thừa từ 1.2.6

- Khôi phục Live Demo dưới dạng tour tương tác toàn website; không chỉ chuyển tab mà còn nhập hồ sơ minh họa, chạy mô hình 3D, cập nhật mục tiêu đề xuất, dựng kết quả luân canh và gửi câu hỏi qua trợ lý quy tắc hiện có.
- Dùng dữ liệu API hiện có cho bước thời tiết/NASA; trạng thái lỗi được lấy từ các mô-đun dữ liệu. Khi GPS không khả dụng, tour chờ người xem dùng tìm kiếm địa điểm, chọn trên bản đồ hoặc nhập tọa độ; không tự tạo tọa độ thay thế.
- Bổ sung tạm dừng, tiếp tục, bước tiếp, chạy lại và thoát. GPS chỉ được yêu cầu khi chưa có vị trí đã xác nhận; thao tác tìm/chọn/xác nhận vị trí trong lúc tour chờ xác nhận không tự tạm dừng. Các thao tác thủ công khác trong nội dung sẽ tạm dừng tour. Khi thoát/kết thúc, trạng thái ứng dụng được khôi phục và trang trở về Tổng quan.
- Chặn ghi hồ sơ/freshness vào LocalStorage trong suốt phiên demo; chặn xuất hồ sơ mẫu; bộ đếm trường trong hồ sơ cập nhật theo lúc nhập và thanh đầu trang hiển thị trạng thái “Demo · không lưu mẫu”.
- Giải phóng tài nguyên mô hình 3D khi rời trang để tránh vòng lặp WebGL chạy nền trong các bước tiếp theo.


## Open-Meteo attribution and API terms

Forecast outputs displayed in the app are attributed next to forecast panels using the link text `Weather data by Open-Meteo.com`. The app includes a Vietnamese/English attribution switch and links to the CC BY 4.0 data licence. Values are formatted for display and may be used in derived reference calculations; attribution does not imply endorsement.

The public Free API is limited to non-commercial use and rate limits under Open-Meteo's current Terms of Use. Commercial deployments must review the current terms and use an appropriate plan. See https://open-meteo.com/en/terms and https://creativecommons.org/licenses/by/4.0/.

## Live Demo behavior

Each new Live Demo run starts from a blank temporary farm profile. The previous user state is snapshotted and restored when the tour exits. Page sections are introduced from top to bottom with paced scrolling. The demo data is not saved to local storage.
