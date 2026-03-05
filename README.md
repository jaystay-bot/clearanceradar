# ClearanceRadar 🎯

Real-time clearance deal alerts for Home Depot, Lowe's, and Walmart. Built for resellers.

## Tech Stack
- **Frontend**: React (Vercel)
- **Database**: Supabase
- **Auth + Payments**: Whop
- **Email**: Gmail (Nodemailer)
- **Push Notifications**: Firebase Cloud Messaging
- **Backend API**: Node.js + Express (Railway or Render)

---

## Setup Instructions

### 1. Supabase Setup
1. Go to your Supabase project dashboard
2. Click **SQL Editor**
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run**
5. All tables are now created

### 2. Frontend Environment Variables
Create a `.env` file in the root directory:
```
REACT_APP_SUPABASE_URL=https://qocrhbmjrezaquzywrdq.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hGCstojRxd3X_gbMrmqGYg_UD6yP
REACT_APP_WHOP_CLIENT_ID=YOUR_WHOP_CLIENT_ID
REACT_APP_WHOP_REDIRECT_URI=https://your-app.vercel.app/auth/callback
```

### 3. Whop App Setup
1. Go to whop.com/dashboard → Developer
2. Click **+ Create app**  
3. Name it ClearanceRadar
4. Set redirect URI to: `https://your-app.vercel.app/auth/callback`
5. Copy the Client ID and Client Secret to your backend `.env`

### 4. Backend Setup (Railway)
1. Go to railway.app and create a new project
2. Connect your GitHub repo
3. Set the root directory to `/api`
4. Add all environment variables from `api/.env`
5. Add your Firebase service account JSON values
6. Deploy

### 5. Set Whop Webhook
1. Go to Whop Developer settings
2. Add webhook URL: `https://your-api.railway.app/api/webhooks/whop`
3. Copy the webhook secret to your backend `.env`

### 6. Deploy Frontend to Vercel
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy

---

## Project Structure
```
clearanceradar/
├── src/                    # React frontend
│   ├── pages/             # App screens
│   ├── components/        # Reusable components
│   ├── lib/               # Supabase, Whop, Auth
│   └── styles/            # Global CSS
├── api/                   # Node.js backend
│   ├── routes/            # API endpoints
│   ├── scraper/           # Retailer scrapers
│   └── services/          # Email, alerts
├── supabase/
│   └── schema.sql         # Database schema
└── public/                # Static files
```

---

## Scraper Notes
The scrapers in `/api/scraper/` are starter implementations. Retailers change their APIs frequently. You may need to:
1. Inspect network requests on retailer websites using Chrome DevTools
2. Update the API endpoints and response parsing
3. Add proxy rotation if you get blocked at scale

Start by testing manually: `node api/scraper/scheduler.js`

---

## Adding Test Deals (Development)
Run this SQL in Supabase to add test data:
```sql
INSERT INTO deals (retailer, product_name, original_price, clearance_price, discount_percent, category, is_active)
VALUES 
  ('home_depot', 'DEWALT 20V MAX Drill Kit', 149.00, 59.00, 60, 'Tools & Hardware', true),
  ('lowes', 'Samsung 4.5 cu ft Washer', 799.00, 299.00, 63, 'Appliances', true),
  ('walmart', 'Black+Decker 20V Drill', 89.00, 29.00, 67, 'Tools & Hardware', true);
```

---

## Revenue Tracking
- Price: $19.99/month
- 100 users = $1,999/month
- 500 users = $9,995/month
- Infrastructure cost at 500 users: ~$40/month
- **Margin at 500 users: ~99.6%**
