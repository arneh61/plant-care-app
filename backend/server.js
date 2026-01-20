const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const db = new Database('./data/plants.db');

// Ensure uploads directory exists
const uploadsDir = './data/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const TREFLE_API_KEY = process.env.TREFLE_API_KEY; // Free alternative API
const PERENUAL_API_KEY = process.env.PERENUAL_API_KEY; // Perenual Plant API

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS collection_members (
    collection_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, user_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS plant_species_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE,
    common_name TEXT,
    scientific_name TEXT,
    care_data TEXT,
    image_url TEXT,
    source TEXT,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    location TEXT,
    common_name TEXT,
    scientific_name TEXT,
    species_cache_id INTEGER,
    care_data TEXT,
    image_url TEXT,
    notes TEXT,
    description TEXT,
    source_url TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (species_cache_id) REFERENCES plant_species_cache(id)
  );

  CREATE TABLE IF NOT EXISTS plant_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plant_id) REFERENCES plants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS watering_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    watered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (plant_id) REFERENCES plants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fertilizer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    fertilizer_type TEXT,
    amount TEXT,
    fertilized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (plant_id) REFERENCES plants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id)
  );
`);

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
      .run(email, hashedPassword, name);
    
    // Create default collection for user
    const collectionResult = db.prepare('INSERT INTO collections (name, owner_id) VALUES (?, ?)')
      .run(`${name}'s Plants`, result.lastInsertRowid);
    
    db.prepare('INSERT INTO collection_members (collection_id, user_id, role) VALUES (?, ?, ?)')
      .run(collectionResult.lastInsertRowid, result.lastInsertRowid, 'owner');

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET);
    res.json({ token, userId: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper function to search Trefle API
async function searchTrefleAPI(query) {
  if (!TREFLE_API_KEY || TREFLE_API_KEY === 'your_trefle_api_key_here') {
    return null;
  }
  
  try {
    const response = await axios.get('https://trefle.io/api/v1/plants/search', {
      params: {
        token: TREFLE_API_KEY,
        q: query,
        limit: 10
      }
    });
    
    return response.data.data.map(plant => ({
      id: `trefle_${plant.id}`,
      external_id: plant.id.toString(),
      common_name: plant.common_name || plant.scientific_name,
      scientific_name: plant.scientific_name,
      image_url: plant.image_url,
      source: 'trefle'
    }));
  } catch (error) {
    console.error('Trefle API error:', error.message);
    return null;
  }
}

// Helper function to get plant details from Trefle
async function getTrefleDetails(plantId) {
  if (!TREFLE_API_KEY) return null;
  
  try {
    const response = await axios.get(`https://trefle.io/api/v1/plants/${plantId}`, {
      params: { token: TREFLE_API_KEY }
    });
    
    const plant = response.data.data;
    return {
      common_name: plant.common_name || plant.scientific_name,
      scientific_name: plant.scientific_name,
      image_url: plant.image_url,
      watering: plant.specifications?.growth_rate || 'Average',
      sunlight: plant.specifications?.light ? [plant.specifications.light] : ['Full sun to partial shade'],
      humidity: 'Average'
    };
  } catch (error) {
    console.error('Trefle details error:', error.message);
    return null;
  }
}

// Helper function to search Perenual API
async function searchPerenualAPI(query) {
  if (!PERENUAL_API_KEY || PERENUAL_API_KEY === 'your_perenual_api_key_here') {
    return null;
  }

  try {
    const response = await axios.get('https://perenual.com/api/species-list', {
      params: {
        key: PERENUAL_API_KEY,
        q: query,
        page: 1
      }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return null;
    }

    return response.data.data.map(plant => ({
      id: `perenual_${plant.id}`,
      external_id: plant.id.toString(),
      common_name: plant.common_name || plant.scientific_name?.[0] || 'Unknown',
      scientific_name: plant.scientific_name?.[0] || '',
      image_url: plant.default_image?.thumbnail || plant.default_image?.regular_url || null,
      watering: plant.watering || 'Average',
      sunlight: plant.sunlight || [],
      source: 'perenual'
    }));
  } catch (error) {
    console.error('Perenual API error:', error.message);
    return null;
  }
}

// Helper function to get plant details from Perenual
async function getPerenualDetails(plantId) {
  if (!PERENUAL_API_KEY) return null;

  try {
    const response = await axios.get(`https://perenual.com/api/species/details/${plantId}`, {
      params: { key: PERENUAL_API_KEY }
    });

    const plant = response.data;
    return {
      common_name: plant.common_name || plant.scientific_name?.[0] || 'Unknown',
      scientific_name: plant.scientific_name?.[0] || '',
      image_url: plant.default_image?.regular_url || plant.default_image?.thumbnail || null,
      watering: plant.watering || 'Average',
      sunlight: plant.sunlight || ['Full sun to partial shade'],
      humidity: 'Average',
      cycle: plant.cycle,
      description: plant.description
    };
  } catch (error) {
    console.error('Perenual details error:', error.message);
    return null;
  }
}

// Helper function to scrape Chlorobase for plant data
async function scrapeChlorobase(plantName) {
  try {
    // Chlorobase uses French plant names and scientific names
    // Try searching with the plant name converted to lowercase and hyphenated
    const searchTerm = plantName.toLowerCase().replace(/\s+/g, '-');

    // Try common genera first
    const commonGenera = ['monstera', 'philodendron', 'pothos', 'calathea', 'maranta',
                          'ficus', 'alocasia', 'anthurium', 'syngonium', 'peperomia'];

    let genus = null;
    for (const g of commonGenera) {
      if (plantName.toLowerCase().includes(g)) {
        genus = g;
        break;
      }
    }

    if (!genus) {
      // Try to guess genus from first word
      genus = plantName.split(' ')[0].toLowerCase();
    }

    // Try to fetch the genus page
    const genusUrl = `https://chlorobase.com/fr/plantes/${genus}`;
    console.log(`Trying Chlorobase genus: ${genusUrl}`);

    const response = await axios.get(genusUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlantCareBot/1.0)'
      },
      timeout: 5000
    });

    const html = response.data;
    const results = [];

    // Simple HTML parsing to find plant links and names
    // Look for plant links in the format /fr/plantes/genus/species
    const linkRegex = /href="\/fr\/plantes\/([^"]+)"/g;
    const matches = [...html.matchAll(linkRegex)];

    for (const match of matches.slice(0, 5)) {
      const plantPath = match[1];
      const parts = plantPath.split('/');
      const speciesName = parts[parts.length - 1];

      // Only include if it matches our search
      if (plantPath.toLowerCase().includes(searchTerm) ||
          searchTerm.includes(speciesName)) {

        results.push({
          id: `chlorobase_${plantPath.replace(/\//g, '_')}`,
          external_id: plantPath,
          common_name: speciesName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          scientific_name: parts.join(' ').replace(/-/g, ' '),
          image_url: null, // We'd need to fetch the individual page for images
          source: 'chlorobase',
          source_url: `https://chlorobase.com/fr/plantes/${plantPath}`
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Chlorobase scrape error:', error.message);
    return null;
  }
}

// Helper function to get detailed care data from Chlorobase
async function getChlorobaseDetails(plantPath) {
  try {
    const url = `https://chlorobase.com/fr/plantes/${plantPath}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlantCareBot/1.0)'
      },
      timeout: 5000
    });

    const html = response.data;

    // Parse care information from the page
    // This is a simplified parser - real implementation would need proper HTML parsing
    let watering = 'Average';
    let sunlight = ['Bright indirect light'];
    let humidity = 'Average (40-60%)';

    // Look for watering info
    if (html.includes('Besoins modérés') || html.includes('modéré')) {
      watering = 'Average';
    } else if (html.includes('Besoins élevés') || html.includes('élevé')) {
      watering = 'Frequent';
    } else if (html.includes('Besoins faibles') || html.includes('faible')) {
      watering = 'Minimum';
    }

    // Look for light info
    if (html.includes('Lumière indirecte') || html.includes('indirect')) {
      sunlight = ['Bright indirect light'];
    } else if (html.includes('Lumière vive') || html.includes('vive')) {
      sunlight = ['Bright light'];
    } else if (html.includes('Faible') || html.includes('ombre')) {
      sunlight = ['Low light'];
    }

    // Look for humidity percentage
    const humidityMatch = html.match(/(\d+)\s*[%àa-]\s*(\d+)%/);
    if (humidityMatch) {
      humidity = `${humidityMatch[1]}-${humidityMatch[2]}%`;
    }

    return {
      watering,
      sunlight,
      humidity
    };
  } catch (error) {
    console.error('Chlorobase details error:', error.message);
    return {
      watering: 'Average',
      sunlight: ['Bright indirect light'],
      humidity: 'Average (40-60%)'
    };
  }
}

// Helper function to scrape plant info from Wikipedia as fallback
async function scrapeWikipedia(plantName) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(plantName)}&format=json&origin=*`;
    const searchResponse = await axios.get(searchUrl);

    if (!searchResponse.data.query.search || searchResponse.data.query.search.length === 0) {
      return null;
    }

    const results = [];
    for (const result of searchResponse.data.query.search.slice(0, 5)) {
      const pageTitle = result.title;
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

      // Get page image
      const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
      const imageResponse = await axios.get(imageUrl);
      const pages = imageResponse.data.query.pages;
      const pageId = Object.keys(pages)[0];
      const thumbnail = pages[pageId]?.thumbnail?.source || null;

      results.push({
        id: `wikipedia_${pageTitle.replace(/\s+/g, '_')}`,
        external_id: pageTitle,
        common_name: pageTitle,
        scientific_name: pageTitle,
        image_url: thumbnail,
        source: 'wikipedia',
        source_url: pageUrl
      });
    }

    return results;
  } catch (error) {
    console.error('Wikipedia scrape error:', error.message);
    return null;
  }
}

// Plant search with aggressive caching
app.get('/api/plants/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    console.log(`Searching for plant: ${q}`);
    
    // First check cache with fuzzy matching
    const cached = db.prepare(`
      SELECT * FROM plant_species_cache 
      WHERE common_name LIKE ? 
         OR scientific_name LIKE ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`);
    
    if (cached.length > 0) {
      console.log(`Found ${cached.length} cached results`);
      const formattedCache = cached.map(c => ({
        id: c.external_id,
        common_name: c.common_name,
        scientific_name: c.scientific_name,
        default_image: c.image_url ? { 
          thumbnail: c.image_url, 
          regular_url: c.image_url 
        } : null,
        source: c.source,
        cached: true
      }));
      return res.json({ data: formattedCache, from_cache: true });
    }
    
    console.log('Not in cache, trying multiple plant databases...');

    // Try Perenual API first (most comprehensive)
    console.log('Trying Perenual API...');
    const perenualResults = await searchPerenualAPI(q);
    if (perenualResults && perenualResults.length > 0) {
      console.log(`Found ${perenualResults.length} results from Perenual`);

      // Cache the results
      for (const plant of perenualResults) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO plant_species_cache
            (external_id, common_name, scientific_name, image_url, source, care_data)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            `perenual_${plant.external_id}`,
            plant.common_name,
            plant.scientific_name,
            plant.image_url,
            'perenual',
            JSON.stringify({ watering: plant.watering, sunlight: plant.sunlight, humidity: 'Average' })
          );
        } catch (err) {
          console.error('Cache insert error:', err.message);
        }
      }

      return res.json({
        data: perenualResults.map(p => ({
          ...p,
          default_image: p.image_url ? {
            thumbnail: p.image_url,
            regular_url: p.image_url
          } : null
        })),
        from_cache: false,
        source: 'perenual'
      });
    }

    // Try Trefle API as fallback
    console.log('Trying Trefle API...');
    const trefleResults = await searchTrefleAPI(q);
    if (trefleResults && trefleResults.length > 0) {
      console.log(`Found ${trefleResults.length} results from Trefle`);

      // Cache the results
      for (const plant of trefleResults) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO plant_species_cache
            (external_id, common_name, scientific_name, image_url, source, care_data)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            `trefle_${plant.external_id}`,
            plant.common_name,
            plant.scientific_name,
            plant.image_url,
            'trefle',
            JSON.stringify({ watering: 'Average', sunlight: [], humidity: 'Average' })
          );
        } catch (err) {
          console.error('Cache insert error:', err.message);
        }
      }

      return res.json({
        data: trefleResults.map(p => ({
          ...p,
          default_image: p.image_url ? {
            thumbnail: p.image_url,
            regular_url: p.image_url
          } : null
        })),
        from_cache: false,
        source: 'trefle'
      });
    }

    // Try Chlorobase (curated plant database with care info)
    console.log('Trying Chlorobase...');
    const chlorobaseResults = await scrapeChlorobase(q);
    if (chlorobaseResults && chlorobaseResults.length > 0) {
      console.log(`Found ${chlorobaseResults.length} results from Chlorobase`);

      // Cache the results with care data
      for (const plant of chlorobaseResults) {
        try {
          const careData = await getChlorobaseDetails(plant.external_id);
          db.prepare(`
            INSERT OR IGNORE INTO plant_species_cache
            (external_id, common_name, scientific_name, image_url, source, care_data, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            plant.id,
            plant.common_name,
            plant.scientific_name,
            plant.image_url,
            'chlorobase',
            JSON.stringify(careData),
            plant.source_url
          );
        } catch (err) {
          console.error('Cache insert error:', err.message);
        }
      }

      return res.json({
        data: chlorobaseResults.map(p => ({
          ...p,
          default_image: p.image_url ? {
            thumbnail: p.image_url,
            regular_url: p.image_url
          } : null
        })),
        from_cache: false,
        source: 'chlorobase'
      });
    }

    // Try Wikipedia as last resort
    console.log('Trying Wikipedia...');
    const wikipediaResults = await scrapeWikipedia(q);
    if (wikipediaResults && wikipediaResults.length > 0) {
      console.log(`Found ${wikipediaResults.length} results from Wikipedia`);

      // Cache the results
      for (const plant of wikipediaResults) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO plant_species_cache
            (external_id, common_name, scientific_name, image_url, source, care_data, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            plant.external_id,
            plant.common_name,
            plant.scientific_name,
            plant.image_url,
            'wikipedia',
            JSON.stringify({ watering: 'Average', sunlight: [], humidity: 'Average' }),
            plant.source_url
          );
        } catch (err) {
          console.error('Cache insert error:', err.message);
        }
      }

      return res.json({
        data: wikipediaResults.map(p => ({
          ...p,
          default_image: p.image_url ? {
            thumbnail: p.image_url,
            regular_url: p.image_url
          } : null
        })),
        from_cache: false,
        source: 'wikipedia'
      });
    }

    // If no results from any source
    console.log('No results found from any source');
    return res.json({
      data: [],
      from_cache: false,
      message: 'No plants found. Try a different search term or add plant manually.'
    });
    
  } catch (error) {
    console.error('Plant search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed. Plant will need to be added manually.',
      details: error.message 
    });
  }
});

app.get('/api/plants/details/:id', authenticate, async (req, res) => {
  try {
    const externalId = req.params.id;
    
    console.log(`Fetching details for plant ID: ${externalId}`);
    
    // Check cache first
    const cached = db.prepare('SELECT * FROM plant_species_cache WHERE external_id = ?').get(externalId);
    
    if (cached) {
      console.log('Found in cache');
      const careData = JSON.parse(cached.care_data || '{}');
      return res.json({
        id: cached.external_id,
        common_name: cached.common_name,
        scientific_name: cached.scientific_name,
        watering: careData.watering,
        sunlight: careData.sunlight,
        humidity: careData.humidity,
        default_image: cached.image_url ? { regular_url: cached.image_url } : null,
        from_cache: true
      });
    }
    
    console.log('Fetching from API based on ID prefix...');

    // Check which API based on ID prefix
    if (externalId.startsWith('perenual_')) {
      const numericId = externalId.replace('perenual_', '');
      const perenualDetails = await getPerenualDetails(numericId);

      if (perenualDetails) {
        const careData = {
          watering: perenualDetails.watering,
          sunlight: perenualDetails.sunlight,
          humidity: perenualDetails.humidity
        };

        db.prepare(`
          INSERT OR REPLACE INTO plant_species_cache
          (external_id, common_name, scientific_name, care_data, image_url, source)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          externalId,
          perenualDetails.common_name,
          perenualDetails.scientific_name,
          JSON.stringify(careData),
          perenualDetails.image_url,
          'perenual'
        );

        console.log('Cached Perenual plant details');

        return res.json({
          ...perenualDetails,
          id: externalId,
          from_cache: false
        });
      }
    } else if (externalId.startsWith('trefle_')) {
      const numericId = externalId.replace('trefle_', '');
      const trefleDetails = await getTrefleDetails(numericId);

      if (trefleDetails) {
        const careData = {
          watering: trefleDetails.watering,
          sunlight: trefleDetails.sunlight,
          humidity: trefleDetails.humidity
        };

        db.prepare(`
          INSERT OR REPLACE INTO plant_species_cache
          (external_id, common_name, scientific_name, care_data, image_url, source)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          externalId,
          trefleDetails.common_name,
          trefleDetails.scientific_name,
          JSON.stringify(careData),
          trefleDetails.image_url,
          'trefle'
        );

        console.log('Cached Trefle plant details');

        return res.json({
          ...trefleDetails,
          id: externalId,
          from_cache: false
        });
      }
    } else if (externalId.startsWith('chlorobase_')) {
      const plantPath = externalId.replace('chlorobase_', '').replace(/_/g, '/');
      const careData = await getChlorobaseDetails(plantPath);

      if (careData) {
        db.prepare(`
          INSERT OR REPLACE INTO plant_species_cache
          (external_id, common_name, scientific_name, care_data, source)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          externalId,
          'Chlorobase Plant',
          plantPath.split('/').join(' '),
          JSON.stringify(careData),
          'chlorobase'
        );

        console.log('Cached Chlorobase plant details');

        return res.json({
          id: externalId,
          common_name: 'Chlorobase Plant',
          scientific_name: plantPath.split('/').join(' '),
          watering: careData.watering,
          sunlight: careData.sunlight,
          humidity: careData.humidity,
          from_cache: false
        });
      }
    }

    // If no data found, return defaults
    console.log('No details found, returning defaults');
    res.json({
      id: externalId,
      common_name: 'Unknown Plant',
      scientific_name: 'Unknown',
      watering: 'Average',
      sunlight: ['Full sun to partial shade'],
      humidity: 'Average',
      from_cache: false
    });
    
  } catch (error) {
    console.error('Plant details error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get plant details',
      details: error.message 
    });
  }
});

