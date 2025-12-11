const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
// 讀取環境變數 PORT，若無則預設 3000
const PORT = process.env.PORT || 3000;
// 讀取環境變數 DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// 預設資料結構
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

// --- 資料存取層 (Data Access Layer) ---
let dbHandlers = {};

if (DATABASE_URL) {
    // 模式 A: 使用 PostgreSQL 資料庫 (Railway)
    console.log('偵測到 DATABASE_URL，使用 PostgreSQL 模式');
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Railway 通常需要 SSL
    });

    // 初始化資料庫表格
    const initDB = async () => {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS app_data (
                    id SERIAL PRIMARY KEY,
                    data JSONB NOT NULL
                );
            `);
            // 確保至少有一行資料 (ID=1)
            const res = await pool.query('SELECT * FROM app_data WHERE id = 1');
            if (res.rows.length === 0) {
                await pool.query('INSERT INTO app_data (id, data) VALUES (1, $1)', [JSON.stringify(defaultData)]);
                console.log('資料庫初始化完成：已插入預設資料');
            } else {
                console.log('資料庫連線成功：表格已存在');
            }
        } catch (err) {
            console.error('資料庫初始化失敗:', err);
        }
    };
    initDB();

    dbHandlers.getData = async () => {
        const res = await pool.query('SELECT data FROM app_data WHERE id = 1');
        return res.rows[0] ? res.rows[0].data : defaultData;
    };

    dbHandlers.saveData = async (newData) => {
        await pool.query('UPDATE app_data SET data = $1 WHERE id = 1', [JSON.stringify(newData)]);
    };

} else {
    // 模式 B: 使用本地檔案系統 (Local/Fallback)
    console.log('未偵測到 DATABASE_URL，使用本地檔案模式 (data.json)');
    
    const DATA_FILE = path.join(__dirname, 'data.json');

    // 確保資料檔案存在
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    }

    dbHandlers.getData = async () => {
        return new Promise((resolve, reject) => {
            fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                if (err) reject(err);
                else resolve(JSON.parse(data));
            });
        });
    };

    dbHandlers.saveData = async (newData) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };
}

// --- API Routes ---

app.get('/api/data', async (req, res) => {
    try {
        const data = await dbHandlers.getData();
        res.json(data);
    } catch (err) {
        console.error('讀取錯誤:', err);
        res.status(500).json({ error: '無法讀取資料' });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const newData = req.body;
        await dbHandlers.saveData(newData);
        res.json({ success: true, message: '資料已儲存' });
    } catch (err) {
        console.error('儲存錯誤:', err);
        res.status(500).json({ error: '無法儲存資料' });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在運行，Port: ${PORT}`);
});