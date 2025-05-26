# RAG Chat with Google Sheets/Docs and OpenAI

A Node.js + Express application that demonstrates Retrieval Augmented Generation (RAG) using Google Sheets or Google Docs as data sources and OpenAI's GPT models for intelligent question-answering.

## Features

- **Document Connection Interface**: Easy setup to connect Google Sheets or Google Docs
- **Chat Web Interface**: Beautiful, responsive chat UI for easy interaction
- RESTful API endpoints for document connection and question-answering
- Google Sheets integration (reads all sheets and rows)
- Google Docs integration (extracts full text content)
- OpenAI integration using GPT-4o-mini model
- Environment-based configuration
- Graceful error handling
- Real-time document status display

## Prerequisites

- Node.js 14.x or higher
- OpenAI API key
- Google API key (for accessing Google Sheets/Docs)
- Google Sheets or Google Docs with public read access

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

4. **Set up Google API Key**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API and Google Docs API:
     - Go to "APIs & Services" > "Library"
     - Search for "Google Sheets API" and enable it
     - Search for "Google Docs API" and enable it
   - Create an API key:
     - Go to "APIs & Services" > "Credentials"
     - Click "Create Credentials" > "API Key"
     - Copy the generated API key
   - (Optional) Restrict the API key to only Google Sheets and Docs APIs for security

5. **Configure environment variables**:
   
   Create a `.env` file in the project root with the following variables:

   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key

   # Google API Configuration
   GOOGLE_API_KEY=your-google-api-key

   # Server Configuration (optional)
   PORT=3000
   ```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes | `sk-...` |
| `GOOGLE_API_KEY` | Your Google API key | Yes | `AIza...` |
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

The server will start on the configured port (default: 3000).

## Accessing the Application

### Chat Web Interface
Open your browser and navigate to:
```
http://localhost:3000
```

This provides a beautiful, modern chat interface where you can:

1. **Connect Your Document**: 
   - Paste a Google Sheets or Google Docs URL
   - The system will automatically detect the document type
   - Fetch and process all data from the document

2. **Start Chatting**:
   - Ask questions about your document data
   - See real-time typing indicators
   - View conversation history
   - Get source information for each response
   - Switch documents anytime

### Document Requirements

Your Google Sheets or Google Docs must be:
- **Publicly accessible** with "Anyone with the link can view" permissions
- **Valid Google URLs** in the format:
  - Sheets: `https://docs.google.com/spreadsheets/d/[ID]/...`
  - Docs: `https://docs.google.com/document/d/[ID]/...`

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
  "documentConnected": true,
  "documentType": "sheets"
}
```

#### Connect Document
```bash
POST /set-document
Content-Type: application/json

{
  "url": "https://docs.google.com/spreadsheets/d/your-sheet-id/..."
}
```

Returns:
```json
{
  "success": true,
  "message": "Successfully connected to Google Sheets",
  "documentType": "sheets",
  "itemCount": 25,
  "url": "https://docs.google.com/spreadsheets/d/..."
}
```

#### Ask Questions
```bash
POST /ask
Content-Type: application/json

{
  "question": "What is the summary of the data?"
}
```

Returns:
```json
{
  "answer": "Based on the Google Sheets data...",
  "source": "Google Sheets: https://docs.google.com/spreadsheets/d/...",
  "itemCount": 25,
  "documentType": "sheets"
}
```

## How It Works

1. **Document Connection**: When you provide a Google Sheets/Docs URL, the application:
   - Validates the URL format
   - Extracts the document ID
   - Fetches data using Google APIs (no authentication required for public docs)
   - Processes and stores the data in memory

2. **Data Processing**: 
   - **Google Sheets**: Reads all sheets, converts rows to structured data with headers
   - **Google Docs**: Extracts all text content from the document
   - Creates a searchable context from the processed data

3. **Question Answering**: When you ask a question:
   - The system combines your question with the document context
   - Sends the combined prompt to OpenAI's GPT-4o-mini model
   - Returns an intelligent answer based on your document data

## Supported Document Types

### Google Sheets
- Reads all sheets in the spreadsheet
- Uses first row as headers
- Processes all data rows
- Maintains sheet names and row references

### Google Docs
- Extracts all text content
- Preserves document structure
- Includes document title
- Handles formatted text

## Example Usage

### Using curl:
```bash
# Connect a document
curl -X POST http://localhost:3000/set-document \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
  }'

# Ask a question
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main trends in the data?"
  }'
```

## Error Handling

The application handles various error scenarios:
- Invalid or inaccessible document URLs
- Missing or invalid request bodies
- OpenAI API errors (authentication, rate limits, etc.)
- Google API access issues

All errors return appropriate HTTP status codes and descriptive error messages.

## Troubleshooting

### Document Access Issues
- Ensure the document is publicly accessible ("Anyone with the link can view")
- Verify the URL format is correct
- Check that the document exists and isn't deleted

### Google API Issues
- Verify your `GOOGLE_API_KEY` is correct and active
- Ensure Google Sheets API and Google Docs API are enabled in your Google Cloud project
- Check that your API key has the necessary permissions
- If using API key restrictions, make sure Google Sheets and Docs APIs are allowed

### OpenAI API Issues
- Verify your `OPENAI_API_KEY` is correct and active
- Check your OpenAI account has sufficient credits
- Monitor rate limits (the app handles 429 errors gracefully)

### No Data Found
- For Sheets: Ensure there's data beyond the header row
- For Docs: Ensure the document has text content
- Check document permissions

## License

ISC 