app.post('/api/collections/:collectionId/plants', authenticate, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { name, common_name, scientific_name, care_data, image_url, external_id, source_url } = req.body;
    
    // Verify user has access to collection
    const member = db.prepare('SELECT * FROM collection_members WHERE collection_id = ? AND user_id = ?')
      .get(collectionId, req.userId);
    
    if (!member) return res.status(403).json({ error: 'Access denied' });

    // Find or get species cache ID
    let speciesCacheId = null;
    if (external_id) {
      const cached = db.prepare('SELECT id FROM plant_species_cache WHERE external_id = ?').get(external_id);
      speciesCacheId = cached?.id;
    }

    // Enhance care data with detailed watering schedule
    const enhancedCareData = getDetailedCareInfo(care_data);

    const result = db.prepare(
      'INSERT INTO plants (collection_id, name, common_name, scientific_name, species_cache_id, care_data, image_url, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(collectionId, name, common_name, scientific_name, speciesCacheId, JSON.stringify(enhancedCareData), image_url, source_url);

    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper function to add detailed watering info
function getWateringDetails(wateringLevel) {
  const details = {
    'Frequent': {
      times_per_week: '3-4 times',
      description: 'Keep soil consistently moist but not waterlogged'
    },
    'Average': {
      times_per_week: '1-2 times',
      description: 'Water when top 2-3cm of soil feels dry'
    },
    'Minimum': {
      times_per_week: 'Once every 2 weeks',
      description: 'Allow soil to dry out between waterings'
    },
    'None': {
      times_per_week: 'Rarely',
      description: 'Very drought tolerant, water sparingly'
    }
  };
  
  return details[wateringLevel] || {
    times_per_week: '1-2 times',
    description: 'Water when soil feels dry to touch'
  };
}

// Helper function to get detailed care information
function getDetailedCareInfo(apiData) {
  return {
    watering: apiData.watering || 'Average',
    watering_details: getWateringDetails(apiData.watering),
    sunlight: apiData.sunlight || ['Bright indirect light'],
    sunlight_details: 'Most plants need 6-8 hours of appropriate light daily',
    humidity: apiData.humidity || 'Average (40-60%)',
    humidity_details: 'Can be increased with pebble trays or humidifiers',
    soil: apiData.soil || 'Well-draining potting mix',
    soil_ph: apiData.soil_ph || '6.0-7.0 (slightly acidic to neutral)',
    temperature: apiData.temperature || '18-24°C (65-75°F)',
    fertilizer: 'Balanced liquid fertilizer every 4-6 weeks during growing season',
    pruning: 'Remove dead or yellowing leaves as needed',
    repotting: 'Every 1-2 years or when rootbound'
  };
}

// Add plant manually (without search)
app.post('/api/collections/:collectionId/plants/manual', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { name, scientific_name, notes } = req.body;

    // Verify user has access
    const member = db.prepare('SELECT * FROM collection_members WHERE collection_id = ? AND user_id = ?')
      .get(collectionId, req.userId);

    if (!member) return res.status(403).json({ error: 'Access denied' });

    // Create with default care data including detailed watering
    const defaultCare = getDetailedCareInfo({
      watering: 'Average',
      sunlight: ['Bright indirect light'],
      humidity: 'Average (40-60%)'
    });

    // If image was uploaded, store the URL
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(
      'INSERT INTO plants (collection_id, name, common_name, scientific_name, care_data, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(collectionId, name, name, scientific_name || '', JSON.stringify(defaultCare), notes || '', imageUrl);

    res.json({
      id: result.lastInsertRowid,
      message: 'Plant added! You can edit care instructions later.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's collections
app.get('/api/collections', authenticate, async (req, res) => {
  try {
    const collections = db.prepare(`
      SELECT c.*, cm.role 
      FROM collections c
      JOIN collection_members cm ON c.id = cm.collection_id
      WHERE cm.user_id = ?
    `).all(req.userId);
    res.json(collections);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update collection name
app.put('/api/collections/:collectionId', authenticate, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { name } = req.body;
    
    // Verify user is owner
    const collection = db.prepare('SELECT * FROM collections WHERE id = ? AND owner_id = ?')
      .get(collectionId, req.userId);
    
    if (!collection) return res.status(403).json({ error: 'Only owner can rename collection' });
    
    db.prepare('UPDATE collections SET name = ? WHERE id = ?').run(name, collectionId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get plants in collection
app.get('/api/collections/:collectionId/plants', authenticate, async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    const member = db.prepare('SELECT * FROM collection_members WHERE collection_id = ? AND user_id = ?')
      .get(collectionId, req.userId);
    
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const plants = db.prepare(`
      SELECT p.*, 
        (SELECT watered_at FROM watering_logs WHERE plant_id = p.id ORDER BY watered_at DESC LIMIT 1) as last_watered,
        (SELECT fertilized_at FROM fertilizer_logs WHERE plant_id = p.id ORDER BY fertilized_at DESC LIMIT 1) as last_fertilized,
        (SELECT COUNT(*) FROM plant_photos WHERE plant_id = p.id) as photo_count
      FROM plants p
      WHERE p.collection_id = ?
      ORDER BY p.added_at DESC
    `).all(collectionId);

    res.json(plants);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get unique locations in a collection
app.get('/api/collections/:collectionId/locations', authenticate, async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    const member = db.prepare('SELECT * FROM collection_members WHERE collection_id = ? AND user_id = ?')
      .get(collectionId, req.userId);
    
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const locations = db.prepare(`
      SELECT DISTINCT location 
      FROM plants 
      WHERE collection_id = ? AND location IS NOT NULL AND location != ''
      ORDER BY location
    `).all(collectionId);

    res.json(locations.map(l => l.location));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single plant details
app.get('/api/plants/:plantId', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(plantId);
    
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    
    // Get photos
    const photos = db.prepare(`
      SELECT pp.*, u.name as uploaded_by
      FROM plant_photos pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.plant_id = ?
      ORDER BY pp.uploaded_at DESC
    `).all(plantId);
    
    res.json({ ...plant, photos });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update plant details
app.put('/api/plants/:plantId', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const { name, nickname, location, description, care_data } = req.body;
    
    console.log('Updating plant:', plantId, req.body);
    
    // Verify plant exists and user has access
    const plant = db.prepare(`
      SELECT p.*, cm.user_id 
      FROM plants p
      JOIN collection_members cm ON p.collection_id = cm.collection_id
      WHERE p.id = ? AND cm.user_id = ?
    `).get(plantId, req.userId);
    
    if (!plant) return res.status(403).json({ error: 'Access denied' });
    
    // Merge with existing care data to preserve fields
    const existingCareData = JSON.parse(plant.care_data || '{}');
    const mergedCareData = {
      ...existingCareData,
      ...care_data
    };
    
    db.prepare(
      'UPDATE plants SET name = ?, nickname = ?, location = ?, description = ?, care_data = ? WHERE id = ?'
    ).run(name, nickname || null, location || null, description || null, JSON.stringify(mergedCareData), plantId);
    
    console.log('Plant updated successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Update plant error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Delete plant
app.delete('/api/plants/:plantId', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    
    // Verify plant exists and user has access
    const plant = db.prepare(`
      SELECT p.*, cm.user_id 
      FROM plants p
      JOIN collection_members cm ON p.collection_id = cm.collection_id
      WHERE p.id = ? AND cm.user_id = ?
    `).get(plantId, req.userId);
    
    if (!plant) return res.status(403).json({ error: 'Access denied' });
    
    // Delete associated photos from filesystem
    const photos = db.prepare('SELECT filename FROM plant_photos WHERE plant_id = ?').all(plantId);
    photos.forEach(photo => {
      const filePath = path.join('./data/uploads', photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    // Delete from database (cascade will handle related records if we had foreign keys set up)
    db.prepare('DELETE FROM plant_photos WHERE plant_id = ?').run(plantId);
    db.prepare('DELETE FROM watering_logs WHERE plant_id = ?').run(plantId);
    db.prepare('DELETE FROM fertilizer_logs WHERE plant_id = ?').run(plantId);
    db.prepare('DELETE FROM plants WHERE id = ?').run(plantId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload plant photo
app.post('/api/plants/:plantId/photos', authenticate, upload.single('photo'), async (req, res) => {
  try {
    const { plantId } = req.params;
    const { caption, setAsThumbnail } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = db.prepare(
      'INSERT INTO plant_photos (plant_id, user_id, filename, caption) VALUES (?, ?, ?, ?)'
    ).run(plantId, req.userId, req.file.filename, caption || null);

    // If setAsThumbnail is true, update the plant's image_url
    if (setAsThumbnail === 'true' || setAsThumbnail === true) {
      db.prepare('UPDATE plants SET image_url = ? WHERE id = ?')
        .run(`/uploads/${req.file.filename}`, plantId);
    }

    res.json({
      id: result.lastInsertRowid,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get plant photos
app.get('/api/plants/:plantId/photos', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const photos = db.prepare(`
      SELECT pp.*, u.name as uploaded_by
      FROM plant_photos pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.plant_id = ?
      ORDER BY pp.uploaded_at DESC
    `).all(plantId);
    
    res.json(photos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set photo as thumbnail
app.put('/api/plants/:plantId/thumbnail', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    // Verify the photo exists for this plant
    const photo = db.prepare('SELECT * FROM plant_photos WHERE plant_id = ? AND filename = ?')
      .get(plantId, filename);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Update the plant's image_url
    db.prepare('UPDATE plants SET image_url = ? WHERE id = ?')
      .run(`/uploads/${filename}`, plantId);

    res.json({ success: true, image_url: `/uploads/${filename}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete plant photo
app.delete('/api/plants/:plantId/photos/:photoId', authenticate, async (req, res) => {
  try {
    const { plantId, photoId } = req.params;
    
    const photo = db.prepare('SELECT * FROM plant_photos WHERE id = ? AND plant_id = ?').get(photoId, plantId);
    
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    
    // Delete file
    const filePath = path.join('./data/uploads', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    db.prepare('DELETE FROM plant_photos WHERE id = ?').run(photoId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Log watering
app.post('/api/plants/:plantId/water', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const { notes } = req.body;
    
    const result = db.prepare(
      'INSERT INTO watering_logs (plant_id, user_id, notes) VALUES (?, ?, ?)'
    ).run(plantId, req.userId, notes);

    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get watering history
app.get('/api/plants/:plantId/watering-history', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const history = db.prepare(`
      SELECT wl.*, u.name as watered_by
      FROM watering_logs wl
      JOIN users u ON wl.user_id = u.id
      WHERE wl.plant_id = ?
      ORDER BY wl.watered_at DESC
      LIMIT 50
    `).all(plantId);
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Log fertilizing
app.post('/api/plants/:plantId/fertilize', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const { fertilizer_type, amount, notes } = req.body;
    
    const result = db.prepare(
      'INSERT INTO fertilizer_logs (plant_id, user_id, fertilizer_type, amount, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(plantId, req.userId, fertilizer_type, amount, notes);

    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get fertilizer history
app.get('/api/plants/:plantId/fertilizer-history', authenticate, async (req, res) => {
  try {
    const { plantId } = req.params;
    const history = db.prepare(`
      SELECT fl.*, u.name as fertilized_by
      FROM fertilizer_logs fl
      JOIN users u ON fl.user_id = u.id
      WHERE fl.plant_id = ?
      ORDER BY fl.fertilized_at DESC
      LIMIT 50
    `).all(plantId);
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Plant Doctor (Claude API)
app.post('/api/plant-doctor', authenticate, async (req, res) => {
  try {
    const { question, plantContext } = req.body;
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a plant care expert. ${plantContext ? `Context: The user is asking about their ${plantContext}.` : ''} Question: ${question}`
      }]
    }, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    res.json({ answer: response.data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plant doctor advice' });
  }
});

// Invitation system
app.post('/api/collections/:collectionId/invite', authenticate, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { email } = req.body;
    
    // Check if user is owner
    const collection = db.prepare('SELECT * FROM collections WHERE id = ? AND owner_id = ?')
      .get(collectionId, req.userId);
    
    if (!collection) return res.status(403).json({ error: 'Only owner can invite' });

    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    db.prepare('INSERT INTO invitations (collection_id, email, token, expires_at) VALUES (?, ?, ?, ?)')
      .run(collectionId, email, token, expiresAt);

    res.json({ token, inviteUrl: `${req.headers.origin}/invite/${token}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/invitations/:token/accept', authenticate, async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = db.prepare('SELECT * FROM invitations WHERE token = ? AND expires_at > datetime("now")')
      .get(token);
    
    if (!invitation) return res.status(404).json({ error: 'Invalid or expired invitation' });

    // Add user to collection
    db.prepare('INSERT OR IGNORE INTO collection_members (collection_id, user_id) VALUES (?, ?)')
      .run(invitation.collection_id, req.userId);

    // Delete invitation
    db.prepare('DELETE FROM invitations WHERE token = ?').run(token);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get species cache stats (for debugging)
app.get('/api/admin/cache-stats', authenticate, async (req, res) => {
  try {
    const stats = db.prepare('SELECT COUNT(*) as count FROM plant_species_cache').get();
    const recent = db.prepare('SELECT * FROM plant_species_cache ORDER BY cached_at DESC LIMIT 10').all();
    res.json({ total_cached: stats.count, recent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});