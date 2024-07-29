// 初始的旅遊數據
let visitedPlaces = [];

// 設置 SVG 畫布
const width = 800;
const height = 600;
const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// 定義地圖投影
const projection = d3.geoMercator()
    .center([121, 24])
    .scale(6000)
    .translate([width / 2, height / 2]);

// 創建一個 path 生成器
const path = d3.geoPath().projection(projection);

function initializeMap() {
    console.log("Initializing map...");
    d3.json("https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.topo.json")
        .then(function(taiwan) {
            console.log("Map data loaded successfully");
            // 將 TopoJSON 數據轉換為 GeoJSON
            const counties = topojson.feature(taiwan, taiwan.objects.layer1);

            // 繪製地圖
            svg.selectAll("path")
                .data(counties.features)
                .enter().append("path")
                .attr("d", path)
                .attr("fill", "#cccccc")  // 初始時所有縣市都是灰色
                .attr("stroke", "#ffffff")
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut);

            // 填充縣市選擇下拉選單（確保唯一性）
            const countySelect = document.getElementById('county-select');
            const uniqueCounties = new Set();
            counties.features.forEach(county => {
                uniqueCounties.add(county.properties.COUNTYNAME);
            });
            uniqueCounties.forEach(countyName => {
                const option = document.createElement('option');
                option.value = countyName;
                option.textContent = countyName;
                countySelect.appendChild(option);
            });

            console.log("Map initialized successfully");
            updateMap(); // 初始化後立即更新地圖
        })
        .catch(function(error) {
            console.error("Error loading or processing map data: ", error);
        });
}

// 檢查是否訪問過
function isVisited(countyName) {
    return visitedPlaces.some(place => place.name === countyName);
}

// 滑鼠懸停效果
function handleMouseOver(event, d) {
    d3.select(this).attr("fill", "yellow");
    
    const visitedPlace = visitedPlaces.find(place => place.name === d.properties.COUNTYNAME);
    let infoText = d.properties.COUNTYNAME;
    if (visitedPlace) {
        infoText += `<br>訪問日期：${visitedPlace.date}<br>描述：${visitedPlace.description}`;
    }

    d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .html(infoText);
}

// 滑鼠移出效果
function handleMouseOut() {
    d3.select(this).attr("fill", d => isVisited(d.properties.COUNTYNAME) ? "#ff7f00" : "#cccccc");
    d3.select(".tooltip").remove();
}

// 更新地圖
function updateMap() {
    console.log("Updating map...");
    svg.selectAll("path")
        .attr("fill", d => isVisited(d.properties.COUNTYNAME) ? "#ff7f00" : "#cccccc");
}

// 更新旅遊記錄列表
function updateRecordsList() {
    const recordsBody = document.getElementById('records-body');
    recordsBody.innerHTML = ''; // 清空現有的記錄

    visitedPlaces.forEach((place, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${place.name}</td>
            <td>${place.date}</td>
            <td>${place.description}</td>
            <td>${place.photos ? place.photos.map(photo => `<img src="${photo}" width="50" height="50">`).join('') : ''}</td>
            <td>
                <button onclick="editRecord(${index})">編輯</button>
                <button onclick="deleteRecord(${index})">刪除</button>
            </td>
        `;
        recordsBody.appendChild(row);
    });

    drawTimeline();
    updateStats();
    updateCharts();
}

// 編輯記錄
function editRecord(index) {
    const place = visitedPlaces[index];
    document.getElementById('county-select').value = place.name;
    document.getElementById('visit-date').value = place.date;
    document.getElementById('visit-description').value = place.description;
    
    // 移除舊記錄
    visitedPlaces.splice(index, 1);
    
    // 更新列表和地圖
    updateRecordsList();
    updateMap();
}

// 刪除記錄
function deleteRecord(index) {
    if (confirm('確定要刪除這條記錄嗎？')) {
        visitedPlaces.splice(index, 1);
        updateRecordsList();
        updateMap();
    }
}

// 繪製時間軸
function drawTimeline(places = visitedPlaces) {
    const margin = {top: 20, right: 20, bottom: 30, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // 清除現有的時間軸
    d3.select("#timeline").selectAll("*").remove();

    const svg = d3.select("#timeline")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 解析日期
    const parseDate = d3.timeParse("%Y-%m-%d");
    places.forEach(d => d.date = parseDate(d.date));

    // 設置 x 軸範圍
    const x = d3.scaleTime()
        .range([0, width])
        .domain(d3.extent(places, d => d.date));

    // 設置 y 軸（這裡我們不需要實際的 y 值，只是為了放置點）
    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, 1]);

    // 添加 x 軸
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // 添加點
    svg.selectAll(".dot")
        .data(places)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))
        .attr("cy", height / 2)
        .attr("r", 5)
        .style("fill", "#ff7f00")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`${d.name}<br>${d3.timeFormat("%Y-%m-%d")(d.date)}<br>${d.description}`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
            d3.select(".tooltip").remove();
        });
}

// 計算並更新統計信息
function updateStats(places = visitedPlaces) {
    // 計算已訪問的縣市數量（去重）
    const visitedCount = new Set(places.map(place => place.name)).size;
    
    // 總旅行次數
    const totalTrips = places.length;
    
    // 最常訪問的縣市
    const visitCounts = {};
    places.forEach(place => {
        visitCounts[place.name] = (visitCounts[place.name] || 0) + 1;
    });
    const mostVisited = Object.entries(visitCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['無', 0])[0];
    
    // 最近一次旅行
    const lastTrip = places.length > 0 
        ? new Date(Math.max(...places.map(place => new Date(place.date))))
        : '無';

    // 更新 DOM
    document.getElementById('visited-count').textContent = visitedCount;
    document.getElementById('total-trips').textContent = totalTrips;
    document.getElementById('most-visited').textContent = mostVisited;
    document.getElementById('last-trip').textContent = lastTrip instanceof Date 
        ? lastTrip.toISOString().split('T')[0] 
        : lastTrip;
}

// 搜索和篩選功能
function searchAndFilter(county, dateFrom, dateTo) {
    return visitedPlaces.filter(place => {
        const matchCounty = county ? place.name.includes(county) : true;
        const placeDate = new Date(place.date);
        const matchDateFrom = dateFrom ? placeDate >= new Date(dateFrom) : true;
        const matchDateTo = dateTo ? placeDate <= new Date(dateTo) : true;
        return matchCounty && matchDateFrom && matchDateTo;
    });
}

// 更新顯示篩選後的記錄
function updateFilteredRecords(filteredPlaces) {
    const recordsBody = document.getElementById('records-body');
    recordsBody.innerHTML = ''; // 清空現有的記錄

    filteredPlaces.forEach((place, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${place.name}</td>
            <td>${place.date}</td>
            <td>${place.description}</td>
            <td>${place.photos ? place.photos.map(photo => `<img src="${photo}" width="50" height="50">`).join('') : ''}</td>
            <td>
                <button onclick="editRecord(${visitedPlaces.indexOf(place)})">編輯</button>
                <button onclick="deleteRecord(${visitedPlaces.indexOf(place)})">刪除</button>
            </td>
        `;
        recordsBody.appendChild(row);
    });

    // 更新地圖
    svg.selectAll("path")
        .attr("fill", d => filteredPlaces.some(place => place.name === d.properties.COUNTYNAME) ? "#ff7f00" : "#cccccc");

    // 更新時間軸
    drawTimeline(filteredPlaces);

    // 更新統計信息
    updateStats(filteredPlaces);

    // 更新圖表
    updateCharts(filteredPlaces);
}

