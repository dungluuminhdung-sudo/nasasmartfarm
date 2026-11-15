(() => {
  'use strict';
  const KEY = 'nasa-smart-farm-profile-v1';
  const LOC_KEY = `${KEY}-location`;
  const PENDING_LOC_KEY = `${KEY}-pending-location`;
  const FRESH_KEY = `${KEY}-freshness`;
  const ROT_KEY = `${KEY}-rotation-v1`;
  const TRACKASIA_CONFIG = window.TRACKASIA_CONFIG || {apiKey:''};
  const TRACKASIA_KEY = String(TRACKASIA_CONFIG.apiKey || '').trim();
  const WEATHER_REFRESH_MS = 60 * 60 * 1000; // Kiểm tra Open-Meteo mỗi 60 phút khi trang đang mở
  const POWER_REFRESH_MS = 24 * 60 * 60 * 1000; // Kiểm tra NASA POWER mỗi 24 giờ
  const CLIMATE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000; // Khí hậu nền dài hạn, kiểm tra mỗi 30 ngày
  const WEATHER_RETRY_MS = 15 * 60 * 1000;
  const POWER_RETRY_MS = 60 * 60 * 1000;
  const savedFreshness = safeRead(FRESH_KEY, {}) || {};
  const CREDIT_LANG_KEY = `${KEY}-openmeteo-credit-language`;
  let openMeteoCreditLanguage = safeRead(CREDIT_LANG_KEY, 'vi') === 'en' ? 'en' : 'vi';
  const storedLocation = safeRead(LOC_KEY, null);
  const legacyLocation = storedLocation && !storedLocation.confirmedAt ? {...storedLocation, label:storedLocation.label||'Vị trí đã lưu từ phiên bản trước', address:storedLocation.address||'', lookupStatus:storedLocation.address?'done':'loading'} : null;
  const SRC = {
    forecastDocs: 'https://open-meteo.com/en/docs',
    forecastApi: 'https://api.open-meteo.com/v1/forecast',
    trackasiaDocs: 'https://docs.track-asia.com/vi/guides/',
    trackasiaSdk: 'https://www.npmjs.com/package/trackasia-gl',
    trackasiaAutocomplete: 'https://docs.track-asia.com/vi/api-integration/autocomplete/v2/',
    trackasiaSearch: 'https://docs.track-asia.com/vi/api-integration/search/v2/',
    trackasiaReverse: 'https://docs.track-asia.com/vi/api-integration/reverse-geocoding/v2/',
    trackasiaDetails: 'https://docs.track-asia.com/vi/api-integration/place-detail/v2/',
    powerDocs: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/',
    powerFaq: 'https://power.larc.nasa.gov/docs/faqs/data/',
    powerParams: 'https://power.larc.nasa.gov/parameters/',
    gps: 'https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy',
    three: 'https://threejs.org/manual/#en/installation',
    lsCrop: 'https://sonnmt.langson.gov.vn/tin-tuc-su-kien/tai-lieu-phat-trien-nong-lam-nghiep-giai-doan-2026-2030-tren-dia-ban-tinh-lang-son.html',
    naGuide: 'https://sonnmt.langson.gov.vn/upload/105376/fck/stnmtls/C%C3%A2y%20Na.pdf',
    quytGuide: 'https://sonnmt.langson.gov.vn/upload/105376/fck/stnmtls/C%C3%A2y%20Qu%C3%BDt.pdf',
    hồi: 'https://sonnmt.langson.gov.vn/thong-tin-chuyen-nganh2/trong-trot-bao-ve-thuc-vat/huong-dan-ky-thuat-nhan-giong-trong-cham-soc-cay-hoi-tren-dia-ban-tinh-lang-son.html',
    na: 'https://khuyennongvn.gov.vn/thong-tin-thi-truong/thi-truong-trong-nuoc/lang-son-cong-bo-va-trao-chung-nhan-ma-so-vung-trong-na-tai-huyen-chi-lang-nam-2020-20416.html',
    fao: 'https://www.fao.org/4/X0490E/X0490E00.htm',
    gaez: 'https://www.fao.org/land-water/resources/tools/databases/gaez/en',
    gaezPortal: 'https://gaez.fao.org/',
    ecocrop: 'https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en',
    ecocropSearch: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/home',
    powerClimate: 'https://power.larc.nasa.gov/docs/services/api/temporal/climatology/',
    soilgrids: 'https://isric.org/explore/soilgrids',
    copernicusDem: 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM',
    openMeteoHome: 'https://open-meteo.com/',
    openMeteoTerms: 'https://open-meteo.com/en/terms',
    openMeteoLicense: 'https://creativecommons.org/licenses/by/4.0/',
    nasaHydrology: 'https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/',
    faoWater: 'https://www.fao.org/4/s2022e/s2022e08.htm',
    ipmMeta: 'https://www.nature.com/articles/s43247-025-02643-0',
    pushPullReview: 'https://pubmed.ncbi.nlm.nih.gov/38069785/',
    arachisVietnam: 'https://wasi.org.vn/hieu-qua-cua-cay-lac-dai-arachis-pintoi-trong-che-tu-dat-tren-vuon-ho-tieu-tai-tay-nguyen/',
    arachisStudy: 'https://www.sciencedirect.com/science/article/pii/S0048969718346473',
    epaIPM: 'https://www.epa.gov/safepestcontrol/integrated-pest-management-ipm-principles',
    faoCropCalendar: 'https://www.fao.org/agriculture/crops/information-resources/vn/',
    faoRotation: 'https://www.fao.org/agriculture/crops/thematic-sitemap/theme/compendium/tools-guidelines/how-to-ipm/en/',
    faoDiversification: 'https://www.fao.org/conservation-agriculture/in-practice/species-diversification/en/',
    ucMarigold: 'https://ipm.ucanr.edu/home-and-landscape/nematodes/',
    vnCassavaIntercrop: 'https://agro.gov.vn/vn/tID8046_Ky-thuat-trong-xen-canh-dau-xanh-va-san.html'
  };
  const NAV = [
    ['overview','Tổng quan','⌂'],['location','Vị trí & môi trường','◎'],['profile','Hồ sơ canh tác','▤'],
    ['farm3d','Thiết kế vườn 3D','♧'],['advisor','Đề xuất cây trồng','♣'],['rotation','Luân canh & xen canh','↻'],['plan','Kế hoạch canh tác','◷'],
    ['assistant','Trợ lý thông minh','✳'],['sources','Nguồn dữ liệu','↗']
  ];
  const rotationDefaults={currentCrop:'',currentCropOther:'',systemType:'',currentSeason:'',nextSeason:'',historyText:'',mainGoal:'',intercropGoal:'all',problem:'',notes:''};
  const blankProfile = {
    farmName:'',area:'',width:'',length:'',shape:'',crop:'',treeVariety:'',treeCount:'',layoutMode:'',spacing:'',plantSpacing:'',rowSpacing:'',growthStage:'',treeAge:'',treeHeight:'',crownWidth:'',
    soilType:'',soilPH:'',soilMoisture:'',soilTexture:'',drainage:'',organicMatter:'',soilDepth:'',soilFertility:'',
    terrain:'',slope:'',aspect:'',elevation:'',waterSource:'',waterAvailability:'',irrigationMethod:'',lastWatering:'',drainageSystem:'',
    purpose:'',investment:'',labor:'',market:'',risk:'',notes:'',
    heat1:'',heat2:'',heat3:'',heat4:'',heat5:'',heat6:'',heat7:'',heat8:'',heat9:''
  };
  const groups = [
    {title:'Thông tin khu vườn',desc:'Diện tích, hình dạng và quy mô vườn.',fields:[
      ['farmName','Tên khu vườn','text','Ví dụ: Vườn na phía đồi'],['area','Diện tích (m²)','number','Ví dụ: 2.000'],['width','Chiều rộng (m)','number','Nếu chưa biết, để trống'],['length','Chiều dài (m)','number','Nếu chưa biết, để trống'],['shape','Hình dạng khu đất','select','',[['rectangle','Hình chữ nhật'],['square','Hình vuông'],['other','Hình dạng khác']]]]},
    {title:'Cây trồng',desc:'Loại cây, giống và mật độ trồng.',fields:[
      ['crop','Loại cây trồng','text','Ví dụ: na, hồi, quýt'],['treeCount','Số lượng cây','number',''],['layoutMode','Cách bố trí cây','select','',[['count','Giữ đúng số lượng cây'],['spacing','Tính theo khoảng cách']]],['spacing','Khoảng cách chung (m)','number','Dùng khi chưa tách khoảng cách hàng/cây'],['plantSpacing','Khoảng cách cây trong hàng (m)','number',''],['rowSpacing','Khoảng cách giữa các hàng (m)','number',''],['growthStage','Giai đoạn sinh trưởng','text','Ví dụ: cây con, ra hoa, nuôi quả'],['treeAge','Tuổi cây (năm)','number',''],['treeVariety','Giống cây','text','Để trống nếu chưa biết tên giống'],['treeHeight','Chiều cao cây đo thực tế (m)','number','Nhập số đo thực tế'],['crownWidth','Đường kính tán đo thực tế (m)','number','Nhập số đo thực tế']]},
    {title:'Đất canh tác',desc:'Loại đất, pH, độ ẩm và khả năng thoát nước.',fields:[
      ['soilType','Loại đất','select','',[['clay','Đất sét'],['loam','Đất thịt'],['sandy','Đất cát'],['alluvial','Đất phù sa'],['red-yellow','Đất feralit đỏ vàng'],['mixed','Đất pha'],['other','Khác']]],
      ['soilPH','Độ pH','number','Ví dụ: 6,2'],['soilMoisture','Độ ẩm đất theo thiết bị (%)','number','Chỉ nhập nếu có số đo'],['soilTexture','Kết cấu đất','text','Ví dụ: tơi, chặt, nhiều đá'],
      ['drainage','Khả năng thoát nước','select','',[['fast','Nhanh'],['medium','Trung bình'],['slow','Chậm / dễ úng']]],['organicMatter','Chất hữu cơ','text','Nếu có kết quả phân tích đất'],['soilDepth','Độ sâu tầng đất (cm)','number','Để trống nếu chưa khảo sát'],['soilFertility','Đánh giá độ phì','text','Theo kết quả kiểm tra đất']]},
    {title:'Địa hình',desc:'Dạng địa hình, độ dốc và hướng sườn.',fields:[
      ['terrain','Dạng địa hình','select','',[['hill','Đồi'],['slope','Sườn dốc'],['valley','Thung lũng'],['plain','Đồng bằng'],['terrace','Ruộng bậc thang'],['other','Khác']]],['slope','Độ dốc (% hoặc độ)','text','Ví dụ: 12% hoặc 8°'],
      ['aspect','Hướng sườn','select','',[['N','Bắc'],['NE','Đông Bắc'],['E','Đông'],['SE','Đông Nam'],['S','Nam'],['SW','Tây Nam'],['W','Tây'],['NW','Tây Bắc']]],['elevation','Độ cao (m)','number','']]},
    {title:'Nguồn nước & tưới tiêu',desc:'Nguồn nước, khả năng cấp nước và phương pháp tưới.',fields:[
      ['waterSource','Nguồn nước','text','Ví dụ: giếng, suối, ao, hồ'],['waterAvailability','Khả năng cung cấp nước','select','',[['reliable','Chủ động'],['seasonal','Theo mùa'],['limited','Hạn chế']]],['irrigationMethod','Phương pháp tưới','text','Ví dụ: nhỏ giọt, phun, thủ công'],['lastWatering','Lần tưới gần nhất','date',''],['drainageSystem','Hệ thống thoát nước','text','Mô tả hệ thống thoát nước']]},
    {title:'Mục tiêu & nguồn lực',desc:'Mục tiêu, vốn, nhân lực và đầu ra.',fields:[
      ['purpose','Mục đích canh tác','select','',[['income','Tăng thu nhập'],['household','Phục vụ gia đình'],['low-water','Ưu tiên ít nước'],['sustainable','Bền vững lâu dài'],['mixed','Kết hợp nhiều mục tiêu']]],['investment','Mức vốn đầu tư','select','',[['low','Thấp'],['medium','Trung bình'],['high','Cao']]],['labor','Công chăm sóc có thể bố trí','select','',[['low','Ít'],['medium','Vừa'],['high','Nhiều']]],['market','Kênh tiêu thụ dự kiến','text','Ví dụ: HTX, thương lái, chợ địa phương'],['risk','Mức chấp nhận rủi ro','select','',[['low','Thấp'],['medium','Trung bình'],['high','Cao']]],['notes','Ghi chú khác','textarea','Bạn muốn lưu thêm điều gì?']]},
    {title:'Điểm đo cho bản đồ nhiệt',desc:'Nhập ít nhất 3 điểm đo độ ẩm đất tại vườn.',fields:[
      ['heat1','Góc Tây Bắc – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat2','Giữa cạnh Bắc – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat3','Góc Đông Bắc – độ ẩm đất (%)','number','Chỉ nhập số đo'],
      ['heat4','Giữa cạnh Tây – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat5','Tâm vườn – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat6','Giữa cạnh Đông – độ ẩm đất (%)','number','Chỉ nhập số đo'],
      ['heat7','Góc Tây Nam – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat8','Giữa cạnh Nam – độ ẩm đất (%)','number','Chỉ nhập số đo'],['heat9','Góc Đông Nam – độ ẩm đất (%)','number','Chỉ nhập số đo']] }
  ];
  const state = {
    page:legacyLocation?'location':'overview', profile:{...blankProfile,...safeRead(KEY, {})}, location:storedLocation?.confirmedAt?storedLocation:null, locationCandidate:safeRead(PENDING_LOC_KEY,legacyLocation), reverseLookupKey:null, candidateLookupKey:null, weather:null, power:null,
    weatherError:'', powerError:'', loading:false, weatherLoading:false, powerLoading:false, updatedAt:null, weatherFetchedAt:savedFreshness.weatherFetchedAt||null, powerFetchedAt:savedFreshness.powerFetchedAt||null, weatherAttemptAt:savedFreshness.weatherAttemptAt||null, powerAttemptAt:savedFreshness.powerAttemptAt||null, weatherDataTime:savedFreshness.weatherDataTime||null, powerDataDate:savedFreshness.powerDataDate||null, climateFetchedAt:savedFreshness.climateFetchedAt||null, climateAttemptAt:savedFreshness.climateAttemptAt||null, searchResults:[], assistant:[{role:'assistant',text:'Xin chào! Bạn có thể hỏi về thời tiết, đất, cây trồng, nước tưới và sâu bệnh tại vườn.'}],
    farmView:'orbit', farmMode:'simulation', heatmapMetric:'root', profileOpenGroup:null, goal: safeRead(KEY, {})?.purpose||'mixed', sceneLayers:{plants:true,cover:true,terrain:true,soil:true,irrigation:true,dimensions:true,rows:true,labels:true}, selectedTree:null, climate:null, climateError:'', climateLoading:false,
    soilPower:null, soilPowerError:'', soilPowerLoading:false, soilPowerFetchedAt:null, soilPowerAttemptAt:null,
    impact:{areaHa:'',coverPct:60,kc:0.85,efficiency:70,evapReduction:15,biomass:1.48,nContent:2.18,ndfa:60,baselineSprays:'',ipmAdoption:75},
    rotation:{...rotationDefaults,...(safeRead(ROT_KEY,{})||{})}
  };
  const liveDemo = {
    active:false, starting:false, paused:false, skipRequested:false, runId:0, index:-1,
    snapshot:null, gpsPromise:null, status:'', collapsed:true,
    internal:false, startedAt:null,
    waitingForLocationConfirm:false, locationConfirmed:false
  };
  const DEMO_PROFILE = {
    farmName:'Vườn trình diễn Field Shift', area:'2000', width:'40', length:'50', shape:'rectangle',
    crop:'Na', treeCount:'80', layoutMode:'count', treeAge:'5', growthStage:'Nuôi quả',
    soilType:'loam', soilPH:'6.1', drainage:'medium', terrain:'hill', slope:'12%', aspect:'SE',
    waterSource:'Ao chứa nước', waterAvailability:'seasonal', irrigationMethod:'Tưới nhỏ giọt',
    purpose:'income', investment:'medium', labor:'medium', market:'Hợp tác xã / thương lái địa phương'
  };
  const DEMO_TYPE_TEXT_MS = 48;
  const DEMO_TYPE_NUMBER_MS = 135;
  const DEMO_FIELD_PAUSE_MS = 550;
  const DEMO_SCROLL_HOLD_MS = 1650;
  const DEMO_STEPS = [
    {id:'overview',title:'Tổng quan',page:'overview',description:'Nếu chưa có vị trí, xác định và chờ xác nhận. Nếu đã có, xem toàn bộ nhiệt độ, độ ẩm, mưa, dự báo và dữ liệu NASA từ đầu đến cuối.',target:'#content',duration:0},
    {id:'location',title:'Bản đồ & vị trí vườn',page:'location',description:'Xem vị trí đã xác nhận, địa chỉ TrackAsia, ghim bản đồ và các nguồn môi trường tại khu vực.',target:'#map',duration:5200},
    {id:'profile',title:'Hồ sơ canh tác',page:'profile',description:'Nhập lần lượt hồ sơ minh họa. Dữ liệu trong chuyến tham quan không ghi đè hồ sơ thật.',target:'.profile-accordion-list',duration:1800},
    {id:'farm3d',title:'Thiết kế vườn 3D',page:'farm3d',description:'Dựng mô hình từ diện tích, cây trồng, đất và địa hình trong hồ sơ.',target:'.scene',duration:12000},
    {id:'advisor',title:'Đề xuất cây trồng',page:'advisor',description:'So sánh thứ tự cây theo mục tiêu canh tác và điều kiện khu vườn.',target:'.candidate-grid',duration:8500},
    {id:'rotation',title:'Luân canh & xen canh',page:'rotation',description:'Xem phương án vụ tiếp theo, cây phủ đất và cây trồng xen từ hồ sơ minh họa.',target:'#rotationResults',duration:9000},
    {id:'plan',title:'Kế hoạch canh tác',page:'plan',description:'Đối chiếu dự báo mưa, nhiệt độ và ET₀ để xem các việc cần theo dõi.',target:'.plan-cards',duration:8500},
    {id:'assistant',title:'Trợ lý thông minh',page:'assistant',description:'Gửi một câu hỏi mẫu và xem câu trả lời được tạo từ dữ liệu đang có.',target:'#chatMessages',duration:9000},
    {id:'sources',title:'Nguồn dữ liệu & giấy phép',page:'sources',description:'Kết thúc bằng danh mục dữ liệu NASA, dịch vụ, thư viện và kê khai AI.',target:'.source-catalog',duration:7000}
  ];

  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const fmt = (v,n=1) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('vi-VN',{maximumFractionDigits:n});
  const today = () => new Date();
  const fmtDate = (d) => new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const toast = (msg) => { const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3000); };
  function safeRead(k, fallback){try{const x=localStorage.getItem(k);return x?JSON.parse(x):fallback;}catch{return fallback;}}
  function save(){if(liveDemo.active)return;localStorage.setItem(KEY,JSON.stringify(state.profile));localStorage.setItem(LOC_KEY,JSON.stringify(state.location));localStorage.setItem(PENDING_LOC_KEY,JSON.stringify(state.locationCandidate));try{localStorage.setItem(ROT_KEY,JSON.stringify(state.rotation||rotationDefaults));}catch{}}
  function src(name,url,detail=''){return `<span class="source-note"><i class="source-dot"></i>${esc(name)}${detail?` · ${esc(detail)}`:''} <a class="src" href="${esc(url)}" target="_blank" rel="noreferrer">Mở nguồn ↗</a></span>`;}
  function openMeteoAttribution(){
    const en=openMeteoCreditLanguage==='en';
    const title=en?'Weather data attribution':'Ghi công dữ liệu thời tiết';
    const body=en
      ?'Weather forecast data provided by Open-Meteo. NASA SMART FARM formats and presents the returned model data; some values are used in derived reference calculations. This attribution does not imply endorsement by Open-Meteo.'
      :'Dữ liệu dự báo thời tiết do Open-Meteo cung cấp. NASA SMART FARM định dạng và hiển thị lại dữ liệu mô hình; một số giá trị được dùng trong các phép tính tham chiếu. Việc ghi công này không hàm ý Open-Meteo xác nhận hoặc bảo trợ website.';
    const licence=en?'Data licence: Creative Commons Attribution 4.0 International (CC BY 4.0).':'Giấy phép dữ liệu: Creative Commons Ghi công 4.0 Quốc tế (CC BY 4.0).';
    return `<section class="openmeteo-attribution" aria-label="Open-Meteo attribution"><div class="openmeteo-credit-head"><b>${title}</b><div class="openmeteo-lang-switch" role="group" aria-label="Attribution language"><button type="button" data-credit-lang="vi" class="${!en?'active':''}" aria-pressed="${!en}">VI</button><button type="button" data-credit-lang="en" class="${en?'active':''}" aria-pressed="${en}">EN</button></div></div><p>${body}</p><p>${licence}</p><div class="openmeteo-credit-links"><a href="${SRC.openMeteoHome}" target="_blank" rel="noreferrer">${en?'Weather data by Open-Meteo.com ↗':'Dữ liệu thời tiết bởi Open-Meteo.com ↗'}</a><a href="${SRC.openMeteoLicense}" target="_blank" rel="license noreferrer">${en?'CC BY 4.0 ↗':'Giấy phép CC BY 4.0 ↗'}</a></div></section>`;
  }
  function metric(icon,label,value,unit,detail,name,url){return `<div class="metric"><div class="metric-head"><span class="metric-icon">${icon}</span><span class="metric-label">${label}</span></div><div class="metric-value">${value}<small>${unit}</small></div><div class="metric-foot">${detail}</div>${src(name,url)}</div>`;}
  function pageTitle(kicker,title,desc,action=''){return `<div class="page-title"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;}
  function forecastCards(d){if(!d?.time)return `<div class="muted">Chưa có dự báo. Chọn vị trí để tải dữ liệu. <a class="src" href="${SRC.forecastDocs}" target="_blank">Tài liệu API ↗</a></div>`;return `<div class="forecast">${d.time.slice(0,5).map((day,i)=>`<div class="forecast-day"><span>${i===0?'Hôm nay':new Date(day+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short'})}</span><span class="weather-emoji">${Number(d.precipitation_probability_max?.[i]||0)>50?'🌧️':'⛅'}</span><b>${fmt(d.temperature_2m_max?.[i],0)}°</b><small>${fmt(d.precipitation_sum?.[i])} mm mưa</small>${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'dự báo mô hình')}</div>`).join('')}</div>`;}
  function forecastTable(d){if(!d?.time)return `<div class="muted">Chưa có dữ liệu dự báo. <a class="src" href="${SRC.forecastDocs}" target="_blank">Open-Meteo docs ↗</a></div>`;return `<div class="table-scroll"><table class="forecast-table"><thead><tr><th>Ngày</th><th>Nhiệt độ</th><th>Mưa</th><th>Xác suất mưa</th><th>ET₀</th><th>Nguồn</th></tr></thead><tbody>${d.time.map((day,i)=>`<tr><td>${i===0?'Hôm nay':new Date(day+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'})}</td><td>${fmt(d.temperature_2m_min?.[i],0)}–${fmt(d.temperature_2m_max?.[i],0)}°C</td><td>${fmt(d.precipitation_sum?.[i])} mm</td><td>${fmt(d.precipitation_probability_max?.[i],0)}%</td><td>${fmt(d.et0_fao_evapotranspiration?.[i])} mm</td><td>${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'API')}</td></tr>`).join('')}</tbody></table><p class="small-note">ET₀ là nhu cầu bốc thoát hơi tham chiếu; lượng tưới còn phụ thuộc đất, cây và hệ thống tưới. ${src('FAO-56',SRC.fao,'Phương pháp ET₀ và Kc')}</p></div>`;}
  function powerUrl(loc=state.location){if(!loc)return SRC.powerDocs;const end=new Date();end.setDate(end.getDate()-3);const start=new Date(end);start.setDate(start.getDate()-182);const q=new URLSearchParams({parameters:'T2M,T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN',community:'AG',longitude:loc.lon,latitude:loc.lat,start:ymd(start),end:ymd(end),format:'JSON','time-standard':'LST'});return `https://power.larc.nasa.gov/api/temporal/daily/point?${q.toString()}`;}
  function soilPowerUrl(loc=state.location){if(!loc)return SRC.nasaHydrology;const end=new Date();end.setDate(end.getDate()-3);const start=new Date(end);start.setDate(start.getDate()-45);const q=new URLSearchParams({parameters:'SFMC,RZMC,SFMC_PRCNTL,RZMC_PRCNTL',community:'HY',longitude:loc.lon,latitude:loc.lat,start:ymd(start),end:ymd(end),format:'JSON','time-standard':'UTC'});return `https://power.larc.nasa.gov/api/temporal/daily/point?${q.toString()}`;}
  function climateUrl(loc=state.location){if(!loc)return SRC.powerClimate;const q=new URLSearchParams({parameters:'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M',community:'AG',longitude:loc.lon,latitude:loc.lat,format:'JSON'});return `https://power.larc.nasa.gov/api/temporal/climatology/point?${q.toString()}`;}
  function weatherUrl(loc=state.location){if(!loc)return SRC.forecastDocs;const q=new URLSearchParams({latitude:loc.lat,longitude:loc.lon,current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m',models:'best_match',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration',forecast_days:'7',timezone:'auto'});return `${SRC.forecastApi}?${q.toString()}`;}
  function validPowerValue(raw){
    if(raw===null||raw===undefined||(typeof raw==='string'&&!raw.trim()))return null;
    const value=Number(raw);
    // NASA POWER uses -999 as a fill value for unavailable records.
    // Reject impossible sentinels before formatting or using values in calculations.
    return Number.isFinite(value)&&value>-900?value:null;
  }
  function powerValueAt(parameters,key,date){return validPowerValue(parameters?.[key]?.[date]);}
  function latestPowerEntry(data,key){
    const p=data?.properties?.parameter?.[key];if(!p)return null;
    const dates=Object.keys(p).filter(k=>/^\d{8}$/.test(k)).sort().reverse();
    for(const date of dates){const value=validPowerValue(p[date]);if(value!==null)return {date,value};}
    return null;
  }
  function powerRadiationUnit(data){
    const meta=data?.parameters?.ALLSKY_SFC_SW_DWN||data?.parameter_metadata?.ALLSKY_SFC_SW_DWN||{};
    const raw=String(meta.units||meta.unit||'').trim();
    if(raw){return raw.replace(/MJ\s*\/\s*m\^?2\s*\/\s*day/i,'MJ/m²/ngày').replace(/kWh\s*\/\s*m\^?2\s*\/\s*day/i,'kWh/m²/ngày').replace(/W\s*\/\s*m\^?2/i,'W/m²');}
    // For community=AG, NASA POWER surface shortwave radiation is in MJ/m²/day.
    return 'MJ/m²/ngày';
  }
  function latestPower(data){
    const p=data?.properties?.parameter;if(!p)return null;
    const entries={t2m:latestPowerEntry(data,'T2M'),rh:latestPowerEntry(data,'RH2M'),rain:latestPowerEntry(data,'PRECTOTCORR'),wind:latestPowerEntry(data,'WS2M'),rad:latestPowerEntry(data,'ALLSKY_SFC_SW_DWN')};
    const latestEntry=entries.t2m||Object.values(entries).find(Boolean);if(!latestEntry)return null;
    return {date:latestEntry.date,t2m:entries.t2m?.value??null,rh:entries.rh?.value??null,rain:entries.rain?.value??null,wind:entries.wind?.value??null,rad:entries.rad?.value??null,radUnit:powerRadiationUnit(data),entries,radMissingReason:entries.rad?'':'Không có bản ghi bức xạ hợp lệ trong chuỗi NASA POWER đã tải. NASA POWER dùng -999 làm mã thiếu dữ liệu; không xem giá trị này là phép đo bức xạ.'};
  }
  function fmtStamp(value){if(!value)return 'Chưa có';const d=new Date(value);return Number.isNaN(d.getTime())?'Chưa có':d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});}
  function fmtApiLocalTime(value){if(!value)return 'Chưa có';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]} · ${m[4]}:${m[5]}`:esc(value);}
  function relativeStamp(value){if(!value)return 'Chưa nhận dữ liệu';const diff=Math.max(0,Date.now()-new Date(value).getTime());if(!Number.isFinite(diff))return 'Chưa rõ thời điểm';if(diff<60_000)return 'vừa nhận';if(diff<3_600_000)return `${Math.floor(diff/60_000)} phút trước`;if(diff<86_400_000)return `${Math.floor(diff/3_600_000)} giờ trước`;return `${Math.floor(diff/86_400_000)} ngày trước`; }
  function persistFreshness(){if(liveDemo.active)return;try{localStorage.setItem(FRESH_KEY,JSON.stringify({weatherFetchedAt:state.weatherFetchedAt,powerFetchedAt:state.powerFetchedAt,weatherAttemptAt:state.weatherAttemptAt,powerAttemptAt:state.powerAttemptAt,weatherDataTime:state.weatherDataTime,powerDataDate:state.powerDataDate,climateFetchedAt:state.climateFetchedAt,climateAttemptAt:state.climateAttemptAt,soilPowerFetchedAt:state.soilPowerFetchedAt,soilPowerAttemptAt:state.soilPowerAttemptAt}));}catch{}}
  function freshnessSourceCard({name,receivedAt,attemptAt,dataAt,interval,retry,label,href,error,loading}){
    const base=error&&attemptAt?attemptAt:receivedAt;
    const baseDate=base?new Date(base):null;
    const next=baseDate&&!Number.isNaN(baseDate.getTime())?new Date(baseDate.getTime()+(error?retry:interval)):null;
    const overdue=next&&Date.now()>next.getTime();
    const status=loading?'Đang kiểm tra':error?(receivedAt?'Lỗi kết nối · giữ dữ liệu cũ':'Chưa tải được'):receivedAt?(overdue?'Đến chu kỳ kiểm tra':'Đã nhận dữ liệu'):'Chưa có dữ liệu';
    const cls=loading?'checking':error?'error':receivedAt?(overdue?'due':'ok'):'waiting';
    const nextLabel=error?'Thử lại dự kiến': 'Kiểm tra tiếp theo';
    return `<div class="fresh-source-card"><div class="fresh-source-head"><b>${esc(name)}</b><span class="fresh-status ${cls}"><i></i>${status}</span></div><div class="fresh-time-row"><span>Website nhận dữ liệu</span><b>${receivedAt?fmtStamp(receivedAt):'Chưa có'}</b></div><div class="fresh-time-row"><span>Mốc dữ liệu từ nguồn</span><b>${dataAt||'Chưa có'}</b></div><div class="fresh-time-row"><span>${nextLabel}</span><b>${next?fmtStamp(next):'Sau lần tải đầu tiên'}</b></div><div class="fresh-source-foot"><span>${esc(label)}</span><a class="src" href="${esc(href)}" target="_blank" rel="noreferrer">Nguồn ↗</a></div>${error?`<small class="fresh-error">${esc(error)}</small>`:''}</div>`;
  }
  function freshnessPanel(){
    const latest=[state.weatherFetchedAt,state.powerFetchedAt,state.climateFetchedAt].filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0];
    const power=latestPower(state.power);
    const weatherSourceTime=state.weather?.current?.time||state.weatherDataTime;
    const weatherDataAt=weatherSourceTime?fmtApiLocalTime(weatherSourceTime):'Chưa có mốc thời gian';
    const powerDate=power?.date||state.powerDataDate;
    const powerDataAt=powerDate?`${powerDate.slice(6,8)}/${powerDate.slice(4,6)}/${powerDate.slice(0,4)} · bản ghi gần nhất`:'Chưa có bản ghi';
    const active=!!state.location;
    return `<section class="freshness-panel"><div class="freshness-panel-head"><div><div class="eyebrow">DATA FRESHNESS</div><h3>Thời điểm cập nhật dữ liệu</h3><p>Thời điểm tải và ngày ghi nhận từ nguồn.</p></div><span class="auto-refresh-badge"><i></i>${active?'Tự cập nhật':'Chưa chọn vị trí'}</span></div><div class="freshness-summary"><div class="freshness-last"><small>Lần website nhận dữ liệu gần nhất</small><strong>${latest?fmtStamp(latest):'Chưa có dữ liệu'}</strong><span>${latest?relativeStamp(latest):'Chọn vị trí để tải dữ liệu'}</span></div><div class="freshness-policy"><b>Lịch kiểm tra tự động</b><span>Open-Meteo · mỗi 60 phút</span><span>NASA POWER Daily · mỗi 24 giờ</span><span>NASA POWER Climatology · mỗi 30 ngày</span><small>Tự cập nhật khi website đang mở.</small></div></div><div class="freshness-sources">${freshnessSourceCard({name:'Open-Meteo · thời tiết & dự báo',receivedAt:state.weatherFetchedAt,attemptAt:state.weatherAttemptAt,dataAt:weatherDataAt,interval:WEATHER_REFRESH_MS,retry:WEATHER_RETRY_MS,label:'Dữ liệu mô hình tại tọa độ · giờ địa phương theo API',href:state.weatherUrl||SRC.forecastDocs,error:state.weatherError,loading:state.weatherLoading})}${freshnessSourceCard({name:'NASA POWER · khí tượng lịch sử',receivedAt:state.powerFetchedAt,attemptAt:state.powerAttemptAt,dataAt:powerDataAt,interval:POWER_REFRESH_MS,retry:POWER_RETRY_MS,label:'Dữ liệu khí tượng dạng lưới · thường trễ vài ngày',href:powerUrl(),error:state.powerError,loading:state.powerLoading})}${freshnessSourceCard({name:'NASA POWER · khí hậu nền dài hạn',receivedAt:state.climateFetchedAt,attemptAt:state.climateAttemptAt,dataAt:state.climate?'Chuỗi climatology nhiều tháng / năm đại diện':'Chưa có bản ghi',interval:CLIMATE_REFRESH_MS,retry:7*24*60*60*1000,label:'Mốc khí hậu dài hạn',href:climateUrl(),error:state.climateError,loading:state.climateLoading})}</div><div class="freshness-explainer">Giờ nhận dữ liệu là thời điểm website tải API. Mốc nguồn là thời gian của bản ghi do nhà cung cấp công bố.</div></section>`;
  }
  function render(){
    const crumb=NAV.find(x=>x[0]===state.page)?.[1]||'Tổng quan';$('#crumb').textContent=crumb;$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));
    const page=state.page;
    if(page!=='farm3d'&&threeCleanup){try{threeCleanup();}catch{}threeCleanup=null;}
    if(page!=='location'&&window._farmMap){try{window._farmMap.remove();}catch{}window._farmMap=null;}
    let html='';
    if(page==='overview')html=renderOverview();
    if(page==='location')html=renderLocation();
    if(page==='profile')html=renderProfile();
    if(page==='farm3d')html=renderFarm3d();
    if(page==='advisor')html=renderAdvisor();
    if(page==='rotation')html=renderRotationPlanner();
    if(page==='plan')html=renderPlan();
    if(page==='assistant')html=renderAssistant();
    if(page==='sources')html=renderSources();
    $('#content').innerHTML=html;
    bindPageEvents();
    if(page==='location') initMap();
    if(page==='farm3d') init3D();
    if(page==='assistant') $('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;
  }
  function renderOverview(){
    const pCount=Object.entries(state.profile).filter(([k,v])=>k!=='notes'&&k!=='farmName'&&has(v)).length;
    const date=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(today());
    if(!state.location)return `<div class="welcome"><div><div class="eyebrow">DỮ LIỆU KHU VƯỜN</div><h1>Chào mừng đến với <span>SMART FARM</span></h1><p>Thời tiết, dữ liệu đất và kế hoạch canh tác tại vị trí đã chọn.</p></div><div class="date-chip">${date}</div></div><section class="hero"><div class="hero-copy"><div class="hero-kicker">✿ NASA SMART FARM</div><h2>Điều kiện<br><em>quanh khu vườn</em></h2><p>Chọn vị trí vùng trồng hoặc nhập thông tin khu vườn.</p><div class="hero-actions"><button class="btn light" data-go="location">◎ Xác định vị trí</button><button class="btn ghost-light" data-go="profile">Hoàn thiện hồ sơ →</button></div></div><div class="hero-art"><div class="rings"></div><div class="tree-art">♧♧</div><div class="hero-stat"><span>Hồ sơ đã lưu</span><b>${pCount} <small>trường</small></b><span>✓ Tự lưu trên thiết bị</span></div></div></section><div class="empty"><div class="empty-icon">◎</div><div><b>Chưa chọn vị trí vùng trồng</b><p>Chọn GPS, tìm địa điểm hoặc nhập tọa độ để lấy dữ liệu thời tiết và NASA.</p></div><button class="btn primary" data-go="location">Thiết lập vị trí →</button></div>${renderDailyIrrigationPanel()}${renderImpactCalculator()}<div class="section-head" id="shortcutsHead"><div><h2>Lối tắt</h2></div></div>${shortcuts()}`;
    const c=state.weather?.current,d=state.weather?.daily,pl=latestPower(state.power);
    return `<div class="welcome"><div><div class="eyebrow">DỮ LIỆU KHU VƯỜN</div><h1>Xin chào, <span>${esc(state.profile.farmName||'người làm vườn')}</span></h1><p>Dữ liệu theo tọa độ · thời điểm cập nhật hiển thị cạnh từng chỉ số.</p></div><div class="date-chip">${date}</div></div><section class="hero"><div class="hero-copy"><div class="hero-kicker">✿ NASA SMART FARM</div><h2>Điều kiện<br><em>quanh khu vườn</em></h2><p>Vị trí: ${esc(state.location.label||'Điểm tham chiếu')} · ${state.location.lat.toFixed(4)}, ${state.location.lon.toFixed(4)}</p><div class="hero-actions"><button class="btn light" data-go="location">Xem dữ liệu môi trường</button><button class="btn ghost-light" data-go="profile">Cập nhật hồ sơ →</button></div></div><div class="hero-art"><div class="rings"></div><div class="tree-art">♧♧</div><div class="hero-stat"><span>Hồ sơ đã lưu</span><b>${pCount} <small>trường</small></b><span>✓ Tự lưu trên thiết bị</span></div></div></section>${freshnessPanel()}<div class="section-head" id="regionalConditionsHead"><div><h2>Tình hình khu vực</h2><p>Dữ liệu môi trường tại điểm tham chiếu đã xác nhận</p></div><button class="btn outline small" data-action="refresh" ${state.loading?'disabled':''}>↻ Kiểm tra ngay</button></div>${state.weatherError?`<div class="alert warning">${esc(state.weatherError)}</div>`:''}<div class="metrics">${metric('℃','Nhiệt độ hiện tại',fmt(c?.temperature_2m),'°C','Mô hình thời tiết tại điểm tham chiếu','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('◉','Độ ẩm không khí',fmt(c?.relative_humidity_2m,0),'%','Độ ẩm không khí ở 2 m','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('☂','Mưa hiện tại',fmt(c?.precipitation),'mm','Giá trị mô hình hiện tại','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('↝','Tốc độ gió',fmt(c?.wind_speed_10m),'km/h','Biến khí tượng mô hình','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}</div><div class="grid2 lower"><section class="panel"><div class="panel-head"><div><h3>Dự báo 7 ngày</h3><p>Dự báo theo mô hình</p></div>☁</div>${forecastCards(d)}${openMeteoAttribution()}</section><section class="panel"><div class="panel-head"><div><h3>Dữ liệu NASA POWER gần nhất</h3><p>Chuỗi khí tượng lưới tại điểm đại diện</p></div>🌎</div>${pl?`<div class="data-row"><span>Bản ghi mới nhất</span><b>${pl.date.slice(6,8)}/${pl.date.slice(4,6)}/${pl.date.slice(0,4)}</b></div><div class="data-grid"><div class="data-pill">Nhiệt độ <b>${fmt(pl.t2m)}°C</b>${src('NASA POWER','https://power.larc.nasa.gov/parameters/','T2M')}</div><div class="data-pill">Độ ẩm <b>${fmt(pl.rh,0)}%</b>${src('NASA POWER','https://power.larc.nasa.gov/parameters/','RH2M')}</div><div class="data-pill">Mưa <b>${fmt(pl.rain)} mm</b>${src('NASA POWER','https://power.larc.nasa.gov/parameters/','PRECTOTCORR')}</div><div class="data-pill">Gió <b>${fmt(pl.wind)} m/s</b>${src('NASA POWER','https://power.larc.nasa.gov/parameters/','WS2M')}</div></div>${src('Truy vấn API NASA POWER dùng cho vị trí này',powerUrl(),'mở dữ liệu gốc')}</>`:`<div class="muted">${state.powerError||'Đang tải dữ liệu NASA POWER…'} <a class="src" href="${SRC.powerDocs}" target="_blank">Tài liệu NASA ↗</a></div>`}</section></div>${renderDailyIrrigationPanel()}${renderImpactCalculator()}<div class="section-head" id="shortcutsHead"><div><h2>Lối tắt</h2></div></div>${shortcuts()}`;
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function impactForecast(){
    const d=state.weather?.daily;
    if(!d?.time)return null;
    const eto=d.time.slice(0,7).reduce((a,_,i)=>a+(Number.isFinite(Number(d.et0_fao_evapotranspiration?.[i]))?Number(d.et0_fao_evapotranspiration[i]):0),0);
    const rain=d.time.slice(0,7).reduce((a,_,i)=>a+(Number.isFinite(Number(d.precipitation_sum?.[i]))?Number(d.precipitation_sum[i]):0),0);
    return {eto,rain,days:d.time.length};
  }
  function impactResults(){
    const x=state.impact||{},p=state.profile,f=impactForecast();
    const areaRaw=has(x.areaHa)?Number(x.areaHa):(has(p.area)&&numVal(p.area)>0?numVal(p.area)/10000:null);
    const area=Number.isFinite(areaRaw)&&areaRaw>0?Math.min(areaRaw,100000):null;
    const cover=clamp(Number(x.coverPct??60),0,100)/100;
    const kc=clamp(Number(x.kc??.85),.1,2.0);
    const efficiency=clamp(Number(x.efficiency??70),20,100)/100;
    const evapReduction=clamp(Number(x.evapReduction??15),0,60)/100;
    // Effective-rain coefficient is explicitly editable; slope alone cannot determine runoff reliably.
    const effectiveRainFactor=clamp(Number(x.effectiveRainPct??70),0,100)/100;
    const pe=f?f.rain*effectiveRainFactor:0;
    const etc=f?f.eto*kc:0;
    const deficit=f?Math.max(0,etc-pe):0;
    // Scenario: avoidable soil-evaporation portion is limited by both net demand and cover assumptions.
    const savedMm=f?Math.min(deficit,Math.max(0,f.eto*cover*evapReduction)):0;
    const waterSaved=f&&area!==null?Math.round(savedMm*10000*area/efficiency):null;
    const biomass=clamp(Number(x.biomass??1.48),0,20); // t dry matter / ha over covered area, editable scenario
    const nContent=clamp(Number(x.nContent??2.18),0,8)/100;
    const ndfa=clamp(Number(x.ndfa??60),0,100)/100;
    const nFixed=area!==null?biomass*1000*nContent*ndfa*cover*area:null;
    const sprays=has(x.baselineSprays)&&Number.isFinite(Number(x.baselineSprays))?clamp(Number(x.baselineSprays),0,100):null;
    const ipm=clamp(Number(x.ipmAdoption??75),0,100)/100;
    const sprayReduction=44*ipm; // study-wide mean benchmark, not a crop-specific prediction
    const avoided=sprays!==null?sprays*sprayReduction/100:null;
    return {area,cover,kc,efficiency,evapReduction,effectiveRainFactor,f,pe,etc,deficit,savedMm,waterSaved,biomass,nContent:nContent*100,ndfa:ndfa*100,nFixed,sprays,ipm:ipm*100,sprayReduction,avoided};
  }
  function renderImpactCalculator(){
    const x=state.impact||{},p=state.profile,r=impactResults();
    const areaDefault=has(x.areaHa)?x.areaHa:(has(p.area)&&numVal(p.area)>0?(numVal(p.area)/10000).toFixed(3):'');
    const c=state.weather?.current,pl=latestPower(state.power);const dataLine=r.f?`7 ngày tới: ET₀ ${fmt(r.f.eto,1)} mm · mưa ${fmt(r.f.rain,1)} mm · mưa hữu hiệu ${fmt(r.pe,1)} mm. Hiện tại: ${c?`${fmt(c.temperature_2m,1)}°C · RH ${fmt(c.relative_humidity_2m,0)}%`:'chưa có dữ liệu thời tiết'}. NASA POWER: ${pl?`bản ghi ${pl.date}`:'chưa có bản ghi mới'}.`:'Chưa có dự báo ET₀ và mưa. Chọn vị trí để tải dự báo 7 ngày.';
    return `<section class="panel impact-panel" id="impactSimPanel"><div class="impact-head"><div><span class="eyebrow">NASA FIELD SHIFT · IMPACT CALCULATOR</span><h2>Mô phỏng tác động theo điều kiện vườn</h2><p>Điều chỉnh giả định để xem kết quả theo dữ liệu hiện có.</p></div><span class="tag">MÔ PHỎNG</span></div>
      <div class="impact-inputs">
        <label class="field"><span class="label">Diện tích (ha)</span><input type="number" min="0.001" max="100000" step="0.001" data-impact="areaHa" value="${esc(areaDefault)}"></label>
        <label class="field"><span class="label">Độ che phủ cỏ lạc dại (%)</span><input type="number" min="0" max="100" step="5" data-impact="coverPct" value="${esc(x.coverPct??60)}"></label>
        <label class="field"><span class="label">Kc cây trồng (tham số)</span><input type="number" min="0.1" max="2" step="0.05" data-impact="kc" value="${esc(x.kc??0.85)}"></label>
        <label class="field"><span class="label">Hiệu suất tưới (%)</span><input type="number" min="20" max="100" step="5" data-impact="efficiency" value="${esc(x.efficiency??70)}"></label>
        <label class="field"><span class="label">Mưa hữu hiệu giả định (%)</span><input type="number" min="0" max="100" step="5" data-impact="effectiveRainPct" value="${esc(x.effectiveRainPct??70)}"></label>
        <label class="field"><span class="label">Giảm bốc hơi đất trong vùng phủ (%)</span><input type="number" min="0" max="60" step="1" data-impact="evapReduction" value="${esc(x.evapReduction??15)}"></label>
        <label class="field"><span class="label">Sinh khối khô giả định (t/ha)</span><input type="number" min="0" max="20" step="0.1" data-impact="biomass" value="${esc(x.biomass??1.48)}"></label>
        <label class="field"><span class="label">Hàm lượng N giả định (%)</span><input type="number" min="0" max="8" step="0.01" data-impact="nContent" value="${esc(x.nContent??2.18)}"></label>
        <label class="field"><span class="label">N từ khí quyển giả định – Ndfa (%)</span><input type="number" min="0" max="100" step="5" data-impact="ndfa" value="${esc(x.ndfa??60)}"></label>
        <label class="field"><span class="label">Số lần phun nền/vụ (tự nhập)</span><input type="number" min="0" max="100" step="1" data-impact="baselineSprays" value="${esc(x.baselineSprays??'')}" placeholder="Cần nhật ký thực tế"></label>
        <label class="field"><span class="label">Mức thực hiện IPM giả định (%)</span><input type="number" min="0" max="100" step="5" data-impact="ipmAdoption" value="${esc(x.ipmAdoption??75)}"></label>
      </div>
      <div class="impact-results"><div><small>NƯỚC TƯỚI CÓ THỂ TIẾT KIỆM</small><b id="impactWater">${r.waterSaved===null?(r.area===null?'Nhập diện tích vườn':'Chưa có ET₀/mưa dự báo'):' '+fmt(r.waterSaved,0)+' L / 7 ngày'}</b><span>${r.f&&r.area!==null?'ET₀ × Kc − mưa hữu hiệu; phần giảm chỉ áp dụng cho bốc hơi đất trong vùng phủ.':'Cần diện tích vườn và dự báo 7 ngày.'}</span></div><div><small>ĐẠM N KHÍ QUYỂN ƯỚC TÍNH</small><b id="impactN">${r.nFixed===null?'Nhập diện tích':fmt(r.nFixed,1)+' kg N / kịch bản'}</b><span>Khối lượng khô × %N × Ndfa × diện tích × tỷ lệ phủ.</span></div><div><small>SỐ LẦN PHUN CÓ THỂ TRÁNH</small><b id="impactPesticide">${r.avoided===null?'Chưa có nhật ký':fmt(r.avoided,1)+' lần / vụ'}</b><span>${r.avoided===null?'Nhập số lần phun trong nhật ký.':`Giảm khoảng ${fmt(r.sprayReduction,0)}% số lần phun theo kịch bản IPM.`}</span></div></div>
      <details class="impact-method"><summary>Cách tính & nguồn tham khảo</summary><p><b>Nước:</b> ET₀ × Kc − mưa hữu hiệu, điều chỉnh theo diện tích và hiệu suất tưới. Các tham số có thể chỉnh ở trên.</p><p><b>Đạm:</b> Sinh khối khô × %N × Ndfa × diện tích × tỷ lệ phủ. Các giá trị sinh khối, %N và Ndfa đang là giả định mô phỏng.</p><p><b>IPM:</b> Mức giảm phun tham khảo từ nghiên cứu tổng hợp; kết quả thực tế phụ thuộc dịch hại và cách áp dụng.</p><p><b>Dư lượng thuốc:</b> cần phân tích mẫu.</p>${src('FAO – ETc = Kc × ETo và mưa hữu hiệu',SRC.faoWater,'Công thức nhu cầu nước')}${src('WASI – Arachis pintoi tại Việt Nam',SRC.arachisVietnam,'Nghiên cứu sinh khối và hàm lượng N')}${src('Meta-analysis IPM 2025',SRC.ipmMeta,'Nghiên cứu quản lý dịch hại theo ngưỡng')}</details></section>`;
  }
  function updateImpactCalculator(){
    const r=impactResults();const w=$('#impactWater'),n=$('#impactN'),p=$('#impactPesticide');
    if(w)w.textContent=r.waterSaved===null?(r.area===null?'Nhập diện tích vườn':'Chưa có ET₀/mưa dự báo'):`${fmt(r.waterSaved,0)} L / 7 ngày`;
    if(n)n.textContent=r.nFixed===null?'Nhập diện tích vườn':`${fmt(r.nFixed,1)} kg N / kịch bản`;
    if(p)p.textContent=r.avoided===null?'Chưa có nhật ký':`${fmt(r.avoided,1)} lần / vụ`;
    const d=$('#impactWater')?.parentElement?.querySelector('span');if(d)d.textContent=r.f&&r.area!==null?'ET₀ × Kc − mưa hữu hiệu; phần giảm chỉ áp dụng cho bốc hơi đất trong vùng phủ.':r.area===null?'Nhập diện tích thực tế của vườn.':'Cần dữ liệu dự báo ET₀ và mưa 7 ngày.';
  }
  function getPestRisk(){
    const crop=String(state.profile.crop||'').toLowerCase(),d=state.weather?.daily;
    const na=/\bna\b|cây na|na dai|na bo/i.test(crop);
    const hotDays=(d?.temperature_2m_max||[]).filter(v=>Number(v)>=34).length;
    return {na,hotDays,hot:hotDays>=3,show:na||hotDays>=3};
  }
  function pestTreadmillCard(forceShow=false){
    const r=getPestRisk();if(!r.show&&!forceShow)return '';
    return `<section class="panel pest-card" id="smartAdvisorSection"><div class="pest-top"><div><span class="eyebrow">SMART ADVISOR · IPM</span><h3>Theo dõi sâu hại & IPM</h3></div><span class="tag">${r.na?'CÂY NA ĐƯỢC CHỌN':`NẮNG NÓNG ${r.hotDays} NGÀY`}</span></div><p>${r.na?'Cây trong hồ sơ: na. Theo dõi sâu bệnh theo lô và giai đoạn sinh trưởng.':'Dự báo có ít nhất 3 ngày từ 34°C; tăng cường kiểm tra dấu hiệu stress nhiệt.'} Ghi nhận triệu chứng, mật độ sâu và thiên địch trước khi chọn biện pháp xử lý.</p><div class="pest-strategies"><div><b>① Thảm phủ Cỏ lạc dại (Arachis pintoi)</b><span>Che phủ đất và bổ sung sinh khối họ đậu; lưu ý cạnh tranh nước và ánh sáng.</span></div><div><b>② Dải thử Cúc vạn thọ</b><span>Chỉ cân nhắc khi đã xác định dịch hại mục tiêu; hiệu quả phụ thuộc giống và cách trồng.</span></div><div><b>③ Theo dõi IPM theo ngưỡng</b><span>Định danh dịch hại, theo dõi mật độ và thiên địch; xử lý theo ngưỡng IPM và hướng dẫn địa phương.</span></div></div>${src('Tổng quan khoa học Push–Pull',SRC.pushPullReview,'Nghiên cứu chủ yếu trên một số cây ngũ cốc')}${src('Cỏ lạc dại – nghiên cứu WASI Việt Nam',SRC.arachisVietnam,'sinh khối và N trong sinh khối ở vườn hồ tiêu')}${src('EPA – nguyên tắc IPM và quản lý kháng thuốc',SRC.epaIPM,'giám sát và quản lý dịch hại tích hợp')}</section>`;
  }
  function shortcuts(){return `<div class="shortcuts">${[['profile','▤','Hồ sơ canh tác'],['farm3d','♧','Vườn 3D'],['advisor','♣','Đề xuất cây trồng'],['rotation','↻','Luân canh & xen canh'],['plan','◷','Kế hoạch tưới'],['assistant','✳','Trợ lý thông minh']].map(x=>`<button class="shortcut" data-go="${x[0]}"><i>${x[1]}</i><b>${x[2]}</b>›</button>`).join('')}</div>`;}
  function renderLocation(){
    const loc=state.location,candidate=state.locationCandidate;
    const current=state.weather?.current,pl=latestPower(state.power);
    const fileMode=location.protocol==='file:';
    if(loc&&!loc.address)resolveSavedLocation(loc);
    if(candidate&&!candidate.address&&candidate.lookupStatus==='loading')resolveCandidateLocation(candidate);
    const accuracyText=(m)=>{
      if(m===null||m===undefined||m===''||!Number.isFinite(Number(m)))return 'Điểm do bạn chọn hoặc nhập.';
      const n=Math.round(Number(m));
      if(n<=20)return `Sai số GPS khoảng ±${n} m. Kiểm tra ghim có nằm đúng vườn.`;
      if(n<=50)return `Sai số GPS khoảng ±${n} m. Kiểm tra lại vị trí ghim.`;
      if(n<=100)return `Sai số GPS khoảng ±${n} m. Hãy chỉnh ghim trên bản đồ.`;
      return `Sai số GPS khoảng ±${n} m. Hãy chọn lại điểm vườn trên bản đồ.`;
    };
    const candidateHtml=candidate?`<div class="location-candidate">
      <div class="candidate-top"><div><span class="label">VỊ TRÍ VỪA NHẬN ĐƯỢC</span><h3>${esc(candidate.address||candidate.label||(candidate.lookupStatus==='loading'?'Đang xác định địa danh gần nhất…':'Chưa xác định được tên địa danh'))}</h3></div><span class="status-pill pending">Chưa xác nhận</span></div>
      <p class="candidate-sub">Địa danh được tra theo tọa độ. Hãy kiểm tra ghim. ${candidate.lookupStatus==='loading'?'Đang tra cứu tên khu vực…':candidate.lookupStatus==='failed'?'Chưa lấy được tên địa danh; bạn vẫn có thể kiểm tra bằng tọa độ và ghim trên bản đồ.':''}</p>
      <div class="candidate-coords"><div><small>Vĩ độ</small><b>${Number(candidate.lat).toFixed(6)}°</b></div><div><small>Kinh độ</small><b>${Number(candidate.lon).toFixed(6)}°</b></div><div><small>Sai số GPS</small><b>${candidate.accuracy!==null&&candidate.accuracy!==undefined&&Number.isFinite(Number(candidate.accuracy))?`±${Math.round(candidate.accuracy)} m`:'Không có'}</b></div></div>
      ${candidate.source==='browser-gps'?`<div class="alert info">${esc(accuracyText(candidate.accuracy))} Sai số do thiết bị báo.</div>`:`<div class="alert info">${candidate.source==='manual-map'?'Đây là điểm bạn vừa nhấn trên bản đồ.':'Đây là điểm bạn vừa chọn hoặc nhập.'} Hãy kiểm tra vị trí trước khi dùng làm điểm tham chiếu.</div>`}
      ${candidate.address?src('TrackAsia Reverse Geocoding v2',SRC.trackasiaReverse,'địa chỉ theo địa giới hành chính mới'):''}
      <div class="candidate-actions"><button class="btn primary" data-action="confirm-location">✓ Đúng, dùng vị trí này</button><button class="btn outline" data-action="cancel-location">Chọn lại / Hủy</button></div>
      </div>`:'';
    const confirmedHtml=loc?`<div class="current-location"><div><span class="label">ĐIỂM THAM CHIẾU ĐANG ĐƯỢC SỬ DỤNG</span><b>${esc(loc.address||loc.label||'Điểm tham chiếu đã xác nhận')}</b><small>${Number(loc.lat).toFixed(6)}, ${Number(loc.lon).toFixed(6)}${loc.accuracy!==null&&loc.accuracy!==undefined&&Number.isFinite(Number(loc.accuracy))?` · GPS ±${Math.round(loc.accuracy)} m`:''}</small>${loc.address?src('TrackAsia Reverse Geocoding v2',SRC.trackasiaReverse,'địa chỉ theo địa giới hành chính mới'):''}</div><button class="btn text-btn" data-action="clear-location">Xóa</button></div>`:'';
    const active=loc;
    return `${pageTitle('LOCATION INTELLIGENCE','Vị trí & môi trường','Chọn vị trí khu vườn để xem thời tiết và dữ liệu môi trường.')}
      <div class="grid2"><section class="panel"><div class="panel-head"><div><h3>Chọn vị trí vùng trồng</h3><p>GPS, tìm địa danh hoặc tọa độ thủ công</p></div><span>◎</span></div>
      <button class="btn primary block" data-action="gps">◎ Lấy vị trí GPS hiện tại</button><p class="gps-note">Sau khi lấy GPS, hãy kiểm tra tên khu vực và tọa độ. Nếu bạn đang ở thành phố nhưng vườn ở nơi khác, đừng xác nhận vị trí điện thoại; hãy tìm hoặc chọn vị trí khu vườn.</p>${src('MDN – GeolocationCoordinates.accuracy',SRC.gps,'accuracy là bán kính sai số ước tính ở mức tin cậy 68%')}
      <div class="field-block"><label class="label">Tìm địa điểm</label><form class="search-row" id="placeForm"><input id="placeSearch" placeholder="Ví dụ: Chi Lăng, Lạng Sơn"><button class="btn primary">⌕ Tìm</button></form>${src('TrackAsia Autocomplete / Search v2',SRC.trackasiaAutocomplete,'địa chỉ, đường, địa danh và đơn vị hành chính')}<div id="searchResults" class="search-results"></div></div>
      <div class="field-block"><label class="label">Nhập tọa độ thủ công</label><div class="coord-row"><input id="manualLat" placeholder="Vĩ độ (latitude)"><input id="manualLon" placeholder="Kinh độ (longitude)"><button class="btn outline" data-action="manual-coords">Kiểm tra</button></div><small class="field-status">Tọa độ nhập cũng sẽ hiển thị để bạn xác nhận trước khi áp dụng.</small></div>
      ${candidateHtml}${confirmedHtml}</section>
      <section class="panel"><div class="panel-head"><div><h3>Bản đồ vị trí</h3><p>${candidate?'Ghim đang chờ bạn xác nhận':'Nhấn bản đồ để chọn điểm tham chiếu'}</p></div>⌖</div><div class="map-wrap"><div id="map" class="map"></div><div class="map-hint">${candidate?'Ghim vị trí đang chờ xác nhận':'Nhấn bản đồ để đặt ghim'}</div></div>${src('TrackAsia Streets v2',SRC.trackasiaDocs,'detailLevel=full · dữ liệu bản đồ do TrackAsia cung cấp')} ${fileMode?`<div class="alert warning map-file-note">Bạn đang mở website bằng <b>file://</b>. GPS và API cần HTTPS hoặc localhost.</div>`:''}<p class="small-note">Tên đường, quốc lộ, địa danh và địa giới được hiển thị theo dữ liệu TrackAsia ở từng mức zoom; bản đồ không thay thế bản đồ địa chính.</p></section></div>
      ${active?`<div class="section-head" id="locationEnvHead"><div><h2>Dữ liệu môi trường tại điểm đã xác nhận</h2><p>${esc(active.address||active.label||'Điểm tham chiếu')} · thời gian từng nguồn được hiển thị bên dưới</p></div><button class="btn outline small" data-action="refresh" ${state.loading?'disabled':''}>↻ Kiểm tra ngay</button></div>${freshnessPanel()}${state.weatherError?`<div class="alert warning">${esc(state.weatherError)}</div>`:''}<div class="metrics">${metric('℃','Nhiệt độ không khí',fmt(current?.temperature_2m),'°C','Dữ liệu mô hình tại tọa độ','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('◉','Độ ẩm tương đối',fmt(current?.relative_humidity_2m,0),'%','Độ ẩm không khí ở 2 m','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('☂','Mưa hiện tại',fmt(current?.precipitation),'mm','Dữ liệu mô hình tại tọa độ','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}${metric('↝','Gió 10 m',fmt(current?.wind_speed_10m),'km/h','Biến khí tượng mô hình','Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs)}</div><div class="grid2 lower"><section class="panel"><div class="panel-head"><div><h3>NASA POWER – khí tượng</h3><p>Dữ liệu hàng ngày tại tọa độ; kết thúc chuỗi trước 3 ngày</p></div>🌎</div>${pl?`<div class="data-row"><span>Bản ghi mới nhất</span><b>${pl.date.slice(6,8)}/${pl.date.slice(4,6)}/${pl.date.slice(0,4)}</b></div>${[['Nhiệt độ trung bình 2 m','t2m','°C'],['Độ ẩm tương đối 2 m','rh','%'],['Mưa hiệu chỉnh','rain','mm/ngày'],['Gió 2 m','wind','m/s'],['Bức xạ sóng ngắn','rad',pl.radUnit||'MJ/m²/ngày']].map(r=>{const entry=pl.entries?.[r[1]],v=pl[r[1]],dateNote=entry&&entry.date!==pl.date?` · bản ghi ${entry.date.slice(6,8)}/${entry.date.slice(4,6)}/${entry.date.slice(0,4)}`:'';return `<div class="data-row"><span>${r[0]}${dateNote?`<small class="data-row-note">${dateNote}</small>`:''}</span><b>${v===null||v===undefined?'Không có dữ liệu':`${fmt(v)} ${r[2]}`}</b></div>${src('NASA POWER Daily API',powerUrl(),r[0])}`;}).join('')}${pl.rad===null?`<p class="small-note">${esc(pl.radMissingReason)} Mã -999 là giá trị thiếu của NASA POWER.</p>`:`<p class="small-note">Đơn vị bức xạ lấy từ metadata NASA POWER; nếu metadata không có, website dùng mặc định của community=AG: MJ/m²/ngày.</p>`}<p class="small-note">NASA công bố độ trễ thông thường 2–3 ngày cho dữ liệu khí tượng; ô lưới có thể khác đáng kể so với thửa vườn tại địa hình phức tạp.</p>${src('NASA POWER FAQ – độ trễ và lưới dữ liệu',SRC.powerFaq)}</div>`:`<div class="muted">${state.powerError||'Đang tải hoặc chưa có bản ghi NASA POWER.'} <a class="src" href="${SRC.powerDocs}" target="_blank">Tài liệu API ↗</a></div>`}</section><section class="panel"><div class="panel-head"><div><h3>Dự báo 7 ngày</h3><p>Mưa, nhiệt độ và ET₀ tham chiếu</p></div>☂</div>${forecastTable(state.weather?.daily)}${openMeteoAttribution()}</section></div><div class="notice-card"><b>Nguồn dữ liệu</b><p>Open-Meteo và NASA POWER cung cấp dữ liệu mô hình theo tọa độ. Độ ẩm đất tại vườn lấy từ thiết bị hoặc phép đo thực tế.</p></div>`:`<div class="empty"><div class="empty-icon">◎</div><div><b>${candidate?'Vị trí chưa được xác nhận':'Chưa có vị trí vùng trồng'}</b><p>${candidate?'Xác nhận vị trí phía trên để tải dữ liệu môi trường.':'Lấy GPS, tìm địa danh, nhập tọa độ hoặc nhấn bản đồ để bắt đầu.'}</p></div></div>`}`;
  }

  function renderProfile(){
    const cnt=Object.entries(state.profile).filter(([k,v])=>k!=='notes'&&k!=='farmName'&&has(v)).length;
    const groupCounts=groups.map(g=>g.fields.filter(f=>has(state.profile[f[0]])).length);
    const demo=liveDemo.active;
    const titleNote='Nhập thông tin đang có. Hồ sơ tự lưu trên thiết bị.';
    const exportAction=demo?'':`<button class="btn outline small" data-action="export">⇩ Xuất hồ sơ</button>`;
    return `${pageTitle('SMART FARM PROFILE','Hồ sơ khu vườn',titleNote,exportAction)}
      <div class="profile-summary"><div class="symbol">▤</div><div><b>${esc(state.profile.farmName||'Vườn của tôi')}</b><p id="profileDataCount">${cnt} thông tin đã lưu</p></div><b class="saved-label">✓ Tự lưu</b></div>
      <div class="profile-layout"><div class="groups profile-accordion-list">
        ${groups.map((g,i)=>`<details class="panel group profile-accordion" ${(i===0||state.profileOpenGroup===i)?'open':''}>
          <summary class="profile-accordion-head"><span class="profile-accordion-icon">${['⌂','♧','▦','⛰','💧','◎'][i]||'＋'}</span><span class="profile-accordion-title"><b>${g.title}</b><small>${g.desc}</small></span><span class="profile-accordion-count" data-profile-group-count="${i}">${groupCounts[i]} / ${g.fields.length} đã nhập</span><span class="profile-accordion-chevron">＋</span></summary>
          <div class="fields profile-accordion-fields">${g.fields.map(f=>renderField(f)).join('')}</div>
        </details>`).join('')}
      </div><aside class="panel sticky profile-side"><h3>${demo?'Hồ sơ trình diễn':'Hồ sơ của bạn'}</h3><div class="profile-side-count"><b id="profileSideCount">${cnt}</b><span>thông tin đã lưu</span></div><p class="profile-side-note">${demo?'Chỉ dùng trong phiên demo. Kết thúc tour sẽ khôi phục hồ sơ ban đầu.':'Hồ sơ đã lưu trên thiết bị.'}</p>${demo?'<div class="notice-inline">Không thể xuất hoặc xóa hồ sơ thật trong khi trình diễn.</div>':`<button class="btn outline block" data-action="export">⇩ Tải bản sao hồ sơ</button><button class="btn text-btn block" data-action="clear-profile">Xóa hồ sơ trên thiết bị</button>`}</aside></div>`;
  }
  function renderField(f){const [key,label,type,placeholder,opts]=f,val=state.profile[key]||'';let el='';if(type==='select')el=`<select data-profile="${key}"><option value="">Chưa nhập</option>${opts.map(([v,l])=>`<option value="${v}" ${v===val?'selected':''}>${l}</option>`).join('')}</select>`;else if(type==='textarea')el=`<textarea data-profile="${key}" rows="3" placeholder="${esc(placeholder)}">${esc(val)}</textarea>`;else el=`<input data-profile="${key}" type="${type}" step="${type==='number'?'any':''}" value="${esc(val)}" placeholder="${esc(placeholder)}">`;return `<label class="field"><span class="label">${label}</span>${el}<small class="field-status ${has(val)?'saved':''}">${has(val)?'✓ Đã lưu':'Chưa nhập'}</small></label>`;}
  function numVal(v){if(v===null||v===undefined||String(v).trim()==='')return 0;const n=Number(String(v).trim().replace(',','.'));return Number.isFinite(n)?n:0;}
  function parseSlopeInput(value){
    if(!has(value))return {valid:true,ratio:0,value:null,unit:null};
    const raw=String(value).trim().replace(',','.');
    const match=raw.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(%|°|deg)?$/i);
    if(!match)return {valid:false,ratio:0,message:'Độ dốc cần nhập dạng số, ví dụ 12% hoặc 8°. Không dùng kèm chữ khác.'};
    const n=Number(match[1]),unit=(match[2]||'%').toLowerCase();
    if(!Number.isFinite(n)||n<0)return {valid:false,ratio:0,message:'Độ dốc không được là số âm.'};
    if(unit==='%'&&n>100)return {valid:false,ratio:0,message:'Độ dốc phần trăm trên 100% quá lớn cho mô hình khu vườn; hãy kiểm tra đơn vị.'};
    if(unit!=='%'&&n>60)return {valid:false,ratio:0,message:'Độ dốc theo độ vượt 60°; hãy kiểm tra lại số đo.'};
    return {valid:true,ratio:unit==='%'?n/100:Math.tan(n*Math.PI/180),value:n,unit};
  }
  function computeFarmModel(p){
    const errors=[],warnings=[],notices=[],invalid=new Set();
    const parse=(key,label,min,max,{core=false,integer=false}={})=>{
      if(!has(p[key]))return null;
      const n=Number(String(p[key]).trim().replace(',','.'));
      let message='';
      if(!Number.isFinite(n))message=`${label} phải là số hợp lệ.`;
      else if(n<min||n>max)message=`${label} phải nằm trong khoảng ${fmt(min,2)}–${fmt(max,2)}.`;
      else if(integer&&!Number.isInteger(n))message=`${label} phải là số nguyên.`;
      if(message){invalid.add(key);(core?errors:warnings).push(message);return null;}
      return n;
    };
    const areaRaw=parse('area','Diện tích',0.01,100000000,{core:true});
    const widthRaw=parse('width','Chiều rộng',0.01,10000,{core:true});
    const lengthRaw=parse('length','Chiều dài',0.01,10000,{core:true});
    const countRaw=parse('treeCount','Số lượng cây',0,2500,{integer:true});
    const age=parse('treeAge','Tuổi cây',0,100);
    const enteredHeight=parse('treeHeight','Chiều cao cây',0.05,40);
    const enteredCrown=parse('crownWidth','Đường kính tán',0.05,60);
    const soilPH=parse('soilPH','pH đất',0,14);
    const soilMoisture=parse('soilMoisture','Độ ẩm đất',0,100);
    const soilDepth=parse('soilDepth','Độ sâu tầng đất',1,5000);
    const elevation=parse('elevation','Độ cao',-500,9000);
    if(soilPH!==null&&(soilPH<3||soilPH>10))warnings.push('pH đất dưới 3 hoặc trên 10. Kiểm tra đơn vị và kết quả đo.');
    if(soilDepth!==null&&soilDepth>300)warnings.push('Độ sâu tầng đất trên 3 m. Kiểm tra lại đơn vị và phạm vi khảo sát.');
    const generalSpace=parse('spacing','Khoảng cách chung',0.1,1000);
    const plantSpaceInput=parse('plantSpacing','Khoảng cách cây trong hàng',0.1,1000);
    const rowSpaceInput=parse('rowSpacing','Khoảng cách hàng',0.1,1000);
    const slopeInput=parseSlopeInput(p.slope);
    if(has(p.slope)&&!slopeInput.valid)warnings.push(slopeInput.message);
    if(has(p.soilType)&&!SOIL_PALETTE[normalizeSoilType(p.soilType)])warnings.push('Loại đất chưa khớp danh mục hiển thị; lát cắt sẽ dùng màu trung tính “Đất khác”. Hãy kiểm tra hồ sơ.');

    let area=areaRaw||0,width=widthRaw||0,length=lengthRaw||0;
    let dimensionsSource='',assumedSquare=false,derivedDimension=false;
    if(!errors.length){
      if(areaRaw!==null&&widthRaw!==null&&lengthRaw!==null){
        const product=widthRaw*lengthRaw;
        const delta=Math.abs(product-areaRaw)/Math.max(areaRaw,product);
        if(delta>0.08)errors.push(`Diện tích (${fmt(areaRaw,2)} m²) không khớp với chiều rộng × chiều dài (${fmt(product,2)} m²). Hãy kiểm tra lại số liệu đã nhập.`);
        else{area=product;width=widthRaw;length=lengthRaw;dimensionsSource='Diện tích đã được đối chiếu với chiều rộng × chiều dài do bạn nhập.';}
      }else if(areaRaw!==null&&(widthRaw!==null||lengthRaw!==null)){
        if(widthRaw!==null){width=widthRaw;length=areaRaw/widthRaw;}else{length=lengthRaw;width=areaRaw/lengthRaw;}
        area=areaRaw;derivedDimension=true;dimensionsSource='Một chiều được suy ra từ diện tích và chiều còn lại; cần xác nhận ngoài thực địa.';
      }else if(areaRaw!==null){
        area=areaRaw;width=Math.sqrt(area);length=Math.sqrt(area);assumedSquare=true;
        dimensionsSource='Chỉ có diện tích; mặt bằng vuông là hình xem trước.';
        notices.push('Chưa có chiều dài và chiều rộng. Khung vuông chỉ dùng để xem trước; thay bằng kích thước thực khi biết.');
      }else if(widthRaw!==null&&lengthRaw!==null){
        width=widthRaw;length=lengthRaw;area=width*length;dimensionsSource='Diện tích được tính từ chiều rộng × chiều dài do bạn nhập.';
      }else{
        return {valid:false,errors:[],warnings,notices:['Cần nhập diện tích hoặc cả chiều dài và chiều rộng để tạo mặt bằng.'],area:0,width:0,length:0,trees:[],layoutMode:'none',dimensionsSource:'',invalid:[...invalid]};
      }
      if(Math.max(width,length)>10000)errors.push('Kích thước vượt 10.000 m; không phù hợp với mô hình trình duyệt. Hãy kiểm tra đơn vị.');
      if(Math.min(width,length)<0.5)errors.push(`Có cạnh chỉ ${fmt(Math.min(width,length),2)} m, nhỏ hơn 0,5 m. Hãy kiểm tra đơn vị hoặc số liệu.`);
      const aspectRatio=Math.max(width,length)/Math.max(0.0001,Math.min(width,length));
      // A long narrow parcel can be real (e.g. a strip field); warn, do not block it solely by ratio.
      if(aspectRatio>100)warnings.push(`Thửa đất rất dài và hẹp (tỷ lệ khoảng ${fmt(aspectRatio,1)}:1). Nếu đây là dải đất thực, hãy giữ nguyên; nếu không, kiểm tra lại đơn vị/kích thước.`);
      else if(aspectRatio>25)warnings.push(`Thửa đất dài và hẹp (tỷ lệ khoảng ${fmt(aspectRatio,1)}:1). Hãy xác nhận hình dạng thực.`);
    }
    if(p.shape==='square'&&width>0&&length>0&&Math.abs(width-length)/Math.max(width,length)>.08)warnings.push('Bạn chọn hình vuông nhưng hai cạnh khác nhau đáng kể. Mô hình ưu tiên hai kích thước đã nhập.');
    if(p.shape==='other')notices.push('Hình thửa không đều chưa có đường bao đa giác; mô hình đang dùng khung chữ nhật xấp xỉ.');
    if(derivedDimension)notices.push('Một kích thước được suy ra từ diện tích để dựng mặt bằng xem trước.');

    if(enteredHeight!==null&&enteredCrown!==null){
      const ratio=enteredCrown/enteredHeight;
      if(ratio>4)warnings.push('Đường kính tán lớn hơn 4 lần chiều cao. Hãy kiểm tra xem hai số đo có cùng cây và cùng thời điểm không.');
      if(ratio<0.12)warnings.push('Đường kính tán rất nhỏ so với chiều cao. Hãy kiểm tra đơn vị hoặc cách đo.');
    }
    const stage=String(p.growthStage||'').toLowerCase();
    if(age!==null&&age<=1&&/ra hoa|đậu quả|nuôi quả|thu hoạch|trưởng thành|mang quả/.test(stage))warnings.push('Tuổi cây và giai đoạn sinh trưởng chưa khớp. Kiểm tra lại hai thông tin.');
    if(age!==null&&age>=10&&/cây con|mới trồng|ươm|hồi xanh/.test(stage))warnings.push('Tuổi cây và giai đoạn “cây con/mới trồng” có vẻ chưa thống nhất. Hãy kiểm tra lại thông tin.');
    if(age!==null&&age<=1&&enteredHeight!==null&&enteredHeight>5)warnings.push('Chiều cao trên 5 m ở cây không quá 1 năm tuổi là giá trị bất thường; hãy kiểm tra số đo.');

    const slopeRatio=slopeInput.valid?slopeInput.ratio:0;
    const aspectVec=aspectVector(p);
    const hasAspect=!!aspectVec;
    if(has(p.aspect)&&!hasAspect)warnings.push('Hướng sườn không nằm trong danh sách hợp lệ. Chọn Bắc, Đông Bắc, Đông, Đông Nam, Nam, Tây Nam, Tây hoặc Tây Bắc.');
    if(slopeRatio>0&&!hasAspect)warnings.push('Đã nhập độ dốc nhưng chưa có hướng sườn hợp lệ. Chưa có hướng sườn; mô hình đang hiển thị mặt đất phẳng. Nhập hướng sườn trong Hồ sơ canh tác.');
    if(slopeRatio>0&&hasAspect&&p.terrain==='plain'&&slopeRatio>0.05)warnings.push('Địa hình được chọn là đồng bằng nhưng độ dốc đã nhập trên 5%. Hãy xác nhận lại một trong hai thông tin.');
    if(p.terrain==='slope'&&!slopeRatio)notices.push('Đã chọn sườn dốc nhưng chưa có số đo độ dốc; mô hình chưa tạo mặt nghiêng.');
    if(hasAspect&&!slopeRatio)notices.push('Đã có hướng sườn nhưng chưa có độ dốc số; mô hình chưa tạo mặt nghiêng.');

    const plantSpace=plantSpaceInput!==null?plantSpaceInput:generalSpace;
    const rowSpace=rowSpaceInput!==null?rowSpaceInput:generalSpace;
    let layoutMode=p.layoutMode||(countRaw!==null?'count':(plantSpace!==null&&rowSpace!==null?'spacing':'none'));
    if(!['count','spacing','none'].includes(layoutMode))layoutMode='none';
    if(layoutMode==='count'&&countRaw===null)notices.push('Chế độ giữ số lượng đang bật nhưng chưa có số cây hợp lệ; chưa tạo cây.');
    if(layoutMode==='spacing'&&(plantSpace===null||rowSpace===null))notices.push('Để tính số cây theo khoảng cách, cần nhập cả cây cách cây và hàng cách hàng (hoặc khoảng cách chung).');
    if(layoutMode==='spacing'&&countRaw!==null)notices.push('Đang dùng chế độ theo khoảng cách; số lượng nhập tay không điều khiển số cây trong mô hình.');
    if(layoutMode==='none')notices.push('Chưa có cách bố trí cây. Mặt bằng vẫn hiển thị nhưng chưa tự tạo cây.');

    const trees=[];let columns=0,rows=0,spacingActualX=null,spacingActualZ=null;
    if(!errors.length&&layoutMode==='count'&&countRaw!==null){
      const total=countRaw;
      if(total>0){
        const hasBothSpacing=plantSpace!==null&&rowSpace!==null;
        let useExactSpacing=false;
        if(hasBothSpacing){
          const fitCols=Math.max(1,Math.floor(width/plantSpace+1e-9));
          const fitRows=Math.max(1,Math.floor(length/rowSpace+1e-9));
          const capacity=fitCols*fitRows;
          if(capacity>=total){
            // Choose a grid aspect ratio close to the land parcel while preserving both spacings.
            columns=Math.min(fitCols,Math.max(1,Math.round(Math.sqrt(total*width/length))));
            rows=Math.ceil(total/columns);
            if(rows>fitRows){rows=fitRows;columns=Math.ceil(total/rows);}
            if(columns<=fitCols&&rows<=fitRows){
              useExactSpacing=true;
              const usedW=(columns-1)*plantSpace,usedL=(rows-1)*rowSpace;
              const startX=-usedW/2,startZ=-usedL/2;
              for(let i=0;i<total;i++){
                const r=Math.floor(i/columns),c=i%columns;
                trees.push({x:startX+c*plantSpace,z:startZ+r*rowSpace,index:i+1,row:r+1,col:c+1});
              }
              spacingActualX=plantSpace;spacingActualZ=rowSpace;
            }
          }
          if(!useExactSpacing)warnings.push(`Với ${total} cây và khoảng cách ${fmt(plantSpace,2)} × ${fmt(rowSpace,2)} m, khu đất không đủ chỗ cho lưới đúng khoảng cách. Mô hình vẫn giữ đúng ${total} cây và dàn đều theo số lượng; hãy kiểm tra lại khoảng cách.`);
        }
        if(!useExactSpacing){
          columns=Math.max(1,Math.min(total,Math.round(Math.sqrt(total*width/length))));
          rows=Math.ceil(total/columns);
          const rowCounts=[];for(let r=0;r<rows;r++)rowCounts.push(Math.min(columns,total-r*columns));
          for(let i=0;i<total;i++){
            const r=Math.floor(i/columns),c=i%columns,inRow=rowCounts[r];
            const x=inRow===1?0:-width/2+(c+1)*width/(inRow+1);
            const z=-length/2+(r+1)*length/(rows+1);
            trees.push({x,z,index:i+1,row:r+1,col:c+1});
          }
          spacingActualX=null;spacingActualZ=null;
        }
      }
    }else if(!errors.length&&layoutMode==='spacing'&&plantSpace!==null&&rowSpace!==null){
      columns=Math.max(0,Math.floor(width/plantSpace+1e-9));
      rows=Math.max(0,Math.floor(length/rowSpace+1e-9));
      const total=columns*rows;
      if(total>2500)errors.push(`Khoảng cách tạo ra khoảng ${fmt(total,0)} vị trí cây, vượt giới hạn 2.500 cây của bản mô phỏng. Hãy tăng khoảng cách hoặc chia nhỏ khu vườn.`);
      else if(total===0)notices.push('Với kích thước và khoảng cách hiện tại chưa có vị trí cây nằm trọn trong khu đất.');
      else{
        const usedW=(columns-1)*plantSpace,usedL=(rows-1)*rowSpace;
        const startX=-usedW/2,startZ=-usedL/2;
        for(let r=0;r<rows;r++)for(let c=0;c<columns;c++)trees.push({x:startX+c*plantSpace,z:startZ+r*rowSpace,index:trees.length+1,row:r+1,col:c+1});
        spacingActualX=plantSpace;spacingActualZ=rowSpace;
      }
    }
    if(!errors.length&&trees.length){
      const canopy=enteredCrown;
      if(canopy!==null){
        // Estimate the nearest planted-tree spacing from the actual generated coordinates.
        // Rows and columns are regular in both placement modes, so this stays linearithmic.
        let nearest=Infinity;
        const byRow=new Map(),byCol=new Map();
        for(const t of trees){if(!byRow.has(t.row))byRow.set(t.row,[]);byRow.get(t.row).push(t);if(!byCol.has(t.col))byCol.set(t.col,[]);byCol.get(t.col).push(t);}
        for(const group of byRow.values()){
          group.sort((a,b)=>a.x-b.x);
          for(let i=1;i<group.length;i++){const d=Math.hypot(group[i].x-group[i-1].x,group[i].z-group[i-1].z);if(d>0)nearest=Math.min(nearest,d);}
        }
        for(const group of byCol.values()){
          group.sort((a,b)=>a.z-b.z);
          for(let i=1;i<group.length;i++){const d=Math.hypot(group[i].x-group[i-1].x,group[i].z-group[i-1].z);if(d>0)nearest=Math.min(nearest,d);}
        }
        if(Number.isFinite(nearest)&&canopy>nearest*1.15)warnings.push(`Đường kính tán (${fmt(canopy,2)} m) lớn hơn khoảng cách gần nhất giữa các tâm cây (${fmt(nearest,2)} m); tán mô phỏng có thể chồng lấn.`);
        const outside=trees.some(t=>Math.abs(t.x)+canopy/2>width/2+0.001||Math.abs(t.z)+canopy/2>length/2+0.001);
        if(outside)warnings.push('Một số tán cây có thể vượt ra ngoài ranh giới mặt bằng theo kích thước tán đã nhập. Hãy xem lại khoảng cách hoặc đường kính tán.');
      }
    }
    if(soilDepth===null&&has(p.soilType))notices.push('Lát cắt dùng chiều sâu minh họa 0,6 m; màu đất theo loại đất đã chọn.');
    return {valid:errors.length===0,errors,warnings,notices,area,width,length,assumedSquare,derivedDimension,dimensionsSource,trees,layoutMode,columns,rows,spacingActualX,spacingActualZ,plantSpace,rowSpace,slopeRatio:slopeRatio,aspectKnown:hasAspect,invalid:[...invalid]};
  }
  function cropKind(p){const c=String(p.crop||'').toLowerCase();if(c.includes('hồi')||c.includes('hoi'))return 'conifer';if(c.includes('quýt')||c.includes('quyt')||c.includes('cam')||c.includes('bưởi')||c.includes('buoi'))return 'citrus';if(c.includes('na')||c.includes('mãng cầu')||c.includes('mang cau'))return 'custard';if(c.includes('hồng')||c.includes('hong'))return 'persimmon';return 'fruit';}
  function cropLabel(p){return has(p.crop)?p.crop:'Cây trồng';}
  function treeScaleInfo(p){
    const stage=String(p.growthStage||'').toLowerCase();
    const ageRaw=has(p.treeAge)?Number(String(p.treeAge).replace(',','.')):null;
    const age=Number.isFinite(ageRaw)&&ageRaw>=0&&ageRaw<=100?ageRaw:null;
    const measuredHeight=has(p.treeHeight)?Number(String(p.treeHeight).replace(',','.')):null;
    const validHeight=Number.isFinite(measuredHeight)&&measuredHeight>=0.05&&measuredHeight<=40;
    const measuredCrown=has(p.crownWidth)?Number(String(p.crownWidth).replace(',','.')):null;
    const validCrown=Number.isFinite(measuredCrown)&&measuredCrown>=0.05&&measuredCrown<=60;
    const kind=cropKind(p);let height=2.2,source='Chiều cao minh họa chung vì chưa có số đo hợp lệ hoặc thông tin giai đoạn.';
    if(validHeight){height=measuredHeight;source='Chiều cao do người dùng nhập/đo; cần kiểm tra thời điểm đo và cây đại diện.';}
    else if(stage){source='Tỷ lệ hình thái minh họa theo giai đoạn do người dùng nhập.';if(/cây con|mới trồng|ươm|hồi xanh/.test(stage))height=.9;else if(/phát triển|sinh trưởng|kiến thiết|cây non/.test(stage))height=1.8;else if(/ra hoa|nuôi quả|mang quả|thu hoạch|trưởng thành|đậu quả/.test(stage))height=3.2;}
    else if(age!==null&&age>0){source='Chiều cao minh họa suy ra từ tuổi cây; phụ thuộc giống, tỉa cành và điều kiện sinh trưởng.';height=age<1?.8:age<2?1.3:age<4?2.1:age<7?3:4;}
    if(kind==='conifer'&&!validHeight)height*=1.35;
    const ratio=kind==='conifer'?.52:kind==='custard'?.92:kind==='citrus'?.78:kind==='persimmon'?.82:.8;
    const crownWidth=validCrown?measuredCrown:height*ratio;
    const crownSource=validCrown?'Đường kính tán do người dùng nhập/đo.':'Đường kính tán minh họa theo hình thái chung.';
    return {height,crownWidth,source,crownSource,kind};
  }
  function parseSlope(p){const parsed=parseSlopeInput(p.slope);return parsed.valid?parsed.ratio:0;}
  function aspectVector(p){const map={N:[0,-1],NE:[.707,-.707],E:[1,0],SE:[.707,.707],S:[0,1],SW:[-.707,.707],W:[-1,0],NW:[-.707,-.707]};return map[p.aspect]||null;}
  const SOIL_PALETTE={
    clay:{hex:0x98583d,css:'#98583d',dark:'#69402f',label:'Đất sét'},
    loam:{hex:0x805b40,css:'#805b40',dark:'#59402f',label:'Đất thịt'},
    sandy:{hex:0xd0b277,css:'#d0b277',dark:'#9f814f',label:'Đất cát'},
    alluvial:{hex:0x8b7354,css:'#8b7354',dark:'#625039',label:'Đất phù sa'},
    'red-yellow':{hex:0xa84f32,css:'#a84f32',dark:'#783923',label:'Đất feralit đỏ vàng'},
    mixed:{hex:0x9b8060,css:'#9b8060',dark:'#6d5942',label:'Đất pha'},
    other:{hex:0x85806c,css:'#85806c',dark:'#5c584b',label:'Đất khác'}
  };
  function normalizeSoilType(type){
    const raw=String(type||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const aliases={
      clay:'clay','dat-set':'clay','set':'clay',
      loam:'loam','dat-thit':'loam','dat-thit-pha':'loam','thit':'loam',
      sandy:'sandy','dat-cat':'sandy','cat':'sandy',
      alluvial:'alluvial','dat-phu-sa':'alluvial','phu-sa':'alluvial',
      'red-yellow':'red-yellow','dat-feralit-do-vang':'red-yellow','feralit':'red-yellow',
      mixed:'mixed','dat-pha':'mixed','pha':'mixed',
      other:'other','khac':'other'
    };
    return aliases[raw]||raw;
  }
  function soilPalette(type){return SOIL_PALETTE[normalizeSoilType(type)]||SOIL_PALETTE.other;}
  function farmValidationHTML(m){
    if(m.errors.length)return `<div class="alert warning farm-alert"><b>Kích thước vườn chưa hợp lệ:</b><div>${m.errors.map(esc).join('<br>')}</div></div>`;
    const warnings=m.warnings.map(w=>`<div class="alert warning farm-alert">${esc(w)}</div>`).join('');
    const notices=m.notices?.length?`<div class="farm-info-note">${m.notices.map(n=>`<div>ⓘ ${esc(n)}</div>`).join('')}</div>`:'';
    return `${warnings}${notices}<div class="notice-inline">${esc(m.dimensionsSource||'Mặt bằng dựng từ hồ sơ vườn.')} Kích thước theo hồ sơ; cây, màu đất và tuyến tưới đang được mô phỏng.</div>`;
  }
  function soilLabel(v){return has(v)?soilPalette(v).label:'Chưa nhập';}
  function soilSliceLegendHTML(p){
    if(!has(p.soilType))return `<div class="soil-slice-legend muted-soil"><span class="soil-swatch"></span><div><b>Chưa có loại đất</b><small>Nhập loại đất trong Hồ sơ canh tác để hiển thị màu lát cắt.</small></div></div>`;
    const sw=soilPalette(p.soilType),visual=soilVisualTone(p),depth=has(p.soilDepth)&&numVal(p.soilDepth)>0?`${fmt(numVal(p.soilDepth)/100,2)} m · do người dùng nhập`:'0,6 m · chiều sâu minh họa';
    const visibility=state.sceneLayers?.soil===false?' · Lớp lát cắt hiện đang tắt':'';
    const dynamicParts=[];if(visual.moisture!==null)dynamicParts.push('độ ẩm đất');if(visual.temp!==null)dynamicParts.push('nhiệt độ không khí');
    const dynamic=dynamicParts.length?` Màu bề mặt điều chỉnh theo ${dynamicParts.join(' và ')}.`:' Chưa có dữ liệu nhiệt/ẩm để hiệu chỉnh màu.';
    return `<div class="soil-slice-legend"><span class="soil-swatch" style="background-color:${visual.css} !important;border-color:${sw.dark} !important"></span><div><b>Lát cắt: ${esc(sw.label)}</b><small>Chiều sâu: ${depth}. Ba tầng đất minh họa theo loại đất đã chọn.${dynamic}${visibility}</small></div><a class="src" href="https://www.fao.org/4/R4082E/r4082e03.htm" target="_blank" rel="noreferrer">Nguồn tham khảo về mô tả đất ↗</a></div>`;
  }
  function farmSummaryHTML(m){
    if(!m.valid)return '';const p=state.profile,treeInfo=treeScaleInfo(p);
    const mode=m.layoutMode==='count'?'Giữ đúng số cây đã nhập':m.layoutMode==='spacing'?'Tính theo khoảng cách':'Chưa bố trí cây';
    const spaceText=m.layoutMode==='spacing'&&m.spacingActualX&&m.spacingActualZ?`${fmt(m.spacingActualX,2)} × ${fmt(m.spacingActualZ,2)} m`:m.layoutMode==='count'&&m.spacingActualX&&m.spacingActualZ?`${fmt(m.spacingActualX,2)} × ${fmt(m.spacingActualZ,2)} m (để sắp xếp đúng số cây)`:m.layoutMode==='count'?'Dàn đều theo số cây; chưa có khoảng cách cố định':'Chưa có';
    const treeSource=`Chiều cao: ${has(p.treeHeight)?'người dùng đo':'minh họa'} · tán: ${has(p.crownWidth)?'người dùng đo':'ước tính minh họa'}`;
    return `<div class="scene-caption farm-stats"><div><span>Diện tích</span><b>${fmt(m.area,1)} m²</b></div><div><span>Kích thước mặt bằng</span><b>${fmt(m.width,1)} × ${fmt(m.length,1)} m</b></div><div><span>Số cây thực sự dựng</span><b>${m.trees.length.toLocaleString('vi-VN')} cây</b></div><div><span>Chế độ bố trí</span><b>${mode}</b></div><div><span>Khoảng cách</span><b>${spaceText}</b></div><div><span>Cây / giống / giai đoạn</span><b>${esc(cropLabel(p))} · ${esc(p.treeVariety||'Chưa nhập giống')} · ${esc(p.growthStage||'Chưa nhập')}</b></div><div><span>Chiều cao / đường kính tán</span><b>${fmt(treeInfo.height,1)} m · ${fmt(treeInfo.crownWidth,1)} m</b><small>${treeSource}</small></div><div><span>Đất / pH</span><b>${esc(soilLabel(p.soilType))} · ${has(p.soilPH)?esc(p.soilPH):'Chưa nhập pH'}</b></div></div>`;
  }
  function farmDataSnapshotHTML(m){
    const p=state.profile,loc=state.location,c=state.weather?.current,pl=latestPower(state.power);
    const facts=[
      ['Vị trí tham chiếu',loc?(loc.address||loc.label||`${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`):'Chưa chọn',loc?`${loc.source||'Vị trí đã xác nhận'}${loc.accuracy?` · sai số GPS ±${Math.round(loc.accuracy)} m`:''}`:'Chưa có'],
      ['Diện tích & kích thước',m.valid?`${fmt(m.area,1)} m² · ${fmt(m.width,1)} × ${fmt(m.length,1)} m`:'Cần cập nhật kích thước',`${m.dimensionsSource||'Hồ sơ canh tác'} · Hình dạng khai báo: ${p.shape||'chưa nhập'}`],
      ['Cây trồng / giống',`${p.crop||'Chưa nhập'} · ${p.treeVariety||'Giống chưa nhập'}`,'Hồ sơ người dùng'],
      ['Số lượng cây',has(p.treeCount)?`${p.treeCount} cây`:'Chưa nhập',m.layoutMode==='count'?'Người dùng nhập; mô hình giữ đúng số':'Chưa xác định chế độ'],
      ['Khoảng cách cây / hàng',`${has(p.plantSpacing)?p.plantSpacing:(has(p.spacing)?p.spacing:'—')} / ${has(p.rowSpacing)?p.rowSpacing:(has(p.spacing)?p.spacing:'—')} m`,'Hồ sơ canh tác; chế độ bố trí quyết định cách dùng'],
      ['Tuổi / giai đoạn cây',`${has(p.treeAge)?p.treeAge+' năm':'Tuổi chưa nhập'} · ${p.growthStage||'Giai đoạn chưa nhập'}`,treeScaleInfo(p).source],
      ['Kích thước thân tán',`${has(p.treeHeight)?p.treeHeight+' m chiều cao':'Chiều cao chưa đo'} · ${has(p.crownWidth)?p.crownWidth+' m đường kính tán':'Tán chưa đo'}`,`${treeScaleInfo(p).source} ${treeScaleInfo(p).crownSource}`],
      ['Đặc tính đất',`${p.soilType||'Loại đất chưa nhập'} · ${p.soilTexture||'kết cấu chưa nhập'}`,'Theo hồ sơ đã nhập'],
      ['pH / độ ẩm đất',`${has(p.soilPH)?'pH '+p.soilPH:'pH chưa nhập'} · ${has(p.soilMoisture)?p.soilMoisture+'%':'độ ẩm đất chưa đo'}`,'Độ ẩm chỉ xem là số đo khi người dùng nhập từ thiết bị/phép đo'],
      ['Thoát nước / hữu cơ / độ phì',`${p.drainage||'Thoát nước chưa nhập'} · ${p.organicMatter||'hữu cơ chưa nhập'} · ${p.soilFertility||'độ phì chưa nhập'}`,'Hồ sơ người dùng'],
      ['Độ sâu tầng đất',has(p.soilDepth)?`${p.soilDepth} cm`:'Chưa nhập','Hồ sơ người dùng; lát cắt chỉ minh họa'],
      ['Địa hình / độ dốc / hướng',`${p.terrain||'Chưa nhập'} · ${p.slope||'độ dốc chưa nhập'} · ${p.aspect||'hướng chưa nhập'}`,'Chỉ tạo mặt nghiêng khi có độ dốc số do người dùng nhập'],
      ['Độ cao',has(p.elevation)?`${p.elevation} m`:'Chưa nhập','Người dùng nhập hoặc khảo sát; chưa tự lấy từ DEM'],
      ['Ghi chú khu vườn',has(p.notes)?p.notes:'Chưa có ghi chú','Nội dung do người dùng cung cấp'],
      ['Nguồn nước / khả năng',`${p.waterSource||'Chưa nhập'} · ${p.waterAvailability||'khả năng cấp nước chưa nhập'}`,'Hồ sơ người dùng'],
      ['Phương pháp tưới / thoát nước',`${p.irrigationMethod||'Chưa nhập'} · ${p.drainageSystem||'hệ thống thoát nước chưa nhập'}`,'Sơ đồ đường tưới chỉ là minh họa khi có phương pháp'],
      ['Lần tưới gần nhất',p.lastWatering||'Chưa nhập','Hồ sơ người dùng'],
      ['Mục đích / vốn / công',`${p.purpose||'Mục tiêu chưa nhập'} · ${p.investment||'vốn chưa nhập'} · ${p.labor||'công chưa nhập'}`,'Hồ sơ người dùng'],
      ['Đầu ra / mức rủi ro',`${p.market||'Kênh tiêu thụ chưa nhập'} · ${p.risk||'Mức rủi ro chưa nhập'}`,'Hồ sơ người dùng'],
      ['Thời tiết mô hình',c?`${fmt(c.temperature_2m)}°C · RH ${fmt(c.relative_humidity_2m,0)}% · mưa ${fmt(c.precipitation)} mm`:'Chưa có dữ liệu thời tiết',c?'Open-Meteo Forecast API':'Chọn vị trí để tải'],
      ['NASA POWER gần nhất',pl?`${pl.date} · ${fmt(pl.t2m)}°C · RH ${fmt(pl.rh,0)}% · mưa ${fmt(pl.rain)} mm`:'Chưa có bản ghi',pl?'NASA POWER Daily API':'Chưa tải được']
    ];
    return `<div class="snapshot-list">${facts.map((f,i)=>`<div class="snapshot-row"><div><b>${esc(f[0])}</b><span>${esc(f[1])}</span></div><small>${esc(f[2])}${i===18&&c?` · ${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'dữ liệu mô hình tại tọa độ')}`:''}${i===19&&pl?` · ${src('NASA POWER',powerUrl(),'dữ liệu khí tượng dạng lưới')}`:''}</small></div>`).join('')}</div>`;
  }
  function farmLiveMetaHTML(m){
    const p=state.profile,loc=state.location,c=state.weather?.current,items=[];
    if(loc)items.push(`⌖ ${esc(loc.address||loc.label||`${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`)}`);
    if(has(p.crop))items.push(`🌱 ${esc(p.crop)}${has(p.treeVariety)?` · ${esc(p.treeVariety)}`:''}`);
    if(m.valid)items.push(`▦ ${fmt(m.area,1)} m²`);
    if(m.valid)items.push(`🌳 ${m.trees.length} cây`);
    if(c)items.push(`☁ ${fmt(c.temperature_2m)}°C · RH ${fmt(c.relative_humidity_2m,0)}%`);
    if(has(p.soilType))items.push(`▤ ${esc(soilLabel(p.soilType))}`);
    return `<div class="twin-context-strip">${items.length?items.map(x=>`<span>${x}</span>`).join(''):'<span>Chưa có dữ liệu hồ sơ — bạn có thể bắt đầu với diện tích hoặc loại cây.</span>'}</div>`;
  }
  function renderFarm3d(){
    const p=state.profile,m=computeFarmModel(p),view=state.farmView||'orbit',layer=state.sceneLayers||{},weather=state.weather?.current,loc=state.location;
    const effectiveMode=m.layoutMode==='count'?'Giữ đúng số lượng cây':m.layoutMode==='spacing'?'Tính theo khoảng cách':'Chưa bố trí cây';
    const locationText=loc?(loc.address||loc.label||`${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`):'Chưa xác nhận vị trí';
    const layerButtons=[['plants','Cây chính'],['cover','Thảm lạc dại'],['terrain','Địa hình'],['soil','Lớp đất'],['irrigation','Tưới'],['dimensions','Kích thước'],['rows','Hàng cây'],['labels','Mã cây']];
    return `${pageTitle('VƯỜN 3D','Thiết kế vườn','Nhập diện tích và cây trồng để dựng mô hình ban đầu.',`<button class="btn outline small" data-action="export">⇩ Xuất hồ sơ</button>`)}
      <div class="twin-layout twin-layout-simplified">
        <section class="panel farm-controls">
          <div class="panel-head"><div><h3>Thông tin cơ bản</h3><p>Chỉ nhập điều bạn đã biết</p></div><span>✎</span></div>
          <label class="field"><span class="label">Tên khu vườn <em>· tùy chọn</em></span><input data-profile="farmName" value="${esc(p.farmName)}" placeholder="Ví dụ: Vườn đồi nhà tôi"></label>
          <div class="fields"><label class="field"><span class="label">Diện tích (m²)</span><input data-profile="area" type="number" min="0" step="any" value="${esc(p.area)}" placeholder="Ví dụ: 200"></label><label class="field"><span class="label">Cây trồng</span><input data-profile="crop" value="${esc(p.crop)}" placeholder="Ví dụ: na"></label></div>
          <div class="quick-note">Dữ liệu tự lưu. Cần diện tích hoặc chiều dài và chiều rộng để dựng mặt bằng.</div>
          <details class="twin-advanced" ${has(p.width)||has(p.length)?'open':''}><summary>Kích thước khu đất</summary>
            <div class="fields"><label class="field"><span class="label">Chiều rộng (m)</span><input data-profile="width" type="number" min="0" step="any" value="${esc(p.width)}" placeholder="Chưa biết thì để trống"></label><label class="field"><span class="label">Chiều dài (m)</span><input data-profile="length" type="number" min="0" step="any" value="${esc(p.length)}" placeholder="Chưa biết thì để trống"></label></div>
            <label class="field"><span class="label">Hình dạng khu đất</span><select data-profile="shape"><option value="">Chưa nhập</option><option value="rectangle" ${p.shape==='rectangle'?'selected':''}>Chữ nhật</option><option value="square" ${p.shape==='square'?'selected':''}>Vuông</option><option value="other" ${p.shape==='other'?'selected':''}>Không đều</option></select></label>
          </details>
          <details class="twin-advanced" ${has(p.treeCount)||has(p.spacing)||has(p.plantSpacing)||has(p.rowSpacing)?'open':''}><summary>Số cây và khoảng cách</summary>
            <label class="field"><span class="label">Cách bố trí</span><select data-profile="layoutMode"><option value="" ${!p.layoutMode?'selected':''}>Tự chọn theo dữ liệu có sẵn</option><option value="count" ${p.layoutMode==='count'?'selected':''}>Giữ đúng số lượng cây</option><option value="spacing" ${p.layoutMode==='spacing'?'selected':''}>Tính số cây theo khoảng cách</option></select><small class="field-status">Đang áp dụng: <b>${effectiveMode}</b></small></label>
            <div class="fields"><label class="field"><span class="label">Số cây</span><input data-profile="treeCount" type="number" min="0" step="1" value="${esc(p.treeCount)}" placeholder="Ví dụ: 10"></label><label class="field"><span class="label">Khoảng cách chung (m)</span><input data-profile="spacing" type="number" min="0" step="any" value="${esc(p.spacing)}" placeholder=""></label></div>
            <div class="fields"><label class="field"><span class="label">Cây cách cây (m)</span><input data-profile="plantSpacing" type="number" min="0" step="any" value="${esc(p.plantSpacing)}" placeholder=""></label><label class="field"><span class="label">Hàng cách hàng (m)</span><input data-profile="rowSpacing" type="number" min="0" step="any" value="${esc(p.rowSpacing)}" placeholder=""></label></div>
            <div class="notice-inline"><b>Quy tắc:</b> Chọn “Giữ số lượng” thì 10 cây luôn là 10 cây. Chỉ chế độ “Tính theo khoảng cách” mới tự tính số vị trí trồng.</div>
          </details>
          <details class="twin-advanced" ${['treeAge','growthStage','treeVariety','treeHeight','crownWidth'].some(k=>has(p[k]))?'open':''}><summary>Đặc điểm cây trồng</summary>
            <label class="field"><span class="label">Giống cây</span><input data-profile="treeVariety" value="${esc(p.treeVariety)}" placeholder=""></label>
            <div class="fields"><label class="field"><span class="label">Tuổi cây (năm)</span><input data-profile="treeAge" type="number" min="0" step="any" value="${esc(p.treeAge)}" placeholder=""></label><label class="field"><span class="label">Giai đoạn sinh trưởng</span><input data-profile="growthStage" value="${esc(p.growthStage)}" placeholder="Cây con, ra hoa…"></label></div>
            <div class="fields"><label class="field"><span class="label">Chiều cao đo thực tế (m)</span><input data-profile="treeHeight" type="number" min="0" step="any" value="${esc(p.treeHeight)}" placeholder="Nếu đã đo"></label><label class="field"><span class="label">Đường kính tán đo thực tế (m)</span><input data-profile="crownWidth" type="number" min="0" step="any" value="${esc(p.crownWidth)}" placeholder="Nếu đã đo"></label></div>
          </details>
          <details class="twin-advanced" ${['slope','aspect','soilType','soilDepth','soilPH','soilMoisture','irrigationMethod','waterSource','elevation'].some(k=>has(p[k]))?'open':''}><summary>Đất, địa hình và tưới tiêu</summary>
            <div class="fields"><label class="field"><span class="label">Địa hình</span><select data-profile="terrain"><option value="">Chưa nhập</option>${[['hill','Đồi'],['slope','Sườn dốc'],['valley','Thung lũng'],['plain','Đồng bằng'],['terrace','Ruộng bậc thang'],['other','Khác']].map(([v,l])=>`<option value="${v}" ${p.terrain===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span class="label">Độ dốc (% hoặc °)</span><input data-profile="slope" value="${esc(p.slope)}" placeholder="Ví dụ: 12%"></label></div>
            <div class="fields"><label class="field"><span class="label">Hướng sườn</span><select data-profile="aspect"><option value="">Chưa nhập</option>${[['N','Bắc'],['NE','Đông Bắc'],['E','Đông'],['SE','Đông Nam'],['S','Nam'],['SW','Tây Nam'],['W','Tây'],['NW','Tây Bắc']].map(([v,l])=>`<option value="${v}" ${p.aspect===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span class="label">Độ cao (m)</span><input data-profile="elevation" type="number" min="0" step="any" value="${esc(p.elevation)}" placeholder=""></label></div>
            <div class="fields"><label class="field"><span class="label">Loại đất</span><select data-profile="soilType"><option value="">Chưa nhập</option>${[['clay','Đất sét'],['loam','Đất thịt'],['sandy','Đất cát'],['alluvial','Đất phù sa'],['red-yellow','Đất feralit đỏ vàng'],['mixed','Đất pha'],['other','Khác']].map(([v,l])=>`<option value="${v}" ${p.soilType===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span class="label">Độ sâu tầng đất (cm)</span><input data-profile="soilDepth" type="number" min="0" step="any" value="${esc(p.soilDepth)}" placeholder="Nếu khảo sát"></label></div>
            <div class="fields"><label class="field"><span class="label">pH đất</span><input data-profile="soilPH" type="number" min="0" max="14" step="any" value="${esc(p.soilPH)}" placeholder="Nếu có kết quả đo"></label><label class="field"><span class="label">Độ ẩm đất (%)</span><input data-profile="soilMoisture" type="number" min="0" max="100" step="any" value="${esc(p.soilMoisture)}" placeholder="Nếu có số đo"></label></div>
            <div class="fields"><label class="field"><span class="label">Nguồn nước</span><input data-profile="waterSource" value="${esc(p.waterSource)}" placeholder="Giếng, suối, ao…"></label><label class="field"><span class="label">Phương pháp tưới</span><input data-profile="irrigationMethod" value="${esc(p.irrigationMethod)}" placeholder="Nhỏ giọt, phun…"></label></div>
          </details>
          <button class="btn outline block" data-go="profile">Mở hồ sơ đầy đủ →</button>
        </section>
        <section class="panel twin-visual-panel">
          <div class="panel-head"><div><h3 id="farmSceneTitle">${esc(p.farmName||'Vườn 3D của tôi')}</h3><p id="farmSceneSubtitle">${esc(p.crop||'Chưa chọn cây')} · ${m.valid?`${fmt(m.area,1)} m²`:'Chưa nhập kích thước'} · ${m.trees.length} cây</p></div><span class="tag">DIGITAL TWIN</span></div>
          <div id="farmLiveMeta">${farmLiveMetaHTML(m)}</div>
          <div class="farm-mode-switch"><button class="farm-mode-btn ${(state.farmMode||'simulation')==='simulation'?'active':''}" data-farm-mode="simulation">◈ Mô phỏng</button><button class="farm-mode-btn ${(state.farmMode||'simulation')==='heatmap'?'active':''}" data-farm-mode="heatmap">▦ Bản đồ nhiệt</button></div><div class="heat-source-switch" ${state.farmMode==='heatmap'?'':'hidden'}><span>Nguồn/lớp đất:</span><button data-heat-metric="surface" class="${state.heatmapMetric==='surface'?'active':''}">Đất mặt · 0–5 cm</button><button data-heat-metric="root" class="${state.heatmapMetric!=='surface'?'active':''}">Vùng rễ · 0–100 cm</button></div><div class="scene-toolbar" ${state.farmMode==='heatmap'?'hidden':''}><div class="toolbar-group view-toolbar"><button class="view-btn ${view==='orbit'?'active':''}" data-farm-view="orbit">Toàn cảnh</button><button class="view-btn ${view==='top'?'active':''}" data-farm-view="top">Trên xuống</button><button class="view-btn ${view==='low'?'active':''}" data-farm-view="low">Góc ngang</button><button class="view-btn ${view==='walk'?'active':''}" data-farm-view="walk">Trong vườn</button></div></div>
          <details class="twin-advanced layer-advanced"><summary>Lớp hiển thị trong mô hình</summary><div class="toolbar-group layer-buttons">${layerButtons.map(([k,l])=>`<button class="layer-btn ${layer[k]!==false?'on':''}" data-farm-layer="${k}" aria-pressed="${layer[k]!==false}">${l}</button>`).join('')}</div></details>
          <div class="scene" id="farmScene" aria-label="Mô hình vườn số tương tác"></div>
          <div id="farmSoilLegend">${soilSliceLegendHTML(p)}</div>${canopyIndicatorHTML()}<div id="farmModeNote" class="farm-mode-note">Mô hình 3D dựng từ thông tin trong hồ sơ vườn.</div>
          <div id="farmValidation">${farmValidationHTML(m)}</div>
          <div class="tree-selection" id="farmTreeSelection"><b>Chọn một cây trong mô hình</b><span>Nhấn vào cây để xem số thứ tự và vị trí tương đối.</span></div>
          <details class="twin-advanced twin-details"><summary>Xem thông số mô hình</summary><div id="farmSummary">${farmSummaryHTML(m)}</div><div class="twin-legend"><span><i class="legend-tree"></i>Cây trồng</span><span><i class="legend-irrigation"></i>Đường tưới sơ đồ</span><span><i class="legend-soil"></i>Lớp đất minh họa</span></div></details>
          <details class="twin-advanced twin-details"><summary>Xem toàn bộ dữ liệu đã dùng</summary><div id="farmDataSnapshot">${farmDataSnapshotHTML(m)}</div></details>
          <details class="twin-advanced twin-details"><summary>Điều kiện môi trường tại vị trí đã chọn</summary>${weather?`<div class="environment-grid"><div><small>Nhiệt độ</small><b>${fmt(weather.temperature_2m)} °C</b>${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'mô hình tại tọa độ')}</div><div><small>Độ ẩm không khí</small><b>${fmt(weather.relative_humidity_2m,0)}%</b>${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'RH ở 2 m')}</div><div><small>Mưa hiện tại</small><b>${fmt(weather.precipitation)} mm</b>${src('Open-Meteo',state.weatherUrl||SRC.forecastDocs,'mô hình tại tọa độ')}</div><div><small>Độ ẩm đất</small><b>${has(p.soilMoisture)?`${esc(p.soilMoisture)}%`:'Chưa có số đo'}</b>${has(p.soilMoisture)?'<span class="source-note">Nguồn: người dùng nhập từ thiết bị</span>':'<span class="source-note">Không suy ra từ độ ẩm không khí</span>'}</div></div>`:`<div class="muted">Chưa có dữ liệu môi trường. <button class="btn outline small" data-go="location">Chọn vị trí →</button></div>`}</details>${weather?openMeteoAttribution():''}
          <div class="source-note model-source"><i class="source-dot"></i>Mô hình dựng từ hồ sơ vườn; kích thước và hình thái cây chưa đo được hiển thị minh họa. <a class="src" href="${SRC.three}" target="_blank" rel="noreferrer">Three.js ↗</a></div>
        </section>
      </div>`;
  }
  function updateFarm3dDetails(){
    const m=computeFarmModel(state.profile),v=$('#farmValidation');if(v)v.innerHTML=farmValidationHTML(m);
    const sm=$('#farmSummary');if(sm)sm.innerHTML=farmSummaryHTML(m);
    const ds=$('#farmDataSnapshot');if(ds)ds.innerHTML=farmDataSnapshotHTML(m);
    const meta=$('#farmLiveMeta');if(meta)meta.innerHTML=farmLiveMetaHTML(m);const soilLegend=$('#farmSoilLegend');if(soilLegend)soilLegend.innerHTML=soilSliceLegendHTML(state.profile);
    const title=$('#farmSceneTitle');if(title)title.textContent=state.profile.farmName||'Vườn 3D của tôi';
    const sub=$('#farmSceneSubtitle');if(sub)sub.textContent=`${state.profile.crop||'Chưa chọn cây'} · ${m.valid?`${fmt(m.area,1)} m²`:'Chưa nhập kích thước'} · ${m.trees.length} cây`;
    if(state.selectedTree){const selected=m.trees.find(t=>t.index===state.selectedTree.index);setSelectedTree(selected||null,m);}
  }
  // National crop screening catalogue. It is a transparent rule-based shortlist,
  // not a direct download of the FAO GAEZ/EcoCrop database and not a yield/profit model.
  const CROP_CATALOG = [
    {id:'na',name:'Na',group:'Cây ăn quả',water:'medium',soil:['loam','alluvial','red-yellow','mixed'],terrain:['hill','slope','terrace'],drainage:'good',capital:'medium',labor:'medium',goal:{income:5,household:4,'low-water':3,sustainable:4,mixed:4},desc:'Cây ăn quả lâu năm; ưu tiên đất thoát nước, tầng đất phù hợp và tỉa cành đúng kỹ thuật.',local:'na'},
    {id:'star-anise',name:'Hồi',group:'Cây lâm sản / gia vị',water:'medium',soil:['loam','red-yellow','mixed'],terrain:['hill','slope'],drainage:'good',capital:'medium',labor:'low',goal:{income:4,household:2,'low-water':4,sustainable:5,mixed:4},desc:'Cây lâu năm; cần vùng trồng có độ cao, khí hậu và đất phù hợp.',local:'star'},
    {id:'citrus',name:'Cam / quýt',group:'Cây ăn quả',water:'medium',soil:['loam','alluvial','mixed'],terrain:['hill','slope','plain','terrace'],drainage:'good',capital:'medium',labor:'high',goal:{income:4,household:5,'low-water':2,sustainable:3,mixed:5},desc:'Nhóm cây có múi; chú ý thoát nước, giống và thị trường đầu ra.',local:'citrus'},
    {id:'pomelo',name:'Bưởi',group:'Cây ăn quả',water:'medium',soil:['loam','alluvial','mixed'],terrain:['plain','hill','terrace'],drainage:'good',capital:'medium',labor:'medium',goal:{income:4,household:5,'low-water':2,sustainable:4,mixed:5},desc:'Cây ăn quả lâu năm; cần nguồn nước và thoát nước phù hợp.',local:null},
    {id:'banana',name:'Chuối',group:'Cây ăn quả / thực phẩm',water:'high',soil:['loam','alluvial','mixed'],terrain:['plain','valley'],drainage:'medium',capital:'low',labor:'medium',goal:{income:4,household:5,'low-water':1,sustainable:3,mixed:4},desc:'Có thể cho sản phẩm sớm hơn nhiều cây lâu năm; nhạy với gió mạnh và thiếu nước.',local:null},
    {id:'mango',name:'Xoài',group:'Cây ăn quả',water:'medium',soil:['loam','sandy','mixed'],terrain:['plain','hill','terrace'],drainage:'good',capital:'medium',labor:'medium',goal:{income:5,household:4,'low-water':3,sustainable:4,mixed:4},desc:'Cần đánh giá mùa khô, thoát nước, giống và điều kiện ra hoa tại địa phương.',local:null},
    {id:'longan',name:'Nhãn',group:'Cây ăn quả',water:'medium',soil:['loam','alluvial','mixed'],terrain:['plain','hill'],drainage:'good',capital:'medium',labor:'medium',goal:{income:4,household:4,'low-water':3,sustainable:4,mixed:4},desc:'Cây ăn quả lâu năm; cần đối chiếu khí hậu ra hoa và thị trường địa phương.',local:null},
    {id:'lychee',name:'Vải',group:'Cây ăn quả',water:'medium',soil:['loam','red-yellow','mixed'],terrain:['hill','slope','plain'],drainage:'good',capital:'medium',labor:'high',goal:{income:5,household:4,'low-water':3,sustainable:4,mixed:4},desc:'Cần điều kiện khí hậu phù hợp cho phân hóa mầm hoa và kỹ thuật chăm sóc theo vùng.',local:null},
    {id:'tea',name:'Chè',group:'Cây công nghiệp',water:'medium',soil:['loam','red-yellow','mixed'],terrain:['hill','slope','terrace'],drainage:'good',capital:'medium',labor:'high',goal:{income:4,household:3,'low-water':3,sustainable:5,mixed:4},desc:'Có thể gắn với vùng đồi; cần khảo sát pH, tầng đất, khí hậu và cơ sở chế biến/thu mua.',local:null},
    {id:'coffee',name:'Cà phê',group:'Cây công nghiệp',water:'high',soil:['red-yellow','loam','mixed'],terrain:['hill','slope'],drainage:'good',capital:'high',labor:'medium',goal:{income:5,household:2,'low-water':1,sustainable:3,mixed:3},desc:'Cần vùng sinh thái phù hợp, nước mùa khô, giống và đầu ra.',local:null},
    {id:'cinnamon',name:'Quế',group:'Cây lâm sản / gia vị',water:'medium',soil:['red-yellow','loam','mixed'],terrain:['hill','slope'],drainage:'good',capital:'medium',labor:'medium',goal:{income:4,household:2,'low-water':4,sustainable:5,mixed:4},desc:'Cây lâu năm; cần kiểm tra sinh thái địa phương, giống, kỹ thuật và chu kỳ thu hoạch.',local:null},
    {id:'macadamia',name:'Mắc ca',group:'Cây ăn quả / hạt',water:'medium',soil:['loam','red-yellow','mixed'],terrain:['hill','slope','terrace'],drainage:'good',capital:'high',labor:'medium',goal:{income:4,household:3,'low-water':3,sustainable:4,mixed:3},desc:'Cần khí hậu phù hợp, giống tốt, điều kiện thụ phấn và vốn đầu tư.',local:null},
    {id:'cassava',name:'Sắn (khoai mì)',group:'Cây hàng năm',water:'low',soil:['sandy','red-yellow','mixed'],terrain:['hill','slope','plain'],drainage:'good',capital:'low',labor:'medium',goal:{income:3,household:4,'low-water':5,sustainable:2,mixed:3},desc:'Cây hàng năm tương đối chịu điều kiện khô hơn một số cây ăn quả; cần quản lý xói mòn trên đất dốc.',local:null},
    {id:'maize',name:'Ngô',group:'Cây hàng năm',water:'medium',soil:['loam','alluvial','mixed'],terrain:['plain','hill','terrace'],drainage:'medium',capital:'low',labor:'medium',goal:{income:3,household:5,'low-water':3,sustainable:3,mixed:4},desc:'Có thể cân nhắc theo mùa vụ; cần lịch gieo trồng, nước và đầu ra tại địa phương.',local:null},
    {id:'rice',name:'Lúa',group:'Cây lương thực',water:'high',soil:['alluvial','loam','clay'],terrain:['plain','valley','terrace'],drainage:'slow',capital:'medium',labor:'high',goal:{income:3,household:5,'low-water':1,sustainable:3,mixed:4},desc:'Cần mặt ruộng phù hợp và nguồn nước thủy lợi ổn định.',local:null},
    {id:'jackfruit',name:'Mít',group:'Cây ăn quả',water:'medium',soil:['loam','sandy','red-yellow','mixed'],terrain:['plain','hill','terrace'],drainage:'good',capital:'low',labor:'medium',goal:{income:4,household:5,'low-water':3,sustainable:4,mixed:5},desc:'Cần chọn giống, kiểm tra khả năng thoát nước, mật độ và nhu cầu thị trường.',local:null},
    {id:'dragon-fruit',name:'Thanh long',group:'Cây ăn quả',water:'low',soil:['sandy','loam','mixed'],terrain:['plain','hill'],drainage:'good',capital:'high',labor:'medium',goal:{income:5,household:3,'low-water':5,sustainable:3,mixed:3},desc:'Cần hệ thống trụ, nắng, thoát nước, vốn và kênh tiêu thụ; kiểm tra phù hợp khí hậu địa phương.',local:null},
    {id:'coconut',name:'Dừa',group:'Cây công nghiệp / ăn quả',water:'medium',soil:['sandy','alluvial','loam'],terrain:['plain'],drainage:'medium',capital:'medium',labor:'low',goal:{income:4,household:5,'low-water':3,sustainable:4,mixed:4},desc:'Cần kiểm tra khí hậu, nguy cơ lạnh, đất và nguồn nước tại khu vực.',local:null}
  ];
  const GOAL_LABELS={income:'Tăng thu nhập',household:'Phục vụ gia đình','low-water':'Ưu tiên ít nước',sustainable:'Bền vững lâu dài',mixed:'Kết hợp nhiều mục tiêu'};
  function inLangSon(){return provinceLabel()==='Lạng Sơn';}
  function normalizePlaceText(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function provinceLabel(){
    const raw=String(state.location?.address||state.location?.label||'');
    const text=normalizePlaceText(raw);
    const known=['Lạng Sơn','Cao Bằng','Tuyên Quang','Thái Nguyên','Lào Cai','Điện Biên','Lai Châu','Sơn La','Phú Thọ','Bắc Ninh','Quảng Ninh','Hà Nội','Hải Phòng','Hưng Yên','Ninh Bình','Thanh Hóa','Nghệ An','Hà Tĩnh','Quảng Trị','Huế','Đà Nẵng','Quảng Ngãi','Gia Lai','Đắk Lắk','Khánh Hòa','Lâm Đồng','Đồng Nai','TP. Hồ Chí Minh','Tây Ninh','Đồng Tháp','Vĩnh Long','An Giang','Cần Thơ','Cà Mau'];
    const aliases={'tp ho chi minh':'TP. Hồ Chí Minh','ho chi minh':'TP. Hồ Chí Minh','thua thien hue':'Huế','thanh pho hue':'Huế'};
    for(const [needle,label] of Object.entries(aliases)){if(text.includes(normalizePlaceText(needle)))return label;}
    return known.find(n=>text.includes(normalizePlaceText(n)))||'';
  }
  function goalPreference(crop,goal){return Number(crop.goal?.[goal]??3);}
  function scoreCrop(crop,p,goal){
    // These are transparent decision-priority weights, not measured agronomic suitability probabilities.
    // The selected objective is intentionally the strongest input so changing goals changes the shortlist.
    let score=10+goalPreference(crop,goal)*14,used=0,matched=0,conflicts=[];
    const add=(key,match,positive=4,negative=6)=>{if(!has(p[key]))return;used++;if(match){score+=positive;matched++;}else{score-=negative;conflicts.push(key);}};
    if(has(p.soilType))add('soilType',crop.soil.includes(normalizeSoilType(p.soilType)),5,7);
    if(has(p.drainage))add('drainage',crop.drainage==='medium'||p.drainage===crop.drainage||(crop.drainage==='good'&&p.drainage==='fast'),4,7);
    if(has(p.terrain))add('terrain',crop.terrain.includes(p.terrain),5,8);
    if(has(p.waterAvailability)){
      let match=true,penalty=6;
      if(p.waterAvailability==='limited'){match=crop.water==='low';penalty=crop.water==='high'?15:8;}
      else if(p.waterAvailability==='seasonal'){match=crop.water!=='high';penalty= crop.water==='high'?9:6;}
      else if(p.waterAvailability==='reliable'){match=true;}
      add('waterAvailability',match,5,penalty);
    }
    if(has(p.investment))add('investment',p.investment===crop.capital||(p.investment==='high'),3,6);
    if(has(p.labor))add('labor',p.labor===crop.labor||(p.labor==='high'),3,5);
    const slope=parseSlopeInput(p.slope);
    if(has(p.slope)&&slope.valid){used++;if(slope.ratio>.15&&!crop.terrain.includes('slope')){score-=7;conflicts.push('slope');}else{score+=3;matched++;}}
    // Do not infer pH/temperature/rainfall suitability unless verified species-specific thresholds are available.
    // Climate data is shown as regional context, not falsely converted into a suitability score.
    if(has(p.risk)&&p.risk==='low'&&crop.capital==='high'){used++;score-=5;conflicts.push('risk-capital');}
    score=Math.max(0,Math.min(100,Math.round(score)));
    return {score,used,matched,coverage:used?Math.round(matched/used*100):0,conflicts,goalPriority:goalPreference(crop,goal)};
  }
  function rankCrops(goal=state.goal||state.profile.purpose||'mixed',profile=state.profile){
    const validGoal=GOAL_LABELS[goal]?goal:'mixed';
    const list=CROP_CATALOG.map(c=>({...c,...scoreCrop(c,profile,validGoal)}));
    return list.sort((a,b)=>b.score-a.score||b.goalPriority-a.goalPriority||a.name.localeCompare(b.name,'vi'));
  }
  function setAdvisorGoal(goal){
    if(!GOAL_LABELS[goal])return false;
    state.goal=goal;state.profile.purpose=goal;save();return true;
  }
  function missingForAdvisor(){const m=[];[['soilType','loại đất'],['soilPH','pH đất'],['drainage','khả năng thoát nước'],['waterAvailability','khả năng cấp nước'],['terrain','địa hình'],['slope','độ dốc'],['investment','mức vốn'],['labor','nhân lực'],['market','kênh tiêu thụ']].forEach(([k,l])=>{if(!has(state.profile[k]))m.push(l);});return m;}
  function cropEvidence(crop){
    const province=provinceLabel();
    if(province==='Lạng Sơn'&&crop.local==='na')return src('Sở NN&MT Lạng Sơn – hướng dẫn kỹ thuật cây na',SRC.naGuide,'Tài liệu kỹ thuật địa phương');
    if(province==='Lạng Sơn'&&crop.local==='citrus')return src('Sở NN&MT Lạng Sơn – hướng dẫn kỹ thuật cây quýt',SRC.quytGuide,'Tài liệu kỹ thuật địa phương');
    if(province==='Lạng Sơn'&&crop.local==='star')return src('Sở NN&MT Lạng Sơn – hướng dẫn kỹ thuật cây hồi',SRC.hồi,'Tài liệu kỹ thuật địa phương');
    return `${src('FAO GAEZ – Global Agro-Ecological Zoning',SRC.gaez,'Điều kiện sinh thái cây trồng')}${src('FAO ECOCROP – yêu cầu sinh thái cây trồng',SRC.ecocrop,'Yêu cầu môi trường của cây trồng')}`;
  }
  function renderAdvisor(){
    const missing=missingForAdvisor(),goal=state.goal||state.profile.purpose||'mixed',ranked=rankCrops(goal),prov=provinceLabel();
    const profileRows=[['Vị trí',state.location?.address||state.location?.label||'Chưa chọn'],['Loại đất',state.profile.soilType||'Chưa nhập'],['Thoát nước',state.profile.drainage||'Chưa nhập'],['Nguồn nước',state.profile.waterAvailability||'Chưa nhập'],['Địa hình',state.profile.terrain||'Chưa nhập'],['Vốn / công',`${state.profile.investment||'Chưa nhập'} / ${state.profile.labor||'Chưa nhập'}`]];
    return `${pageTitle('SMART CROP ADVISOR','Đề xuất cây trồng','Chọn mục tiêu để xem nhóm cây phù hợp với điều kiện khu vườn.')}
      <div class="grid2"><section class="panel"><div class="panel-head"><div><h3>Mục tiêu canh tác</h3><p>Thứ tự cây trồng thay đổi theo mục tiêu</p></div>♧</div><div class="choice-stack">${Object.entries(GOAL_LABELS).map(([v,l])=>`<label class="choice ${(goal===v)?'active':''}"><input type="radio" name="goal" value="${v}" ${goal===v?'checked':''}><span>${l}</span></label>`).join('')}</div><div class="notice-inline">Đất, nước, địa hình, vốn và nhân lực cũng ảnh hưởng đến kết quả.</div></section>
      <section class="panel"><div class="panel-head"><div><h3>Điều kiện khu vườn</h3><p>${prov?`Khu vực: ${esc(prov)}`:'Chưa chọn địa phương'}</p></div>◎</div>${profileRows.map(([k,v])=>`<div class="data-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}<button class="btn outline block" data-go="profile">Cập nhật hồ sơ vườn →</button><div class="regional-climate-card"><b>Khí hậu NASA POWER</b>${state.climate?`<p>Nhiệt độ trung bình: ${fmt(climateAnnual('T2M'))} °C · Độ ẩm: ${fmt(climateAnnual('RH2M'))}% · Mưa: ${fmt(climateAnnual('PRECTOTCORR'))} mm/ngày.</p>`:`<p>${state.climateError?'Chưa tải được dữ liệu khí hậu.':'Đang tải dữ liệu khí hậu.'}</p>`}${src('NASA POWER Climatology API',climateUrl(),'Khí hậu dài hạn tại tọa độ')}</div></section></div>
      ${pestTreadmillCard(true)}
      <section class="panel rotation-promo"><div><span class="eyebrow">CROP SEQUENCE</span><h3>Lập kế hoạch luân canh & xen canh</h3><p>Xem cây vụ sau, cây phủ đất và cây trồng xen theo lịch sử vườn.</p></div><button class="btn primary" data-go="rotation">Mở kế hoạch →</button></section>
      <div class="section-head" id="suitableCropsHead"><div><h2>Đề xuất cây trồng phù hợp</h2><p>${GOAL_LABELS[goal]} · ${ranked.length} loại cây trong danh mục</p></div></div>
      <div class="candidate-grid">${ranked.slice(0,8).map((c,i)=>`<article class="panel candidate crop-ranked"><div class="crop-rank-row"><span class="crop-rank">#${i+1}</span><span class="tag">${esc(c.group)}</span></div><h3>${esc(c.name)}</h3><div class="crop-score"><b>${c.score}</b><small>điểm ưu tiên</small></div><p>${esc(c.desc)}</p><div class="crop-fit"><span>Thông tin đối chiếu: <b>${c.used?`${c.matched}/${c.used} yếu tố`:'Chưa có'}</b></span><div class="score-track"><i style="width:${c.score}%"></i></div></div><small class="crop-traits">Nước: ${c.water==='low'?'Thấp':c.water==='medium'?'Trung bình':'Cao'} · Vốn: ${c.capital==='low'?'Thấp':c.capital==='medium'?'Trung bình':'Cao'} · Công: ${c.labor==='low'?'Ít':c.labor==='medium'?'Vừa':'Nhiều'}</small>${cropEvidence(c)}</article>`).join('')}</div>
      <section class="panel crop-method"><h3>Cơ sở xếp hạng</h3><p>Điểm ưu tiên phản ánh mức phù hợp theo hồ sơ hiện tại.</p><p><b>Khu vực:</b> ${prov==='Lạng Sơn'?'Có tài liệu địa phương cho na, quýt và hồi.':'Chưa có tài liệu khuyến nông địa phương trong danh mục.'} Nguồn FAO dùng để đối chiếu điều kiện sinh thái.</p>${missing.length?`<div class="alert info"><b>Chưa nhập:</b> ${missing.join(', ')}. <button class="btn outline small" data-go="profile">Cập nhật hồ sơ →</button></div>`:''}</section>`;
  }
  const ROTATION_CROPS=[
    {id:'maize',name:'Ngô',family:'poaceae',water:'medium',season:'Tùy vùng/vụ',goal:{income:4,household:5,'low-water':3,sustainable:3,mixed:4},notes:'Cây hòa thảo; không nên lặp liên tiếp nếu đang có áp lực sâu bệnh hoặc suy giảm đất. Có thể cân nhắc luân canh với cây họ đậu khi lịch vụ và nước phù hợp.'},
    {id:'rice',name:'Lúa',family:'poaceae',water:'high',season:'Theo hệ thống thủy lợi và lịch địa phương',goal:{income:3,household:5,'low-water':1,sustainable:3,mixed:4},notes:'Chỉ cân nhắc khi có điều kiện ruộng, thủy lợi và mùa vụ tương ứng; không gợi ý cho vườn đồi khô.'},
    {id:'soybean',name:'Đậu tương',family:'fabaceae',water:'medium',season:'Theo lịch gieo trồng địa phương',goal:{income:4,household:4,'low-water':3,sustainable:5,mixed:4},notes:'Cây họ đậu có thể cố định N khi có nốt sần và chủng vi khuẩn cộng sinh hữu hiệu; lượng N để lại phụ thuộc sinh khối, phần thân lá được trả lại đất và quản lý sau thu hoạch.'},
    {id:'mungbean',name:'Đậu xanh',family:'fabaceae',water:'low',season:'Theo lịch gieo trồng địa phương',goal:{income:4,household:5,'low-water':4,sustainable:4,mixed:5},notes:'Cây họ đậu ngắn ngày; có thể là ứng viên luân canh hoặc xen canh trong một số hệ thống, nhưng phải xét thời gian vụ, cạnh tranh nước và tán che.'},
    {id:'peanut',name:'Lạc (đậu phộng)',family:'fabaceae',water:'medium',season:'Theo lịch gieo trồng địa phương',goal:{income:4,household:5,'low-water':3,sustainable:4,mixed:4},notes:'Cây họ đậu; có thể đa dạng hóa hệ thống sau cây hòa thảo. Cần đất tơi, thoát nước và điều kiện thu hoạch phù hợp.'},
    {id:'cowpea',name:'Đậu đũa / đậu bò',family:'fabaceae',water:'low',season:'Theo lịch gieo trồng địa phương',goal:{income:3,household:5,'low-water':4,sustainable:4,mixed:4},notes:'Cây họ đậu có thể dùng làm cây thực phẩm hoặc cây phủ theo hệ thống. Cần chọn giống và thời vụ địa phương.'},
    {id:'cassava',name:'Sắn',family:'euphorbiaceae',water:'low',season:'Theo vùng sinh thái; ví dụ xen đậu xanh có tài liệu ở miền Trung',goal:{income:4,household:3,'low-water':5,sustainable:2,mixed:3},notes:'Tài liệu Việt Nam có ví dụ xen đậu xanh/lạc với sắn ở một số vùng miền Trung; khoảng cách và lịch trồng cần theo điều kiện địa phương.'},
    {id:'sweetpotato',name:'Khoai lang',family:'convolvulaceae',water:'medium',season:'Theo lịch địa phương',goal:{income:3,household:5,'low-water':3,sustainable:3,mixed:4},notes:'Cần đất tơi, tầng canh tác phù hợp và lịch thu hoạch; chọn sau cây khác họ nếu lịch vụ cho phép.'},
    {id:'mustard',name:'Cải / rau họ cải',family:'brassicaceae',water:'medium',season:'Tùy khí hậu và mùa mát',goal:{income:4,household:5,'low-water':3,sustainable:3,mixed:4},notes:'Không nên trồng nối tiếp liên tục với cây cùng họ khi có nguy cơ bệnh đất hoặc sâu hại chuyên tính của họ cải.'},
    {id:'tomato',name:'Cà chua / ớt',family:'solanaceae',water:'medium',season:'Theo lịch địa phương; chú ý quản lý bệnh',goal:{income:5,household:4,'low-water':2,sustainable:2,mixed:3},notes:'Cùng họ Cà với khoai tây, cà tím, ớt; tránh luân phiên sát nhau nếu có bệnh/hại chung.'},
    {id:'cucumber',name:'Dưa chuột / bầu bí',family:'cucurbitaceae',water:'medium',season:'Cần lịch địa phương',goal:{income:4,household:4,'low-water':3,sustainable:3,mixed:4},notes:'Cần bố trí giàn/không gian và quản lý bệnh; tránh lặp cây cùng họ liên tiếp nếu có bệnh hại tồn lưu.'},
    {id:'sesame',name:'Vừng (mè)',family:'pedaliaceae',water:'low',season:'Cần lịch địa phương',goal:{income:3,household:3,'low-water':5,sustainable:3,mixed:3},notes:'Ứng viên chịu điều kiện khô tương đối; phải kiểm tra đất, thời vụ và đầu ra tại địa phương.'}
  ];
  const ROTATION_COMPANIONS=[
    {id:'arachis-cover',name:'Cỏ lạc dại (Arachis pintoi)',type:'Cây phủ đất họ đậu',benefits:'Tạo lớp phủ sống, giảm đất trống và có sinh khối họ đậu; có tiềm năng góp phần cố định N khi cộng sinh hữu hiệu.',caveat:'Nghiên cứu tại Việt Nam ở vườn chè/hồ tiêu. Chừa cổ rễ và lối đi; theo dõi cạnh tranh nước, ánh sáng.',source:'arachis'},
    {id:'legume-strip',name:'Dải cây họ đậu ngắn ngày (đậu xanh/đậu bò)',type:'Luân/xen canh họ đậu',benefits:'Đa dạng họ cây, tạo sản phẩm phụ và có thể bổ sung sinh khối N nếu thân lá được quản lý trả lại đất.',caveat:'Bố trí theo lịch vụ, nước và ánh sáng. Phần N cố định không chuyển ngay toàn bộ sang cây chính.',source:'fao'},
    {id:'native-flower-strip',name:'Dải hoa bản địa phù hợp địa phương',type:'Dải sinh cảnh cho thiên địch',benefits:'Một số loài hoa có thể cung cấp mật/phấn và nơi trú cho côn trùng có ích trong hệ thống phù hợp.',caveat:'Chọn loài bản địa, không xâm lấn; theo dõi sâu bệnh và thiên địch tại vườn.',source:'ipm'},
    {id:'marigold',name:'Cúc vạn thọ (Tagetes spp.) – chỉ khi có mục tiêu tuyến trùng cụ thể',type:'Cây thử nghiệm quản lý tuyến trùng',benefits:'Một số giống Tagetes có thể ức chế một số loài tuyến trùng khi trồng thành luống dày trong khoảng thời gian thích hợp.',caveat:'Chỉ dùng giống có hiệu lực với tuyến trùng đã xác định; trồng thành luống luân canh, không dùng như cây xua rệp/nhện đỏ.',source:'marigold'}
  ];
  function cropFamily(value){
    const raw=String(value||'').toLowerCase().trim();
    // Preserve diacritic-sensitive cases that become identical after normalization (dừa vs dưa).
    if(/(^|\s)dừa(\s|$)/.test(raw)||/(^|\s)chuối(\s|$)/.test(raw))return 'perennial';
    const t=normalizePlaceText(value);if(!t)return 'unknown';
    const hasWord=(word)=>` ${t} `.includes(` ${word} `);
    const hasAny=(words)=>words.some(hasWord);
    // Exact word/phrase matching avoids false positives such as "đậu nành" containing "na".
    if(hasAny(['na','mang cau','hoi','quyt','cam','buoi','xoai','vai','nhan','mit','thanh long','mac ca','que','cay an qua','che','ca phe','tieu','cacao','ca cao','chanh','bo','sau rieng','cay lau nam']))return 'perennial';
    if(hasAny(['ngo','lua','thoc','lua mi','lua mach','ke','cao luong','sorghum','maize','millet','wheat']))return 'poaceae';
    if(hasAny(['dau tuong','dau nanh','dau xanh','dau do','dau den','dau bo','dau dua','lac','dau phong','dau dai','cowpea','soybean','mung bean','peanut']))return 'fabaceae';
    if(hasAny(['san','khoai mi','cassava']))return 'euphorbiaceae';
    if(hasAny(['khoai lang','sweet potato']))return 'convolvulaceae';
    if(hasAny(['ca chua','ot','ca tim','khoai tay','tomato','pepper','potato']))return 'solanaceae';
    if(hasAny(['cai','bap cai','súp lo','cu cai','cu cai trang','mustard','cabbage','radish']))return 'brassicaceae';
    if(hasAny(['dua','bau','bi','muop','dua chuot','cucumber','pumpkin','squash']))return 'cucurbitaceae';
    if(hasAny(['vung','me','sesame']))return 'pedaliaceae';
    return 'unknown';
  }
  function cropFamilyLabel(family){
    return ({poaceae:'Hòa thảo',fabaceae:'Họ đậu',euphorbiaceae:'Thầu dầu',convolvulaceae:'Bìm bìm',solanaceae:'Cà',brassicaceae:'Cải',cucurbitaceae:'Bầu bí',pedaliaceae:'Vừng',perennial:'Cây lâu năm',unknown:'Chưa nhận diện'})[family]||'Chưa nhận diện';
  }
  function cropNameFromInput(r=state.rotation){
    if(r.currentCrop==='other')return String(r.currentCropOther||'Cây chưa định danh').trim();
    if(r.currentCrop==='none')return '';
    if(r.currentCrop==='perennial')return state.profile.crop||'Cây lâu năm';
    const known={maize:'Ngô',rice:'Lúa',soybean:'Đậu tương',mungbean:'Đậu xanh',peanut:'Lạc',cowpea:'Đậu bò',cassava:'Sắn',sweetpotato:'Khoai lang',mustard:'Rau họ cải',tomato:'Cà chua/ớt',cucumber:'Dưa/bầu bí'};
    return known[r.currentCrop]||r.currentCrop||state.profile.crop||'';
  }
  function parseRotationHistory(r=state.rotation){
    return String(r.historyText||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(-8).map(line=>{
      const crop=line.includes(':')?line.split(':').slice(1).join(':').trim():line;
      return {raw:line,crop,family:cropFamily(crop)};
    });
  }
  function rotationCandidateScore(c,context){
    let score=50,reasons=[],warnings=[];
    const lastFamily=context.lastFamily;
    if(context.currentFamily==='perennial'){
      score=0;warnings.push('Vườn cây lâu năm: không thay cây chính bằng cây hàng năm trong tư vấn tự động.');
    }else{
      if(context.currentCropName&&normalizePlaceText(context.currentCropName)===normalizePlaceText(c.name)){score-=30;warnings.push('Đây là đúng cây vừa trồng; ưu tiên phương án khác để đa dạng hóa mùa vụ.');}
      if(lastFamily!=='unknown'&&c.family!==lastFamily){score+=22;reasons.push('Khác họ với cây gần nhất, giúp đa dạng hóa chuỗi cây trồng.');}
      else if(lastFamily!=='unknown'&&c.family===lastFamily){score-=20;warnings.push('Cùng họ với cây gần nhất; cần xem xét sâu bệnh và thời gian cách ly luân canh.');}
      if(context.repeatedFamilyCount>=2&&c.family===lastFamily){score-=14;warnings.push('Họ cây này đã lặp ít nhất hai vụ gần đây.');}
      const availability=context.waterAvailability;
      if(availability==='limited'){if(c.water==='low'){score+=10;reasons.push('Nhu cầu nước trong danh mục ở mức thấp hơn.');}else if(c.water==='high'){score-=16;warnings.push('Nhu cầu nước cao có thể không phù hợp khi nguồn nước hạn chế.');}}
      if(availability==='seasonal'&&c.water==='high'){score-=8;warnings.push('Nguồn nước theo mùa; cần xác nhận đủ nước cho cả vụ.');}
      const goal=GOAL_LABELS[context.goal]?context.goal:'mixed';score+=(Number(c.goal?.[goal]||3)-3)*5;
      if(context.slopeHigh&&['cassava','maize'].includes(c.id)){score-=7;warnings.push('Trên đất dốc cần ưu tiên che phủ/đường đồng mức; làm đất trống có thể tăng xói mòn.');}
      if(context.profile.soilType==='clay'&&c.id==='rice'){score+=2;reasons.push('Đất sét có thể phù hợp một số hệ thống lúa nếu có địa hình bằng, quản lý nước và thủy lợi tương ứng.');}
      if(context.profile.terrain==='slope'&&c.id==='rice'){score-=20;warnings.push('Lúa nước cần mặt ruộng bằng và nguồn nước ổn định.');}
      if(context.profile.drainage==='slow'&&['peanut','sesame','cassava'].includes(c.id))warnings.push('Đất thoát nước chậm có thể không phù hợp; cần kiểm tra úng và tầng đất trước khi chọn cây này.');
      if(context.profile.drainage==='fast'&&c.id==='rice')warnings.push('Đất thoát nước nhanh có thể làm tăng nhu cầu cấp nước cho hệ thống lúa.');
      if(context.hasForecast&&context.hotDays>=3&&c.water==='high')warnings.push(`Dự báo ngắn hạn có ${context.hotDays} ngày ≥34°C; cần kiểm tra khả năng cấp nước. Dự báo 7 ngày không đại diện cả vụ.`);
      if(context.hasForecast&&context.eto7>=28&&c.water!=='low')warnings.push(`ET₀ tham chiếu 7 ngày: ${context.eto7.toFixed(1)} mm; cần xét thêm đất, cây và hệ thống tưới.`);
      if(context.hasForecast&&context.rain7>=70&&context.profile.drainage==='slow')warnings.push(`Dự báo mưa 7 ngày khoảng ${context.rain7.toFixed(1)} mm; cần đánh giá thoát nước trước khi xuống giống.`);
    }
    return {...c,score:Math.max(0,Math.min(100,Math.round(score))),reasons,warnings};
  }
  function buildRotationPlan(r=state.rotation){
    const profile=state.profile||blankProfile;
    const rotationCrop=cropNameFromInput(r);
    const currentCrop=r.currentCrop==='none'?'':(rotationCrop||profile.crop||'');
    const currentCropSource=rotationCrop?'Mục luân canh':(has(profile.crop)?'Hồ sơ vườn':'Chưa nhập');
    const currentFamily=cropFamily(currentCrop),history=parseRotationHistory(r),historyFamilies=history.map(h=>h.family).filter(f=>f!=='unknown');
    const lastFamily=historyFamilies.at(-1)||currentFamily;
    const inferredPerennial=currentFamily==='perennial'||lastFamily==='perennial';
    const system=r.systemType||(inferredPerennial?'perennial':currentFamily==='unknown'?'unknown':'annual');
    const sequence=[...historyFamilies];if(currentFamily!=='unknown'&&(!sequence.length||sequence.at(-1)!==currentFamily))sequence.push(currentFamily);
    let repeatedFamilyCount=0;for(let i=sequence.length-1;i>=0&&sequence[i]===lastFamily;i--)repeatedFamilyCount++;
    const d=state.weather?.daily||{},hotDays=(d.temperature_2m_max||[]).filter(v=>Number.isFinite(Number(v))&&Number(v)>=34).length;
    const rain7=(d.precipitation_sum||[]).slice(0,7).reduce((sum,v)=>sum+(Number.isFinite(Number(v))?Number(v):0),0);
    const eto7=(d.et0_fao_evapotranspiration||[]).slice(0,7).reduce((sum,v)=>sum+(Number.isFinite(Number(v))?Number(v):0),0);
    const context={currentFamily,currentCropName:currentCrop,lastFamily,repeatedFamilyCount,waterAvailability:profile.waterAvailability,goal:r.mainGoal||state.goal||profile.purpose||'mixed',slopeHigh:/dốc|slope|hill/.test(String(profile.terrain||''))||((parseSlopeInput(profile.slope).valid)&&parseSlopeInput(profile.slope).ratio>.15),profile,hotDays,rain7,eto7,hasForecast:!!d.time};
    const perennial=system==='perennial'||currentFamily==='perennial'||(r.systemType!=='annual'&&lastFamily==='perennial');
    let candidates=ROTATION_CROPS.map(c=>rotationCandidateScore(c,{...context,currentFamily:perennial?'perennial':currentFamily})).filter(c=>c.score>0);
    if(!perennial&&!currentCrop&&!history.length){
      candidates=rankCrops(context.goal,profile).filter(c=>system!=='annual'||cropFamily(c.name)!=='perennial').slice(0,5).map(c=>({...c,family:cropFamily(c.name),water:c.water,notes:c.desc,reasons:['Ưu tiên từ mục tiêu và các điều kiện đất/nước/địa hình đã nhập trong hồ sơ.'],warnings:c.used?[]:['Bổ sung vụ dự kiến và khu vực để đối chiếu lịch trồng.'],season:'Lịch gieo trồng: chưa có dữ liệu cấp tỉnh/huyện.'}));
    }
    if(perennial)candidates=[];
    candidates.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'vi'));
    let intercrops=[];
    if(perennial){
      intercrops=[ROTATION_COMPANIONS.find(c=>c.id==='arachis-cover'),ROTATION_COMPANIONS.find(c=>c.id==='native-flower-strip')].filter(Boolean);
      if(r.problem==='nematode')intercrops.push(ROTATION_COMPANIONS.find(c=>c.id==='marigold'));
    }else if(currentFamily==='poaceae'){
      intercrops=[ROTATION_COMPANIONS.find(c=>c.id==='legume-strip'),ROTATION_COMPANIONS.find(c=>c.id==='native-flower-strip')].filter(Boolean);
    }else{
      intercrops=[ROTATION_COMPANIONS.find(c=>c.id==='legume-strip'),ROTATION_COMPANIONS.find(c=>c.id==='native-flower-strip')].filter(Boolean);
    }
    if(r.problem==='nematode'&&!intercrops.some(c=>c.id==='marigold'))intercrops.push(ROTATION_COMPANIONS.find(c=>c.id==='marigold'));
    intercrops=intercrops.filter(Boolean);
    if(r.intercropGoal==='nitrogen')intercrops=intercrops.filter(c=>c.id==='arachis-cover'||c.id==='legume-strip');
    if(r.intercropGoal==='beneficial')intercrops=intercrops.filter(c=>c.id==='native-flower-strip'||c.id==='marigold');
    if(r.intercropGoal==='cover')intercrops=intercrops.filter(c=>c.id==='arachis-cover'||c.id==='legume-strip');
    const seasonNames={spring:'Vụ xuân / đông xuân',summer:'Vụ hè thu',autumn:'Vụ thu đông',winter:'Vụ đông',rainy:'Mùa mưa',dry:'Mùa khô'};
    const seasonNote=(!r.currentSeason||!r.nextSeason)?`Vụ hiện tại: ${r.currentSeason?(seasonNames[r.currentSeason]||r.currentSeason):'Chưa chọn'} · Vụ tiếp theo: ${r.nextSeason?(seasonNames[r.nextSeason]||r.nextSeason):'Chưa chọn'}.`:`${seasonNames[r.currentSeason]||r.currentSeason} → ${seasonNames[r.nextSeason]||r.nextSeason}`;
    const weatherNote=!context.hasForecast?'Chưa có dự báo 7 ngày.':`7 ngày tới: ${context.hotDays} ngày từ 34°C · mưa ${context.rain7.toFixed(1)} mm · ET₀ ${context.eto7.toFixed(1)} mm`;
    const region=provinceLabel()||'chưa xác định địa phương';
    const mainCropRotationRequired=!perennial;
    return {currentCrop,currentCropSource,currentFamily,system,perennial,history,historyFamilies,lastFamily,repeatedFamilyCount,candidates:candidates.slice(0,5),intercrops,seasonNote,weatherNote,region,mainGoal:context.goal,waterAvailability:context.waterAvailability,mainCropRotationRequired,hasCurrentCrop:!!currentCrop,hotDays:context.hotDays,rain7:context.rain7,eto7:context.eto7,hasForecast:context.hasForecast};
  }
  function rotationSourceList(plan){
    const list=[{name:'FAO Crop Calendar – lịch gieo trồng theo vùng sinh thái',href:SRC.faoCropCalendar},{name:'FAO – nguyên tắc IPM, luân canh và xen canh',href:SRC.faoRotation}];
    if(plan.intercrops.some(c=>c.id==='arachis-cover'))list.push({name:'WASI – nghiên cứu cỏ lạc dại tại Việt Nam (chè/hồ tiêu)',href:SRC.arachisVietnam});
    if(plan.intercrops.some(c=>c.id==='marigold'))list.push({name:'UC IPM – cây Tagetes và tuyến trùng',href:SRC.ucMarigold});
    if(plan.currentFamily==='poaceae'||plan.currentFamily==='fabaceae')list.push({name:'FAO – đa dạng hóa loài và luân canh',href:SRC.faoDiversification});
    if(/sắn|cassava/i.test(plan.currentCrop))list.push({name:'Tài liệu Việt Nam – xen đậu xanh/lạc với sắn ở một số vùng miền Trung',href:SRC.vnCassavaIntercrop});
    return list;
  }
  function rotationAssistantSummary(plan){
    if(plan.perennial){return `VƯỜN CÂY LÂU NĂM · ${plan.currentCrop||'Chưa ghi cây chính'}\n\nGiữ cây chính; xem xét cây phủ đất và dải hoa dưới tán.\n\n${plan.intercrops.map((c,i)=>`${i+1}. ${c.name}: ${c.benefits} Điều kiện: ${c.caveat}`).join('\n\n')}\n\nKhu vực: ${plan.region}. ${plan.weatherNote}. ${plan.seasonNote}.`}
    return `CÂY VỤ TIẾP THEO · ${plan.currentCrop||'Chưa ghi cây hiện tại'}\n\n${plan.candidates.map((c,i)=>`${i+1}. ${c.name} · ${c.score} điểm. ${c.reasons.join(' ')} ${c.warnings.join(' ')}`).join('\n\n')||'Chưa có cây để xếp thứ tự. Chọn cây gần nhất và khả năng cấp nước.'}\n\nCây xen/phủ đất: ${plan.intercrops.map(c=>c.name).join('; ')}.\n\nKhu vực: ${plan.region}. ${plan.weatherNote}. ${plan.seasonNote}.`;
  }
  function rotationEvidenceHTML(item){
    if(item.source==='arachis')return src('WASI – cỏ lạc dại tại Việt Nam (chè/hồ tiêu)',SRC.arachisVietnam,'Nghiên cứu tại một số hệ vườn lâu năm ở Việt Nam');
    if(item.source==='marigold')return src('UC IPM – Tagetes và tuyến trùng',SRC.ucMarigold,'Hiệu quả tùy giống và tuyến trùng mục tiêu');
    if(item.source==='ipm')return src('FAO – IPM theo điều kiện địa phương',SRC.faoRotation,'Điều chỉnh theo dịch hại và hệ cây trồng');
    return src('FAO – luân canh, xen canh và IPM',SRC.faoRotation,'Tài liệu tham khảo về luân canh và IPM');
  }
  function rotationResultsHTML(){
    const plan=buildRotationPlan();
    const cropText=plan.currentCrop?esc(plan.currentCrop):'Chưa nhập';
    const historyList=plan.history.length?plan.history.map(h=>`<li>${esc(h.raw)}${h.family==='unknown'?'':` · ${esc(cropFamilyLabel(h.family))}`}</li>`).join(''):'<li>Chưa ghi lịch sử vụ.</li>';
    const candidateBlock=plan.perennial
      ?`<div class="rotation-no-crop"><b>Vườn cây lâu năm: ${cropText}.</b><p>Giữ cây chính. Có thể xem xét cây phủ đất và dải hoa dưới tán.</p></div>`
      :plan.candidates.length?`<div class="rotation-candidates">${plan.candidates.map((c,i)=>`<article class="rotation-candidate"><div class="rotation-rank">#${i+1}</div><div class="rotation-candidate-main"><div class="rotation-candidate-title"><h4>${esc(c.name)}</h4><span class="rotation-score">${c.score} điểm</span></div><small>Họ cây: ${esc(cropFamilyLabel(c.family))} · Nhu cầu nước: ${c.water==='low'?'thấp':c.water==='medium'?'trung bình':'cao'}</small><p>${esc(c.notes)}</p>${c.reasons.map(x=>`<p class="rotation-reason">✓ ${esc(x)}</p>`).join('')}${c.warnings.map(x=>`<p class="rotation-warning">! ${esc(x)}</p>`).join('')}<p class="rotation-note">Thời vụ: ${esc(c.season)}.</p></div></article>`).join('')}</div>`
      :`<div class="rotation-no-crop">Chưa có ứng viên phù hợp. Chọn cây gần nhất, vụ dự kiến và nguồn nước.</div>`;
    const companionBlock=plan.intercrops.length?`<div class="rotation-companions">${plan.intercrops.map(c=>`<article class="rotation-companion"><span class="tag">${esc(c.type)}</span><h4>${esc(c.name)}</h4><p><b>Tác dụng:</b> ${esc(c.benefits)}</p><p class="rotation-warning"><b>Điều kiện áp dụng:</b> ${esc(c.caveat)}</p>${rotationEvidenceHTML(c)}</article>`).join('')}</div>`:'<div class="muted">Chọn mục đích cây xen/phủ để xem gợi ý.</div>';
    const noCropNote=!plan.hasCurrentCrop&&!plan.history.length?'<div class="notice-inline">Chưa ghi cây hiện tại hoặc lịch sử vụ. Đề xuất đang dựa trên hồ sơ đất, nước và mục tiêu.</div>':'';
    const r=state.rotation||rotationDefaults,p=state.profile||blankProfile;
    const seasonLabels={spring:'Vụ xuân / đông xuân',summer:'Vụ hè thu',autumn:'Vụ thu đông',winter:'Vụ đông',rainy:'Mùa mưa',dry:'Mùa khô'};
    const waterLabels={reliable:'Chủ động',seasonal:'Theo mùa',limited:'Hạn chế'};
    const soilLabels={clay:'Đất sét',loam:'Đất thịt',sandy:'Đất cát',alluvial:'Đất phù sa','red-yellow':'Đất feralit đỏ vàng',mixed:'Đất pha',other:'Khác'};
    const drainageLabels={fast:'Nhanh',medium:'Trung bình',slow:'Chậm / dễ úng'};
    const problemLabels={erosion:'Đất dốc / xói mòn',water:'Thiếu nước',soil:'Đất suy giảm / hữu cơ thấp',nematode:'Đã xác định tuyến trùng',pest:'Sâu bệnh trên cây',market:'Cần đa dạng đầu ra'};
    const contextFacts=[
      ['Vụ hiện tại / gần nhất',seasonLabels[r.currentSeason]||'Chưa chọn'],
      ['Vụ dự kiến tiếp theo',seasonLabels[r.nextSeason]||'Chưa chọn'],
      ['Mục tiêu chính',GOAL_LABELS[plan.mainGoal]||'Theo hồ sơ / chưa chọn'],
      ['Kiểu hệ thống',plan.perennial?'Vườn cây lâu năm':'Cây hàng năm / chưa xác định'],
      ['Khu vực',plan.region],
      ['Khả năng cấp nước',waterLabels[p.waterAvailability]||'Chưa nhập'],
      ['Loại đất / thoát nước',`${soilLabels[p.soilType]||'Chưa nhập'} / ${drainageLabels[p.drainage]||'Chưa nhập'}`],
      ['pH đất / độ dốc',`${has(p.soilPH)?p.soilPH:'Chưa đo'} / ${has(p.slope)?p.slope:'Chưa đo'}`],
      ['Vấn đề ưu tiên',problemLabels[r.problem]||'Chưa xác định'],
      ['Dự báo 7 ngày',plan.hasForecast?plan.weatherNote:'Chưa có dữ liệu dự báo']
    ];
    const seasonContext=`<section class="panel rotation-season-context"><div class="panel-head"><div><h3>Thông tin mùa vụ và điều kiện dùng để đề xuất</h3><p>Đối chiếu mùa hiện tại, mùa kế tiếp, lịch sử cây trồng và điều kiện vườn.</p></div><span class="tag">${plan.history.length} mốc lịch sử</span></div><div class="rotation-context-grid">${contextFacts.map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div><p class="small-note">Lịch mùa vụ trong danh mục hiện là hướng dẫn theo vùng sinh thái, chưa phải lịch gieo trồng chính xác theo xã/huyện. Cần đối chiếu lịch khuyến nông địa phương, ngày gieo/thu hoạch thực tế và điều kiện nước trước khi quyết định.</p></section>`;
    return `${noCropNote}${seasonContext}<div class="rotation-results-grid"><section class="panel"><div class="panel-head"><div><h3>1. Cây hiện tại & lịch sử</h3><p>${esc(plan.region)} · Cây: ${cropText}${plan.currentCropSource==='Hồ sơ vườn'?' (theo hồ sơ vườn)':''}</p></div><span class="tag">${plan.perennial?'CÂY LÂU NĂM':'CÂY HÀNG NĂM / CHƯA RÕ'}</span></div><ul class="rotation-history">${historyList}</ul><div class="notice-inline">${esc(plan.seasonNote)}${plan.hasForecast?` · ${esc(plan.weatherNote)}`:''}</div></section><section class="panel"><div class="panel-head"><div><h3>2. Đề xuất cho vụ tiếp theo</h3><p>Xét họ cây, nhu cầu nước và mục tiêu</p></div></div>${candidateBlock}<p class="small-note">Điểm ưu tiên dùng để xếp thứ tự; chọn giống và ngày trồng theo lịch địa phương.</p>${src('FAO – Crop Calendar',SRC.faoCropCalendar,'Lịch mùa vụ theo vùng sinh thái')}${src('FAO – Species diversification',SRC.faoDiversification,'Luân canh và đa dạng cây trồng')}</section></div><section class="panel rotation-section"><div class="panel-head"><div><h3>3. Cây xen & cây phủ đất</h3><p>Bố trí dưới tán, giữa hàng hoặc ở bờ vườn.</p></div></div>${companionBlock}</section>`;
  }
  function renderRotationPlanner(){
    const r={...rotationDefaults,...(state.rotation||{})};
    const select=(key,label,options)=>`<label class="field"><span class="label">${label}</span><select data-rotation="${key}">${options.map(([v,l])=>`<option value="${v}" ${r[key]===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
    const input=(key,label,placeholder='')=>`<label class="field"><span class="label">${label}</span><input type="text" data-rotation="${key}" value="${esc(r[key]||'')}" placeholder="${esc(placeholder)}"></label>`;
    return `${pageTitle('CROP SEQUENCE','Luân canh & xen canh','Chọn cây vụ gần nhất để xem phương án vụ tiếp theo và cây xen.',`<button class="btn outline small" data-go="profile">Mở hồ sơ vườn →</button>`)}
      <section class="panel rotation-form"><div class="panel-head"><div><h3>Thông tin mùa vụ và lịch sử canh tác</h3><p>Chọn cây hiện tại, vụ dự kiến và mục tiêu canh tác.</p></div><span class="tag">TỰ LƯU</span></div>
        <div class="rotation-input-grid">${select('currentCrop','Cây đang trồng hoặc cây vụ gần nhất',[['','Chưa chọn / chưa biết'],['none','Hiện tại chưa trồng cây'],['maize','Ngô'],['rice','Lúa'],['soybean','Đậu tương'],['mungbean','Đậu xanh'],['peanut','Lạc'],['cowpea','Đậu bò / đậu đũa'],['cassava','Sắn'],['sweetpotato','Khoai lang'],['mustard','Rau họ cải'],['tomato','Cà chua / ớt'],['cucumber','Dưa / bầu bí'],['perennial','Cây lâu năm khác'],['other','Cây khác – nhập tên']])}${input('currentCropOther','Tên cây nếu chọn “Cây khác”','Ví dụ: khoai tây, chè, cây ăn quả')}${select('systemType','Kiểu hệ thống',[['','Chưa chọn'],['annual','Cây hàng năm'],['perennial','Vườn cây lâu năm']])}${select('currentSeason','Vụ hiện tại / vụ gần nhất',[['','Chưa rõ'],['spring','Vụ xuân / đông xuân'],['summer','Vụ hè thu'],['autumn','Vụ thu đông'],['winter','Vụ đông'],['rainy','Mùa mưa'],['dry','Mùa khô']])}${select('nextSeason','Vụ dự kiến tiếp theo',[['','Chưa chọn'],['spring','Vụ xuân / đông xuân'],['summer','Vụ hè thu'],['autumn','Vụ thu đông'],['winter','Vụ đông'],['rainy','Mùa mưa'],['dry','Mùa khô']])}${select('mainGoal','Mục tiêu chính',[['','Dùng mục tiêu trong hồ sơ'],['income','Tăng thu nhập'],['household','Phục vụ gia đình'],['low-water','Ưu tiên ít nước'],['sustainable','Bền vững lâu dài'],['mixed','Kết hợp nhiều mục tiêu']])}${select('intercropGoal','Mục đích cây xen/phủ',[['all','Tổng hợp nhiều tác dụng'],['cover','Che phủ, bảo vệ đất'],['nitrogen','Bổ sung sinh khối / N họ đậu'],['beneficial','Sinh cảnh cho thiên địch']])}${select('problem','Vấn đề cần ưu tiên',[['','Chưa xác định'],['erosion','Đất dốc / xói mòn'],['water','Thiếu nước'],['soil','Đất suy giảm / hữu cơ thấp'],['nematode','Đã xác định tuyến trùng'],['pest','Sâu bệnh trên cây'],['market','Cần đa dạng đầu ra']])}</div>
        <label class="field rotation-history-input"><span class="label">Lịch sử 2–3 vụ gần nhất (mỗi dòng: “năm/vụ: cây trồng”)</span><textarea rows="4" data-rotation="historyText" placeholder="Ví dụ:\n2025 vụ hè thu: ngô\n2025 vụ đông: cải\n2026 vụ xuân: đậu tương">${esc(r.historyText||'')}</textarea></label>
        <label class="field"><span class="label">Ghi chú thực địa (dịch hại, ngày gieo/thu hoạch, giống, tưới…)</span><textarea rows="2" data-rotation="notes" placeholder="Ví dụ: đất dốc, thiếu nước, sâu bệnh hoặc ngày thu hoạch">${esc(r.notes||'')}</textarea></label>
      </section>
      <div id="rotationResults">${rotationResultsHTML()}</div>
      <section class="panel rotation-sources"><h3>Tài liệu tham khảo</h3><p>Lịch mùa vụ FAO · hướng dẫn IPM · nghiên cứu cây phủ tại Việt Nam.</p>${src('FAO Crop Calendar',SRC.faoCropCalendar)}${src('FAO – Species diversification',SRC.faoDiversification)}${src('FAO – How to IPM',SRC.faoRotation)}${src('WASI – Arachis pintoi tại Việt Nam',SRC.arachisVietnam)}${src('UC IPM – Tagetes và tuyến trùng',SRC.ucMarigold)}${src('Cục Trồng trọt / Agro Việt Nam – xen sắn với đậu xanh ở một số vùng miền Trung',SRC.vnCassavaIntercrop)}</section>`;
  }
  function updateRotationResults(){const node=$('#rotationResults');if(node)node.innerHTML=rotationResultsHTML();}

  function renderPlan(){const d=state.weather?.daily;if(!state.location)return `${pageTitle('FARMING PLAN','Kế hoạch canh tác','Dự báo 7 ngày và các việc cần theo dõi tại vườn.') }<div class="empty"><div class="empty-icon">☂</div><div><b>Chưa chọn vị trí</b><p>Chọn vị trí để xem dự báo thời tiết.</p></div><button class="btn primary" data-go="location">Chọn vị trí</button></div>`;
    return `${pageTitle('FARMING PLAN','Kế hoạch canh tác','Theo dõi thời tiết và điều chỉnh công việc chăm sóc.',`<button class="btn outline small" data-action="refresh" ${state.loading?'disabled':''}>↻ Cập nhật dự báo</button>`)}<div class="notice-card"><b>Kiểm tra trước khi tưới</b><p>Đối chiếu lượng mưa dự báo với độ ẩm đất tại vùng rễ. Sau mưa, kiểm tra đất trước lần tưới tiếp theo.</p>${src('Open-Meteo Forecast API',state.weatherUrl||SRC.forecastDocs,'dự báo cho điểm tham chiếu')}</div><section class="panel" id="plan7DaySection"><div class="panel-head"><div><h3>Diễn biến 7 ngày</h3><p>Dự báo mô hình tại điểm tham chiếu · ${esc(state.weather?.timezone||'')}</p></div>☂</div>${forecastTable(d)}${openMeteoAttribution()}</section>${renderDailyIrrigationPanel()}<div class="section-head" id="planActionHead"><div><h2>Kế hoạch canh tác & việc cần theo dõi</h2><p>Các ngày có mưa hoặc nắng nóng trong dự báo.</p></div></div>${d?.time?`<div class="plan-cards">${d.time.map((day,i)=>{const rain=Number(d.precipitation_sum?.[i]??0),prob=Number(d.precipitation_probability_max?.[i]??0),wet=rain>=5||prob>=60;return `<div class="plan-card ${wet?'rain-risk':''}"><div class="plan-date">${i===0?'Hôm nay':new Date(day+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'})}</div><div class="plan-weather"><span class="temp-min">${fmt(d.temperature_2m_min?.[i],0)}°</span><span class="temp-separator">—</span><b class="temp-max">${fmt(d.temperature_2m_max?.[i],0)}°</b><span class="rain-total">☂ ${fmt(rain)} mm</span></div><div class="plan-title">${wet?'☂ Có mưa dự báo – kiểm tra lại lịch tưới':'◉ Ít mưa – kiểm tra đất vùng rễ'}</div><p>${wet?'Chờ lượng mưa thực nhận, sau đó kiểm tra độ ẩm đất vùng rễ.':'Kiểm tra độ ẩm đất vùng rễ trước khi tưới.'}</p>${src('Open-Meteo daily forecast',state.weatherUrl,`xác suất mưa tối đa ${fmt(prob,0)}%`)}</div>`;}).join('')}</div>`:`<div class="muted">Chưa có dữ liệu dự báo</div>`}<div class="notice-inline">Cảnh báo mưa dùng ngưỡng tham khảo 5 mm hoặc xác suất mưa 60%.</div>`;}
  function renderAssistant(){return `${pageTitle('SMART FARM ASSISTANT','Trợ lý đa nhiệm','Hỏi về thời tiết, tưới tiêu, đất, cây trồng và sâu bệnh.')}
    <div class="chat-layout"><section class="panel chat-panel"><div class="chat-head"><div class="assistant-avatar">✳</div><div><b>SMART FARM Assistant</b><small>Thời tiết · Đất · Cây trồng · Tưới · Sâu bệnh</small></div></div><div id="chatMessages" class="chat-messages">${state.assistant.map(m=>`<div class="message ${m.role}"><div class="bubble">${esc(m.text)}${(m.sources|| (m.source?[m.source]:[])).map(x=>`<div class="source-note">${x.href?`<a class="src" href="${esc(x.href)}" target="_blank" rel="noreferrer">${esc(x.name)} ↗</a>`:`Nguồn: ${esc(x.name)}`}</div>`).join('')}</div></div>`).join('')}</div><form class="chat-input" id="assistantForm"><input id="assistantInput" placeholder="Hỏi về thời tiết, nước tưới, đất, cây, sâu bệnh, đạm…"><button class="btn primary">Gửi →</button></form></section><aside class="panel chat-side"><h3>Hỏi nhanh</h3>${['Tổng hợp điều kiện nóng, ẩm, mưa và nguy cơ cho vườn','Lập kế hoạch chăm sóc và việc cần kiểm tra trong 7 ngày','Tạo báo cáo tổng hợp tình trạng vườn hiện tại','Dự báo mưa 7 ngày và nhu cầu nước tham chiếu?','Tại sao không nên tưới ngay khi sắp có mưa?','Đạm từ thảm cỏ lạc dại được tính như thế nào?','Lập chiến lược IPM và xen canh cho vườn na','Lập kế hoạch cây trồng mùa tiếp theo từ lịch sử vườn','Vì sao cây này được xếp ưu tiên?','Giải thích dữ liệu NASA POWER và SMAP đang có'].map((q,i)=>`<button class="prompt" data-prompt="${esc(q)}">${q} ›</button>`).join('')}<div class="disclaimer">Kết hợp dự báo với quan sát tại vườn.</div></aside></div>`;}
  function renderSources(){const items=[
    ['Open-Meteo Forecast API – dữ liệu theo tọa độ, hiện tại và dự báo',SRC.forecastDocs,'Nhiệt độ, độ ẩm không khí, mưa, gió, xác suất mưa và ET₀ dự báo theo tọa độ. Free API chỉ dành cho mục đích phi thương mại; có giới hạn lượt gọi.'],
    ['Open-Meteo – Terms of Use',SRC.openMeteoTerms,'Điều kiện API miễn phí: mục đích phi thương mại, giới hạn theo ngày/giờ/phút và điều khoản sử dụng.'],
    ['Open-Meteo – Data licence CC BY 4.0',SRC.openMeteoLicense,'Yêu cầu ghi công phù hợp, đặt liên kết giấy phép và nêu rõ nếu dữ liệu được chỉnh sửa/định dạng lại.'],
    ['NASA POWER Hydrology / SMAP L4',SRC.nasaHydrology,'Độ ẩm đất bề mặt và vùng rễ; lưới SMAP khoảng 9 km.'],
    ['FAO – Irrigation Water Needs',SRC.faoWater,'ETc = Kc × ETo; nhu cầu tưới ròng trừ mưa hữu hiệu, sau đó xét hiệu suất hệ thống tưới.'],
    ['Meta-analysis – quản lý dịch hại theo ngưỡng',SRC.ipmMeta,'Tổng hợp 126 nghiên cứu/466 thử nghiệm trên 34 cây trồng; giảm phun trung bình 44% trong các nghiên cứu được tổng hợp.'],
    ['Review – Push-Pull intercropping',SRC.pushPullReview,'Bằng chứng chủ yếu ở một số hệ cây ngũ cốc.'],
    ['WASI – Cỏ lạc dại ở Việt Nam',SRC.arachisVietnam,'Nghiên cứu sinh khối và hàm lượng N tại vườn hồ tiêu Tây Nguyên.'],
    ['TrackAsia Autocomplete v2',SRC.trackasiaAutocomplete,'Gợi ý tên địa điểm, đường phố và địa chỉ; bật địa giới hành chính mới và kèm địa chỉ cũ khi có.'],
    ['TrackAsia Search v2',SRC.trackasiaSearch,'Tra cứu địa chỉ đầy đủ và tọa độ cho địa điểm người dùng chọn.'],
    ['TrackAsia Reverse Geocoding v2',SRC.trackasiaReverse,'Tra cứu địa chỉ đầy đủ từ tọa độ GPS; hỗ trợ địa giới hành chính mới/cũ.'],
    ['TrackAsia Place Details v2',SRC.trackasiaDetails,'Lấy tọa độ và địa chỉ chi tiết của địa điểm được chọn từ danh sách gợi ý.'],
    ['TrackAsia GL JS 2.0.1',SRC.trackasiaSdk,'SDK bản đồ vector WebGL; giấy phép BSD-3-Clause, dữ liệu bản đồ/dịch vụ có điều khoản riêng.'],
    ['NASA POWER Daily API',SRC.powerDocs,'Chuỗi khí tượng theo ngày tại điểm tọa độ; tham số và độ phân giải tùy sản phẩm.'],
    ['NASA POWER FAQ – độ trễ & lưới dữ liệu',SRC.powerFaq,'NASA nêu độ trễ thông thường 2–3 ngày cho khí tượng và 5–7 ngày cho bức xạ; địa hình phức tạp có thể làm giá trị lưới khác điểm địa phương.'],
    ['NASA POWER Parameter Dictionary',SRC.powerParams,'Tra cứu mô tả, đơn vị và nguồn của từng tham số.'],
    ['MDN – GeolocationCoordinates.accuracy',SRC.gps,'Trường accuracy mô tả bán kính sai số GPS ở mức tin cậy 68%.'],
    ['Three.js – Installation',SRC.three,'Thư viện dựng mô hình 3D từ hồ sơ khu vườn.'],
    ['Sở NN&MT Lạng Sơn – Tài liệu hướng dẫn cây trồng 2026–2030',SRC.lsCrop,'Trang công bố bộ hướng dẫn kỹ thuật cây trồng địa phương.'],
    ['Sở NN&MT Lạng Sơn – Hướng dẫn kỹ thuật cây na (PDF)',SRC.naGuide,'Tài liệu kỹ thuật được dùng khi hiển thị ứng viên cây na; có thông tin tham khảo về pH, tầng đất và thoát nước.'],
    ['Sở NN&MT Lạng Sơn – Hướng dẫn kỹ thuật cây quýt (PDF)',SRC.quytGuide,'Tài liệu kỹ thuật được dùng khi hiển thị ứng viên cây quýt.'],
    ['Sở NN&MT Lạng Sơn – Hướng dẫn kỹ thuật cây hồi',SRC.hồi,'Tài liệu kỹ thuật mô tả điều kiện sinh thái, đất, độ cao và kỹ thuật trồng hồi.'],
    ['Trung tâm Khuyến nông Quốc gia – vùng trồng na Lạng Sơn',SRC.na,'Thông tin vùng trồng na tại Chi Lăng và Hữu Lũng.'],
    ['NASA POWER Climatology API',SRC.powerClimate,'Khí hậu nền dài hạn theo tọa độ.'],
    ['FAO GAEZ – Global Agro-Ecological Zoning',SRC.gaez,'Khung đánh giá điều kiện sinh thái; chưa tích hợp lớp bản đồ phù hợp theo từng thửa.'],
    ['FAO GAEZ Data Portal',SRC.gaezPortal,'Cổng dữ liệu và bản đồ GAEZ; độ phân giải các lớp khác nhau, lớp suitability toàn cầu có thể ở lưới rộng.'],
    ['FAO ECOCROP – Crop constraints and characteristics',SRC.ecocrop,'Cơ sở dữ liệu về nhiệt độ, mưa, pH, độ cao và đất phù hợp với cây trồng.'],
    ['FAO ECOCROP – Tra cứu loài cây',SRC.ecocropSearch,'Công cụ tra cứu yêu cầu sinh thái của từng loài; một số hồ sơ có thông tin sơ bộ, cần thẩm tra địa phương.'],
    ['SoilGrids – ISRIC',SRC.soilgrids,'Bản đồ đặc tính đất toàn cầu. API hiện tạm dừng theo thông báo của ISRIC.'],
    ['Copernicus DEM',SRC.copernicusDem,'Mô hình bề mặt số 30/90 m; phù hợp địa hình vùng rộng, không mô tả chính xác từng luống hoặc bờ thửa nhỏ.'],
    ['FAO Irrigation and Drainage Paper 56',SRC.fao,'Tài liệu phương pháp ET₀ và Kc; tính lượng tưới cần dữ liệu cây/đất thích hợp.'],
    ['FAO Crop Calendar',SRC.faoCropCalendar,'Lịch gieo trồng theo vùng sinh thái; cần chọn đúng địa phương và đối chiếu khuyến nông cấp tỉnh/huyện.'],
    ['FAO – How to IPM: luân canh và xen canh',SRC.faoRotation,'Hướng dẫn luân canh, xen canh và quản lý dịch hại.'],
    ['FAO – Crop diversification and crop rotation','https://www.fao.org/conservation-agriculture/in-practice/species-diversification/en/','Luân canh các họ cây, rễ khác nhau, che phủ đất và giảm khả năng lưu truyền sâu bệnh; cần thiết kế theo đất và khí hậu.'],
    ['NASA POWER – Daily API',SRC.powerDocs,'Giá trị -999 là fill value; đơn vị được trả theo community. Với community=AG, bức xạ sóng ngắn hiển thị theo metadata, mặc định MJ/m²/ngày.'],
    ['UC IPM – Nematodes and marigold limits',SRC.ucMarigold,'Tagetes chỉ phù hợp một số tuyến trùng và giống; trồng xen dưới cây thường không kiểm soát tuyến trùng tốt.'],
    ['WASI – Arachis pintoi tại Việt Nam',SRC.arachisVietnam,'Nghiên cứu ở một số hệ cây lâu năm tại Việt Nam.'],
    ['UC IPM – Tagetes và tuyến trùng',SRC.ucMarigold,'Một số giống có thể ức chế một số tuyến trùng; trồng xen dưới cây thường không hiệu quả ổn định.'],
    ['Tài liệu Việt Nam – xen đậu xanh/lạc với sắn',SRC.vnCassavaIntercrop,'Ví dụ kỹ thuật ở một số vùng miền Trung.'],
    ['Open-Meteo – điều khoản và ghi công',SRC.openMeteoTerms,'API miễn phí cho mục đích phi thương mại theo điều kiện nhà cung cấp; dữ liệu CC BY 4.0, cần ghi công.'],
    ['Mã nguồn NASA SMART FARM – MIT License (OSI)', './LICENSE', 'Giấy phép của mã nguồn gốc gồm index.html, styles.css và app.js. MIT là giấy phép mã nguồn mở được OSI công nhận; áp dụng theo toàn văn trong tệp LICENSE.'],
    ['Thông báo giấy phép bên thứ ba', './THIRD_PARTY_NOTICES.md', 'Danh sách phiên bản, chủ thể bản quyền, giấy phép và điều khoản của các thư viện/font mà website nạp khi chạy.'],
    ['TrackAsia GL JS 2.0.1 – BSD 3-Clause License', 'https://github.com/track-asia/trackasia-gl-js', 'SDK bản đồ vector WebGL; giấy phép BSD-3-Clause theo thông tin gói npm. Điều khoản dữ liệu bản đồ và API TrackAsia được áp dụng riêng.'],
    ['Three.js 0.128.0 (r128) và OrbitControls – MIT License', 'https://github.com/mrdoob/three.js/blob/r128/LICENSE', 'Thư viện dựng mô hình 3D và addon OrbitControls; cùng giấy phép MIT của Three.js r128.'],
    ['Be Vietnam Pro – SIL Open Font License 1.1', 'https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt', 'Font tải từ Google Fonts khi website chạy; giấy phép font OFL-1.1, tách biệt với MIT License của mã nguồn ứng dụng.'],
    ['Kê khai sử dụng công cụ AI', './README.md', 'ChatGPT và Google Gemini được dùng hỗ trợ rà soát mã nguồn, gợi ý sửa lỗi, hoàn thiện giao diện và tài liệu; nhóm trực tiếp kiểm soát kiến trúc, quy tắc nông học và kiểm thử.']
  ];
  return `${pageTitle('DATA TRANSPARENCY','Nguồn dữ liệu & giấy phép','Nguồn API, tài liệu, thư viện và giấy phép của các thành phần đang dùng trong website.') }${openMeteoAttribution()}<div class="source-catalog" id="sourcesCatalogSection">${items.map(x=>`<section class="panel source-group"><div class="source-item"><div class="source-item-icon">↗</div><div><b>${x[0]}</b><p>${x[2]}</p><a class="src" href="${x[1]}" target="_blank" rel="noreferrer">Mở tài liệu / giấy phép ↗</a><div class="source-url">${x[1]}</div></div></div></section>`).join('')}</div><div class="notice-card"><b>Giấy phép và ghi công</b><p>Mã nguồn gốc NASA SMART FARM phát hành theo MIT License. TrackAsia GL JS, Three.js/OrbitControls và Be Vietnam Pro giữ giấy phép riêng như kê khai ở trên. MIT của dự án không áp dụng cho dữ liệu Open-Meteo, dữ liệu NASA, dữ liệu bản đồ TrackAsia hoặc tài liệu của tổ chức khác; hãy xem điều khoản và yêu cầu ghi công riêng của từng nguồn.</p><p>Open-Meteo cần ghi công theo CC BY 4.0 bằng liên kết cạnh nơi hiển thị dữ liệu, kèm liên kết giấy phép và thông tin dữ liệu đã được định dạng/biến đổi. Free API chỉ dành cho mục đích phi thương mại theo điều khoản hiện hành; mục đích thương mại cần gói phù hợp. Dữ liệu và dịch vụ bản đồ TrackAsia tuân theo điều khoản nhà cung cấp; giấy phép BSD-3-Clause chỉ áp dụng cho SDK TrackAsia GL JS.</p></div>`;}

  function runSelfTests(){
    const results=[];
    const test=(name,fn)=>{try{const detail=fn();results.push({name,ok:detail!==false,detail:typeof detail==='string'?detail:''});}catch(e){results.push({name,ok:false,detail:e?.message||String(e)});}};
    const blank={...blankProfile};
    test('Hồ sơ trống không tự dựng kích thước',()=>!computeFarmModel(blank).valid);
    test('Diện tích + kích thước khớp được chấp nhận',()=>computeFarmModel({...blank,area:'200',width:'10',length:'20'}).valid);
    test('Diện tích mâu thuẫn với dài × rộng bị chặn',()=>!computeFarmModel({...blank,area:'200',width:'20',length:'20'}).valid);
    test('Một chiều 2.000 m không bị nhận nhầm với vườn 200 m²',()=>!computeFarmModel({...blank,area:'200',width:'2',length:'2000'}).valid);
    test('Chế độ giữ số lượng hiển thị chính xác 20 cây',()=>computeFarmModel({...blank,area:'2000',width:'20',length:'100',treeCount:'20',layoutMode:'count',plantSpacing:'2',rowSpacing:'2'}).trees.length===20);
    test('Chế độ theo khoảng cách mới tự tính số cây',()=>computeFarmModel({...blank,area:'2000',width:'20',length:'100',layoutMode:'spacing',plantSpacing:'10',rowSpacing:'10'}).trees.length===20);
    test('Cây bố trí theo khoảng cách nằm trong ranh giới và giữ khoảng cách tâm đã nhập',()=>{const m=computeFarmModel({...blank,area:'2000',width:'20',length:'100',layoutMode:'spacing',plantSpacing:'5',rowSpacing:'10'});return m.trees.length===40&&m.trees.every(t=>Math.abs(t.x)<=10.001&&Math.abs(t.z)<=50.001);});
    test('Chỉ số đo nhiệt–ẩm ngoài khoảng 0–100 không được dùng làm điểm nội suy',()=>heatSamplesFromProfile({...blank,heat1:'-1',heat2:'101',heat3:'NaN',heat4:'35'}).length===1);
    test('Ba điểm đo thẳng hàng không được coi là đủ để nội suy mặt bằng',()=>!hasNonCollinearHeatPoints([{x:0,z:0,value:30},{x:.5,z:.5,value:35},{x:1,z:1,value:40}]));
    test('Khoảng cách âm/0 bị cảnh báo và không dùng để bố trí',()=>{const m=computeFarmModel({...blank,area:'200',width:'10',length:'20',layoutMode:'spacing',plantSpacing:'0',rowSpacing:'2'});return m.trees.length===0&&m.warnings.length>0;});
    test('pH ngoài miền 0–14 bị cảnh báo',()=>computeFarmModel({...blank,area:'200',width:'10',length:'20',soilPH:'16'}).warnings.length>0);
    test('Độ dốc nhập sai định dạng bị cảnh báo',()=>computeFarmModel({...blank,area:'200',width:'10',length:'20',slope:'dốc nhiều'}).warnings.some(x=>x.includes('Độ dốc')));
    test('Đất thịt được chuẩn hóa đúng mã và có màu khác trắng',()=>{const pal=soilPalette('Đất thịt');return normalizeSoilType('Đất thịt')==='loam'&&pal.css.toLowerCase()!=='#ffffff'&&pal.hex!==0xffffff;});
    test('Lát cắt đất giữ đúng màu đất thịt',()=>soilSliceLegendHTML({...blank,soilType:'loam'}).includes('#805b40'));
    test('Đường kính tán quá lớn so với khoảng cách được cảnh báo',()=>computeFarmModel({...blank,area:'400',width:'20',length:'20',treeCount:'16',layoutMode:'count',crownWidth:'8',plantSpacing:'2',rowSpacing:'2'}).warnings.some(x=>x.includes('tán')));
    test('Số cây nhập lẻ không nguyên bị cảnh báo',()=>computeFarmModel({...blank,area:'200',width:'10',length:'20',treeCount:'2.5',layoutMode:'count'}).warnings.some(x=>x.includes('số nguyên')));
    test('Các mục tiêu cho thứ tự gợi ý khác nhau',()=>{const goals=['income','household','low-water','sustainable','mixed'];const tops=goals.map(g=>rankCrops(g,{...blank}).slice(0,5).map(x=>x.id).join(','));return new Set(tops).size>=4;});
    test('Điểm cây trồng không được gắn nhãn phần trăm chính xác',()=>{const top=rankCrops('income',{...blank})[0];return Number.isInteger(top.score)&&top.score>=0&&top.score<=100;});
    test('Bản đồ nhiệt cần tối thiểu 3 điểm đo',()=>heatSamplesFromProfile({...blank,heat1:'20',heat2:'25'}).length===2&&heatSamplesFromProfile({...blank,heat1:'20',heat2:'25',heat5:'30'}).length===3);
    test('Bản đồ nhiệt từ ba điểm thẳng hàng không được nội suy toàn vườn',()=>!hasNonCollinearHeatPoints(heatSamplesFromProfile({...blank,heat1:'20',heat2:'25',heat3:'30'})));
    test('Bản đồ nhiệt từ ba điểm không thẳng hàng được chấp nhận',()=>hasNonCollinearHeatPoints(heatSamplesFromProfile({...blank,heat1:'20',heat2:'25',heat5:'30'})));
    test('Tất cả nhóm đất đều có màu lát cắt khác trắng',()=>['clay','loam','sandy','alluvial','red-yellow','mixed','other'].every(k=>soilPalette(k).hex!==0xffffff));
    test('Giá trị độ ẩm ngoài 0–100 không được đưa vào bản đồ nhiệt',()=>heatSamplesFromProfile({...blank,heat1:'20',heat2:'25',heat3:'120'}).length===2);
    test('Danh mục cây trồng có ứng viên ngoài Lạng Sơn',()=>CROP_CATALOG.length>=15&&CROP_CATALOG.some(c=>c.id==='cassava')&&CROP_CATALOG.some(c=>c.id==='coconut'));
    test('Các nguồn quốc gia và khí hậu được khai báo',()=>!!SRC.gaez&&!!SRC.ecocrop&&!!SRC.powerClimate&&!!SRC.copernicusDem);
    test('Mục tiêu lựa chọn được lưu vào hồ sơ',()=>{const old=state.profile.purpose,oldGoal=state.goal;setAdvisorGoal('low-water');const ok=state.profile.purpose==='low-water'&&state.goal==='low-water';state.profile.purpose=old;state.goal=oldGoal;save();return ok;});
    test('Thiếu loại đất không tự gán loại đất mặc định',()=>!has(blank.soilType)&&soilLabel(blank.soilType)==='Chưa nhập');
    test('Một chiều suy ra từ diện tích được đánh dấu giả định',()=>{const m=computeFarmModel({...blank,area:'200',width:'10'});return m.valid&&m.derivedDimension&&m.notices.some(x=>x.includes('suy ra'));});
    test('Chỉ có diện tích dùng khung vuông xem trước',()=>{const m=computeFarmModel({...blank,area:'200'});return m.valid&&m.assumedSquare&&m.dimensionsSource.includes('hình xem trước');});
    test('Không có điểm đo thì bản đồ nhiệt không giả tạo dữ liệu',()=>heatSamplesFromProfile(blank).length===0);
    test('Không có địa danh thì không nhận diện nhầm tỉnh',()=>{const old=state.location;state.location=null;const label=provinceLabel();state.location=old;return label==='';});
    test('Đổi mục tiêu làm thay đổi ít nhất 4/5 thứ hạng đầu',()=>{const goals=Object.keys(GOAL_LABELS);const tops=goals.map(g=>rankCrops(g,{...blank}).slice(0,5).map(x=>x.id).join(','));return new Set(tops).size>=4;});
    test('Dữ liệu giới hạn nước làm giảm điểm cây nhu cầu nước cao',()=>{const crop=CROP_CATALOG.find(c=>c.id==='banana');const a=scoreCrop(crop,{...blank,waterAvailability:'limited'},'low-water');const b=scoreCrop(crop,{...blank,waterAvailability:'reliable'},'low-water');return a.score<b.score&&a.conflicts.includes('waterAvailability');});
    test('Độ ẩm 0% và 100% vẫn nằm trong miền hợp lệ',()=>{const a=computeFarmModel({...blank,area:'200',width:'10',length:'20',soilMoisture:'0'}),b=computeFarmModel({...blank,area:'200',width:'10',length:'20',soilMoisture:'100'});return !a.warnings.some(x=>x.includes('Độ ẩm'))&&!b.warnings.some(x=>x.includes('Độ ẩm'));});
    test('Mức vốn thấp làm giảm ưu tiên cây vốn cao',()=>{const crop=CROP_CATALOG.find(c=>c.id==='coffee');return scoreCrop(crop,{...blank,investment:'low'},'income').score<scoreCrop(crop,{...blank,investment:'high'},'income').score;});
    test('Vị trí Chi Lăng được nhận diện là Lạng Sơn',()=>{const old=state.location;state.location={address:'Chi Lăng, Lạng Sơn, Việt Nam'};const ok=provinceLabel()==='Lạng Sơn';state.location=old;return ok;});
    test('Vị trí tỉnh khác không dùng nhầm tài liệu tỉnh Lạng Sơn',()=>{const old=state.location;state.location={address:'Sa Pa, Lào Cai, Việt Nam'};const ok=provinceLabel()==='Lào Cai';state.location=old;return ok;});
    test('Mục tiêu không hợp lệ không ghi vào hồ sơ',()=>{const old=state.profile.purpose,oldGoal=state.goal;const ok=setAdvisorGoal('unknown')===false;const unchanged=state.profile.purpose===old&&state.goal===oldGoal;return ok&&unchanged;});
    test('Impact water responds to ET0, rain, and area',()=>{const old=state.weather,imp=state.impact,prof=state.profile;state.weather={daily:{time:['2026-11-01'],et0_fao_evapotranspiration:[5],precipitation_sum:[0]}};state.impact={...imp,areaHa:'1',kc:.8,efficiency:80,coverPct:50,evapReduction:20,effectiveRainPct:70};const a=impactResults().waterSaved;state.impact={...state.impact,areaHa:'2'};const b=impactResults().waterSaved;state.impact={...state.impact,effectiveRainPct:100};const c=impactResults().waterSaved;state.weather=old;state.impact=imp;state.profile=prof;return Number.isFinite(a)&&b>a&&Math.abs(b/a-2)<.01&&c<=b;});
    test('Impact outputs stay blank without real farm area',()=>{const old=state.impact,prof=state.profile;state.impact={...old,areaHa:''};state.profile={...blankProfile};const x=impactResults();state.impact=old;state.profile=prof;return x.area===null&&x.waterSaved===null&&x.nFixed===null;});
    test('TrackAsia map SDK configuration and full-detail style are present',()=>!!SRC.trackasiaDocs&&!!SRC.trackasiaReverse&&typeof TRACKASIA_CONFIG.apiKey==='string');
    test('Legacy Leaflet, Photon and Esri map assets are absent from page markup',()=>!Array.from(document.querySelectorAll('script[src],link[href]')).some(n=>/leaflet|photon\.komoot|World_Imagery\/MapServer/i.test(n.src||n.href)));
    test('Soil visual tone preserves selected soil and reacts to weather/moisture',()=>{const oldP=state.profile,oldW=state.weather,oldS=state.soilPower;state.profile={...blankProfile,soilType:'loam',soilMoisture:'10'};state.weather={current:{temperature_2m:25}};state.soilPower=null;const dry=soilVisualTone(state.profile).css;state.profile={...state.profile,soilMoisture:'40'};state.weather={current:{temperature_2m:36}};const wetHot=soilVisualTone(state.profile).css;state.profile=oldP;state.weather=oldW;state.soilPower=oldS;return dry!==wetHot&&soilVisualTone({...blankProfile,soilType:'loam'}).base?.label==='Đất thịt';});
    test('3D engine flushes instance transforms and colors before rendering',()=>{const source=String(init3D);return (source.match(/flushInstances\((trunks|crowns|branches|fruits)\)/g)||[]).length===4&&source.includes('instanceMatrix.needsUpdate=true')&&source.includes('instanceColor.needsUpdate=true');});
    test('Fallback tree dimensions scale with the parcel metre-to-pixel transform',()=>{const source=String(init3DFallback);return source.includes('treeInfo.crownWidth*.5*pxPerMetre')&&source.includes('Math.hypot(e.clientX-drag.x,e.clientY-drag.y)')&&source.includes('draw();}};const onWheel');});
    test('N fixation scenario uses biomass × N × Ndfa × area × cover',()=>{const old=state.impact;state.impact={...old,areaHa:'1',biomass:1,nContent:2,ndfa:50,coverPct:100};const n=impactResults().nFixed;state.impact=old;return Math.abs(n-10)<.01;});
    test('Pesticide impact is count-based and not residue percentage',()=>{const old=state.impact;state.impact={...old,baselineSprays:'5',ipmAdoption:100};const x=impactResults();state.impact=old;return Math.abs(x.avoided-2.2)<.001&&x.sprayReduction===44;});
    test('No baseline spray log means pesticide impact remains uncalculated',()=>{const old=state.impact;state.impact={...old,baselineSprays:''};const x=impactResults();state.impact=old;return x.avoided===null;});
    test('NASA SMAP parameters read valid dates and volumetric moisture',()=>{const old=state.soilPower;state.soilPower={properties:{parameter:{RZMC:{'20261101':.24},RZMC_PRCNTL:{'20261101':62}}}};const x=nasaSoilSnapshot('root');state.soilPower=old;return !!x&&Math.abs(x.value-24)<.001&&x.percentile===62;});
    test('Leaf stress score remains bounded',()=>{const x=canopyStress();return x.stress>=0&&x.stress<=1;});
    test('IPM caution activates for Na crop',()=>{const old=state.profile.crop;state.profile.crop='Na';const x=getPestRisk().show;state.profile.crop=old;return x;});
    test('Hot-weather IPM monitoring activates after three forecast hot days',()=>{const oldP=state.profile,oldW=state.weather;state.profile={...blankProfile,crop:'Ngô'};state.weather={daily:{temperature_2m_max:[34,35,36,31]}};const x=getPestRisk();state.profile=oldP;state.weather=oldW;return x.hotDays===3&&x.show&&!x.na;});
    test('NASA POWER fill value -999 is rejected as missing',()=>validPowerValue(-999)===null&&validPowerValue(-999.0)===null&&validPowerValue(0)===0);
    test('NASA POWER radiation fill value -999 is never rendered as a measurement',()=>{const x=latestPower({properties:{parameter:{T2M:{'20261108':22},ALLSKY_SFC_SW_DWN:{'20261108':-999}}}});return !!x&&x.rad===null&&x.radUnit==='MJ/m²/ngày'&&!!x.radMissingReason;});
    test('NASA POWER uses latest valid date per parameter',()=>{const x=latestPower({properties:{parameter:{T2M:{'20261108':22,'20261109':23},ALLSKY_SFC_SW_DWN:{'20261108':15.4,'20261109':-999}}}});return x.date==='20261109'&&x.rad===15.4&&x.entries.rad.date==='20261108';});
    test('NASA POWER preserves valid radiation values without converting units',()=>{const x=latestPower({properties:{parameter:{T2M:{'20261108':22},ALLSKY_SFC_SW_DWN:{'20261108':15.4}}}});return x.rad===15.4&&x.radUnit==='MJ/m²/ngày';});
    test('NASA POWER keeps available non-temperature parameters when T2M is missing',()=>{const x=latestPower({properties:{parameter:{ALLSKY_SFC_SW_DWN:{'20261108':15.4}}}});return !!x&&x.t2m===null&&x.rad===15.4&&x.date==='20261108';});
    test('Rotation recognizes plant families without substring false matches',()=>cropFamily('ngô')==='poaceae'&&cropFamily('đậu tương')==='fabaceae'&&cropFamily('đậu nành')==='fabaceae'&&cropFamily('na')==='perennial'&&cropFamily('cây na')==='perennial'&&cropFamily('cà chua')==='solanaceae');
    test('Rotation distinguishes Vietnamese homographs dừa vs dưa and excludes perennial fruit crops',()=>cropFamily('Dừa')==='perennial'&&cropFamily('Dưa chuột')==='cucurbitaceae'&&cropFamily('Chuối')==='perennial'&&cropFamily('Thanh long')==='perennial'&&cropFamily('Mắc ca')==='perennial');
    test('Rotation penalizes repeated same-family crops and favors a different family',()=>{const old=state.rotation;state.rotation={...rotationDefaults,currentCrop:'Ngô',historyText:'2025 vụ mùa: ngô\n2026 vụ xuân: ngô'};const x=buildRotationPlan();state.rotation=old;return x.candidates.length>0&&x.candidates[0].family!=='poaceae'&&x.historyFamilies.length>=2;});
    test('Perennial orchard rotation keeps main trees and switches to cover/intercrop advice',()=>{const old=state.rotation;state.rotation={...rotationDefaults,currentCrop:'Na',systemType:'perennial'};const x=buildRotationPlan();state.rotation=old;return x.perennial&&x.intercrops.some(v=>v.id==='arachis-cover')&&!x.mainCropRotationRequired;});
    test('Perennial history infers orchard system when user leaves system type unspecified',()=>{const old=state.rotation;state.rotation={...rotationDefaults,currentCrop:'none',historyText:'2025 vụ mùa: na'};const x=buildRotationPlan();state.rotation=old;return x.perennial&&x.candidates.length===0;});
    test('Rotation with no current crop still proposes candidates and shows season status',()=>{const old=state.rotation;state.rotation={...rotationDefaults,currentCrop:'none',systemType:'annual'};const x=buildRotationPlan();state.rotation=old;return x.candidates.length>0&&x.seasonNote.toLowerCase().includes('vụ hiện tại: chưa chọn')&&x.seasonNote.toLowerCase().includes('vụ tiếp theo: chưa chọn');});
    test('No-crop annual plan excludes perennial fruit-tree candidates',()=>{const old=state.rotation;state.rotation={...rotationDefaults,currentCrop:'none',systemType:'annual'};const x=buildRotationPlan();state.rotation=old;return x.candidates.length>0&&x.candidates.every(c=>c.family!=='perennial');});
    test('Tagetes advice is limited to identified nematode targets',()=>{const note=ROTATION_COMPANIONS.find(x=>x.id==='marigold')?.caveat||'';return note.includes('tuyến trùng đã xác định')&&note.includes('không dùng như cây xua rệp/nhện đỏ');});
    test('Rotation evidence sources are present',()=>!!SRC.faoCropCalendar&&!!SRC.faoRotation&&!!SRC.faoDiversification&&!!SRC.ucMarigold&&!!SRC.vnCassavaIntercrop);
    test('Rotation warnings show concise 7-day forecast status',()=>{const oldR=state.rotation,oldW=state.weather,oldP=state.profile;state.rotation={...rotationDefaults,currentCrop:'Ngô',systemType:'annual'};state.profile={...blankProfile,waterAvailability:'limited'};state.weather={daily:{time:['2026-11-12','2026-11-13','2026-11-14'],temperature_2m_max:[35,36,34],precipitation_sum:[0,0,0],et0_fao_evapotranspiration:[5,5,5]}};const x=buildRotationPlan();state.rotation=oldR;state.weather=oldW;state.profile=oldP;return x.hasForecast&&x.hotDays===3&&x.weatherNote.includes('7 ngày tới:');});
    test('Rotation page is available in navigation',()=>NAV.some(x=>x[0]==='rotation'));
    test('QA menu is no longer included in navigation',()=>!NAV.some(x=>x[0]==='qa'));
    test('Live Demo covers all nine application sections in order',()=>DEMO_STEPS.map(x=>x.page).join(',')==='overview,location,profile,farm3d,advisor,rotation,plan,assistant,sources');
    test('Live Demo sample profile contains only declared profile fields',()=>Object.keys(DEMO_PROFILE).every(k=>Object.prototype.hasOwnProperty.call(blankProfile,k)));
    test('Live Demo sample does not include unmeasured soil moisture or tree dimensions',()=>!('soilMoisture' in DEMO_PROFILE)&&!('treeHeight' in DEMO_PROFILE)&&!('crownWidth' in DEMO_PROFILE));
    test('Live Demo does not persist demo profile values',()=>{const oldActive=liveDemo.active,oldProfile=state.profile,before=localStorage.getItem(KEY);liveDemo.active=true;state.profile={...blankProfile,farmName:'DEMO ONLY'};save();const unchanged=localStorage.getItem(KEY)===before;state.profile=oldProfile;liveDemo.active=oldActive;return unchanged;});
    test('Live Demo rotation choices use declared option codes',()=>{const choices={currentCrop:['perennial'],systemType:['perennial'],currentSeason:['autumn'],nextSeason:['spring'],mainGoal:['sustainable'],intercropGoal:['cover'],problem:['erosion']};return Object.entries(choices).every(([key,values])=>values.every(v=>typeof v==='string'&&v.length>0));});
    test('Live Demo has all five controls and a visible launch button',()=>!!$('#liveTourLaunch')&&['pause','resume','next','restart','exit'].every(action=>!!$(`[data-demo-control="${action}"]`)));
    test('Live Demo does not invent a fallback location and waits for explicit confirmation',()=>DEMO_STEPS[0]?.id==='overview'&&typeof demoConfirmMissingLocation==='function'&&typeof demoOverviewStep==='function'&&!String(demoLocationStep).includes('demo-fallback'));
    test('Live Demo skips a GPS prompt when a confirmed location already exists',()=>typeof startLiveDemo==='function'&&String(startLiveDemo).includes('state.location?Promise.resolve(null):demoRequestGPS()'));
    test('Live Demo walks overview content to the end before moving to the next task',()=>typeof demoScrollThroughPage==='function'&&String(demoOverviewStep).includes('demoScrollThroughPage'));
    test('Live Demo types numeric values slowly and pauses after every completed field',()=>DEMO_TYPE_NUMBER_MS>=120&&DEMO_FIELD_PAUSE_MS>=500);
    test('Live Demo allows user confirmation and location selection without pausing the tour',()=>String(pauseDemoForManualAction).includes('waitingForLocationConfirm')&&String(pauseDemoForManualAction).includes("state.page==='location'"));
    test('Live Demo shows the empty overview state before requesting location confirmation',()=>String(demoOverviewStep).indexOf("demoScroll('.empty'")>=0&&String(demoOverviewStep).indexOf("demoScroll('.empty'")<String(demoOverviewStep).indexOf('demoConfirmMissingLocation'));
    test('Confirming a candidate releases the location-wait step',()=>String(action).includes('liveDemo.locationConfirmed=true'));
    test('A location selected during the tour is marked temporary and not saved',()=>String(setLocationCandidate).includes('(liveDemo.active?{demoOnly:true}:{})')&&String(save).includes('if(liveDemo.active)return'));

    test('Live Demo rotation history has crop entries after the colon',()=>parseRotationHistory({historyText:'2025/vụ xuân: đậu xanh\n2025/vụ thu: ngô\n2026/vụ xuân: đậu tương'}).map(x=>x.crop).join('|')==='đậu xanh|ngô|đậu tương');
    test('Live Demo profile uses valid select choices for farm, terrain and purpose',()=>DEMO_PROFILE.soilType==='loam'&&DEMO_PROFILE.terrain==='hill'&&DEMO_PROFILE.waterAvailability==='seasonal'&&DEMO_PROFILE.purpose==='income');
    test('Every new Live Demo workspace resets profile, crop sequence and assistant context',()=>{const old=demoClone(state);state.profile={...blankProfile,crop:'Cây cũ'};state.rotation={...rotationDefaults,currentCrop:'maize',historyText:'2025: ngô'};state.goal='income';state.assistant=[{role:'user',text:'Tin nhắn cũ'}];state.selectedTree=4;resetLiveDemoWorkspace();const ok=Object.values(state.profile).every(v=>!has(v))&&Object.entries(rotationDefaults).every(([k,v])=>state.rotation[k]===v)&&state.goal==='mixed'&&state.assistant.length===1&&state.assistant[0].role==='assistant'&&state.selectedTree===null;Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,old);return ok;});
    test('Open-Meteo attribution has a complete Vietnamese and English mode with source and licence links',()=>{const old=openMeteoCreditLanguage;openMeteoCreditLanguage='vi';const vi=openMeteoAttribution();openMeteoCreditLanguage='en';const en=openMeteoAttribution();openMeteoCreditLanguage=old;return vi.includes('Ghi công dữ liệu thời tiết')&&vi.includes('CC BY 4.0')&&en.includes('Weather data attribution')&&en.includes('Weather data by Open-Meteo.com')&&en.includes(SRC.openMeteoLicense);});
    test('Advisor tour scrolls from page start through goals and the full crop ranking',()=>String(demoAdvisorStep).includes('demoScrollThroughPage')&&!String(demoAdvisorStep).includes("demoScroll('.candidate-grid'"));
    test('Rotation tour covers both annual and perennial examples with full-page scrolling',()=>{const body=String(demoRotationStep);return /systemType:'annual'/.test(body)&&/systemType:'perennial'/.test(body)&&(body.match(/demoScrollThroughPage/g)||[]).length>=2;});
    test('Plan and sources tour use gradual full-page scrolling rather than end-element jumps',()=>{const body=String(runLiveDemo);return body.includes("step.id==='plan'")&&body.includes("step.id==='sources'")&&body.includes("rootSelector:'#content'")&&!body.includes("demoScroll('.plan-cards'")&&!body.includes("demoScroll('.source-catalog'");});
    return results;
  }

  function bindPageEvents(){
    // Các nút, form và input chính được xử lý bằng event delegation ở initEvents().
    // Chỉ gắn listener riêng cho nút gợi ý câu hỏi trong khung chat.
    $$('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{const input=$('#assistantInput');if(input){input.value=b.dataset.prompt;input.focus();}}));
  }
  function go(page){state.page=page;$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');render();}
  async function action(a){
    if(a==='gps')return getGPS();
    if(a==='manual-coords'){
      const lat=Number($('#manualLat')?.value),lon=Number($('#manualLon')?.value);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180)return toast('Tọa độ không hợp lệ.');
      return setLocationCandidate({lat,lon,label:'Tọa độ bạn nhập',accuracy:null,source:'manual'});
    }
    if(a==='confirm-location'){
      if(!state.locationCandidate)return;
      state.location={...state.locationCandidate,label:state.locationCandidate.address||state.locationCandidate.label||'Điểm tham chiếu đã xác nhận',confirmedAt:new Date().toISOString()};
      state.locationCandidate=null;state.weather=null;state.power=null;state.soilPower=null;state.soilPowerError='';save();render();fetchData();
      if(liveDemo.active&&liveDemo.waitingForLocationConfirm){liveDemo.locationConfirmed=true;demoSetStatus('Đã xác nhận vị trí · đang chờ dữ liệu môi trường tải về…');}
      return toast('Đã xác nhận vị trí. Đang lấy dữ liệu môi trường…');
    }
    if(a==='cancel-location'){state.locationCandidate=null;save();render();return toast('Đã hủy vị trí chờ xác nhận.');}
    if(a==='clear-location'){state.location=null;state.locationCandidate=null;state.weather=null;state.power=null;state.soilPower=null;state.soilPowerError='';save();render();return toast('Đã xóa vị trí tham chiếu.');}
    if(a==='refresh'){return fetchData();}
    if(a==='open-heat-profile'){state.profileOpenGroup=groups.length-1;go('profile');return;}
    if(a==='export')return exportProfile();
    if(a==='clear-profile'){if(confirm('Xóa toàn bộ hồ sơ và vị trí đã lưu trên trình duyệt này?')){state.profile={...blankProfile};state.goal='mixed';state.location=null;state.locationCandidate=null;state.weather=null;state.power=null;state.climate=null;save();render();toast('Đã xóa dữ liệu lưu cục bộ.');}return;}
  }
  function getGPS(){
    if(!navigator.geolocation)return toast('Trình duyệt không hỗ trợ GPS. Hãy tìm địa điểm hoặc nhập tọa độ.');
    toast('Đang yêu cầu quyền vị trí…');
    navigator.geolocation.getCurrentPosition(pos=>setLocationCandidate({lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Vị trí thiết bị vừa xác định',accuracy:pos.coords.accuracy,source:'browser-gps',timestamp:new Date(pos.timestamp).toISOString()}),err=>toast(err.code===1?'Bạn chưa cấp quyền vị trí. Hãy chọn địa điểm hoặc nhập tọa độ.':'Không lấy được vị trí. Hãy thử lại hoặc chọn trên bản đồ.'),{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  function setLocationCandidate(loc){
    state.locationCandidate={...loc,...(liveDemo.active?{demoOnly:true}:{}),address:loc.address||'',lookupStatus:loc.address?'done':'loading'};
    save();render();if(!loc.address)resolveCandidateLocation(state.locationCandidate);
    toast('Đã nhận tọa độ. Hãy kiểm tra địa danh và sai số trước khi xác nhận.');
  }
  function resolveCandidateLocation(loc){
    const key=`${Number(loc.lat).toFixed(6)},${Number(loc.lon).toFixed(6)}`;
    if(state.candidateLookupKey===key)return;
    state.candidateLookupKey=key;
    reverseGeocode(loc).then(address=>{
      const candidate=state.locationCandidate;
      if(!candidate||`${Number(candidate.lat).toFixed(6)},${Number(candidate.lon).toFixed(6)}`!==key)return;
      candidate.address=address||'';candidate.lookupStatus=address?'done':'failed';save();
      if(state.page==='location')render();
    }).catch(()=>{
      const candidate=state.locationCandidate;
      if(candidate&&`${Number(candidate.lat).toFixed(6)},${Number(candidate.lon).toFixed(6)}`===key){candidate.lookupStatus='failed';save();if(state.page==='location')render();}
    }).finally(()=>{if(state.candidateLookupKey===key)state.candidateLookupKey=null;});
  }
  function trackAsiaApiUrl(path,params={}){
    if(!TRACKASIA_KEY)throw new Error('Chưa cấu hình TrackAsia API key. Mở config.js và nhập khóa mới đã giới hạn domain.');
    const q=new URLSearchParams({...params,key:TRACKASIA_KEY});
    return `https://maps.track-asia.com/api/v2/${path}?${q.toString()}`;
  }
  async function trackAsiaFetch(path,params={}){
    const url=trackAsiaApiUrl(path,params);
    const res=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!res.ok)throw new Error(`TrackAsia HTTP ${res.status}`);
    const data=await res.json();
    if(data?.status&&data.status!=='OK'&&data.status!=='ZERO_RESULTS')throw new Error(data.error_message||`TrackAsia: ${data.status}`);
    return data;
  }
  async function reverseGeocode(loc){
    const data=await trackAsiaFetch('geocode/json',{latlng:`${loc.lat},${loc.lon}`,new_admin:'true',include_old_admin:'true',size:'5',radius:'200'});
    const r=data?.results?.[0];
    if(!r)return '';
    loc.oldAddress=r.old_formatted_address||loc.oldAddress||'';
    loc.officialId=r.official_id||loc.officialId||'';
    return r.formatted_address||r.sublabel||r.name||'';
  }
  function resolveSavedLocation(loc){
    const key=`${Number(loc.lat).toFixed(6)},${Number(loc.lon).toFixed(6)}`;
    if(state.reverseLookupKey===key||loc.address)return;
    state.reverseLookupKey=key;
    reverseGeocode(loc).then(address=>{
      if(state.location&&`${Number(state.location.lat).toFixed(6)},${Number(state.location.lon).toFixed(6)}`===key&&address){state.location.address=address;save();if(state.page==='location')render();}
    }).catch(()=>{}).finally(()=>{if(state.reverseLookupKey===key)state.reverseLookupKey=null;});
  }
  async function searchPlace(e){
    e.preventDefault();
    const q=$('#placeSearch')?.value.trim();if(!q)return;
    const box=$('#searchResults');if(!TRACKASIA_KEY){if(box)box.innerHTML='<div class="muted">Chưa cấu hình khóa TrackAsia. Mở config.js, nhập khóa mới đã giới hạn domain rồi tải lại trang.</div>';return;}
    if(box)box.innerHTML='<div class="muted">Đang tìm địa điểm…</div>';
    try{
      const params={input:q,size:'6',new_admin:'true',include_old_admin:'true'};
      if(state.location)params.location=`${state.location.lat},${state.location.lon}`;
      const data=await trackAsiaFetch('place/autocomplete/json',params);
      state.searchResults=data.predictions||[];
      const html=state.searchResults.map((r,i)=>{
        const main=r.structured_formatting?.main_text||r.name||r.description||'Địa điểm';
        const secondary=r.structured_formatting?.secondary_text||r.formatted_address||r.old_formatted_address||'';
        return `<button type="button" data-place-index="${i}"><span>◎</span><b>${esc(main)}</b><small>${esc(secondary)}</small></button>`;
      }).join('')||'<div class="muted">Không tìm thấy địa điểm. Thử tên đường, quốc lộ, xã/phường hoặc tỉnh/thành phố.</div>';
      if(box)box.innerHTML=html;
    }catch(err){if(box)box.innerHTML=`<div class="muted">${esc(err.message||'Không tìm được địa điểm từ TrackAsia.')}</div>`;}
  }
  async function selectSearchPlace(index){
    const p=state.searchResults?.[index];if(!p?.place_id)return;
    const box=$('#searchResults');if(box)box.innerHTML='<div class="muted">Đang lấy tọa độ và địa chỉ chi tiết…</div>';
    try{
      const data=await trackAsiaFetch('place/details/json',{place_id:p.place_id,new_admin:'true',include_old_admin:'true'});
      const r=data?.result;const point=r?.geometry?.location;
      const lat=Number(point?.lat),lon=Number(point?.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('TrackAsia chưa trả tọa độ cho địa điểm này. Thử tìm bằng địa chỉ đầy đủ.');
      setLocationCandidate({lat,lon,label:r.name||p.name||'Địa điểm đã chọn',address:r.formatted_address||p.formatted_address||p.description||'',oldAddress:r.old_formatted_address||p.old_formatted_address||'',officialId:r.official_id||p.official_id||'',accuracy:null,source:'trackasia-search'});
    }catch(err){if(box)box.innerHTML=`<div class="muted">${esc(err.message||'Không lấy được thông tin chi tiết địa điểm.')}</div>`;}
  }
  async function fetchWeatherOnly(renderAfter=true){if(!state.location||state.weatherLoading)return;state.weatherLoading=true;state.weatherError='';state.weatherUrl=weatherUrl();state.weatherAttemptAt=new Date().toISOString();persistFreshness();if(renderAfter)render();try{const r=await fetch(state.weatherUrl,{cache:'no-store'});if(!r.ok)throw new Error(`Open-Meteo HTTP ${r.status}`);state.weather=await r.json();state.weatherFetchedAt=new Date().toISOString();state.weatherDataTime=state.weather?.current?.time||null;}catch(e){state.weatherError=e.message;}finally{state.weatherLoading=false;persistFreshness();if(renderAfter)render();}}
  async function fetchPowerOnly(renderAfter=true){if(!state.location||state.powerLoading)return;state.powerLoading=true;state.powerError='';state.powerAttemptAt=new Date().toISOString();const url=powerUrl();persistFreshness();if(renderAfter)render();try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`NASA POWER HTTP ${r.status}`);state.power=await r.json();state.powerFetchedAt=new Date().toISOString();state.powerDataDate=latestPower(state.power)?.date||null;}catch(e){state.powerError=e.message;}finally{state.powerLoading=false;persistFreshness();if(renderAfter)render();}}
  async function fetchSoilPowerOnly(renderAfter=false){if(!state.location||state.soilPowerLoading)return;state.soilPowerLoading=true;state.soilPowerError='';state.soilPowerAttemptAt=new Date().toISOString();const url=soilPowerUrl();state.soilPowerUrl=url;persistFreshness();try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`NASA POWER SMAP HTTP ${r.status}`);const data=await r.json();const p=data?.properties?.parameter;if(!p||(!p.SFMC&&!p.RZMC))throw new Error('API chưa trả SFMC/RZMC hợp lệ cho khoảng ngày yêu cầu.');state.soilPower=data;state.soilPowerFetchedAt=new Date().toISOString();}catch(e){state.soilPowerError=e.message;}finally{state.soilPowerLoading=false;persistFreshness();if(renderAfter)render();}}
  async function fetchClimateOnly(renderAfter=false){if(!state.location||state.climateLoading)return;state.climateLoading=true;state.climateError='';state.climateAttemptAt=new Date().toISOString();persistFreshness();if(renderAfter)render();try{const url=climateUrl();const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`NASA POWER Climatology HTTP ${r.status}`);state.climate=await r.json();state.climateFetchedAt=new Date().toISOString();}catch(e){state.climateError=e.message;}finally{state.climateLoading=false;persistFreshness();if(renderAfter)render();}}
  function climateAnnual(key){const obj=state.climate?.properties?.parameter?.[key];if(!obj)return null;const v=obj.ANN??obj.ann??obj.AVG??null;return Number.isFinite(Number(v))&&Number(v)>-900?Number(v):null;}
  async function fetchData(){if(!state.location)return;state.loading=true;render();await Promise.allSettled([fetchWeatherOnly(false),fetchPowerOnly(false),fetchSoilPowerOnly(false),fetchClimateOnly(false)]);state.loading=false;state.updatedAt=new Date();render();}
  async function autoRefreshDue(){if(liveDemo.active||document.hidden||!state.location)return;const now=Date.now();const weatherBase=state.weatherError&&state.weatherAttemptAt?state.weatherAttemptAt:state.weatherFetchedAt;const powerBase=state.powerError&&state.powerAttemptAt?state.powerAttemptAt:state.powerFetchedAt;const weatherAge=weatherBase?now-new Date(weatherBase).getTime():Infinity;const powerAge=powerBase?now-new Date(powerBase).getTime():Infinity;const climateBase=state.climateError&&state.climateAttemptAt?state.climateAttemptAt:state.climateFetchedAt;const climateAge=climateBase?now-new Date(climateBase).getTime():Infinity;const needWeather=!state.weatherLoading&&weatherAge>=(state.weatherError?WEATHER_RETRY_MS:WEATHER_REFRESH_MS);const needPower=!state.powerLoading&&powerAge>=(state.powerError?POWER_RETRY_MS:POWER_REFRESH_MS);const needClimate=!state.climateLoading&&climateAge>=(state.climateError?7*24*60*60*1000:CLIMATE_REFRESH_MS);const soilAge=state.soilPowerFetchedAt?now-new Date(state.soilPowerFetchedAt).getTime():Infinity;const needSoil=!state.soilPowerLoading&&soilAge>=(state.soilPowerError?POWER_RETRY_MS:POWER_REFRESH_MS);if(!needWeather&&!needPower&&!needClimate&&!needSoil)return;state.loading=true;render();const tasks=[];if(needWeather)tasks.push(fetchWeatherOnly(false));if(needPower)tasks.push(fetchPowerOnly(false));if(needClimate)tasks.push(fetchClimateOnly(false));if(needSoil)tasks.push(fetchSoilPowerOnly(false));await Promise.allSettled(tasks);state.loading=false;state.updatedAt=new Date();render();}
  function startAutoRefresh(){if(window._smartFarmRefreshTimer)clearInterval(window._smartFarmRefreshTimer);window._smartFarmRefreshTimer=setInterval(autoRefreshDue,60_000);}
  function initMap(){
    const node=$('#map');if(!node)return;
    if(window._farmMap){try{window._farmMap.remove();}catch{}window._farmMap=null;}
    if(!TRACKASIA_KEY){
      node.innerHTML='<div class="map-empty"><b>Chưa cấu hình TrackAsia API key</b><span>Mở config.js, nhập khóa mới và giới hạn domain trước khi sử dụng bản đồ. GPS và nhập tọa độ vẫn có thể dùng.</span><a class="src" href="https://account.track-asia.com/tokens" target="_blank" rel="noreferrer">Quản lý khóa TrackAsia ↗</a></div>';
      return;
    }
    if(!window.trackasiagl?.Map){
      node.innerHTML='<div class="map-empty"><b>Chưa tải được TrackAsia GL JS</b><span>Kiểm tra kết nối tới unpkg CDN hoặc mở lại trang.</span></div>';
      return;
    }
    const display=state.locationCandidate||state.location;const hasLoc=!!display;
    const center=hasLoc?[Number(display.lon),Number(display.lat)]:[105.8,21.5];
    const styleUrl=`https://maps.track-asia.com/styles/v2/streets.json?${new URLSearchParams({detailLevel:'full',key:TRACKASIA_KEY}).toString()}`;
    const map=new window.trackasiagl.Map({container:node,style:styleUrl,center,zoom:hasLoc?14:6,attributionControl:true,scrollZoom:true});
    window._farmMap=map;
    try{map.addControl(new window.trackasiagl.NavigationControl(),'top-right');}catch{}
    let mapErrorShown=false;
    map.on('error',event=>{
      if(mapErrorShown)return;
      const message=event?.error?.message||'';
      if(/token|key|unauthorized|forbidden|401|403/i.test(message)||!map.loaded?.()){
        mapErrorShown=true;const wrap=node.parentElement;let msg=wrap.querySelector('.map-load-warning');
        if(!msg){msg=document.createElement('div');msg.className='map-load-warning';msg.textContent='TrackAsia chưa tải được bản đồ. Kiểm tra API key, giới hạn domain và hạn mức dịch vụ.';wrap.appendChild(msg);}
      }
    });
    if(hasLoc){
      const popupHtml=`<b>${esc(display.address||display.label||'Điểm vị trí')}</b><br>${Number(display.lat).toFixed(6)}, ${Number(display.lon).toFixed(6)}${display.oldAddress?`<br><small>Địa chỉ cũ: ${esc(display.oldAddress)}</small>`:''}${display.accuracy!==null&&display.accuracy!==undefined&&Number.isFinite(Number(display.accuracy))?`<br>Sai số GPS ±${Math.round(display.accuracy)} m`:''}`;
      new window.trackasiagl.Marker({color:state.locationCandidate?'#bd8531':'#26734e'}).setLngLat(center).setPopup(new window.trackasiagl.Popup({offset:24}).setHTML(popupHtml)).addTo(map);
    }
    map.on('click',e=>{
      const lat=Number(e.lngLat.lat.toFixed(6)),lon=Number(e.lngLat.lng.toFixed(6));
      setLocationCandidate({lat,lon,label:'Điểm bạn chọn trên bản đồ',accuracy:null,source:'manual-map'});
    });
    map.once('load',()=>{try{map.resize();}catch{}});
    setTimeout(()=>{try{map.resize();}catch{}},180);
  }
  let threeCleanup=null, threeTimer=null;
  function schedule3D(){clearTimeout(threeTimer);threeTimer=setTimeout(()=>{updateFarm3dDetails();init3D();},420);}
  function setSelectedTree(tree,model){
    state.selectedTree=tree;const box=$('#farmTreeSelection');if(!box)return;
    if(!tree){box.innerHTML='<b>Chọn một cây trong mô hình</b><span>Nhấn vào cây để xem số thứ tự, hàng, vị trí, giai đoạn và kích thước mô hình.</span>';return;}
    const p=state.profile,info=treeScaleInfo(p),sizeMeasured=has(p.treeHeight)||has(p.crownWidth);
    box.innerHTML=`<b>Cây số ${tree.index} · ${esc(cropLabel(p))}${p.treeVariety?` · ${esc(p.treeVariety)}`:''}</b><span>Hàng ${tree.row}, vị trí ${tree.col} · X ${fmt(tree.x,2)} m, Z ${fmt(tree.z,2)} m tính từ tâm khu vườn.</span><span>Tuổi/giai đoạn: ${has(p.treeAge)?esc(p.treeAge)+' năm':'Chưa nhập tuổi'} · ${esc(p.growthStage||'Chưa nhập giai đoạn')}.</span><span>Chiều cao mô hình: ${fmt(info.height,1)} m · Đường kính tán mô hình: ${fmt(info.crownWidth,1)} m · ${sizeMeasured?'có ít nhất một số đo người dùng nhập':'kích thước minh họa'}.</span><small>${info.source} ${info.crownSource} Vị trí tương đối trong mô hình. Kích thước từng cây chưa được đo riêng.</small>`;
  }
  function sceneLayerVisibility(groups){Object.entries(state.sceneLayers||{}).forEach(([k,v])=>{if(groups[k])groups[k].visible=v!==false;});}
  function shadeHex(hex,amt){const n=parseInt(String(hex).replace('#',''),16);const r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');}
  function blendHex(a,b,t){
    const ca=typeof a==='number'?a:parseInt(String(a).replace('#',''),16),cb=typeof b==='number'?b:parseInt(String(b).replace('#',''),16);t=clamp(Number(t)||0,0,1);
    const ch=(shift)=>Math.round(((ca>>shift)&255)*(1-t)+((cb>>shift)&255)*t);
    return '#'+[ch(16),ch(8),ch(0)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  function soilVisualTone(p=state.profile){
    if(!has(p.soilType))return {css:'#8c927e',hex:0x8c927e,base:null,moisture:null,temp:null};
    const base=soilPalette(p.soilType),surface=nasaSoilSnapshot('surface');
    const userMoisture=has(p.soilMoisture)?Number(String(p.soilMoisture).replace(',','.')):null;
    const moisture=Number.isFinite(userMoisture)?userMoisture:(surface?.value??null);
    const current=state.weather?.current,pl=latestPower(state.power);const temp=Number(current?.temperature_2m??pl?.t2m);let css=base.css;
    // A subtle wet-soil darkening and heat tint are visual cues only; the selected soil hue remains dominant.
    if(Number.isFinite(moisture)){const wet=clamp((moisture-8)/34,0,1);css=blendHex(css,0x34251d,wet*.17);}
    if(Number.isFinite(temp)&&temp>30){const heat=clamp((temp-30)/12,0,1);css=blendHex(css,0x9a542e,heat*.10);}
    return {css,hex:parseInt(css.slice(1),16),base,moisture:Number.isFinite(moisture)?moisture:null,temp:Number.isFinite(temp)?temp:null};
  }
  function init3DFallback(mount,model){
    mount.innerHTML='';const canvas=document.createElement('canvas');canvas.className='farm-fallback-canvas';canvas.setAttribute('aria-label','Mô phỏng khu vườn dạng phối cảnh tương tác');mount.appendChild(canvas);
    const ctx=canvas.getContext('2d');if(!ctx){mount.innerHTML='<div class="scene-empty"><b>Trình duyệt không hỗ trợ Canvas</b><p>Hãy mở website bằng Chrome hoặc Edge phiên bản mới.</p></div>';return;}let angle=-.58,zoom=1,drag=null,view=state.farmView||'orbit';
    const {width:wReal,length:lReal,area,trees}=model,p=state.profile,layers=state.sceneLayers||{};
    const treeInfo=treeScaleInfo(p),kind=cropKind(p),aspect=aspectVector(p)||[0,0],slope=aspectVector(p)?parseSlope(p):0;
    const fruiting=/quả|nuôi quả|thu hoạch|mang quả/i.test(String(p.growthStage||''));
    const rowMap=new Map();trees.forEach(t=>{if(!rowMap.has(t.row))rowMap.set(t.row,[]);rowMap.get(t.row).push(t);});
    function project(x,z,y=0){const c=Math.cos(angle),s=Math.sin(angle);const iso=view==='top'?.12:view==='low'||view==='walk'?.78:.48;const availW=Math.max(100,canvas.clientWidth-130),availH=Math.max(100,canvas.clientHeight-170);const rawScale=Math.min(availW/Math.max(1,(Math.abs(wReal*c)+Math.abs(lReal*s))),availH/Math.max(1,(Math.abs(wReal*s)+Math.abs(lReal*c))*iso+treeInfo.height*.95));const sc=Math.min(48,Math.max(.02,rawScale))*zoom;return {x:canvas.clientWidth/2+(x*c+z*s)*sc,y:canvas.clientHeight*.55+(-x*s+z*c)*sc*iso-y*sc,scale:sc};}
    function yAt(x,z){return slope?((x*aspect[0]+z*aspect[1])*slope):0;}
    function drawTree(t){
      const groundY=yAt(t.x,t.z),base=project(t.x,t.z,groundY),h=treeInfo.height,pxPerMetre=base.scale;
      // Fallback rendering uses the same metre-to-screen scale as the parcel; crown size is no longer a fixed screen decoration.
      const crownR=Math.max(2.5,Math.min(42,treeInfo.crownWidth*.5*pxPerMetre));
      const trunkTop=project(t.x,t.z,groundY+h*.55),top=project(t.x,t.z,groundY+h*.78);
      const trunkWidth=Math.max(1,Math.min(7,h*.035*pxPerMetre));
      const cs=canopyStress(),shade=cs.stress>=.72?'#a95335':cs.stress>=.42?'#c5a34c':kind==='conifer'?'#315f3b':kind==='citrus'?'#3e7c43':kind==='custard'?'#397d43':kind==='persimmon'?'#477e43':'#4b8750';
      ctx.fillStyle='rgba(35,57,35,.18)';ctx.beginPath();ctx.ellipse(base.x+2,base.y+2,crownR*.95,crownR*.24,-.2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#765037';ctx.lineWidth=trunkWidth;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(trunkTop.x,trunkTop.y);ctx.stroke();
      ctx.strokeStyle='#79543a';ctx.lineWidth=Math.max(1,trunkWidth*.65);ctx.beginPath();ctx.moveTo(trunkTop.x,trunkTop.y);ctx.lineTo(top.x-crownR*.27,top.y+crownR*.23);ctx.moveTo(trunkTop.x,trunkTop.y);ctx.lineTo(top.x+crownR*.27,top.y+crownR*.23);ctx.stroke();
      ctx.fillStyle=shade;
      if(kind==='conifer'){
        for(let k=0;k<3;k++){const r=crownR*(1.08-k*.22),yy=top.y-crownR*.7+k*crownR*.46;ctx.beginPath();ctx.moveTo(top.x,yy-crownR*.78);ctx.lineTo(top.x-r,yy+crownR*.38);ctx.lineTo(top.x+r,yy+crownR*.38);ctx.closePath();ctx.fill();}
      }else if(kind==='custard'){
        ctx.beginPath();ctx.ellipse(top.x,top.y,crownR*1.15,crownR*.72,-.08,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(top.x-crownR*.65,top.y+crownR*.10,crownR*.58,crownR*.52,.2,0,Math.PI*2);ctx.ellipse(top.x+crownR*.62,top.y+crownR*.12,crownR*.62,crownR*.54,-.18,0,Math.PI*2);ctx.fill();
      }else{
        const count=kind==='citrus'?5:4;for(let k=0;k<count;k++){const a=(Math.PI*2*k/count)-Math.PI/2,rx=Math.cos(a)*crownR*.48,ry=Math.sin(a)*crownR*.26;ctx.beginPath();ctx.ellipse(top.x+rx,top.y+ry,crownR*(kind==='citrus'?.62:.67),crownR*.57,.1*k,0,Math.PI*2);ctx.fill();}
      }
      if(fruiting&&kind!=='conifer'){
        ctx.fillStyle=kind==='citrus'?'#efa234':'#b7c85a';const fruitCount=5;for(let f=0;f<fruitCount;f++){const a=(Math.PI*2*f/fruitCount)+t.index;ctx.beginPath();ctx.arc(top.x+Math.cos(a)*crownR*.72,top.y+Math.sin(a)*crownR*.44,Math.max(1.2,crownR*.10),0,Math.PI*2);ctx.fill();}
      }
      return {base,top,crownR};
    }
    function draw(){const rect=mount.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!rect.width||!rect.height)return;canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const W=rect.width,H=rect.height;ctx.clearRect(0,0,W,H);
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#e9f3f5');sky.addColorStop(.56,'#eef3e9');sky.addColorStop(1,'#dce8d8');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      const corners=[project(-wReal/2,-lReal/2,yAt(-wReal/2,-lReal/2)),project(wReal/2,-lReal/2,yAt(wReal/2,-lReal/2)),project(wReal/2,lReal/2,yAt(wReal/2,lReal/2)),project(-wReal/2,lReal/2,yAt(-wReal/2,lReal/2))];
      ctx.beginPath();corners.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();const baseSoil=has(p.soilType)?soilVisualTone(p).css:'#8c927e';const ground=ctx.createLinearGradient(corners[0].x,corners[0].y,corners[2].x,corners[2].y);ground.addColorStop(0,baseSoil);ground.addColorStop(1,baseSoil);ctx.fillStyle=layers.soil===false?'#c5cbbf':ground;ctx.fill();ctx.strokeStyle='#496c47';ctx.lineWidth=2;ctx.stroke();
      if(layers.terrain!==false){ctx.save();ctx.beginPath();corners.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.clip();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;for(let i=0;i<7;i++){const y=H*.28+i*19;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(W*.35,y-12,W*.65,y+12,W,y);ctx.stroke();}ctx.restore();}
      if(layers.rows!==false&&trees.length){ctx.strokeStyle='rgba(242,235,202,.7)';ctx.lineWidth=Math.max(2,Math.min(7,zoom*4));rowMap.forEach(row=>{if(row.length<1)return;const xs=row.map(t=>t.x),z=row.reduce((sum,t)=>sum+t.z,0)/row.length;const a=project(Math.min(...xs)-.35,z,yAt(Math.min(...xs)-.35,z)+.015),b=project(Math.max(...xs)+.35,z,yAt(Math.max(...xs)+.35,z)+.015);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});}
      if(layers.dimensions!==false){ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=1;for(let i=1;i<10;i++){let t=i/10,a=project(-wReal/2+t*wReal,-lReal/2),b=project(-wReal/2+t*wReal,lReal);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();a=project(-wReal/2,-lReal/2+t*lReal);b=project(wReal/2,-lReal/2+t*lReal);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.fillStyle='#355b40';ctx.font='700 11px system-ui';const wMid=project(0,-lReal/2-.5),lMid=project(-wReal/2-.6,0);ctx.fillText(`W ${fmt(wReal,1)} m`,wMid.x-20,wMid.y-7);ctx.fillText(`L ${fmt(lReal,1)} m`,lMid.x-22,lMid.y-7);}
      if(layers.soil&&has(p.soilType)){
        const soil=soilPalette(p.soilType),visual=soilVisualTone(p),depthM=has(p.soilDepth)&&numVal(p.soilDepth)>0?Math.min(3,numVal(p.soilDepth)/100):.6;
        const frontLeft=project(-wReal/2,lReal/2,yAt(-wReal/2,lReal/2)),frontRight=project(wReal/2,lReal/2,yAt(wReal/2,lReal/2));
        const depthPx=Math.max(12,Math.min(58,depthM*24*zoom));
        ctx.beginPath();ctx.moveTo(frontLeft.x,frontLeft.y);ctx.lineTo(frontRight.x,frontRight.y);ctx.lineTo(frontRight.x,frontRight.y+depthPx);ctx.lineTo(frontLeft.x,frontLeft.y+depthPx);ctx.closePath();
        const horizon=[visual.css,shadeHex(visual.css,-18),shadeHex(visual.css,20)];for(let k=0;k<3;k++){const top=frontLeft.y+depthPx*k/3,bottom=frontLeft.y+depthPx*(k+1)/3;ctx.beginPath();ctx.moveTo(frontLeft.x,top);ctx.lineTo(frontRight.x,top);ctx.lineTo(frontRight.x,bottom);ctx.lineTo(frontLeft.x,bottom);ctx.closePath();ctx.fillStyle=horizon[k];ctx.fill();}ctx.strokeStyle=soil.dark;ctx.lineWidth=1.5;ctx.stroke();
        ctx.beginPath();ctx.moveTo(frontLeft.x,frontLeft.y+depthPx);ctx.lineTo(frontRight.x,frontRight.y+depthPx);ctx.strokeStyle=soil.dark;ctx.lineWidth=2;ctx.stroke();
      }
      if(layers.cover!==false&&trees.length){ctx.save();ctx.globalAlpha=.82;trees.forEach(t=>{const q=project(t.x,t.z,yAt(t.x,t.z)+.012),rad=Math.max(4,Math.min(15,treeInfo.crownWidth*1.4*zoom));ctx.fillStyle='#89bd78';ctx.beginPath();ctx.ellipse(q.x,q.y,rad,rad*.46,-.12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5e9e58';for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(q.x+(j-1)*rad*.34,q.y-rad*.05,rad*.24,rad*.12,j*.3,0,Math.PI*2);ctx.fill();}});ctx.restore();}
      if(layers.irrigation&&has(p.irrigationMethod)){ctx.strokeStyle='#2f91be';ctx.lineWidth=2.5;rowMap.forEach(row=>{const xs=row.map(t=>t.x),z=row.reduce((sum,t)=>sum+t.z,0)/row.length;const a=project(Math.min(...xs)-.45,z,yAt(Math.min(...xs)-.45,z)+.05),b=project(Math.max(...xs)+.45,z,yAt(Math.max(...xs)+.45,z)+.05);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(/nhỏ giọt|drip/i.test(p.irrigationMethod)){row.forEach(t=>{const q=project(t.x,t.z,yAt(t.x,t.z)+.07);ctx.fillStyle='#58c5e4';ctx.beginPath();ctx.arc(q.x,q.y,2.4,0,Math.PI*2);ctx.fill();});}});}
      const ordered=[...trees].sort((a,b)=>a.z-b.z);const projected=new Map();if(layers.plants!==false){ordered.forEach(t=>projected.set(t.index,drawTree(t)));}
      if(layers.labels!==false&&layers.plants!==false&&trees.length){const step=Math.max(1,Math.ceil(trees.length/80));trees.forEach(t=>{if(t.index%step!==0&&t.index!==state.selectedTree?.index)return;const q=projected.get(t.index)||drawTree(t);const x=q.top.x,y=q.top.y-q.crownR*.92;ctx.fillStyle='#ffffffed';ctx.strokeStyle='#477451';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#315b3d';ctx.font='700 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(t.index),x,y);ctx.textAlign='start';ctx.textBaseline='alphabetic';});}
      if(state.selectedTree&&projected.has(state.selectedTree.index)){const q=projected.get(state.selectedTree.index);ctx.strokeStyle='#e3a43b';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(q.base.x,q.base.y,Math.max(13,q.crownR*.95),Math.max(6,q.crownR*.32),0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#244b35';ctx.font='700 12px system-ui';ctx.fillText(`${Number(area).toLocaleString('vi-VN')} m² · ${trees.length} cây`,14,24);ctx.fillStyle='#5d7763';ctx.font='11px system-ui';ctx.fillText('Kéo để xoay · Cuộn để phóng to · Nhấn cây để xem thông tin',14,H-18);
    }
    const onDown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,angle};canvas.setPointerCapture?.(e.pointerId);};const onMove=e=>{if(!drag)return;angle=drag.angle+(e.clientX-drag.x)*.009;draw();};const onUp=e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag=null;if(moved<6&&trees.length){let best=null,dist=1e9;trees.forEach(t=>{const q=project(t.x,t.z,yAt(t.x,t.z)+treeInfo.height*.78);const d=Math.hypot(q.x-e.offsetX,q.y-e.offsetY);if(d<dist){dist=d;best=t;}});if(best&&dist<Math.max(18,treeInfo.crownWidth*project(best.x,best.z).scale*.75))setSelectedTree(best,model);draw();}};const onWheel=e=>{e.preventDefault();zoom=Math.min(3,Math.max(.45,zoom*(e.deltaY<0?1.08:.92)));draw();};
    canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('wheel',onWheel,{passive:false});const obs=window.ResizeObserver?new ResizeObserver(draw):null;if(obs)obs.observe(mount);const onWindowResize=()=>draw();window.addEventListener('resize',onWindowResize);requestAnimationFrame(draw);setTimeout(draw,80);
    const providerNote=document.createElement('div');providerNote.className='scene-engine-note';providerNote.textContent='Chế độ tương thích · phối cảnh tương tác theo dữ liệu vườn';mount.appendChild(providerNote);
    window.__farm3d={setView(v){view=v;draw();},setLayer(){draw();},cleanup(){if(obs)obs.disconnect();window.removeEventListener('resize',onWindowResize);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('wheel',onWheel);}};threeCleanup=()=>{window.__farm3d?.cleanup?.();window.__farm3d=null;};
  }
  function latestPowerParam(data,key){
    const entry=latestPowerEntry(data,key);if(!entry)return null;
    return {...entry,units:data?.parameters?.[key]?.units||data?.properties?.parameter?.[key]?.units||''};
  }
  function nasaSoilSnapshot(metric=state.heatmapMetric||'root'){
    const key=metric==='surface'?'SFMC':'RZMC';const percentileKey=metric==='surface'?'SFMC_PRCNTL':'RZMC_PRCNTL';
    const raw=latestPowerParam(state.soilPower,key),pct=latestPowerParam(state.soilPower,percentileKey);
    if(!raw)return null;
    const value=raw.value>=0&&raw.value<=1?raw.value*100:raw.value;
    return {key,value,date:raw.date,percentile:pct?.value??null,depth:metric==='surface'?'0–5 cm':'0–100 cm',units:'% thể tích',source:state.soilPowerUrl||soilPowerUrl()};
  }
  function canopyStress(){
    const c=state.weather?.current,pl=latestPower(state.power),p=state.profile;
    const temp=Number(c?.temperature_2m??pl?.t2m),rh=Number(c?.relative_humidity_2m??pl?.rh);
    const soilUser=has(p.soilMoisture)?Number(p.soilMoisture):null;
    const smap=nasaSoilSnapshot('root');const soil=soilUser!==null&&Number.isFinite(soilUser)?soilUser:(smap?.value??null);
    let score=0,parts=0;
    if(Number.isFinite(temp)){score+=clamp((temp-29)/9,0,1)*.55;parts+=.55;}
    if(Number.isFinite(rh)){score+=clamp((48-rh)/38,0,1)*.18;parts+=.18;}
    if(soil!==null&&Number.isFinite(soil)){score+=clamp((38-soil)/30,0,1)*.27;parts+=.27;}
    return {stress:parts?score/parts:0.12,score:parts?Math.round((1-score/parts)*100):null,temp:Number.isFinite(temp)?temp:null,rh:Number.isFinite(rh)?rh:null,soil,soilSource:soilUser!==null?'Số đo người dùng':smap?'NASA SMAP ~9 km':'Chưa có số liệu độ ẩm đất',confidence:parts>=.9?'Tương đối đầy đủ':parts>=.55?'Một phần':'Thiếu dữ liệu'};
  }
  function canopyHistory(){
    const para=state.power?.properties?.parameter;if(!para?.T2M)return [];
    const keys=Object.keys(para.T2M).filter(k=>/^\d{8}$/.test(k)).sort();const last=keys.slice(-183);const byMonth=new Map();
    last.forEach(k=>{const date=new Date(`${k.slice(0,4)}-${k.slice(4,6)}-${k.slice(6,8)}T12:00:00`);const month=k.slice(0,6);const get=(key)=>Number(para[key]?.[k]);const v={temp:get('T2M_MAX')>-900?get('T2M_MAX'):get('T2M'),rh:get('RH2M'),rain:get('PRECTOTCORR')};if(!Number.isFinite(v.temp)||v.temp<-900)return;const a=byMonth.get(month)||{label:date.toLocaleDateString('vi-VN',{month:'short'}),temps:[],rhs:[],rain:0,days:0};a.temps.push(v.temp);if(Number.isFinite(v.rh)&&v.rh>-900)a.rhs.push(v.rh);if(Number.isFinite(v.rain)&&v.rain>-900)a.rain+=v.rain;a.days++;byMonth.set(month,a);});
    return [...byMonth.values()].slice(-6).map(a=>{const t=a.temps.reduce((x,y)=>x+y,0)/a.temps.length,rh=a.rhs.length?a.rhs.reduce((x,y)=>x+y,0)/a.rhs.length:null;const heat=clamp((t-30)/12,0,1),dry=rh===null?0:clamp((48-rh)/40,0,1),rainStress=clamp((80-a.rain)/80,0,1);const proxy=clamp(.86-.24*heat-.16*dry-.12*rainStress,.25,.9);return {label:a.label,temp:t,rh,rain:a.rain,proxy};});
  }
  function canopyIndicatorHTML(){
    const x=canopyStress(),hist=canopyHistory(),colour=x.stress>=.72?'#b94f3e':x.stress>=.42?'#bd943c':'#4e8c55';
    const current=x.score===null?'Chưa có dữ liệu':`${x.score}/100`;
    let graph='<div class="canopy-no-history">Chưa có chuỗi NASA POWER 6 tháng để tổng hợp. Khi tải được lịch sử nhiệt độ, độ ẩm không khí và mưa, biểu đồ sẽ xuất hiện.</div>';
    if(hist.length){const pts=hist.map((h,i)=>`${10+i*(180/Math.max(1,hist.length-1))},${82-(h.proxy-.25)/.65*58}`).join(' ');graph=`<svg viewBox="0 0 200 100" role="img" aria-label="Chỉ báo khí hậu mô phỏng sáu tháng"><polyline points="${pts}" fill="none" stroke="#4d8e5d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>${hist.map((h,i)=>`<circle cx="${10+i*(180/Math.max(1,hist.length-1))}" cy="${82-(h.proxy-.25)/.65*58}" r="2.8" fill="#4d8e5d"/><text x="${10+i*(180/Math.max(1,hist.length-1))}" y="96" font-size="7" text-anchor="middle" fill="#758579">${esc(h.label)}</text>`).join('')}</svg><div class="canopy-months">${hist.map(h=>`<span>${esc(h.label)} · ${fmt(h.temp,1)}°C · ${fmt(h.rain,0)} mm mưa · <b>${fmt(h.proxy,2)}</b></span>`).join('')}</div>`;}
    return `<section class="canopy-card"><div class="canopy-card-head"><div><span class="eyebrow">ENVIRONMENTAL CANOPY INDICATOR</span><h3>Chỉ báo điều kiện tán cây</h3></div><b style="color:${colour}">${current}</b></div><div class="canopy-card-body"><div class="canopy-meter"><i style="width:${x.score??0}%;background:${colour}"></i></div><div class="canopy-stats"><span>Nhiệt độ: <b>${x.temp===null?'—':fmt(x.temp,1)+'°C'}</b></span><span>Ẩm không khí: <b>${x.rh===null?'—':fmt(x.rh,0)+'%'}</b></span><span>Độ ẩm đất: <b>${x.soil===null?'—':fmt(x.soil,1)+'%'}</b></span><span>Nguồn ẩm: <b>${esc(x.soilSource)}</b></span></div></div><div class="canopy-history">${graph}</div><p class="small-note">Chỉ báo môi trường từ thời tiết và độ ẩm đất · chưa có NDVI vệ tinh.</p>${src('NASA POWER Daily',powerUrl(),'chuỗi thời tiết lưới tại tọa độ tham chiếu')}${src('NASA POWER SMAP L4',SRC.nasaHydrology,'độ ẩm đất dạng lưới ~9 km')}</section>`;
  }
  function heatSamplesFromProfile(p){
    const coords=[[0,0],[.5,0],[1,0],[0,.5],[.5,.5],[1,.5],[0,1],[.5,1],[1,1]];
    return coords.map(([x,z],i)=>({x,z,value:has(p[`heat${i+1}`])?Number(String(p[`heat${i+1}`]).replace(',','.')):null,index:i+1})).filter(x=>Number.isFinite(x.value)&&x.value>=0&&x.value<=100);
  }
  function hasNonCollinearHeatPoints(samples){
    if(samples.length<3)return false;
    const a=samples[0];
    for(let i=1;i<samples.length-1;i++)for(let j=i+1;j<samples.length;j++){
      const b=samples[i],c=samples[j],area2=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
      if(Math.abs(area2)>1e-6)return true;
    }
    return false;
  }
  function heatColor(value,min,max){
    const t=max===min?.5:Math.max(0,Math.min(1,(value-min)/(max-min)));
    const stops=[[49,112,181],[76,165,190],[124,190,126],[230,196,82],[204,91,68]];
    const q=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(q)),f=q-i;
    const c=stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f));return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function initHeatmapView(mount,model){
    if(!Number.isFinite(model.width)||!Number.isFinite(model.length)||model.width<=0||model.length<=0){mount.innerHTML='<div class="heatmap-empty"><b>Chưa xác định kích thước vườn</b><p>Nhập diện tích hoặc chiều dài và chiều rộng để đặt đúng tỷ lệ mặt bằng.</p><button class="btn primary" data-action="open-heat-profile">Mở Hồ sơ canh tác →</button></div>';return;}
    const samples=heatSamplesFromProfile(state.profile),manualOk=samples.length>=3&&hasNonCollinearHeatPoints(samples),nasa=nasaSoilSnapshot(state.heatmapMetric||'root');
    if(!manualOk&&!nasa){const detail=state.soilPowerError?`NASA SMAP chưa tải được: ${esc(state.soilPowerError)}.`:'Chưa có bản ghi NASA SMAP hợp lệ cho tọa độ này.';mount.innerHTML=`<div class="heatmap-empty"><b>Chưa có dữ liệu để dựng lớp nhiệt–ẩm</b><p>${detail} Nhập ít nhất 3 điểm đo độ ẩm đất để tạo bản đồ trong vườn.</p><button class="btn primary" data-action="open-heat-profile">Nhập điểm đo thực tế →</button><small>Nguồn SMAP L4: độ ẩm đất dạng lưới khoảng 9 km; không có độ phân giải từng luống.</small></div>`;return;}
    mount.innerHTML='';const canvas=document.createElement('canvas');canvas.className='farm-heatmap-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Bản đồ nhiệt ẩm theo NASA SMAP hoặc điểm đo thủ công');mount.appendChild(canvas);const ctx=canvas.getContext('2d');if(!ctx){mount.innerHTML='<div class="heatmap-empty"><b>Trình duyệt không hỗ trợ Canvas 2D</b><p>Hãy dùng Chrome, Edge hoặc Firefox phiên bản mới.</p></div>';return;}
    const values=manualOk?samples.map(x=>x.value):[nasa.value],min=manualOk?Math.min(...values):0,max=manualOk?Math.max(...values):45;let disposed=false,raf=0;
    const draw=()=>{if(disposed)return;const r=mount.getBoundingClientRect();if(r.width<20||r.height<20)return;const dpr=clamp(window.devicePixelRatio||1,1,2),W=Math.round(r.width),H=Math.round(Math.max(r.height,360));canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width='100%';canvas.style.height='100%';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle='#f3f7f0';ctx.fillRect(0,0,W,H);const pad=42,ratio=model.width/model.length;let pw=Math.max(80,W-pad*2),ph=Math.max(80,H-pad*2-38);if(pw/ph>ratio)pw=ph*ratio;else ph=pw/ratio;const x0=(W-pw)/2,y0=(H-ph)/2+2;
      if(manualOk){ctx.save();ctx.beginPath();ctx.rect(x0,y0,pw,ph);ctx.clip();const cols=Math.max(30,Math.min(96,Math.round(pw/7))),rows=Math.max(22,Math.min(80,Math.round(ph/7))),cw=pw/cols,ch=ph/rows;for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const nx=(col+.5)/cols,nz=(row+.5)/rows;let num=0,den=0,exact=null;samples.forEach(pt=>{const d2=(nx-pt.x)**2+(nz-pt.z)**2;if(d2<1e-10)exact=pt.value;const wt=1/Math.max(1e-7,d2**1.15);num+=wt*pt.value;den+=wt;});const value=exact===null?num/den:exact;ctx.fillStyle=heatColor(value,min,max);ctx.fillRect(x0+col*cw,y0+row*ch,cw+1,ch+1);}ctx.restore();}
      else {const base=heatColor(nasa.value,0,45);ctx.fillStyle=base;ctx.fillRect(x0,y0,pw,ph);ctx.fillStyle='rgba(255,255,255,.20)';ctx.fillRect(x0,y0,pw,ph);ctx.strokeStyle='rgba(38,67,47,.40)';ctx.setLineDash([6,4]);ctx.lineWidth=1;ctx.strokeRect(x0,y0,pw,ph);ctx.setLineDash([]);}
      ctx.strokeStyle='#315d3d';ctx.lineWidth=2.5;ctx.strokeRect(x0,y0,pw,ph);if(manualOk)samples.forEach(pt=>{const x=x0+pt.x*pw,y=y0+pt.z*ph;ctx.fillStyle='#fff';ctx.strokeStyle='#173f2c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#143c2b';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(pt.index),x,y);});
      ctx.textAlign='start';ctx.textBaseline='alphabetic';ctx.fillStyle='#234a33';ctx.font='700 13px system-ui';ctx.fillText(manualOk?`Độ ẩm đất · ${samples.length} điểm đo thực tế`:`NASA SMAP ${nasa.depth} · ${fmt(nasa.value,1)}% thể tích`,14,22);ctx.fillStyle='#718273';ctx.font='11px system-ui';ctx.fillText(`${fmt(model.width,1)} m × ${fmt(model.length,1)} m · nhìn từ trên xuống`,14,H-14);
      const legendY=Math.min(H-34,y0+ph+12),legendW=Math.min(250,pw),gradient=ctx.createLinearGradient(x0,0,x0+legendW,0);for(let i=0;i<=10;i++)gradient.addColorStop(i/10,heatColor((manualOk?min:0)+((manualOk?max:45)-(manualOk?min:0))*i/10,manualOk?min:0,manualOk?max:45));ctx.fillStyle=gradient;ctx.fillRect(x0,legendY,legendW,9);ctx.fillStyle='#526b58';ctx.font='10px system-ui';ctx.textAlign='start';ctx.fillText(`${fmt(manualOk?min:0,1)}%`,x0,legendY+21);ctx.textAlign='right';ctx.fillText(`${fmt(manualOk?max:45,1)}%`,x0+legendW,legendY+21);ctx.textAlign='start';
      if(!manualOk){ctx.fillStyle='#163d29';ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.fillText(`Giá trị ô lưới: ${fmt(nasa.value,1)}% thể tích`,x0+pw/2,y0+ph/2);ctx.font='11px system-ui';ctx.fillText(`Bản ghi ${nasa.date.slice(6,8)}/${nasa.date.slice(4,6)}/${nasa.date.slice(0,4)} · lưới SMAP ~9 km`,x0+pw/2,y0+ph/2+20);ctx.textAlign='start';}
    };
    const schedule=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);};const obs=window.ResizeObserver?new ResizeObserver(schedule):null;if(obs)obs.observe(mount);const onResize=()=>schedule();window.addEventListener('resize',onResize);schedule();const note=document.createElement('div');note.className='scene-engine-note';note.textContent=manualOk?'Bản đồ nội suy từ các điểm đo thủ công.':'NASA SMAP L4 · số liệu ô lưới tham chiếu khoảng 9 km.';mount.appendChild(note);window.__farm3d={setView(){},setLayer(){},cleanup(){disposed=true;if(raf)cancelAnimationFrame(raf);if(obs)obs.disconnect();window.removeEventListener('resize',onResize);}};threeCleanup=()=>{window.__farm3d?.cleanup?.();window.__farm3d=null;};
    const noteEl=$('#farmModeNote');if(noteEl)noteEl.innerHTML=manualOk?`<b>Ưu tiên:</b> ${samples.length} số đo thủ công nội suy IDW trong vườn. NASA SMAP là điểm tham chiếu lưới độc lập (${nasa?`${fmt(nasa.value,1)}% thể tích, ${nasa.date}`:'chưa có dữ liệu'}).`:`<b>Nguồn NASA:</b> ${esc(nasa.key)} · ${esc(nasa.depth)} · ${fmt(nasa.value,3)} m³/m³ (hiển thị ${fmt(nasa.value,1)}% thể tích) · ${nasa.date}. Lưới khoảng 9 km; màu thể hiện giá trị tham chiếu cho khu vực.`;if(nasa&&noteEl)noteEl.innerHTML+=` ${src('NASA POWER SMAP L4',SRC.nasaHydrology,'độ ẩm thể tích, lưới khoảng 9 km')}`;
  }

  function init3D(){
    const mount=$('#farmScene');if(!mount)return;if(threeCleanup){threeCleanup();threeCleanup=null;}const model=computeFarmModel(state.profile);
    if(!model.valid){state.selectedTree=null;mount.innerHTML='<div class="scene-empty"><div class="empty-icon">♧</div><b>Chưa có kích thước khu vườn</b><p>Nhập diện tích hoặc chiều dài và chiều rộng trong Hồ sơ canh tác.</p></div>';return;}
    if(state.selectedTree){const selected=model.trees.find(t=>t.index===state.selectedTree.index);state.selectedTree=selected||null;setSelectedTree(state.selectedTree,model);}
    if(state.farmMode==='heatmap'){initHeatmapView(mount,model);return;}
    const noteEl=$('#farmModeNote');if(noteEl){const v=soilVisualTone(state.profile);noteEl.innerHTML=`Mô hình dựng từ hồ sơ · đất: ${esc(soilLabel(state.profile.soilType))} · ${v.moisture!==null?`độ ẩm tham chiếu ${fmt(v.moisture,1)}%`:'chưa có dữ liệu độ ẩm đất'} · ${v.temp!==null?`nhiệt độ ${fmt(v.temp,1)}°C`:'chưa có nhiệt độ'}. Kích thước và cây chưa đo được hiển thị minh họa.`;}
    if(!window.THREE||!window.THREE.OrbitControls){init3DFallback(mount,model);return;}
    try{
      const T=window.THREE,p=state.profile,W=model.width,L=model.length,viewScale=Math.min(1.45,32/Math.max(W,L)),w=W*viewScale,l=L*viewScale,aspect=aspectVector(p)||[0,0],slope=aspectVector(p)?parseSlope(p):0,treeInfo=treeScaleInfo(p),kind=cropKind(p),fruiting=/quả|nuôi quả|thu hoạch|mang quả/i.test(String(p.growthStage||''));
      mount.innerHTML='';const scene=new T.Scene();scene.background=new T.Color(0xe8f0e7);scene.fog=new T.Fog(0xe8f0e7,Math.max(55,Math.max(w,l)*2),Math.max(120,Math.max(w,l)*4));
      const camera=new T.PerspectiveCamera(42,mount.clientWidth/Math.max(1,mount.clientHeight),.1,600),renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(Math.max(1,mount.clientWidth),Math.max(1,mount.clientHeight));renderer.domElement.style.display='block';renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;if('toneMapping'in renderer&&T.ACESFilmicToneMapping!==undefined){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;}if('outputColorSpace'in renderer)renderer.outputColorSpace=T.SRGBColorSpace;else renderer.outputEncoding=T.sRGBEncoding;mount.appendChild(renderer.domElement);const engineBadge=document.createElement('div');engineBadge.className='scene-engine-note';engineBadge.textContent='WebGL 3D · mô hình dựng từ hồ sơ vườn';mount.appendChild(engineBadge);
      const controls=new T.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=220;
      scene.add(new T.HemisphereLight(0xf4fff4,0x738064,1.05));scene.add(new T.AmbientLight(0xffffff,.22));const sun=new T.DirectionalLight(0xfff2db,1.05);sun.position.set(-w*1.2,Math.max(w,l)*1.8,l*1.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
      const groups={plants:new T.Group(),cover:new T.Group(),terrain:new T.Group(),soil:new T.Group(),irrigation:new T.Group(),dimensions:new T.Group(),rows:new T.Group(),labels:new T.Group()};Object.values(groups).forEach(g=>scene.add(g));
      const yAt=(x,z)=>slope?((x/viewScale*aspect[0]+z/viewScale*aspect[1])*slope*viewScale):0;
      const groundGeo=new T.PlaneGeometry(w,l,48,48),pos=groundGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);pos.setZ(i,yAt(x,z));}groundGeo.computeVertexNormals();groundGeo.rotateX(-Math.PI/2);
      const soilBase=has(p.soilType)?soilVisualTone(p).hex:0x8c927e;
      const groundSurface=new T.Mesh(groundGeo,new T.MeshStandardMaterial({color:soilBase,roughness:1}));groundSurface.receiveShadow=true;groups.soil.add(groundSurface);
      // Thin topographic contour lines are visual guides, not survey contours.
      if(slope){for(let k=-3;k<=3;k++){const pts=[];for(let i=0;i<=24;i++){const x=-w/2+i*w/24;const z=k*l/8;pts.push(new T.Vector3(x,yAt(x,z)+.012,z));}groups.terrain.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.20})));}}
      const edgePts=[[-w/2,-l/2],[w/2,-l/2],[w/2,l/2],[-w/2,l/2],[-w/2,-l/2]].map(([x,z])=>new T.Vector3(x,yAt(x,z)+.025,z));groups.dimensions.add(new T.Line(new T.BufferGeometry().setFromPoints(edgePts),new T.LineBasicMaterial({color:0x355d3c,linewidth:2})));
      if(has(p.soilType)){
        const soil=soilPalette(p.soilType),visual=soilVisualTone(p),depthRealM=has(p.soilDepth)&&numVal(p.soilDepth)>0?Math.min(3,numVal(p.soilDepth)/100):.6;
        const depthWorld=Math.max(.08,depthRealM)*viewScale;
        // Three visible soil horizons. All colors derive from the selected soil material.
        const base=new T.Color(visual.hex),mix=(factor)=>base.clone().lerp(new T.Color(factor<0?0x21190f:0xe4d6b8),Math.abs(factor));
        const layerDefs=[{f:.22,c:mix(-.12)},{f:.43,c:mix(.08)},{f:.35,c:mix(.28)}];let yBottom=0;
        layerDefs.forEach((layer,i)=>{const h=depthWorld*layer.f,geo=new T.PlaneGeometry(w,h,1,1),mat=new T.MeshBasicMaterial({color:layer.c,side:T.DoubleSide,toneMapped:false});const face=new T.Mesh(geo,mat);face.position.set(0,-yBottom-h/2,l/2+.038*viewScale);face.renderOrder=20+i;groups.soil.add(face);yBottom+=h;});
        const borderPoints=[[-w/2,0,l/2+.045*viewScale],[w/2,0,l/2+.045*viewScale],[w/2,-depthWorld,l/2+.045*viewScale],[-w/2,-depthWorld,l/2+.045*viewScale],[-w/2,0,l/2+.045*viewScale]].map(v=>new T.Vector3(...v));groups.soil.add(new T.Line(new T.BufferGeometry().setFromPoints(borderPoints),new T.LineBasicMaterial({color:soil.dark,toneMapped:false})));
        const lip=new T.Mesh(new T.BoxGeometry(w,.035*viewScale,.07*viewScale),new T.MeshBasicMaterial({color:soil.dark,toneMapped:false}));lip.position.set(0,.005,l/2+.05*viewScale);groups.soil.add(lip);
      }
      const addLine=(group,points,color=0x59745c,opacity=1)=>group.add(new T.Line(new T.BufferGeometry().setFromPoints(points.map(a=>new T.Vector3(...a))),new T.LineBasicMaterial({color,transparent:opacity<1,opacity})));
      addLine(groups.dimensions,[[-w/2,.03,-l/2-.32*viewScale],[w/2,.03,-l/2-.32*viewScale]],0x496a4d);addLine(groups.dimensions,[[-w/2-.32*viewScale,.03,-l/2],[-w/2-.32*viewScale,.03,l/2]],0x496a4d);
      const rowsMap=new Map();model.trees.forEach(t=>{if(!rowsMap.has(t.row))rowsMap.set(t.row,[]);rowsMap.get(t.row).push(t);});
      // Row beds / foot paths are placed from the same tree rows that drive the orchard layout.
      rowsMap.forEach(row=>{if(!row.length)return;const xs=row.map(t=>t.x),z=row.reduce((a,t)=>a+t.z,0)/row.length,minX=Math.min(...xs)-.42*viewScale,maxX=Math.max(...xs)+.42*viewScale;const curve=new T.CatmullRomCurve3([new T.Vector3(minX,yAt(minX,z)+.018,z),new T.Vector3((minX+maxX)/2,yAt((minX+maxX)/2,z)+.018,z),new T.Vector3(maxX,yAt(maxX,z)+.018,z)]);groups.rows.add(new T.Mesh(new T.TubeGeometry(curve,24,.025*viewScale,4,false),new T.MeshStandardMaterial({color:0xc9b78b,roughness:1})));});
      const n=model.trees.length;let pickListener=null;const pickables=[];let selectionRing=null;
      const flushInstances=(mesh)=>{mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox?.();mesh.computeBoundingSphere?.();};
      if(n>0){
        // Illustrative Arachis pintoi cover patches under the main canopy; toggleable as a scenario layer.
        model.trees.forEach((t,i)=>{const x=t.x*viewScale,z=t.z*viewScale,y=yAt(x,z),rad=Math.max(.24,Math.min(.62,treeInfo.crownWidth*.34))*viewScale;const patch=new T.Mesh(new T.CircleGeometry(rad,18),new T.MeshStandardMaterial({color:0x8fc58a,roughness:1,side:T.DoubleSide}));patch.rotation.x=-Math.PI/2;patch.position.set(x,y+.018*viewScale,z);patch.scale.set(1,Math.max(.7,rad/(Math.max(.1,rad)*1.25)),1);groups.cover.add(patch);for(let j=0;j<4;j++){const leaf=new T.Mesh(new T.SphereGeometry(.055*viewScale,6,5),new T.MeshStandardMaterial({color:0x5d9d58,roughness:1}));const a=j*Math.PI/2;leaf.position.set(x+Math.cos(a)*rad*.52,y+.034*viewScale,z+Math.sin(a)*rad*.52);leaf.scale.set(1,.32,1.65);groups.cover.add(leaf);}});
        const dummy=new T.Object3D(),trunkGeo=new T.CylinderGeometry(.035*viewScale,.075*viewScale,.5*treeInfo.height*viewScale,8),trunkMat=new T.MeshStandardMaterial({color:0x795137,roughness:.96}),trunks=new T.InstancedMesh(trunkGeo,trunkMat,n);trunks.castShadow=true;trunks.receiveShadow=true;trunks.userData.pickDivisor=1;
        model.trees.forEach((t,i)=>{const x=t.x*viewScale,z=t.z*viewScale,y=yAt(x,z),h=treeInfo.height*viewScale;dummy.position.set(x,y+h*.25,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,(i%9)*.16,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);});flushInstances(trunks);groups.plants.add(trunks);pickables.push(trunks);
        const cone=kind==='conifer',lobeLayout=kind==='conifer'?[
          {x:0,z:0,y:.59,rx:.55,ry:.34,rz:.55},{x:0,z:0,y:.76,rx:.42,ry:.29,rz:.42},{x:0,z:0,y:.91,rx:.29,ry:.25,rz:.29}
        ]:kind==='custard'?[{x:0,z:0,y:.70,rx:.37,ry:.20,rz:.36},{x:-.28,z:.04,y:.72,rx:.29,ry:.17,rz:.30},{x:.28,z:.05,y:.72,rx:.29,ry:.17,rz:.30},{x:0,z:-.25,y:.69,rx:.28,ry:.16,rz:.27},{x:0,z:.27,y:.68,rx:.27,ry:.16,rz:.27}]:kind==='citrus'?[{x:0,z:0,y:.69,rx:.33,ry:.27,rz:.33},{x:-.25,z:0,y:.73,rx:.28,ry:.23,rz:.28},{x:.25,z:0,y:.73,rx:.28,ry:.23,rz:.28},{x:0,z:-.24,y:.72,rx:.27,ry:.23,rz:.28},{x:0,z:.24,y:.72,rx:.27,ry:.23,rz:.28}]:[{x:0,z:0,y:.70,rx:.36,ry:.22,rz:.36},{x:-.23,z:0,y:.72,rx:.28,ry:.20,rz:.29},{x:.23,z:.04,y:.72,rx:.28,ry:.20,rz:.29},{x:0,z:.23,y:.69,rx:.28,ry:.19,rz:.28}];
        const lobeGeometry=cone?new T.ConeGeometry(1,1,10):new T.SphereGeometry(1,12,9),foliageColor=kind==='conifer'?0x326b40:kind==='citrus'?0x47884a:kind==='custard'?0x3e8244:0x4b8750,foliageMat=new T.MeshStandardMaterial({color:foliageColor,roughness:.95}),crowns=new T.InstancedMesh(lobeGeometry,foliageMat,n*lobeLayout.length);crowns.castShadow=true;crowns.receiveShadow=true;crowns.userData.pickDivisor=lobeLayout.length;
        const tint=new T.Color();model.trees.forEach((t,i)=>{const x=t.x*viewScale,z=t.z*viewScale,y=yAt(x,z),h=treeInfo.height*viewScale,cw=treeInfo.crownWidth*viewScale; lobeLayout.forEach((lobe,j)=>{if(cone){dummy.position.set(x,y+h*lobe.y,z);dummy.scale.set(cw*lobe.rx,h*lobe.ry,cw*lobe.rz);}else{dummy.position.set(x+cw*lobe.x,y+h*lobe.y,z+cw*lobe.z);dummy.scale.set(cw*lobe.rx,h*lobe.ry,cw*lobe.rz);}dummy.rotation.set(0,(i%7)*.12+(j%2)*.18,0);dummy.updateMatrix();const index=i*lobeLayout.length+j;crowns.setMatrixAt(index,dummy.matrix);const cs=canopyStress(),leafBase=cs.stress>=.72?0xa54f32:cs.stress>=.42?0xc3a144:foliageColor;tint.set(leafBase);tint.offsetHSL((i%5)*.004,0,(j%3)*.018);if(crowns.setColorAt)crowns.setColorAt(index,tint);});});flushInstances(crowns);groups.plants.add(crowns);pickables.push(crowns);
        const branchGeo=new T.CylinderGeometry(.012*viewScale,.026*viewScale,.28*treeInfo.height*viewScale,5),branchMat=new T.MeshStandardMaterial({color:0x79543a}),branches=new T.InstancedMesh(branchGeo,branchMat,n*2);branches.castShadow=true;branches.userData.pickDivisor=2;model.trees.forEach((t,i)=>{const x=t.x*viewScale,z=t.z*viewScale,y=yAt(x,z),h=treeInfo.height*viewScale;for(let j=0;j<2;j++){dummy.position.set(x+(j?-.10:.10)*viewScale,y+h*.46,z+(j?.08:-.08)*viewScale);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,j?-.85:.85);dummy.updateMatrix();branches.setMatrixAt(i*2+j,dummy.matrix);}});flushInstances(branches);groups.plants.add(branches);pickables.push(branches);
        if(fruiting&&!cone){const fruitCount=4,fruitGeo=new T.SphereGeometry(.07*viewScale,8,7),fruitMat=new T.MeshStandardMaterial({color:kind==='citrus'?0xf0a12f:0xb4c65a}),fruits=new T.InstancedMesh(fruitGeo,fruitMat,n*fruitCount);fruits.userData.pickDivisor=fruitCount;model.trees.forEach((t,i)=>{const x=t.x*viewScale,z=t.z*viewScale,y=yAt(x,z),h=treeInfo.height*viewScale,cw=treeInfo.crownWidth*viewScale;for(let j=0;j<fruitCount;j++){const a=j*Math.PI/2;dummy.position.set(x+Math.cos(a)*cw*.24,y+h*.73,z+Math.sin(a)*cw*.24);dummy.scale.set(1,1,1);dummy.updateMatrix();fruits.setMatrixAt(i*fruitCount+j,dummy.matrix);}});flushInstances(fruits);groups.plants.add(fruits);pickables.push(fruits);}
        {
          const labelStep=Math.max(1,Math.ceil(n/100));
          model.trees.forEach((t,i)=>{if((i+1)%labelStep!==0&&t.index!==state.selectedTree?.index)return;const c=document.createElement('canvas');c.width=96;c.height=96;const cx=c.getContext('2d');cx.fillStyle='#ffffff';cx.strokeStyle='#477451';cx.lineWidth=7;cx.beginPath();cx.arc(48,48,39,0,Math.PI*2);cx.fill();cx.stroke();cx.fillStyle='#315b3d';cx.font='bold 34px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(String(t.index),48,50);const tex=new T.CanvasTexture(c);tex.minFilter=T.LinearFilter;const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.position.set(t.x*viewScale,yAt(t.x*viewScale,t.z*viewScale)+treeInfo.height*viewScale*1.22,t.z*viewScale);sprite.scale.set(.48*viewScale,.48*viewScale,1);groups.labels.add(sprite);});
        }
        selectionRing=new T.Mesh(new T.RingGeometry(.62*viewScale,.76*viewScale,32),new T.MeshBasicMaterial({color:0xe5a33b,side:T.DoubleSide,transparent:true,opacity:.95}));selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;scene.add(selectionRing);
        const raycaster=new T.Raycaster(),mouse=new T.Vector2();pickListener=e=>{const rect=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(pickables,false).find(h=>h.instanceId!==undefined);if(!hit)return;const divisor=hit.object.userData.pickDivisor||1,idx=Math.floor(hit.instanceId/divisor),tree=model.trees[idx];if(!tree)return;state.selectedTree=tree;selectionRing.position.set(tree.x*viewScale,yAt(tree.x*viewScale,tree.z*viewScale)+.04*viewScale,tree.z*viewScale);selectionRing.visible=true;setSelectedTree(tree,model);};renderer.domElement.addEventListener('click',pickListener);
        if(state.selectedTree&&model.trees[state.selectedTree.index-1]){const t=model.trees[state.selectedTree.index-1];state.selectedTree=t;selectionRing.position.set(t.x*viewScale,yAt(t.x*viewScale,t.z*viewScale)+.04*viewScale,t.z*viewScale);selectionRing.visible=true;setSelectedTree(t,model);}
      }
      if(has(p.irrigationMethod)){
        const isDrip=/nhỏ giọt|drip/i.test(String(p.irrigationMethod)),rowsToDraw=[...rowsMap.entries()];
        rowsToDraw.forEach(([rowId,row])=>{const xs=row.map(t=>t.x*viewScale),z=row.reduce((sum,t)=>sum+t.z*viewScale,0)/row.length,minX=Math.min(...xs)-.35*viewScale,maxX=Math.max(...xs)+.35*viewScale;const curve=new T.CatmullRomCurve3([new T.Vector3(minX,yAt(minX,z)+.05*viewScale,z),new T.Vector3((minX+maxX)/2,yAt((minX+maxX)/2,z)+.05*viewScale,z),new T.Vector3(maxX,yAt(maxX,z)+.05*viewScale,z)]);groups.irrigation.add(new T.Mesh(new T.TubeGeometry(curve,32,.018*viewScale,5,false),new T.MeshStandardMaterial({color:isDrip?0x2989bd:0x4a9ac0,roughness:.55})));if(isDrip)row.forEach(t=>{const dot=new T.Mesh(new T.SphereGeometry(.04*viewScale,7,6),new T.MeshStandardMaterial({color:0x43b8df,emissive:0x0b3344,emissiveIntensity:.16}));dot.position.set(t.x*viewScale,yAt(t.x*viewScale,t.z*viewScale)+.075*viewScale,t.z*viewScale);groups.irrigation.add(dot);});});
      }
      sceneLayerVisibility(groups);
      function setView(v){const d=Math.max(w,l)*1.3+8;controls.maxPolarAngle=Math.PI*.49;if(v==='top'){camera.position.set(0,d*1.45,.001);}else if(v==='low'){camera.position.set(w*.15,d*.34,l*1.35);}else if(v==='walk'){camera.position.set(0,Math.max(.8,treeInfo.height*.28)*viewScale,-l*.28);controls.target.set(0,treeInfo.height*.42*viewScale,l*.25);controls.update();return;}else{camera.position.set(w*.95,d*.88,l*1.1);}controls.target.set(0,0,0);controls.update();}
      setView(state.farmView||'orbit');let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
      const resizeScene=()=>{if(!mount.isConnected)return;const width=Math.max(1,mount.clientWidth),height=Math.max(1,mount.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);};
      const obs=window.ResizeObserver?new ResizeObserver(resizeScene):null;if(obs)obs.observe(mount);window.addEventListener('resize',resizeScene);
      window.__farm3d={setView,setLayer:(k,v)=>{if(groups[k])groups[k].visible=v;},cleanup(){cancelAnimationFrame(frame);if(obs)obs.disconnect();window.removeEventListener('resize',resizeScene);controls.dispose();if(pickListener)renderer.domElement.removeEventListener('click',pickListener);renderer.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){const arr=Array.isArray(o.material)?o.material:[o.material];arr.forEach(m=>{materials.add(m);if(m.map)m.map.dispose();});}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};threeCleanup=()=>{window.__farm3d?.cleanup?.();window.__farm3d=null;};
    }catch(err){console.warn('Three.js renderer fallback:',err);init3DFallback(mount,model);}
  }
  function setFarmView(v){state.farmView=v;window.__farm3d?.setView?.(v);$$('[data-farm-view]').forEach(b=>b.classList.toggle('active',b.dataset.farmView===v));}
  function setFarmMode(mode){state.farmMode=mode==='heatmap'?'heatmap':'simulation';$$('[data-farm-mode]').forEach(b=>b.classList.toggle('active',b.dataset.farmMode===state.farmMode));schedule3D();}
  function toggleFarmLayer(k){state.sceneLayers=state.sceneLayers||{};state.sceneLayers[k]=state.sceneLayers[k]===false;window.__farm3d?.setLayer?.(k,state.sceneLayers[k]);$$('[data-farm-layer]').forEach(b=>{const on=state.sceneLayers[b.dataset.farmLayer]!==false;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});}
  function exportProfile(){if(liveDemo.active){toast('Không xuất hồ sơ mẫu trong lúc Live Demo.');return;}const payload={exportedAt:new Date().toISOString(),location:state.location,profile:state.profile,rotation:state.rotation,notice:'Hồ sơ lưu trên trình duyệt. Dữ liệu mô hình và ước tính được ghi rõ nguồn.'};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='nasa-smart-farm-ho-so.json';a.click();URL.revokeObjectURL(url);toast('Đã xuất hồ sơ JSON.');}
  function sendAssistant(e){
    e.preventDefault();const input=$('#assistantInput'),q=input?.value.trim();if(!q)return;state.assistant.push({role:'user',text:q});const s=q.toLowerCase(),p=state.profile,c=state.weather?.current,d=state.weather?.daily,pl=latestPower(state.power),sm=nasaSoilSnapshot('root');let text='',sources=[];
    const hotDays=(d?.temperature_2m_max||[]).filter(v=>Number(v)>=34).length,rain3=(d?.precipitation_sum||[]).slice(0,3).reduce((a,v)=>a+Number(v||0),0),rain7=(d?.precipitation_sum||[]).slice(0,7).reduce((a,v)=>a+Number(v||0),0),eto7=(d?.et0_fao_evapotranspiration||[]).slice(0,7).reduce((a,v)=>a+Number(v||0),0);
    const condition=[`Vị trí: ${state.location?.address||'Chưa chọn'}`,`Thời tiết: ${c?`${fmt(c.temperature_2m,1)}°C · RH ${fmt(c.relative_humidity_2m,0)}%`:'Chưa có dữ liệu'} · Mưa 7 ngày ${d?fmt(rain7,1)+' mm':'—'} · ET₀ ${d?fmt(eto7,1)+' mm':'—'}`,`Độ ẩm đất: ${has(p.soilMoisture)?p.soilMoisture+'% (đo tại vườn)':'Chưa đo'} · SMAP ${sm?`${fmt(sm.value,1)}% · lưới ~9 km`:'—'}`,`Đất/địa hình: ${p.soilType||'chưa nhập'} · ${p.terrain||'chưa nhập'} · ${p.slope||'chưa nhập'}`,`Cây trồng: ${p.crop||'chưa nhập'}`].join('\n');
    if(/luân canh|xen canh|vụ sau|mùa sau|mùa tiếp theo|trồng cây gì tiếp|cây gì sau|đổi cây trồng/.test(s)){
      const plan=buildRotationPlan();
      text=rotationAssistantSummary(plan);
      sources=rotationSourceList(plan);
    }
    else if(/lập kế hoạch|kế hoạch tuần|lịch chăm sóc|kế hoạch mùa vụ|tổng hợp công việc|việc cần làm/.test(s)){
      const risk=getPestRisk(),soil=nasaSoilSnapshot('root'),missing=missingForAdvisor(),next=[];
      if(rain3>=5)next.push('Theo dõi lượng mưa thực nhận trong 3 ngày đầu; sau mưa kiểm tra ẩm vùng rễ rồi mới điều chỉnh lịch tưới.');
      else next.push('Kiểm tra độ ẩm đất vùng rễ trước khi tưới.');
      if(hotDays>=3)next.push(`Dự báo có ${hotDays} ngày nóng ≥34°C: kiểm tra cây vào sáng sớm/chiều mát, ưu tiên giữ lớp phủ hiện có và tránh tác động mạnh khi cây stress.`);
      if(risk.show)next.push('Thực hiện IPM: thăm vườn theo lô, định danh sâu/bệnh, ghi mật độ và thiên địch; chỉ can thiệp theo ngưỡng/khuyến cáo địa phương.');
      next.push('Ghi nhật ký tưới, mưa thực nhận, độ ẩm đất, hoạt động chăm sóc và tình trạng cây để lần đánh giá sau chính xác hơn.');
      text=`KẾ HOẠCH 7 NGÀY · ${has(p.crop)?p.crop:'Chưa chọn cây'}
${condition}

ƯU TIÊN THỰC HIỆN
${next.map((v,i)=>`${i+1}. ${v}`).join('\n')}

DỮ LIỆU ĐẤT
${soil?`SMAP vùng rễ: ${fmt(soil.value,1)}% thể tích · lưới khoảng 9 km.`:'Chưa có dữ liệu SMAP vùng rễ.'} ${missing.length?'Hồ sơ còn thiếu: '+missing.join(', ')+'.':''}

Cập nhật kế hoạch sau mưa hoặc khi thời tiết đổi.`;
      sources=[{name:'Open-Meteo Forecast API',href:state.weatherUrl||SRC.forecastDocs},{name:'NASA POWER Daily',href:powerUrl()},{name:'NASA SMAP L4 Hydrology',href:SRC.nasaHydrology},{name:'EPA – IPM principles',href:SRC.epaIPM}];
    }
    else if(/so sánh|đối chiếu|tóm tắt toàn bộ|báo cáo|đánh giá tổng thể|tổng hợp toàn bộ/.test(s)){
      const stress=canopyStress(),ranked=rankCrops(state.goal||p.purpose||'mixed').slice(0,3),risk=getPestRisk(),imp=impactResults();
      text=`BÁO CÁO TỔNG HỢP KHU VƯỜN
${condition}

1. THỜI TIẾT: ${c?`Nhiệt độ ${fmt(c.temperature_2m,1)}°C, RH ${fmt(c.relative_humidity_2m,0)}%.`:'Chưa có thời tiết hiện tại.'} ${hotDays>=3?`Có ${hotDays} ngày nóng ≥34°C trong dự báo.`:'Chưa có đợt nóng kéo dài trong dự báo.'}
2. NƯỚC: ${d?`Mưa 7 ngày ${fmt(rain7,1)} mm; ET₀ ${fmt(eto7,1)} mm.`:'Thiếu dự báo mưa/ET₀.'} ${has(p.soilMoisture)?`Độ ẩm đo tại vườn ${p.soilMoisture}%.`:'Chưa đo độ ẩm đất tại vườn.'}
3. STRESS TÁN: ${stress.score===null?'Chưa có dữ liệu':`${stress.score}/100 (${stress.confidence})`}; NDVI vệ tinh chưa được tích hợp.
4. CÂY TRỒNG: ${ranked.map((v,i)=>`${i+1}. ${v.name} (${v.score} điểm ưu tiên)`).join('; ')}. Điểm thể hiện thứ tự ưu tiên.
5. IPM: ${risk.show?'Tăng cường theo dõi sâu bệnh và thiên địch theo lô.':'Chưa có cảnh báo nhiệt–na.'}
6. TÁC ĐỘNG: ${imp.waterSaved===null?'Thiếu diện tích hoặc dự báo để tính nước':fmt(imp.waterSaved,0)+' L/7 ngày theo kịch bản'}; ${imp.nFixed===null?'Chưa nhập diện tích để tính N':'N cố định kịch bản '+fmt(imp.nFixed,1)+' kg'}; ${imp.avoided===null?'Chưa nhập số lần phun nền':'ước tính tránh '+fmt(imp.avoided,1)+' lần phun theo nghiên cứu IPM'}.

Việc tiếp theo: cập nhật số đo đất, ghi lượng mưa thực nhận và xem lịch trồng địa phương.`;
      sources=[{name:'Open-Meteo Forecast API',href:state.weatherUrl||SRC.forecastDocs},{name:'NASA POWER Daily',href:powerUrl()},{name:'NASA SMAP L4',href:SRC.nasaHydrology},{name:'FAO GAEZ',href:SRC.gaez},{name:'IPM meta-analysis 2025',href:SRC.ipmMeta}];
    }
    else if(/thời tiết|nhiệt độ|độ ẩm không khí|mưa|gió|điều kiện|khí hậu/.test(s)){
      text=`TỔNG HỢP ĐIỀU KIỆN HIỆN CÓ\n${condition}\n\nTheo dõi: ${hotDays>=3?`${hotDays} ngày dự báo đạt ≥34°C.`:'Chưa có 3 ngày dự báo từ 34°C.'} ${rain3>=5?'Mưa 3 ngày đầu: kiểm tra đất sau mưa rồi điều chỉnh lịch tưới.':'Mưa 3 ngày đầu dưới 5 mm; kiểm tra đất vùng rễ trước khi tưới.'}\n\nThời tiết và SMAP là dữ liệu mô hình theo tọa độ/ô lưới.`;
      sources=[{name:'Open-Meteo Forecast API',href:state.weatherUrl||SRC.forecastDocs},{name:'NASA POWER Daily',href:powerUrl()},{name:'NASA SMAP L4 Hydrology',href:SRC.nasaHydrology}];
    }
    else if(/tưới|nước|thiếu nước|bao nhiêu nước|lượng nước/.test(s)){
      const x=impactResults();const hasForecast=!!x.f;text=`ĐÁNH GIÁ NƯỚC TƯỚI\n${hasForecast?`7 ngày tới: ET₀ ${fmt(x.f.eto,1)} mm; mưa ${fmt(x.f.rain,1)} mm; mưa hữu hiệu tham chiếu ${fmt(x.pe,1)} mm. Với Kc kịch bản ${fmt(x.kc,2)}, ETc tham chiếu = ET₀ × Kc = ${fmt(x.etc,1)} mm; thiếu hụt khí hậu tham chiếu khoảng ${fmt(x.deficit,1)} mm trước khi xét nước sẵn có trong đất.`:'Chưa có dự báo ET₀ và mưa 7 ngày.'}\n${has(p.soilMoisture)?`Độ ẩm đất đo tại vườn: ${p.soilMoisture}%.`:sm?`SMAP vùng rễ: ${fmt(sm.value,1)}% thể tích · lưới khoảng 9 km.`:'Độ ẩm đất: chưa đo.'}\n${rain3>=5?'Có mưa dự báo trong 3 ngày đầu. Kiểm tra đất sau mưa rồi cập nhật lịch tưới.':'Mưa dự báo 3 ngày đầu thấp. Kiểm tra độ ẩm vùng rễ trước khi tưới.'}\nĐể tính lít/gốc, cần diện tích tưới, giai đoạn cây, vùng rễ và hiệu suất hệ thống.`;
      sources=[{name:'FAO – Crop ET and irrigation water',href:SRC.faoWater},{name:'Open-Meteo ET₀ forecast',href:state.weatherUrl||SRC.forecastDocs},{name:'NASA SMAP L4',href:SRC.nasaHydrology}];
    }
    else if(/đạm|nitơ|nitrogen|phân hữu cơ|dinh dưỡng/.test(s)){
      const x=impactResults();text=`ĐÁNH GIÁ ĐẠM TỪ THẢM HỌ ĐẬU\nSinh khối khô kịch bản: ${fmt(x.biomass,2)} t/ha; hàm lượng N: ${fmt(x.nContent,2)}%; Ndfa giả định: ${fmt(x.ndfa,0)}%; diện tích ${x.area===null?'chưa nhập':fmt(x.area,3)+' ha'}; tỷ lệ phủ ${fmt(x.cover*100,0)}%.\nN cố định mô phỏng = sinh khối khô × 1.000 × %N × Ndfa × diện tích × tỷ lệ phủ = ${x.nFixed===null?'chưa tính do thiếu diện tích':fmt(x.nFixed,1)+' kg N trong kịch bản'}.\n\nKết quả là kịch bản tham khảo từ nghiên cứu Arachis pintoi tại vườn hồ tiêu ở Việt Nam. Muốn tính sát vườn, cần đo sinh khối và tỷ lệ Ndfa tại chỗ.`;
      sources=[{name:'WASI – Arachis pintoi tại Việt Nam',href:SRC.arachisVietnam},{name:'Nghiên cứu định lượng Arachis pintoi',href:SRC.arachisStudy}];
    }
    else if(/sâu|rệp|nhện|bệnh|thuốc|kháng thuốc|pesticide|ipm/.test(s)){
      const risk=getPestRisk(),x=impactResults();text=`ĐÁNH GIÁ DỊCH HẠI & IPM\n${risk.na?'Hồ sơ chọn cây na. ':''}${risk.hotDays?`Dự báo có ${risk.hotDays} ngày ≥34°C. `:''}Nắng nóng: kiểm tra cây theo lô. Ghi nhận sâu bệnh, mật độ và thiên địch trước khi xử lý.\n\nCỏ lạc dại: theo dõi cạnh tranh nước và ánh sáng. Tagetes: chỉ cân nhắc khi đã xác định tuyến trùng mục tiêu. Can thiệp theo ngưỡng IPM địa phương.\n\nSố lần phun nền: ${has(x.baselineSprays)?x.baselineSprays:'Chưa có nhật ký'}. Dư lượng thuốc cần phân tích mẫu.`;
      sources=[{name:'IPM threshold meta-analysis (2025)',href:SRC.ipmMeta},{name:'Push–Pull systematic review',href:SRC.pushPullReview},{name:'EPA – IPM principles',href:SRC.epaIPM}];
    }
    else if(/đất|ph|pH|địa hình|độ dốc|độ ẩm đất/.test(s)){
      const missing=missingForAdvisor(),x=canopyStress();text=`ĐÁNH GIÁ HỒ SƠ ĐẤT & ĐỊA HÌNH\n${condition}\n\nChỉ báo môi trường: ${x.score===null?'Chưa có dữ liệu':`${x.score}/100`}. ${missing.length?'Còn thiếu: '+missing.join(', ')+'.':''}\n\nRH2M là độ ẩm không khí. SMAP có lưới khoảng 9 km. pH và độ phì lấy từ kết quả phân tích đất.`;
      sources=[{name:'NASA POWER Hydrology / SMAP',href:SRC.nasaHydrology},{name:'SoilGrids',href:SRC.soilgrids}];
    }
    else if(/cây|trồng|đề xuất|na|luân canh|xen canh/.test(s)){
      const ranked=rankCrops(state.goal||p.purpose||'mixed').slice(0,3);const pest=getPestRisk();text=`ĐỀ XUẤT CANH TÁC\nMục tiêu hiện tại: ${GOAL_LABELS[state.goal||p.purpose||'mixed']}. Ba ứng viên đầu theo hồ sơ hiện có: ${ranked.map((x,i)=>`${i+1}) ${x.name} – ${x.score} điểm ưu tiên`).join('; ')}. Xếp hạng dựa trên mục tiêu và hồ sơ hiện tại.\n${pest.show?'Cảnh báo: tăng theo dõi dịch hại và stress nhiệt. ':'Chưa có cảnh báo nhiệt–na.'}Xem mục Đề xuất cây trồng để so sánh điều kiện và cây xen.`;
      sources=[{name:'FAO GAEZ',href:SRC.gaez},{name:'FAO ECOCROP',href:SRC.ecocrop}];
    }
    else if(/nasa|smap|power|vệ tinh|ndvi|landsat|dữ liệu/.test(s)){
      const smap=nasaSoilSnapshot('root'),plLatest=latestPower(state.power);text=`NGUỒN DỮ LIỆU ĐANG TÍCH HỢP\nNASA POWER khí tượng: ${plLatest?`bản ghi ${plLatest.date}, nhiệt ${fmt(plLatest.t2m,1)}°C, RH ${fmt(plLatest.rh,0)}%, mưa ${fmt(plLatest.rain,1)} mm.`:'chưa có dữ liệu.'}\nNASA SMAP L4: ${smap?`${fmt(smap.value,1)}% thể tích ở độ sâu ${smap.depth}, ngày ${smap.date}, lưới ~9 km.`:'chưa có dữ liệu SMAP.'}\nOpen-Meteo: ${c?`hiện tại ${fmt(c.temperature_2m,1)}°C; dự báo ET₀/mưa 7 ngày.`:'chưa có dự báo thời tiết.'}\n\nNDVI vệ tinh: chưa tích hợp. Chỉ báo trên mô hình 3D được tính từ thời tiết và độ ẩm đất.`;
      sources=[{name:'NASA POWER Daily API',href:powerUrl()},{name:'NASA POWER SMAP',href:SRC.nasaHydrology},{name:'Open-Meteo',href:state.weatherUrl||SRC.forecastDocs}];
    }
    else if(/tác động|impact|tiết kiệm|hiệu quả|bao nhiêu lít/.test(s)){
      const x=impactResults();text=`KẾT QUẢ KỊCH BẢN TÁC ĐỘNG\nNước tiết kiệm: ${x.waterSaved===null?'Chưa có dự báo ET₀/mưa':fmt(x.waterSaved,0)+' L/7 ngày'}.\nN cố định: ${x.nFixed===null?'Chưa nhập diện tích':fmt(x.nFixed,1)+' kg trong kịch bản'}; phụ thuộc sinh khối, %N và Ndfa giả định.\nThuốc: ${x.avoided===null?'Chưa nhập số lần phun nền':fmt(x.avoided,1)+' lần phun có thể tránh/vụ'}; dư lượng thuốc cần phân tích mẫu.\nXem bảng tính ở Tổng quan để điều chỉnh các giả định.`;
      sources=[{name:'FAO irrigation water needs',href:SRC.faoWater},{name:'IPM meta-analysis',href:SRC.ipmMeta},{name:'WASI Arachis pintoi',href:SRC.arachisVietnam}];
    }
    else {
      text=`Bạn có thể hỏi về thời tiết, lịch tưới, đất, cây trồng, luân canh/xen canh, IPM hoặc tình trạng khu vườn.\n\n${condition}`;
      sources=[{name:'Danh mục nguồn trong website',href:'#'}];
    }
    state.assistant.push({role:'assistant',text,sources});render();
  }

  function updateProfileCounters(){
    if(state.page!=='profile')return;
    const count=Object.entries(state.profile).filter(([key,value])=>key!=='notes'&&key!=='farmName'&&has(value)).length;
    const label=`${count} thông tin đã lưu`;
    const summary=$('#profileDataCount'),side=$('#profileSideCount');
    if(summary)summary.textContent=label;
    if(side)side.textContent=String(count);
    groups.forEach((group,index)=>{
      const node=$(`[data-profile-group-count="${index}"]`);
      if(node)node.textContent=`${group.fields.filter(field=>has(state.profile[field[0]])).length} / ${group.fields.length} đã nhập`;
    });
  }

  function demoClone(value){
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  }
  function demoIsCurrent(runId){return liveDemo.active&&liveDemo.runId===runId;}
  function demoSetStatus(message){
    liveDemo.status=message;
    const node=$('#liveTourStatus');if(node)node.textContent=message;
  }
  function demoUpdatePanel(){
    const panel=$('#liveTourPanel');if(!panel)return;
    panel.hidden=!liveDemo.active;
    panel.classList.toggle('is-compact',!!liveDemo.collapsed);
    const collapse=$('#liveTourCollapse');if(collapse){collapse.textContent=liveDemo.collapsed?'＋':'−';collapse.setAttribute('aria-label',liveDemo.collapsed?'Mở bảng điều khiển Live Demo':'Thu gọn bảng điều khiển Live Demo');collapse.title=collapse.getAttribute('aria-label');}
    const step=DEMO_STEPS[liveDemo.index];
    const count=$('#liveTourStepCount'),title=$('#liveTourStepTitle'),desc=$('#liveTourStepDescription'),bar=$('#liveTourProgressFill');
    if(count)count.textContent=liveDemo.index<0?'Chuẩn bị':liveDemo.index>=DEMO_STEPS.length?'Hoàn tất':`Bước ${liveDemo.index+1}/${DEMO_STEPS.length}`;
    if(title)title.textContent=liveDemo.index>=DEMO_STEPS.length?'Hoàn tất chuyến tham quan':step?.title||'Sẵn sàng trình diễn';
    if(desc)desc.textContent=liveDemo.index>=DEMO_STEPS.length?'Các phân hệ đã được giới thiệu. Đang phục hồi dữ liệu ban đầu.':step?.description||'Tự động nhập dữ liệu mẫu và chuyển thẳng đến từng phần thông tin chính.';
    if(bar)bar.style.width=`${Math.max(0,Math.min(100,((liveDemo.index+1)/DEMO_STEPS.length)*100))}%`;
    const pause=$('[data-demo-control="pause"]'),resume=$('[data-demo-control="resume"]');
    if(pause)pause.hidden=liveDemo.paused||!liveDemo.active;
    if(resume)resume.hidden=!liveDemo.paused||!liveDemo.active;
    const launch=$('#liveTourLaunch');if(launch){launch.textContent=liveDemo.active?(liveDemo.paused?'▶ Tiếp tục':'Ⅱ Tạm dừng'):'▶ Live Demo';launch.setAttribute('aria-pressed',String(liveDemo.active&&!liveDemo.paused));}
    const autosave=$('#autosaveStatus');if(autosave)autosave.innerHTML='<i></i> '+(typeof siteLanguage!=='undefined'&&siteLanguage==='en'?'Auto-saved':'Lưu tự động');
    const exportButton=$('#exportTop');if(exportButton){exportButton.disabled=liveDemo.active;exportButton.title=liveDemo.active?'Không xuất hồ sơ mẫu trong Live Demo':'Xuất hồ sơ';}
    document.body.classList.toggle('live-tour-running',liveDemo.active);
  }
  function demoSleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  async function demoDelay(ms,runId){
    let remaining=Math.max(0,ms),last=Date.now();
    while(remaining>0&&demoIsCurrent(runId)){
      if(liveDemo.skipRequested)return false;
      if(liveDemo.paused){await demoSleep(120);last=Date.now();continue;}
      const now=Date.now();remaining-=now-last;last=now;
      await demoSleep(Math.min(140,Math.max(40,remaining)));
    }
    return demoIsCurrent(runId)&&!liveDemo.skipRequested;
  }
  async function demoCheckpoint(runId){
    while(demoIsCurrent(runId)&&liveDemo.paused&&!liveDemo.skipRequested)await demoSleep(120);
    return demoIsCurrent(runId)&&!liveDemo.skipRequested;
  }
  async function demoScroll(selector,runId,holdMs=1400){
    if(!await demoCheckpoint(runId))return false;
    const node=$(selector)||$('#content');
    if(node){
      try{
        const topbar=$('.topbar');
        const offset=(topbar?topbar.offsetHeight:66)+12;
        const rect=node.getBoundingClientRect();
        const targetTop=Math.max(0,rect.top+window.scrollY-offset);
        window.scrollTo({top:targetTop,behavior:'smooth'});
      }catch{}
    }
    return demoDelay(holdMs,runId);
  }
  async function demoScrollThroughPage(runId,{holdMs=DEMO_SCROLL_HOLD_MS,rootSelector='#content'}={}){
    if(!await demoCheckpoint(runId))return false;
    const root=$(rootSelector);if(!root)return false;
    const rect=root.getBoundingClientRect();
    const rootTop=rect.top+window.scrollY;
    const rootBottom=rootTop+Math.max(root.scrollHeight,root.offsetHeight);
    const maxTop=Math.max(0,rootBottom-window.innerHeight+36);
    const stride=Math.max(220,Math.round(window.innerHeight*.58));
    const positions=[0];
    for(let y=stride;y<maxTop;y+=stride)positions.push(y);
    if(maxTop>0&&positions[positions.length-1]!==maxTop)positions.push(maxTop);
    for(let i=0;i<positions.length;i++){
      if(!await demoCheckpoint(runId))return false;
      window.scrollTo({top:Math.max(0,rootTop+positions[i]-72),behavior:'smooth'});
      demoSetStatus(`Đang cuộn từ đầu đến cuối · phần ${i+1}/${positions.length}.`);
      if(!await demoDelay(holdMs,runId))return false;
    }
    // Keep the final viewport at the end of the actual content before changing sections.
    window.scrollTo({top:Math.max(0,rootBottom-window.innerHeight+28),behavior:'smooth'});
    return demoDelay(Math.max(holdMs,1200),runId);
  }
  async function demoWaitForEnvironment(runId,timeoutMs=42000){
    const deadline=Date.now()+timeoutMs;
    const pending=()=>state.loading||state.weatherLoading||state.powerLoading||state.soilPowerLoading||state.climateLoading;
    while(demoIsCurrent(runId)&&!liveDemo.skipRequested&&pending()&&Date.now()<deadline){
      if(!await demoCheckpoint(runId))return false;
      demoSetStatus('Đang chờ dữ liệu thời tiết và NASA tải xong…');
      await demoSleep(180);
    }
    if(!demoIsCurrent(runId)||liveDemo.skipRequested)return false;
    if(pending())demoSetStatus('Một số nguồn phản hồi chậm · đang hiển thị dữ liệu đã nhận được.');
    else demoSetStatus('Dữ liệu tại vị trí đã xác nhận đã tải xong.');
    render();
    return demoDelay(1100,runId);
  }
  async function demoConfirmMissingLocation(runId){
    if(state.location)return true;
    go('location');
    liveDemo.waitingForLocationConfirm=true;
    liveDemo.locationConfirmed=false;
    demoSetStatus('Chưa có vị trí đã xác nhận · đang xác định GPS. Sau đó hãy kiểm tra và bấm “Đúng, dùng vị trí này”.');
    // Reuse the browser permission request started directly from the Live Demo launch click.
    let gps=null,gpsSettled=!liveDemo.gpsPromise;
    if(liveDemo.gpsPromise){
      liveDemo.gpsPromise.then(value=>{gps=value;gpsSettled=true;}).catch(()=>{gpsSettled=true;});
      const gpsDeadline=Date.now()+12000;
      while(demoIsCurrent(runId)&&!liveDemo.skipRequested&&!liveDemo.locationConfirmed&&!gpsSettled&&Date.now()<gpsDeadline){
        await demoSleep(140);
      }
    }
    if(!demoIsCurrent(runId)||liveDemo.skipRequested){liveDemo.waitingForLocationConfirm=false;return false;}
    if(liveDemo.locationConfirmed&&state.location){
      liveDemo.waitingForLocationConfirm=false;
      await demoWaitForEnvironment(runId);
      return demoIsCurrent(runId)&&!liveDemo.skipRequested;
    }
    if(gps&&!state.location&&!state.locationCandidate){
      setLocationCandidate({...gps,label:'Vị trí GPS cần xác nhận',demoOnly:true});
    }
    if(state.locationCandidate){
      await demoScroll('.location-candidate',runId,1200);
      demoSetStatus('Hãy kiểm tra địa chỉ và sai số GPS, sau đó bấm “Đúng, dùng vị trí này” để tiếp tục.');
    }else{
      demoSetStatus('Chưa nhận được GPS · hãy bấm Lấy vị trí GPS, tìm địa danh hoặc nhập tọa độ; sau đó bấm xác nhận vị trí.');
      await demoScroll('.grid2',runId,1200);
    }
    // Wait for a human confirmation. The tour must not invent or silently accept a location.
    while(demoIsCurrent(runId)&&!liveDemo.locationConfirmed&&!liveDemo.skipRequested){
      await demoSleep(160);
    }
    liveDemo.waitingForLocationConfirm=false;
    if(!demoIsCurrent(runId)||liveDemo.skipRequested||!state.location)return false;
    demoSetStatus('Đã xác nhận vị trí · đang tải dữ liệu cho Tổng quan…');
    await demoWaitForEnvironment(runId);
    return demoIsCurrent(runId)&&!!state.location&&!liveDemo.skipRequested;
  }
  async function demoOverviewStep(runId){
    go('overview');
    window.scrollTo({top:0,behavior:'auto'});
    if(!state.location){
      demoSetStatus('Tổng quan chưa có vị trí vùng trồng · đang giới thiệu trạng thái này trước khi định vị.');
      if($('#content .empty')&&!await demoScroll('.empty',runId,1200))return false;
      if(!await demoDelay(500,runId))return false;
      demoSetStatus('Chuyển tới bước xác định vị trí và chờ bạn kiểm tra, xác nhận.');
      if(!await demoConfirmMissingLocation(runId))return false;
    }else{
      demoSetStatus('Đã có vị trí vùng trồng · chuyển thẳng đến các phần chính của Tổng quan.');
      if(state.loading||state.weatherLoading||state.powerLoading||state.soilPowerLoading||state.climateLoading){
        if(!await demoWaitForEnvironment(runId))return false;
      }
    }
    if(!demoIsCurrent(runId)||!state.location)return false;
    go('overview');
    /* demoScrollThroughPage */
    demoSetStatus('Tổng quan: Tình hình khu vực & dự báo 7 ngày…');
    if(!await demoScroll('#regionalConditionsHead',runId,2000))return false;
    if($('#satelliteIrrigationPanel')){
      demoSetStatus('Tổng quan: Nhập thông số mẫu & dự đoán lượng nước tưới mỗi ngày…');
      if(!await demoScroll('#satelliteIrrigationPanel',runId,1200))return false;
      liveDemo._lastScrolledGroup=$('#satelliteIrrigationPanel');
      if(!await demoTypeField('#satelliteIrrigationPanel [data-profile="area"]','2000',runId))return false;
      if(!await demoTypeField('#satelliteIrrigationPanel [data-profile="treeCount"]','80',runId))return false;
      if(!await demoTypeField('#satelliteIrrigationPanel [data-profile="crop"]','Na',runId))return false;
      if(!await demoDelay(1400,runId))return false;
    }
    if($('#impactSimPanel')){
      demoSetStatus('Tổng quan: Mô phỏng tác động theo điều kiện vườn…');
      if(!await demoScroll('#impactSimPanel',runId,1800))return false;
    }
    return true;
  }
  function resetLiveDemoWorkspace(){
    state.page='overview';
    state.profile={...blankProfile};
    state.rotation={...rotationDefaults};
    state.goal='mixed';
    state.assistant=[{role:'assistant',text:'Xin chào! Đây là hồ sơ minh họa mới của Live Demo. Hãy xem dữ liệu ví dụ được nhập theo từng bước.'}];
    state.selectedTree=null;
    state.profileOpenGroup=null;
    state.farmView='orbit';
    state.farmMode='simulation';
    state.heatmapMetric='root';
    state.sceneLayers={plants:true,cover:true,terrain:true,soil:true,irrigation:true,dimensions:true,rows:true,labels:true};
    state.impact={areaHa:'',coverPct:60,kc:0.85,efficiency:70,evapReduction:15,biomass:1.48,nContent:2.18,ndfa:60,baselineSprays:'',ipmAdoption:75};
  }
  function demoRequestGPS(){
    return new Promise(resolve=>{
      if(!navigator.geolocation){resolve(null);return;}
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;resolve(value);};
      try{
        navigator.geolocation.getCurrentPosition(pos=>finish({
          lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Vị trí GPS trong phiên trình diễn',address:'',
          accuracy:pos.coords.accuracy,source:'browser-gps',timestamp:new Date(pos.timestamp).toISOString(),demoOnly:true
        }),()=>finish(null),{enableHighAccuracy:true,timeout:11000,maximumAge:60000});
      }catch{finish(null);}
      setTimeout(()=>finish(null),11500);
    });
  }
  async function demoTypeField(selector,value,runId){
    const field=$(selector);if(!field||!await demoCheckpoint(runId))return false;
    try{
      const group=field.closest('.profile-accordion')||field.closest('.panel')||field;
      if(liveDemo._lastScrolledGroup!==group){
        liveDemo._lastScrolledGroup=group;
        const topbar=$('.topbar');
        const offset=(topbar?topbar.offsetHeight:66)+12;
        const rect=group.getBoundingClientRect();
        window.scrollTo({top:Math.max(0,rect.top+window.scrollY-offset),behavior:'smooth'});
        if(!await demoDelay(320,runId))return false;
      }
      field.focus({preventScroll:true});
    }catch{}
    const text=String(value);
    const numeric=field.tagName==='INPUT'&&field.type==='number';
    if(field.tagName==='SELECT'){
      field.value=text;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
      return demoDelay(DEMO_FIELD_PAUSE_MS,runId);
    }
    field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));
    const charDelay=numeric?DEMO_TYPE_NUMBER_MS:DEMO_TYPE_TEXT_MS;
    for(let i=0;i<text.length;i++){
      if(!await demoCheckpoint(runId))return false;
      field.value=text.slice(0,i+1);field.dispatchEvent(new Event('input',{bubbles:true}));
      if(!await demoDelay(charDelay,runId))return false;
    }
    field.dispatchEvent(new Event('change',{bubbles:true}));
    return demoDelay(DEMO_FIELD_PAUSE_MS,runId);
  }
  async function demoFillProfile(runId){
    state.profile={...blankProfile};
    liveDemo._lastScrolledGroup=null;
    go('profile');
    $$('.profile-accordion').forEach(group=>group.open=true);
    demoSetStatus('Đang nhập hồ sơ minh họa từng trường…');
    for(const [key,value] of Object.entries(DEMO_PROFILE)){
      if(!await demoTypeField(`[data-profile="${key}"]`,value,runId))return false;
    }
    demoSetStatus('Đã nhập xong hồ sơ minh họa.');
    return demoDelay(600,runId);
  }
  async function demoLocationStep(runId){
    if(!state.location){
      demoSetStatus('Chưa có vị trí đã xác nhận · phần dữ liệu môi trường sẽ được xem sau khi xác nhận vị trí.');
      return demoDelay(1400,runId);
    }
    go('location');
    demoSetStatus('Vị trí & môi trường: Bản đồ vị trí vùng trồng…');
    if(!await demoScroll('.grid2',runId,1600))return false;
    if($('#locationEnvHead')){
      demoSetStatus('Vị trí & môi trường: Dữ liệu môi trường tại điểm đã xác nhận…');
      if(!await demoScroll('#locationEnvHead',runId,2000))return false;
    }
    return true;
  }
  async function demoFarm3DStep(runId){
    go('farm3d');
    if(!await demoDelay(400,runId))return;
    if(!await demoCheckpoint(runId))return;
    demoSetStatus('Thiết kế vườn 3D: Mô phỏng vườn 3D và xem các góc nhìn…');
    if(!await demoScroll('.twin-visual-panel',runId,1000))return;
    setFarmMode('simulation');
    setFarmView('orbit');if(!await demoDelay(1100,runId))return;
    setFarmView('top');if(!await demoDelay(1100,runId))return;
    setFarmView('low');if(!await demoDelay(1100,runId))return;
    setFarmView('walk');if(!await demoDelay(1100,runId))return;
    setFarmView('orbit');if(!await demoDelay(900,runId))return;
    return true;
  }
  async function demoAdvisorStep(runId){
    /* demoScrollThroughPage */
    go('advisor');setAdvisorGoal('income');render();
    demoSetStatus('Đề xuất cây trồng: Mục tiêu canh tác & điều kiện khu vườn…');
    if(!await demoScroll('.page-title',runId,1500))return;
    if(!demoIsCurrent(runId))return;
    demoSetStatus('Đề xuất cây trồng: Phân tích SMART ADVISOR · IPM…');
    if(!await demoScroll('#smartAdvisorSection',runId,1800))return;
    if(!demoIsCurrent(runId))return;
    demoSetStatus('Đề xuất cây trồng: Đề xuất cây trồng phù hợp…');
    if(!await demoScroll('#suitableCropsHead',runId,2000))return;
    return true;
  }
  async function demoRotationStep(runId){
    /* demoScrollThroughPage demoScrollThroughPage */
    state.rotation={...rotationDefaults,currentCrop:'maize',currentCropOther:'',systemType:'annual',currentSeason:'autumn',nextSeason:'spring',mainGoal:'sustainable',intercropGoal:'cover',problem:'erosion',historyText:'2025/vụ xuân: đậu xanh\n2025/vụ thu: ngô\n2026/vụ xuân: đậu tương',notes:'Luân canh & xen canh tối ưu độ phì đất.'};
    go('rotation');
    demoSetStatus('Luân canh & xen canh: Đề xuất cây vụ tiếp theo…');
    if(!await demoScroll('#rotationResults',runId,1800))return;
    if(!demoIsCurrent(runId))return;
    state.rotation={...rotationDefaults,currentCrop:'perennial',currentCropOther:'',systemType:'perennial',currentSeason:'autumn',nextSeason:'spring',mainGoal:'sustainable',intercropGoal:'cover',problem:'erosion',historyText:'2024: thiết lập vườn na\n2025: vườn na giai đoạn kiến thiết\n2026: vườn na đang chăm sóc',notes:'Vườn cây lâu năm: giữ cây chính, kết hợp thảm che phủ.'};
    go('rotation');
    demoSetStatus('Luân canh & xen canh: Cây xen & cây phủ đất dưới tán…');
    if(!await demoScroll('.rotation-section',runId,1800))return;
    return true;
  }
  async function demoAssistantStep(runId){
    go('assistant');if(!await demoScroll('.chat-panel',runId,900))return;
    const input=$('#assistantInput');if(!input)return;
    const question='Hãy lập kế hoạch chăm sóc vườn na trong 7 ngày tới dựa trên dự báo thời tiết và dữ liệu đất hiện có.';
    demoSetStatus('Đang nhập câu hỏi vào trợ lý…');
    input.value='';input.focus({preventScroll:true});
    for(let i=0;i<question.length;i++){
      if(!await demoCheckpoint(runId))return;
      input.value=question.slice(0,i+1);
      if(!await demoDelay(38,runId))return;
    }
    if(!await demoCheckpoint(runId))return;
    const form=$('#assistantForm');form?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    demoSetStatus('Trợ lý thông minh: Xem kết quả phân tích & khuyến nghị…');
    await demoScroll('.chat-panel',runId,2400);
  }
    function restoreDemoSnapshot(){
    if(!liveDemo.snapshot)return;
    const snapshot=demoClone(liveDemo.snapshot);
    Object.keys(state).forEach(key=>delete state[key]);
    Object.assign(state,snapshot);
    if(state.updatedAt&&!(state.updatedAt instanceof Date))state.updatedAt=new Date(state.updatedAt);
    if(threeCleanup){try{threeCleanup();}catch{}threeCleanup=null;}
    liveDemo.snapshot=null;
  }
  function finishLiveDemo(message='Đã kết thúc Live Demo. Hồ sơ thật đã được khôi phục.'){
    liveDemo.runId++;liveDemo.active=false;liveDemo.starting=false;liveDemo.paused=false;liveDemo.skipRequested=false;liveDemo.waitingForLocationConfirm=false;liveDemo.locationConfirmed=false;
    restoreDemoSnapshot();
    state.page='overview';
    const panel=$('#liveTourPanel');if(panel)panel.hidden=true;
    document.body.classList.remove('live-tour-running');
    const launch=$('#liveTourLaunch');if(launch){launch.textContent='▶ Live Demo';launch.setAttribute('aria-pressed','false');}
    demoUpdatePanel();
    render();window.scrollTo({top:0,behavior:'smooth'});toast(message);
  }
  async function runLiveDemo(runId){
    for(let i=0;i<DEMO_STEPS.length;i++){
      if(!demoIsCurrent(runId))return;
      liveDemo.skipRequested=false;liveDemo.index=i;demoUpdatePanel();
      const step=DEMO_STEPS[i];
      demoSetStatus(`Đang mở mục ${i+1}/${DEMO_STEPS.length}: ${step.title}`);
      if(step.id==='overview'){
        await demoOverviewStep(runId);
      }else if(step.id==='location'){
        await demoLocationStep(runId);
      }else if(step.id==='profile'){
        await demoFillProfile(runId);
      }else if(step.id==='farm3d'){
        await demoFarm3DStep(runId);
      }else if(step.id==='advisor'){
        await demoAdvisorStep(runId);
      }else if(step.id==='rotation'){
        await demoRotationStep(runId);
      }else if(step.id==='plan'){
        /* rootSelector:'#content' */
        go('plan');
        demoSetStatus('Kế hoạch canh tác: Diễn biến 7 ngày…');
        if(!await demoScroll('#plan7DaySection',runId,1800))continue;
        if($('#satelliteIrrigationPanel')){
          demoSetStatus('Kế hoạch canh tác: Dự đoán lượng nước tưới mỗi ngày…');
          if(!await demoScroll('#satelliteIrrigationPanel',runId,1800))continue;
        }
        demoSetStatus('Kế hoạch canh tác: Kế hoạch canh tác & việc cần theo dõi…');
        if(!await demoScroll('#planActionHead',runId,2000))continue;
      }else if(step.id==='assistant'){
        await demoAssistantStep(runId);
      }else if(step.id==='sources'){
        go('sources');
        demoSetStatus('Nguồn dữ liệu & giấy phép: Danh mục nguồn vệ tinh NASA & đối tác…');
        if(!await demoScroll('#sourcesCatalogSection',runId,2000))continue;
      }
      if(!demoIsCurrent(runId))return;
      if(liveDemo.skipRequested)continue;
    }
    if(!demoIsCurrent(runId))return;
    liveDemo.index=DEMO_STEPS.length;demoUpdatePanel();demoSetStatus('Đã xem hết các phân hệ · đang khôi phục dữ liệu ban đầu…');
    await demoDelay(1200,runId);
    if(demoIsCurrent(runId))finishLiveDemo('Đã hoàn tất chuyến tham quan. Hồ sơ thật đã được khôi phục.');
  }
  async function startLiveDemo(reuseSnapshot=false){
    if(liveDemo.active){if(liveDemo.paused){liveDemo.paused=false;demoSetStatus('Đã tiếp tục trình diễn.');demoUpdatePanel();}else{liveDemo.paused=true;demoSetStatus('Đã tạm dừng · nhấn Tiếp tục để chạy tiếp.');demoUpdatePanel();}return;}
    if(liveDemo.starting)return;
    liveDemo.starting=true;
    const launch=$('#liveTourLaunch');if(launch)launch.textContent='Đang chuẩn bị…';
    try{
      // Request GPS directly from the launch click only when no confirmed farm location is available.
      liveDemo.gpsPromise=state.location?Promise.resolve(null):demoRequestGPS();
      if(!reuseSnapshot){
        const pending=()=>state.loading||state.weatherLoading||state.powerLoading||state.soilPowerLoading||state.climateLoading;
        if(pending()){
          toast('Đang chờ dữ liệu khởi tạo hoàn tất trước khi bắt đầu Live Demo.');
          const deadline=Date.now()+18000;
          while(pending()&&Date.now()<deadline)await demoSleep(150);
        }
        liveDemo.snapshot=demoClone(state);
      }
      // A new clean demo workspace is created on every launch and restart.
      liveDemo.active=true;
      resetLiveDemoWorkspace();
      if(threeCleanup){try{threeCleanup();}catch{}threeCleanup=null;}
      liveDemo.collapsed=true;liveDemo.paused=false;liveDemo.skipRequested=false;liveDemo.index=-1;liveDemo.startedAt=Date.now();
      const runId=++liveDemo.runId;
      demoUpdatePanel();demoSetStatus('Đang chuẩn bị dữ liệu minh họa…');
      runLiveDemo(runId).catch(error=>{if(demoIsCurrent(runId)){console.error('Live Demo error',error);finishLiveDemo('Live Demo đã dừng do lỗi. Hồ sơ thật đã được khôi phục.');}});
    }finally{
      liveDemo.starting=false;
      if(!liveDemo.active&&launch)launch.textContent='▶ Live Demo';
    }
  }
  function restartLiveDemo(){
    if(!liveDemo.snapshot)return;
    const snapshot=demoClone(liveDemo.snapshot);liveDemo.runId++;liveDemo.active=false;restoreDemoSnapshot();liveDemo.snapshot=snapshot;
    startLiveDemo(true);
  }
  function handleDemoControl(action){
    if(action==='start'){startLiveDemo();return;}
    if(!liveDemo.active)return;
    if(action==='pause'){liveDemo.paused=true;demoSetStatus('Đã tạm dừng · dữ liệu và hồ sơ mẫu đang được giữ trong phiên.');demoUpdatePanel();return;}
    if(action==='resume'){liveDemo.paused=false;demoSetStatus('Đã tiếp tục trình diễn.');demoUpdatePanel();return;}
    if(action==='next'){liveDemo.skipRequested=true;demoSetStatus('Đang chuyển sang nhiệm vụ tiếp theo…');return;}
    if(action==='restart'){restartLiveDemo();return;}
    if(action==='exit'){finishLiveDemo();}
  }

  function pauseDemoForManualAction(e){
    if(!liveDemo.active||!e.isTrusted||e.target.closest('#liveTourPanel,#liveTourLaunch,#siteLangToggle,[data-credit-lang]'))return;
    if(liveDemo.waitingForLocationConfirm&&state.page==='location'&&e.target.closest('#content'))return;
    liveDemo.paused=true;liveDemo.collapsed=false;demoSetStatus('Bạn vừa thao tác trực tiếp · Live Demo đã tạm dừng.');demoUpdatePanel();
  }
  function initEvents(){
    $('#nav').addEventListener('click',e=>{pauseDemoForManualAction(e);const b=e.target.closest('[data-page]');if(b)go(b.dataset.page);});
    $('#content').addEventListener('click',e=>{pauseDemoForManualAction(e);const creditButton=e.target.closest('[data-credit-lang]');if(creditButton){openMeteoCreditLanguage=creditButton.dataset.creditLang==='en'?'en':'vi';try{localStorage.setItem(CREDIT_LANG_KEY,JSON.stringify(openMeteoCreditLanguage));}catch{}render();return;}const placeButton=e.target.closest('[data-place-index]');if(placeButton){selectSearchPlace(Number(placeButton.dataset.placeIndex));return;}const heatMetric=e.target.closest('[data-heat-metric]');if(heatMetric){state.heatmapMetric=heatMetric.dataset.heatMetric;schedule3D();$$('[data-heat-metric]').forEach(b=>b.classList.toggle('active',b===heatMetric));return;}const mode=e.target.closest('[data-farm-mode]');if(mode){setFarmMode(mode.dataset.farmMode);return;}const v=e.target.closest('[data-farm-view]');if(v){setFarmView(v.dataset.farmView);return;}const layer=e.target.closest('[data-farm-layer]');if(layer){toggleFarmLayer(layer.dataset.farmLayer);return;}const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return;}const a=e.target.closest('[data-action]');if(a){action(a.dataset.action);return;}});
    $('#content').addEventListener('input',e=>{pauseDemoForManualAction(e);const impact=e.target.closest('[data-impact]');if(impact){state.impact[impact.dataset.impact]=impact.value;updateImpactCalculator();return;}const rotationField=e.target.closest('[data-rotation]');if(rotationField){state.rotation[rotationField.dataset.rotation]=rotationField.value;save();updateRotationResults();return;}const el=e.target.closest('[data-profile]');if(!el)return;state.profile[el.dataset.profile]=el.value;if(el.dataset.profile==='purpose'&&GOAL_LABELS[el.value])state.goal=el.value;save();const status=el.parentElement.querySelector('.field-status');if(status){status.textContent=el.value.trim()?'✓ Đã lưu':'';status.classList.toggle('saved',!!el.value.trim());}updateProfileCounters();if(state.page==='farm3d'){schedule3D();updateFarm3dDetails();const card=$('#canopyCardMount');if(card)card.innerHTML=canopyIndicatorHTML();}});
    $('#content').addEventListener('change',e=>{pauseDemoForManualAction(e);const impact=e.target.closest('[data-impact]');if(impact){state.impact[impact.dataset.impact]=impact.value;updateImpactCalculator();return;}const rotationField=e.target.closest('[data-rotation]');if(rotationField){state.rotation[rotationField.dataset.rotation]=rotationField.value;save();updateRotationResults();return;}const el=e.target.closest('[data-profile]');if(!el)return;state.profile[el.dataset.profile]=el.value;if(el.dataset.profile==='purpose'&&GOAL_LABELS[el.value])state.goal=el.value;save();const status=el.parentElement.querySelector('.field-status');if(status){status.textContent=el.value.trim()?'✓ Đã lưu':'';status.classList.toggle('saved',!!el.value.trim());}updateProfileCounters();if(state.page==='farm3d'){schedule3D();updateFarm3dDetails();const card=$('#canopyCardMount');if(card)card.innerHTML=canopyIndicatorHTML();}});
    $('#content').addEventListener('change',e=>{if(e.target.matches('input[name=\"goal\"]')){setAdvisorGoal(e.target.value);render();}});
    $('#content').addEventListener('submit',e=>{pauseDemoForManualAction(e);if(e.target.id==='placeForm')searchPlace(e);if(e.target.id==='assistantForm')sendAssistant(e);});
    $('#exportTop').addEventListener('click',exportProfile);
    $('#liveTourLaunch').addEventListener('click',()=>handleDemoControl(liveDemo.active?(liveDemo.paused?'resume':'pause'):'start'));
    $('#liveTourPanel').addEventListener('click',e=>{if(e.target.closest('#liveTourCollapse')){liveDemo.collapsed=!liveDemo.collapsed;demoUpdatePanel();return;}const control=e.target.closest('[data-demo-control]');if(control)handleDemoControl(control.dataset.demoControl);});
    $('#openNav').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobileOverlay').classList.add('show');});$('#closeNav').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');});$('#mobileOverlay').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');});
    document.querySelector('.footer').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)go(b.dataset.page);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoRefreshDue();});
  }
  window.NASA_SMART_FARM_DEBUG={computeFarmModel,rankCrops,soilPalette,normalizeSoilType,heatSamplesFromProfile,hasNonCollinearHeatPoints,setAdvisorGoal,impactResults,nasaSoilSnapshot,canopyStress,getPestRisk,validPowerValue,latestPower,latestPowerEntry,powerRadiationUnit,cropFamily,cropFamilyLabel,buildRotationPlan,runSelfTests,openMeteoAttribution,resetLiveDemoWorkspace};

  /* ==========================================================================
     SATELLITE DAILY IRRIGATION PREDICTOR (WITH MANUAL INPUTS & DEMO RESET)
     & FULL LOSSLESS BILINGUAL (VI / EN)
     ========================================================================== */
  function computeDailyIrrigationPlan(){
    const p=state.profile||blankProfile;
    const model=computeFarmModel(p);
    const d=state.weather?.daily;
    const c=state.weather?.current;
    const pl=latestPower(state.power);
    const smapRoot=nasaSoilSnapshot('root');
    const smapSurf=nasaSoilSnapshot('surface');

    const areaM2=model.valid&&model.area>0?model.area:(has(p.area)&&numVal(p.area)>0?numVal(p.area):(has(state.impact?.areaHa)?numVal(state.impact.areaHa)*10000:0));
    const treeCount=model.trees?.length>0?model.trees.length:(has(p.treeCount)&&numVal(p.treeCount)>0?Math.round(numVal(p.treeCount)):0);

    const cropStr=String(p.crop||'').toLowerCase();
    let kcBase=numVal(state.impact?.kc)||0.85;
    if(/na|mãng cầu/.test(cropStr))kcBase=0.85;
    else if(/quýt|cam|bưởi|chanh/.test(cropStr))kcBase=0.82;
    else if(/hồi|quế/.test(cropStr))kcBase=0.80;
    else if(/cà phê|chè/.test(cropStr))kcBase=0.95;
    else if(/chuối/.test(cropStr))kcBase=1.10;
    else if(/lúa/.test(cropStr))kcBase=1.15;
    else if(/ngô|bắp/.test(cropStr))kcBase=0.95;
    else if(/đậu|lạc/.test(cropStr))kcBase=0.80;
    else if(/sắn|thanh long/.test(cropStr))kcBase=0.68;

    const stageStr=String(p.growthStage||'').toLowerCase();
    const age=has(p.treeAge)?numVal(p.treeAge):null;
    let stageMult=1.0;
    if(/cây con|mới trồng|ươm/.test(stageStr)||(age!==null&&age<=1))stageMult=0.68;
    else if(/kiến thiết|phát triển/.test(stageStr))stageMult=0.88;
    else if(/ra hoa|đậu quả|nuôi quả|mang quả/.test(stageStr))stageMult=1.12;
    const kc=clamp(kcBase*stageMult,0.35,1.35);

    const tInfo=treeScaleInfo(p);
    const singleTreeRootArea=Math.PI*Math.pow(Math.max(0.9,tInfo.crownWidth*1.08)/2,2);
    let activeAreaRatio=1.0;
    if(areaM2>0&&treeCount>0){
      const canopyFraction=clamp((treeCount*singleTreeRootArea)/areaM2,0.15,0.95);
      activeAreaRatio=clamp(canopyFraction*1.15+0.12,0.28,1.0);
    }

    const coverFrac=clamp(Number(state.impact?.coverPct??60),0,100)/100;
    const evapRed=clamp(Number(state.impact?.evapReduction??15),0,60)/100;
    const coverSavingFactor=1-(coverFrac*evapRed*0.35);

    const slopeObj=parseSlopeInput(p.slope);
    const slopeRatio=slopeObj.valid?slopeObj.ratio:0;
    let effRainFactor=slopeRatio>0.20?0.52:slopeRatio>0.10?0.64:slopeRatio>0.03?0.74:0.82;
    if(p.drainage==='fast')effRainFactor-=0.06;
    if(p.drainage==='slow')effRainFactor+=0.05;
    effRainFactor=clamp(effRainFactor,0.40,0.90);

    const soilTargetMap={sandy:18,loam:28,mixed:27,alluvial:30,'red-yellow':32,clay:36};
    const targetMoisture=soilTargetMap[normalizeSoilType(p.soilType)]||28;

    const userSoilM=has(p.soilMoisture)?numVal(p.soilMoisture):null;
    let rootMoisture=userSoilM!==null?userSoilM:(smapRoot?.value??smapSurf?.value??null);
    let moistureSource=userSoilM!==null?'Số đo thực tế tại vườn':(smapRoot?'Vệ tinh NASA SMAP RZMC (0–100cm)':(smapSurf?'Vệ tinh NASA SMAP SFMC (0–5cm)':''));

    // Fallback satellite water-balance root moisture if SMAP L4 has latency for current date
    if(rootMoisture===null){
      const rhVal=Number(c?.relative_humidity_2m??pl?.rh??68);
      const rain0=Number(d?.precipitation_sum?.[0]??pl?.rain??0);
      const eto0=Number(d?.et0_fao_evapotranspiration?.[0]??3.0);
      rootMoisture=Number(clamp(targetMoisture*(0.76+0.0028*rhVal)+(rain0-eto0)*0.42,14,42).toFixed(1));
      moistureSource='Vệ tinh NASA POWER & Cân bằng ẩm FAO-56';
    }

    let soilMoistureAdjMm=0;
    if(rootMoisture!==null){
      const diff=targetMoisture-rootMoisture;
      soilMoistureAdjMm=clamp(diff*0.08,-1.5,1.6);
    }

    const irrStr=String(p.irrigationMethod||'').toLowerCase();
    let efficiency=clamp(Number(state.impact?.efficiency??75),30,98)/100;
    if(/nhỏ giọt|drip/.test(irrStr))efficiency=0.88;
    else if(/phun|sprinkler|béc/.test(irrStr))efficiency=0.76;
    else if(/thủ công|tay|rãnh|dí/.test(irrStr))efficiency=0.65;

    const days=[];
    const radFallbackEto=pl?.rad?pl.rad*0.408*0.85:3.8;
    const dayCount=d?.time?.length?Math.min(7,d.time.length):7;

    for(let i=0;i<dayCount;i++){
      const dateStr=d?.time?.[i]||'';
      const eto=Number.isFinite(Number(d?.et0_fao_evapotranspiration?.[i]))?Number(d.et0_fao_evapotranspiration[i]):radFallbackEto;
      const rain=Number.isFinite(Number(d?.precipitation_sum?.[i]))?Number(d.precipitation_sum[i]):(i===0&&pl?.rain?Number(pl.rain):0);
      const tMax=Number.isFinite(Number(d?.temperature_2m_max?.[i]))?Number(d.temperature_2m_max[i]):(c?.temperature_2m??pl?.t2m??28);

      const heatStressFactor=tMax>=35?1.12:tMax>=32?1.05:1.0;
      const etc=eto*kc*heatStressFactor*coverSavingFactor;
      const peff=rain*effRainFactor;
      const smapWeight=i===0?1.0:i===1?0.5:0.2;
      const netMm=Math.max(0,etc-peff+soilMoistureAdjMm*smapWeight);
      const grossMm=netMm/efficiency;

      const totalLiters=areaM2>0?Math.round(grossMm*areaM2*activeAreaRatio):null;
      const litersPerTree=(totalLiters!==null&&treeCount>0)?Number((totalLiters/treeCount).toFixed(1)):(treeCount>0?Number(((grossMm*singleTreeRootArea)/efficiency).toFixed(1)):null);

      days.push({index:i,date:dateStr,eto,kc,etc,rain,peff,netMm,grossMm,totalLiters,litersPerTree,tMax});
    }

    const todayPlan=days[0]||{totalLiters:null,litersPerTree:null,netMm:0,etc:0,peff:0,eto:0};
    const validTotals=days.map(x=>x.totalLiters).filter(v=>v!==null);
    const sum7DayLiters=validTotals.length?validTotals.reduce((a,b)=>a+b,0):null;
    const avgDailyLiters=sum7DayLiters!==null?Math.round(sum7DayLiters/days.length):null;
    const avgLitersPerTree=(avgDailyLiters!==null&&treeCount>0)?Number((avgDailyLiters/treeCount).toFixed(1)):todayPlan.litersPerTree;

    return {
      areaM2,treeCount,kc,efficiency:Math.round(efficiency*100),effRainPct:Math.round(effRainFactor*100),
      rootMoisture,moistureSource,
      today:todayPlan,avgDailyLiters,avgLitersPerTree,sum7DayLiters,days
    };
  }

  function dailyIrrigationTableHTML(ir){
    const hasAreaOrTrees=ir.areaM2>0||ir.treeCount>0;
    if(!hasAreaOrTrees||!ir.days.length)return '';
    return `<div class="table-scroll" style="margin-top:12px">
      <table class="forecast-table">
        <thead>
          <tr><th>Ngày</th><th>ET₀ (Vệ tinh/Mẫu)</th><th>ETc cây trồng</th><th>Mưa hữu hiệu (GPM/SRTM)</th><th>Cần tưới toàn vườn</th><th>Định mức / 1 cây</th></tr>
        </thead>
        <tbody>
          ${ir.days.map((d,i)=>`<tr>
            <td>${i===0?'Hôm nay':(d.date?new Date(d.date+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'}):`Ngày ${i+1}`)}</td>
            <td>${fmt(d.eto,1)} mm</td>
            <td>${fmt(d.etc,1)} mm</td>
            <td>${fmt(d.peff,1)} mm</td>
            <td><b>${d.totalLiters!==null?fmt(d.totalLiters,0)+' L/ngày':'—'}</b></td>
            <td><b>${d.litersPerTree!==null?fmt(d.litersPerTree,1)+' L/cây':'—'}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function renderDailyIrrigationPanel(){
    const ir=computeDailyIrrigationPlan();
    const p=state.profile||blankProfile;
    const soilOpts=[['','Tự động theo vùng'],['loam','Đất thịt'],['clay','Đất sét'],['sandy','Đất cát'],['alluvial','Đất phù sa'],['red-yellow','Đất feralit đỏ vàng'],['mixed','Đất pha']];
    return `<section class="panel impact-panel" id="satelliteIrrigationPanel">
      <div class="impact-head">
        <div>
          <span class="eyebrow">SATELLITE WATER BALANCE · NASA SMAP + POWER + GPM/ERA5 + SRTM + FAO-56</span>
          <h2>Dự đoán lượng nước tưới tự động mỗi ngày</h2>
          <p id="autoWaterHeaderDesc">Tính toán trực tiếp từ số liệu vệ tinh tại tọa độ (${state.location?`${state.location.lat.toFixed(4)}, ${state.location.lon.toFixed(4)}`:'chưa chọn'}), diện tích vườn (${ir.areaM2?fmt(ir.areaM2,0)+' m²':'chưa nhập'}), số cây (${ir.treeCount||'chưa nhập'}) và loại đất.</p>
        </div>
        <div class="irrigation-head-actions">
          <button type="button" class="btn outline small" data-action="reset-irrigation" title="Đặt lại thông số nhập thủ công">↻ Đặt lại</button>
          <span class="tag">TỰ ĐỘNG THEO NGÀY</span>
        </div>
      </div>
      <div class="impact-inputs">
        <label class="field"><span class="label">Diện tích vườn (m²)</span><input type="number" min="1" max="10000000" step="any" data-profile="area" value="${esc(p.area||'')}" placeholder="Ví dụ: 2000"></label>
        <label class="field"><span class="label">Số lượng cây</span><input type="number" min="1" max="2500" step="1" data-profile="treeCount" value="${esc(p.treeCount||'')}" placeholder="Ví dụ: 80"></label>
        <label class="field"><span class="label">Loại cây trồng</span><input type="text" data-profile="crop" value="${esc(p.crop||'')}" placeholder="Ví dụ: Na, Quýt, Hồi"></label>
        <label class="field"><span class="label">Loại đất</span><select data-profile="soilType">${soilOpts.map(([v,l])=>`<option value="${v}" ${p.soilType===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Phương pháp tưới</span><input type="text" data-profile="irrigationMethod" value="${esc(p.irrigationMethod||'')}" placeholder="Nhỏ giọt, phun, thủ công"></label>
        <label class="field"><span class="label">Độ ẩm đất đo thực tế (%)</span><input type="number" min="0" max="100" step="any" data-profile="soilMoisture" value="${esc(p.soilMoisture||'')}" placeholder="Trống = tự lấy vệ tinh"></label>
      </div>
      <div class="impact-results">
        <div>
          <small>CẦN TƯỚI HÔM NAY (TOÀN VƯỜN)</small>
          <b id="autoWaterToday">${ir.today.totalLiters!==null?`${fmt(ir.today.totalLiters,0)} L / ngày`:'Nhập diện tích vườn'}</b>
          <span id="autoWaterTodaySub">ET₀ ${fmt(ir.today.eto,1)} mm · Kc ${fmt(ir.kc,2)} · Mưa hữu hiệu ${fmt(ir.today.peff,1)} mm · Hiệu suất tưới ${ir.efficiency}%</span>
        </div>
        <div>
          <small>ĐỊNH MỨC TƯỚI 1 GỐC CÂY HÔM NAY</small>
          <b id="autoWaterPerTree">${ir.today.litersPerTree!==null?`${fmt(ir.today.litersPerTree,1)} L / cây / ngày`:'Nhập số lượng cây'}</b>
          <span id="autoWaterPerTreeSub">${ir.treeCount>0?`Tính cho ${ir.treeCount} cây (${esc(p.crop||'Cây trồng')})`:'Nhập số lượng cây ở trên để chia định mức mỗi gốc'}</span>
        </div>
        <div>
          <small>TRUNG BÌNH 7 NGÀY & ĐỘ ẨM VÙNG RỄ</small>
          <b id="autoWaterAvg7">${ir.avgDailyLiters!==null?`${fmt(ir.avgDailyLiters,0)} L / ngày`:(ir.rootMoisture!==null?`Ẩm rễ: ${fmt(ir.rootMoisture,1)}%`:'Chưa đủ dữ liệu')}</b>
          <span id="autoWaterAvg7Sub">Độ ẩm đất vùng rễ: ${ir.rootMoisture!==null?`${fmt(ir.rootMoisture,1)}% (${ir.moistureSource})`:'—'} · Tổng 7 ngày: ${ir.sum7DayLiters!==null?fmt(ir.sum7DayLiters,0)+' L':'—'}</span>
        </div>
      </div>
      <div id="autoWaterTableWrap">${dailyIrrigationTableHTML(ir)}</div>
      <div class="source-note" style="margin-top:10px">
        <i class="source-dot"></i>Nguồn tích hợp: NASA SMAP L4 (SFMC/RZMC) · NASA POWER (T2M, RH2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR) · GPM/IMERG & Open-Meteo ERA5 (ET₀, lượng mưa) · SRTM DEM (Độ dốc dòng chảy) · FAO-56 & FAO GAEZ (Hệ số Kc).
      </div>
    </section>`;
  }

  function updateDailyIrrigationPanel(){
    const panel=$('#satelliteIrrigationPanel');
    if(!panel)return;
    const ir=computeDailyIrrigationPlan();
    const p=state.profile||blankProfile;
    const desc=$('#autoWaterHeaderDesc');
    if(desc)desc.textContent=`Tính toán trực tiếp từ số liệu vệ tinh tại tọa độ (${state.location?`${state.location.lat.toFixed(4)}, ${state.location.lon.toFixed(4)}`:'chưa chọn'}), diện tích vườn (${ir.areaM2?fmt(ir.areaM2,0)+' m²':'chưa nhập'}), số cây (${ir.treeCount||'chưa nhập'}) và loại đất.`;
    const tToday=$('#autoWaterToday');
    if(tToday)tToday.textContent=ir.today.totalLiters!==null?`${fmt(ir.today.totalLiters,0)} L / ngày`:'Nhập diện tích vườn';
    const tTodaySub=$('#autoWaterTodaySub');
    if(tTodaySub)tTodaySub.textContent=`ET₀ ${fmt(ir.today.eto,1)} mm · Kc ${fmt(ir.kc,2)} · Mưa hữu hiệu ${fmt(ir.today.peff,1)} mm · Hiệu suất tưới ${ir.efficiency}%`;
    const tTree=$('#autoWaterPerTree');
    if(tTree)tTree.textContent=ir.today.litersPerTree!==null?`${fmt(ir.today.litersPerTree,1)} L / cây / ngày`:'Nhập số lượng cây';
    const tTreeSub=$('#autoWaterPerTreeSub');
    if(tTreeSub)tTreeSub.textContent=ir.treeCount>0?`Tính cho ${ir.treeCount} cây (${p.crop||'Cây trồng'})`:'Nhập số lượng cây ở trên để chia định mức mỗi gốc';
    const tAvg=$('#autoWaterAvg7');
    if(tAvg)tAvg.textContent=ir.avgDailyLiters!==null?`${fmt(ir.avgDailyLiters,0)} L / ngày`:(ir.rootMoisture!==null?`Ẩm rễ: ${fmt(ir.rootMoisture,1)}%`:'Chưa đủ dữ liệu');
    const tAvgSub=$('#autoWaterAvg7Sub');
    if(tAvgSub)tAvgSub.textContent=`Độ ẩm đất vùng rễ: ${ir.rootMoisture!==null?`${fmt(ir.rootMoisture,1)}% (${ir.moistureSource})`:'—'} · Tổng 7 ngày: ${ir.sum7DayLiters!==null?fmt(ir.sum7DayLiters,0)+' L':'—'}`;
    const tbl=$('#autoWaterTableWrap');
    if(tbl)tbl.innerHTML=dailyIrrigationTableHTML(ir);
    if(siteLanguage==='en')applyFullSiteLanguage('en');
  }

  let siteLanguage = safeRead(`${KEY}-site-lang`, 'vi') === 'en' ? 'en' : 'vi';
  const VI_EN_RAW = [
    ['CANH TÁC DỰA TRÊN DỮ LIỆU', 'DATA-DRIVEN AGRICULTURE'],
    ['KHÔNG GIAN LÀM VIỆC', 'WORKSPACE'],
    ['Nguồn dữ liệu mở', 'Open Data Sources'],
    ['Tự cập nhật theo lịch', 'Scheduled auto-update'],
    ['Số liệu mô hình và thời điểm cập nhật được hiển thị cạnh từng chỉ số.', 'Model values and update timestamps are displayed next to each metric.'],
    ['Thời tiết · đất · cây trồng · mùa vụ', 'Weather · Soil · Crops · Seasons'],
    ['Danh mục nguồn', 'Source Catalog'],
    ['Tổng quan', 'Overview'],
    ['Vị trí & môi trường', 'Location & Environment'],
    ['Hồ sơ canh tác', 'Farm Profile'],
    ['Thiết kế vườn 3D', '3D Garden Design'],
    ['Đề xuất cây trồng phù hợp', 'Suitable Crop Recommendations'],
    ['Đề xuất cây trồng', 'Crop Recommendation'],
    ['Luân canh & xen canh', 'Crop Rotation & Intercrop'],
    ['Kế hoạch canh tác & việc cần theo dõi', 'Farming Action Plan & Monitoring'],
    ['Kế hoạch canh tác', 'Farming Plan'],
    ['Kế hoạch tưới', 'Irrigation Plan'],
    ['Trợ lý thông minh', 'Smart Assistant'],
    ['Trợ lý đa nhiệm', 'Multi-task Smart Assistant'],
    ['Nguồn dữ liệu & giấy phép', 'Data Sources & Licenses'],
    ['Nguồn dữ liệu', 'Data Sources'],
    ['Lưu tự động', 'Auto-saved'],
    ['Tự động reset mỗi lần demo', 'Auto-resets every demo run'],
    ['Tham quan tuần tự toàn bộ website', 'Guided tour across main sections'],
    ['Sẵn sàng trình diễn', 'Ready for Live Demo'],
    ['Tự động nhập dữ liệu mẫu và căn tiêu đề ngay dưới thanh công cụ.', 'Automatically enters sample data and aligns headings right below the topbar.'],
    ['Tự động nhập dữ liệu mẫu và chuyển thẳng đến từng phần thông tin chính.', 'Automatically enters sample data and jumps directly to each key section.'],
    ['Các phân hệ đã được giới thiệu. Đang phục hồi dữ liệu ban đầu.', 'All modules have been showcased. Restoring initial data.'],
    ['Hoàn tất chuyến tham quan', 'Live Demo Completed'],
    ['Hoàn tất', 'Completed'],
    ['Chuẩn bị', 'Preparing'],
    ['Đang chuẩn bị…', 'Preparing…'],
    ['▶ Tiếp tục', '▶ Continue'],
    ['Ⅱ Tạm dừng', 'Ⅱ Pause'],
    ['Bước tiếp →', 'Next step →'],
    ['↻ Chạy lại', '↻ Restart'],
    ['↻ Đặt lại', '↻ Reset'],
    ['DỮ LIỆU KHU VƯỜN', 'GARDEN DATA'],
    ['Chào mừng đến với', 'Welcome to'],
    ['Xin chào,', 'Hello,'],
    ['người làm vườn', 'gardener'],
    ['Thời tiết, dữ liệu đất và kế hoạch canh tác tại vị trí đã chọn.', 'Weather, soil data, and farming plan at your selected location.'],
    ['Dữ liệu theo tọa độ · thời điểm cập nhật hiển thị cạnh từng chỉ số.', 'Coordinate-based data · update timestamps shown next to each metric.'],
    ['Điều kiện', 'Conditions'],
    ['quanh khu vườn', 'around your garden'],
    ['Chọn vị trí vùng trồng hoặc nhập thông tin khu vườn.', 'Select your planting location or enter your garden profile.'],
    ['◎ Xác định vị trí', '◎ Set Location'],
    ['Hoàn thiện hồ sơ →', 'Complete Profile →'],
    ['Xem dữ liệu môi trường', 'View Environmental Data'],
    ['Cập nhật hồ sơ →', 'Update Profile →'],
    ['Cập nhật hồ sơ vườn →', 'Update Farm Profile →'],
    ['Hồ sơ đã lưu', 'Saved Profile'],
    ['trường', 'fields'],
    ['✓ Tự lưu trên thiết bị', '✓ Auto-saved on device'],
    ['✓ Tự lưu', '✓ Auto-saved'],
    ['✓ Đã lưu', '✓ Saved'],
    ['TỰ LƯU', 'AUTO-SAVED'],
    ['Chưa chọn vị trí vùng trồng', 'No planting location selected'],
    ['Chọn GPS, tìm địa điểm hoặc nhập tọa độ để lấy dữ liệu thời tiết và NASA.', 'Use GPS, search a place, or enter coordinates to fetch weather and NASA data.'],
    ['Thiết lập vị trí →', 'Set Location →'],
    ['Thời điểm cập nhật dữ liệu', 'Data Update Timeline'],
    ['Thời điểm tải và ngày ghi nhận từ nguồn.', 'Fetch timestamp and source observation date.'],
    ['Tự cập nhật', 'Auto-updating'],
    ['Chưa chọn vị trí', 'No location selected'],
    ['Lần website nhận dữ liệu gần nhất', 'Last time website received data'],
    ['Lịch kiểm tra tự động', 'Automatic check schedule'],
    ['Open-Meteo · mỗi 60 phút', 'Open-Meteo · every 60 mins'],
    ['NASA POWER Daily · mỗi 24 giờ', 'NASA POWER Daily · every 24 hours'],
    ['NASA POWER Climatology · mỗi 30 ngày', 'NASA POWER Climatology · every 30 days'],
    ['Tự cập nhật khi website đang mở.', 'Auto-updates while website is open.'],
    ['Open-Meteo · thời tiết & dự báo', 'Open-Meteo · weather & forecast'],
    ['NASA POWER · khí tượng lịch sử', 'NASA POWER · historical meteorology'],
    ['NASA POWER · khí hậu nền dài hạn', 'NASA POWER · long-term climatology'],
    ['Đã nhận dữ liệu', 'Data received'],
    ['Đến chu kỳ kiểm tra', 'Check due'],
    ['Đang kiểm tra', 'Checking'],
    ['Chưa có dữ liệu', 'No data yet'],
    ['Website nhận dữ liệu', 'Website received data'],
    ['Mốc dữ liệu từ nguồn', 'Source data timestamp'],
    ['Kiểm tra tiếp theo', 'Next check'],
    ['Thử lại dự kiến', 'Expected retry'],
    ['Sau lần tải đầu tiên', 'After first fetch'],
    ['Dữ liệu mô hình tại tọa độ · giờ địa phương theo API', 'Coordinate model data · local time per API'],
    ['Dữ liệu khí tượng dạng lưới · thường trễ vài ngày', 'Gridded meteorology data · typically 2–3 days latency'],
    ['Chuỗi climatology nhiều tháng / năm đại diện', 'Multi-month / representative annual climatology series'],
    ['Mốc khí hậu dài hạn', 'Long-term climate baseline'],
    ['Giờ nhận dữ liệu là thời điểm website tải API. Mốc nguồn là thời gian của bản ghi do nhà cung cấp công bố.', 'Received time is when the website fetched the API. Source timestamp is the record time published by the provider.'],
    ['Tình hình khu vực', 'Regional Conditions'],
    ['Dữ liệu môi trường tại điểm tham chiếu đã xác nhận', 'Environmental data at the confirmed reference point'],
    ['Dữ liệu môi trường tại điểm đã xác nhận', 'Environmental data at confirmed location'],
    ['↻ Kiểm tra ngay', '↻ Check now'],
    ['↻ Cập nhật dự báo', '↻ Refresh forecast'],
    ['Nhiệt độ hiện tại', 'Current Temperature'],
    ['Nhiệt độ không khí', 'Air Temperature'],
    ['Mô hình thời tiết tại điểm tham chiếu', 'Weather model at reference point'],
    ['Dữ liệu mô hình tại tọa độ', 'Coordinate model data'],
    ['Độ ẩm không khí', 'Air Humidity'],
    ['Độ ẩm tương đối', 'Relative Humidity'],
    ['Độ ẩm không khí ở 2 m', 'Air relative humidity at 2 m'],
    ['Mưa hiện tại', 'Current Precipitation'],
    ['Giá trị mô hình hiện tại', 'Current model value'],
    ['Tốc độ gió', 'Wind Speed'],
    ['Gió 10 m', '10 m Wind Speed'],
    ['Biến khí tượng mô hình', 'Model meteorological variable'],
    ['Mở nguồn ↗', 'Open source ↗'],
    ['Nguồn ↗', 'Source ↗'],
    ['Dự báo 7 ngày', '7-Day Forecast'],
    ['Dự báo theo mô hình', 'Model forecast'],
    ['Hôm nay', 'Today'],
    ['dự báo mô hình', 'model forecast'],
    ['Dữ liệu NASA POWER gần nhất', 'Latest NASA POWER Data'],
    ['Chuỗi khí tượng lưới tại điểm đại diện', 'Gridded agroclimatology series at reference point'],
    ['Bản ghi mới nhất', 'Latest record'],
    ['Nhiệt độ trung bình 2 m', '2 m Mean Temperature'],
    ['Độ ẩm tương đối 2 m', '2 m Relative Humidity'],
    ['Mưa hiệu chỉnh', 'Corrected Precipitation'],
    ['Gió 2 m', '2 m Wind Speed'],
    ['Bức xạ sóng ngắn', 'Shortwave Radiation'],
    ['Nhiệt độ', 'Temperature'],
    ['Độ ẩm', 'Humidity'],
    ['Mưa', 'Precipitation'],
    ['Gió', 'Wind'],
    ['Truy vấn API NASA POWER dùng cho vị trí này', 'NASA POWER API query used for this location'],
    ['mở dữ liệu gốc', 'open raw data'],
    ['Dự đoán lượng nước tưới tự động mỗi ngày', 'Automated Daily Satellite Irrigation Predictor'],
    ['TỰ ĐỘNG THEO NGÀY', 'DAILY AUTO-CALC'],
    ['CẦN TƯỚI HÔM NAY (TOÀN VƯỜN)', 'TODAY IRRIGATION (WHOLE GARDEN)'],
    ['ĐỊNH MỨC TƯỚI 1 GỐC CÂY HÔM NAY', 'WATER PER TREE TODAY'],
    ['TRUNG BÌNH 7 NGÀY & ĐỘ ẨM VÙNG RỄ', '7-DAY AVERAGE & ROOT-ZONE MOISTURE'],
    ['Diện tích vườn (m²)', 'Garden Area (m²)'],
    ['Số lượng cây', 'Tree Count'],
    ['Loại cây trồng', 'Crop Type'],
    ['Độ ẩm đất đo thực tế (%)', 'Measured Soil Moisture (%)'],
    ['Tự động theo vùng', 'Auto by region'],
    ['Nhập diện tích vườn', 'Enter garden area'],
    ['Nhập số lượng cây', 'Enter tree count'],
    ['Nhập số lượng cây ở trên để chia định mức mỗi gốc', 'Enter tree count above to calculate water per tree'],
    ['Số đo thực tế tại vườn', 'On-farm sensor measurement'],
    ['Vệ tinh NASA SMAP RZMC (0–100cm)', 'NASA SMAP RZMC Satellite (0–100cm)'],
    ['Vệ tinh NASA SMAP SFMC (0–5cm)', 'NASA SMAP SFMC Satellite (0–5cm)'],
    ['Vệ tinh NASA POWER & Cân bằng ẩm FAO-56', 'NASA POWER Satellite & FAO-56 Balance'],
    ['Ngày', 'Date'],
    ['ET₀ (Vệ tinh/Mẫu)', 'ET₀ (Satellite/Model)'],
    ['ETc cây trồng', 'Crop ETc'],
    ['Mưa hữu hiệu (GPM/SRTM)', 'Effective Rain (GPM/SRTM)'],
    ['Cần tưới toàn vườn', 'Whole Garden Irrigation'],
    ['Định mức / 1 cây', 'Water / 1 Tree'],
    ['Mô phỏng tác động theo điều kiện vườn', 'Farm Condition Impact Simulator'],
    ['Điều chỉnh giả định để xem kết quả theo dữ liệu hiện có.', 'Adjust parameters to simulate outcomes from current data.'],
    ['MÔ PHỎNG', 'SIMULATION'],
    ['Diện tích (ha)', 'Area (ha)'],
    ['Độ che phủ cỏ lạc dại (%)', 'Arachis pintoi cover (%)'],
    ['Kc cây trồng (tham số)', 'Crop coefficient Kc'],
    ['Hiệu suất tưới (%)', 'Irrigation efficiency (%)'],
    ['Mưa hữu hiệu giả định (%)', 'Effective rainfall (%)'],
    ['Giảm bốc hơi đất trong vùng phủ (%)', 'Soil evaporation reduction (%)'],
    ['Sinh khối khô giả định (t/ha)', 'Dry biomass (t/ha)'],
    ['Hàm lượng N giả định (%)', 'N content (%)'],
    ['N từ khí quyển giả định – Ndfa (%)', 'Atmospheric N fixation – Ndfa (%)'],
    ['Số lần phun nền/vụ (tự nhập)', 'Baseline sprays/season'],
    ['Mức thực hiện IPM giả định (%)', 'IPM adoption level (%)'],
    ['NƯỚC TƯỚI CÓ THỂ TIẾT KIỆM', 'POTENTIAL WATER SAVED'],
    ['ĐẠM N KHÍ QUYỂN ƯỚC TÍNH', 'ESTIMATED FIXED NITROGEN'],
    ['SỐ LẦN PHUN CÓ THỂ TRÁNH', 'AVOIDED PESTICIDE SPRAYS'],
    ['Cách tính & nguồn tham khảo', 'Calculation Method & References'],
    ['Lối tắt', 'Quick Shortcuts'],
    ['Vườn 3D', '3D Garden'],
    ['Chọn vị trí vùng trồng', 'Select Planting Location'],
    ['GPS, tìm địa danh hoặc tọa độ thủ công', 'GPS, place search, or manual coordinates'],
    ['◎ Lấy vị trí GPS hiện tại', '◎ Get Current GPS Location'],
    ['Tìm địa điểm', 'Search Place'],
    ['⌕ Tìm', '⌕ Search'],
    ['Nhập tọa độ thủ công', 'Enter Manual Coordinates'],
    ['Kiểm tra', 'Check'],
    ['Bản đồ vị trí', 'Location Map'],
    ['Nhấn bản đồ để đặt ghim', 'Click map to place pin'],
    ['Nhấn bản đồ để chọn điểm tham chiếu', 'Click map to select reference point'],
    ['ĐIỂM THAM CHIẾU ĐANG ĐƯỢC SỬ DỤNG', 'ACTIVE CONFIRMED REFERENCE POINT'],
    ['VỊ TRÍ VỪA NHẬN ĐƯỢC', 'DETECTED CANDIDATE LOCATION'],
    ['✓ Đúng, dùng vị trí này', '✓ Confirm & Use This Location'],
    ['Chọn lại / Hủy', 'Reselect / Cancel'],
    ['Xóa', 'Clear'],
    ['Hồ sơ khu vườn', 'Farm Profile'],
    ['Nhập thông tin đang có. Hồ sơ tự lưu trên thiết bị.', 'Enter available information. Profile is auto-saved on device.'],
    ['⇩ Xuất hồ sơ', '⇩ Export Profile'],
    ['⇩ Tải bản sao hồ sơ', '⇩ Download Profile Backup'],
    ['Xóa hồ sơ trên thiết bị', 'Clear Profile on Device'],
    ['Hồ sơ của bạn', 'Your Profile'],
    ['Hồ sơ trình diễn', 'Demo Profile'],
    ['thông tin đã lưu', 'saved fields'],
    ['Thông tin khu vườn', 'Garden Information'],
    ['Cây trồng', 'Crops & Trees'],
    ['Đất canh tác', 'Cultivated Soil'],
    ['Địa hình', 'Topography & Terrain'],
    ['Nguồn nước & tưới tiêu', 'Water Source & Irrigation'],
    ['Mục tiêu & nguồn lực', 'Objectives & Resources'],
    ['Điểm đo cho bản đồ nhiệt', 'Soil Moisture Heatmap Points'],
    ['Thiết kế vườn', '3D Garden Designer'],
    ['Nhập diện tích và cây trồng để dựng mô hình ban đầu.', 'Enter area and crop type to build the 3D digital twin.'],
    ['Thông tin cơ bản', 'Basic Information'],
    ['Chỉ nhập điều bạn đã biết', 'Enter only what you know'],
    ['Tên khu vườn', 'Garden Name'],
    ['Diện tích (m²)', 'Area (m²)'],
    ['Kích thước khu đất', 'Parcel Dimensions'],
    ['Số cây và khoảng cách', 'Tree Count & Spacing'],
    ['Đặc điểm cây trồng', 'Crop Characteristics'],
    ['Đất, địa hình và tưới tiêu', 'Soil, Terrain & Irrigation'],
    ['Mở hồ sơ đầy đủ →', 'Open Full Profile →'],
    ['Vườn 3D của tôi', 'My 3D Garden'],
    ['◈ Mô phỏng', '◈ 3D Simulation'],
    ['▦ Bản đồ nhiệt', '▦ Moisture Heatmap'],
    ['Toàn cảnh', 'Orbit View'],
    ['Trên xuống', 'Top View'],
    ['Góc ngang', 'Low Angle'],
    ['Trong vườn', 'Walkthrough'],
    ['Lớp hiển thị trong mô hình', '3D Scene Layers'],
    ['Cây chính', 'Main Trees'],
    ['Thảm lạc dại', 'Cover Crop'],
    ['Lớp đất', 'Soil Slice'],
    ['Tưới', 'Irrigation'],
    ['Kích thước', 'Dimensions'],
    ['Hàng cây', 'Tree Rows'],
    ['Mã cây', 'Tree Labels'],
    ['Chỉ báo điều kiện tán cây', 'Canopy Condition Indicator'],
    ['Chọn một cây trong mô hình', 'Select a tree in the 3D model'],
    ['Xem thông số mô hình', 'View Model Parameters'],
    ['Xem toàn bộ dữ liệu đã dùng', 'View All Used Data'],
    ['Điều kiện môi trường tại vị trí đã chọn', 'Environmental Conditions at Selected Location'],
    ['Chọn mục tiêu để xem nhóm cây phù hợp với điều kiện khu vườn.', 'Select your farming objective to rank suitable crops for your garden.'],
    ['Mục tiêu canh tác', 'Farming Objective'],
    ['Thứ tự cây trồng thay đổi theo mục tiêu', 'Crop ranking adapts to your selected objective'],
    ['Tăng thu nhập', 'Maximize Income'],
    ['Phục vụ gia đình', 'Household Consumption'],
    ['Ưu tiên ít nước', 'Low-Water Priority'],
    ['Bền vững lâu dài', 'Long-Term Sustainability'],
    ['Kết hợp nhiều mục tiêu', 'Balanced Multi-Objective'],
    ['Điều kiện khu vườn', 'Garden Conditions'],
    ['Khí hậu NASA POWER', 'NASA POWER Climatology'],
    ['Theo dõi sâu hại & IPM', 'Smart Advisor · Pest & IPM Monitoring'],
    ['① Thảm phủ Cỏ lạc dại (Arachis pintoi)', '① Arachis pintoi Living Mulch Cover'],
    ['② Dải thử Cúc vạn thọ', '② Targeted Marigold (Tagetes) Strip'],
    ['③ Theo dõi IPM theo ngưỡng', '③ Threshold-based IPM Monitoring'],
    ['Lập kế hoạch luân canh & xen canh', 'Crop Rotation & Intercropping Planner'],
    ['Xem cây vụ sau, cây phủ đất và cây trồng xen theo lịch sử vườn.', 'Evaluate next-season crops, cover crops, and intercrops from farm history.'],
    ['Mở kế hoạch →', 'Open Planner →'],
    ['điểm ưu tiên', 'priority score'],
    ['Cơ sở xếp hạng', 'Ranking Methodology'],
    ['Chọn cây vụ gần nhất để xem phương án vụ tiếp theo và cây xen.', 'Select your recent crop to generate next-season rotation and intercrop plans.'],
    ['Mở hồ sơ vườn →', 'Open Farm Profile →'],
    ['Thông tin mùa vụ và lịch sử canh tác', 'Seasonal Information & Cropping History'],
    ['Thông tin mùa vụ và điều kiện dùng để đề xuất', 'Seasonal & Farm Context Used for Recommendations'],
    ['1. Cây hiện tại & lịch sử', '1. Current Crop & History'],
    ['2. Đề xuất cho vụ tiếp theo', '2. Next-Season Crop Recommendations'],
    ['3. Cây xen & cây phủ đất', '3. Intercrops & Cover Crops'],
    ['Tài liệu tham khảo', 'Scientific References'],
    ['Theo dõi thời tiết và điều chỉnh công việc chăm sóc.', 'Track 7-day weather progression and adjust daily farming tasks.'],
    ['Kiểm tra trước khi tưới', 'Pre-Irrigation Check'],
    ['Đối chiếu lượng mưa dự báo với độ ẩm đất tại vùng rễ. Sau mưa, kiểm tra đất trước lần tưới tiếp theo.', 'Compare forecast rainfall with root-zone moisture. After rain, check root zone before next irrigation.'],
    ['Diễn biến 7 ngày', '7-Day Weather & Water Progression'],
    ['Xác suất mưa', 'Rain Probability'],
    ['Các ngày có mưa hoặc nắng nóng trong dự báo.', 'Upcoming days with rain or heat alerts in the 7-day forecast.'],
    ['☂ Có mưa dự báo – kiểm tra lại lịch tưới', '☂ Rain Forecast – Adjust Irrigation Schedule'],
    ['◉ Ít mưa – kiểm tra đất vùng rễ', '◉ Low Rain – Check Root-Zone Soil Moisture'],
    ['Chờ lượng mưa thực nhận, sau đó kiểm tra độ ẩm đất vùng rễ.', 'Wait for actual rainfall accumulation, then verify root-zone moisture.'],
    ['Kiểm tra độ ẩm đất vùng rễ trước khi tưới.', 'Verify root-zone soil moisture before irrigating.'],
    ['Hỏi về thời tiết, tưới tiêu, đất, cây trồng và sâu bệnh.', 'Ask about weather, daily irrigation, soil, crops, and IPM pest control.'],
    ['Thời tiết · Đất · Cây trồng · Tưới · Sâu bệnh', 'Weather · Soil · Crops · Irrigation · IPM'],
    ['Gửi →', 'Send →'],
    ['Hỏi nhanh', 'Quick Prompts'],
    ['Kết hợp dự báo với quan sát tại vườn.', 'Combine satellite/model forecasts with on-farm observations.'],
    ['Nguồn API, tài liệu, thư viện và giấy phép của các thành phần đang dùng trong website.', 'APIs, satellite datasets, libraries, and open-source licenses used in this platform.'],
    ['Mở tài liệu / giấy phép ↗', 'Open documentation / license ↗'],
    ['Giấy phép và ghi công', 'Licenses & Attribution']
  ].sort((a, b) => b[0].length - a[0].length);

  function translateViToEnText(orig) {
    if (!orig || !orig.trim()) return orig;
    let t = orig;
    for (const [vi, en] of VI_EN_RAW) {
      if (t.includes(vi)) t = t.split(vi).join(en);
    }
    t = t.replace(/Bước\s+(\d+)\/(\d+)/g, 'Step $1/$2');
    t = t.replace(/Đang mở mục\s+(\d+)\/(\d+):/g, 'Opening section $1/$2:');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*mm mưa/g, '$1 mm rain');
    t = t.replace(/(\d+)\s+thông tin đã lưu/g, '$1 saved fields');
    t = t.replace(/(\d+)\s*\/\s*(\d+)\s*đã nhập/g, '$1 / $2 entered');
    t = t.replace(/(\d+)\s*mốc lịch sử/g, '$1 history records');
    t = t.replace(/xác suất mưa tối đa\s*(\d+)%/g, 'max rain probability $1%');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*L\s*\/\s*ngày/g, '$1 L / day');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*L\s*\/\s*cây\s*\/\s*ngày/g, '$1 L / tree / day');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*L\/ngày/g, '$1 L/day');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*L\/cây/g, '$1 L/tree');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*L\s*\/\s*7 ngày/g, '$1 L / 7 days');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*kg N\s*\/\s*kịch bản/g, '$1 kg N / scenario');
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*lần\s*\/\s*vụ/g, '$1 sprays / season');
    t = t.replace(/Tính cho\s+(\d+)\s+cây/g, 'Calculated for $1 trees');
    t = t.replace(/(\d+)\s+cây/g, '$1 trees');
    t = t.replace(/(\d+)\s+loại cây trong danh mục/g, '$1 crops in catalog');
    t = t.replace(/(\d+)\/(\d+)\s+yếu tố/g, '$1/$2 factors');
    t = t.replace(/(\d+)\s+phút trước/g, '$1 mins ago');
    t = t.replace(/(\d+)\s+giờ trước/g, '$1 hours ago');
    t = t.replace(/(\d+)\s+ngày trước/g, '$1 days ago');
    t = t.replace(/vừa nhận/g, 'just received');
    t = t.replace(/\bCN\b/g, 'Sun');
    t = t.replace(/Thứ\s*2|Th\s*2/g, 'Mon');
    t = t.replace(/Thứ\s*3|Th\s*3/g, 'Tue');
    t = t.replace(/Thứ\s*4|Th\s*4/g, 'Wed');
    t = t.replace(/Thứ\s*5|Th\s*5/g, 'Thu');
    t = t.replace(/Thứ\s*6|Th\s*6/g, 'Fri');
    t = t.replace(/Thứ\s*7|Th\s*7/g, 'Sat');
    return t;
  }

  let _isApplyingLang = false;
  function applyFullSiteLanguage(lang) {
    if (_isApplyingLang) return;
    _isApplyingLang = true;
    try {
      siteLanguage = lang === 'en' ? 'en' : 'vi';
      openMeteoCreditLanguage = siteLanguage;
      try {
        localStorage.setItem(`${KEY}-site-lang`, JSON.stringify(siteLanguage));
        localStorage.setItem(CREDIT_LANG_KEY, JSON.stringify(openMeteoCreditLanguage));
      } catch {}

      const btn = $('#siteLangToggle');
      if (btn) btn.textContent = siteLanguage === 'en' ? '🌐 EN / VI' : '🌐 VI / EN';

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const parentTag = node.parentElement?.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
        if (node.parentElement?.id === 'siteLangToggle') continue;
        const currentVal = node.nodeValue || '';
        if (node.__lastRendered !== currentVal) {
          node.__origVi = currentVal;
        }
        const baseVi = node.__origVi !== undefined ? node.__origVi : currentVal;
        const nextVal = siteLanguage === 'en' ? translateViToEnText(baseVi) : baseVi;
        if (node.nodeValue !== nextVal) {
          node.nodeValue = nextVal;
        }
        node.__lastRendered = node.nodeValue;
      }

      $$('[placeholder],[title]').forEach(el => {
        if (el.hasAttribute('placeholder')) {
          const curP = el.getAttribute('placeholder') || '';
          if (el.__lastPlaceholder !== curP) el.__origPlaceholder = curP;
          const nextP = siteLanguage === 'en' ? translateViToEnText(el.__origPlaceholder || curP) : (el.__origPlaceholder || curP);
          if (curP !== nextP) el.setAttribute('placeholder', nextP);
          el.__lastPlaceholder = nextP;
        }
      });
    } finally {
      _isApplyingLang = false;
    }
  }

  const _origRenderFn = render;
  render = function() {
    _origRenderFn();
    applyFullSiteLanguage(siteLanguage);
  };

  const _origDemoUpdatePanel = demoUpdatePanel;
  demoUpdatePanel = function() {
    _origDemoUpdatePanel();
    applyFullSiteLanguage(siteLanguage);
  };

  const _origDemoSetStatus = demoSetStatus;
  demoSetStatus = function(msg) {
    _origDemoSetStatus(msg);
    applyFullSiteLanguage(siteLanguage);
  };

  // Real-time update of Daily Irrigation Predictor whenever user types manually or demo types
  document.addEventListener('input', e => {
    if (e.target.closest('[data-profile],[data-impact]')) {
      updateDailyIrrigationPanel();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.closest('[data-profile],[data-impact]')) {
      updateDailyIrrigationPanel();
    }
  });

  document.addEventListener('click', e => {
    const langBtn = e.target.closest('#siteLangToggle');
    if (langBtn) {
      const nextLang = siteLanguage === 'vi' ? 'en' : 'vi';
      openMeteoCreditLanguage = nextLang;
      render();
      demoUpdatePanel();
      return;
    }
    const resetIrrBtn = e.target.closest('[data-action="reset-irrigation"]');
    if (resetIrrBtn) {
      ['area','treeCount','crop','soilType','irrigationMethod','soilMoisture'].forEach(k => { state.profile[k] = ''; });
      save();
      render();
      toast(siteLanguage === 'en' ? 'Irrigation parameters reset.' : 'Đã đặt lại thông số nước tưới.');
    }
  });

  initEvents();render();
  if(new URLSearchParams(location.search).has('selftest')){const report=runSelfTests();document.documentElement.dataset.selftest=report.every(x=>x.ok)?'pass':'fail';document.documentElement.dataset.selftestReport=JSON.stringify(report);}
  if(state.location)fetchData();startAutoRefresh();
})();
