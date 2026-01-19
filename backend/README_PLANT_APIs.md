# Plant Database APIs Configuration

This plant care app now supports multiple plant databases to provide comprehensive plant information with automatic fallback between sources.

## Supported Plant Data Sources

### 1. **Perenual API** (Primary - Most Comprehensive)
- **Coverage**: 10,000+ plant species with detailed care information
- **Features**: Watering schedules, sunlight requirements, images, care guides, pest susceptibility, flowering seasons
- **Free tier**: Available with API key
- **Get your key**: https://perenual.com/docs/api
- **Priority**: Checked first (most detailed data)

### 2. **Trefle API** (Secondary Fallback)
- **Coverage**: Large botanical database
- **Features**: Plant names, images, basic care information
- **Free tier**: Available with API key
- **Get your key**: https://trefle.io/
- **Priority**: Checked second if Perenual fails

### 3. **Wikipedia** (Last Resort Fallback)
- **Coverage**: Broad coverage for common and scientific plant names
- **Features**: Images, basic plant information
- **Free tier**: Yes (no API key needed)
- **Priority**: Checked last if both APIs fail or return no results

## Setup Instructions

### Step 1: Create Environment File

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env  # On Windows: type nul > .env
```

### Step 2: Add API Keys

Add the following to your `.env` file:

```env
# Required for authentication
JWT_SECRET=your-secret-key-here

# Plant Database APIs (Optional but recommended)
PERENUAL_API_KEY=your_perenual_api_key_here
TREFLE_API_KEY=your_trefle_api_key_here

# Optional - Claude AI for Plant Doctor feature
CLAUDE_API_KEY=your_claude_api_key_here
```

### Step 3: Get Your API Keys

#### Perenual API (Recommended)
1. Visit: https://perenual.com/docs/api
2. Sign up for a free account
3. Generate your API key from the dashboard
4. Add to `.env`: `PERENUAL_API_KEY=sk-xxxxx`

#### Trefle API (Optional Backup)
1. Visit: https://trefle.io/
2. Create an account
3. Request an API token
4. Add to `.env`: `TREFLE_API_KEY=your-token-here`

**Note**: Wikipedia scraping requires no API key and works automatically as a fallback.

## How the Search Works

The app uses an intelligent multi-source search strategy:

1. **Cache Check**: First checks local database for previously searched plants (instant results)
2. **Perenual API**: If not cached, queries Perenual for detailed plant data
3. **Trefle API**: If Perenual fails, tries Trefle API
4. **Wikipedia Scraping**: If both APIs fail, scrapes Wikipedia for basic info
5. **Caching**: All results are cached locally to minimize API calls and improve performance

## Search Features

### Perenual Results Include:
- Common and scientific names
- High-quality plant images
- Watering frequency and requirements
- Sunlight needs (full sun, partial shade, etc.)
- Care guides and growing information
- Pest susceptibility
- Flowering seasons
- Poisonous information

### Trefle Results Include:
- Common and scientific names
- Plant images
- Basic growth information

### Wikipedia Results Include:
- Plant names from article titles
- Wikipedia page images
- Links to full Wikipedia articles

## Testing Your Setup

1. Start the backend server:
```bash
cd backend
npm install
npm start
```

2. The console will show which API keys are configured
3. Try searching for a plant in the app
4. Check the server logs to see which data source was used:
   - "Found X results from Perenual"
   - "Found X results from Trefle"
   - "Found X results from Wikipedia"

## API Rate Limits

### Perenual
- Free tier: 300 requests per day
- Results are cached to minimize API usage

### Trefle
- Free tier: 120 requests per day per IP
- Results are cached to minimize API usage

### Wikipedia
- No API key required
- Reasonable rate limiting applies (should not be an issue for normal use)

## Troubleshooting

### "No plants found" despite having API keys

**Check:**
1. API keys are correctly formatted in `.env` file
2. No quotes around keys in `.env`: `PERENUAL_API_KEY=sk-xxxxx` (not `"sk-xxxxx"`)
3. Server was restarted after adding keys
4. Check server console for error messages

### Wikipedia results show unexpected plants

Wikipedia search returns results based on article title matching. This may include:
- Plants with similar names
- Plant varieties or cultivars
- Related botanical terms

For best results, use specific scientific names or add API keys for Perenual/Trefle.

## Benefits of Multi-Source Approach

1. **Higher Success Rate**: Multiple fallbacks ensure you find plant data even if one source fails
2. **Cost Effective**: Free tiers of multiple APIs + Wikipedia fallback
3. **Redundancy**: If one API is down, others provide backup
4. **Rich Data**: Perenual provides the most detailed care information
5. **Offline Capability**: Cached results work without any API calls

## Privacy & Data

- All search results are cached in your local SQLite database
- No personal data is sent to external APIs (only plant search queries)
- Wikipedia scraping is done through their public API (no account needed)
- API keys are stored locally and never transmitted except to their respective services
