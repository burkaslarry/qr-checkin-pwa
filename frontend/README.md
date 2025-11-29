# QR Check-In PWA (活動簽到系統)

這是一個適用於 BNI Anchor 及各類活動的 QR Code 簽到系統。支援訪客與內部會員簽到，並提供後台管理功能。

## 功能角色 (Roles)

系統分為三種主要角色操作介面：

1.  **外部訪客 (External Guest)**：自行掃描活動 QR Code -> 輸入姓名 -> 完成簽到。
2.  **內部會員 (Internal Member)**：自行掃描活動 QR Code -> 從清單選擇姓名 -> 完成簽到。
3.  **管理員 (Admin Console)**：產生活動 QR Code、手動協助簽到、即時監控簽到紀錄、匯出 Excel/CSV 報表。

---

## 使用手冊 (User Manual)

### 1. 管理員：活動前準備 (Pre-Event)

在活動開始前，管理員需要產生該次活動專用的 QR Code。

1.  開啟系統首頁，點選 **「Admin Console (管理員後台)」**。
2.  進入 **「QR Generator」** 分頁：
    *   **Event Name**: 輸入活動名稱 (例如：BNI Anchor 11月例會)。
    *   **Event Date**: 選擇活動日期。
    *   點擊 **「Generate QR Code」** 按鈕。
3.  系統會產生一個專屬的活動 QR Code。
    *   點擊 **「Download PNG」** 下載圖片。
    *   **操作建議**：將此 QR Code 列印出來放在簽到桌，或投射在現場大螢幕上，供參與者掃描。

### 2. 參與者：簽到流程 (Check-In Process)

當參與者到達現場時，請引導他們拿出手機開啟此網頁 App。

**🅰️ 外部訪客 (External Guest):**
1.  在首頁點選 **「External Guest」**。
2.  若瀏覽器詢問相機權限，請點選 **「允許 (Allow)」**。
3.  將手機鏡頭對準現場的 **活動 QR Code** 進行掃描。
4.  掃描成功後，畫面會顯示活動名稱，請在下方欄位輸入 **您的姓名**。
5.  點擊 **「Check In」** 完成簽到。

**🅱️ 內部會員 (Internal Member):**
1.  在首頁點選 **「Internal Member」**。
2.  若瀏覽器詢問相機權限，請點選 **「允許 (Allow)」**。
3.  將手機鏡頭對準現場的 **活動 QR Code** 進行掃描。
4.  掃描成功後，請從下拉選單中 **選擇您的名字** (系統已預先載入會員名單)。
5.  點擊 **「Check In」** 完成簽到。

### 3. 管理員：活動中監控與補登 (Monitoring)

**📊 即時監控 (Live Records):**
*   進入 Admin Console 的 **「Records」** 分頁。
*   此頁面會即時顯示已簽到的人員名單、時間與身分。
*   上方數據卡會即時更新：**Total (總人數)**、**Guests (訪客數)**、**Members (會員數)**。
*   *注意：若 Connection 顯示 Disconnected，請重新整理頁面。*

**✍️ 手動補登 (Manual Entry):**
若參與者無法掃描 QR Code 或沒有智慧型手機，管理員可協助手動簽到：
1.  進入 Admin Console 的 **「Manual Entry」** 分頁。
2.  輸入 **姓名**。
3.  若是訪客，請勾選 **「Is External Guest」**；若是會員則不需勾選。
4.  點擊 **「Add Record」**，資料會立即同步到紀錄中。

### 4. 管理員：活動後匯出 (Post-Event Export)

1.  活動結束後，進入 Admin Console 的 **「Export」** 分頁。
2.  點擊 **「Download CSV」**。
3.  系統將下載 `.csv` 檔案，您可以使用 Excel 或 Google Sheets 開啟查看完整的出席名單與簽到時間。

---

## 系統安裝與執行 (Installation)

### 本機執行 (Localhost)

若要在自己的電腦上執行伺服器：

1.  **安裝環境**：確認已安裝 Python 3.8+。
2.  **下載並執行**：
    開啟終端機 (Terminal) 並執行：
    ```bash
    chmod +x run.sh
    ./run.sh
    ```
    或者手動安裝依賴並執行：
    ```bash
    pip install -r requirements.txt
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
3.  **開啟系統**：開啟瀏覽器前往 `http://localhost:8000`

### 雲端部署 (Vercel)

本專案已配置 `vercel.json`，支援直接部署至 Vercel 平台。
- **Production URL**: (請填入您的 Vercel 網址)

## 技術架構 (Tech Stack)
- **Backend**: Python (FastAPI)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: In-memory storage (若重啟伺服器資料會重置，建議活動後立即匯出)
