require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const cors = require('cors');
const { google } = require('googleapis');

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Environment variables
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Validate required environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Store the current document URL and data
let currentDocumentUrl = null;
let currentDocumentData = null;
let currentDocumentType = null;

// Helper function to extract Google Sheets ID from URL
function extractSheetsId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Helper function to extract Google Docs ID from URL
function extractDocsId(url) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Helper function to determine document type
function getDocumentType(url) {
  if (url.includes('spreadsheets')) return 'sheets';
  if (url.includes('document')) return 'docs';
  return null;
}

// Function to fetch Google Sheets data
async function fetchGoogleSheetsData(spreadsheetId) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
    
    // Get spreadsheet metadata to find all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    
    const sheetNames = spreadsheet.data.sheets.map(sheet => sheet.properties.title);
    const allData = [];
    
    // Fetch data from all sheets
    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A:Z`, // Get all columns up to Z
      });
      
      const values = response.data.values || [];
      if (values.length > 0) {
        const headers = values[0];
        const rows = values.slice(1);
        
        rows.forEach((row, index) => {
          const rowData = {};
          headers.forEach((header, colIndex) => {
            if (row[colIndex]) {
              rowData[header] = row[colIndex];
            }
          });
          
          if (Object.keys(rowData).length > 0) {
            allData.push({
              sheet: sheetName,
              row: index + 2, // +2 because we skip header and 0-index
              data: rowData
            });
          }
        });
      }
    }
    
    return allData;
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    if (error.status === 403) {
      throw new Error('Access denied. Please ensure the Google Sheet is publicly accessible and your Google API key is valid.');
    } else if (error.status === 404) {
      throw new Error('Google Sheet not found. Please check the URL and ensure the sheet exists.');
    } else {
      throw new Error('Failed to fetch Google Sheets data. Please check your Google API key and sheet permissions.');
    }
  }
}

// Function to fetch Google Docs data
async function fetchGoogleDocsData(documentId) {
  try {
    const docs = google.docs({ version: 'v1', auth: GOOGLE_API_KEY });
    
    const response = await docs.documents.get({
      documentId: documentId,
    });
    
    const document = response.data;
    let content = '';
    
    // Extract text content from the document
    if (document.body && document.body.content) {
      document.body.content.forEach(element => {
        if (element.paragraph) {
          element.paragraph.elements.forEach(elem => {
            if (elem.textRun) {
              content += elem.textRun.content;
            }
          });
        }
      });
    }
    
    return [{
      title: document.title,
      content: content.trim(),
      type: 'document'
    }];
  } catch (error) {
    console.error('Error fetching Google Docs data:', error);
    if (error.status === 403) {
      throw new Error('Access denied. Please ensure the Google Doc is publicly accessible and your Google API key is valid.');
    } else if (error.status === 404) {
      throw new Error('Google Doc not found. Please check the URL and ensure the document exists.');
    } else {
      throw new Error('Failed to fetch Google Docs data. Please check your Google API key and document permissions.');
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    documentConnected: !!currentDocumentUrl,
    documentType: currentDocumentType
  });
});

// Endpoint to set document URL
app.post('/set-document', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Invalid request body. Expected { "url": "google_document_url" }'
      });
    }
    
    const documentType = getDocumentType(url);
    if (!documentType) {
      return res.status(400).json({
        error: 'Invalid URL. Please provide a Google Sheets or Google Docs URL.'
      });
    }
    
    let documentId;
    if (documentType === 'sheets') {
      documentId = extractSheetsId(url);
    } else {
      documentId = extractDocsId(url);
    }
    
    if (!documentId) {
      return res.status(400).json({
        error: 'Could not extract document ID from URL. Please check the URL format.'
      });
    }
    
    // Fetch data from the document
    console.log(`Fetching data from Google ${documentType}...`);
    let data;
    if (documentType === 'sheets') {
      data = await fetchGoogleSheetsData(documentId);
    } else {
      data = await fetchGoogleDocsData(documentId);
    }
    
    // Store the data
    currentDocumentUrl = url;
    currentDocumentData = data;
    currentDocumentType = documentType;
    
    console.log(`Successfully connected to Google ${documentType} with ${data.length} items`);
    
    res.json({
      success: true,
      message: `Successfully connected to Google ${documentType}`,
      documentType: documentType,
      itemCount: data.length,
      url: url
    });
    
  } catch (error) {
    console.error('Error setting document:', error);
    res.status(500).json({
      error: 'Failed to connect to document',
      message: error.message
    });
  }
});

// Main /ask endpoint
app.post('/ask', async (req, res) => {
  try {
    // Check if document is connected
    if (!currentDocumentData) {
      return res.status(400).json({
        error: 'No document connected. Please set a Google Sheets or Google Docs URL first.'
      });
    }
    
    // Validate request body
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Invalid request body. Expected { "question": "your question here" }'
      });
    }

    console.log(`Processing question with ${currentDocumentData.length} items from Google ${currentDocumentType}`);

    // Process documents to create context
    const contextParts = currentDocumentData.map((item, index) => {
      if (currentDocumentType === 'sheets') {
        // For sheets, format the row data
        const dataStr = Object.entries(item.data)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        return `Row ${item.row} from sheet "${item.sheet}": ${dataStr}`;
      } else {
        // For docs, use the content
        return `${item.title}: ${item.content}`;
      }
    });

    const contextBlob = contextParts.join('\n\n---\n\n');
    console.log(`Created context blob with ${contextBlob.length} characters`);

    // Call OpenAI with the question and context
    console.log('Calling OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that answers questions based on the provided context from a Google ${currentDocumentType === 'sheets' ? 'Sheets' : 'Docs'} document. Provide comprehensive answers based only on the information available in the context.`
        },
        {
          role: "user",
          content: `Based on the following context from a Google ${currentDocumentType === 'sheets' ? 'Sheets' : 'Docs'} document, please answer this question: ${question}

Context:
${contextBlob}

Please provide a comprehensive answer based on the information available in the context.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    // Return the response
    res.json({
      answer: answer,
      source: `Google ${currentDocumentType === 'sheets' ? 'Sheets' : 'Docs'}: ${currentDocumentUrl}`,
      itemCount: currentDocumentData.length,
      documentType: currentDocumentType
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Determine error type and send appropriate response
    if (error.message && error.message.includes('OpenAI')) {
      res.status(503).json({
        error: 'AI service error',
        message: 'Unable to process request with OpenAI'
      });
    } else if (error.status === 401) {
      res.status(401).json({
        error: 'Authentication error',
        message: 'Invalid OpenAI API key'
      });
    } else if (error.status === 429) {
      res.status(429).json({
        error: 'Rate limit error',
        message: 'OpenAI API rate limit exceeded'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// Handle 404 for other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log('\nShutting down gracefully...');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Chat UI available at http://localhost:${PORT}`);
      console.log(`POST /ask endpoint available at http://localhost:${PORT}/ask`);
      console.log(`POST /set-document endpoint available at http://localhost:${PORT}/set-document`);
      console.log(`Using OpenAI model: gpt-4o-mini`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();