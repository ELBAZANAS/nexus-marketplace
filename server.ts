import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// .env.local overrides .env so a Gemini key in .env.local is actually used.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function envValue(name: string): string {
  const value = process.env[name]?.trim() || "";
  if (!value || value.startsWith("MY_") || value.startsWith("YOUR_")) return "";
  return value;
}

function publicUser(user: any) {
  if (!user || typeof user !== "object") return null;
  const { password, passwordHash, bankCards, ...rest } = user;
  return rest;
}

function catalogForPrompt(products: any[]) {
  return (products || []).map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    stock: product.stock,
    category: product.category,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    description: String(product.description || "").slice(0, 160)
  }));
}

function ordersForPrompt(orders: any[]) {
  return (orders || []).slice(0, 40).map((order) => ({
    id: order.id,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    date: order.date,
    totalAmount: order.totalAmount,
    status: order.status || "paid",
    items: (order.items || []).map((item: any) => ({
      productId: item.productId,
      title: item.title,
      price: item.price,
      quantity: item.quantity
    }))
  }));
}

const assistantSchema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          payload: {
            type: Type.OBJECT,
            properties: {
              productId: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              query: { type: Type.STRING },
              address: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.NUMBER },
              stock: { type: Type.NUMBER },
              category: { type: Type.STRING },
              userId: { type: Type.STRING },
              status: { type: Type.STRING },
              newPassword: { type: Type.STRING },
              tab: { type: Type.STRING },
              name: { type: Type.STRING },
              username: { type: Type.STRING },
              storeName: { type: Type.STRING },
              balance: { type: Type.NUMBER },
              sellerId: { type: Type.STRING },
              buyerId: { type: Type.STRING }
            }
          }
        },
        required: ["type"]
      }
    }
  },
  required: ["message", "actions"]
};

function parseAssistantJson(raw: string) {
  const cleaned = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Assistant did not return JSON.");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions
        .filter((action: any) => action && typeof action.type === "string")
        .map((action: any) => ({ type: action.type, payload: action.payload || {} }))
    : [];
  return {
    message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : "Done.",
    actions
  };
}

async function askGemini(contents: any[], systemInstruction: string) {
  if (!ai) throw new Error("Gemini is not configured.");
  const models = [...new Set([GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash"])];
  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: assistantSchema
        }
      });
      return parseAssistantJson(response.text || "");
    } catch (error) {
      lastError = error;
      console.error(`Gemini model ${model} failed:`, error);
    }
  }
  throw lastError;
}

// Optional web search. Used only when TAVILY_API_KEY is set in the environment.
async function searchTavily(query: string): Promise<string> {
  const apiKey = envValue("TAVILY_API_KEY");
  if (!apiKey) {
    return "Web search is not configured. Answer from marketplace context only.";
  }
  try {
    console.log(`[Tavily Search Engine] Initiating web search query: "${query}"`);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 4,
        include_answer: true
      })
    });
    if (!response.ok) {
      throw new Error(`Tavily search failed with status ${response.status}: ${response.statusText}`);
    }
    const data: any = await response.json();
    let resultsText = "";
    if (data.answer) {
      resultsText += `Primary Answer: ${data.answer}\n\n`;
    }
    if (data.results && Array.isArray(data.results)) {
      resultsText += "Web search references:\n";
      data.results.forEach((res: any, idx: number) => {
        resultsText += `[Reference ${idx + 1}] ${res.title}\nSource: ${res.url}\nContent snippet: ${res.content}\n\n`;
      });
    }
    return resultsText || "No search results found.";
  } catch (error: any) {
    console.error("Tavily Search Engine failure:", error);
    return `Error performing web search: ${error.message || error}`;
  }
}

// Qwen LLM API Caller
async function callQwen(
  systemInstruction: string,
  messages: any[],
  apiKey: string
): Promise<string> {
  let finalInstruction = systemInstruction;
  if (!finalInstruction.toLowerCase().includes("json")) {
    finalInstruction += "\n\nCRITICAL: You must output your response as a valid JSON object with 'message' and 'actions' fields.";
  }

  const formattedMessages = [
    { role: "system", content: finalInstruction },
    ...messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }))
  ];

  console.log(`[Qwen LLM Processor] Sending request to compatible-mode endpoint with ${formattedMessages.length} messages.`);
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen-plus",
      messages: formattedMessages,
      response_format: { type: "json_object" },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Qwen API error (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response returned from Qwen compatible endpoint.");
  }
  return content;
}

// Initialize GoogleGenAI SDK safely with server-side API Key if available
let ai: GoogleGenAI | null = null;
const geminiApiKey = envValue("GEMINI_API_KEY");

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'nexus-marketplace',
        }
      }
    });
    console.log("Nexus AI Core: GoogleGenAI SDK initialized successfully.");
  } catch (e) {
    console.warn("Failed to initialize GoogleGenAI SDK:", e);
  }
} else {
  console.log("Nexus AI Core: Operating in Smart Offline Mode (GEMINI_API_KEY not configured).");
}