// 更新圖表
function updateCharts(places = visitedPlaces) {
    const ctx = document.getElementById('travel-frequency-chart').getContext('2d');
    
    // 計算每個月的旅行次數
    const monthlyFrequency = Array(12).fill(0);
    places.forEach(place => {
        const month = new Date(place.date).getMonth();
        monthlyFrequency[month]++;
    });

    // 創建或更新圖表
    if (window.frequencyChart) {
        window.frequencyChart.data.datasets[0].data = monthlyFrequency;
        window.frequencyChart.update();
    } else {
        window.frequencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                datasets: [{
                    label: '旅行次數',
                    data: monthlyFrequency,
                    backgroundColor: 'rgba(255, 127, 0, 0.5)',
                    borderColor: 'rgba(255, 127, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// 照片上傳處理
document.getElementById('photo-upload').addEventListener('change', function(e) {
    const files = e.target.files;
    const photosPreview = document.createElement('div');
    photosPreview.id = 'photos-preview';
    
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.width = 100;
            img.height = 100;
            photosPreview.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
    
    const existingPreview = document.getElementById('photos-preview');
    if (existingPreview) {
        existingPreview.replaceWith(photosPreview);
    } else {
        e.target.parentNode.insertBefore(photosPreview, e.target.nextSibling);
    }
});

// 處理表單提交
document.getElementById('add-record-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const newRecord = {
        name: document.getElementById('county-select').value,
        date: document.getElementById('visit-date').value,
        description: document.getElementById('visit-description').value,
        photos: Array.from(document.getElementById('photo-upload').files).map(file => URL.createObjectURL(file))
    };
    visitedPlaces.push(newRecord);
    updateMap();
    updateRecordsList();
    this.reset();
    const photosPreview = document.getElementById('photos-preview');
    if (photosPreview) photosPreview.remove();
    alert('新的旅遊記錄已添加！');
});

// 處理搜索表單提交
document.getElementById('search-filter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const county = document.getElementById('county-search').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const filteredPlaces = searchAndFilter(county, dateFrom, dateTo);
    updateFilteredRecords(filteredPlaces);
});

// 處理重置按鈕點擊
document.getElementById('reset-filter').addEventListener('click', function() {
    document.getElementById('search-filter-form').reset();
    updateFilteredRecords(visitedPlaces);
});

// 數據導出
document.getElementById('export-data').addEventListener('click', function() {
    const dataStr = JSON.stringify(visitedPlaces);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'travel_records.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
});

// 數據導入
document.getElementById('import-button').addEventListener('click', function() {
    const fileInput = document.getElementById('import-data');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                visitedPlaces = importedData;
                updateRecordsList();
                updateMap();
                alert('數據導入成功！');
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('導入失敗，請確保文件格式正確。');
            }
        };
        reader.readAsText(file);
    } else {
        alert('請選擇一個文件。');
    }
});

// 在頁面加載完成後初始化地圖
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, initializing map...");
    initializeMap();
});

console.log("Enhanced script loaded");
