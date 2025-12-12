const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// 🟢 設定 Port 與 Host (部署關鍵設定)
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// 檢查環境變數 (除錯用)
if (!process.env.DATABASE_URL) {
    console.error("⚠️  嚴重錯誤：未偵測到 DATABASE_URL 環境變數！");
    console.error("請確認 Railway 的 Variables 頁面中已正確設定 DATABASE_URL。");
}

// 🟢 建立 PostgreSQL 連線池 (Railway 修正版)
// 不手動拆解 URL，直接使用 connectionString
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Railway 必須要加這一行才能連線 SSL
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 預設資料結構 (當資料庫為空時使用)
const defaultData = {
    projectInfo: { startDate: '2025-12-22', supervisor: '', company: '腓利清潔服務有限公司' },
    schedule: [
        {
            day: 1, title: "第一天：衛生設施與高空清潔", focus: "洗手間高空清潔及高層實驗室",
            staffGroupA: "", staffGroupB: "", notes: "",
            morning: {
                title: "上午 (09:00 - 13:00)",
                tasks: [
                    { id: "d1-m-1", text: "全校 12 個洗手間清潔 (天花/喉管/氣窗)", completed: false, isHighLevel: true },
                    { id: "d1-m-2", text: "2 個更衣室清潔 (天花/喉管/氣窗)", completed: false, isHighLevel: true },
                    { id: "d1-m-3", text: "拆洗抽氣扇及風扇 (洗手間/更衣室)", completed: false, isHighLevel: true },
                ]
            },
            afternoon: {
                title: "下午 (14:00 - 18:00)",
                tasks: [
                    { id: "d1-a-1", text: "A組: 5/F 化學室、科學室 (含準備室)", completed: false },
                    { id: "d1-a-2", text: "B組: 4/F 生物室、物理室 (含準備室)", completed: false },
                    { id: "d1-a-3", text: "實驗室氣窗、風扇、拖地", completed: false },
                ]
            }
        },
        {
            day: 2, title: "第二天：高層課室與圖書館", focus: "4/F-5/F 課室及 3/F 大型特別室",
            staffGroupA: "", staffGroupB: "", notes: "",
            morning: { title: "上午 (09:00 - 13:00)", tasks: [{ id: "d2-m-1", text: "A組: 5/F 課室 (501-507，共7間)", completed: false }, { id: "d2-m-2", text: "B組: 4/F 課室 (401-406，共6間)", completed: false }, { id: "d2-m-3", text: "課室百葉簾、氣窗、風扇清潔", completed: false }] },
            afternoon: { title: "下午 (14:00 - 18:00)", tasks: [{ id: "d2-a-1", text: "3/F 圖書館書架除塵 (小心書籍)", completed: false }, { id: "d2-a-2", text: "3/F 地理室清潔", completed: false }, { id: "d2-a-3", text: "圖書館及地理室地板清潔", completed: false }] }
        },
        {
            day: 3, title: "第三天：中層課室與術科特別室", focus: "2/F-3/F 課室及家政區域",
            staffGroupA: "", staffGroupB: "", notes: "",
            morning: { title: "上午 (09:00 - 13:00)", tasks: [{ id: "d3-m-1", text: "A組: 3/F 課室 (301-306，共6間)", completed: false }, { id: "d3-m-2", text: "B組: 2/F 課室 (201-206，共6間)", completed: false }] },
            afternoon: { title: "下午 (14:00 - 18:00)", tasks: [{ id: "d3-a-1", text: "A組: 2/F 縫紉室 (除塵)", completed: false }, { id: "d3-a-2", text: "A組: 2/F 家政室 (去頑固污漬)", completed: false }, { id: "d3-a-3", text: "B組: 2/F 輔導室", completed: false }, { id: "d3-a-4", text: "B組: 1/F 音樂室", completed: false }] }
        },
        {
            day: 4, title: "第四天：低層設施與藝術/科技室", focus: "1/F 剩餘課室及 G/F 大型特別室",
            staffGroupA: "", staffGroupB: "", notes: "",
            morning: { title: "上午 (09:00 - 13:00)", tasks: [{ id: "d4-m-1", text: "A組: 1/F 視藝室", completed: false }, { id: "d4-m-2", text: "A組: 1/F 101室", completed: false }, { id: "d4-m-3", text: "B組: G/F 設計與科技室 (DT)", completed: false }, { id: "d4-m-4", text: "B組: G01室", completed: false }] },
            afternoon: { title: "下午 (14:00 - 18:00)", tasks: [{ id: "d4-a-1", text: "G/F 健身室 (地板消毒，避開器材)", completed: false }, { id: "d4-a-2", text: "SAC室 (玻璃窗清潔)", completed: false }] }
        },
        {
            day: 5, title: "第五天：行政區域與總結", focus: "教員室、校務處及總驗收",
            staffGroupA: "", staffGroupB: "", notes: "",
            morning: { title: "上午 (09:00 - 13:00)", tasks: [{ id: "d5-m-1", text: "4 間教員室清潔 (只清潔桌面空白處)", completed: false }, { id: "d5-m-2", text: "教員室地面及百葉簾", completed: false }, { id: "d5-m-3", text: "走廊及公用位置支援", completed: false }] },
            afternoon: { title: "下午 (14:00 - 18:00)", tasks: [{ id: "d5-a-1", text: "校務處清潔", completed: false }, { id: "d5-a-2", text: "會客室清潔", completed: false }, { id: "d5-a-3", text: "整理所有清潔工具", completed: false }, { id: "d5-a-4", text: "主管巡查總驗收 (燈盤/風扇/角落)", completed: false }, { id: "d5-a-5", text: "向校務處報備並提交證明書", completed: false }] }
        }
    ]
};