// Smart Offline Matching Engine for fallback or localized execution
function generateOfflineResponse(
  message: string,
  currentUser: any,
  products: any[],
  cart: any[],
  users: any[],
  orders: any[]
) {
  const query = message.toLowerCase();
  const currentRole = currentUser?.role || 'guest';
  const currentUsername = currentUser?.username || 'Guest';

  const response: { message: string; actions: any[] } = {
    message: "",
    actions: []
  };

  // Check for category filter intent offline
  const categoriesList = ["Electronics", "Audio & Acoustics", "Home & Office", "Fashion & Apparel", "Travel & Carry", "Aesthetic Crafts"];
  let matchedCategory = "";
  for (const cat of categoriesList) {
    const lowerCat = cat.toLowerCase();
    if (query.includes(lowerCat) || 
        (lowerCat.includes("audio") && query.includes("audio")) || 
        (lowerCat.includes("acoustics") && query.includes("acoustics")) ||
        (lowerCat.includes("home") && query.includes("home")) ||
        (lowerCat.includes("office") && query.includes("office")) ||
        (lowerCat.includes("fashion") && query.includes("fashion")) ||
        (lowerCat.includes("apparel") && query.includes("apparel")) ||
        (lowerCat.includes("travel") && query.includes("travel")) ||
        (lowerCat.includes("carry") && query.includes("carry")) ||
        (lowerCat.includes("craft") && query.includes("craft")) ||
        (lowerCat.includes("aesthetic") && query.includes("aesthetic"))) {
      matchedCategory = cat;
      break;
    }
  }

  const publishing = query.includes("list a") || query.includes("publish") || query.includes("new product") || query.includes("price:");
  const browsing = currentRole === "guest" || currentRole === "buyer";
  if (browsing && !publishing && matchedCategory && (query.includes("category") || query.includes("filter") || query.includes("show") || query.includes("find") || query.includes("browse"))) {
    response.message = `Filtered the catalog to "${matchedCategory}".`;
    response.actions.push({
      type: "FILTER_CATEGORY",
      payload: { category: matchedCategory }
    });
    return response;
  }

  // 1. GUEST ACTIONS
  if (!currentUser) {
    if (query.includes("search") || query.includes("find") || query.includes("look for") || query.includes("show me")) {
      const searchTerms = query.replace(/(search for|find|look for|show me|products|items|product|item)/g, "").trim();
      response.message = `I searched the catalog for "${searchTerms || 'all'}" in Offline Mode. Here are the items that matched your query. To unlock full natural-language capabilities, please configure your GEMINI_API_KEY in the settings menu.`;
      response.actions.push({
        type: "SEARCH_PRODUCTS",
        payload: { query: searchTerms }
      });
      return response;
    }

    if (query.includes("add") || query.includes("cart") || query.includes("buy") || query.includes("checkout") || query.includes("shop") || query.includes("purchase") || query.includes("order") || query.includes("deliver") || query.includes("list")) {
      response.message = "Welcome to Nexus Commercial Core! I notice you are currently browsing as a Guest. You must register or log in first before you can start shopping, add premium products to your cart, set shipping details, publish listings, or complete checkout. Please click Sign In at the top right of the screen to sign up or log in.";
      return response;
    }

    response.message = `Hello! Welcome to the Nexus Commercial Core marketplace. You are currently browsing as a Guest. To ask me anything, start shopping, list products, or perform administrative tasks, please click Sign In at the top right of the screen to create an account or sign in.`;
    return response;
  }

  // 2. BUYER ACTIONS
  if (currentRole === 'buyer') {
    if (query.includes("add") || query.includes("buy") || query.includes("cart") || query.includes("purchase")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.id.toLowerCase()) ||
        p.title.toLowerCase().split(" ").some(word => word.length > 3 && query.includes(word))
      );

      if (matchedProduct) {
        let quantity = 1;
        const numberMatch = query.match(/\b\d+\b/);
        if (numberMatch) {
          quantity = parseInt(numberMatch[0], 10);
        }
        
        response.message = `I have dispatched a request to add ${quantity}x "${matchedProduct.title}" to your shopping cart. Let me know if you would like to adjust quantities or checkout!`;
        response.actions.push({
          type: "ADD_TO_CART",
          payload: { productId: matchedProduct.id, quantity }
        });
        return response;
      }
    }

    if (query.includes("increase") || query.includes("decrease") || query.includes("change") || query.includes("quantity") || query.includes("remove")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        p.title.toLowerCase().split(" ").some(word => word.length > 3 && query.includes(word))
      );

      if (matchedProduct) {
        let quantity = 1;
        const numberMatch = query.match(/\b\d+\b/);
        if (numberMatch) {
          quantity = parseInt(numberMatch[0], 10);
        }
        if (query.includes("decrease") || query.includes("remove") || query.includes("reduce") || query.includes("subtract")) {
          quantity = -quantity;
        }

        response.message = `Updating cart quantity for "${matchedProduct.title}" by ${quantity} unit(s).`;
        response.actions.push({
          type: "CHANGE_CART_QTY",
          payload: { productId: matchedProduct.id, quantity }
        });
        return response;
      }
    }

    if (query.includes("address") || query.includes("deliver") || query.includes("ship to") || query.includes("street")) {
      let address = "123 Main Street, Suite 400";
      const matches = message.match(/(?:deliver to|ship to|address is|address to)\s+(.+)/i);
      if (matches && matches[1]) {
        address = matches[1].trim();
      } else {
        const addressWords = message.split(" ").slice(3).join(" ");
        if (addressWords) address = addressWords;
      }

      response.message = `Understood. I have set your delivery shipping address to: "${address}". This will be applied to your order details.`;
      response.actions.push({
        type: "SET_ADDRESS",
        payload: { address }
      });
      return response;
    }

    if (query.includes("checkout") || query.includes("pay") || query.includes("complete purchase") || query.includes("order")) {
      if (cart.length === 0) {
        response.message = "Your cart is currently empty! Please search the catalog and add some products before checking out.";
        return response;
      }
      response.message = "Initiating secure wallet checkout! I am placing your order using your virtual bank balance in offline mode.";
      response.actions.push({
        type: "CHECKOUT",
        payload: {}
      });
      return response;
    }

    if (query.includes("search") || query.includes("find") || query.includes("look for") || query.includes("show me") || query.includes("catalog")) {
      const searchTerms = query.replace(/(search for|find|look for|show me|products|items|product|item)/g, "").trim();
      response.message = `Searching the catalog for "${searchTerms || 'all'}"...`;
      response.actions.push({
        type: "SEARCH_PRODUCTS",
        payload: { query: searchTerms }
      });
      return response;
    }

    response.message = `Hello, ${currentUsername}! I'm your Offline AI Companion. I can perform buyer tasks for you:
1. Search catalog (e.g. "find headphones")
2. Add items to cart (e.g. "add watch to cart")
3. Change cart quantities (e.g. "increase watch by 2")
4. Set delivery address (e.g. "set address to 123 Pine St")
5. Checkout (e.g. "checkout my cart")

To activate general questions, add GEMINI_API_KEY to your .env.local file and restart the server.`;
    return response;
  }

  // 3. SELLER ACTIONS
  if (currentRole === 'seller') {
    if (query.includes("list") || query.includes("publish") || query.includes("new product")) {
      let title = "Retro Artisan Clock";
      let price = 49.99;
      let stock = 20;
      let category = "Aesthetic Crafts";
      let description = "Handcrafted with premium materials.";

      const titleMatch = message.match(/(?:listing|product|title):\s*([^,]+)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      const priceMatch = message.match(/(?:price|cost):\s*\$?([0-9.]+)/i);
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1]);
      }

      const stockMatch = message.match(/(?:stock|units|quantity):\s*(\d+)/i);
      if (stockMatch && stockMatch[1]) {
        stock = parseInt(stockMatch[1], 10);
      }

      const categoryMatch = message.match(/(?:category|type):\s*([^,]+)/i);
      if (categoryMatch && categoryMatch[1]) {
        category = categoryMatch[1].trim();
      }

      response.message = `Successfully drafted and published a new marketplace listing: "${title}" at $${price.toFixed(2)} with ${stock} available units.`;
      response.actions.push({
        type: "LIST_PRODUCT",
        payload: { title, description, price, stock, category }
      });
      return response;
    }

    if (query.includes("delete") || query.includes("unlist") || query.includes("remove")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.id.toLowerCase())
      );

      if (matchedProduct) {
        response.message = `Removing product listing: "${matchedProduct.title}" (ID: ${matchedProduct.id}) from the Nexus marketplace.`;
        response.actions.push({
          type: "DELETE_PRODUCT",
          payload: { productId: matchedProduct.id }
        });
        return response;
      }
    }

    if (query.includes("inventory") || query.includes("products tab") || query.includes("open products") || query.includes("view products") || query.includes("show products") || query.includes("inventory products")) {
      response.message = `I am selecting your store's Inventory / Products tab so you can view all active listings.`;
      response.actions.push({
        type: "SELECT_SELLER_TAB",
        payload: { tab: 'products' }
      });
      return response;
    }

    if (query.includes("stats tab") || query.includes("show stats") || query.includes("view stats") || query.includes("statistics tab") || query.includes("go to statistics") || query.includes("go to stats")) {
      response.message = `I am selecting your store's Analytics Dashboard tab so you can analyze sales and profit trends.`;
      response.actions.push({
        type: "SELECT_SELLER_TAB",
        payload: { tab: 'stats' }
      });
      return response;
    }

    if (query.includes("modify") || query.includes("edit") || query.includes("update")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.id.toLowerCase())
      );

      if (matchedProduct) {
        let titleVal: string | undefined = undefined;
        let descVal: string | undefined = undefined;
        let priceVal: number | undefined = undefined;
        let stockVal: number | undefined = undefined;

        const priceMatch = message.match(/(?:price|cost)(?:\s+|:\s*|\s*to\s*)\$?([0-9.]+)/i);
        if (priceMatch && priceMatch[1]) {
          priceVal = parseFloat(priceMatch[1]);
        }

        const stockMatch = message.match(/(?:stock|units|quantity)(?:\s+|:\s*|\s*to\s*)(\d+)/i);
        if (stockMatch && stockMatch[1]) {
          stockVal = parseInt(stockMatch[1], 10);
        }

        const descMatch = message.match(/(?:desc|description)(?:\s+|:\s*|\s*to\s*)(.+?)(?:,|$|price|stock|name|title)/i);
        if (descMatch && descMatch[1]) {
          descVal = descMatch[1].trim();
        }

        const nameMatch = message.match(/(?:name|title)(?:\s+|:\s*|\s*to\s*)(.+?)(?:,|$|price|stock|desc|description)/i);
        if (nameMatch && nameMatch[1]) {
          titleVal = nameMatch[1].trim();
        }

        if (!titleVal && !descVal && !priceVal && !stockVal) {
          const generalMatch = message.match(/(?:to|is):\s*(.+)/i);
          if (generalMatch && generalMatch[1]) {
            descVal = generalMatch[1].trim();
          } else {
            descVal = "Updated characteristics via Companion.";
          }
        }

        response.message = `Modifying details for product "${matchedProduct.title}" (ID: ${matchedProduct.id}) in Offline Mode.`;
        response.actions.push({
          type: "MODIFY_PRODUCT",
          payload: {
            productId: matchedProduct.id,
            title: titleVal,
            description: descVal,
            price: priceVal,
            stock: stockVal
          }
        });
        return response;
      }
    }

    if (query.includes("sales") || query.includes("revenue") || query.includes("statistics") || query.includes("stats") || query.includes("earning") || query.includes("profit") || query.includes("history") || query.includes("order") || query.includes("record") || query.includes("date")) {
      let totalUnits = 0;
      let totalRev = 0;
      const myProducts = products.filter(p => p.sellerId === currentUser.id);
      const sellerProductIds = new Set(myProducts.map(p => p.id));
      
      myProducts.forEach(p => {
        totalUnits += p.unitsSold || 0;
        totalRev += p.totalRevenue || 0;
      });

      // Simple calculation: Cost is roughly 60% of sale price, so profits are roughly 40%
      const profit = totalRev * 0.4;

      // Extract specific transaction records for this seller from the orders history
      const salesEntries: {
        orderId: string;
        buyerName: string;
        date: string;
        title: string;
        quantity: number;
        revenue: number;
      }[] = [];

      (orders || []).forEach((order: any) => {
        order.items.forEach((item: any) => {
          if (sellerProductIds.has(item.productId)) {
            salesEntries.push({
              orderId: order.id,
              buyerName: order.buyerName,
              date: order.date,
              title: item.title,
              quantity: item.quantity,
              revenue: Number((item.price * item.quantity).toFixed(2))
            });
          }
        });
      });

      // Sort chronological descending
      salesEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let historyDetailsText = "";
      if (salesEntries.length > 0) {
        historyDetailsText = `\n\n📝 **Recent Sales & Transaction History (By Date)**:\n` + 
          salesEntries.slice(0, 8).map((entry, idx) => {
            const formattedDate = new Date(entry.date).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `${idx + 1}. **${formattedDate}** - ${entry.buyerName} purchased ${entry.quantity}x _"${entry.title}"_ (Total: $${entry.revenue.toFixed(2)}) [ID: ${entry.orderId}]`;
          }).join("\n");
        if (salesEntries.length > 8) {
          historyDetailsText += `\n_(plus ${salesEntries.length - 8} more transaction records available in database)_`;
        }
      } else {
        historyDetailsText = `\n\nNo matching transactions were found for your listed products in the orders ledger yet.`;
      }

      response.message = `📊 [Offline Analytics Engine] Business Ledger & Sales History for "${currentUser.storeName || 'My Store'}":
- **Active Listings**: ${myProducts.length} items
- **Total Units Sold**: ${totalUnits} units
- **Gross Revenue**: $${totalRev.toFixed(2)}
- **Estimated Net Profits (40% Margin)**: $${profit.toFixed(2)}
- **Calculated Total Earnings**: $${totalRev.toFixed(2)}${historyDetailsText}

I am also switching your view to the statistics tab to display interactive analytics.`;
      response.actions.push({
        type: "SELECT_SELLER_TAB",
        payload: { tab: 'stats' }
      });
      return response;
    }

    response.message = `Hello, ${currentUsername}! I'm your Offline Business Companion. I can perform seller operations:
1. List a product (e.g. "list a Retro Clock, price: 55, stock: 10, category: Crafts")
2. Edit product descriptions (e.g. "modify description of p-1 to New noise-cancelling tech")
3. Unlist products (e.g. "unlist p-1")
4. Show sales analytics (e.g. "calculate my sales stats")

To enable open-ended answers, add GEMINI_API_KEY to your .env.local file and restart the server.`;
    return response;
  }

  // 4. ADMIN ACTIONS
  if (currentRole === 'admin') {
    // 4.1 Delete User
    if ((query.includes("delete") || query.includes("remove") || query.includes("terminate")) && (query.includes("user") || query.includes("account") || query.includes("member") || query.includes("profile"))) {
      const matchedUser = users.find(u => 
        query.includes(u.username.toLowerCase()) || 
        query.includes(u.name.toLowerCase()) || 
        query.includes(u.id.toLowerCase())
      );
      if (matchedUser) {
        response.message = `[Administrative Order] Permanently terminating profile for "@${matchedUser.username}" (${matchedUser.name}).`;
        response.actions.push({
          type: "DELETE_USER",
          payload: { userId: matchedUser.id }
        });
        return response;
      }
    }

    // 4.2 Modify User Profile (names, store names, balance)
    if (query.includes("rename") || query.includes("modify user") || query.includes("update user") || query.includes("change user") || query.includes("store name") || query.includes("set balance") || query.includes("modify buyer") || query.includes("modify seller")) {
      const matchedUser = users.find(u => 
        query.includes(u.username.toLowerCase()) || 
        query.includes(u.name.toLowerCase()) || 
        query.includes(u.id.toLowerCase())
      );
      if (matchedUser) {
        let nameMatch = message.match(/(?:name to|new name is|rename to):\s*([A-Za-z0-9 ]+)/i);
        let usernameMatch = message.match(/(?:username to|handle to|username is):\s*([A-Za-z0-9_]+)/i);
        let storeMatch = message.match(/(?:store name to|store to|store name is):\s*([A-Za-z0-9_& ]+)/i);
        let balanceMatch = message.match(/(?:balance to|funds to|credit to|wallet to):\s*([0-9.]+)/i);

        const payload: any = { userId: matchedUser.id };
        let hasChanges = false;
        let changeDesc = [];

        if (nameMatch && nameMatch[1]) {
          payload.name = nameMatch[1].trim();
          hasChanges = true;
          changeDesc.push(`name to "${payload.name}"`);
        }
        if (usernameMatch && usernameMatch[1]) {
          payload.username = usernameMatch[1].trim();
          hasChanges = true;
          changeDesc.push(`username to "@${payload.username}"`);
        }
        if (storeMatch && storeMatch[1]) {
          payload.storeName = storeMatch[1].trim();
          hasChanges = true;
          changeDesc.push(`store name to "${payload.storeName}"`);
        }
        if (balanceMatch && balanceMatch[1]) {
          payload.balance = Number(balanceMatch[1]);
          hasChanges = true;
          changeDesc.push(`balance to $${payload.balance.toFixed(2)}`);
        }

        if (hasChanges) {
          response.message = `[Administrative Modification] Updating account profile for "@${matchedUser.username}": ${changeDesc.join(', ')}.`;
          response.actions.push({
            type: "MODIFY_USER_PROFILE",
            payload
          });
          return response;
        }
      }
    }

    // 4.3 Reset Password
    if (query.includes("password") || query.includes("reset") || query.includes("credential")) {
      const matchedUser = users.find(u => 
        query.includes(u.username.toLowerCase()) || 
        query.includes(u.id.toLowerCase())
      );

      if (matchedUser) {
        let newPassword = "nexusSecurePass123";
        const passMatch = message.match(/(?:to|password is|is):\s*(\S+)/i);
        if (passMatch && passMatch[1]) {
          newPassword = passMatch[1].trim();
        }

        response.message = `[Administrative System Override] Resetting security credentials for user "${matchedUser.username}".`;
        response.actions.push({
          type: "RESET_PASSWORD",
          payload: { userId: matchedUser.id, newPassword }
        });
        return response;
      }
    }

    // 4.4 Toggle Status / Approval
    if (query.includes("disable") || query.includes("enable") || query.includes("approve") || query.includes("approval") || query.includes("block user") || query.includes("unblock user") || query.includes("status")) {
      const matchedUser = users.find(u => 
        query.includes(u.username.toLowerCase()) || 
        query.includes(u.id.toLowerCase())
      );

      if (matchedUser) {
        const nextStatus = (query.includes("disable") || query.includes("block")) ? "disabled" : "active";
        const actionText = (query.includes("approve") || query.includes("approval")) 
          ? `Approved and activated registration profile for @${matchedUser.username}`
          : `Setting user profile status of "${matchedUser.username}" to "${nextStatus.toUpperCase()}"`;
        response.message = `[Administrative Control] ${actionText}.`;
        response.actions.push({
          type: "CHANGE_USER_STATUS",
          payload: { userId: matchedUser.id, status: nextStatus }
        });
        return response;
      }
    }

    // 4.5 Block/Delete Product
    if (query.includes("block product") || query.includes("delete product") || query.includes("remove product") || query.includes("unlist product")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.id.toLowerCase())
      );

      if (matchedProduct) {
        response.message = `[Administrative Action] Blocking and unlisting non-compliant product: "${matchedProduct.title}" (ID: ${matchedProduct.id}).`;
        response.actions.push({
          type: "DELETE_PRODUCT",
          payload: { productId: matchedProduct.id }
        });
        return response;
      }
    }

    // 4.6 Modify Product Details (name, price, stock, description etc)
    if (query.includes("modify product") || query.includes("update product") || query.includes("edit product") || query.includes("change product")) {
      const matchedProduct = products.find(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.id.toLowerCase())
      );
      if (matchedProduct) {
        let priceMatch = message.match(/(?:price to|price of):\s*([0-9.]+)/i);
        let stockMatch = message.match(/(?:stock to|stock of|quantity to):\s*([0-9]+)/i);
        let titleMatch = message.match(/(?:title to|rename product to|name to):\s*([A-Za-z0-9_ ]+)/i);
        let descMatch = message.match(/(?:description to|desc to):\s*([^.]+)/i);

        const payload: any = { productId: matchedProduct.id };
        let hasChanges = false;
        let changeDesc = [];

        if (priceMatch && priceMatch[1]) {
          payload.price = Number(priceMatch[1]);
          hasChanges = true;
          changeDesc.push(`price to $${payload.price.toFixed(2)}`);
        }
        if (stockMatch && stockMatch[1]) {
          payload.stock = Number(stockMatch[1]);
          hasChanges = true;
          changeDesc.push(`stock level to ${payload.stock} units`);
        }
        if (titleMatch && titleMatch[1]) {
          payload.title = titleMatch[1].trim();
          hasChanges = true;
          changeDesc.push(`title/name to "${payload.title}"`);
        }
        if (descMatch && descMatch[1]) {
          payload.description = descMatch[1].trim();
          hasChanges = true;
          changeDesc.push(`description to "${payload.description}"`);
        }

        if (hasChanges) {
          response.message = `[Administrative Core override] Updating listing characteristics for "${matchedProduct.title}" (ID: ${matchedProduct.id}): ${changeDesc.join(', ')}.`;
          response.actions.push({
            type: "MODIFY_PRODUCT",
            payload
          });
          return response;
        }
      }
    }

    // 4.7 Open Store Inventory / Detailed Dossier
    if (query.includes("open") || query.includes("view") || query.includes("show") || query.includes("inspect") || query.includes("inventory") || query.includes("dossier")) {
      const matchedSeller = users.find(u => 
        u.role === 'seller' && (
          query.includes(u.username.toLowerCase()) || 
          query.includes(u.name.toLowerCase()) || 
          (u.storeName && query.includes(u.storeName.toLowerCase())) ||
          query.includes(u.id.toLowerCase())
        )
      );
      if (matchedSeller) {
        response.message = `[Administrative Directive] Navigating control interface to detailed ledger dossier for seller "${matchedSeller.name}" (${matchedSeller.storeName || 'Active Merchant'}).`;
        response.actions.push({
          type: "SELECT_ADMIN_SELLER",
          payload: { sellerId: matchedSeller.id }
        });
        return response;
      }

      const matchedBuyer = users.find(u => 
        u.role === 'buyer' && (
          query.includes(u.username.toLowerCase()) || 
          query.includes(u.name.toLowerCase()) || 
          query.includes(u.id.toLowerCase())
        )
      );
      if (matchedBuyer) {
        response.message = `[Administrative Directive] Navigating control interface to detailed ledger dossier for buyer "${matchedBuyer.name}".`;
        response.actions.push({
          type: "SELECT_ADMIN_BUYER",
          payload: { buyerId: matchedBuyer.id }
        });
        return response;
      }

      if (query.includes("activity") || query.includes("log") || query.includes("registry") || query.includes("audit")) {
        response.message = `[Administrative Control] Swapping view to the historical Activity Security Registry.`;
        response.actions.push({
          type: "SELECT_ADMIN_TAB",
          payload: { tab: "activities" }
        });
        return response;
      }

      if (query.includes("seller") || query.includes("store") || query.includes("merchant")) {
        response.message = `[Administrative Control] Swapping view to the Sellers & Products Revenue index.`;
        response.actions.push({
          type: "SELECT_ADMIN_TAB",
          payload: { tab: "sellers" }
        });
        return response;
      }

      if (query.includes("buyer") || query.includes("shopper") || query.includes("customer")) {
        response.message = `[Administrative Control] Swapping view to the Buyers & Achats ledger.`;
        response.actions.push({
          type: "SELECT_ADMIN_TAB",
          payload: { tab: "buyers" }
        });
        return response;
      }

      if (query.includes("user") || query.includes("account") || query.includes("credential")) {
        response.message = `[Administrative Control] Swapping view to the Accounts & Credentials console.`;
        response.actions.push({
          type: "SELECT_ADMIN_TAB",
          payload: { tab: "users" }
        });
        return response;
      }
    }

    // 4.8 Profits and Statistics of the Sellers & Buying History
    if (query.includes("sales") || query.includes("revenue") || query.includes("statistics") || query.includes("stats") || query.includes("earning") || query.includes("profit") || query.includes("profits") || query.includes("history") || query.includes("order") || query.includes("buying history") || query.includes("transaction") || query.includes("date") || query.includes("ledger")) {
      let totalUnits = 0;
      let totalRev = 0;
      
      products.forEach(p => {
        totalUnits += p.unitsSold || 0;
        totalRev += p.totalRevenue || 0;
      });
      // Simple profit calculation
      const profit = totalRev * 0.4;

      // Calculate statistics for each individual seller
      const sellerStats = users
        .filter(u => u.role === 'seller')
        .map(u => {
          const sellerProducts = products.filter(p => p.sellerId === u.id);
          const activeListingsCount = sellerProducts.length;
          const unitsSold = sellerProducts.reduce((sum, p) => sum + (p.unitsSold || 0), 0);
          const revenue = sellerProducts.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
          const netProfit = revenue * 0.4;
          return {
            id: u.id,
            username: u.username,
            name: u.name,
            storeName: u.storeName || 'Unnamed Store',
            activeListingsCount,
            unitsSold,
            revenue,
            netProfit
          };
        });

      // Sort by gross revenue descending
      sellerStats.sort((a, b) => b.revenue - a.revenue);

      const sellerBreakdownText = `\n\n🏪 **Seller Store Ledger & Performance breakdown**:\n` +
        sellerStats.map((s, idx) => {
          return `${idx + 1}. **${s.storeName}** (@${s.username} - ID: ${s.id})\n` +
                 `   • Active Listings: ${s.activeListingsCount} items\n` +
                 `   • Total Sold: ${s.unitsSold} units\n` +
                 `   • Gross Revenue: $${s.revenue.toFixed(2)}\n` +
                 `   • Estimated Seller Profits (40%): $${s.netProfit.toFixed(2)}`;
        }).join("\n\n");

      // Create transaction list
      const salesEntries: {
        buyerName: string;
        date: string;
        title: string;
        quantity: number;
        revenue: number;
      }[] = [];

      (orders || []).forEach((order: any) => {
        order.items.forEach((item: any) => {
          salesEntries.push({
            buyerName: order.buyerName,
            date: order.date,
            title: item.title,
            quantity: item.quantity,
            revenue: Number((item.price * item.quantity).toFixed(2))
          });
        });
      });

      salesEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let historyDetailsText = "";
      if (salesEntries.length > 0) {
        historyDetailsText = `\n\n📝 **Marketplace Master Transaction History**:\n` + 
          salesEntries.slice(0, 8).map((entry, idx) => {
            const formattedDate = new Date(entry.date).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `${idx + 1}. **${formattedDate}** - ${entry.buyerName} purchased ${entry.quantity}x _"${entry.title}"_ ($${entry.revenue.toFixed(2)})`;
          }).join("\n");
      }

      response.message = `📊 [Admin Central Analytics Console] Master Ledger & Buying History:
- **Total Listings**: ${products.length} items
- **Total Units Sold**: ${totalUnits} units
- **Aggregate Gross Revenue**: $${totalRev.toFixed(2)}
- **Estimated Net Earnings (40% margins)**: $${profit.toFixed(2)}${sellerBreakdownText}${historyDetailsText}

I am navigating your view to the Sellers Index tab to inspect complete store breakdowns.`;
      response.actions.push({
        type: "SELECT_ADMIN_TAB",
        payload: { tab: 'sellers' }
      });
      return response;
    }

    if (query.includes("users") || query.includes("members") || query.includes("profiles")) {
      const userLines = users.map(u => `- ${u.username} (${u.role.toUpperCase()}) - Status: ${u.status.toUpperCase()}`).join("\n");
      response.message = `📋 [Admin Directory Lookup] Registered Profiles:\n${userLines}`;
      response.actions.push({
        type: "SELECT_ADMIN_TAB",
        payload: { tab: "users" }
      });
      return response;
    }

    response.message = `Hello, Admin ${currentUsername}! I'm your Administrative Offline Companion. I can perform system actions:
1. Reset user passwords (e.g. "reset password of jane_shopper to securePass")
2. Toggle account status (e.g. "disable user jane_shopper" or "approve/enable user alex_buyer")
3. Delete user profiles (e.g. "delete user alex_buyer")
4. Modify seller or buyer profiles (e.g. "modify user alpha_seller store name to Beta Tech, name to Beta Electronics")
5. Block or edit any product listings (e.g. "block product Wireless Headphones" or "modify product p-1 price to 299, stock to 15")
6. Open store inventory or client dossiers (e.g. "open store Alpha Tech" or "inspect buyer Jane Smith")
7. View global sales, profits, and transaction history (e.g. "show statistics and buying history")

To unlock open-ended answers, add GEMINI_API_KEY to your .env.local file and restart the server.`;
    return response;
  }

  response.message = "Hello. I am the marketplace assistant. Add GEMINI_API_KEY to .env.local and restart the server for open-ended answers. Marketplace actions still work in offline mode.";
  return response;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  const engine = geminiApiKey ? "gemini" : envValue("QWEN_API_KEY") ? "qwen" : "offline";
  res.json({
    status: "ok",
    ai: engine === "offline" ? "offline" : "online",
    engine,
    search: Boolean(envValue("TAVILY_API_KEY"))
  });
});

