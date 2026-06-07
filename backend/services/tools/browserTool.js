/**
 * Browser Tool — Web search, read URLs, fetch API data (online only)
 */
class BrowserTool {
  constructor() {
    this.name = 'browser';
    this.description = 'Search the web, read web pages, fetch API data, and download content from URLs. Only available when online.';
    this.requiresInternet = true;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "search" (web search), "read" (read a URL), "fetch" (make API request)'
      },
      query: {
        required: false,
        description: 'Search query (required for search action)'
      },
      url: {
        required: false,
        description: 'URL to read or fetch (required for read/fetch actions)'
      },
      method: {
        required: false,
        description: 'HTTP method for fetch: "GET" (default), "POST", "PUT", "DELETE"'
      },
      headers: {
        required: false,
        description: 'JSON object of headers for fetch requests'
      },
      body: {
        required: false,
        description: 'Request body for POST/PUT requests (JSON string)'
      }
    };
  }

  async execute(params) {
    const { action, query, url, method = 'GET', headers, body } = params;

    switch (action) {
      case 'search':
        return await this._webSearch(query);
      case 'read':
        return await this._readUrl(url);
      case 'fetch':
        return await this._makeRequest(url, method, headers, body);
      default:
        throw new Error(`Unknown action: ${action}. Use: search, read, fetch`);
    }
  }

  /**
   * Search the web using DuckDuckGo
   */
  async _webSearch(query) {
    if (!query) throw new Error('Search query is required');

    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
      );

      if (!response.ok) throw new Error(`Search failed: ${response.status}`);

      const data = await response.json();

      // Extract abstract and related topics
      const results = [];

      if (data.AbstractText) {
        results.push({ type: 'abstract', text: data.AbstractText, source: data.AbstractURL });
      }

      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 8)) {
          if (topic.Text) {
            results.push({ type: 'result', text: topic.Text, source: topic.FirstURL });
          }
          // Handle sub-topics
          if (topic.Topics) {
            for (const sub of topic.Topics.slice(0, 3)) {
              results.push({ type: 'result', text: sub.Text, source: sub.FirstURL });
            }
          }
        }
      }

      // Fallback: use a simple search if DuckDuckGo returns nothing
      if (results.length === 0) {
        const fallbackResponse = await fetch(
          `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
        );
        const html = await fallbackResponse.text();
        // Extract result links from the lite version
        const linkRegex = /<a[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>([^<]+)<\/a>/g;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          results.push({ type: 'link', text: match[2], source: match[1] });
        }
      }

      return {
        query,
        results: results.slice(0, 10),
        count: results.length
      };
    } catch (error) {
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  /**
   * Read content from a URL
   */
  async _readUrl(url) {
    if (!url) throw new Error('URL is required');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentType = response.headers.get('content-type') || '';
      let content;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2).slice(0, 3000);
      } else {
        const text = await response.text();
        // Basic HTML to text conversion
        content = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);
      }

      return {
        url,
        contentType: contentType.split(';')[0],
        content,
        length: content.length
      };
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Request timed out after 15 seconds');
      throw new Error(`Cannot read URL: ${error.message}`);
    }
  }

  /**
   * Make an arbitrary HTTP request
   */
  async _makeRequest(url, method, headers, body) {
    if (!url) throw new Error('URL is required');

    try {
      const options = {
        method: method.toUpperCase(),
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' }
      };

      if (headers) {
        try {
          const parsed = typeof headers === 'string' ? JSON.parse(headers) : headers;
          Object.assign(options.headers, parsed);
        } catch {
          // Use default headers if parsing fails
        }
      }

      if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseText = await response.text();
      const preview = responseText.slice(0, 2000);

      return {
        url,
        method: options.method,
        status: response.status,
        statusText: response.statusText,
        response: preview,
        length: responseText.length
      };
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Request timed out after 15 seconds');
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

module.exports = { BrowserTool };