// --- 資料庫初始化邏輯 ---
const initDB = async () => {
    if (!process.env.DATABASE_URL) return;

    try {
        // 1. 建立表格 (如果不存在)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_data (
                id SERIAL PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        
        // 2. 檢查是否已有資料
        const res = await pool.query('SELECT * FROM app_data WHERE id = 1');
        
        // 3. 如果沒有資料，插入預設資料
        if (res.rows.length === 0) {
            await pool.query('INSERT INTO app_data (id, data) VALUES (1, $1)', [JSON.stringify(defaultData)]);
            console.log('✅ 資料庫初始化完成：已建立表格並插入預設資料');
        } else {
            console.log('✅ 資料庫連線成功：表格與資料已存在');
        }
    } catch (err) {
        console.error('❌ 資料庫初始化失敗:', err);
    }
};

// 啟動時執行初始化
initDB();

// --- API Routes ---

// 取得資料
app.get('/api/data', async (req, res) => {
    // 檢查資料庫設定
    if (!process.env.DATABASE_URL) {
        return res.json(defaultData); // Fallback: 回傳預設資料
    }

    try {
        const result = await pool.query('SELECT data FROM app_data WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.json(defaultData);
        }
    } catch (err) {
        console.error('資料庫讀取錯誤:', err);
        res.status(500).json({ error: '無法從資料庫讀取資料' });
    }
});

// 儲存資料
app.post('/api/data', async (req, res) => {
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: '伺服器錯誤：未設定資料庫連線字串 (DATABASE_URL)' });
    }

    try {
        const newData = req.body;
        // 更新 id=1 的該筆資料
        await pool.query('UPDATE app_data SET data = $1 WHERE id = 1', [JSON.stringify(newData)]);
        res.json({ success: true, message: '資料已儲存至資料庫' });
    } catch (err) {
        console.error('資料庫儲存錯誤:', err);
        res.status(500).json({ error: '無法儲存資料至資料庫' });
    }
});

// 🟢 啟動伺服器
app.listen(PORT, HOST, () => {
    console.log(`伺服器正在運行: http://${HOST}:${PORT}`);
});
