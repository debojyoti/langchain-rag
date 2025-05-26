# LangChain RAG PoC with MongoDB and OpenAI

A Node.js + Express proof of concept that demonstrates Retrieval Augmented Generation (RAG) using MongoDB as a data source and OpenAI's GPT models for language model capabilities.

## Features

- **Chat Web Interface**: Beautiful, responsive chat UI for easy interaction
- RESTful API endpoint `/ask` for question-answering
- MongoDB integration using Mongoose ODM
- OpenAI integration using GPT-4o-mini model
- Environment-based configuration
- Graceful error handling and shutdown
- Health check endpoint

## Prerequisites

- Node.js 14.x or higher
- MongoDB instance (local or cloud)
- OpenAI API key

## Setup & Installation

1. **Clone the repository** (or create the project directory):
   ```bash
   cd /home/debojyoti/projects/personal/langchain-rag
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up OpenAI API Key**:
   - Sign up for an OpenAI account at https://platform.openai.com/
   - Create an API key in your OpenAI dashboard
   - Keep your API key secure and never commit it to version control

4. **Configure environment variables**:
   
   Create a `.env` file in the project root with the following variables:

   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017
   # or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/
   MONGODB_DB_NAME=your-database-name
   MONGODB_COLLECTION_NAME=your-collection-name

   # Server Configuration (optional)
   PORT=3000
   ```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes | `sk-...` |
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | Target database name | Yes | `myDatabase` |
| `MONGODB_COLLECTION_NAME` | Target collection name | Yes | `documents` |
| `PORT` | Server port (default: 3000) | No | `3000` |

## Running the Application

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on the configured port (default: 3000) and connect to MongoDB automatically using Mongoose.

## Accessing the Application

### Chat Web Interface
Open your browser and navigate to:
```
http://localhost:3000
```

This provides a beautiful, modern chat interface where you can:
- Ask questions about your MongoDB documents
- See real-time typing indicators
- View conversation history
- Get source information for each response
- Use on both desktop and mobile devices

### API Endpoints

#### Health Check
```bash
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "database": "connected"
}
```

#### Ask Endpoint
```bash
POST /ask
Content-Type: application/json

{
  "question": "What is the main topic of the documents?"
}
```

Returns:
```json
{
  "answer": "Based on the documents in the collection...",
  "source": "MongoDB collection: your-collection-name",
  "documentsCount": 5
}
```

## Example Usage

### Using curl:
```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What information is available about product features?"
  }'
```

### Using Postman:
1. Create a new POST request
2. URL: `http://localhost:3000/ask`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "question": "Summarize the main points from the documents"
   }
   ```

### Using JavaScript (fetch):
```javascript
const response = await fetch('http://localhost:3000/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: 'What are the key insights from the data?'
  })
});

const data = await response.json();
console.log(data.answer);
```

## How It Works

1. **Document Retrieval**: When a question is received, the application connects to MongoDB using Mongoose and fetches all documents from the specified collection.

2. **Context Building**: Documents are processed to extract relevant fields (title, description, content, etc.) and combined into a single context blob.

3. **LLM Processing**: The question and context are sent to OpenAI's GPT-4o-mini model for processing.

4. **Response Generation**: The LLM's answer is returned along with the source information and document count.

## Error Handling

The application handles various error scenarios:
- Missing or invalid request body
- MongoDB connection failures
- OpenAI API errors (authentication, rate limits, etc.)
- Missing environment variables

All errors return appropriate HTTP status codes and descriptive error messages.

## MongoDB Document Structure

The application uses a flexible Mongoose schema that accepts any document structure. It looks for these common fields in documents:
- `title`
- `name`
- `description`
- `content`
- `text`
- `summary`

If none of these fields exist, the entire document is stringified and used as context (excluding MongoDB's `_id` and `__v` fields).

## OpenAI Model

The application uses the `gpt-4o-mini` model, which provides:
- Cost-effective processing
- Good performance for question-answering tasks
- Support for large context windows
- Fast response times

## Troubleshooting

### MongoDB Connection Issues
- Verify your `MONGODB_URI` is correct
- Ensure MongoDB is running and accessible
- Check network/firewall settings
- Verify database and collection names

### OpenAI API Issues
- Verify your `OPENAI_API_KEY` is correct and active
- Check your OpenAI account has sufficient credits
- Monitor rate limits (the app handles 429 errors gracefully)
- Ensure your API key has the necessary permissions

### No Documents Found
- Verify the database and collection names
- Ensure the collection contains documents
- Check MongoDB connection permissions

## License

ISC 