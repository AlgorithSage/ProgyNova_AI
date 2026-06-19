# 📊 ProgyNova AI - React Dashboard Frontend

This directory contains the user interface for **ProgyNova AI**, built with **React**, **TypeScript**, **Vite**, **Recharts**, and custom styles. It offers a premium visual control dashboard for pharmacy and inventory demand analysis.

## 🌟 Key Features

* **CSV Data Ingest Interface**: Simple upload target for raw dataset payloads.
* **Forecast Visualizer**: Uses **Recharts** to plot historical demand alongside forecast points.
* **Stockout Alert Board**: Visual indicators (High/Normal risk) detailing current stock status, lead time, and recommended reorders.
* **Reorder Approval Queue**: Summary cards indicating how many items are flagged, total order items, and approval buttons.
* **SHAP Attributions Chart**: Explains forecasting decisions by charting feature attribution scores, showing the positive or negative impact of lags, seasonality, and other indicators.
* **Dynamic Dark/Light Mode**: Leverages CSS variables and `localStorage` to persist user theme choices.
* **Connection Status Monitor**: Regularly queries backend `/health` status and highlights backend connectivity warnings.

## 📂 Directory Layout

```
progynova-dashboard/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Brand logos/icons
│   ├── components/         # Modular dashboard cards and layouts
│   │   ├── alerts/         # Active stockout lists and table view
│   │   ├── explain/        # SHAP explainability charts
│   │   ├── forecast/       # Recharts time-series viewer
│   │   ├── layout/         # Header, Footer, and theme shells
│   │   ├── reorder/        # Summary metrics and order approvals
│   │   └── upload/         # CSV drop-zone component
│   │
│   ├── services/           # REST API fetch calls client
│   ├── types/              # TypeScript types and data models
│   ├── App.tsx             # Main dashboard controller
│   ├── index.css           # Premium vanilla CSS styling system
│   └── main.tsx            # React application mounting point
│
├── .env.development        # Development host setup configuration
├── vite.config.ts          # Vite build pack configuration
└── package.json            # Scripts and libraries configuration
```

## 🛠️ Quick Start

1. **Install dependencies:**
   Ensure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

2. **Configure API endpoint:**
   Edit `.env.development` if you are running the backend API on a custom address. By default, it expects the backend to run on port 8000:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Start the local dev server:**
   ```bash
   npm run dev
   ```
   Open the browser to the address printed in the console (typically `http://localhost:5173`).

4. **Build for production:**
   To build static distribution assets, run:
   ```bash
   npm run build
   ```
   The compiled bundle will be outputted to `dist/`.