// AI Agent Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, currentUser, products, cart, users, orders } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
    }

    const safeCurrentUser = publicUser(currentUser);
    const safeUsers = Array.isArray(users) ? users.map(publicUser) : [];
    const recentOrders = Array.isArray(orders) ? orders.slice(0, 40) : [];
    const currentRole = safeCurrentUser?.role || 'guest';
    const currentUsername = safeCurrentUser?.username || 'Guest';
    const lastMessageObj = messages[messages.length - 1];
    const lastMessageText = lastMessageObj?.content || '';

    // Build role-specific context to include in the system instructions
    const searchEnabled = Boolean(envValue("TAVILY_API_KEY"));
    let systemInstruction = `You are the Nexus marketplace assistant. Be clear, concise, and professional. This is a local demonstration shop. Payments are simulated store credit, not real charges.

Current User:
- Username: ${currentUsername}
- Role: ${currentRole}
${safeCurrentUser ? `- ID: ${safeCurrentUser.id}` : ''}
${safeCurrentUser?.balance !== undefined ? `- Store credit: $${Number(safeCurrentUser.balance).toFixed(2)}` : ''}

Marketplace context:
- Products: ${JSON.stringify(catalogForPrompt(products || []))}
- Cart: ${JSON.stringify(cart || [])}
- Recent orders: ${JSON.stringify(ordersForPrompt(recentOrders))}
${currentRole === 'admin' ? `- Registered users (no passwords): ${JSON.stringify(safeUsers)}` : ''}

Rules:
1. Answer marketplace questions and, when helpful, general questions.
   - ${searchEnabled ? "If the question needs current public information, emit a WEB_SEARCH action with a query." : "Web search is not configured. Do not emit WEB_SEARCH. Answer from the marketplace context or say you cannot look that up."}
   - Put the reply in "message". Never include passwords, card numbers, or secrets.
2. ONLY authorize state-modifying actions matching the user's current role.
   - GUESTS (not logged in): Can search products or filter categories. If they ask to shop, purchase, buy, list, add items to cart, set shipping details, or complete checkout, politely decline and EXPLICITLY guide them into registering or logging in first before starting shopping. Explicitly direct them to click Sign In at the top right of the screen.
   - BUYERS: Can search products, filter categories, list target products in cart/views, add products to cart, increase/decrease quantity of cart items, set delivery shipping address, and checkout. They CANNOT list products for sale, modify product descriptions, reset credentials, or block users/products.
   - SELLERS: Can list products, unlist/delete products, modify product descriptions, names, prices, or stock levels, toggle dashboard tabs ('stats' or 'products'), and view sales analytics/statistics on their own products. They CANNOT buy products, add items to cart, checkout, or manage other users.
   - ADMINISTRATORS: Can perform user management (reset user passwords, approve pending registrations by setting user status to 'active', suspend or enable accounts, delete user accounts, modify usernames/names/store names/balances) and product management (block/delete invalid products, modify names/descriptions/prices/stock levels of ANY product). They can view all profits and statistics of sellers, view all buying history, and navigate dashboard tabs ('users', 'sellers', 'buyers', 'activities') or open detailed seller/buyer dossiers.
3. If the user asks for database actions outside their role's capabilities, politely explain why in the "message" field, and do NOT emit any unauthorized actions.
4. When performing an action, describe what you are doing in the "message" field, and return the corresponding item in the "actions" array. If there are no actions to perform, return an empty array [] in "actions".
5. When a user asks to view statistics, earnings, revenue, sales history, or transaction dates, analyze the complete order history and products arrays to retrieve and present detailed dates, times, buyer names, itemized sales, and profits. Highlight specific historical transactions with their dates, and switch the seller dashboard view using 'SELECT_SELLER_TAB' with tab 'stats'. When they ask to view or modify their inventory/products, use 'SELECT_SELLER_TAB' with tab 'products'.

AUTHORIZED ACTIONS list and payloads:
- 'WEB_SEARCH': Use when the user asks an informational question, current events, weather, stock prices, translation, or any topic requiring search or external search-grounded answers. Payload: { query: string }
- 'SEARCH_PRODUCTS': Use when the user asks to find, search, filter, or look for products. Payload: { query: string }
- 'FILTER_CATEGORY': Use when the user asks to filter products by category, select a category, or view a category (such as "Electronics", "Audio & Acoustics", "Home & Office", "Fashion & Apparel", "Travel & Carry", "Aesthetic Crafts"). Payload: { category: string }
- 'ADD_TO_CART': Use when a buyer wants to add a product to their cart. Payload: { productId: string, quantity: number }
- 'CHANGE_CART_QTY': Use when a buyer wants to increase, decrease, or set the quantity of an item in their cart. Payload: { productId: string, quantity: number } (use positive number to set/add, or negative to reduce)
- 'SET_ADDRESS': Use when a buyer wants to specify or set their shipping/delivery address. Payload: { address: string }
- 'CHECKOUT': Use when a buyer wants to purchase, checkout, or complete order of their current cart items. Payload: {}
- 'LIST_PRODUCT': Use when a seller wants to list a new product. Payload: { title: string, description: string, price: number, stock: number, category: string }
- 'DELETE_PRODUCT': Use when a seller wants to unlist/remove a product, or when an admin wants to block/delete a product. Payload: { productId: string }
- 'MODIFY_PRODUCT_DESC': Use when a seller wants to edit/update a product's description. Payload: { productId: string, description: string }
- 'MODIFY_PRODUCT': Use when a seller wants to edit/update a product's name, description, price, stock level, or category. Payload: { productId: string, title?: string, description?: string, price?: number, stock?: number, category?: string }
- 'SELECT_SELLER_TAB': Use when a seller wants to switch their seller dashboard view tab (such as 'products' for inventory products, or 'stats' for statistics/sales/earnings reports). Payload: { tab: 'stats' | 'products' }
- 'RESET_PASSWORD': Use when an admin wants to reset a user's password. Payload: { userId: string, newPassword: string }
- 'CHANGE_USER_STATUS': Use when an admin wants to enable/disable, approve, or block a user (status: 'active' or 'disabled'). Payload: { userId: string, status: 'active' | 'disabled' }
- 'SELECT_ADMIN_TAB': Use when an admin wants to switch admin dashboard tab (tab: 'users', 'sellers', 'buyers', 'activities'). Payload: { tab: 'users' | 'sellers' | 'buyers' | 'activities' }
- 'SELECT_ADMIN_SELLER': Use when an admin wants to open a detailed store/inventory dossier for a specific seller by username, seller ID, name, or store name. Payload: { sellerId: string }
- 'SELECT_ADMIN_BUYER': Use when an admin wants to open a detailed purchaser dossier/buying history for a specific buyer by username, buyer ID, or name. Payload: { buyerId: string }
- 'DELETE_USER': Use when an admin wants to delete/terminate a user account permanently. Payload: { userId: string }
- 'MODIFY_USER_PROFILE': Use when an admin wants to modify a seller or buyer's profile (name, username, storeName, balance). Payload: { userId: string, name?: string, username?: string, storeName?: string, balance?: number }

Make sure that every action has its payload with appropriate, accurate fields. If you are searching or adding/listing a product, identify the correct Product ID from the context. For example, if the user asks "add the leather watch to cart", locate "Minimalist Leather Watch" in the context (which has id "p-1") and return action: { type: "ADD_TO_CART", payload: { productId: "p-1", quantity: 1 } }. Output MUST be a valid JSON object.`;

    // 1. PRIORITIZE QWEN LLM AGENT WITH TAVILY WEB SEARCH (If Key Configured or Default is available)
    const qwenKey = geminiApiKey ? "" : envValue("QWEN_API_KEY");
    if (qwenKey && qwenKey.trim() !== "") {
      try {
        console.log("Nexus AI Core: Processing user request with Qwen LLM...");
        let completionText = await callQwen(systemInstruction, messages, qwenKey);
        let parsedResult = parseAssistantJson(completionText);
        
        // Check if Qwen decided to execute a web search
        const searchAction = parsedResult.actions?.find((a: any) => a.type === "WEB_SEARCH");
        if (searchAction && searchAction.payload?.query) {
          const queryToSearch = searchAction.payload.query;
          const searchResultsText = await searchTavily(queryToSearch);
          
          // Formulate search injection prompt
          const searchContextMessage = {
            role: "user",
            content: `[SYSTEM CONTEXT: Live Web Search Results for "${queryToSearch}" using Tavily:\n\n${searchResultsText}\n\nPlease formulate your final conversational response based on these search results. Ensure you output standard JSON matching the target schema. Set actions array to [] (unless performing other marketplace operations).]`
          };
          
          const expandedMessages = [...messages, searchContextMessage];
          console.log(`[Qwen Search Grounding] Re-querying Qwen with Tavily search results...`);
          completionText = await callQwen(systemInstruction, expandedMessages, qwenKey);
          parsedResult = parseAssistantJson(completionText);
        }
        
        return res.json({
          message: parsedResult.message,
          actions: parsedResult.actions.filter((action) => action.type !== "WEB_SEARCH"),
          mode: "online",
          engine: "qwen"
        });
      } catch (qwenError: any) {
        console.error("Qwen agent flow failed, falling back to Gemini:", qwenError);
      }
    }

    if (ai) {
      try {
        console.log("Nexus AI Core: Processing user request with Gemini...");
        const contents = messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));

        let parsedResult = await askGemini(contents, systemInstruction);
        const searchAction = parsedResult.actions.find((action) => action.type === "WEB_SEARCH" && action.payload?.query);
        if (searchAction) {
          const queryToSearch = searchAction.payload.query;
          const searchResultsText = await searchTavily(queryToSearch);
          parsedResult = await askGemini([
            ...contents,
            {
              role: "user",
              parts: [{ text: `Web search results for "${queryToSearch}":\n${searchResultsText}\nAnswer from these results. Keep marketplace actions only if the user also asked for one. Do not emit WEB_SEARCH again.` }]
            }
          ], systemInstruction);
        }

        return res.json({
          message: parsedResult.message,
          actions: parsedResult.actions.filter((action) => action.type !== "WEB_SEARCH"),
          mode: "online",
          engine: "gemini"
        });
      } catch (geminiError: any) {
        console.error("Gemini API call failed, falling back to offline commands:", geminiError);
      }
    }


    // 3. FALLBACK TO SMART OFFLINE MODE
    console.log("Nexus AI Core: Executing fallback Smart Offline Matching Engine...");
    const offlineResult = generateOfflineResponse(lastMessageText, safeCurrentUser, products, cart, safeUsers, recentOrders);
    return res.json({
      message: offlineResult.message,
      actions: offlineResult.actions,
      mode: "offline",
      engine: "offline"
    });

  } catch (error: any) {
    console.error("AI Agent Core Error:", error);
    res.status(500).json({
      message: `I encountered an error while processing your request: ${error.message || error}`,
      actions: [],
      mode: "error",
      engine: "error"
    });
  }
});

// Vite Middleware integration for SPA serving
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
