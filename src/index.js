require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const path = require('path');

// Initialize Express app
const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Environment variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'MONGODB_COLLECTION_NAME',
  'OPENAI_API_KEY'
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

// Define a flexible Mongoose schema for documents
const documentSchema = new mongoose.Schema({}, { 
  strict: false, // Allow any fields
  collection: MONGODB_COLLECTION_NAME 
});

let DocumentModel;

// Connect to MongoDB using Mongoose
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('Connected to MongoDB successfully using Mongoose');
    
    // Create the model after connection
    DocumentModel = mongoose.model('Document', documentSchema);
    
    console.log(`Using database: ${MONGODB_DB_NAME}, collection: ${MONGODB_COLLECTION_NAME}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Main /ask endpoint
app.post('/ask', async (req, res) => {
  try {
    // Validate request body
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Invalid request body. Expected { "question": "your question here" }'
      });
    }

    // Fetch all documents from MongoDB collection using Mongoose
    console.log('Fetching documents from MongoDB...');
    const documents = await DocumentModel.find({}).lean();
    console.log(`Found ${documents.length} documents`);

    if (documents.length === 0) {
      return res.json({
        answer: "No documents found in the collection to provide context.",
        source: `MongoDB collection: ${MONGODB_COLLECTION_NAME}`
      });
    }

    // Process documents to create context
    const contextParts = documents.map((doc, index) => {
      // Extract relevant fields (title, description, content, etc.)
      const parts = [];
      
      // Common field names that might contain useful information
      const fieldNames = ['title', 'name', 'description', 'content', 'text', 'summary'];
      
      fieldNames.forEach(fieldName => {
        if (doc[fieldName]) {
          parts.push(`${fieldName}: ${doc[fieldName]}`);
        }
      });
      
      // If no specific fields found, stringify the entire document (excluding _id and __v)
      if (parts.length === 0) {
        const cleanDoc = { ...doc };
        delete cleanDoc._id;
        delete cleanDoc.__v;
        parts.push(JSON.stringify(cleanDoc, null, 2));
      }
      
      return `Document ${index + 1}:\n${parts.join('\n')}`;
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
          content: "You are a helpful assistant that answers questions based on the provided context from a MongoDB collection. Provide comprehensive answers based only on the information available in the context."
        },
        {
          role: "user",
          content: `Based on the following context from a MongoDB collection, please answer this question: ${question}

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
      source: `MongoDB collection: ${MONGODB_COLLECTION_NAME}`,
      documentsCount: documents.length
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Determine error type and send appropriate response
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      res.status(503).json({
        error: 'Database connection error',
        message: 'Unable to connect to MongoDB'
      });
    } else if (error.message && error.message.includes('OpenAI')) {
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
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
async function startServer() {
  try {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Chat UI available at http://localhost:${PORT}`);
      console.log(`POST /ask endpoint available at http://localhost:${PORT}/ask`);
      console.log(`Using OpenAI model: gpt-4o-mini`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();