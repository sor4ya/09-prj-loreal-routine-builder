/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
let selectedProducts = [];
let allProducts = [];

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  // Add unique id to each product if not present
  products.forEach((product, idx) => {
    if (!product.id) product.id = idx.toString();
  });

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <div class="product-details">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
        <div class="product-description" style="display: none;">
          <p>${product.description}</p>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners and update selection visuals
  addProductCardListeners(products);
  updateProductCardSelection();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Store the full conversation history for context
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful beauty advisor. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or other beauty-related topics. If a question is off-topic, politely guide the user back to beauty topics.",
  },
];

// Generate Routine button handler
const generateBtn = document.getElementById("generateRoutine");
generateBtn.addEventListener("click", async () => {
  // Show loading message in chat window
  chatWindow.innerHTML = `<div class="placeholder-message">Generating your routine... <span class="loader"></span></div>`;

  // Collect selected product data (name, brand, category, description)
  const selectedProductData = selectedProducts
    .map((id) => {
      const product = allProducts.find((p) => String(p.id) === id);
      if (!product) return null;
      return {
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
      };
    })
    .filter(Boolean); // Remove any nulls

  // If no products selected, show message and return
  if (selectedProductData.length === 0) {
    chatWindow.innerHTML = `<div class="placeholder-message">Please select at least one product to generate a routine.</div>`;
    return;
  }

  // Add the user's request to the conversation history
  conversationHistory = [conversationHistory[0]]; // Reset to system prompt only
  conversationHistory.push({
    role: "user",
    content: `Here are my selected products: ${JSON.stringify(
      selectedProductData,
      null,
      2
    )}. Please generate a routine using only these products.`,
  });

  try {
    // Call OpenAI API using fetch and async/await
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    // Check for a valid response and display it
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      const responseHtml = renderMarkdown(data.choices[0].message.content);
      chatWindow.innerHTML = `<div class="ai-response">${responseHtml}</div>`;
    } else {
      chatWindow.innerHTML = `<div class="placeholder-message">Sorry, I couldn't generate a routine. Please try again.</div>`;
    }
  } catch (error) {
    // Show error message if something goes wrong
    chatWindow.innerHTML = `<div class="placeholder-message">Error: ${error.message}</div>`;
  }
});

// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Add user's question to conversation history
  conversationHistory.push({
    role: "user",
    content: userInput,
  });

  // Show user's question and loading message in chat window
  chatWindow.innerHTML = `<div class="user-question"><strong>You:</strong> ${userInput}</div><div class="placeholder-message">Thinking...</div>`;

  try {
    // Call OpenAI API with full conversation history
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      const responseHtml = renderMarkdown(data.choices[0].message.content);
      chatWindow.innerHTML = `<div class="user-question"><strong>You:</strong> ${userInput}</div><div class="ai-response">${responseHtml}</div>`;
    } else {
      chatWindow.innerHTML = `<div class="placeholder-message">Sorry, I couldn't answer that. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML = `<div class="placeholder-message">Error: ${error.message}</div>`;
  }

  // Clear the input box
  document.getElementById("userInput").value = "";
});

// Load selected products from localStorage if available
selectedProducts = JSON.parse(localStorage.getItem("selectedProducts") || "[]");

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Add a Clear All button to the selected products section
function addClearAllButton() {
  const selectedProductsHeader = document.querySelector(
    ".selected-products-header"
  );
  if (!selectedProductsHeader) return;

  let clearBtn = document.getElementById("clearAllSelected");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "clearAllSelected";
    clearBtn.className = "clear-all-btn";
    clearBtn.title = "Clear All Selected Products";
    clearBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Clear All`;
    clearBtn.onclick = function (e) {
      e.stopPropagation();
      selectedProducts = [];
      saveSelectedProducts();
      updateProductCardSelection();
      updateSelectedProductsList();
    };
    // Position at top right of selected products header
    selectedProductsHeader.appendChild(clearBtn);
  }
  // Hide if no products selected
  clearBtn.style.display = selectedProducts.length > 0 ? "inline-flex" : "none";
}

// Update the Selected Products section
function updateSelectedProductsList() {
  const selectedList = document.getElementById("selectedProductsList");
  if (!selectedList) return;
  if (selectedProducts.length === 0) {
    selectedList.innerHTML =
      '<div class="placeholder-message">No products selected</div>';
    addClearAllButton();
    return;
  }

  // Always use allProducts for lookup so switching categories doesn't break selected list
  selectedList.innerHTML = selectedProducts
    .map((id) => {
      const product = allProducts.find((p) => String(p.id) === id);
      return `
        <div class="selected-product-item">
          <span>${product ? product.name : "Unknown"}</span>
          <button class="remove-selected" data-id="${id}" title="Remove">&times;</button>
        </div>
      `;
    })
    .join("");
  addClearAllButton();
  // Add event listeners for remove buttons after updating the HTML
  addRemoveSelectedListeners();
}

// Helper: visually mark selected cards
function updateProductCardSelection() {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const productId = card.getAttribute("data-id");

    if (selectedProducts.includes(productId)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

// Add click event to product cards for selection/unselection
function addProductCardListeners(products) {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    // Add click event for selection
    card.addEventListener("click", () => {
      const productId = card.getAttribute("data-id");
      if (selectedProducts.includes(productId)) {
        // Unselect
        selectedProducts = selectedProducts.filter((id) => id !== productId);
      } else {
        // Select
        selectedProducts.push(productId);
      }
      saveSelectedProducts();
      updateProductCardSelection();
      updateSelectedProductsList();
      addRemoveSelectedListeners();
    });

    // Add hover effects to show/hide product description
    const productDetails = card.querySelector(".product-details");
    const productDescription = card.querySelector(".product-description");

    card.addEventListener("mouseenter", () => {
      // Hide name and brand, show description
      productDetails.style.display = "none";
      productDescription.style.display = "block";
    });

    card.addEventListener("mouseleave", () => {
      // Show name and brand, hide description
      productDetails.style.display = "block";
      productDescription.style.display = "none";
    });
  });
}

// Add click event to remove buttons in selected products list
function addRemoveSelectedListeners() {
  const selectedList = document.getElementById("selectedProductsList");
  if (!selectedList) return;

  selectedList.querySelectorAll(".remove-selected").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute("data-id");
      if (productId) {
        selectedProducts = selectedProducts.filter((id) => id !== productId);
        saveSelectedProducts();
        updateProductCardSelection();
        updateSelectedProductsList();
      }
    });
  });
}

// Helper function to render basic markdown to HTML for OpenAI responses
function renderMarkdown(markdown) {
  // Replace headings
  let html = markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");
  // Replace bold and italics
  html = html
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>");
  // Replace unordered lists
  html = html.replace(/^\s*\- (.*$)/gim, "<li>$1</li>");
  // Replace ordered lists
  html = html.replace(/^\s*\d+\. (.*$)/gim, "<li>$1</li>");
  // Wrap list items in <ul> or <ol>
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");
  // Replace line breaks
  html = html.replace(/\n/g, "<br>");
  return html;
}

// On page load, restore selected products and update UI
window.addEventListener("DOMContentLoaded", async () => {
  // Load products first so allProducts is populated
  await loadProducts();
  // Then update the UI with the correct product names
  updateProductCardSelection();
  updateSelectedProductsList();
});
